// Standardpaket „Spieleabend“ (7 Spielmodi): 9 Kategorien · Überraschungsrunde EINZIGARTIG · Finale.
// Redaktion, Quellen und Begründung je Aufgabe: docs/INHALTE-REDAKTION.md.
// Zeitabhängige Werte (laufende Rekorde, aktuelle Tabellen) werden bewusst nicht verwendet.
import type { TileDef } from '../shared/types';

const PU = '#8b5cf6', BL = '#3b82f6', TE = '#14d9c0', GO = '#f5b82e', PK = '#ec4899', OR = '#fb923c', GR = '#22c55e', RD = '#ef4444', CY = '#38bdf8';

/** Kennung des mitgelieferten Pakets (siehe ContentService.installSeed). */
export const SEED_PACK = {
  id: 'standard-2',
  name: 'Standardpaket – Spieleabend',
  description: 'Neun Kategorien mit sechs Spielmodi, Überraschungsrunde EINZIGARTIG und Finale (alle sieben Modi).',
};

const GEO_BLURB = 'Setze deinen Pin auf der Karte – du kannst zoomen und ihn verschieben. Gewertet wird die Platzierung nach Entfernung.';
const RANK_BLURB = 'Fünf Begriffe erscheinen nacheinander. Setze jeden SOFORT auf einen freien Rangplatz – endgültig!';
const EST_BLURB = 'Erst schätzt jeder geheim. Dann sehen alle die Tipps – und du setzt Punkte auf die Schätzung, der du am meisten vertraust.';

export const TILES: TileDef[] = [
  // ---------------------------------------------------------------- 1 · WO ZUR HÖLLE? (Fußball)
  {
    id: 'v2-heimspiel', title: 'Heimspiel', topic: 'Fußball-Orte', icon: '🏟️', color: GR, mode: 'geo', kind: 'tile', football: true, blurb: GEO_BLURB,
    tasks: [
      { mode: 'geo', map: 'germany', seconds: 30, points: 200, prompt: 'Wo steht die Allianz Arena?',
        answer: { lat: 48.2188, lon: 11.6247, label: 'Allianz Arena, München' },
        explain: 'Die Allianz Arena steht im Münchner Norden, in Fröttmaning, direkt an der Autobahn A9.' },
      { mode: 'geo', map: 'europe', seconds: 35, points: 250, prompt: 'Wo fand das Champions-League-Finale 2025 zwischen Paris Saint-Germain und Inter Mailand statt?',
        answer: { lat: 48.2188, lon: 11.6247, label: 'Allianz Arena, München' },
        explain: 'Wieder die Allianz Arena! Dort gewann PSG am 31. Mai 2025 mit 5:0 – der höchste Sieg in einem Champions-League-Finale.' },
      { mode: 'geo', map: 'europe', seconds: 35, points: 250, prompt: 'Wo liegt Bodø, die Heimat des norwegischen Klubs Bodø/Glimt?',
        answer: { lat: 67.2804, lon: 14.4049, label: 'Bodø, Norwegen' },
        explain: 'Bodø liegt in Nordnorwegen, rund 80 km nördlich des Polarkreises – hier wird im Winter bei Dunkelheit und im Sommer bei Mitternachtssonne gespielt.' },
      { mode: 'geo', map: 'world', seconds: 40, points: 300, prompt: '1930 fand die allererste Fußball-Weltmeisterschaft statt. Wo stand das Finalstadion, das Estadio Centenario?',
        answer: { lat: -34.8946, lon: -56.1527, label: 'Montevideo, Uruguay' },
        explain: 'Das Estadio Centenario in Montevideo wurde zum 100. Jahrestag der uruguayischen Verfassung gebaut. Im Finale gewann Gastgeber Uruguay 4:2 gegen Argentinien.' },
    ],
  },
  // ---------------------------------------------------------------- 2 · BLIND RANK (Pop & Marken)
  {
    id: 'v2-wer-war-zuerst', title: 'Wer war zuerst?', topic: 'Marken, Technik & Zeitreisen', icon: '⏳', color: PK, mode: 'rank', kind: 'tile', football: false, blurb: RANK_BLURB,
    tasks: [
      { mode: 'rank', secondsPerItem: 12, points: 250, prompt: 'Was gibt es schon am längsten? – die älteste Marke zuerst', topLabel: 'am ältesten', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Coca-Cola', value: '1886 (erfunden)' }, { text: 'Nintendo', value: '1889 (Spielkarten)' }, { text: 'LEGO', value: '1932' },
          { text: 'PlayStation', value: '1994 (Japan)' }, { text: 'Netflix', value: '1997' },
        ], order: [3, 0, 4, 2, 1],
        explain: 'Coca-Cola (1886), Nintendo (1889), LEGO (1932), PlayStation (1994) und Netflix (1997). Nintendo war schon über 100 Jahre alt, als die PlayStation erschien!' },
      { mode: 'rank', secondsPerItem: 12, points: 250, prompt: 'Was geschah zuerst? – das älteste Ereignis zuerst', topLabel: 'am längsten her', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Eröffnung des Suezkanals', value: '1869' }, { text: 'Erste Olympische Spiele der Neuzeit', value: '1896' }, { text: 'Erster Motorflug der Brüder Wright', value: '1903' },
          { text: 'Untergang der Titanic', value: '1912' }, { text: 'Gagarin fliegt als erster Mensch ins All', value: '1961' },
        ], order: [2, 4, 1, 3, 0],
        explain: 'Suezkanal (1869), Olympia in Athen (1896), Wright-Flug (1903), Titanic (1912), Gagarin (1961). Zwischen dem ersten Motorflug und dem ersten Menschen im All liegen nur 58 Jahre.' },
      { mode: 'rank', secondsPerItem: 12, points: 250, prompt: 'Wie hoch ist es? – das höchste Bauwerk zuerst', topLabel: 'am höchsten', bottomLabel: 'am niedrigsten',
        items: [
          { text: 'Burj Khalifa (Dubai)', value: '828 m' }, { text: 'Eiffelturm (Paris)', value: 'ca. 330 m' }, { text: 'Kölner Dom', value: '157 m' },
          { text: 'Big Ben (Elizabeth Tower)', value: '96 m' }, { text: 'Schiefer Turm von Pisa', value: '56 m' },
        ], order: [3, 0, 4, 1, 2],
        explain: 'Burj Khalifa (828 m), Eiffelturm (ca. 330 m), Kölner Dom (157 m), Big Ben (96 m) und der Schiefe Turm von Pisa (56 m).' },
    ],
  },
  // ---------------------------------------------------------------- 3 · SETZ AUF MICH (Wahnsinnszahlen)
  {
    id: 'v2-wahnsinnszahlen', title: 'Wahnsinnszahlen', topic: 'Bauwerke & Zahlen', icon: '🎲', color: OR, mode: 'estimate', kind: 'tile', football: false, blurb: EST_BLURB,
    tasks: [
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Stufen führen im Kölner Dom auf die Aussichtsplattform des Südturms?', unit: 'Stufen', answer: 533,
        explain: '533 Stufen – ganz ohne Aufzug. Die Plattform liegt in rund 97 m Höhe.' },
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Nieten halten den Eiffelturm zusammen?', unit: 'Nieten', answer: 2500000,
        explain: 'Rund 2,5 Millionen Nieten verbinden die gut 18.000 Eisenteile – etwa eine Million davon wurde erst auf der Baustelle gesetzt.' },
    ],
  },
  // ---------------------------------------------------------------- 4 · GLITCH
  {
    id: 'v2-alles-im-blick', title: 'Alles im Blick', topic: 'Alltag & Beobachtung', icon: '👁️', color: CY, mode: 'glitch', kind: 'tile', football: false,
    blurb: 'Schau genau hin: Du siehst ein Bild, dann verändert sich etwas. Tippe auf dem Handy auf die veränderte Stelle.',
    tasks: [
      { mode: 'glitch', scene: 'menu1', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Speisekarte!', prompt: 'Welcher Preis wurde verändert? Tippe darauf.',
        explain: 'Das Schnitzel Wiener Art kostete vorher 14,90 €, jetzt stehen dort 19,40 €.' },
      { mode: 'glitch', scene: 'chat1', viewSeconds: 14, seconds: 25, points: 250, viewPrompt: 'Lies den Gruppenchat – gleich ändert sich etwas!', prompt: 'Welche Nachricht wurde verändert? Tippe darauf.',
        explain: 'Aus dem „Nordeingang“ wurde der „Südeingang“ – wer hier nicht aufpasst, steht am falschen Tor.' },
      { mode: 'glitch', scene: 'ticket1', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Eintrittskarte!', prompt: 'Welche Angabe wurde verändert? Tippe darauf.',
        explain: 'Die Reihe war vorher 12, jetzt steht dort 21.' },
      { mode: 'glitch', scene: 'pitch1', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Aufstellung!', prompt: 'Welcher Spieler hat sich bewegt? Tippe darauf.',
        explain: 'Ein blauer Spieler (rechts unten) stand vorher deutlich weiter oben auf dem Feld.' },
    ],
  },
  // ---------------------------------------------------------------- 5 · MATCHMAKER
  {
    id: 'v2-passt-zusammen', title: 'Passt zusammen', topic: 'Firmen, Erfinder & Filme', icon: '🧲', color: PU, mode: 'match', kind: 'tile', football: false,
    blurb: 'Links sechs Begriffe, rechts die passenden Partner – gemischt. Verbinde sie auf dem Handy. Jedes richtige Paar bringt 50 Punkte, Ändern geht bis zur Abgabe.',
    tasks: [
      { mode: 'match', seconds: 60, points: 300, prompt: 'Was haben diese Unternehmen ursprünglich hergestellt oder verkauft?',
        pairs: [
          { left: 'Nintendo', right: 'Spielkarten' }, { left: 'BMW', right: 'Flugzeugmotoren' }, { left: 'Nokia', right: 'Papier' },
          { left: 'Toyota', right: 'Webstühle' }, { left: 'Samsung', right: 'Trockenfisch & Nudeln' }, { left: 'LEGO', right: 'Holzspielzeug' },
        ], order: [3, 5, 0, 4, 2, 1],
        explain: 'Nintendo begann 1889 mit Hanafuda-Spielkarten, BMW 1916 mit Flugzeugmotoren, Nokia 1865 als Papierfabrik, Toyota mit automatischen Webstühlen, Samsung 1938 mit Trockenfisch und Nudeln und LEGO 1932 mit Holzspielzeug.' },
      { mode: 'match', seconds: 60, points: 300, prompt: 'Wer hat’s erfunden? Erfinder aus Deutschland und ihre Erfindung',
        pairs: [
          { left: 'Johannes Gutenberg', right: 'Buchdruck mit beweglichen Lettern' }, { left: 'Wilhelm Conrad Röntgen', right: 'Röntgenstrahlen' }, { left: 'Melitta Bentz', right: 'Kaffeefilter' },
          { left: 'Karl Drais', right: 'Laufmaschine (Fahrrad-Vorläufer)' }, { left: 'Konrad Zuse', right: 'Computer Z3' }, { left: 'Rudolf Diesel', right: 'Dieselmotor' },
        ], order: [4, 2, 5, 0, 3, 1],
        explain: 'Gutenberg (Buchdruck, um 1450), Röntgen (1895), Melitta Bentz (Kaffeefilter, 1908), Drais (Laufmaschine, 1817), Zuse (Z3, 1941) und Diesel (Dieselmotor, 1890er).' },
      { mode: 'match', seconds: 60, points: 300, prompt: 'Wer hat’s gedreht? Regisseurinnen, Regisseure und ihre Filme',
        pairs: [
          { left: 'Steven Spielberg', right: 'Jurassic Park' }, { left: 'Christopher Nolan', right: 'Inception' }, { left: 'Quentin Tarantino', right: 'Pulp Fiction' },
          { left: 'James Cameron', right: 'Titanic' }, { left: 'Peter Jackson', right: 'Der Herr der Ringe' }, { left: 'Greta Gerwig', right: 'Barbie' },
        ], order: [2, 4, 5, 1, 0, 3],
        explain: 'Spielberg (Jurassic Park, 1993), Nolan (Inception, 2010), Tarantino (Pulp Fiction, 1994), Cameron (Titanic, 1997 – elf Oscars), Jackson (Herr der Ringe) und Gerwig (Barbie, 2023).' },
    ],
  },
  // ---------------------------------------------------------------- 6 · WO ZUR HÖLLE? (Orte mit Geschichte)
  {
    id: 'v2-orte-mit-geschichte', title: 'Orte mit Geschichte', topic: 'Märchen, Metal & Weihnachtsmann', icon: '🧭', color: TE, mode: 'geo', kind: 'tile', football: false, blurb: GEO_BLURB,
    tasks: [
      { mode: 'geo', map: 'germany', seconds: 30, points: 200, prompt: 'Wo steht Schloss Neuschwanstein, das Vorbild für das Märchenschloss von Disney?',
        answer: { lat: 47.5576, lon: 10.7498, label: 'Schloss Neuschwanstein, Allgäu' },
        explain: 'Neuschwanstein steht bei Füssen im Allgäu, direkt an der Grenze zu Österreich. König Ludwig II. ließ es ab 1869 bauen.' },
      { mode: 'geo', map: 'germany', seconds: 35, points: 250, prompt: 'Ein Dorf mit rund 2.000 Einwohnern, in dem einmal im Jahr bis zu 85.000 Metal-Fans feiern: Wo liegt Wacken?',
        answer: { lat: 54.02, lon: 9.3775, label: 'Wacken, Schleswig-Holstein' },
        explain: 'Wacken liegt im Kreis Steinburg in Schleswig-Holstein, nordwestlich von Itzehoe – mitten im flachen Land.' },
      { mode: 'geo', map: 'europe', seconds: 35, points: 250, prompt: 'Hier wohnt – offiziell – der Weihnachtsmann: Wo liegt das Santa-Claus-Dorf bei Rovaniemi?',
        answer: { lat: 66.5436, lon: 25.8473, label: 'Rovaniemi, Finnland' },
        explain: 'Rovaniemi liegt in Finnisch-Lappland, genau am Polarkreis. Das Weihnachtsmanndorf erhält jedes Jahr hunderttausende Besucher.' },
      { mode: 'geo', map: 'world', seconds: 40, points: 300, prompt: 'Timbuktu klingt wie ein Ort aus dem Märchen – aber es gibt ihn wirklich. Wo liegt die Stadt?',
        answer: { lat: 16.7735, lon: -3.0074, label: 'Timbuktu, Mali' },
        explain: 'Timbuktu liegt im Norden von Mali, am südlichen Rand der Sahara – und war im Mittelalter ein Zentrum des Handels und der Gelehrsamkeit.' },
    ],
  },
  // ---------------------------------------------------------------- 7 · BLIND RANK (Fußball-Zeitreise)
  {
    id: 'v2-fussball-zeitreise', title: 'Fußball-Zeitreise', topic: 'Vereine, Regeln & Rekorde', icon: '⚽', color: GR, mode: 'rank', kind: 'tile', football: true, blurb: RANK_BLURB,
    tasks: [
      { mode: 'rank', secondsPerItem: 12, points: 250, prompt: 'Gründungsjahr des Klubs – der älteste zuerst', topLabel: 'ältester Klub', bottomLabel: 'jüngster Klub',
        items: [
          { text: 'Manchester United', value: '1878 (als Newton Heath)' }, { text: 'Juventus Turin', value: '1897' }, { text: 'FC Barcelona', value: '1899' },
          { text: 'FC Bayern München', value: '1900' }, { text: 'Real Madrid', value: '1902' },
        ], order: [3, 0, 4, 1, 2],
        explain: 'Manchester United (1878), Juventus (1897), Barcelona (1899), Bayern (1900) – und ausgerechnet Real Madrid (1902) ist der jüngste dieser fünf Giganten.' },
      { mode: 'rank', secondsPerItem: 12, points: 250, prompt: 'Was geschah zuerst? – Fußball-Geschichte, das älteste Ereignis zuerst', topLabel: 'am längsten her', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Die erste Europameisterschaft', value: '1960' }, { text: 'Start der Bundesliga', value: '1963' }, { text: 'Die erste Frauen-Weltmeisterschaft', value: '1991' },
          { text: 'Die Rückpassregel für Torhüter', value: '1992' }, { text: 'Der Videobeweis in der Bundesliga', value: '2017' },
        ], order: [2, 4, 1, 3, 0],
        explain: 'EM (1960), Bundesliga-Start (1963), Frauen-WM (1991), Rückpassregel (1992) und Videobeweis (2017). Die Rückpassregel ist erst gut 30 Jahre alt!' },
      { mode: 'rank', secondsPerItem: 12, points: 250, prompt: 'Länderspiele für Deutschland – die meisten zuerst', topLabel: 'meiste Länderspiele', bottomLabel: 'wenigste Länderspiele',
        items: [
          { text: 'Lothar Matthäus', value: '150' }, { text: 'Miroslav Klose', value: '137' }, { text: 'Lukas Podolski', value: '130' },
          { text: 'Bastian Schweinsteiger', value: '121' }, { text: 'Philipp Lahm', value: '113' },
        ], order: [2, 4, 0, 3, 1],
        explain: 'Matthäus (150), Klose (137), Podolski (130), Schweinsteiger (121) und Lahm (113) – die letzten drei trennen nur wenige Spiele.' },
    ],
  },
  // ---------------------------------------------------------------- 8 · DIE VERBINDUNG
  {
    id: 'v2-wer-oder-was', title: 'Wer oder was?', topic: 'Die gemeinsame Lösung', icon: '🔗', color: BL, mode: 'link', kind: 'tile', football: false,
    blurb: 'Vier Hinweise erscheinen nacheinander – alle führen zur selben Lösung. Je früher du sie nennst, desto mehr Punkte (300 / 225 / 150 / 75). Du hast nur einen Versuch!',
    tasks: [
      { mode: 'link', prompt: 'Welcher Ort wird gesucht?', clueSeconds: 12, points: 300,
        clues: [
          'Unsichtbar unter ihr steckt ein riesiger Wald aus Holzpfählen im Schlamm – ohne ihn würde sie versinken.',
          'Ihre berühmteste Straße ist ein rund 3,8 Kilometer langer, S-förmiger Wasserlauf.',
          'Jedes Jahr im Februar tragen hier Tausende Menschen aufwendige Masken.',
          'Man fährt Gondel und die Seufzerbrücke führt zum Dogenpalast.',
        ], answer: 'Venedig', accept: ['Venice', 'Venezia'],
        explain: 'Venedig steht auf Holzpfählen in der Lagune. Der Canal Grande ist rund 3,8 km lang; die Seufzerbrücke verbindet Dogenpalast und Gefängnis.' },
      { mode: 'link', prompt: 'Welcher Alltagsgegenstand wird gesucht?', clueSeconds: 12, points: 300,
        clues: [
          'Er entstand aus einem Fehlschlag: Ein Chemiker wollte 1968 einen besonders starken Kleber – und erfand das Gegenteil.',
          'Ein Kollege suchte Lesezeichen, die im Gesangbuch halten, ohne beim Umblättern herauszufallen.',
          'Dass er gelb ist, war Zufall: Im Labor lag gerade gelbes Notizpapier herum.',
          'Er klebt an Monitoren und Kühlschranktüren und lässt sich einfach wieder abziehen.',
        ], answer: 'Post-it', accept: ['Haftnotiz', 'Haftnotizen', 'Haftzettel', 'Klebezettel', 'Post it'],
        explain: '3M-Chemiker Spencer Silver entwickelte 1968 einen Kleber, der kaum haftete. Kollege Art Fry erkannte Jahre später den Nutzen – für sein Gesangbuch im Kirchenchor.' },
      { mode: 'link', prompt: 'Welche Person wird gesucht?', clueSeconds: 12, points: 300,
        clues: [
          'Ihre Notizbücher aus dem 19. Jahrhundert lagern bis heute in Bleikisten, weil sie noch immer strahlen.',
          'Als erste Person überhaupt gewann sie zwei Nobelpreise.',
          'Eines ihrer entdeckten Elemente benannte sie nach ihrer Heimat: Polonium.',
          'Die in Warschau Geborene forschte in Paris gemeinsam mit ihrem Mann Pierre am Radium.',
        ], answer: 'Marie Curie', accept: ['Curie', 'Madame Curie', 'Marie Skłodowska-Curie', 'Maria Skłodowska-Curie'],
        explain: 'Marie Curie erhielt 1903 den Physik- und 1911 den Chemie-Nobelpreis. Ihre Notizbücher liegen in Bleikisten in der Pariser Nationalbibliothek.' },
    ],
  },
  // ---------------------------------------------------------------- 9 · SETZ AUF MICH (Sport & Pop)
  {
    id: 'v2-sport-und-pop', title: 'Sport & Pop', topic: 'Tore, Töne & Tempo', icon: '🎯', color: GO, mode: 'estimate', kind: 'tile', football: false, blurb: EST_BLURB,
    tasks: [
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Tore fielen insgesamt bei der Fußball-WM 2014 in Brasilien (64 Spiele)?', unit: 'Tore', answer: 171,
        explain: '171 Tore, im Schnitt 2,67 pro Spiel – damals WM-Rekord, bis 2022 mit 172 Toren knapp übertroffen wurde.' },
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Sekunden dauert „Bohemian Rhapsody“ von Queen in der Originalversion?', unit: 'Sekunden', answer: 355,
        explain: '5 Minuten und 55 Sekunden, also 355 Sekunden – für eine Single war das 1975 ungewöhnlich lang.' },
    ],
  },
  // ================================================================ ÜBERRASCHUNG
  {
    id: 'v2-einzigartig', title: 'EINZIGARTIG', topic: 'Überraschungsrunde', icon: '✨', color: PK, mode: 'unique', kind: 'surprise', football: false,
    blurb: 'Nenne eine gültige Antwort – aber bloß keine, die auch ein anderer nennt! Einzigartige Antworten bringen die meisten Punkte, doppelte nur wenige.',
    tasks: [
      { mode: 'unique', seconds: 45, pointsUnique: 500, pointsShared: 150, placeholder: 'Ein Donauland …',
        prompt: 'Nenne ein Land, durch das die Donau fließt.',
        valid: [
          { name: 'Deutschland', variants: ['Germany'] }, { name: 'Österreich', variants: ['Oesterreich', 'Austria'] }, { name: 'Slowakei', variants: ['Slovakia', 'Slowakische Republik'] },
          { name: 'Ungarn', variants: ['Hungary'] }, { name: 'Kroatien', variants: ['Croatia'] }, { name: 'Serbien', variants: ['Serbia'] },
          { name: 'Rumänien', variants: ['Rumaenien', 'Romania'] }, { name: 'Bulgarien', variants: ['Bulgaria'] },
          { name: 'Moldau', variants: ['Moldawien', 'Republik Moldau', 'Moldova'] }, { name: 'Ukraine', variants: [] },
        ],
        explain: 'Die Donau fließt durch zehn Länder – mehr als jeder andere Fluss der Erde: Deutschland, Österreich, Slowakei, Ungarn, Kroatien, Serbien, Rumänien, Bulgarien, Moldau und Ukraine.' },
      { mode: 'unique', seconds: 45, pointsUnique: 500, pointsShared: 150, placeholder: 'Ein Gastgeberland …',
        prompt: 'Nenne ein Land, das schon einmal eine Fußball-Weltmeisterschaft ausgerichtet hat.',
        valid: [
          { name: 'Uruguay', variants: [] }, { name: 'Italien', variants: ['Italy'] }, { name: 'Frankreich', variants: ['France'] }, { name: 'Brasilien', variants: ['Brazil'] },
          { name: 'Schweiz', variants: ['Switzerland'] }, { name: 'Schweden', variants: ['Sweden'] }, { name: 'Chile', variants: [] }, { name: 'England', variants: [] },
          { name: 'Mexiko', variants: ['Mexico'] }, { name: 'Deutschland', variants: ['Germany', 'BRD'] }, { name: 'Argentinien', variants: ['Argentina'] }, { name: 'Spanien', variants: ['Spain'] },
          { name: 'USA', variants: ['Vereinigte Staaten', 'Amerika', 'United States'] }, { name: 'Südkorea', variants: ['Suedkorea', 'Korea', 'South Korea'] }, { name: 'Japan', variants: [] },
          { name: 'Südafrika', variants: ['Suedafrika', 'South Africa'] }, { name: 'Russland', variants: ['Russia'] }, { name: 'Katar', variants: ['Qatar'] }, { name: 'Kanada', variants: ['Canada'] },
        ],
        explain: 'Bisherige Gastgeber: Uruguay, Italien, Frankreich, Brasilien, Schweiz, Schweden, Chile, England, Mexiko, Deutschland, Argentinien, Spanien, USA, Südkorea, Japan, Südafrika, Russland, Katar und (2026) Kanada.' },
    ],
  },
  // ================================================================ FINALE
  {
    id: 'v2-final', title: 'FINAL LOCK', topic: 'Das große Finale', icon: '🔒', color: GO, mode: 'geo', kind: 'final', football: false,
    blurb: 'Vier Aufgaben, 2.000 Punkte, die Rangliste bleibt verborgen. Erst bei der Siegerehrung zeigt sich, wer wirklich vorne liegt.',
    tasks: [
      { mode: 'geo', map: 'world', seconds: 45, points: 400, prompt: 'Der abgelegenste dauerhaft bewohnte Ort der Welt: Wo liegt die Insel Tristan da Cunha?',
        answer: { lat: -37.1122, lon: -12.2822, label: 'Tristan da Cunha, Südatlantik' },
        explain: 'Tristan da Cunha liegt mitten im Südatlantik: rund 2.400 km bis zur nächsten bewohnten Insel (St. Helena) und gut 2.700 km bis Kapstadt. Nur per Schiff erreichbar, etwa 250 Einwohner.' },
      { mode: 'link', prompt: 'Welches Spiel wird gesucht?', clueSeconds: 12, points: 300,
        clues: [
          'Erfunden wurde es 1984 in Moskau von einem Informatiker – ursprünglich, um einen neuen Computer zu testen.',
          'Der Name verbindet das griechische Wort für „vier“ mit einer Ballsportart.',
          'Seine Melodie ist ein russisches Volkslied und wurde über den Game Boy weltberühmt.',
          'Bunte Steine aus je vier Quadraten fallen herab – volle Reihen verschwinden.',
        ], answer: 'Tetris', accept: [],
        explain: 'Alexei Paschitnow entwickelte Tetris 1984. Der Name entsteht aus „tetra“ (vier) und „Tennis“; die Musik „Korobeiniki“ ist ein russisches Volkslied.' },
      { mode: 'rank', secondsPerItem: 14, points: 500, prompt: 'Zu Gast bei Freunden – die Fußball-WM in … Das früheste Turnier zuerst', topLabel: 'am längsten her', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Schweden', value: '1958' }, { text: 'England', value: '1966' }, { text: 'Argentinien', value: '1978' },
          { text: 'USA', value: '1994' }, { text: 'Südafrika', value: '2010' },
        ], order: [2, 4, 0, 3, 1],
        explain: 'Die WM war zu Gast in Schweden (1958), England (1966), Argentinien (1978), den USA (1994) und Südafrika (2010 – das erste Turnier in Afrika).' },
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 250, 500], prompt: 'Wie viele Kilometer beträgt die Luftlinie von Berlin nach Sydney?', unit: 'km', answer: 16095,
        explain: 'Rund 16.100 km Luftlinie – rund 40 % des Erdumfangs (40.075 km) und nur etwa 4.000 km weniger als die größtmögliche Entfernung auf der Erde.' },
    ],
  },
];
