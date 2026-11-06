// „Reus 65 Mio – Best of 42“, Version 2 (Praxistest 3): neue Paket-IDs show-5 (FINAL LOCK, Standard) und show-4z (Finale KICKBASE-KONSENS).
// Gegenüber show-4: CL-2028-Frage statt CL-Finale 2025, Käserennen auf Weltkarte, MATCHMAKER Produktursprünge → Videospiel-Figuren (s3-match-spiele),
// SORTIER'S! mit Youssoufa Moukoko statt Niko Iličević. Alle übrigen Fragen unverändert (gleiche IDs). show-4 / show-4z / show-3 bleiben unberührt.
import type { ShowStep } from '../shared/types';
import { geo, rank, type PoolQuestion } from './show';
import type { SeedShow } from '../server/content';
import { BESTOF_NEW, BESTOF_PLAN, BESTOF_ROUNDS, SEED_SHOW_B42, SEED_SHOW_B42K } from './bestof';

const note = (q: PoolQuestion, review: string): PoolQuestion => (review ? { ...q, task: { ...q.task, review } as PoolQuestion['task'] } : q);

export const BESTOF2_NEW: PoolQuestion[] = [
  note(geo('b43-geo-2028', 'Fußball', 'europe', 60, 250, 'In welchem Stadion wird das Champions-League-Finale 2028 stattfinden?', 48.2188, 11.6247, 'Allianz Arena, München',
    'Wieder die Allianz Arena! Bei UEFA-Spielen heißt sie „Fußball Arena München“. München war schon 2012 und 2025 Finalort – 2028 kommt das Endspiel erneut dorthin (UEFA-Entscheidung vom 15. September 2026).'),
    ''),   // Quelle (UEFA-Meldung vom 15.09.2026, gelesen und bestätigt): docs/BESTOF42-REDAKTION.md
  (() => { const q = BESTOF_NEW.find(x => x.id === 'b42-geo-c04')!; return { id: 'b43-geo-c04', topic: q.topic, task: { ...q.task, map: 'world' } as PoolQuestion['task'] }; })(),
  rank('b43-rank-t05', 'Fußball', 'Sortiere nach Alter beim ersten Bundesligaspiel, jüngster zuerst.', 'jüngster Debütant', 'ältester Debütant', [
    ['Youssoufa Moukoko', '16 Jahre, 1 Tag'], ['Linus Güther', '16 Jahre, 3 Tage'], ['Paul Wanner', '16 Jahre, 15 Tage'], ['Louis Lemke', '16 Jahre, 214 Tage'], ['Tom Bischof', '16 Jahre, 264 Tage'],
  ], [4, 1, 3, 0, 2], 'Moukoko hält den Rekord seit 2020 – Niko Iličević stellte ihn am 1. November 2026 mit ebenfalls 16 Jahren und 1 Tag ein.'),
];
// Altersangaben laut Bundesliga.com („Die jüngsten Spieler der Bundesliga-Geschichte“) abgeglichen: Moukoko 16 J. 1 T., Güther 3 T., Wanner 15 T., Lemke 214 T., Bischof 264 T.

const SWAP: Record<string, string> = { 'v2-heimspiel-2': 'b43-geo-2028', 'b42-geo-c04': 'b43-geo-c04', 'b42-match-c08': 's3-match-spiele', 'b42-rank-t05': 'b43-rank-t05' };
const mapId = (id: string) => SWAP[id] ?? id;
export const BESTOF2_PLAN: Record<string, { id: string; fb: boolean }[]> = Object.fromEntries(Object.entries(BESTOF_PLAN).map(([m, l]) => [m, l.map(x => ({ id: mapId(x.id), fb: x.fb }))]));

const CHANGED: Record<string, string> = { 'b42-r1': 'b43-r1', 'b42-r2': 'b43-r2', 'b42-r3': 'b43-r3' };    // nur diese drei Runden ändern sich; die anderen Kategorien werden wiederverwendet
export const BESTOF2_ROUNDS: SeedShow['rounds'] = BESTOF_ROUNDS.filter(r => CHANGED[r.id]).map(r => ({ ...r, id: CHANGED[r.id], title: r.id === 'b42-r3' ? 'SORTIER’S!' : r.title, taskIds: r.taskIds.map(mapId),
  blurb: r.id === 'b42-r3' ? 'Fünf gemischte Karten liegen bereit. Ziehe sie auf dem Handy auf die Plätze 1 bis 5 (oder erst Karte, dann Platz antippen) – je Karte auf der exakt richtigen Position gibt es 50 Punkte.' : r.blurb }));
const sub = (id: string) => CHANGED[id] ?? id;
export const BESTOF2_STEPS: ShowStep[] = SEED_SHOW_B42.steps.map(s => (s.k === 'board' || s.k === 'final' ? s : { ...s, cat: sub(s.cat) }));

const RULES = SEED_SHOW_B42.pack.rules!;
export const SEED_SHOW_B43: SeedShow = {
  pack: { id: 'show-5', name: 'Reus 65 Mio – Best of 42', description: 'Version 2 (Praxistest 3): 42 Wertungsfragen + 7 Proben, SORTIER’S! mit Karten-Bedienung, Geo-Kurve 180 km, CL-Finale 2028. FINAL LOCK. Sieger: Reus65Mio-Champion.', rules: RULES },
  pool: BESTOF2_NEW, rounds: BESTOF2_ROUNDS, steps: BESTOF2_STEPS,
};
export const SEED_SHOW_B43K: SeedShow = {
  pack: { id: 'show-4z', name: 'Reus 65 Mio – Best of 42 · Finale KICKBASE-KONSENS', description: 'Wie „Best of 42“ (Version 2), aber mit KICKBASE-KONSENS als Finale (optional; FINAL LOCK bleibt Standard).', rules: RULES },
  pool: [], rounds: [], steps: BESTOF2_STEPS.map(s => (s.k === 'final' ? { k: 'final' as const, cat: 'b42-final-kk' } : s)),
};
void SEED_SHOW_B42K;
