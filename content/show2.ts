// Showpaket „Reus 65 Mio“: fester Ablauf mit Proberunden (ungewertet), bis zu 5 gewerteten Aufgaben je Spielmodus
// (Paketregel tasksPerMode 4 = kompakt / 5 = länger), Zwischenständen nach Runde 1, nach Runde 3 und vor dem Finale.
// Nutzt die vorhandenen Fragen (unverändert, gleiche IDs) + wenige neue; Überraschung und Finale teilen sich die Kategorien aus show.ts.
import type { ShowStep } from '../shared/types';
import { COLORS as C, RB, match, type PoolQuestion } from './show';
import type { SeedShow } from '../server/content';

export const SHOW2_PACK = {
  id: 'show-2',
  name: 'Reus 65 Mio',
  description: 'Der feste Showablauf mit Proberunden: 6 Spielmodi je 4 oder 5 gewertete Aufgaben, Überraschungsrunde EINZIGARTIG und FINAL LOCK. Sieger: Reus65Mio-Champion.',
  rules: { showTitle: 'Reus 65 Mio', winnerTitle: 'Reus65Mio-Champion', tasksPerMode: 4 },
};

const P = <T extends object>(task: T): T & { practice: true } => ({ ...task, practice: true });

/** Proberunden: einfache, leicht lösbare Beispiele – erklären die Funktionsweise, zählen nie für die Wertung. */
const PROBES: PoolQuestion[] = [
  { id: 's4-probe-geo', topic: 'Probe', task: P({ mode: 'geo' as const, map: 'germany' as const, seconds: 40, points: 200, prompt: 'Probe: Wo steht die Allianz Arena?', answer: { lat: 48.2188, lon: 11.6247, label: 'Allianz Arena, München' },
    explain: 'So funktioniert’s: Je näher dein Pin am Ziel liegt, desto mehr Punkte gibt es – gewertet wird die echte Entfernung in Kilometern, nicht der Rang. Die Allianz Arena steht im Münchner Norden (Fröttmaning).' }) },
  { id: 's4-probe-match', topic: 'Probe', task: P({ mode: 'match' as const, seconds: 40, points: 300, prompt: 'Probe: Welches Tier macht welches Geräusch?',
    pairs: [['Hund', 'bellt'], ['Katze', 'miaut'], ['Kuh', 'muht'], ['Schaf', 'mäht'], ['Frosch', 'quakt'], ['Hahn', 'kräht']].map(([left, right]) => ({ left, right })), order: [3, 5, 0, 2, 4, 1],
    explain: 'So funktioniert’s: Links stehen sechs Begriffe, rechts die gemischten Partner. Verbinde auf dem Handy, was zusammengehört – jedes richtige Paar gibt Punkte, bis zur Abgabe darfst du ändern.' }) },
  { id: 's4-probe-rank', topic: 'Probe', task: P({ mode: 'rank' as const, secondsPerItem: 10, points: 250, prompt: 'Probe: Wie weit ist der Planet von der Sonne entfernt? – der nächste zuerst', topLabel: 'am nächsten', bottomLabel: 'am weitesten',
    items: [['Merkur', 'ca. 58 Mio. km'], ['Venus', 'ca. 108 Mio. km'], ['Erde', 'ca. 150 Mio. km'], ['Mars', 'ca. 228 Mio. km'], ['Jupiter', 'ca. 778 Mio. km']].map(([text, value]) => ({ text, value })), order: [3, 0, 4, 1, 2],
    explain: 'So funktioniert’s: Du siehst die Begriffe und ordnest sie ohne Wissen über die anderen ein. Gewertet wird jeder Paarvergleich („steht der richtige weiter oben?“) – 10 Vergleiche bei 5 Begriffen.' }) },
  { id: 's4-probe-estimate', topic: 'Probe', task: P({ mode: 'estimate' as const, seconds: 30, betSeconds: 25, points: 300, bets: [0, 100, 200], prompt: 'Probe: Wie viele Bundesländer hat Deutschland?', unit: 'Bundesländer', answer: 16,
    explain: 'So funktioniert’s: Erst schätzt jeder geheim. Dann siehst du alle Tipps und setzt Punkte auf die Schätzung, der du vertraust – auch auf die eigene. Liegt dein Tipp richtig, gewinnst du den Einsatz, sonst verlierst du ihn (nie unter 0). Es sind 16 Länder.' }) },
  { id: 's4-probe-glitch', topic: 'Probe', task: P({ mode: 'glitch' as const, scene: 'pitch2', viewSeconds: 10, seconds: 25, points: 250, viewPrompt: 'Probe: Merk dir die Aufstellung!', prompt: 'Probe: Was hat sich verändert? Tippe auf deinem Handy darauf.',
    explain: 'So funktioniert’s: Erst zeigt der Fernseher ein Bild, dann verschwindet es. Auf dem Handy erscheint die veränderte Version – tippe auf die Veränderung. Hier fehlte ein Spieler und der Ball lag woanders.' }) },
  { id: 's4-probe-unique', topic: 'Probe', task: P({ mode: 'unique' as const, seconds: 30, pointsUnique: 500, pointsShared: 150, placeholder: 'Eine Farbe …', prompt: 'Probe: Nenne eine Farbe der deutschen Flagge.',
    valid: [{ name: 'Schwarz', variants: [] }, { name: 'Rot', variants: [] }, { name: 'Gold', variants: ['Gelb'] }],
    explain: 'So funktioniert’s: Nur eine gültige Antwort, die kein anderer nennt, bringt volle Punkte. Bei drei Farben und vielen Spielern gibt es fast immer Doppelte – die zählen deutlich weniger. Unbekannte Antworten prüft der Showmaster.' }) },
  { id: 's4-probe-link', topic: 'Probe', task: P({ mode: 'link' as const, clueSeconds: 15, points: 300, prompt: 'Probe: Was ist gesucht?',
    clues: ['Er ist rund 384.000 Kilometer von uns entfernt.', 'Von Neumond bis Vollmond verändert er sich im Lauf eines Monats.', 'Er sorgt für Ebbe und Flut.', '1969 betrat Neil Armstrong ihn als erster Mensch.'],
    answer: 'Mond', accept: ['Der Mond', 'Erdmond'],
    explain: 'So funktioniert’s: Vier Hinweise erscheinen nacheinander. Je früher du die gemeinsame Lösung nennst, desto mehr Punkte (300 / 225 / 150 / 75) – aber du hast nur einen Versuch. Gesucht war der Mond.' }) },
];

const NEW: PoolQuestion[] = [
  match('s4-match-tierrekorde', 'Tierrekorde', 'Welches Tier hält welchen Rekord?', [
    ['Gepard', 'schnellstes Landtier'], ['Blauwal', 'größtes Tier der Erde'], ['Strauß', 'größter Vogel'],
    ['Giraffe', 'höchstes Landtier'], ['Kolibri', 'kleinster Vogel (Bienenelfe)'], ['Grönlandhai', 'wird über 250 Jahre alt'],
  ], [3, 5, 1, 0, 4, 2],
  'Gepard (bis über 100 km/h), Blauwal (bis ca. 30 m), Strauß (bis ca. 2,7 m), Giraffe (bis ca. 5,5 m), die Bienenelfe – ein Kolibri – wiegt knapp 2 g, der Grönlandhai ist das älteste bekannte Wirbeltier (Schätzungen: 250 bis ca. 400 Jahre).'),
];

export const POOL2: PoolQuestion[] = [...PROBES, ...NEW];

const mk = (id: string, title: string, icon: string, color: string, football: boolean, blurb: string, taskIds: string[]) =>
  ({ id, title, topic: 'Spielmodus', icon, color, kind: 'tile' as const, football, blurb, taskIds });

export const SHOW2_ROUNDS: SeedShow['rounds'] = [
  mk('s4-r1', 'WO ZUR HÖLLE?', '🧭', C.TE, true, RB.geo, ['s4-probe-geo', 'v2-heimspiel-2', 'v2-orte-mit-geschichte-2', 'v2-orte-mit-geschichte-3', 's3-geo-helgoland', 's3-geo-maracana']),
  mk('s4-r2', 'MATCHMAKER', '🧲', C.PU, true, RB.match, ['s4-probe-match', 's3-match-spitznamen', 'v2-passt-zusammen-2', 'v2-passt-zusammen-1', 's4-match-tierrekorde', 's3-match-spiele']),
  mk('s4-r3', 'BLIND RANK', '⏳', C.PK, true, RB.rank, ['s4-probe-rank', 'v2-wer-war-zuerst-1', 'v2-fussball-zeitreise-1', 'v2-wer-war-zuerst-3', 's3-rank-berge', 's3-rank-olympia']),
  mk('s4-r4', 'GLITCH', '👁️', C.CY, false, RB.glitch, ['s4-probe-glitch', 'v2-alles-im-blick-1', 'v2-alles-im-blick-2', 'v2-alles-im-blick-3', 'v2-alles-im-blick-4', 's3-glitch-kassenzettel']),
  mk('s4-r5', 'SETZ AUF MICH', '🎯', C.GO, false, RB.est, ['s4-probe-estimate', 'v2-wahnsinnszahlen-1', 'v2-sport-und-pop-2', 'v2-sport-und-pop-1', 'v2-wahnsinnszahlen-2', 's3-est-isner']),
  mk('s4-r6', 'DIE VERBINDUNG', '🔗', C.BL, true, RB.link, ['s4-probe-link', 'v2-wer-oder-was-2', 'v2-wer-oder-was-1', 's3-link-pele', 'v2-wer-oder-was-3', 's3-link-oktoberfest']),
  { id: 's4-sur', title: 'EINZIGARTIG', topic: 'Überraschungsrunde', icon: '✨', color: C.PK, kind: 'surprise' as const, football: false,
    blurb: 'Nenne eine gültige Antwort – aber bloß keine, die auch ein anderer nennt! Einzigartige Antworten bringen die meisten Punkte, doppelte nur wenige.',
    taskIds: ['s4-probe-unique', 'v2-einzigartig-1', 'v2-einzigartig-2', 's3-unique-orchester'] },
];

/** Reihenfolge: R1 → Stand → R2 → R3 → Stand → Überraschung → R4 → R5 → R6 → letzter sichtbarer Stand → Finale. */
export const SHOW2_STEPS: ShowStep[] = [
  { k: 'round', cat: 's4-r1' }, { k: 'board' }, { k: 'round', cat: 's4-r2' }, { k: 'round', cat: 's4-r3' }, { k: 'board' },
  { k: 'surprise', cat: 's4-sur' },
  { k: 'round', cat: 's4-r4' }, { k: 'round', cat: 's4-r5' }, { k: 'round', cat: 's4-r6' }, { k: 'board' },
  { k: 'final', cat: 's3-final' },
];

export const SEED_SHOW2: SeedShow = { pack: SHOW2_PACK, pool: POOL2, rounds: SHOW2_ROUNDS, steps: SHOW2_STEPS };
