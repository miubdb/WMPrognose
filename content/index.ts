import { TILES, SEED_PACK } from './tiles';
import { SHOW_PACK, SHOW_ROUNDS, SHOW_STEPS, POOL } from './show';
import type { Book } from '../server/engine';
export const BOOK: Book = { tiles: TILES };
/** Showpaket mit festem Ablauf + erweiterter Fragenpool (wird zusammen mit dem klassischen Standardpaket installiert). */
export const SEED_SHOW = { pack: SHOW_PACK, pool: POOL, rounds: SHOW_ROUNDS, steps: SHOW_STEPS };
import { SEED_SHOW2 } from './show2';
import { SEED_SHOW3, SEED_SHOW4 } from './show3';
import { SEED_SHOW_B42, SEED_SHOW_B42K } from './bestof';
import { SEED_SHOW_B43, SEED_SHOW_B43K } from './bestof2';
import { SEED_SHOW_B44, SEED_SHOW_B44K } from './bestof3';
import { SEED_SHOW_AFTER } from './aftershow';
import type { SeedShow } from '../server/content';
import { SEED_SHOW_NEWGAMES } from './newgames';
import { SEED_SHOW_SPIELMODI } from './spielmodi';
export const EXTRA_SHOWS = [SEED_SHOW2, SEED_SHOW3, SEED_SHOW4, SEED_SHOW_B42, SEED_SHOW_B42K, SEED_SHOW_B44, SEED_SHOW_B44K, SEED_SHOW_AFTER, SEED_SHOW_NEWGAMES, SEED_SHOW_SPIELMODI];   // show-5 / show-4z: Stand Praxistest 4 (enthält den Inhalt der Praxistest-3-Fassung B43 als Basis)
export { TILES, SEED_PACK, SEED_SHOW2, SEED_SHOW3, SEED_SHOW4, SEED_SHOW_B42, SEED_SHOW_B42K, SEED_SHOW_B43, SEED_SHOW_B43K, SEED_SHOW_B44, SEED_SHOW_B44K, SEED_SHOW_NEWGAMES, SEED_SHOW_SPIELMODI };

/**
 * Mitgelieferte Standardpakete einer NEUEN Installation: genau zwei Spieleabende (Paket-IDs show-4z und show-after).
 * Alle älteren Reus-/Test-/Legacy-Pakete werden auf frischen Installationen gar nicht erst angelegt.
 */
export const STANDARD_MAIN = 'show-4z', STANDARD_SECOND = 'show-after';
const ALL_SHOWS: SeedShow[] = [SEED_SHOW, ...EXTRA_SHOWS, SEED_SHOW_B43, SEED_SHOW_B43K];
const POOL_ALL = new Map([...TILES.flatMap(t => t.tasks.map((task, i) => ({ id: `${t.id}-${i + 1}`, topic: t.topic, task }))), ...ALL_SHOWS.flatMap(x => x.pool)].map(q => [q.id, q]));
const ROUNDS_ALL = new Map([...ALL_SHOWS.flatMap(x => x.rounds), ...TILES.map(t => ({ id: t.id, title: t.title, topic: t.topic, icon: t.icon, color: t.color, kind: t.kind, football: t.football, blurb: t.blurb, taskIds: t.tasks.map((_, i) => `${t.id}-${i + 1}`) }))].map(r => [r.id, r]));
/** Ein Standardpaket mit GENAU den Runden und Fragen, die sein Ablauf braucht (nichts darüber hinaus). */
function standard(sh: SeedShow, name: string, description: string): SeedShow {
  const cats = [...new Set(sh.steps.filter(x => x.k !== 'board').map(x => (x as { cat: string }).cat))];
  const rounds = cats.map(id => { const r = ROUNDS_ALL.get(id); if (!r) throw new Error('Runde fehlt im Standardpaket: ' + id); return r; });
  const pool = [...new Set(rounds.flatMap(r => r.taskIds))].map(id => { const q = POOL_ALL.get(id); if (!q) throw new Error('Frage fehlt im Standardpaket: ' + id); return q; });
  return { ...sh, pack: { ...sh.pack, name, description }, rounds, pool };
}
export const STANDARD_SHOWS: SeedShow[] = [
  standard(SEED_SHOW_B44K, 'Kickbase-Abend bei MJ – Hauptversion', 'Der komplette Abend: Best-of mit je einer Probe pro Spielmodus, Marktwert-Update nach jeder Runde und dem Finale KICKBASE-KONSENS. Start mit 0 Punkten.'),
  standard(SEED_SHOW_AFTER, 'Kickbase-Abend bei MJ – Zweite Version', 'Der zweite Abend „Nachspielzeit“ mit frischen Fragen, die in der Hauptversion nicht vorkommen, und Marktwert-Update nach jeder Runde.'),
];
