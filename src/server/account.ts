import { z } from 'zod';
import { query, queryOne, withTransaction } from '@/lib/db';
import { forbidden, unauthorized } from '@/lib/errors';
import { hashPassword, verifyPassword } from '@/lib/auth';

const USER_TABLES = ['profiles', 'availability', 'availability_exceptions', 'events', 'ftp_tests', 'weight_entries', 'plan_sessions', 'workouts', 'plan_proposals', 'readiness_checkins', 'foods', 'food_entries', 'gk_exercises', 'gk_sessions', 'match_analyses', 'coach_messages'];

export async function exportAll(userId: string, email: string) {
  const data: Record<string, unknown> = { exported_at: new Date().toISOString(), user: { id: userId, email } };
  for (const t of USER_TABLES) data[t] = await query(`SELECT * FROM ${t} WHERE user_id = $1`, [userId]);
  return data;
}

const pwSchema = z.strictObject({ password: z.string().min(1).max(200) });

export async function deleteAccount(userId: string, body: unknown) {
  const { password } = pwSchema.parse(body);
  const u = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!u || !(await verifyPassword(password, u.password_hash))) throw forbidden('Das Passwort ist falsch. Das Konto wurde nicht gelöscht.');
  await withTransaction(async (c) => { await c.query('DELETE FROM users WHERE id = $1', [userId]); });
  return { deleted: true };
}

const changeSchema = z.strictObject({ current_password: z.string().min(1).max(200), new_password: z.string().min(10, 'Mindestens 10 Zeichen').max(200) });
export async function changePassword(userId: string, body: unknown) {
  const { current_password, new_password } = changeSchema.parse(body);
  const u = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!u) throw unauthorized();
  if (!(await verifyPassword(current_password, u.password_hash))) throw forbidden('Das aktuelle Passwort ist falsch.');
  await query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, await hashPassword(new_password)]);
  return { changed: true };
}
