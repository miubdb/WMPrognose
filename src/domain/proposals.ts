// Änderungsvorschläge am Trainingsplan (KI oder Regeln). Werden NIE automatisch übernommen:
// Sie werden als 'pending' gespeichert und erst nach ausdrücklicher Bestätigung angewendet.
import { z } from 'zod';
import { isDateStr, type DateStr } from './dates';

export const PLAN_TYPES = ['rad', 'kraft', 'lauf', 'fussball', 'torwart', 'mannschaft', 'mobilitaet', 'test', 'spiel', 'ruhe'] as const;

const dateSchema = z.string().refine(isDateStr, 'Ungültiges Datum (JJJJ-MM-TT)');
const sessionFields = {
  date: dateSchema,
  type: z.enum(PLAN_TYPES),
  title: z.string().min(1).max(160),
  duration_min: z.number().int().min(0).max(600),
  intensity: z.number().int().min(1).max(3),
  description: z.string().max(2000).optional(),
};

const reason = z.string().min(1).max(500);

export const changeSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add'), session: z.object(sessionFields), reason }),
  z.object({ op: z.literal('update'), id: z.string().uuid(), patch: z.object(sessionFields).partial().refine((p) => Object.keys(p).length > 0, 'Leere Änderung'), reason }),
  z.object({ op: z.literal('delete'), id: z.string().uuid(), reason }),
]);
export type PlanChange = z.infer<typeof changeSchema>;

export const proposalSchema = z.object({
  summary: z.string().min(1).max(600),
  rationale: z.string().max(3000).optional(),
  changes: z.array(changeSchema).min(1).max(30),
});
export type ProposalInput = z.infer<typeof proposalSchema>;

export interface SessionRow { id: string; date: DateStr; type: string; title: string; duration_min: number; intensity: number; status: string }

export interface ValidationContext {
  today: DateStr;
  mainGoal: DateStr;
  sessions: SessionRow[]; // alle Plan-Sessions des Nutzers im relevanten Zeitraum
}

/** Prüft Änderungen gegen den echten Plan. Liefert Fehlertexte; leer = gültig. */
export function validateChanges(changes: PlanChange[], ctx: ValidationContext): string[] {
  const errors: string[] = [];
  const byId = new Map(ctx.sessions.map((s) => [s.id, s]));
  const touched = new Set<string>();
  changes.forEach((c, i) => {
    const n = `Änderung ${i + 1}`;
    if (c.op === 'add') {
      if (c.session.date < ctx.today) errors.push(`${n}: Datum liegt in der Vergangenheit.`);
      if (c.session.date > ctx.mainGoal) errors.push(`${n}: Datum liegt nach dem Hauptziel.`);
      if (c.session.type === 'spiel') errors.push(`${n}: Spiele werden über Termine angelegt, nicht über den Plan.`);
    } else {
      const s = byId.get(c.id);
      if (!s) { errors.push(`${n}: Einheit existiert nicht (mehr).`); return; }
      if (touched.has(c.id)) errors.push(`${n}: Einheit wird mehrfach verändert.`);
      touched.add(c.id);
      if (s.status !== 'planned') errors.push(`${n}: "${s.title}" ist bereits erledigt/übersprungen und kann nicht geändert werden.`);
      if (s.date < ctx.today) errors.push(`${n}: "${s.title}" liegt in der Vergangenheit.`);
      if (s.type === 'spiel') errors.push(`${n}: Spieltage können nicht verändert werden.`);
      if (c.op === 'update') {
        if (c.patch.date && c.patch.date < ctx.today) errors.push(`${n}: Neues Datum liegt in der Vergangenheit.`);
        if (c.patch.date && c.patch.date > ctx.mainGoal) errors.push(`${n}: Neues Datum liegt nach dem Hauptziel.`);
        if (c.patch.type === 'spiel') errors.push(`${n}: Typ "spiel" ist nicht erlaubt.`);
      }
    }
  });
  return errors;
}

export function describeChange(c: PlanChange, sessions: SessionRow[]): string {
  const find = (id: string) => sessions.find((s) => s.id === id);
  if (c.op === 'add') return `Neu: ${c.session.date} – ${c.session.title} (${c.session.duration_min} min, Intensität ${c.session.intensity})`;
  const s = find(c.id);
  const label = s ? `${s.date} – ${s.title}` : c.id;
  if (c.op === 'delete') return `Entfernen: ${label}`;
  return `Ändern: ${label} → ${Object.entries(c.patch).map(([k, v]) => `${k}=${v}`).join(', ')}`;
}
