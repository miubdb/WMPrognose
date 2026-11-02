import { z } from 'zod';
import { query, withTransaction } from '@/lib/db';
import { badRequest } from '@/lib/errors';
import { diffDays } from '@/domain/dates';
import { generatePlan } from '@/domain/planner';
import { dateStr } from './schemas';
import { currentFtp, requireProfile, today } from './api-util';

const rangeSchema = z.strictObject({ from: dateStr.optional(), to: dateStr.optional() });

export async function generateForUser(userId: string, body: unknown) {
  const { from: f, to: t } = rangeSchema.parse(body ?? {});
  const profile = await requireProfile(userId);
  const todayStr = today();
  const from = f ?? (todayStr > profile.start_date ? todayStr : profile.start_date);
  const to = t ?? profile.main_goal_date;
  if (from > to) throw badRequest('Das Von-Datum liegt nach dem Bis-Datum.');
  if (from < todayStr && from < profile.start_date) throw badRequest('Der Zeitraum beginnt vor dem Start der Vorbereitung.');
  if (diffDays(to, from) > 200) throw badRequest('Der Zeitraum darf höchstens 200 Tage umfassen.');

  const [availability, exceptions, events, kept, ftp] = await Promise.all([
    query<{ weekday: number; available_minutes: number; team_training: boolean; team_training_minutes: number }>('SELECT weekday, available_minutes, team_training, team_training_minutes FROM availability WHERE user_id = $1', [userId]),
    query<{ date: string; available_minutes: number }>('SELECT date, available_minutes FROM availability_exceptions WHERE user_id = $1 AND date BETWEEN $2 AND $3', [userId, from, to]),
    query<{ date: string; title: string; kind: string }>(`SELECT date, title, kind FROM events WHERE user_id = $1 AND kind IN ('friendly','main_goal','match') AND date BETWEEN $2 AND $3`, [userId, from, to]),
    query<{ date: string; duration_min: number; intensity: number }>(`SELECT date, duration_min, intensity FROM plan_sessions WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND NOT (source = 'generator' AND status = 'planned')`, [userId, from, to]),
    currentFtp(userId, profile),
  ]);

  const matchDates = new Map<string, { date: string; title: string; main?: boolean }>();
  for (const e of events) matchDates.set(e.date, { date: e.date, title: e.title, main: e.kind === 'main_goal' });
  matchDates.set(profile.first_friendly_date, { date: profile.first_friendly_date, title: 'Erstes Freundschaftsspiel' });
  matchDates.set(profile.main_goal_date, { date: profile.main_goal_date, title: 'Hauptziel', main: true });

  const result = generatePlan({
    milestones: { start: profile.start_date, firstFriendly: profile.first_friendly_date, mainGoal: profile.main_goal_date },
    ftp, availability, exceptions,
    matchDates: [...matchDates.values()],
    occupied: kept.map((k) => ({ date: k.date, minutes: k.duration_min, intensity: k.intensity })),
    from, to,
  });

  // Spieltage, die bereits als eigene (manuelle) Einheit existieren, nicht doppelt anlegen
  const keptDates = new Set((await query<{ date: string }>(`SELECT date FROM plan_sessions WHERE user_id = $1 AND type = 'spiel' AND date BETWEEN $2 AND $3 AND NOT (source = 'generator' AND status = 'planned')`, [userId, from, to])).map((r) => r.date));
  const sessions = result.sessions.filter((s) => !(s.type === 'spiel' && keptDates.has(s.date)));

  const deleted = await withTransaction(async (c) => {
    const del = await c.query(`DELETE FROM plan_sessions WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND source = 'generator' AND status = 'planned'`, [userId, from, to]);
    for (const s of sessions) {
      await c.query(
        `INSERT INTO plan_sessions (user_id, date, type, title, duration_min, intensity, description, details, phase, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'generator')`,
        [userId, s.date, s.type, s.title, s.duration_min, s.intensity, s.description, JSON.stringify(s.details), s.phase],
      );
    }
    return del.rowCount ?? 0;
  });
  return { from, to, created: sessions.length, deleted, unplaced: result.unplaced };
}
