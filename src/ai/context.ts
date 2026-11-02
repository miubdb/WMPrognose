// Baut den Datenkontext für den KI-Coach aus ECHTEN Nutzerdaten. Nichts wird ergänzt oder geschätzt.
import { query } from '@/lib/db';
import { addDays } from '@/domain/dates';
import { phaseOf, PHASES, daysUntil } from '@/domain/phases';
import { requireProfile, today, type Profile } from '@/server/api-util';
import { ftpStats, pmcStats, readinessHistory, weightStats } from '@/server/dashboard';
import { recentNutritionAverages } from '@/server/nutrition';

export async function buildCoachContext(userId: string, profileIn?: Profile) {
  const profile = profileIn ?? (await requireProfile(userId));
  const t = today();
  const m = { start: profile.start_date, firstFriendly: profile.first_friendly_date, mainGoal: profile.main_goal_date };
  const [availability, exceptions, workouts, upcoming, weight, ftp, pmc, readiness, nutrition, events, counts, pending] = await Promise.all([
    query('SELECT weekday, available_minutes, team_training, team_training_minutes FROM availability WHERE user_id = $1 ORDER BY weekday', [userId]),
    query('SELECT date, available_minutes, reason FROM availability_exceptions WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date', [userId, t, addDays(t, 28)]),
    query('SELECT date, type, title, duration_min, avg_power_w, normalized_power_w, avg_hr, rpe, tss, tss_source FROM workouts WHERE user_id = $1 AND date >= $2 ORDER BY date DESC LIMIT 40', [userId, addDays(t, -28)]),
    query('SELECT id, date, type, title, duration_min, intensity, status, source FROM plan_sessions WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date, created_at', [userId, t, addDays(t, 14)]),
    weightStats(userId, profile),
    ftpStats(userId, profile),
    pmcStats(userId, addDays(t, -13), t),
    readinessHistory(userId, 7),
    recentNutritionAverages(userId),
    query('SELECT date, kind, title FROM events WHERE user_id = $1 AND date >= $2 ORDER BY date LIMIT 10', [userId, t]),
    query<{ workouts: number; checkins: number; weights: number }>(
      `SELECT (SELECT count(*)::int FROM workouts WHERE user_id = $1 AND date >= $2) AS workouts,
              (SELECT count(*)::int FROM readiness_checkins WHERE user_id = $1 AND date >= $3) AS checkins,
              (SELECT count(*)::int FROM weight_entries WHERE user_id = $1 AND date >= $2) AS weights`, [userId, addDays(t, -28), addDays(t, -7)]),
    query<{ n: number }>(`SELECT count(*)::int AS n FROM plan_proposals WHERE user_id = $1 AND status = 'pending'`, [userId]),
  ]);
  const phase = phaseOf(t, m);
  const lastPmc = pmc.points[pmc.points.length - 1] ?? null;
  const dq = counts[0];
  return {
    heute: t,
    ziele: {
      start: profile.start_date,
      erstes_freundschaftsspiel: profile.first_friendly_date,
      hauptziel: profile.main_goal_date,
      tage_bis_freundschaftsspiel: daysUntil(profile.first_friendly_date, t),
      tage_bis_hauptziel: daysUntil(profile.main_goal_date, t),
      zielgewicht_kg: profile.target_weight_kg,
      ausgangsgewicht_kg: profile.start_weight_kg,
      ausgangs_ftp_w: profile.start_ftp_w,
    },
    phase: { name: PHASES[phase].label, schwerpunkt: PHASES[phase].focus },
    verfuegbarkeit_pro_wochentag_1_bis_7: availability,
    verfuegbarkeits_ausnahmen_naechste_4_wochen: exceptions,
    termine: events,
    gewicht: {
      aktuell_kg: weight.entries.length ? weight.entries[weight.entries.length - 1].weight_kg : null,
      trend_kg_pro_woche: weight.rate,
      fortschritt: weight.progress,
      letzte_eintraege: weight.entries.slice(-10),
    },
    ftp: { aktuell_w: ftp.current, w_pro_kg: ftp.wattsPerKg, verlauf: ftp.history.map((h) => ({ date: h.date, ftp_w: h.ftp_w, methode: h.method })) },
    belastung: lastPmc ? { ctl_fitness: lastPmc.ctl, atl_ermuedung: lastPmc.atl, tsb_form: lastPmc.tsb, stand: lastPmc.date } : null,
    trainings_letzte_28_tage: workouts,
    tagesform_letzte_7_tage: readiness,
    ernaehrung_letzte_7_tage: nutrition,
    geplante_einheiten_naechste_14_tage: upcoming,
    offene_vorschlaege: pending[0]?.n ?? 0,
    datenqualitaet: {
      trainings_letzte_28_tage: dq?.workouts ?? 0,
      checkins_letzte_7_tage: dq?.checkins ?? 0,
      gewichtseintraege_letzte_28_tage: dq?.weights ?? 0,
      trainings_ohne_belastungswert: pmc.missingTss,
      hinweis: 'Fehlende oder wenige Daten bedeuten: keine belastbare Aussage möglich. Nichts ergänzen oder schätzen.',
    },
  };
}
