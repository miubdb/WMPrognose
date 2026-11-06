// Showpaket „Spieleabend“ mit FESTEM ABLAUF + erweiterter Fragenpool.
// Fragenpool = alle Aufgaben in der Bibliothek (TILES aus tiles.ts + POOL unten); Showpaket = die 31 ausgewählten Aufgaben in fester Reihenfolge.
// Redaktion, Quellen und Begründung: docs/INHALTE-REDAKTION.md.
import type { ShowStep, TaskDef } from '../shared/types';

export const COLORS = { PU: '#8b5cf6', BL: '#3b82f6', TE: '#14d9c0', GO: '#f5b82e', PK: '#ec4899', GR: '#22c55e', CY: '#38bdf8' };
const PU = '#8b5cf6', BL = '#3b82f6', TE = '#14d9c0', GO = '#f5b82e', PK = '#ec4899', GR = '#22c55e', CY = '#38bdf8';

export const SHOW_PACK = {
  id: 'show-1',
  name: 'Showpaket – Spieleabend (fester Ablauf)',
  description: '31 Aufgaben in fester Reihenfolge: 6 Runden, Überraschungsrunde EINZIGARTIG und Finale – alle sieben Spielmodi. Etwa 80 Minuten.',
};

export interface PoolQuestion { id: string; topic: string; task: TaskDef }

export const geo = (id: string, topic: string, map: 'world' | 'europe' | 'germany', seconds: number, points: number, prompt: string, lat: number, lon: number, label: string, explain: string): PoolQuestion =>
  ({ id, topic, task: { mode: 'geo', map, seconds: 60, points, prompt, answer: { lat, lon, label }, explain } });
export const est = (id: string, topic: string, prompt: string, unit: string, answer: number, explain: string, bets = [0, 100, 200], points = 300): PoolQuestion =>
  ({ id, topic, task: { mode: 'estimate', seconds: 45, betSeconds: 35, points, bets, prompt, unit, answer, explain } });
export const glitch = (id: string, scene: string, viewPrompt: string, prompt: string, explain: string, viewSeconds = 12): PoolQuestion =>
  ({ id, topic: 'Beobachtung', task: { mode: 'glitch', scene, viewSeconds, seconds: 25, points: 250, viewPrompt, prompt, explain } });
export const link = (id: string, topic: string, prompt: string, clues: string[], answer: string, accept: string[], explain: string): PoolQuestion =>
  ({ id, topic, task: { mode: 'link', prompt, clueSeconds: 20, points: 300, clues, answer, accept, explain } });
export const match = (id: string, topic: string, prompt: string, pairs: [string, string][], order: number[], explain: string): PoolQuestion =>
  ({ id, topic, task: { mode: 'match', seconds: 60, points: 300, prompt, pairs: pairs.map(([left, right]) => ({ left, right })), order, explain } });
export const rank = (id: string, topic: string, prompt: string, topLabel: string, bottomLabel: string, items: [string, string][], order: number[], explain: string, points = 250, secondsPerItem = 12): PoolQuestion =>
  ({ id, topic, task: { mode: 'rank', secondsPerItem, points, prompt, topLabel, bottomLabel, items: items.map(([text, value]) => ({ text, value })), order, explain } });
export const unique = (id: string, topic: string, placeholder: string, prompt: string, valid: [string, string[]][], explain: string): PoolQuestion =>
  ({ id, topic, task: { mode: 'unique', seconds: 45, pointsUnique: 500, pointsShared: 150, placeholder, prompt, valid: valid.map(([name, variants]) => ({ name, variants })), explain } });

/** Neue Aufgaben (im Showpaket verwendet oder als Alternative im Pool). Die 34 Aufgaben aus tiles.ts gehören ebenfalls zum Pool. */
export const POOL: PoolQuestion[] = [
  // ---------------------------------------------------------------- im Showpaket verwendet (neu)
  match('s3-match-spitznamen', 'Bundesliga-Spitznamen', 'Welcher Verein trägt welchen Spitznamen?', [
    ['Borussia Mönchengladbach', 'Die Fohlen'], ['FC Schalke 04', 'Die Knappen'], ['1. FC Köln', 'Die Geißböcke'],
    ['Eintracht Frankfurt', 'Die Adler'], ['Hertha BSC', 'Die Alte Dame'], ['FC St. Pauli', 'Die Kiezkicker'],
  ], [4, 0, 5, 2, 1, 3],
  'Gladbach = Fohlen (junge, wilde Mannschaft), Schalke = Knappen (Bergbau), Köln = Geißböcke (Maskottchen Hennes), Frankfurt = Adler (Wappen), Hertha = Alte Dame (Name Hertha), St. Pauli = Kiezkicker (Stadtteil).'),
  unique('s3-unique-orchester', 'Musik', 'Ein Orchesterinstrument …', 'Nenne ein Instrument, das in einem klassischen Sinfonieorchester gespielt wird.', [
    ['Geige', ['Violine', 'Violinen']], ['Bratsche', ['Viola']], ['Cello', ['Violoncello']], ['Kontrabass', ['Bass']], ['Flöte', ['Querflöte']], ['Piccolo', ['Piccoloflöte']],
    ['Oboe', []], ['Klarinette', []], ['Fagott', []], ['Horn', ['Waldhorn']], ['Trompete', []], ['Posaune', []], ['Tuba', []], ['Pauke', ['Pauken']], ['Harfe', []],
    ['Triangel', []], ['Becken', []], ['Xylophon', []], ['Celesta', []], ['Englischhorn', []],
  ], 'Gültig sind u. a. Geige, Bratsche, Cello, Kontrabass, Flöte, Oboe, Klarinette, Fagott, Horn, Trompete, Posaune, Tuba, Pauke und Harfe. Die meisten nennen Geige, Flöte oder Trompete – wer wagt etwas anderes?'),
  link('s3-link-pele', 'Fußball', 'Welche Person wird gesucht?', [
    'Sein bürgerlicher Name lautet Edson Arantes do Nascimento.',
    'Er ist der einzige Spieler, der dreimal Weltmeister wurde.',
    'Mit 17 Jahren schoss er im WM-Finale 1958 zwei Tore.',
    'Der Brasilianer wurde als „O Rei“ – der König des Fußballs – gefeiert.',
  ], 'Pelé', ['Pele', 'Edson Arantes do Nascimento'],
  'Pelé gewann die WM 1958, 1962 und 1970. Im Finale 1958 (5:2 gegen Schweden) war er mit 17 Jahren und 249 Tagen der jüngste Torschütze eines WM-Finales.'),
  rank('s3-rank-tech', 'Technik & Internet', 'Technik-Zeitreise – das früheste Ereignis zuerst', 'am längsten her', 'am jüngsten', [
    ['Die erste Webseite geht online', '1991'], ['Google wird gegründet', '1998'], ['Facebook wird gegründet', '2004'], ['YouTube wird gegründet', '2005'], ['Das erste iPhone kommt auf den Markt', '2007'],
  ], [3, 0, 4, 2, 1], 'Web (1991), Google (1998), Facebook (2004), YouTube (2005) und iPhone (2007) – drei der vier jüngeren Meilensteine liegen nur drei Jahre auseinander.', 500, 14),

  // ---------------------------------------------------------------- Alternativen: WO ZUR HÖLLE?
  geo('s3-geo-helgoland', 'Geografie', 'germany', 30, 250, 'Deutschlands einzige Hochseeinsel: Wo liegt Helgoland?', 54.1792, 7.8917, 'Helgoland, Nordsee', 'Helgoland liegt rund 45 km vor der Küste in der Nordsee – man erreicht die rote Felsinsel nur per Schiff oder Flugzeug.'),
  geo('s3-geo-zugspitze', 'Geografie', 'germany', 30, 200, 'Wo ragt Deutschlands höchster Berg auf, die Zugspitze?', 47.4211, 10.9853, 'Zugspitze, Wetterstein', 'Die Zugspitze (2.962 m) steht an der Grenze zu Österreich im Wettersteingebirge südwestlich von Garmisch-Partenkirchen.'),
  geo('s3-geo-montsaintmichel', 'Orte mit Geschichte', 'europe', 35, 250, 'Bei Flut wird dieses Kloster zur Insel: Wo liegt der Mont-Saint-Michel?', 48.6361, -1.5115, 'Mont-Saint-Michel, Normandie', 'Der Mont-Saint-Michel liegt in der Bucht zwischen Normandie und Bretagne; der Tidenhub ist dort einer der größten Europas (bis etwa 14 m).'),
  geo('s3-geo-anfield', 'Fußball-Orte', 'europe', 35, 250, 'Wo steht das Stadion Anfield, die Heimat des FC Liverpool?', 53.4308, -2.9608, 'Anfield, Liverpool', 'Anfield liegt in Liverpool in Nordwestengland. Vor Heimspielen singen die Fans „You’ll Never Walk Alone“.'),
  geo('s3-geo-maracana', 'Fußball-Orte', 'world', 40, 300, 'Wo liegt das legendäre Maracanã-Stadion?', -22.9121, -43.2302, 'Maracanã, Rio de Janeiro', 'Das Maracanã steht in Rio de Janeiro. Hier endete die WM 1950 mit der Überraschung gegen Brasilien („Maracanaço“) – und 2014 wurde hier Deutschland Weltmeister.'),
  geo('s3-geo-ushuaia', 'Geografie', 'world', 40, 300, 'Sie nennt sich die südlichste Stadt der Welt: Wo liegt Ushuaia?', -54.8019, -68.303, 'Ushuaia, Feuerland', 'Ushuaia liegt auf Feuerland im Süden Argentiniens am Beagle-Kanal – für viele das „Ende der Welt“ und Start der Antarktis-Fahrten.'),

  // ---------------------------------------------------------------- Alternativen: BLIND RANK
  rank('s3-rank-berge', 'Geografie', 'Wie hoch ist der Berg? – der höchste zuerst', 'am höchsten', 'am niedrigsten', [
    ['Mount Everest', '8.849 m'], ['K2', '8.611 m'], ['Mont Blanc', '4.806 m'], ['Zugspitze', '2.962 m'], ['Brocken', '1.141 m'],
  ], [3, 0, 4, 1, 2], 'Everest (8.849 m), K2 (8.611 m), Mont Blanc (4.806 m), Zugspitze (2.962 m) und Brocken (1.141 m). Zwischen Everest und K2 liegen nur 238 m.'),
  rank('s3-rank-olympia', 'Sport', 'Olympische Sommerspiele – das früheste Jahr zuerst', 'am längsten her', 'am jüngsten', [
    ['Berlin', '1936'], ['Tokio', '1964'], ['München', '1972'], ['Los Angeles', '1984'], ['Sydney', '2000'],
  ], [2, 4, 0, 3, 1], 'Berlin (1936), Tokio (1964), München (1972), Los Angeles (1984) und Sydney (2000).'),

  // ---------------------------------------------------------------- Alternativen: SETZ AUF MICH
  est('s3-est-dombau', 'Geschichte', 'Wie viele Jahre liegen zwischen der Grundsteinlegung des Kölner Doms (1248) und seiner Fertigstellung (1880)?', 'Jahre', 632,
    '632 Jahre – mit einer Pause von mehreren Jahrhunderten: Der Bau ruhte ab 1473 und wurde erst im 19. Jahrhundert vollendet.'),
  est('s3-est-isner', 'Sport', 'Wie viele Minuten dauerte das längste Tennismatch der Geschichte (Isner gegen Mahut, Wimbledon 2010)?', 'Minuten', 665,
    '665 Minuten, also 11 Stunden und 5 Minuten, verteilt auf drei Tage. Der fünfte Satz endete 70:68.'),
  est('s3-est-saarland', 'Fußball & Zahlen', 'Wie viele Fußballfelder (105 × 68 m) passen auf die Fläche des Saarlands (rund 2.570 km²)?', 'Fußballfelder', 360000,
    'Ein Feld hat 7.140 m². Das Saarland hat rund 2.570.000.000 m² – das sind etwa 360.000 Fußballfelder.'),

  // ---------------------------------------------------------------- Alternativen: GLITCH (vorhandene Szenen)
  glitch('s3-glitch-abfahrt', 'timetable1', 'Merk dir die Abfahrtstafel!', 'Was hat sich geändert? Tippe darauf.', 'Das Gleis des IC 2012 nach Dresden war vorher die 7, jetzt steht dort die 12.'),
  glitch('s3-glitch-kassenzettel', 'receipt1', 'Merk dir den Kassenzettel!', 'Welcher Preis wurde verändert? (Die Summe unten stimmt nur mit dem echten Preis.)', 'Die Butter kostete vorher 2,19 €, jetzt steht dort 2,91 € – nur mit 2,19 € ergibt sich die Summe von 13,40 €.'),
  glitch('s3-glitch-marktwerte', 'market1', 'Merk dir die Marktwerte! (alle Daten fiktiv)', 'Welcher Wert wurde gefälscht? Tippe darauf.', 'Der Marktwert von A. Kowalczyk wurde von 18,0 auf 28,0 Mio. € geändert.'),
  glitch('s3-glitch-tabelle', 'table1', 'Die Tabelle stimmt – noch. Präge sie dir ein!', 'Eine Punktzahl wurde gefälscht! Tipp: In jeder Zeile gilt Punkte = 3 × Siege + Unentschieden.', 'Dynamo Süd hat 7 Siege und 3 Unentschieden – das sind 24 Punkte, nicht 26.', 20),

  // ---------------------------------------------------------------- Alternativen: MATCHMAKER
  match('s3-match-spiele', 'Gaming', 'Welche Spielfigur gehört zu welchem Videospiel?', [
    ['Master Chief', 'Halo'], ['Kratos', 'God of War'], ['Geralt von Riva', 'The Witcher'], ['Link', 'The Legend of Zelda'], ['Samus Aran', 'Metroid'], ['Lara Croft', 'Tomb Raider'],
  ], [3, 5, 0, 4, 1, 2], 'Master Chief (Halo), Kratos (God of War), Geralt (The Witcher), Link (Zelda), Samus Aran (Metroid) und Lara Croft (Tomb Raider).'),
  match('s3-match-baender', 'Musik', 'Aus welchem Land kommt die Band?', [
    ['Queen', 'England'], ['ABBA', 'Schweden'], ['Rammstein', 'Deutschland'], ['U2', 'Irland'], ['AC/DC', 'Australien'], ['Metallica', 'USA'],
  ], [4, 2, 5, 0, 3, 1], 'Queen (London, England), ABBA (Stockholm, Schweden), Rammstein (Berlin), U2 (Dublin, Irland), AC/DC (Sydney, Australien) und Metallica (Kalifornien, USA).'),

  // ---------------------------------------------------------------- Alternativen: DIE VERBINDUNG
  link('s3-link-mozart', 'Musik & Geschichte', 'Welche Person wird gesucht?', [
    'Mit sechs Jahren spielte er in Wien vor Kaiserin Maria Theresia.',
    'Er starb mit nur 35 Jahren – sein Requiem blieb unvollendet.',
    'Er komponierte „Die Zauberflöte“ und „Eine kleine Nachtmusik“.',
    'Eine Praline aus Salzburg trägt seinen Namen.',
  ], 'Mozart', ['Wolfgang Amadeus Mozart', 'Wolfgang Mozart', 'W. A. Mozart'],
  'Wolfgang Amadeus Mozart (1756–1791) war ein Wunderkind aus Salzburg. Die „Mozartkugeln“ gibt es seit 1890.'),
  link('s3-link-everest', 'Geografie', 'Welcher Ort wird gesucht?', [
    'Auf Nepali heißt er Sagarmatha, auf Tibetisch Chomolungma.',
    'Er wächst jedes Jahr um einige Millimeter, weil sich die Erdplatten aufeinander zuschieben.',
    'Edmund Hillary und Tenzing Norgay standen 1953 als Erste oben.',
    'Mit 8.849 Metern ist er der höchste Berg der Erde.',
  ], 'Mount Everest', ['Everest', 'Mt. Everest', 'Sagarmatha', 'Chomolungma'],
  'Der Mount Everest liegt an der Grenze zwischen Nepal und Tibet. Er ist knapp 8,85 km hoch und wächst langsam weiter.'),
  link('s3-link-oktoberfest', 'Feste & Traditionen', 'Welches Ereignis wird gesucht?', [
    'Es begann 1810 mit einer königlichen Hochzeit und einem Pferderennen.',
    'Der Bürgermeister eröffnet es mit dem Ruf „O’zapft is!“.',
    'Es findet auf der Theresienwiese statt.',
    'Man trinkt Bier in Maßkrügen – in München.',
  ], 'Oktoberfest', ['Wiesn', 'Münchner Oktoberfest'],
  'Das Oktoberfest feierte 1810 die Hochzeit von Kronprinz Ludwig und Therese – die Wiese heißt deshalb Theresienwiese.'),

  // ---------------------------------------------------------------- Alternativen: EINZIGARTIG
  unique('s3-unique-spanisch', 'Sprachen & Länder', 'Ein spanischsprachiges Land …', 'Nenne ein Land, in dem Spanisch Amtssprache ist.', [
    ['Spanien', ['Spain']], ['Mexiko', ['Mexico']], ['Argentinien', ['Argentina']], ['Kolumbien', ['Colombia']], ['Peru', []], ['Venezuela', []], ['Chile', []], ['Ecuador', []],
    ['Guatemala', []], ['Kuba', ['Cuba']], ['Bolivien', ['Bolivia']], ['Dominikanische Republik', ['Dom Rep']], ['Honduras', []], ['Paraguay', []], ['El Salvador', []],
    ['Nicaragua', []], ['Costa Rica', []], ['Panama', []], ['Uruguay', []], ['Äquatorialguinea', ['Aequatorialguinea', 'Equatorial Guinea']],
  ], 'Spanisch ist Amtssprache in 20 Staaten – von Spanien über Mexiko und Argentinien bis nach Äquatorialguinea in Afrika.'),
  unique('s3-unique-fluesse', 'Geografie', 'Ein deutscher Fluss …', 'Nenne einen Fluss, der durch Deutschland fließt.', [
    ['Rhein', []], ['Elbe', []], ['Donau', []], ['Main', []], ['Weser', []], ['Oder', []], ['Neckar', []], ['Mosel', []], ['Spree', []], ['Isar', []], ['Ruhr', []], ['Saale', []],
    ['Ems', []], ['Lahn', []], ['Inn', []], ['Lech', []], ['Havel', []], ['Fulda', []], ['Werra', []], ['Iller', []], ['Saar', []], ['Neiße', ['Neisse']], ['Aller', []],
    ['Leine', []], ['Lippe', []], ['Nahe', []], ['Regnitz', []], ['Eider', []], ['Trave', []], ['Warnow', []], ['Peene', []], ['Mulde', []], ['Weiße Elster', ['Weisse Elster']], ['Tauber', []], ['Kinzig', []], ['Altmühl', ['Altmuehl']], ['Naab', []],
  ], 'Es gibt Hunderte Flüsse in Deutschland. Die „großen“ Rhein, Elbe, Donau und Main nennen fast alle – wer einen kleineren wie Nahe, Tauber oder Peene weiß, ist einzigartig.'),
];

// ---------------------------------------------------------------- Runden des Showpakets (Kategorien mit Aufgaben in fester Reihenfolge)
export interface ShowRound { id: string; title: string; topic: string; icon: string; color: string; kind: 'tile' | 'surprise' | 'final'; football: boolean; blurb: string; taskIds: string[] }
export const RB = {
  geo: 'Setze deinen Pin auf der Karte – du kannst zoomen und ihn verschieben. Je näher dein Pin, desto mehr Punkte.',
  match: 'Links sechs Begriffe, rechts die gemischten Partner. Verbinde sie auf dem Handy: 50 Punkte je richtigem Paar, Ändern geht bis zur Abgabe.',
  rank: 'Fünf Begriffe erscheinen nacheinander. Setze jeden SOFORT auf einen freien Rangplatz – endgültig!',
  glitch: 'Schau genau hin: Du siehst ein Bild, dann verändert sich etwas. Tippe auf dem Handy auf die veränderte Stelle.',
  est: 'Erst schätzt jeder geheim. Dann sehen alle die Tipps – und du setzt Punkte auf die Schätzung, der du am meisten vertraust.',
  link: 'Vier Hinweise erscheinen nacheinander. Je früher du die gemeinsame Lösung nennst, desto mehr Punkte (300 / 225 / 150 / 75). Nur ein Versuch!',
};
export const SHOW_ROUNDS: ShowRound[] = [
  { id: 's3-r1', title: 'Wo zur Hölle?', topic: 'Orte, Stadien & Überraschungen', icon: '🧭', color: TE, kind: 'tile', football: true, blurb: RB.geo,
    taskIds: ['v2-heimspiel-1', 'v2-heimspiel-2', 'v2-orte-mit-geschichte-2', 'v2-orte-mit-geschichte-4'] },
  { id: 's3-r2', title: 'Passt zusammen', topic: 'Fußball, Firmen, Erfinder & Filme', icon: '🧲', color: PU, kind: 'tile', football: false, blurb: RB.match,
    taskIds: ['v2-passt-zusammen-3', 's3-match-spitznamen', 'v2-passt-zusammen-2', 'v2-passt-zusammen-1'] },
  { id: 's3-r3', title: 'Wer war zuerst?', topic: 'Reihenfolgen mit Aha-Effekt', icon: '⏳', color: PK, kind: 'tile', football: true, blurb: RB.rank,
    taskIds: ['v2-wer-war-zuerst-1', 'v2-fussball-zeitreise-1', 'v2-wer-war-zuerst-3', 'v2-fussball-zeitreise-3'] },
  { id: 's3-sur', title: 'EINZIGARTIG', topic: 'Überraschungsrunde', icon: '✨', color: PK, kind: 'surprise', football: false,
    blurb: 'Nenne eine gültige Antwort – aber bloß keine, die auch ein anderer nennt! Einzigartige Antworten bringen die meisten Punkte, doppelte nur wenige.',
    taskIds: ['v2-einzigartig-1', 'v2-einzigartig-2', 's3-unique-orchester'] },
  { id: 's3-r4', title: 'Alles im Blick', topic: 'Alltag & Beobachtung', icon: '👁️', color: CY, kind: 'tile', football: false, blurb: RB.glitch,
    taskIds: ['v2-alles-im-blick-1', 'v2-alles-im-blick-2', 'v2-alles-im-blick-3', 'v2-alles-im-blick-4'] },
  { id: 's3-r5', title: 'SETZ AUF MICH', topic: 'Zahlen, Tore & Töne', icon: '🎯', color: GO, kind: 'tile', football: false, blurb: RB.est,
    taskIds: ['v2-wahnsinnszahlen-1', 'v2-sport-und-pop-2', 'v2-sport-und-pop-1', 'v2-wahnsinnszahlen-2'] },
  { id: 's3-r6', title: 'Wer oder was?', topic: 'Die gemeinsame Lösung', icon: '🔗', color: BL, kind: 'tile', football: false, blurb: RB.link,
    taskIds: ['v2-wer-oder-was-2', 'v2-wer-oder-was-1', 's3-link-pele', 'v2-wer-oder-was-3'] },
  { id: 's3-final', title: 'FINAL LOCK', topic: 'Das große Finale', icon: '🔒', color: GR, kind: 'final', football: false,
    blurb: 'Vier Aufgaben, 2.000 Punkte, die Rangliste bleibt verborgen. Erst bei der Siegerehrung zeigt sich, wer wirklich vorne liegt.',
    taskIds: ['v2-final-1', 'v2-final-2', 's3-rank-tech', 'v2-final-4'] },
];

/** Der feste Ablauf: 3 Runden → Zwischenstand → Überraschung → 3 Runden → letzter Zwischenstand → Finale → Siegerehrung. */
export const SHOW_STEPS: ShowStep[] = [
  { k: 'round', cat: 's3-r1' }, { k: 'round', cat: 's3-r2' }, { k: 'round', cat: 's3-r3' }, { k: 'board' },
  { k: 'surprise', cat: 's3-sur' },
  { k: 'round', cat: 's3-r4' }, { k: 'round', cat: 's3-r5' }, { k: 'round', cat: 's3-r6' }, { k: 'board' },
  { k: 'final', cat: 's3-final' },
];
