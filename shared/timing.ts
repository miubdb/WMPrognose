// Realistische Spielzeit-Schätzung aus den Timern der Inhalte (Sekunden).
// Annahmen (Moderator-Rhythmus): Antworten dauern im Schnitt ~85 % des Limits (die Runde endet früher, wenn alle abgegeben haben),
// Regelkarte lesen, Auflösung ansehen und Host-Klicks sind pauschal berücksichtigt.
import type { TaskDef, TileDef } from './types';

export const OVERHEAD = {
  lobby: 8 * 60, intro: 90, scoreboard: 45, ceremony: 210,
  pick: 15, rules: 35, rulesSpecial: 50, begin: 6, lock: 5, next: 4,
};
/** expected: Runden enden im Schnitt nach ~85 % des Limits (oft geben alle früher ab). max: ALLE Limits werden voll ausgeschöpft, Moderation ~30 % langsamer. */
export type TimeMode = 'expected' | 'max';
const AVG = 0.85;
const SLOW = 1.3;

export function taskSeconds(t: TaskDef, m: TimeMode = 'expected'): { play: number; reveal: number } {
  const a = m === 'max' ? 1 : AVG;
  const rv = (x: number) => (m === 'max' ? x * SLOW : x);
  switch (t.mode) {
    case 'geo': return { play: t.seconds * a, reveal: rv(38) };
    case 'rank': return { play: t.items.length * (t.secondsPerItem * (m === 'max' ? 1 : 0.75) + 1.5), reveal: rv(55) };
    case 'estimate': return { play: t.seconds * a + t.betSeconds * a, reveal: rv(55) };
    case 'glitch': return { play: t.viewSeconds + t.seconds * a, reveal: rv(32) };
    case 'codebreak': return { play: t.seconds * a, reveal: rv(38) };
    case 'unique': return { play: t.seconds * a + (m === 'max' ? 60 : 30) /* Host-Prüfung */, reveal: rv(50) };
  }
}

export function tileSeconds(tile: TileDef, m: TimeMode = 'expected'): number {
  const special = tile.kind !== 'tile';
  const k = m === 'max' ? SLOW : 1;
  let s = (special ? OVERHEAD.rulesSpecial : OVERHEAD.pick + OVERHEAD.rules) * k;
  for (const t of tile.tasks) {
    const x = taskSeconds(t, m);
    // Finale/Überraschung: längere Spannungsbögen (Moderation, Auflösung langsam zelebrieren)
    const extra = tile.kind === 'final' ? { begin: 15, reveal: 35 } : tile.kind === 'surprise' ? { begin: 5, reveal: 25 } : { begin: 0, reveal: 0 };
    s += (OVERHEAD.begin + extra.begin + OVERHEAD.lock + extra.reveal + OVERHEAD.next) * k + x.play + x.reveal;
  }
  return s;
}

/** Gesamtdauer einer Show mit den gewählten sechs Kacheln (+ Überraschung + Finale). */
export function showSeconds(chosen: TileDef[], surprise: TileDef, final: TileDef, m: TimeMode = 'expected'): number {
  const k = m === 'max' ? SLOW : 1;
  return OVERHEAD.lobby + (OVERHEAD.intro + 3 * OVERHEAD.scoreboard + OVERHEAD.ceremony) * k + chosen.reduce((a, t) => a + tileSeconds(t, m), 0) + tileSeconds(surprise, m) + tileSeconds(final, m);
}
