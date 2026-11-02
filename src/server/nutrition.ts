import { query } from '@/lib/db';
import { addDays, type DateStr } from '@/domain/dates';
import { exerciseKcal } from '@/domain/load';
import { dailyTarget, totals, type NutritionTarget } from '@/domain/nutrition';
import type { Profile } from './api-util';
import { latestWeight, today } from './api-util';

export interface TargetResult { target: NutritionTarget | null; missing: string[]; trainingKcal: number; basis: string }

export async function targetFor(userId: string, profile: Profile, date: DateStr): Promise<TargetResult> {
  const missing: string[] = [];
  if (!profile.sex) missing.push('Geschlecht');
  if (!profile.height_cm) missing.push('Körpergröße');
  if (!profile.birth_year) missing.push('Geburtsjahr');
  const weightKg = await latestWeight(userId, profile);
  const workouts = await query<{ type: string; duration_min: number; avg_power_w: number | null; kcal: number | null }>('SELECT type, duration_min, avg_power_w, kcal FROM workouts WHERE user_id = $1 AND date = $2', [userId, date]);
  let trainingKcal = workouts.reduce((a, w) => a + exerciseKcal(w, weightKg), 0);
  let basis = workouts.length ? 'tatsächliches Training' : 'kein Training erfasst';
  if (date >= today()) {
    const planned = await query<{ type: string; duration_min: number }>(`SELECT type, duration_min FROM plan_sessions WHERE user_id = $1 AND date = $2 AND status = 'planned' AND type NOT IN ('ruhe')`, [userId, date]);
    if (planned.length) { trainingKcal += planned.reduce((a, p) => a + exerciseKcal(p, weightKg), 0); basis = 'tatsächliches + geplantes Training'; }
  }
  if (missing.length) return { target: null, missing, trainingKcal, basis };
  const target = dailyTarget({
    body: { sex: profile.sex!, heightCm: profile.height_cm!, weightKg, age: Number(date.slice(0, 4)) - profile.birth_year! },
    activity: profile.activity_level, targetWeightKg: profile.target_weight_kg, today: date, goalDate: profile.main_goal_date, trainingKcal,
  });
  return { target, missing, trainingKcal, basis };
}

export async function dayView(userId: string, profile: Profile, date: DateStr) {
  const entries = await query<Record<string, unknown> & { kcal: number; protein_g: number; carbs_g: number; fat_g: number; is_estimate: boolean }>(
    'SELECT * FROM food_entries WHERE user_id = $1 AND date = $2 ORDER BY created_at ASC', [userId, date]);
  return { date, entries, totals: totals(entries), ...(await targetFor(userId, profile, date)) };
}

export async function recentNutritionAverages(userId: string, days = 7) {
  const from = addDays(today(), -(days - 1));
  const rows = await query<{ date: string; kcal: number; protein: number }>(
    'SELECT date, sum(kcal) AS kcal, sum(protein_g) AS protein FROM food_entries WHERE user_id = $1 AND date >= $2 GROUP BY date', [userId, from]);
  const n = rows.length;
  return { daysLogged: n, avgKcal: n ? Math.round(rows.reduce((a, r) => a + Number(r.kcal), 0) / n) : null, avgProteinG: n ? Math.round(rows.reduce((a, r) => a + Number(r.protein), 0) / n) : null };
}
