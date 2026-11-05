// Realistische Spielzeit-Schätzung aus den Timern der Inhalte (Sekunden).
// Annahmen (Moderator-Rhythmus): Antworten dauern im Schnitt ~85 % des Limits (die Runde endet früher, wenn alle abgegeben haben),
// Regelkarte lesen, Auflösung ansehen und Host-Klicks sind pauschal berücksichtigt.
import type { TaskDef, TileDef } from './types';

export const OVERHEAD = {
  lobby: 8 * 60, intro: 90, scoreboard: 45, ceremony: 210,
  pick: 15, rules: 35, rulesSpecial: 50, begin: 6, lock: 5, next: 4,
};
const AVG = 0.85;

export function taskSeconds(t: TaskDef): { play: number; reveal: number } {
  switch (t.mode) {
    case 'geo': return { play: t.seconds * AVG, reveal: 38 };
    case 'rank': return { play: t.items.length * (t.secondsPerItem * 0.75 + 1.5), reveal: 55 };
    case 'estimate': return { play: t.seconds * AVG + t.betSeconds * AVG, reveal: 55 };
    case 'glitch': return { play: t.viewSeconds + t.seconds * AVG, reveal: 32 };
    case 'codebreak': return { play: t.seconds * AVG, reveal: 38 };
    case 'unique': return { play: t.seconds * AVG + 30 /* Host-Prüfung */, reveal: 50 };
  }
}

export function tileSeconds(tile: TileDef): number {
  const special = tile.kind !== 'tile';
  let s = (special ? OVERHEAD.rulesSpecial : OVERHEAD.pick + OVERHEAD.rules);
  for (const t of tile.tasks) {
    const x = taskSeconds(t);
    // Finale/Überraschung: längere Spannungsbögen (Moderation, Auflösung langsam zelebrieren)
    const extra = tile.kind === 'final' ? { begin: 15, reveal: 35 } : tile.kind === 'surprise' ? { begin: 5, reveal: 25 } : { begin: 0, reveal: 0 };
    s += OVERHEAD.begin + extra.begin + x.play + OVERHEAD.lock + x.reveal + extra.reveal + OVERHEAD.next;
  }
  return s;
}

/** Gesamtdauer einer Show mit den gewählten sechs Kacheln (+ Überraschung + Finale). */
export function showSeconds(chosen: TileDef[], surprise: TileDef, final: TileDef): number {
  return OVERHEAD.lobby + OVERHEAD.intro + chosen.reduce((a, t) => a + tileSeconds(t), 0) + tileSeconds(surprise) + tileSeconds(final) + 3 * OVERHEAD.scoreboard + OVERHEAD.ceremony;
}
