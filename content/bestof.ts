// Showpaket „Reus 65 Mio – Best of 42“: 7 Spielmodi × (1 ungewertete Probe + 6 gewertete Aufgaben) + FINAL LOCK.
// Verbindliche Auswahl und Reihenfolge: Redaktionsbriefing (42 Fragen, 21 Fußball/Kickbase + 21 andere Themen).
// Bestehende Fragen werden NUR per ID referenziert (unverändert); neue Fragen stammen wortgetreu aus den Moderationskarten der Jury.
// Redaktionsstatus/Quellen: docs/BESTOF42-REDAKTION.md. Pakete show-3 und show-2k bleiben unberührt (neue IDs b42-*, show-4, show-3z).
import type { ShowStep } from '../shared/types';
import { COLORS as C, est, geo, glitch, link, match, rank, unique, type PoolQuestion } from './show';
import type { SeedShow } from '../server/content';
import { SHOW3_PACK, SHOW3_ROUNDS } from './show3';

/** Redaktionshinweis an eine Frage hängen (erscheint als Warnung bei „Prüfen & Veröffentlichen“). */
const rv = (q: PoolQuestion, note: string): PoolQuestion => (note ? { ...q, task: { ...q.task, review: note } as PoolQuestion['task'] } : q);   // leerer Hinweis = geklärt, keine Warnung
const closed = (q: PoolQuestion): PoolQuestion => ({ ...q, task: { ...q.task, closed: true } as PoolQuestion['task'] });

// ---------------------------------------------------------------- neue Fragen aus der Jury (Kürzel = Jury-ID)
export const BESTOF_NEW: PoolQuestion[] = [
  // ===== WO ZUR HÖLLE? (60 s, Punkte nach Entfernung)
  geo('b42-geo-c02', 'Fußball', 'world', 60, 250, 'Marco Reus gewann mit 35 Jahren seinen ersten Meistertitel. Wo wurde der entscheidende Titel gewonnen?', 33.8644, -118.2611, 'Dignity Health Sports Park, Carson (Kalifornien, USA)',
    'MLS-Cup-Finale LA Galaxy – New York Red Bulls 2:1 am 7. Dezember 2024. Zwölf Jahre beim BVB ohne Meisterschale, dann nach vier Monaten in Los Angeles Meister.'),
  rv(geo('b42-geo-c04', 'Andere Themen', 'europe', 60, 250, 'In welchem Ort stürzen sich jedes Jahr Menschen einen extrem steilen Hang hinunter, weil vor ihnen ein Käselaib ins Tal rollt?', 51.8299, -2.1581, 'Cooper’s Hill bei Brockworth, Gloucestershire (England)',
    '2025 gewann ein YouTuber aus München zum zweiten Mal in Folge. Der Käse rollt vorweg – und wird fast nie eingeholt.'),
    'Offen: Reveal-Detail „YouTuber aus München gewann 2025“ nur laut Jury-Karte (AP), nicht erneut belegt. Koordinate geprüft.'),
  geo('b42-geo-t01', 'Fußball', 'europe', 60, 250, 'Für die EM 2004 baute ein europäischer Verein ein Fußballstadion in einen ehemaligen Steinbruch. Hinter einem Tor steht eine riesige Felswand. Wo?', 41.5625, -8.43, 'Estádio Municipal de Braga, Portugal',
    'Nur zwei große Seitentribünen und eine steile Felswand hinter dem Tor – das „Estádio Municipal de Braga“ heißt auch „A Pedreira“, der Steinbruch.'),
  geo('b42-geo-c05', 'Andere Themen', 'world', 60, 250, 'Markiere den Punkt auf der Erde, der weiter von jedem Stück Land entfernt ist als jeder andere Ort!', -48.8767, -123.3933, 'Point Nemo, Südpazifik',
    'Point Nemo liegt rund 2.688 km vom nächsten Land entfernt (NOAA). Befindet sich die ISS genau darüber, sind Astronauten näher als Menschen an Land.'),

  // ===== MATCHMAKER (sechs eindeutige Paare)
  rv(match('b42-match-t03', 'Fußball', 'Ordne jeden Star dem Verein zu, bei dem er spielte, bevor er zu der jeweils genannten nächsten Station wechselte.', [
    ['Erling Haaland (danach Salzburg → Dortmund)', 'Molde FK'], ['Mohamed Salah (danach Chelsea)', 'FC Basel'], ['Jude Bellingham (danach Dortmund)', 'Birmingham City'], ['Kevin De Bruyne (danach Chelsea)', 'KRC Genk'],
    ['Robert Lewandowski (danach Dortmund)', 'Lech Posen'], ['Heung-min Son (danach Leverkusen)', 'Hamburger SV'],
  ], [3, 5, 1, 4, 0, 2], 'Nicht das teuerste Team, sondern der übersehene letzte Schritt vor dem Durchbruch ist entscheidend: Haaland ging von Molde erst nach Salzburg und dann nach Dortmund.'),
    'Stationen allgemein bekannt, nicht einzeln per Websuche belegt (Haaland Molde → Salzburg → Dortmund, Salah Basel → Chelsea, Bellingham Birmingham → Dortmund, De Bruyne Genk → Chelsea, Lewandowski Lech → Dortmund, Son HSV → Leverkusen).'),
  rv(match('b42-match-c08', 'Andere Themen', 'Wozu wurde dieses Produkt ursprünglich entwickelt bzw. woraus entstand es?', [
    ['Play-Doh', 'Tapetenreiniger'], ['Luftpolsterfolie', 'dekorative Struktur-Tapete'], ['Slinky', 'Feder zur Stabilisierung von Schiffs-Instrumenten'],
    ['Listerine', 'antiseptisches Mittel'], ['Viagra', 'Behandlung von Angina pectoris'], ['Coca-Cola', 'als Tonikum verkauftes Apothekengetränk'],
  ], [2, 4, 0, 5, 1, 3], 'Tapetenreiniger wird Knete, missglückte Tapete wird Verpackungsmaterial.'),
    'Teilgeprüft: Slinky (Schiffsinstrumente), Listerine (antiseptisch) und Viagra (Herzmittel: Bluthochdruck/Angina) sind nur durch Sekundärquellen gestützt – vor dem Abend je Produkt eine Primärquelle ergänzen.'),
  rv(match('b42-match-c06', 'Fußball', 'Sechs Maskottchen – welcher Bundesliga-Verein gehört dazu?', [
    ['Fritzle', 'VfB Stuttgart'], ['Hoffi', 'TSG Hoffenheim'], ['Emma', 'Borussia Dortmund'], ['Jünter', 'Borussia Mönchengladbach'], ['Bulli', 'RB Leipzig'], ['Berni', 'FC Bayern'],
  ], [5, 2, 0, 4, 3, 1], 'Echte Überraschungen: Ein Krokodil, ein Elch, eine Biene, ein Fohlen, ein Bulle und ein Bär.'),
    ''),
  rv(match('b42-match-c07', 'Andere Themen', 'Was bedeutet der Name dieser Marke wirklich?', [
    ['Audi', 'lateinisch für „Horch!“'], ['LEGO', 'dänisch für „spiel gut“'], ['Haribo', 'Hans Riegel, Bonn'], ['IKEA', 'Gründerinitialen, Hof und Dorf'], ['Nivea', 'lateinisch: „schneeweiß“'], ['Häagen-Dazs', 'frei erfundener Kunstname'],
  ], [4, 0, 5, 2, 1, 3], 'Der pseudo-dänische Name Häagen-Dazs ist gerade nicht Dänisch.'),
    'Allgemein bekannte Markenherkunft (Audi = Übersetzung von „Horch“, LEGO = „leg godt“, HARIBO = Hans Riegel Bonn, IKEA = Ingvar Kamprad Elmtaryd Agunnaryd, Nivea = lat. niveus, Häagen-Dazs = erfunden); Primärquellen je Marke noch zu dokumentieren.'),

  // ===== WER WAR ZUERST? / SORTIEREN (alle fünf sichtbar, 50 Punkte je richtiger Position)
  rv(rank('b42-rank-c09', 'Fußball', 'Sortiere diese fünf BVB-Neuzugänge nach ihrer auf Transfermarkt.de angegebenen Ablösesumme – vom günstigsten zum teuersten.', 'günstigste Ablöse', 'teuerste Ablöse', [
    ['Shinji Kagawa (2010)', 'ablösefrei (0 €)'], ['Erling Haaland (2020)', '20,00 Mio. €'], ['Jadon Sancho (2017)', '20,59 Mio. €'], ['Jude Bellingham (2020)', '30,15 Mio. €'], ['Mats Hummels (2019)', '30,50 Mio. €'],
  ], [3, 0, 4, 2, 1], 'Laut Transfermarkt.de lagen Haaland und Sancho nur 0,59 Mio. € auseinander, Bellingham und Hummels sogar nur 0,35 Mio. € – und der günstigste Neuzugang kam ablösefrei.'),
    ''),
  rv(rank('b42-rank-c10', 'Andere Themen', 'Sortiere chronologisch, ältestes Ereignis zuerst.', 'am längsten her', 'am jüngsten', [
    ['Bau der Cheops-Pyramide', 'um 2560 v. Chr.'], ['Die letzten Mammuts auf der Wrangelinsel', 'um 2000 v. Chr.'], ['Beginn der Regentschaft Kleopatras', '51 v. Chr.'], ['Beginn des Lehrbetriebs in Oxford', 'ab ca. 1096'], ['Gründung von Tenochtitlan', '1325'],
  ], [2, 4, 0, 3, 1], 'Mammuts lebten nach dem Pyramidenbau; in Oxford wurde schon vor der Gründung der Aztekenhauptstadt gelehrt.'),
    'Jahreswerte antiker Vorgänge sind Näherungen (Abstände sind groß genug, Reihenfolge ist stabil). Mammut-Datum (Wrangelinsel, ca. 4.000 Jahre) aus der Jury-Karte.'),
  rv(rank('b42-rank-t05', 'Fußball', 'Sortiere nach Alter beim ersten Bundesligaspiel, jüngster zuerst.', 'jüngster Debütant', 'ältester Debütant', [
    ['Niko Iličević', '16 Jahre, 1 Tag'], ['Linus Güther', '16 Jahre, 3 Tage'], ['Paul Wanner', '16 Jahre, 15 Tage'], ['Louis Lemke', '16 Jahre, 214 Tage'], ['Tom Bischof', '16 Jahre, 263 Tage'],
  ], [4, 1, 3, 0, 2], 'Iličević stellte 2026 Moukokos Rekord ein; Moukoko ist bewusst nicht dabei, weil er den Rekord teilt.'),
    'Belegt: Güther 16 J. 3 T. (Bundesliga.com), Wanner 16 J. 15 T., Lemke 16 J. 214 T. (HSV, Debüt 10.5.2026), Bischof 16 J. 263 T. (Hoffenheim, 19.3.2022; die Jury-Karte nannte 264). Offen: Iličević „gleichauf mit Moukoko“ nur über eine Bundesliga.com-Meldung, Debüt-Datum nicht erneut geprüft.'),

  // ===== GLITCH (Original auf TV, Veränderung nur auf den Handys)
  glitch('b42-glitch-t07', 'transfer1', 'Merk dir die Transferübersicht! (alle Daten fiktiv)', 'Was hat sich verändert? Tippe darauf.', 'Der Reus-Kaufpreis wurde von 6,5 auf 65,0 Mio. € verzehnfacht – der Name der Show taucht plötzlich als Transferkatastrophe auf.'),
  glitch('b42-glitch-c16', 'kiosk1', 'Merk dir die Preistafel!', 'Was hat sich verändert? Tippe darauf.', 'Aus „Bier 0,5 l“ wurde „Bier 0,4 l“ – weniger Bier zum selben Preis: der schlimmste Glitch Bayerns.'),
  glitch('b42-glitch-c14', 'table2', 'Merk dir die Tabelle! (alle Daten fiktiv)', 'Was hat sich verändert? Tippe darauf.', 'Beim FC Nordstern stand das Torverhältnis 22:8 – die Tordifferenz ist +14, nicht −14.'),
  glitch('b42-glitch-t08', 'receipt2', 'Merk dir den Kassenbon!', 'Was hat sich verändert? Tippe darauf.', 'Gleiche Bestellung, plötzlich zehnfacher Preis: Die Summe steht auf 525,00 € statt 52,50 €.'),

  // ===== SETZ AUF MICH (Einsätze/Bonus aus der Paketregel)
  est('b42-est-t09', 'Fußball', 'Wie viele Tore erzielte Youssoufa Moukoko laut BVB-Angabe in seinen insgesamt 88 Einsätzen für die U17 und U19 von Borussia Dortmund?', 'Tore', 141, 'In der Jugend erzielte er etwa 1,6 Treffer pro Spiel.'),
  est('b42-est-c18', 'Fußball', 'Wie viel wiegt der Original-WM-Pokal der Männer laut FIFA, in Gramm?', 'Gramm', 6175, 'Das Original verlässt die FIFA nur zu besonderen Anlässen; die Sieger erhalten nach der Feier eine andere Ausführung.'),
  rv(est('b42-est-c19', 'Andere Themen', 'Wie viele Millionen Maß Bier wurden laut der vorläufigen Wiesn-Bilanz 2025 (Schätzung der Festwirte) ausgeschenkt? Auf 0,1 Millionen Maß gerundet!', 'Mio. Maß', 6.5, 'Auch die Besucherzahl lag bei rund 6,5 Millionen. (Die spätere städtische Auswertung nennt rund 6,7 Millionen verkaufte Maß.)'),
    ''),
  est('b42-est-t10', 'Andere Themen', 'Wie viele Kilometer lang ist der reguläre Linienflug zwischen Westray und Papa Westray in Schottland, laut Guinness World Records? Gib die Entfernung auf zwei Nachkommastellen an.', 'km', 2.74, 'Einmal wurde die Strecke in nur 53 Sekunden geflogen.'),

  // ===== DIE VERBINDUNG (Hinweise schwer → leicht)
  link('b42-link-t11', 'Fußball', 'Welcher Verein wird gesucht?', [
    'Mein größtes Wunder begann eine Saison vor dem Triumph in der zweiten Liga.',
    '1996 stieg ich aus der Bundesliga ab, gewann aber noch den DFB-Pokal.',
    'Im Jahr 1998 wurde ich unter Otto Rehhagel als frisch aufgestiegener Verein deutscher Meister.',
    'Mein Stadion heißt Fritz-Walter-Stadion und steht auf dem Betzenberg.',
  ], '1. FC Kaiserslautern', ['Kaiserslautern', 'FCK', 'FC Kaiserslautern', '1.FC Kaiserslautern', 'Der FCK'], 'Bis heute einzigartiger Bundesliga-Meistertitel eines direkten Aufsteigers.'),
  rv(link('b42-link-c22', 'Andere Themen', 'Was wird gesucht?', [
    'Bei Volkswagen gibt es mich unter der Teilenummer 199 398 500 A.',
    'Die Urheberin meiner berühmten Berliner Saucenvariante ließ 1959 die Marke „Chillup“ eintragen.',
    'Berlin, Hamburg und Duisburg beanspruchen meine Erfindungsgeschichte.',
    'Ich bin eine Wurst mit Ketchup und Currypulver.',
  ], 'Currywurst', ['Curry Wurst', 'Curry-Wurst', 'Currywürste'], 'Bitte „Marke“ statt „Patent“ sagen: Das Deutsche Patent- und Markenamt widerspricht dem Patentmythos ausdrücklich.'),
    'Offen: VW-Teilenummer 199 398 500 A nicht per Websuche belegt; Chillup-Marke (1959) laut Jury/DPMA.'),
  rv(link('b42-link-c24', 'Fußball', 'Was wird gesucht?', [
    'Das aserbaidschanische Tofiq-Bahramov-Stadion trägt den Namen eines Mannes, der über mich mitentschied.',
    'Vier Monate zuvor spielte ein Hund beim verschwundenen WM-Pokal eine Hauptrolle.',
    '2010 gab es im WM-Spiel Deutschland–England eine berühmte fast spiegelbildliche Szene.',
    'Geoff Hurst, Lattenunterkante, Torlinie – Wembley 1966.',
  ], 'Das Wembley-Tor', ['Wembley-Tor', 'Wembleytor', 'Wembley Tor', 'Das Wembleytor', 'Wembley 1966', 'Wembley'], 'Der Linienrichter war aus Aserbaidschan, nicht aus Russland.'),
    'Offen: Hinweis 2 („Hund und verschwundener WM-Pokal, März 1966“) nicht per Websuche belegt (allgemein bekannt). Bahramov/Stadion Baku bestätigt.'),
  rv(link('b42-link-c23', 'Andere Themen', 'Was wird gesucht?', [
    'Ein Exemplar von mir überstand 1991 eine Explosion während des Golfkriegs und konnte danach weiterlaufen.',
    'Mein ursprünglicher Bildschirm zeigte vier Graustufen auf grünlichem Grund.',
    'Mein Verkauf wurde durch ein sowjetisches Puzzlespiel enorm angeschoben.',
    'Pokémon Rot und Blau erschienen für mich.',
  ], 'Nintendo Game Boy', ['Game Boy', 'Gameboy', 'Nintendo Gameboy', 'GameBoy', 'Game Boy Classic', 'Der Game Boy'], 'Das verkohlte Exemplar wurde jahrelang in einem Nintendo-Store gezeigt.'),
    ''),

  // ===== EINZIGARTIG (eine gültige, nur einmal genannte Antwort = Punkte)
  closed(unique('b42-unique-t13', 'Fußball', 'Eine Nation …', 'Nenne eine Nation, die von 1930 bis einschließlich 2026 mindestens einmal Gastgeber der Männer-Fußball-WM war. Co-Gastgeber zählen.', [
    ['Uruguay', []], ['Italien', ['Italy']], ['Frankreich', ['France']], ['Brasilien', ['Brazil']], ['Schweiz', ['Switzerland']], ['Schweden', ['Sweden']], ['Chile', []], ['England', []],
    ['Mexiko', ['Mexico']], ['Deutschland', ['BRD', 'Westdeutschland', 'Bundesrepublik Deutschland', 'Germany']], ['Argentinien', ['Argentina']], ['Spanien', ['Spain']],
    ['USA', ['Vereinigte Staaten', 'United States', 'Amerika', 'Vereinigte Staaten von Amerika']], ['Japan', []], ['Südkorea', ['Korea', 'Republik Korea', 'South Korea']], ['Südafrika', ['South Africa']],
    ['Russland', ['Russia']], ['Katar', ['Qatar']], ['Kanada', ['Canada']],
  ], 'Kanada kam 2026 neu hinzu. „Deutschland“ umfasst 1974 und 2006.')),
  rv(unique('b42-unique-c27', 'Fußball', 'Ein Profi …', 'Nenne einen Profi, der mindestens ein Pflichtspiel der Männer-Ersten für beide Vereine FC Bayern und Borussia Dortmund absolviert hat (Leihen zählen, reine Jugendstationen nicht).', [
    ['Robert Lewandowski', ['Lewandowski', 'Lewy']], ['Mario Götze', ['Götze', 'Goetze']], ['Mats Hummels', ['Hummels']], ['Niklas Süle', ['Süle', 'Suele']], ['Raphaël Guerreiro', ['Guerreiro', 'Raphael Guerreiro']],
    ['Emre Can', ['Can']], ['Marcel Sabitzer', ['Sabitzer']], ['Ivan Perišić', ['Perišić', 'Perisic', 'Ivan Perisic']], ['Sebastian Rode', ['Rode']], ['Torsten Frings', ['Frings']], ['Jürgen Kohler', ['Kohler']],
    ['Stefan Reuter', ['Reuter']], ['Thomas Helmer', ['Helmer']], ['Michael Rummenigge', ['Rummenigge']], ['Markus Feulner', ['Feulner']], ['Robert Kovač', ['Kovač', 'Kovac', 'Robert Kovac']],
    ['Christian Nerlinger', ['Nerlinger']], ['Jürgen Wegmann', ['Wegmann']], ['Toni Schumacher', ['Schumacher', 'Harald Schumacher', 'Harald Toni Schumacher']],
  ], 'Fußballgeschichten und Gruppentaktik: Wer nennt den Namen, den keiner sonst auf dem Zettel hat?'),
    'OFFENE LISTE – nicht als vollständig markieren: Die Jury-Karte enthält bestätigte Beispiele, keine belegte historische Positivliste (je nach Definition 16/18/22 Namen). Unbekannte Namen prüft der Showmaster (Auflösung bleibt gesperrt, bis geklärt). Vor dem Abend eine vollständige Liste mit Stichtag und Pflichtspielregel dokumentieren. „Rummenigge“ allein ist mehrdeutig (Karl-Heinz spielte nie für den BVB).'),
  closed(unique('b42-unique-t14', 'Andere Themen', 'Ein Element …', 'Nenne ein chemisches Element, dessen offizielles Elementsymbol aus exakt einem Buchstaben besteht.', [
    ['Wasserstoff', ['H', 'Hydrogen']], ['Bor', ['B', 'Boron']], ['Kohlenstoff', ['C', 'Carbon']], ['Stickstoff', ['N', 'Nitrogen']], ['Sauerstoff', ['O', 'Oxygen']], ['Fluor', ['F', 'Fluorine']],
    ['Phosphor', ['P', 'Phosphorus']], ['Schwefel', ['S', 'Sulfur', 'Sulphur']], ['Kalium', ['K', 'Potassium']], ['Vanadium', ['V']], ['Yttrium', ['Y']], ['Iod', ['I', 'Jod', 'Iodine']],
    ['Wolfram', ['W', 'Tungsten']], ['Uran', ['U', 'Uranium']],
  ], 'Nicht nur H und O, sondern auch Y und W sind wertvoll.')),
  closed(unique('b42-unique-p20', 'Fußball', 'Ein Verein …', 'Nenne einen Verein, der spätestens 2026 den Europapokal der Landesmeister oder die Champions League gewann – aber nicht aus England, Deutschland oder Spanien stammt. Männerwettbewerb seit 1955/56.', [
    ['AC Mailand', ['AC Milan', 'Milan']], ['Inter Mailand', ['Inter', 'Internazionale', 'FC Internazionale']], ['Juventus Turin', ['Juventus', 'Juve']], ['Ajax Amsterdam', ['Ajax']], ['PSV Eindhoven', ['PSV']],
    ['Feyenoord Rotterdam', ['Feyenoord']], ['Benfica Lissabon', ['Benfica', 'SL Benfica']], ['FC Porto', ['Porto']], ['Olympique Marseille', ['Marseille', 'OM']], ['Paris Saint-Germain', ['PSG', 'Paris SG', 'Paris']],
    ['Celtic Glasgow', ['Celtic']], ['Steaua Bukarest', ['Steaua', 'FCSB']], ['Roter Stern Belgrad', ['Roter Stern', 'Crvena Zvezda', 'Red Star Belgrade']],
  ], '2025 und 2026 gewann PSG die Champions League; das ältere Format zählt genauso. Nur die CL ab 1992 zu zählen würde den Katalog verändern.')),
];

// KICKBASE-KONSENS-Fragen aus den Moderationskarten (optionales Finale)
const vote = (id: string, prompt: string, explain: string): PoolQuestion => ({ id, topic: 'Gruppenfrage', task: { mode: 'vote', prompt, seconds: 45, points: 600, explain } });
export const BESTOF_KK: PoolQuestion[] = [
  vote('b42-kk-1', 'Wer von uns würde am ehesten 65 Millionen für einen Spieler bieten, nur damit ein Konkurrent ihn nicht bekommt?', 'Der Konsens zeigt, wem die Gruppe das größte Blockade-Gebot zutraut.'),
  vote('b42-kk-2', 'Wer von uns kontrolliert seine Kickbase-Aufstellung fünf Minuten vor Anpfiff noch einmal panisch?', 'Menschenkenntnis statt Fußballwissen.'),
  vote('b42-kk-3', 'Wer von uns verkauft am ehesten einen Spieler eine Woche, bevor dieser plötzlich durch die Decke geht?', 'Timing ist alles – im Kickbase-Markt.'),
];

// ---------------------------------------------------------------- Reihenfolge (Briefing) und Themenzuordnung
/** Sechs gewertete Aufgaben je Modus in verbindlicher Reihenfolge. `fb` = Fußball/Kickbase-Bezug (laut Briefing, genau 21 von 42). */
export const BESTOF_PLAN: Record<string, { id: string; fb: boolean }[]> = {
  geo: [['v2-heimspiel-2', 1], ['v2-orte-mit-geschichte-2', 0], ['b42-geo-c02', 1], ['b42-geo-c04', 0], ['b42-geo-t01', 1], ['b42-geo-c05', 0]].map(([id, fb]) => ({ id: id as string, fb: !!fb })),
  match: [['s3-match-spitznamen', 1], ['s4-match-tierrekorde', 0], ['b42-match-t03', 1], ['b42-match-c08', 0], ['b42-match-c06', 1], ['b42-match-c07', 0]].map(([id, fb]) => ({ id: id as string, fb: !!fb })),
  rank: [['v2-fussball-zeitreise-2', 1], ['s3-rank-olympia', 0], ['b42-rank-c09', 1], ['b42-rank-c10', 0], ['b42-rank-t05', 1], ['v2-wer-war-zuerst-3', 0]].map(([id, fb]) => ({ id: id as string, fb: !!fb })),
  glitch: [['b42-glitch-t07', 1], ['b42-glitch-c16', 0], ['b42-glitch-c14', 1], ['s3-glitch-abfahrt', 0], ['v2-alles-im-blick-4', 1], ['b42-glitch-t08', 0]].map(([id, fb]) => ({ id: id as string, fb: !!fb })),
  estimate: [['b42-est-t09', 1], ['s3-est-isner', 0], ['b42-est-c18', 1], ['b42-est-c19', 0], ['v2-sport-und-pop-1', 1], ['b42-est-t10', 0]].map(([id, fb]) => ({ id: id as string, fb: !!fb })),
  link: [['s3-link-pele', 1], ['v2-wer-oder-was-2', 0], ['b42-link-t11', 1], ['b42-link-c22', 0], ['b42-link-c24', 1], ['b42-link-c23', 0]].map(([id, fb]) => ({ id: id as string, fb: !!fb })),
  unique: [['b42-unique-t13', 1], ['v2-einzigartig-1', 0], ['b42-unique-c27', 1], ['b42-unique-t14', 0], ['b42-unique-p20', 1], ['s3-unique-orchester', 0]].map(([id, fb]) => ({ id: id as string, fb: !!fb })),
};
const PROBE = (m: string) => `s5-probe-${m}`;
const ROUND_DEF: { key: string; id: string; probe: string; src: string }[] = [
  { key: 'geo', id: 'b42-r1', probe: PROBE('geo'), src: 's5-r1' }, { key: 'match', id: 'b42-r2', probe: PROBE('match'), src: 's5-r2' }, { key: 'rank', id: 'b42-r3', probe: PROBE('rank'), src: 's5-r3' },
  { key: 'unique', id: 'b42-sur', probe: PROBE('unique'), src: 's5-sur' }, { key: 'glitch', id: 'b42-r4', probe: PROBE('glitch'), src: 's5-r4' },
  { key: 'estimate', id: 'b42-r5', probe: PROBE('estimate'), src: 's5-r5' }, { key: 'link', id: 'b42-r6', probe: PROBE('link'), src: 's5-r6' },
];
export const BESTOF_ROUNDS: SeedShow['rounds'] = ROUND_DEF.map(d => {
  const base = SHOW3_ROUNDS.find(r => r.id === d.src)!;
  return { ...base, id: d.id, taskIds: [d.probe, ...BESTOF_PLAN[d.key].map(x => x.id)] };
});
export const BESTOF_STEPS: ShowStep[] = [
  { k: 'round', cat: 'b42-r1' }, { k: 'board' }, { k: 'round', cat: 'b42-r2' }, { k: 'round', cat: 'b42-r3' }, { k: 'board' },
  { k: 'surprise', cat: 'b42-sur' },
  { k: 'round', cat: 'b42-r4' }, { k: 'round', cat: 'b42-r5' }, { k: 'round', cat: 'b42-r6' }, { k: 'board' },
  { k: 'final', cat: 's3-final' },
];

const RULES = { ...SHOW3_PACK.rules, tasksPerMode: 6, uniquePoints: 300, boardEveryRound: true };
export const SEED_SHOW_B42: SeedShow = {
  pack: { id: 'show-4', name: 'Reus 65 Mio – Best of 42', description: '7 Spielmodi × 1 Probe + 6 Wertungsfragen (42, davon 21 Fußball/Kickbase), FINAL LOCK, 3 Marktwert-Updates. Sieger: Reus65Mio-Champion. Sehr lange Show (ca. 2,5 Std.).', rules: RULES },
  pool: BESTOF_NEW, rounds: BESTOF_ROUNDS, steps: BESTOF_STEPS,
};
export const SEED_SHOW_B42K: SeedShow = {
  pack: { id: 'show-3z', name: 'Reus 65 Mio – Best of 42 · Finale KICKBASE-KONSENS', description: 'Wie „Best of 42“, aber mit dem Gruppenspiel KICKBASE-KONSENS als Finale (optional, FINAL LOCK bleibt Standard).', rules: RULES },
  pool: BESTOF_KK,
  rounds: [{ id: 'b42-final-kk', title: 'KICKBASE-KONSENS', topic: 'Das große Finale', icon: '🤝', color: C.GR, kind: 'final', football: false,
    blurb: 'Drei Gruppenfragen, 1.800 Punkte, die Rangliste bleibt verborgen. Wähle geheim einen Mitspieler – Punkte gibt es für die Wahl mit den meisten Stimmen.', taskIds: ['b42-kk-1', 'b42-kk-2', 'b42-kk-3'] }],
  steps: BESTOF_STEPS.map(s => (s.k === 'final' ? { k: 'final' as const, cat: 'b42-final-kk' } : s)),
};
