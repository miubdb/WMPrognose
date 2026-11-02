import { z } from 'zod';
import { withTransaction } from '@/lib/db';
import { ftpOn, tss as tssFromPower } from '@/domain/cycling';
import { tssFromRpe } from '@/domain/load';
import { dateStr, int, num, optInt, optNum, WORKOUT_TYPES } from './schemas';
import { requireProfile } from './api-util';

const activity = z.strictObject({
  source: z.enum(['fit', 'tcx', 'gpx', 'apple_health']),
  date: dateStr,
  startTime: z.string().max(40),
  durationMin: num(0.5, 1440),
  distanceKm: optNum(0, 5000),
  avgPowerW: optInt(0, 2000),
  normalizedPowerW: optInt(0, 2500),
  avgHr: optInt(30, 230),
  maxHr: optInt(30, 250),
  elevationM: optInt(0, 20000),
  kcal: optInt(0, 20000),
  type: z.enum(WORKOUT_TYPES),
  title: z.string().trim().min(1).max(160),
  externalId: z.string().min(1).max(120),
  rpe: optInt(1, 10),
});
export const workoutImportSchema = z.strictObject({ activities: z.array(activity).min(1).max(2000) });

export async function importWorkouts(userId: string, body: unknown) {
  const { activities } = workoutImportSchema.parse(body);
  const profile = await requireProfile(userId);
  return withTransaction(async (c) => {
    const tests = (await c.query('SELECT date, ftp_w FROM ftp_tests WHERE user_id = $1', [userId])).rows as { date: string; ftp_w: number }[];
    let imported = 0, duplicates = 0;
    for (const a of activities) {
      const np = a.normalizedPowerW ?? a.avgPowerW;
      let tss: number | null = null, src: 'power' | 'rpe' | null = null;
      const ftp = ftpOn(a.date, tests, profile.start_ftp_w);
      if (np && np > 0 && ftp > 0) { tss = tssFromPower(a.durationMin * 60, np, ftp); src = 'power'; }
      else if (a.rpe) { tss = tssFromRpe(a.durationMin, a.rpe); src = 'rpe'; }
      const res = await c.query(
        `INSERT INTO workouts (user_id, date, type, title, duration_min, distance_km, avg_power_w, normalized_power_w, avg_hr, max_hr, elevation_m, rpe, tss, tss_source, kcal, source, external_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (user_id, external_id) WHERE external_id IS NOT NULL DO NOTHING`,
        [userId, a.date, a.type, a.title, a.durationMin, a.distanceKm ?? null, a.avgPowerW ?? null, a.normalizedPowerW ?? null, a.avgHr ?? null, a.maxHr ?? null, a.elevationM ?? null, a.rpe ?? null, tss, src, a.kcal ?? null, a.source, a.externalId],
      );
      if (res.rowCount) imported++; else duplicates++;
    }
    return { imported, duplicates };
  });
}

export const weightImportSchema = z.strictObject({
  rows: z.array(z.strictObject({ date: dateStr, weight_kg: num(30, 300), body_fat_pct: optNum(3, 60) })).min(1).max(5000),
  overwrite: z.boolean().default(false),
});

export async function importWeights(userId: string, body: unknown) {
  const { rows, overwrite } = weightImportSchema.parse(body);
  return withTransaction(async (c) => {
    let imported = 0, skipped = 0;
    for (const r of rows) {
      const sql = overwrite
        ? `INSERT INTO weight_entries (user_id, date, weight_kg, body_fat_pct, source) VALUES ($1,$2,$3,$4,'import') ON CONFLICT (user_id, date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg, body_fat_pct = COALESCE(EXCLUDED.body_fat_pct, weight_entries.body_fat_pct), source = 'import'`
        : `INSERT INTO weight_entries (user_id, date, weight_kg, body_fat_pct, source) VALUES ($1,$2,$3,$4,'import') ON CONFLICT (user_id, date) DO NOTHING`;
      const res = await c.query(sql, [userId, r.date, r.weight_kg, r.body_fat_pct ?? null]);
      if (res.rowCount) imported++; else skipped++;
    }
    return { imported, skipped };
  });
}

export const restingHrImportSchema = z.strictObject({ rows: z.array(z.strictObject({ date: dateStr, resting_hr: int(25, 150) })).min(1).max(5000) });

/** Ruhepuls aus Apple Health in Check-ins schreiben (nur dieses Feld; vorhandene Check-in-Werte bleiben erhalten). */
export async function importRestingHr(userId: string, body: unknown) {
  const { rows } = restingHrImportSchema.parse(body);
  return withTransaction(async (c) => {
    for (const r of rows) {
      await c.query(`INSERT INTO readiness_checkins (user_id, date, resting_hr) VALUES ($1,$2,$3) ON CONFLICT (user_id, date) DO UPDATE SET resting_hr = EXCLUDED.resting_hr`, [userId, r.date, r.resting_hr]);
    }
    return { imported: rows.length };
  });
}
