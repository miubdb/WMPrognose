import { z } from 'zod';
import { withTransaction } from '@/lib/db';
import { diffDays } from '@/domain/dates';
import { dateStr, int, num, optText } from './schemas';
import { getProfile } from './api-util';

export const profileSchema = z.strictObject({
  display_name: optText(80),
  birth_year: int(1920, 2020).nullish(),
  height_cm: num(100, 250).nullish(),
  sex: z.enum(['m', 'f']).nullish(),
  activity_level: z.enum(['low', 'moderate', 'high']).default('moderate'),
  start_date: dateStr,
  first_friendly_date: dateStr,
  main_goal_date: dateStr,
  start_weight_kg: num(30, 300),
  target_weight_kg: num(30, 300),
  start_ftp_w: int(50, 600),
}).superRefine((v, ctx) => {
  if (v.first_friendly_date <= v.start_date) ctx.addIssue({ code: 'custom', path: ['first_friendly_date'], message: 'Das erste Freundschaftsspiel muss nach dem Start liegen.' });
  if (v.main_goal_date < v.first_friendly_date) ctx.addIssue({ code: 'custom', path: ['main_goal_date'], message: 'Das Hauptziel darf nicht vor dem ersten Freundschaftsspiel liegen.' });
  else if (diffDays(v.main_goal_date, v.start_date) > 400) ctx.addIssue({ code: 'custom', path: ['main_goal_date'], message: 'Der Planungszeitraum darf höchstens 400 Tage umfassen.' });
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Legt das Profil an (inkl. Start-Gewicht und Start-FTP als erste Messwerte) bzw. aktualisiert es. */
export async function saveProfile(userId: string, body: unknown) {
  const p = profileSchema.parse(body);
  const existing = await getProfile(userId);
  await withTransaction(async (c) => {
    if (!existing) {
      await c.query(
        `INSERT INTO profiles (user_id, display_name, birth_year, height_cm, sex, activity_level, start_date, first_friendly_date, main_goal_date, start_weight_kg, target_weight_kg, start_ftp_w)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [userId, p.display_name ?? null, p.birth_year ?? null, p.height_cm ?? null, p.sex ?? null, p.activity_level, p.start_date, p.first_friendly_date, p.main_goal_date, p.start_weight_kg, p.target_weight_kg, p.start_ftp_w],
      );
      await c.query(`INSERT INTO weight_entries (user_id, date, weight_kg, source) VALUES ($1,$2,$3,'manual') ON CONFLICT DO NOTHING`, [userId, p.start_date, p.start_weight_kg]);
      await c.query(`INSERT INTO ftp_tests (user_id, date, ftp_w, method, notes) VALUES ($1,$2,$3,'initial','Ausgangswert aus dem Onboarding')`, [userId, p.start_date, p.start_ftp_w]);
      for (let wd = 1; wd <= 7; wd++) {
        await c.query('INSERT INTO availability (user_id, weekday) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, wd]);
      }
    } else {
      await c.query(
        `UPDATE profiles SET display_name=$2, birth_year=$3, height_cm=$4, sex=$5, activity_level=$6, start_date=$7, first_friendly_date=$8, main_goal_date=$9, start_weight_kg=$10, target_weight_kg=$11, start_ftp_w=$12 WHERE user_id=$1`,
        [userId, p.display_name ?? null, p.birth_year ?? null, p.height_cm ?? null, p.sex ?? null, p.activity_level, p.start_date, p.first_friendly_date, p.main_goal_date, p.start_weight_kg, p.target_weight_kg, p.start_ftp_w],
      );
    }
  });
  return getProfile(userId);
}

export const availabilitySchema = z.strictObject({
  days: z.array(z.strictObject({
    weekday: int(1, 7),
    available_minutes: int(0, 600),
    team_training: z.boolean(),
    team_training_minutes: int(0, 300),
    notes: optText(300),
  })).length(7, 'Es müssen genau 7 Wochentage übermittelt werden.'),
}).superRefine((v, ctx) => {
  const set = new Set(v.days.map((d) => d.weekday));
  if (set.size !== 7) ctx.addIssue({ code: 'custom', path: ['days'], message: 'Jeder Wochentag (1–7) muss genau einmal vorkommen.' });
  v.days.forEach((d, i) => {
    if (d.team_training && d.team_training_minutes <= 0) ctx.addIssue({ code: 'custom', path: ['days', i, 'team_training_minutes'], message: 'Bitte die Dauer des Mannschaftstrainings angeben.' });
  });
});

export async function saveAvailability(userId: string, body: unknown) {
  const { days } = availabilitySchema.parse(body);
  await withTransaction(async (c) => {
    for (const d of days) {
      await c.query(
        `INSERT INTO availability (user_id, weekday, available_minutes, team_training, team_training_minutes, notes) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id, weekday) DO UPDATE SET available_minutes = EXCLUDED.available_minutes, team_training = EXCLUDED.team_training, team_training_minutes = EXCLUDED.team_training_minutes, notes = EXCLUDED.notes`,
        [userId, d.weekday, d.available_minutes, d.team_training, d.team_training ? d.team_training_minutes : 0, d.notes ?? null],
      );
    }
  });
}
