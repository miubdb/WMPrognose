import { query, queryOne } from '@/lib/db';
import { addDays, diffDays as daysDiffSafe, startOfWeek, type DateStr } from '@/domain/dates';
import { dailyTss, pmc, weeklySummary } from '@/domain/load';
import { phaseOf, PHASES, specificity, daysUntil } from '@/domain/phases';
import { goalProgress, trendSeries, weeklyRate } from '@/domain/weight';
import { readiness, type Checkin } from '@/domain/readiness';
import { ftpFromTest, wattsPerKg } from '@/domain/cycling';
import { currentFtp, latestWeight, today, type Profile } from './api-util';
import { dayView, recentNutritionAverages } from './nutrition';

export async function weightStats(userId: string, profile: Profile) {
  const entries = await query<{ date: string; weight_kg: number; body_fat_pct: number | null }>('SELECT date, weight_kg, body_fat_pct FROM weight_entries WHERE user_id = $1 ORDER BY date ASC', [userId]);
  const series = trendSeries(entries);
  const rate = weeklyRate(entries);
  const current = entries.length ? entries[entries.length - 1].weight_kg : profile.start_weight_kg;
  return { entries, series, rate, progress: goalProgress(profile.start_weight_kg, current, profile.target_weight_kg, today(), profile.main_goal_date, rate) };
}

export async function pmcStats(userId: string, from?: DateStr, to?: DateStr) {
  const t = to ?? today();
  const rows = await query<{ date: string; tss: number | null }>('SELECT date, tss FROM workouts WHERE user_id = $1 AND date <= $2', [userId, t]);
  const missingTss = rows.filter((r) => r.tss == null).length;
  if (!rows.length) return { points: [], missingTss, workouts: 0 };
  const first = rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0].date);
  const all = pmc(dailyTss(rows.map((r) => ({ date: r.date, tss: r.tss }))), first, t);
  const f = from ?? addDays(t, -83);
  return { points: all.filter((p) => p.date >= f), missingTss, workouts: rows.length };
}

export async function readinessHistory(userId: string, days = 14) {
  const from = addDays(today(), -(days + 14));
  const rows = await query<Checkin>('SELECT date, sleep_hours, sleep_quality, soreness, energy, mood, stress, resting_hr, hrv_ms FROM readiness_checkins WHERE user_id = $1 AND date >= $2 ORDER BY date ASC', [userId, from]);
  const cutoff = addDays(today(), -days);
  return rows.filter((r) => r.date >= cutoff).map((r) => ({ date: r.date, ...readiness(r, rows) }));
}

export async function ftpStats(userId: string, profile: Profile) {
  const history = await query<{ id: string; date: string; ftp_w: number; method: string; test_value_w: number | null; notes: string | null }>('SELECT id, date, ftp_w, method, test_value_w, notes FROM ftp_tests WHERE user_id = $1 ORDER BY date ASC, created_at ASC', [userId]);
  const current = await currentFtp(userId, profile);
  const weight = await latestWeight(userId, profile);
  return { history, current, wattsPerKg: wattsPerKg(current, weight), start: profile.start_ftp_w };
}

export async function dashboard(userId: string, profile: Profile) {
  const t = today();
  const m = { start: profile.start_date, firstFriendly: profile.first_friendly_date, mainGoal: profile.main_goal_date };
  const phase = phaseOf(t, m);
  const weekStart = startOfWeek(t);
  const weekEnd = addDays(weekStart, 6);

  const [todaySessions, upcoming, weekPlan, weekWorkouts, weights, ftp, pmcRes, rd, nutri, pending, nutriAvg, counts] = await Promise.all([
    query('SELECT * FROM plan_sessions WHERE user_id = $1 AND date = $2 ORDER BY created_at', [userId, t]),
    query('SELECT * FROM plan_sessions WHERE user_id = $1 AND date > $2 AND date <= $3 ORDER BY date, created_at', [userId, t, addDays(t, 7)]),
    query<{ status: string; duration_min: number }>('SELECT status, duration_min FROM plan_sessions WHERE user_id = $1 AND date BETWEEN $2 AND $3', [userId, weekStart, weekEnd]),
    query<{ date: string; duration_min: number; tss: number | null }>('SELECT date, duration_min, tss FROM workouts WHERE user_id = $1 AND date BETWEEN $2 AND $3', [userId, weekStart, weekEnd]),
    weightStats(userId, profile),
    ftpStats(userId, profile),
    pmcStats(userId, addDays(t, -41), t),
    readinessHistory(userId, 7),
    dayView(userId, profile, t),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM plan_proposals WHERE user_id = $1 AND status = 'pending'`, [userId]),
    recentNutritionAverages(userId),
    queryOne<{ workouts: number; checkins: number; weights: number }>(
      `SELECT (SELECT count(*)::int FROM workouts WHERE user_id = $1 AND date >= $2) AS workouts,
              (SELECT count(*)::int FROM readiness_checkins WHERE user_id = $1 AND date >= $3) AS checkins,
              (SELECT count(*)::int FROM weight_entries WHERE user_id = $1 AND date >= $2) AS weights`, [userId, addDays(t, -28), addDays(t, -7)]),
  ]);
  const todayReadiness = rd.find((r) => r.date === t) ?? null;
  const lastPmc = pmcRes.points[pmcRes.points.length - 1] ?? null;
  const planned = weekPlan.length;
  const done = weekPlan.filter((s) => s.status === 'done').length;
  return {
    today: t,
    profile,
    phase: { ...PHASES[phase], specificityPct: Math.round(specificity(t, m) * 100) },
    countdown: { firstFriendly: daysUntil(profile.first_friendly_date, t), mainGoal: daysUntil(profile.main_goal_date, t), sinceStart: daysDiffSafe(t, profile.start_date) },
    todaySessions, upcoming,
    week: { start: weekStart, end: weekEnd, planned, done, ...weeklySummary(weekWorkouts, [weekStart])[0] },
    weight: { latest: weights.entries[weights.entries.length - 1] ?? null, rate: weights.rate, progress: weights.progress, trend: weights.series.slice(-60) },
    ftp: { current: ftp.current, start: ftp.start, wattsPerKg: ftp.wattsPerKg },
    form: lastPmc,
    readinessToday: todayReadiness,
    nutrition: nutri,
    nutritionAverage: nutriAvg,
    pendingProposals: pending?.n ?? 0,
    dataQuality: { workoutsLast28d: counts?.workouts ?? 0, checkinsLast7d: counts?.checkins ?? 0, weightsLast28d: counts?.weights ?? 0, workoutsWithoutTss: pmcRes.missingTss },
  };
}

export { ftpFromTest };
