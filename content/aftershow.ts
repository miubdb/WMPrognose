// Nachspielzeit: selektive, in der letzten Hauptshow nicht verwendete Aufgaben.
// Keine Wiederholung von Proben oder KICKBASE-KONSENS; alte Pakete bleiben unverändert.
import type { ShowStep } from '../shared/types';
import type { SeedShow } from '../server/content';
import { COLORS as C, est, geo, link, rank, unique, type PoolQuestion } from './show';

const closed = (q: PoolQuestion): PoolQuestion => ({ ...q, task: { ...q.task, closed: true } as PoolQuestion['task'] });
export const AFTERSHOW_NEW: PoolQuestion[] = [
  link('after-link-dassler', 'Fußball & Marken', 'Welche ZWEI Sportartikelmarken sind gesucht?', [
    'Am Anfang stand eine gemeinsame Schuhfabrik zweier Brüder.',
    'Nach einem Zerwürfnis gründeten die Brüder konkurrierende Unternehmen.',
    'Beide Firmen sitzen in Herzogenaurach.',
    'Der eine gründete Puma, der andere Adidas.',
  ], 'Adidas und Puma', ['Puma und Adidas', 'Adidas & Puma', 'Puma & Adidas'],
  'Aus der Trennung von Adolf und Rudolf Dassler gingen Adidas und Puma hervor.'),

  closed(unique('after-unique-meister', 'Fußball', 'Ein Meisterverein …',
    'Nenne einen Verein, der seit Einführung der Bundesliga 1963 mindestens einmal deutscher Meister wurde.',
    [
      ['FC Bayern München', ['Bayern München', 'Bayern']], ['Borussia Dortmund', ['BVB', 'Dortmund']],
      ['Borussia Mönchengladbach', ['Gladbach']], ['Werder Bremen', ['Bremen']], ['Hamburger SV', ['HSV']],
      ['VfB Stuttgart', ['Stuttgart']], ['1. FC Köln', ['Köln', 'Koeln']], ['1. FC Kaiserslautern', ['Kaiserslautern', 'FCK']],
      ['VfL Wolfsburg', ['Wolfsburg']], ['Bayer 04 Leverkusen', ['Bayer Leverkusen', 'Leverkusen']],
      ['1. FC Nürnberg', ['Nürnberg', 'Nuernberg']], ['Eintracht Braunschweig', ['Braunschweig']],
      ['TSV 1860 München', ['1860 München', '1860']],
    ],
    'Die 13 Meistervereine der Bundesliga-Ära bis 2026 – eine doppelt genannte Antwort bringt null Punkte.')),

  // Die vier sehr gut bewerteten, in KICKBASE-KONSENS nicht gespielten Jury-Finalfragen:
  geo('after-final-gspon', 'Fußball', 'europe', 60, 400,
    'Wo liegt die Ottmar-Hitzfeld-Arena, ein Fußballplatz auf rund 2.000 Metern Höhe mit Ligaspielen?',
    46.2275, 7.9022, 'Ottmar-Hitzfeld-Arena, Gspon (Wallis, Schweiz)',
    'In Gspon wird auf rund 2.000 Metern Höhe Fußball gespielt – der Platz ist sogar per Seilbahn erreichbar.'),
  rank('after-final-fax', 'Geschichte',
    'Sortiere diese Ereignisse chronologisch – das früheste zuerst.',
    'am frühesten', 'am spätesten', [
      ['Fax-Patent von Alexander Bain', '1843'], ['Telefonpatent von Alexander Graham Bell', '1876'],
      ['Coca-Cola wird eingeführt', '1886'], ['Eiffelturm wird eröffnet', '1889'], ['Titanic sinkt', '1912'],
    ], [3, 0, 4, 1, 2], 'Das Fax-Patent kam schon 1843 – lange vor dem Telefonpatent.', 500, 14),
  est('after-final-tv2014', 'Fußball',
    'Wie viele Millionen Menschen sahen das WM-Finale 2014 zwischen Deutschland und Argentinien durchschnittlich in der ARD? (Ohne Public Viewing.)',
    'Mio. Zuschauer', 34.65,
    '34,65 Millionen Menschen sahen das WM-Finale 2014 durchschnittlich im Ersten – 86,3 % Marktanteil.',
    [0, 50, 100], 300),
  closed(unique('after-final-breweries', 'Wiesn', 'Eine Brauerei …',
    'Nenne eine der sechs Münchner Brauereien, deren Bier auf der Wiesn ausgeschenkt werden darf.',
    [
      ['Augustiner', ['Augustiner-Bräu', 'Augustiner Brauerei']],
      ['Hacker-Pschorr', ['Hacker Pschorr', 'Hacker']],
      ['Hofbräu', ['Hofbraeu', 'Hofbräuhaus', 'Staatliches Hofbräuhaus']],
      ['Löwenbräu', ['Loewenbraeu']],
      ['Paulaner', ['Paulaner Brauerei']],
      ['Spaten', ['Spatenbräu', 'Spaten Brauerei']],
    ],
    'Nur sechs Brauereien liefern das offizielle Wiesn-Bier. Bei sieben Spielern sind Doppelnennungen unvermeidlich!'))),
];

export const AFTERSHOW_SELECTION: Record<string, string[]> = {
  geo: ['v2-heimspiel-3', 'v2-heimspiel-4', 's3-geo-montsaintmichel', 'v2-orte-mit-geschichte-3'],
  match: ['v2-passt-zusammen-2', 'v2-passt-zusammen-3'],
  rank: ['v2-fussball-zeitreise-1', 's3-rank-tech', 'v2-wer-war-zuerst-2'],
  glitch: ['s3-glitch-marktwerte', 's3-glitch-tabelle', 'v2-alles-im-blick-3'],
  estimate: ['s3-est-saarland', 'v2-wahnsinnszahlen-1', 'v2-sport-und-pop-2', 'v2-wahnsinnszahlen-2'],
  link: ['after-link-dassler', 'v2-wer-oder-was-1', 'v2-wer-oder-was-3'],
  unique: ['after-unique-meister', 's3-unique-spanisch'],
};
const r = (id: string, title: string, icon: string, color: string,
  kind: 'tile' | 'surprise' | 'final', football: boolean, taskIds: string[]) =>
  ({ id, title, icon, color, kind, football, topic: 'Nachspielzeit',
     blurb: 'Nur ausgewählte, beim letzten Spieleabend nicht verwendete Aufgaben.', taskIds });
export const AFTERSHOW_ROUNDS: SeedShow['rounds'] = [
  r('after-r1', 'WO ZUR HÖLLE?', '🗺️', C.TE, 'tile', true, AFTERSHOW_SELECTION.geo),
  r('after-r2', 'MATCHMAKER', '🧲', C.PU, 'tile', false, AFTERSHOW_SELECTION.match),
  r('after-r3', 'SORTIER’S!', '⏳', C.PK, 'tile', true, AFTERSHOW_SELECTION.rank),
  r('after-sur', 'EINZIGARTIG', '✨', C.PK, 'surprise', true, AFTERSHOW_SELECTION.unique),
  r('after-r4', 'GLITCH', '👁️', C.CY, 'tile', true, AFTERSHOW_SELECTION.glitch),
  r('after-r5', 'SETZ AUF MICH', '🎯', C.GO, 'tile', true, AFTERSHOW_SELECTION.estimate),
  r('after-r6', 'DIE VERBINDUNG', '🔗', C.BL, 'tile', false, AFTERSHOW_SELECTION.link),
  r('after-final', 'FINAL LOCK – NACHSPIELZEIT', '🔒', C.GR, 'final', true,
    ['after-final-gspon', 'after-final-fax', 'after-final-tv2014', 'after-final-breweries']),
];
export const AFTERSHOW_STEPS: ShowStep[] = [
  { k: 'round', cat: 'after-r1' }, { k: 'round', cat: 'after-r2' }, { k: 'round', cat: 'after-r3' },
  { k: 'surprise', cat: 'after-sur' },
  { k: 'round', cat: 'after-r4' }, { k: 'round', cat: 'after-r5' }, { k: 'round', cat: 'after-r6' },
  { k: 'final', cat: 'after-final' },
];
export const SEED_SHOW_AFTER: SeedShow = {
  pack: {
    id: 'show-after',
    name: 'Reus 65 Mio – Nachspielzeit (ungespielte Fragen)',
    description: '21 sorgfältig ausgewählte, in der Hauptshow nicht enthaltene Wertungsfragen, ohne wiederholte Proben. Dazu vier neue Finalaufgaben und Marktwert-Updates nach jeder Runde.',
    rules: {
      startCredit: 0, tasksPerMode: 4, rankVariant: 'sort' as const, estimateBets: [0, 50, 100],
      estimateBonus: 150, uniquePoints: 300, boardEveryRound: true,
      showTitle: 'Reus 65 Mio – Nachspielzeit', winnerTitle: 'Nachspielzeit-Champion',
      tagline: 'Nur frische Fragen für den zweiten Spieleabend',
      winnerLine: 'Auch nach Abpfiff gibt es noch Punkte', boardTitle: 'Marktwert-Update',
    },
  },
  pool: AFTERSHOW_NEW, rounds: AFTERSHOW_ROUNDS, steps: AFTERSHOW_STEPS,
};
