// „Reus 65 Mio – Best of“ (Praxistest 4): neue VERSION der bestehenden Pakete show-5 (FINAL LOCK) und show-4z (KICKBASE-KONSENS, Hauptshow).
// Keine neuen Paket-IDs. Geänderte Fragen bekommen neue Frage-IDs (b44-*); die bisherigen Fragen bleiben unverändert im Pool erhalten.
//  • MATCHMAKER: Giraffe verständlicher, Haaland „(danach Salzburg)“, Gaming-Frage entfällt (Probe + 5)
//  • EINZIGARTIG: Champions-League-Frage vereinfacht, Orchesterfrage entfällt (Probe + 5)
//  • SORTIER’S!: Moukoko & Iličević teilen sich eine Karte
//  • DIE VERBINDUNG: Hinweis 1 der Kaiserslautern-Frage neu formuliert
//  • KICKBASE-KONSENS: fünf Fragen à 100 Punkte (max. 500), Michael (Showmaster) als zusätzlicher Kandidat
//  • Startguthaben 0
import type { ShowStep } from '../shared/types';
import { COLORS as C, type PoolQuestion } from './show';
import { POOL2 } from './show2';
import type { SeedShow } from '../server/content';
import { BESTOF_NEW, BESTOF_ROUNDS } from './bestof';
import { BESTOF2_NEW, BESTOF2_PLAN, BESTOF2_ROUNDS, BESTOF2_STEPS, SEED_SHOW_B43 } from './bestof2';

export const SHOWMASTER_CANDIDATE = 'Michael (Showmaster)';
const find = (id: string): PoolQuestion => [...POOL2, ...BESTOF_NEW, ...BESTOF2_NEW].find(q => q.id === id)!;
const derive = (id: string, from: string, mut: (t: any) => void): PoolQuestion => { const q = find(from); const task: any = JSON.parse(JSON.stringify(q.task)); mut(task); return { id, topic: q.topic, task }; };

export const BESTOF3_NEW: PoolQuestion[] = [
  derive('b44-match-tier', 's4-match-tierrekorde', t => { t.pairs.find((p: any) => p.left === 'Giraffe').right = 'Tier mit der größten Körperhöhe an Land'; t.explain = t.explain.replace('Giraffe (bis ca. 5,5 m)', 'Giraffe (bis ca. 5,5 m Körperhöhe, das höchste Landtier)'); }),
  derive('b44-match-t03', 'b42-match-t03', t => { t.pairs.find((p: any) => /Haaland/.test(p.left)).left = 'Erling Haaland (danach Salzburg)'; t.explain = 'Nicht das teuerste Team, sondern der übersehene letzte Schritt vor dem Durchbruch ist entscheidend: Haaland spielte bei Molde, bevor er nach Salzburg wechselte.'; }),
  derive('b44-rank-t05', 'b43-rank-t05', t => {
    t.prompt = 'Sortiere diese fünf Karten nach dem Alter beim ersten Bundesliga-Einsatz – die jüngsten zuerst.';
    t.items[0] = { text: 'Youssoufa Moukoko & Niko Iličević', value: 'jeweils 16 Jahre, 1 Tag' };
    t.explain = 'Moukoko und Iličević halten den Rekord gemeinsam: Moukoko debütierte 2020 mit 16 Jahren und 1 Tag, der Frankfurter Niko Iličević stellte ihn am 1. November 2026 ein. Danach folgen Güther (3 Tage), Wanner (15 Tage), Lemke (214 Tage) und Bischof (264 Tage).';
  }),   // Quelle: bundesliga.com – „Jüngste Spieler der Bundesliga-Geschichte“ (Moukoko, Iličević)
  derive('b44-unique-p20', 'b42-unique-p20', t => { t.prompt = 'Nenne einen Verein außerhalb von Deutschland, England und Spanien, der schon einmal die Champions League oder den früheren Europapokal gewonnen hat.'; }),   // Antwortkatalog + Erklärung unverändert
  derive('b44-link-t11', 'b42-link-t11', t => { t.clues[0] = 'Ein dramatischer Rückschlag und ein historischer Triumph lagen bei mir nur zwei Jahre auseinander.'; }),
];

const vote = (n: number, prompt: string, explain: string): PoolQuestion => ({ id: `b44-kk-${n}`, topic: 'Gruppenfrage', task: { mode: 'vote', prompt, seconds: 45, points: 100, explain, candidate: SHOWMASTER_CANDIDATE } });
export const BESTOF3_KK: PoolQuestion[] = [
  vote(1, 'Wer würde von uns am ehesten 65 Millionen für einen Spieler ausgeben, nur damit ihn kein Konkurrent bekommt?', 'Der Konsens zeigt, wem die Gruppe das größte Blockade-Gebot zutraut.'),
  vote(2, 'Wer kontrolliert seine Kickbase-Aufstellung fünf Minuten vor Anpfiff noch einmal panisch?', 'Menschenkenntnis statt Fußballwissen.'),
  vote(3, 'Wer sorgt in unserer Gruppe am häufigsten für Ragebait?', 'Wer provoziert, wird erkannt – meistens von allen.'),
  vote(4, 'Wer würde bei einem gemeinsamen Urlaub am ehesten den Zug oder Flug verpassen?', 'Der Konsens zeigt, wer besser früher losfahren sollte.'),
  vote(5, 'Wer würde in einer Quizshow am überzeugendsten eine komplett falsche Antwort geben?', 'Selbstbewusstsein schlägt Wissen – zumindest in der Wahrnehmung der Gruppe.'),
];

// Fragenlisten je Runde (Probe zuerst, dann die gewerteten Aufgaben)
const SWAP: Record<string, string> = { 's4-match-tierrekorde': 'b44-match-tier', 'b42-match-t03': 'b44-match-t03', 'b43-rank-t05': 'b44-rank-t05', 'b42-unique-p20': 'b44-unique-p20', 'b42-link-t11': 'b44-link-t11' };
const DROP = new Set(['s3-match-spiele', 's3-unique-orchester']);
const sw = (id: string) => SWAP[id] ?? id;
const ids = (xs: string[]) => xs.filter(x => !DROP.has(x)).map(sw);
export const BESTOF3_PLAN: Record<string, { id: string; fb: boolean }[]> = Object.fromEntries(Object.entries(BESTOF2_PLAN).map(([m, l]) => [m, l.filter(x => !DROP.has(x.id)).map(x => ({ id: sw(x.id), fb: x.fb }))]));

const baseOf = (id: string) => [...BESTOF2_ROUNDS, ...BESTOF_ROUNDS].find(r => r.id === id)!;
const CAT: Record<string, string> = { 'b43-r2': 'b44-r2', 'b43-r3': 'b44-r3', 'b42-sur': 'b44-sur', 'b42-r6': 'b44-r6' };
export const BESTOF3_ROUNDS: SeedShow['rounds'] = Object.entries(CAT).map(([from, id]) => { const r = baseOf(from); return { ...r, id, taskIds: ids(r.taskIds) }; });
export const BESTOF3_FINAL: SeedShow['rounds'][number] = {
  id: 'b44-final-kk', title: 'KICKBASE-KONSENS', topic: 'Das große Finale', icon: '🤝', color: C.GR, kind: 'final', football: false,
  blurb: 'Fünf Fragen: Wähle geheim eine Person – auch Michael (Showmaster) steht zur Wahl. Wer die meistgewählte Person tippt, bekommt 100 Punkte (max. 500). Die Rangliste bleibt verborgen.',
  taskIds: [1, 2, 3, 4, 5].map(n => `b44-kk-${n}`),
};
const STEPS: ShowStep[] = BESTOF2_STEPS.map(s => (s.k === 'board' || s.k === 'final' ? s : { ...s, cat: CAT[s.cat] ?? s.cat }));

const RULES = { ...SEED_SHOW_B43.pack.rules!, startCredit: 0 };
export const SEED_SHOW_B44: SeedShow = {
  revision: 2,
  pack: { id: 'show-5', name: 'Reus 65 Mio – Best of · FINAL LOCK', description: 'Best-of-Show mit je einer Probe pro Modus, Marktwert-Update nach jeder Runde und FINAL LOCK als Finale. Alternative zur Hauptshow mit KICKBASE-KONSENS. Start mit 0 Punkten.', rules: RULES },
  pool: [...BESTOF2_NEW, ...BESTOF3_NEW], rounds: [...BESTOF2_ROUNDS, ...BESTOF3_ROUNDS], steps: STEPS,
};
export const SEED_SHOW_B44K: SeedShow = {
  revision: 2,
  pack: { id: 'show-4z', name: 'Reus 65 Mio – Best of · KICKBASE-KONSENS (Hauptshow)', description: 'Hauptshow: Best-of mit Marktwert-Update nach jeder Runde und dem Finale KICKBASE-KONSENS (5 Fragen, max. 500 Punkte, Michael als Kandidat). Start mit 0 Punkten.', rules: RULES },
  pool: BESTOF3_KK, rounds: [BESTOF3_FINAL], steps: STEPS.map(s => (s.k === 'final' ? { k: 'final' as const, cat: BESTOF3_FINAL.id } : s)),
};
