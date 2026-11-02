import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { ApiError, tooMany, unprocessable } from '@/lib/errors';
import type { PlanChange } from '@/domain/proposals';
import { requireProfile } from '@/server/api-util';
import { storeProposal } from '@/server/proposals';
import { aiModel, getLlm } from './llm';
import { buildCoachContext } from './context';

export const SYSTEM_PROMPT = `Du bist der Trainings-Coach der App "Road to Matchday". Die Nutzerin bzw. der Nutzer ist Torwart und bereitet sich auf das erste Freundschaftsspiel und das Hauptziel der Saisonvorbereitung vor (Rad/FTP, Kraft, Lauf, Torwarttraining, Gewicht).

Regeln:
- Antworte immer auf Deutsch, präzise und praxisnah, ohne lange Einleitung.
- Stütze dich AUSSCHLIESSLICH auf die mitgelieferten Daten im Block <daten>. Erfinde keine Messwerte, Trainings, Trends oder Ergebnisse. Wenn Daten fehlen oder zu dünn sind (siehe datenqualitaet), sage das offen und gib nur Aussagen ab, die die Daten tragen.
- Berücksichtige Ziele, Phase, Verfügbarkeit, aktuelle Belastung (CTL/ATL/TSB), Tagesform/Regeneration, Gewichtsverlauf und Ernährung.
- Das Hauptziel verlangt rechtzeitig den Schwerpunkt von allgemeiner Fitness auf fußballspezifische Leistungsfähigkeit; das Zielgewicht ist eine flexible Orientierung, kein Zwang.
- Änderungen am Trainingsplan machst du NIE direkt, sondern nur über das Werkzeug propose_plan_changes. Es darf nur auf bestehende Einheiten aus geplante_einheiten_naechste_14_tage (mit deren id) verweisen oder neue Einheiten ab heute vorschlagen. Die Nutzerin bzw. der Nutzer muss jeden Vorschlag bestätigen. Rufe das Werkzeug nur auf, wenn eine Planänderung wirklich sinnvoll und begründbar ist; begründe jede Änderung mit konkreten Datenpunkten.
- Du bist kein Arzt. Bei Schmerzen, Verletzungen oder Warnzeichen empfiehl ärztliche Abklärung.
- Schreibe nichts über Daten, die nicht im Block <daten> stehen.`;

const nullable = (t: object) => ({ anyOf: [t, { type: 'null' }] });

export const PROPOSE_TOOL: Anthropic.Tool = {
  name: 'propose_plan_changes',
  description: 'Schlägt Änderungen am Trainingsplan vor. Wird NICHT automatisch übernommen; die Nutzerin bzw. der Nutzer bestätigt oder lehnt ab. Nur bestehende Einheiten (id aus den Daten) ändern/löschen, neue Einheiten nur ab heute.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'rationale', 'changes'],
    properties: {
      summary: { type: 'string', description: 'Ein Satz: was wird geändert' },
      rationale: { type: 'string', description: 'Begründung anhand der Daten' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['op', 'id', 'reason', 'date', 'type', 'title', 'duration_min', 'intensity', 'description'],
          properties: {
            op: { type: 'string', enum: ['add', 'update', 'delete'] },
            id: nullable({ type: 'string', description: 'UUID der bestehenden Einheit (update/delete), sonst null' }),
            reason: { type: 'string' },
            date: nullable({ type: 'string', description: 'YYYY-MM-DD' }),
            type: nullable({ type: 'string', enum: ['rad', 'kraft', 'lauf', 'fussball', 'torwart', 'mannschaft', 'mobilitaet', 'test', 'ruhe'] }),
            title: nullable({ type: 'string' }),
            duration_min: nullable({ type: 'integer' }),
            intensity: nullable({ type: 'integer', description: '1 locker, 2 mittel, 3 hart' }),
            description: nullable({ type: 'string' }),
          },
        },
      },
    },
  },
};

const flatChange = z.object({
  op: z.enum(['add', 'update', 'delete']),
  id: z.string().nullable(), reason: z.string(),
  date: z.string().nullable(), type: z.string().nullable(), title: z.string().nullable(),
  duration_min: z.number().nullable(), intensity: z.number().nullable(), description: z.string().nullable(),
});
const toolInput = z.object({ summary: z.string(), rationale: z.string(), changes: z.array(flatChange).min(1) });

/** Wandelt die flache Werkzeug-Eingabe in typisierte Änderungen um. Unvollständige Angaben → Fehler statt Raten. */
export function toPlanChanges(input: unknown): { summary: string; rationale: string; changes: PlanChange[] } {
  const p = toolInput.parse(input);
  const changes: PlanChange[] = p.changes.map((c, i) => {
    const n = `Änderung ${i + 1}`;
    if (c.op === 'delete') {
      if (!c.id) throw unprocessable(`${n}: Löschen ohne Einheit-ID.`);
      return { op: 'delete', id: c.id, reason: c.reason };
    }
    if (c.op === 'update') {
      if (!c.id) throw unprocessable(`${n}: Ändern ohne Einheit-ID.`);
      const patch: Record<string, unknown> = {};
      for (const k of ['date', 'type', 'title', 'duration_min', 'intensity', 'description'] as const) if (c[k] != null) patch[k] = c[k];
      return { op: 'update', id: c.id, patch, reason: c.reason } as PlanChange;
    }
    if (!c.date || !c.type || !c.title || c.duration_min == null || c.intensity == null) throw unprocessable(`${n}: Neue Einheit ist unvollständig.`);
    return { op: 'add', session: { date: c.date, type: c.type, title: c.title, duration_min: c.duration_min, intensity: c.intensity, description: c.description ?? undefined }, reason: c.reason } as PlanChange;
  });
  return { summary: p.summary, rationale: p.rationale, changes };
}

export async function enforceDailyLimit(userId: string, kind: string) {
  const limit = Number(process.env.AI_DAILY_LIMIT ?? 40);
  const row = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM ai_usage WHERE user_id = $1 AND at > now() - interval '24 hours'`, [userId]);
  if ((row?.n ?? 0) >= limit) throw tooMany(`Das Tageslimit für KI-Anfragen (${limit}) ist erreicht. Bitte morgen erneut versuchen.`);
  await query('INSERT INTO ai_usage (user_id, kind) VALUES ($1, $2)', [userId, kind]);
}

const chatSchema = z.strictObject({ message: z.string().trim().min(1, 'Bitte eine Nachricht eingeben.').max(4000) });

export async function coachChat(userId: string, body: unknown) {
  const { message } = chatSchema.parse(body);
  const profile = await requireProfile(userId);
  const llm = getLlm(); // wirft verständlichen 503, wenn nicht konfiguriert
  await enforceDailyLimit(userId, 'coach');

  const context = await buildCoachContext(userId, profile);
  const history = await query<{ role: 'user' | 'assistant'; content: string }>(
    `SELECT role, content FROM (SELECT role, content, created_at FROM coach_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10) h ORDER BY created_at ASC`, [userId]);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: `<daten>\n${JSON.stringify(context)}\n</daten>\n\n${message}` },
  ];
  // API verlangt, dass die erste Nachricht vom Nutzer stammt
  while (messages.length > 1 && messages[0].role !== 'user') messages.shift();

  const res = await llm.create({
    model: aiModel(),
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [PROPOSE_TOOL],
    output_config: { effort: 'medium' },
    messages,
  });

  let reply = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
  let proposal: unknown = null;
  let note: string | null = null;

  if (res.stop_reason === 'refusal') {
    reply = 'Diese Anfrage hat das Modell aus Sicherheitsgründen abgelehnt. Bitte formuliere sie anders.';
  } else {
    const use = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === PROPOSE_TOOL.name);
    if (res.stop_reason === 'max_tokens') note = 'Die Antwort wurde wegen der Längenbegrenzung abgeschnitten.';
    if (use && res.stop_reason !== 'max_tokens') {
      try {
        const p = toPlanChanges(use.input);
        proposal = await storeProposal(userId, 'ai', p);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof z.ZodError ? 'Die Struktur des Vorschlags war ungültig.' : 'Der Vorschlag konnte nicht verarbeitet werden.';
        note = `Der Planvorschlag der KI wurde verworfen, weil er nicht zum aktuellen Plan passt (${msg}). Es wurde nichts geändert.`;
      }
    }
  }
  if (!reply) reply = proposal ? 'Ich habe einen Planvorschlag erstellt – bitte unten prüfen und bestätigen oder ablehnen.' : 'Ich konnte dazu keine Antwort erzeugen.';
  if (note) reply += `\n\n⚠️ ${note}`;

  await query(`INSERT INTO coach_messages (user_id, role, content) VALUES ($1,'user',$2)`, [userId, message]);
  const proposalId = (proposal as { id?: string } | null)?.id ?? null;
  await query(`INSERT INTO coach_messages (user_id, role, content, proposal_id) VALUES ($1,'assistant',$2,$3)`, [userId, reply, proposalId]);
  return { reply, proposal };
}

export async function coachMessages(userId: string) {
  return query(`SELECT m.id, m.role, m.content, m.created_at, m.proposal_id, p.status AS proposal_status FROM coach_messages m LEFT JOIN plan_proposals p ON p.id = m.proposal_id WHERE m.user_id = $1 ORDER BY m.created_at ASC LIMIT 200`, [userId]);
}
export async function clearCoachMessages(userId: string) {
  await query('DELETE FROM coach_messages WHERE user_id = $1', [userId]);
  return { cleared: true };
}
