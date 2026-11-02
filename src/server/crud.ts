import type { PoolClient } from 'pg';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '@/lib/db';
import { badRequest, conflict, notFound, unprocessable } from '@/lib/errors';
import { ftpOn, tss as tssFromPower } from '@/domain/cycling';
import { tssFromRpe } from '@/domain/load';
import { isDateStr } from '@/domain/dates';
import { RESOURCES, type Resource } from './resources';

type Row = Record<string, unknown>;

export function resourceOf(name: string): Resource {
  const r = RESOURCES[name];
  if (!r) throw notFound('Unbekannte Ressource.');
  return r;
}

const SAFE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assertId(id: string): void {
  if (!SAFE_ID.test(id)) throw badRequest('Ungültige ID.');
}

function toDb(r: Resource, data: Row): { cols: string[]; vals: unknown[] } {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (!/^[a-z_0-9]+$/.test(k)) throw badRequest('Ungültiges Feld.');
    cols.push(k);
    vals.push(r.jsonb?.includes(k) ? JSON.stringify(v) : v);
  }
  return { cols, vals };
}

function placeholders(r: Resource, cols: string[], start: number): string[] {
  return cols.map((c, i) => `$${start + i}${r.jsonb?.includes(c) ? '::jsonb' : ''}`);
}

export async function listRows(userId: string, name: string, q: { from?: string | null; to?: string | null; limit?: number }): Promise<Row[]> {
  const r = resourceOf(name);
  const params: unknown[] = [userId];
  let where = 'user_id = $1';
  if (r.dateColumn) {
    if (q.from) { if (!isDateStr(q.from)) throw badRequest('Ungültiges Von-Datum.'); params.push(q.from); where += ` AND ${r.dateColumn} >= $${params.length}`; }
    if (q.to) { if (!isDateStr(q.to)) throw badRequest('Ungültiges Bis-Datum.'); params.push(q.to); where += ` AND ${r.dateColumn} <= $${params.length}`; }
  }
  const limit = Math.min(Math.max(q.limit ?? 1000, 1), 5000);
  return query(`SELECT * FROM ${r.table} WHERE ${where} ORDER BY ${r.order} LIMIT ${limit}`, params);
}

export async function getRow(userId: string, name: string, id: string): Promise<Row> {
  const r = resourceOf(name);
  assertId(id);
  const row = await queryOne(`SELECT * FROM ${r.table} WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!row) throw notFound(`${r.label} nicht gefunden.`);
  return row;
}

async function workoutDerived(c: PoolClient, userId: string, w: Row): Promise<{ tss: number | null; tss_source: 'power' | 'rpe' | null }> {
  const duration = Number(w.duration_min);
  const np = (w.normalized_power_w ?? w.avg_power_w) as number | null | undefined;
  if (np && np > 0) {
    const tests = (await c.query('SELECT date, ftp_w FROM ftp_tests WHERE user_id = $1', [userId])).rows as { date: string; ftp_w: number }[];
    const prof = (await c.query('SELECT start_ftp_w FROM profiles WHERE user_id = $1', [userId])).rows[0] as { start_ftp_w: number } | undefined;
    const ftp = ftpOn(String(w.date), tests, prof?.start_ftp_w ?? 0);
    if (ftp > 0) return { tss: tssFromPower(duration * 60, np, ftp), tss_source: 'power' };
  }
  if (w.rpe) return { tss: tssFromRpe(duration, Number(w.rpe)), tss_source: 'rpe' };
  return { tss: null, tss_source: null };
}

async function assertOwnsPlanSession(c: PoolClient, userId: string, id: unknown) {
  if (!id) return;
  const ok = await c.query('SELECT 1 FROM plan_sessions WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!ok.rowCount) throw unprocessable('Die verknüpfte Trainingseinheit existiert nicht.', { plan_session_id: 'Unbekannte Einheit' });
}

async function assertOwnsFood(c: PoolClient, userId: string, id: unknown) {
  if (!id) return;
  const ok = await c.query('SELECT 1 FROM foods WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!ok.rowCount) throw unprocessable('Das verknüpfte Lebensmittel existiert nicht.', { food_id: 'Unbekanntes Lebensmittel' });
}

function normalize(name: string, data: Row): Row {
  if (name === 'food-entries') {
    if (data.source === 'ai_estimate') data.is_estimate = true;
    if (data.source !== 'ai_estimate' && data.is_estimate === undefined) data.is_estimate = false;
  }
  return data;
}

async function insertRow(c: PoolClient, userId: string, name: string, data: Row): Promise<Row> {
  const r = resourceOf(name);
  const full: Row = { ...data };
  if (name === 'workouts') {
    await assertOwnsPlanSession(c, userId, data.plan_session_id);
    Object.assign(full, await workoutDerived(c, userId, data));
  }
  if (name === 'food-entries') await assertOwnsFood(c, userId, data.food_id);
  const { cols, vals } = toDb(r, full);
  const res = await c.query(
    `INSERT INTO ${r.table} (user_id, ${cols.join(', ')}) VALUES ($1, ${placeholders(r, cols, 2).join(', ')}) RETURNING *`,
    [userId, ...vals],
  );
  const row = res.rows[0] as Row;
  if (name === 'workouts' && row.plan_session_id) {
    await c.query(`UPDATE plan_sessions SET status = 'done' WHERE id = $1 AND user_id = $2`, [row.plan_session_id, userId]);
  }
  return row;
}

export async function createRow(userId: string, name: string, body: unknown): Promise<Row> {
  const r = resourceOf(name);
  const data = normalize(name, r.schema.parse(body) as Row);
  try {
    return await withTransaction((c) => insertRow(c, userId, name, data));
  } catch (e) {
    if ((e as { code?: string }).code === '23505' && r.conflictMessage) throw conflict(r.conflictMessage);
    throw e;
  }
}

export async function updateRow(userId: string, name: string, id: string, body: unknown): Promise<Row> {
  const r = resourceOf(name);
  assertId(id);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Ungültige Anfrage.');
  const patchKeys = Object.keys(body as Row);
  const known = new Set(Object.keys(r.schema.shape));
  for (const k of patchKeys) if (!known.has(k)) throw unprocessable(`Unbekanntes Feld: ${k}`, { [k]: 'Unbekanntes Feld' });
  try {
    return await withTransaction(async (c) => {
      const cur = (await c.query(`SELECT * FROM ${r.table} WHERE id = $1 AND user_id = $2 FOR UPDATE`, [id, userId])).rows[0] as Row | undefined;
      if (!cur) throw notFound(`${r.label} nicht gefunden.`);
      const merged: Row = {};
      for (const k of known) merged[k] = cur[k];
      Object.assign(merged, body);
      const data = normalize(name, r.schema.parse(merged) as Row);
      // nur geänderte Felder schreiben, abgeleitete Felder neu berechnen
      const changed: Row = {};
      for (const k of patchKeys) changed[k] = data[k];
      if (name === 'workouts') {
        await assertOwnsPlanSession(c, userId, data.plan_session_id);
        Object.assign(changed, await workoutDerived(c, userId, data));
      }
      if (name === 'food-entries') {
        await assertOwnsFood(c, userId, data.food_id);
        if ('source' in changed || 'is_estimate' in changed) changed.is_estimate = data.is_estimate;
      }
      const { cols, vals } = toDb(r, changed);
      if (!cols.length) return cur;
      const sets = cols.map((col, i) => `${col} = ${placeholders(r, [col], i + 3)[0]}`);
      const res = await c.query(`UPDATE ${r.table} SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`, [id, userId, ...vals]);
      const row = res.rows[0] as Row;
      if (name === 'workouts') {
        if (row.plan_session_id) await c.query(`UPDATE plan_sessions SET status = 'done' WHERE id = $1 AND user_id = $2`, [row.plan_session_id, userId]);
        if (cur.plan_session_id && cur.plan_session_id !== row.plan_session_id) await resetPlanStatus(c, userId, cur.plan_session_id as string);
      }
      return row;
    });
  } catch (e) {
    if ((e as { code?: string }).code === '23505' && r.conflictMessage) throw conflict(r.conflictMessage);
    throw e;
  }
}

async function resetPlanStatus(c: PoolClient, userId: string, planId: string) {
  const other = await c.query('SELECT 1 FROM workouts WHERE plan_session_id = $1 AND user_id = $2 LIMIT 1', [planId, userId]);
  if (!other.rowCount) await c.query(`UPDATE plan_sessions SET status = 'planned' WHERE id = $1 AND user_id = $2 AND status = 'done'`, [planId, userId]);
}

export async function deleteRow(userId: string, name: string, id: string): Promise<void> {
  const r = resourceOf(name);
  assertId(id);
  await withTransaction(async (c) => {
    const res = await c.query(`DELETE FROM ${r.table} WHERE id = $1 AND user_id = $2 RETURNING *`, [id, userId]);
    if (!res.rowCount) throw notFound(`${r.label} nicht gefunden.`);
    const row = res.rows[0] as Row;
    if (name === 'workouts' && row.plan_session_id) await resetPlanStatus(c, userId, row.plan_session_id as string);
  });
}

export { z };
