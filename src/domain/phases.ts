import { addDays, diffDays, startOfWeek, type DateStr } from './dates';

export type PhaseKey = 'vorher' | 'grundlage' | 'aufbau' | 'spezifisch' | 'spielwoche' | 'hauptphase' | 'finale' | 'danach';

export interface Phase { key: PhaseKey; label: string; focus: string }

export const PHASES: Record<PhaseKey, Phase> = {
  vorher: { key: 'vorher', label: 'Vor der Vorbereitung', focus: 'Die dokumentierte Vorbereitung hat noch nicht begonnen.' },
  grundlage: { key: 'grundlage', label: 'Grundlagen', focus: 'Allgemeine Fitness: aerobe Basis (Rad), Grundkraft, Gewichtsreduktion, erste Torwart-Technik.' },
  aufbau: { key: 'aufbau', label: 'Aufbau', focus: 'Höhere Intensität (Sweetspot/Schwelle), Maximalkraft, Lauf- und Beschleunigungsreize, mehr Torwarttraining.' },
  spezifisch: { key: 'spezifisch', label: 'Fußballspezifisch', focus: 'Sprint, Agilität, Plyometrie, Torwart-Reaktion/1-gegen-1, wiederholte intensive Belastungen.' },
  spielwoche: { key: 'spielwoche', label: 'Spielwoche Freundschaftsspiel', focus: 'Umfang reduzieren, Frische aufbauen, Aktivierung, Spiel am Wochenende.' },
  hauptphase: { key: 'hauptphase', label: 'Hauptphase', focus: 'Fußballspezifische Leistungsfähigkeit ausbauen und erhalten; Auswertung des Freundschaftsspiels einarbeiten.' },
  finale: { key: 'finale', label: 'Finalwoche Hauptziel', focus: 'Taper: Frische für das Hauptziel, kurze scharfe Reize.' },
  danach: { key: 'danach', label: 'Nach dem Hauptziel', focus: 'Die geplante Vorbereitung ist abgeschlossen.' },
};

export interface Milestones { start: DateStr; firstFriendly: DateStr; mainGoal: DateStr }

export interface PhaseBoundaries {
  aufbauStart: DateStr;
  spezifischStart: DateStr;
  spielwocheStart: DateStr;
}

/**
 * Phasen werden wochenweise (ab Montag) abgegrenzt, damit jede Trainingswoche genau einer Phase angehört:
 * Aufbau = 8 Wochen, Spezifisch = 4 Wochen, Spielwoche = Woche des Freundschaftsspiels (jeweils bezogen auf deren Montag).
 * Bei kurzer Vorlaufzeit werden die Grenzen auf den Start begrenzt.
 */
export function boundaries(m: Milestones): PhaseBoundaries & { finaleStart: DateStr } {
  const clamp = (d: DateStr) => (d < m.start ? m.start : d);
  const fWeek = startOfWeek(m.firstFriendly);
  const finale = startOfWeek(m.mainGoal);
  return {
    aufbauStart: clamp(addDays(fWeek, -56)),
    spezifischStart: clamp(addDays(fWeek, -28)),
    spielwocheStart: clamp(fWeek),
    finaleStart: finale > m.firstFriendly ? finale : addDays(m.firstFriendly, 1),
  };
}

export function phaseOf(date: DateStr, m: Milestones): PhaseKey {
  if (date < m.start) return 'vorher';
  if (date > m.mainGoal) return 'danach';
  const b = boundaries(m);
  if (date > m.firstFriendly) return date >= b.finaleStart ? 'finale' : 'hauptphase';
  if (date >= b.spielwocheStart) return 'spielwoche';
  if (date >= b.spezifischStart) return 'spezifisch';
  if (date >= b.aufbauStart) return 'aufbau';
  return 'grundlage';
}

/**
 * Anteil fußballspezifischer Inhalte (0..1) am Trainingsschwerpunkt.
 * Steigt stetig von 0,10 (Start) über 0,45 (Beginn Spezifisch) auf 0,80 (Spielwoche) und bleibt danach hoch.
 */
export function specificity(date: DateStr, m: Milestones): number {
  const k = phaseOf(date, m);
  if (k === 'vorher') return 0.1;
  if (k === 'danach') return 0.8;
  const b = boundaries(m);
  const lerp = (a: number, bb: number, from: DateStr, to: DateStr) => {
    const span = Math.max(1, diffDays(to, from));
    const t = Math.min(1, Math.max(0, diffDays(date, from) / span));
    return a + (bb - a) * t;
  };
  switch (k) {
    case 'grundlage': return lerp(0.1, 0.25, m.start, b.aufbauStart);
    case 'aufbau': return lerp(0.25, 0.45, b.aufbauStart, b.spezifischStart);
    case 'spezifisch': return lerp(0.45, 0.8, b.spezifischStart, b.spielwocheStart);
    case 'spielwoche': return 0.8;
    case 'hauptphase': return 0.8;
    case 'finale': return 0.85;
  }
}

/** Entlastungswoche: jede vierte Woche seit Start (Woche 4, 8, 12, …), sofern keine Spiel-/Finalwoche. */
export function isDeloadWeek(date: DateStr, m: Milestones): boolean {
  const weekStart = startOfWeek(date);
  const idx = Math.floor(diffDays(weekStart, startOfWeek(m.start)) / 7);
  if (idx < 0) return false;
  const k = phaseOf(date, m);
  if (k === 'spielwoche' || k === 'finale') return false;
  // Woche, die das Freundschaftsspiel oder Hauptziel enthält, nie als Deload markieren
  const weekEnd = addDays(weekStart, 6);
  if ((m.firstFriendly >= weekStart && m.firstFriendly <= weekEnd) || (m.mainGoal >= weekStart && m.mainGoal <= weekEnd)) return false;
  return (idx + 1) % 4 === 0;
}

export function daysUntil(target: DateStr, today: DateStr): number {
  return diffDays(target, today);
}
