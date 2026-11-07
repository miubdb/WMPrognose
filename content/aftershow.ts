// Nachspielzeit: selektive, in der letzten Hauptshow nicht verwendete Aufgaben.
// Keine Wiederholung von Proben oder KICKBASE-KONSENS; alte Pakete bleiben unverändert.
import type { ShowStep } from '../shared/types';
import type { SeedShow } from '../server/content';
import { COLORS as C, est, geo, link, match, rank, unique, type PoolQuestion } from './show';

const closed = (q: PoolQuestion): PoolQuestion => ({ ...q, task: { ...q.task, closed: true } as PoolQuestion['task'] });
export const AFTERSHOW_NEW: PoolQuestion[] = [
  // Geo: der Tanzwahn von 1518 – verrückter historischer Ort statt einer Lösung, die schon im Fragetext steckt.
  geo('after2-geo-dance1518', 'Geschichte & Kurioses', 'europe', 60, 250,
    '1518 tanzten in einer Stadt im Elsass, nahe der heutigen deutsch-französischen Grenze, Hunderte Menschen unkontrolliert auf den Straßen. Wo fand dieser „Tanzwahn“ statt?',
    48.5839, 7.7455, 'Straßburg, Elsass, Frankreich',
    'Der Tanzwahn von 1518 ist in zeitgenössischen Chroniken dokumentiert. Was ihn auslöste, ist bis heute umstritten.'),

  // Matchmaker 1: reale, aber in Erinnerung überraschende Vereinsstationen.
  match('after2-match-exclubs', 'Fußball', 'Welcher Star spielte tatsächlich auch einmal für diesen Verein?', [
    ['Kevin-Prince Boateng', 'FC Barcelona'],
    ['Lothar Matthäus', 'New York/New Jersey MetroStars'],
    ['Franck Ribéry', 'US Salernitana'],
    ['Nuri Şahin', 'Real Madrid'],
    ['Mario Balotelli', 'Adana Demirspor'],
    ['Ronaldo (Brasilien)', 'Corinthians São Paulo'],
  ], [3, 5, 0, 4, 1, 2],
    'Ja, alle sechs Stationen sind echt! Boateng war 2019 bei Barcelona, Matthäus 2000 in New York, Ribéry bei Salernitana, Şahin bei Real Madrid, Balotelli bei Adana und Ronaldo bei Corinthians.'),

  // Matchmaker 2: überraschende Popkultur-Fußball-Gleichzeitigkeit (sechs verschiedene Jahre).
  match('after2-match-sameyear', 'Popkultur & Fußball',
    'Welcher Fußballmoment geschah im selben Jahr wie dieses Popkultur-Ereignis?', [
    ['„Titanic“ kommt ins Kino', 'BVB gewinnt erstmals die Champions League'],
    ['„Star Wars: Episode I“ kommt ins Kino', 'Manchester United gewinnt das CL-Finale in der Nachspielzeit'],
    ['„Avatar“ kommt ins Kino', 'VfL Wolfsburg wird deutscher Meister'],
    ['Ice Bucket Challenge geht viral', 'Deutschland wird in Brasilien Weltmeister'],
    ['Pokémon GO wird veröffentlicht', 'Portugal gewinnt die Europameisterschaft'],
    ['„Barbie“ kommt ins Kino', 'Manchester City gewinnt erstmals die Champions League'],
  ], [4, 2, 5, 0, 3, 1],
    'Die Paare gehören zu 1997 (Titanic/BVB), 1999 (Star Wars/United), 2009 (Avatar/Wolfsburg), 2014 (Ice Bucket/WM), 2016 (Pokémon GO/Portugal) und 2023 (Barbie/Man City).'),

  // Verbindung: beide Themen erlauben mehrere echte „Aha“-Hinweise statt Schulbuch-Raten.
  link('after2-link-mourinho', 'Fußball', 'Welche Person wird gesucht?', [
    'Meine Trainerkarriere begann auch damit, dass ich für einen englischen Trainer übersetzte.',
    'Später gewann ich die Champions League mit zwei unterschiedlichen Vereinen.',
    'Nach meinem Wechsel nach England gab ich mir einen selbstbewussten Spitznamen.',
    'Ich bin José Mourinho – „The Special One“.',
  ], 'José Mourinho', ['Mourinho', 'Jose Mourinho'],
    'Mourinho übersetzte anfangs für Bobby Robson, gewann die Champions League mit Porto (2004) und Inter (2010) und nannte sich „The Special One“.'),

  link('after2-link-bttf', 'Film & Popkultur', 'Welche Filmreihe wird gesucht?', [
    'Für den ersten Film wurde nach mehreren Wochen Drehzeit der Hauptdarsteller ausgetauscht.',
    'Ein Sportwagen erreicht eine für die Geschichte entscheidende Geschwindigkeit von 88 Meilen pro Stunde.',
    'Die Handlung springt von 1985 zurück nach 1955 und später auch ins Jahr 2015.',
    'Marty McFly und Doc Brown reisen mit einem DeLorean durch die Zeit.',
  ], 'Zurück in die Zukunft', ['Zurueck in die Zukunft', 'Back to the Future', 'Zurück in die Zukunft-Trilogie'],
    'Michael J. Fox ersetzte Eric Stoltz mitten in den Dreharbeiten. Der DeLorean muss 88 mph erreichen, um durch die Zeit zu reisen.'),

  // 6 mögliche Lösungen für 7 Mitspieler: garantierte Doppelung, aber mit Fußballwissen lösbar.
  closed(unique('after2-unique-bayernfinals', 'Fußball', 'Ein Finalgegner …',
    'Nenne einen Verein, den der FC Bayern bis einschließlich 2026 in einem Finale des Europapokals der Landesmeister oder der Champions League besiegt hat.',
    [
      ['Atlético Madrid', ['Atletico Madrid', 'Atletico']],
      ['Leeds United', ['Leeds']],
      ['AS Saint-Étienne', ['Saint Etienne', 'Saint-Etienne', 'Saint Etienne AS']],
      ['FC Valencia', ['Valencia', 'Valencia CF']],
      ['Borussia Dortmund', ['BVB', 'Dortmund']],
      ['Paris Saint-Germain', ['PSG', 'Paris SG', 'Paris']],
    ],
    'Sechs Bayern-Siege: Atlético (1974), Leeds (1975), Saint-Étienne (1976), Valencia (2001), Dortmund (2013) und PSG (2020). Bei sieben Spielern muss mindestens eine Antwort doppelt vorkommen.')),

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
    'Nur sechs Brauereien liefern das offizielle Wiesn-Bier. Bei sieben Spielern sind Doppelnennungen unvermeidlich!')),
];

export const AFTERSHOW_SELECTION: Record<string, string[]> = {
  geo: ['v2-heimspiel-3', 'v2-heimspiel-4', 'after2-geo-dance1518', 'v2-orte-mit-geschichte-4'],
  match: ['after2-match-exclubs', 'after2-match-sameyear'],
  rank: ['v2-fussball-zeitreise-1', 's3-rank-tech', 'v2-wer-war-zuerst-2'],
  glitch: ['s3-glitch-marktwerte', 's3-glitch-tabelle', 'v2-alles-im-blick-2'],
  estimate: ['s3-est-saarland', 'v2-wahnsinnszahlen-1', 'v2-sport-und-pop-2', 'v2-wahnsinnszahlen-2'],
  link: ['after-link-dassler', 'after2-link-mourinho', 'after2-link-bttf'],
  unique: ['after-unique-meister', 'after2-unique-bayernfinals'],
};
const r = (id: string, title: string, icon: string, color: string,
  kind: 'tile' | 'surprise' | 'final', football: boolean, taskIds: string[]) =>
  ({ id, title, icon, color, kind, football, topic: 'Nachspielzeit',
     blurb: 'Nur ausgewählte, beim letzten Spieleabend nicht verwendete Aufgaben.', taskIds });
export const AFTERSHOW_ROUNDS: SeedShow['rounds'] = [
  r('after2-r1', 'WO ZUR HÖLLE?', '🗺️', C.TE, 'tile', true, AFTERSHOW_SELECTION.geo),
  r('after2-r2', 'MATCHMAKER', '🧲', C.PU, 'tile', false, AFTERSHOW_SELECTION.match),
  r('after-r3', 'SORTIER’S!', '⏳', C.PK, 'tile', true, AFTERSHOW_SELECTION.rank),
  r('after2-sur', 'EINZIGARTIG', '✨', C.PK, 'surprise', true, AFTERSHOW_SELECTION.unique),
  r('after2-r4', 'GLITCH', '👁️', C.CY, 'tile', true, AFTERSHOW_SELECTION.glitch),
  r('after-r5', 'SETZ AUF MICH', '🎯', C.GO, 'tile', true, AFTERSHOW_SELECTION.estimate),
  r('after2-r6', 'DIE VERBINDUNG', '🔗', C.BL, 'tile', false, AFTERSHOW_SELECTION.link),
  r('after-final', 'FINAL LOCK – NACHSPIELZEIT', '🔒', C.GR, 'final', true,
    ['after-final-gspon', 'after-final-fax', 'after-final-tv2014', 'after-final-breweries']),
];
export const AFTERSHOW_STEPS: ShowStep[] = [
  { k: 'round', cat: 'after2-r1' }, { k: 'round', cat: 'after2-r2' }, { k: 'round', cat: 'after-r3' },
  { k: 'surprise', cat: 'after2-sur' },
  { k: 'round', cat: 'after2-r4' }, { k: 'round', cat: 'after-r5' }, { k: 'round', cat: 'after2-r6' },
  { k: 'final', cat: 'after-final' },
];
export const SEED_SHOW_AFTER: SeedShow = {
  revision: 2,
  pack: {
    id: 'show-after',
    name: 'Reus 65 Mio – Nachspielzeit (ungespielte Fragen)',
    description: '21 sorgfältig redigierte, in der Hauptshow nicht enthaltene Wertungsfragen, ohne wiederholte Proben. Dazu vier neue Finalaufgaben und Marktwert-Updates nach jeder Runde.',
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
