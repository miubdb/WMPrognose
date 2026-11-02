import { z } from 'zod';
import { query, queryOne, withTransaction } from '@/lib/db';
import { badRequest, conflict, notFound, unprocessable } from '@/lib/errors';
import { validateChanges, proposalSchema, type PlanChange, type SessionRow } from '@/domain/proposals';
import { suggestDeload } from '@/domain/rules';
import { addDays } from '@/domain/dates';
import { readiness } from '@/domain/readiness';
import { assertId } from './crud';
import { requireProfile, today } from './api-util';
import { pmcStats, readinessHistory } from './dashboard';

type PlanRow = SessionRow;

async function loadSessions(userId: string, from: string): Promise<PlanRow[]> {
  return query<PlanRow>('SELECT id, date, type, title, duration_min, intensity, status FROM plan_sessions WHERE user_id = $1 AND date >= $2', [userId, from]);
}

/** Speichert einen Vorschlag als 'pending' – NIE automatisch angewendet. */
export async function storeProposal(userId: string, source: 'ai' | 'rule', input: unknown) {
  const p = proposalSchema.parse(input);
  const profile = await requireProfile(userId);
  const sessions = await loadSessions(userId, addDays(today(), -1));
  const errors = validateChanges(p.changes, { today: today(), mainGoal: profile.main_goal_date, sessions });
  if (errors.length) throw unprocessable(`Der Vorschlag ist ungültig: ${errors.join(' ')}`);
  return queryOne(
    `INSERT INTO plan_proposals (user_id, source, summary, rationale, changes) VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *`,
    [userId, source, p.summary, p.rationale ?? null, JSON.stringify(p.changes)],
  );
}

export async function listProposals(userId: string, status?: string | null) {
  const rows = await query<{ id: string; changes: PlanChange[]; status: string }>(
    `SELECT * FROM plan_proposals WHERE user_id = $1 ${status ? 'AND status = $2' : ''} ORDER BY created_at DESC LIMIT 50`,
    status ? [userId, status] : [userId],
  );
  const sessions = await query<PlanRow>('SELECT id, date, type, title, duration_min, intensity, status FROM plan_sessions WHERE user_id = $1', [userId]);
  return rows.map((r) => ({ ...r, currentSessions: sessions.filter((s) => r.changes.some((c) => 'id' in c && c.id === s.id)) }));
}

const decisionSchema = z.strictObject({ decision: z.enum(['accept', 'reject']) });

export async function decideProposal(userId: string, id: string, body: unknown) {
  assertId(id);
  const { decision } = decisionSchema.parse(body);
  const profile = await requireProfile(userId);
  return withTransaction(async (c) => {
    const row = (await c.query('SELECT * FROM plan_proposals WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId])).rows[0] as { status: string; changes: PlanChange[] } | undefined;
    if (!row) throw notFound('Vorschlag nicht gefunden.');
    if (row.status !== 'pending') throw conflict('Dieser Vorschlag wurde bereits entschieden.');
    if (decision === 'reject') {
      await c.query(`UPDATE plan_proposals SET status = 'rejected', decided_at = now() WHERE id = $1`, [id]);
      return { status: 'rejected', applied: 0 };
    }
    const sessions = (await c.query('SELECT id, date, type, title, duration_min, intensity, status FROM plan_sessions WHERE user_id = $1 FOR UPDATE', [userId])).rows as PlanRow[];
    const errors = validateChanges(row.changes, { today: today(), mainGoal: profile.main_goal_date, sessions });
    if (errors.length) throw conflict(`Der Vorschlag passt nicht mehr zum aktuellen Plan und wurde nicht übernommen: ${errors.join(' ')}`);
    for (const ch of row.changes) {
      if (ch.op === 'add') {
        const s = ch.session;
        await c.query(`INSERT INTO plan_sessions (user_id, date, type, title, duration_min, intensity, description, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [userId, s.date, s.type, s.title, s.duration_min, s.intensity, s.description ?? null, 'ai']);
      } else if (ch.op === 'delete') {
        await c.query('DELETE FROM plan_sessions WHERE id = $1 AND user_id = $2', [ch.id, userId]);
      } else {
        const keys = Object.keys(ch.patch) as (keyof typeof ch.patch)[];
        const sets = keys.map((k, i) => `${k} = $${i + 3}`);
        if (!keys.every((k) => /^[a-z_]+$/.test(k))) throw badRequest('Ungültiges Feld.');
        await c.query(`UPDATE plan_sessions SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2`, [ch.id, userId, ...keys.map((k) => ch.patch[k])]);
      }
    }
    await c.query(`UPDATE plan_proposals SET status = 'accepted', decided_at = now() WHERE id = $1`, [id]);
    return { status: 'accepted', applied: row.changes.length };
  });
}

/** Regelbasierter Entlastungsvorschlag (keine KI). Gibt null zurück, wenn keine Anpassung nötig ist. */
export async function ruleCheck(userId: string) {
  const profile = await requireProfile(userId);
  const t = today();
  const [rd, p, upcoming] = await Promise.all([
    readinessHistory(userId, 7),
    pmcStats(userId, addDays(t, -1), t),
    query<PlanRow>('SELECT id, date, type, title, duration_min, intensity, status FROM plan_sessions WHERE user_id = $1 AND date >= $2 AND date <= $3', [userId, t, addDays(t, 3)]),
  ]);
  const existing = await queryOne(`SELECT 1 FROM plan_proposals WHERE user_id = $1 AND status = 'pending' AND source = 'rule'`, [userId]);
  if (existing) throw conflict('Es liegt bereits ein offener Regelvorschlag vor. Bitte zuerst entscheiden.');
  const suggestion = suggestDeload({
    today: t,
    recentReadiness: rd.map((r) => ({ date: r.date, result: { score: r.score, level: r.level, usedFactors: r.usedFactors, missing: r.missing } })),
    tsb: p.points.length ? p.points[p.points.length - 1].tsb : null,
    upcoming,
  });
  void profile; void readiness;
  if (!suggestion) return { proposal: null, message: 'Aktuell ist keine Anpassung nötig: Tagesform und Belastung geben keinen Anlass zur Entlastung.' };
  const proposal = await storeProposal(userId, 'rule', suggestion);
  return { proposal, message: 'Es gibt einen Vorschlag – bitte prüfen und bestätigen oder ablehnen.' };
}
