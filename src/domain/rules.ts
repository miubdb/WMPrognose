// Regelbasierte Anpassungsvorschläge (keine KI). Ergebnis ist ein Vorschlag, der bestätigt werden muss.
import { addDays, type DateStr } from './dates';
import type { PlanChange, SessionRow } from './proposals';
import type { ReadinessResult } from './readiness';

export interface RuleInput {
  today: DateStr;
  recentReadiness: { date: DateStr; result: ReadinessResult }[]; // letzte Tage
  tsb: number | null;
  upcoming: (SessionRow & { description?: string | null })[];
}

export interface RuleProposal { summary: string; rationale: string; changes: PlanChange[] }

/**
 * Wenn die Tagesform an den letzten 2 Check-ins niedrig war (Score < 45) oder die Form (TSB) stark negativ ist (< −30),
 * wird die nächste harte Einheit (Intensität 3) in den kommenden 3 Tagen zu lockerem Ausrollen/Mobilität herabgestuft.
 */
export function suggestDeload(i: RuleInput): RuleProposal | null {
  const scored = i.recentReadiness.filter((r) => r.result.score != null).sort((a, b) => b.date.localeCompare(a.date));
  const lastTwo = scored.slice(0, 2);
  const lowForm = lastTwo.length === 2 && lastTwo.every((r) => (r.result.score as number) < 45);
  const fatigued = i.tsb != null && i.tsb < -30;
  if (!lowForm && !fatigued) return null;
  const horizon = addDays(i.today, 3);
  const hard = i.upcoming.filter((s) => s.status === 'planned' && s.intensity === 3 && s.date >= i.today && s.date <= horizon && s.type !== 'spiel')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!hard) return null;
  const why = [lowForm ? `Die Tagesform lag an den letzten beiden Check-ins unter 45 (${lastTwo.map((r) => r.result.score).join(' und ')}).` : '', fatigued ? `Die Form (TSB) liegt bei ${i.tsb}, also deutlich im Ermüdungsbereich (< −30).` : ''].filter(Boolean).join(' ');
  return {
    summary: `Harte Einheit am ${hard.date} auf locker herabstufen`,
    rationale: why,
    changes: [{ op: 'update', id: hard.id, patch: { intensity: 1, title: `${hard.title} (reduziert)`, duration_min: Math.max(20, Math.round(hard.duration_min * 0.6)) }, reason: why }],
  };
}
