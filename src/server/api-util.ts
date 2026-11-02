import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { todayIn, type DateStr } from '@/domain/dates';

export interface Profile {
  user_id: string; display_name: string | null; birth_year: number | null; height_cm: number | null; sex: 'm' | 'f' | null;
  activity_level: 'low' | 'moderate' | 'high'; start_date: DateStr; first_friendly_date: DateStr; main_goal_date: DateStr;
  start_weight_kg: number; target_weight_kg: number; start_ftp_w: number;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return queryOne<Profile>('SELECT * FROM profiles WHERE user_id = $1', [userId]);
}
export async function requireProfile(userId: string): Promise<Profile> {
  const p = await getProfile(userId);
  if (!p) throw new ApiError(409, 'onboarding_required', 'Bitte schließe zuerst das Onboarding ab (Ziele und Ausgangswerte).');
  return p;
}

/** Heutiges Datum (Europe/Berlin). APP_TODAY wird nur mit APP_ENV_TEST=1 beachtet (Testhilfe für deterministische Tests). */
export const today = (): DateStr => (process.env.APP_ENV_TEST === '1' && process.env.APP_TODAY ? process.env.APP_TODAY : todayIn('Europe/Berlin'));

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

export async function currentFtp(userId: string, profile: Profile, date: DateStr = today()): Promise<number> {
  const row = await queryOne<{ ftp_w: number }>('SELECT ftp_w FROM ftp_tests WHERE user_id = $1 AND date <= $2 ORDER BY date DESC, created_at DESC LIMIT 1', [userId, date]);
  return row?.ftp_w ?? profile.start_ftp_w;
}

export async function latestWeight(userId: string, profile: Profile): Promise<number> {
  const row = await queryOne<{ weight_kg: number }>('SELECT weight_kg FROM weight_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 1', [userId]);
  return row?.weight_kg ?? profile.start_weight_kg;
}

export { query };
