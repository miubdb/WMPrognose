// „Neue Spiele – Testlabor“ (Praxistest 5): spielbares Paket mit den neuen Spielen LÜGEN HABEN KURZE BEINE, SCHÄTZKORRIDOR und VERDREHTE WELT.
// Eigenes Paket – berührt keine bestehenden Pakete. Alle Fragen sind Beispiele und im Admin frei änderbar/ergänzbar.
import type { ShowStep } from '../shared/types';
import type { SeedShow } from '../server/content';
import { COLORS as C, type PoolQuestion } from './show';
import { SEED_SHOW_B44K } from './bestof3';

const bluff = (id: string, prompt: string, answer: string, accept: string[], explain: string): PoolQuestion => ({ id, topic: 'Lügen & Wahrheit', task: { mode: 'bluff', prompt, answer, accept, seconds: 45, pickSeconds: 30, points: 200, bluffPoints: 100, explain } });
const corridor = (id: string, prompt: string, unit: string, answer: number, explain: string): PoolQuestion => ({ id, topic: 'Schätzen', task: { mode: 'corridor', prompt, unit, answer, seconds: 45, points: 300, explain } });
const twist = (id: string, twisted: string, answer: string, accept: string[], explain: string): PoolQuestion => ({ id, topic: 'Filmtitel', task: { mode: 'twist', prompt: 'Welcher bekannte Filmtitel wurde hier ins Gegenteil verdreht?', twisted, answer, accept, seconds: 40, points: 300, explain } });

export const NEWGAMES_POOL: PoolQuestion[] = [
  bluff('ng-bluff-1', 'Wie nennt man das @-Zeichen im Italienischen umgangssprachlich?', 'Schnecke', ['chiocciola', 'Die Schnecke'], 'Im Italienischen heißt das @ „chiocciola“ – die Schnecke.'),
  bluff('ng-bluff-2', 'Welches Land hat als einziges der Welt eine Nationalflagge, die weder ein Rechteck noch ein Quadrat ist?', 'Nepal', [], 'Die Flagge Nepals besteht aus zwei übereinanderliegenden Dreiecken.'),
  bluff('ng-bluff-3', 'Wie viele Herzen hat ein Oktopus?', 'Drei', ['3'], 'Zwei Kiemenherzen und ein Körperherz – zusammen drei.'),
  corridor('ng-corr-1', 'Wie hoch ist der Mount Everest laut offizieller Vermessung (Gipfelhöhe über dem Meeresspiegel)?', 'Meter', 8849, 'Die offizielle Höhe wurde 2020 mit 8.848,86 m festgelegt.'),
  corridor('ng-corr-2', 'Wie lang ist der Rhein vom Ursprung bis zur Mündung?', 'Kilometer', 1233, 'Der Rhein ist rund 1.233 Kilometer lang.'),
  corridor('ng-corr-3', 'Wie hoch ist das Burj Khalifa in Dubai, das höchste Gebäude der Welt?', 'Meter', 828, 'Das Burj Khalifa ist 828 Meter hoch.'),
  twist('ng-twist-1', 'Langsame und Neugierige', 'Fast & Furious', ['Fast and Furious', 'The Fast and the Furious', 'Fast Furious', 'Fast & Furious'], 'Verdreht: schnell → langsam, wütend → neugierig.'),
  twist('ng-twist-2', 'Hässlicher Mann', 'Pretty Woman', [], 'Verdreht: hübsch → hässlich, Frau → Mann.'),
  twist('ng-twist-3', 'Lebe schnell', 'Stirb langsam', ['Die Hard'], 'Verdreht: stirb → lebe, langsam → schnell.'),
  twist('ng-twist-4', 'Vorwärts in die Vergangenheit', 'Zurück in die Zukunft', ['Back to the Future'], 'Verdreht: zurück → vorwärts, Zukunft → Vergangenheit.'),
  twist('ng-twist-5', 'Das Gebrüll der Wölfe', 'Das Schweigen der Lämmer', ['Schweigen der Lämmer', 'The Silence of the Lambs'], 'Verdreht: Schweigen → Gebrüll, Lämmer → Wölfe.'),
];
const round = (id: string, title: string, icon: string, color: string, blurb: string, taskIds: string[]): SeedShow['rounds'][number] => ({ id, title, topic: title, icon, color, kind: 'tile', football: false, blurb, taskIds });
export const NEWGAMES_ROUNDS: SeedShow['rounds'] = [
  round('ng-r1', 'LÜGEN HABEN KURZE BEINE', '😈', C.PK, 'Erfinde glaubwürdige falsche Antworten und finde die echte. Wer auf deine Lüge hereinfällt, bringt dir Punkte.', ['ng-bluff-1', 'ng-bluff-2', 'ng-bluff-3']),
  round('ng-r2', 'SCHÄTZKORRIDOR', '↔️', C.TE, 'Gib einen Bereich an, in dem die Lösung liegt – je enger, desto mehr Punkte. Daneben gibt es 0.', ['ng-corr-1', 'ng-corr-2', 'ng-corr-3']),
  round('ng-r3', 'VERDREHTE WELT', '🔄', C.PU, 'Bekannte Filmtitel wurden ins Gegenteil verdreht. Tippe das Original – je schneller, desto mehr Punkte.', ['ng-twist-1', 'ng-twist-2', 'ng-twist-3', 'ng-twist-4', 'ng-twist-5']),
];
const STEPS: ShowStep[] = [{ k: 'round', cat: 'ng-r1' }, { k: 'board' }, { k: 'round', cat: 'ng-r2' }, { k: 'board' }, { k: 'round', cat: 'ng-r3' }, { k: 'board' }, { k: 'final', cat: 'b44-final-kk' }];
export const SEED_SHOW_NEWGAMES: SeedShow = {
  pack: { id: 'show-new', name: 'Neue Spiele – Testlabor', description: 'Zum Ausprobieren: LÜGEN HABEN KURZE BEINE, SCHÄTZKORRIDOR und VERDREHTE WELT, dann KICKBASE-KONSENS. Beispielfragen – im Admin frei erweiterbar.', rules: { ...SEED_SHOW_B44K.pack.rules!, tasksPerMode: 6 } },
  pool: NEWGAMES_POOL, rounds: NEWGAMES_ROUNDS, steps: STEPS,
};
