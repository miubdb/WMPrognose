// Spielinhalte (Datenpakete). Alle Fakten wurden gegen gesicherte Standardquellen abgeglichen;
// unsichere oder zeitabhängige Zahlen (aktuelle Rekorde, laufende Saisons) wurden bewusst nicht verwendet.
import type { TileDef } from '../shared/types';

const PU = '#8b5cf6', BL = '#3b82f6', TE = '#14d9c0', GO = '#f5b82e', PK = '#ec4899', OR = '#fb923c', GR = '#22c55e', RD = '#ef4444', CY = '#38bdf8';

export const TILES: TileDef[] = [
  // ---------------------------------------------------------------- 1
  {
    id: 'geo-daneben', title: 'Geografisch daneben', topic: 'Orte, die es wirklich gibt', icon: '🧭', color: TE, mode: 'geo', kind: 'tile', football: false,
    blurb: 'Setze deinen Pin auf der Karte. Je näher, desto besser – gewertet wird die Platzierung.',
    tasks: [
      { mode: 'geo', map: 'world', seconds: 35, points: 250, prompt: 'Timbuktu klingt wie ein Ort aus dem Märchen – aber es gibt ihn wirklich. Wo liegt die Stadt?',
        answer: { lat: 16.7735, lon: -3.0074, label: 'Timbuktu, Mali' },
        explain: 'Timbuktu liegt im Norden von Mali, am südlichen Rand der Sahara – und war im Mittelalter ein Zentrum des Handels und der Gelehrsamkeit.' },
      { mode: 'geo', map: 'europe', seconds: 35, points: 250, prompt: 'Wo liegt Tórshavn, die Hauptstadt der Färöer-Inseln?',
        answer: { lat: 62.0097, lon: -6.7716, label: 'Tórshavn, Färöer' },
        explain: 'Die Färöer liegen im Nordatlantik zwischen Schottland, Island und Norwegen. Tórshavn hat nur rund 14.000 Einwohner.' },
      { mode: 'geo', map: 'germany', seconds: 30, points: 250, prompt: 'Es gibt sie angeblich nicht – aber wo liegt Bielefeld?',
        answer: { lat: 52.0302, lon: 8.5325, label: 'Bielefeld, NRW' },
        explain: 'Bielefeld liegt in Ostwestfalen am Teutoburger Wald – und die „Bielefeld-Verschwörung“ ist ein Internet-Scherz seit 1994.' },
      { mode: 'geo', map: 'world', seconds: 40, points: 250, prompt: 'Der Ort gilt als kältester dauerhaft bewohnter Ort der Erde: Wo liegt Oimjakon (Oymyakon)?',
        answer: { lat: 63.4608, lon: 142.7858, label: 'Oimjakon, Sibirien' },
        explain: 'Oimjakon liegt in der russischen Republik Sacha (Jakutien) im Nordosten Sibiriens. Dort wurden rund −68 °C gemessen.' },
    ],
  },
  // ---------------------------------------------------------------- 2
  {
    id: 'koenig-fussball', title: 'König Fußball', topic: 'Bundesliga & Legenden', icon: '⚽', color: GR, mode: 'rank', kind: 'tile', football: true,
    blurb: 'Fünf Begriffe, fünf Plätze: Du siehst sie nacheinander und musst SOFORT einsortieren. Endgültig!',
    tasks: [
      { mode: 'rank', secondsPerItem: 12, points: 340, prompt: 'Gründungsjahr des Vereins – ältester zuerst', topLabel: 'ältester Verein', bottomLabel: 'jüngster Verein',
        items: [
          { text: 'VfB Stuttgart', value: '1893' }, { text: 'Werder Bremen', value: '1899' }, { text: 'FC Schalke 04', value: '1904' },
          { text: 'Borussia Dortmund', value: '1909' }, { text: '1. FC Köln', value: '1948' },
        ], order: [2, 4, 0, 3, 1],
        explain: 'Stuttgart (1893), Bremen (1899), Schalke (1904), Dortmund (1909) und der 1. FC Köln (1948, durch Fusion).' },
      { mode: 'rank', secondsPerItem: 12, points: 330, prompt: 'Legendäre WM-Momente – was geschah zuerst?', topLabel: 'am längsten her', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Das Wunder von Bern (Finale Deutschland–Ungarn)', value: '1954' }, { text: 'Das Wembley-Tor', value: '1966' }, { text: 'Maradonas „Hand Gottes“', value: '1986' },
          { text: 'Zidanes Kopfstoß im Finale', value: '2006' }, { text: 'Götzes Siegtor im Finale', value: '2014' },
        ], order: [3, 1, 4, 0, 2],
        explain: 'Bern 1954, Wembley 1966, Hand Gottes 1986, Zidane 2006 und Götze 2014.' },
      { mode: 'rank', secondsPerItem: 12, points: 330, prompt: 'Die meisten Bundesliga-Tore aller Zeiten', topLabel: 'meiste Tore', bottomLabel: 'wenigste Tore',
        items: [
          { text: 'Gerd Müller', value: '365 Tore' }, { text: 'Robert Lewandowski', value: '312 Tore' }, { text: 'Klaus Fischer', value: '268 Tore' },
          { text: 'Jupp Heynckes', value: '220 Tore' }, { text: 'Manfred Burgsmüller', value: '213 Tore' },
        ], order: [3, 1, 4, 0, 2],
        explain: 'Gerd Müller (365) führt vor Lewandowski (312), Klaus Fischer (268), Jupp Heynckes (220) und Manfred Burgsmüller (213) – die letzten beiden trennen nur sieben Tore.' },
    ],
  },
  // ---------------------------------------------------------------- 3
  {
    id: 'kopfsalat', title: 'Kopfsalat', topic: 'Logik & Rätsel', icon: '🧩', color: PU, mode: 'codebreak', kind: 'tile', football: false,
    blurb: 'Knackt den Code! Du hast drei Versuche. Hinweise helfen – kosten aber Punkte.',
    tasks: [
      { mode: 'codebreak', input: 'number', seconds: 70, points: 300, prompt: 'Der 7. November 2026 ist ein Samstag. Wie viele Freitage, die auf einen 13. fallen, gibt es im Jahr 2026 insgesamt?',
        answers: ['3'], hints: ['Der 1. Januar 2026 war ein Donnerstag.', 'Zähle mod 7: Wie viele Tage liegen zwischen dem 13. Januar und dem 13. des jeweiligen Monats?', 'Im Februar (28 Tage) und im März klappt es – und ein dritter Monat ist dir heute Abend schon begegnet.'],
        explain: 'Freitag, der 13. fällt 2026 auf den 13. Februar, den 13. März und den 13. November – also dreimal. Februar und März hängen zusammen, weil der Februar genau 28 Tage hat.' },
      { mode: 'codebreak', input: 'number', seconds: 90, points: 300, prompt: 'Welche dreistellige Zahl ist gesucht?', display: 'Die drei Ziffern bilden eine Reihe mit gleichem Abstand\n(z. B. 9-6-3).  Quersumme: 15.\nDie Zahl ist durch 4 teilbar.',
        answers: ['852'], hints: ['Bei gleichem Abstand ist die mittlere Ziffer der Durchschnitt der beiden äußeren.', 'Die mittlere Ziffer muss 5 sein (Quersumme 15 geteilt durch 3).', 'Kandidaten: 654, 753, 852, 951 – nur eine ist durch 4 teilbar (letzte zwei Ziffern!).'],
        explain: 'Mittlere Ziffer 5, also 654, 753, 852 oder 951. Durch 4 teilbar ist nur 852 (52 ist durch 4 teilbar).' },
      { mode: 'codebreak', input: 'number', seconds: 120, points: 400, prompt: 'Zwei gleich lange Kerzen werden gleichzeitig angezündet. Kerze A brennt in 4 Stunden ab, Kerze B in 3 Stunden. Nach wie vielen MINUTEN ist Kerze A genau doppelt so lang wie Kerze B?',
        answers: ['144'], hints: ['Rechne mit der Länge 1: Nach t Stunden ist A noch 1 − t/4 lang, B noch 1 − t/3.', 'Gesucht: 1 − t/4 = 2 · (1 − t/3).', 'Das ergibt t = 2,4 Stunden.'],
        explain: 'Aus 1 − t/4 = 2 − 2t/3 folgt t = 2,4 Stunden = 144 Minuten. Dann ist A noch 40 % lang, B noch 20 %.' },
    ],
  },
  // ---------------------------------------------------------------- 4
  {
    id: 'schaetz-mal', title: 'Schätz mal!', topic: 'Zahlen & Wetten', icon: '🎯', color: GO, mode: 'estimate', kind: 'tile', football: false,
    blurb: 'Erst schätzt jeder geheim. Dann sehen alle die Tipps – und du setzt Punkte auf die Schätzung, der du am meisten vertraust.',
    tasks: [
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Kilometer beträgt die Luftlinie zwischen München und Reykjavik?', unit: 'km', answer: 2680,
        explain: 'München–Reykjavik sind rund 2.680 km Luftlinie – weniger als München–Moskau (rund 2.800 km).' },
      { mode: 'estimate', seconds: 50, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Fußballfelder (105 × 68 m) passen auf die Fläche des Saarlands (rund 2.570 km²)?', unit: 'Fußballfelder', answer: 360000,
        explain: 'Ein Feld hat 7.140 m². Das Saarland hat rund 2.570.000.000 m² – das sind etwa 360.000 Fußballfelder.' },
    ],
  },
  // ---------------------------------------------------------------- 5
  {
    id: 'alles-im-blick', title: 'Alles im Blick', topic: 'Beobachtung', icon: '👁️', color: CY, mode: 'glitch', kind: 'tile', football: false,
    blurb: 'Merk dir das Bild auf dem Fernseher. Danach hat sich etwas verändert – tippe auf dem Handy genau auf die Stelle!',
    tasks: [
      { mode: 'glitch', scene: 'timetable1', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Abfahrtstafel!', prompt: 'Was hat sich geändert? Tippe darauf.',
        explain: 'Der Zug nach Dresden fährt jetzt von Gleis 12 statt Gleis 7.' },
      { mode: 'glitch', scene: 'menu1', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Speisekarte!', prompt: 'Welcher Preis wurde verändert?',
        explain: 'Das Schnitzel kostete vorher 14,90 €, jetzt steht dort 19,40 €.' },
      { mode: 'glitch', scene: 'receipt1', viewSeconds: 12, seconds: 30, points: 250, viewPrompt: 'Merk dir den Kassenzettel!', prompt: 'Welcher Preis wurde verändert? (Die Summe unten stimmt nur mit dem echten Preis.)',
        explain: 'Die Butter kostete vorher 2,19 €, jetzt steht dort 2,91 € – nur mit 2,19 € ergibt sich die Summe von 13,40 €.' },
      { mode: 'glitch', scene: 'grid1', viewSeconds: 5, seconds: 30, points: 250, viewPrompt: 'Gleich wird es knifflig …', prompt: 'Eine Uhr geht anders als alle anderen. Tippe darauf!',
        explain: 'Zwischen 40 Uhren, die 1 Uhr zeigen, versteckte sich eine, die 1:30 Uhr zeigt.' },
    ],
  },
  // ---------------------------------------------------------------- 6
  {
    id: 'damals-wars', title: 'Damals war’s', topic: 'Pop, Technik & Zocken', icon: '📼', color: PK, mode: 'rank', kind: 'tile', football: false,
    blurb: 'Fünf Begriffe, fünf Plätze: Du siehst sie nacheinander und musst SOFORT einsortieren. Endgültig!',
    tasks: [
      { mode: 'rank', secondsPerItem: 12, points: 340, prompt: 'Was war zuerst da? – ältestes Ereignis zuerst', topLabel: 'am längsten her', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Erster Tatort im Fernsehen', value: '1970' }, { text: 'Fall der Berliner Mauer', value: '1989' }, { text: 'Erster Harry-Potter-Roman erscheint', value: '1997' },
          { text: 'Euro-Bargeld wird eingeführt', value: '2002' }, { text: 'Erstes iPhone kommt auf den Markt', value: '2007' },
        ], order: [3, 0, 4, 2, 1],
        explain: 'Tatort (1970), Mauerfall (1989), Harry Potter (1997), Euro-Bargeld (2002), iPhone (2007).' },
      { mode: 'rank', secondsPerItem: 12, points: 330, prompt: 'Zocker-Zeitreise – welches Spiel bzw. welche Konsole kam zuerst?', topLabel: 'am längsten her', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Pac-Man', value: '1980' }, { text: 'Super Mario Bros.', value: '1985' }, { text: 'Pokémon Rot/Grün (Japan)', value: '1996' },
          { text: 'Die Sims', value: '2000' }, { text: 'Nintendo Wii', value: '2006' },
        ], order: [2, 4, 0, 3, 1],
        explain: 'Pac-Man (1980), Super Mario Bros. (1985), Pokémon (1996), Die Sims (2000) und die Wii (2006).' },
      { mode: 'rank', secondsPerItem: 12, points: 330, prompt: 'Erfindungen – wann wurden sie patentiert bzw. entdeckt? Älteste zuerst', topLabel: 'älteste', bottomLabel: 'jüngste',
        items: [
          { text: 'Telefon (Patent Bell)', value: '1876' }, { text: 'Benz Patent-Motorwagen (Patent)', value: '1886' }, { text: 'Entdeckung des Penicillins', value: '1928' },
          { text: 'Transistor', value: '1947' }, { text: 'Erste SMS wird verschickt', value: '1992' },
        ], order: [2, 4, 1, 3, 0],
        explain: 'Telefon (1876), Motorwagen (1886), Penicillin (1928), Transistor (1947), SMS (1992).' },
    ],
  },
  // ---------------------------------------------------------------- 7
  {
    id: 'halbwissen', title: 'Gefährliches Halbwissen', topic: 'Zahlen & Fakten', icon: '🎲', color: OR, mode: 'estimate', kind: 'tile', football: false,
    blurb: 'Erst schätzt jeder geheim. Dann sehen alle die Tipps – und du setzt Punkte auf die Schätzung, der du am meisten vertraust.',
    tasks: [
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Sekunden braucht das Licht von der Sonne bis zur Erde?', unit: 'Sekunden', answer: 499,
        explain: 'Sonnenlicht ist rund 8 Minuten und 19 Sekunden unterwegs – also etwa 499 Sekunden. Die Sonne, die du siehst, ist 8 Minuten alt.' },
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Bundesligaspiele hat Karl-Heinz Körbel (Eintracht Frankfurt) absolviert – bis heute Rekord?', unit: 'Spiele', answer: 602,
        explain: 'Karl-Heinz Körbel bestritt zwischen 1972 und 1991 genau 602 Bundesligaspiele – alle für die Eintracht.' },
    ],
  },
  // ---------------------------------------------------------------- 8
  {
    id: 'auswaertsspiel', title: 'Auswärtsspiel', topic: 'Fußball-Orte', icon: '🏟️', color: BL, mode: 'geo', kind: 'tile', football: true,
    blurb: 'Setze deinen Pin auf der Karte. Je näher, desto besser – gewertet wird die Platzierung.',
    tasks: [
      { mode: 'geo', map: 'germany', seconds: 30, points: 250, prompt: 'Wo liegt die Heimat des 1. FC Heidenheim (Voith-Arena)?',
        answer: { lat: 48.676, lon: 10.152, label: 'Heidenheim an der Brenz' }, explain: 'Heidenheim an der Brenz liegt auf der Schwäbischen Alb in Baden-Württemberg.' },
      { mode: 'geo', map: 'germany', seconds: 30, points: 250, prompt: 'Wo steht die „Alte Försterei“, das Stadion von Union Berlin?',
        answer: { lat: 52.457, lon: 13.568, label: 'Berlin-Köpenick' }, explain: 'Die Alte Försterei liegt im Berliner Stadtteil Köpenick, mitten im Wald an der Spree.' },
      { mode: 'geo', map: 'europe', seconds: 35, points: 250, prompt: 'Wo spielt Bodø/Glimt? Der Verein sitzt nördlich des Polarkreises.',
        answer: { lat: 67.2804, lon: 14.4049, label: 'Bodø, Norwegen' }, explain: 'Bodø liegt in Nordnorwegen, etwa 70 km nördlich des Polarkreises – einer der nördlichsten Profi-Standorte Europas.' },
      { mode: 'geo', map: 'world', seconds: 40, points: 250, prompt: 'Wo liegt „La Bombonera“, das Stadion der Boca Juniors?',
        answer: { lat: -34.6356, lon: -58.3647, label: 'Buenos Aires, Argentinien' }, explain: 'La Bombonera steht im Hafenviertel La Boca in Buenos Aires.' },
    ],
  },
  // ---------------------------------------------------------------- 9
  {
    id: 'taeuschend-echt', title: 'Täuschend echt', topic: 'Fälschungen entlarven', icon: '🕵️', color: RD, mode: 'glitch', kind: 'tile', football: true,
    blurb: 'Merk dir das Bild auf dem Fernseher. Danach hat sich etwas verändert – tippe auf dem Handy genau auf die Stelle!',
    tasks: [
      { mode: 'glitch', scene: 'market1', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Marktwerte! (alle Daten fiktiv)', prompt: 'Welcher Wert wurde gefälscht? Tippe darauf.',
        explain: 'Der Marktwert des dritten Spielers wurde von 32,5 auf 28,0 Mio. € geändert.' },
      { mode: 'glitch', scene: 'board1', viewSeconds: 10, seconds: 25, points: 250, viewPrompt: 'Merk dir die Ergebnisse! (alle Spiele fiktiv)', prompt: 'Welches Ergebnis wurde verändert?',
        explain: 'Beim Spiel Dynamo Süd – Borussia Ost stand vorher 1 : 4, jetzt 4 : 1.' },
      { mode: 'glitch', scene: 'pitch1', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Aufstellung!', prompt: 'Welcher Spieler hat sich bewegt?',
        explain: 'Ein blauer Spieler (rechts unten) stand vorher deutlich weiter oben auf dem Feld.' },
      { mode: 'glitch', scene: 'pitch2', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Szene!', prompt: 'Was hat sich verändert? Tippe auf EINE veränderte Stelle!',
        explain: 'Der Ball wurde verschoben und ein rotes Männchen ist verschwunden. Beide Stellen zählen.' },
    ],
  },
  // ================================================================ ÜBERRASCHUNG
  {
    id: 'einzigartig', title: 'EINZIGARTIG', topic: 'Überraschungsrunde', icon: '✨', color: PK, mode: 'unique', kind: 'surprise', football: false,
    blurb: 'Nenne eine gültige Antwort – aber bloß keine, die auch ein anderer nennt! Einzigartige Antworten bringen die meisten Punkte, doppelte nur wenige.',
    tasks: [
      { mode: 'unique', seconds: 50, pointsUnique: 500, pointsShared: 150, placeholder: 'Land mit S …',
        prompt: 'Nenne einen Staat in Europa, der Mitglied der UNO ist und dessen Name mit „S“ beginnt.',
        valid: [
          { name: 'Schweden', variants: ['Sweden'] }, { name: 'Schweiz', variants: ['Switzerland', 'Suisse'] }, { name: 'Spanien', variants: ['Spain', 'Espana'] },
          { name: 'Serbien', variants: ['Serbia'] }, { name: 'Slowakei', variants: ['Slovakia', 'Slowakische Republik'] }, { name: 'Slowenien', variants: ['Slovenia'] },
          { name: 'San Marino', variants: [] },
        ],
        explain: 'Gültig (UNO-Mitglieder): Schweden, Schweiz, Spanien, Serbien, Slowakei, Slowenien und San Marino. Schottland ist kein eigener UNO-Staat.' },
      { mode: 'unique', seconds: 50, pointsUnique: 500, pointsShared: 150, placeholder: 'Zwerg …',
        prompt: 'Nenne einen der sieben Zwerge aus „Schneewittchen“ (Disney-Film, deutsche Namen).',
        valid: [
          { name: 'Chef', variants: [] }, { name: 'Happy', variants: [] }, { name: 'Hatschi', variants: [] }, { name: 'Brummbär', variants: ['Brummbaer'] },
          { name: 'Schlafmütz', variants: ['Schlafmütze', 'Schlafmuetz'] }, { name: 'Pummel', variants: [] }, { name: 'Seppl', variants: [] },
        ],
        explain: 'Die sieben Zwerge: Chef, Happy, Hatschi, Brummbär, Schlafmütz, Pummel und Seppl.' },
    ],
  },
  // ================================================================ FINALE
  {
    id: 'final-lock', title: 'FINAL LOCK', topic: 'Das große Finale', icon: '🔒', color: GO, mode: 'glitch', kind: 'final', football: false,
    blurb: 'Drei Aufgaben, 2.000 Punkte, die Rangliste bleibt verborgen. Erst bei der Siegerehrung zeigt sich, wer wirklich vorne liegt.',
    tasks: [
      { mode: 'glitch', scene: 'table1', viewSeconds: 20, seconds: 60, points: 500, viewPrompt: 'Die Tabelle stimmt – noch. Prägt sie euch ein!', prompt: 'Eine Punktzahl wurde gefälscht! Tipp: In jeder Zeile gilt Punkte = 3 × Siege + Unentschieden.',
        explain: 'Der Tabellenvierte hat 7 Siege und 3 Unentschieden – das sind 24 Punkte, nicht 26.' },
      { mode: 'rank', secondsPerItem: 16, points: 500, prompt: 'Luftlinie ab Berlin – die nächste Stadt zuerst', topLabel: 'am nächsten', bottomLabel: 'am weitesten',
        items: [
          { text: 'Athen', value: 'ca. 1.800 km' }, { text: 'Lissabon', value: 'ca. 2.310 km' }, { text: 'Reykjavik', value: 'ca. 2.390 km' },
          { text: 'Kairo', value: 'ca. 2.890 km' }, { text: 'Dubai', value: 'ca. 4.630 km' },
        ], order: [2, 4, 0, 1, 3],
        explain: 'Von Berlin aus: Athen, Lissabon (2.310 km), Reykjavik (2.390 km – nur 80 km weiter!), Kairo und Dubai.' },
      { mode: 'estimate', seconds: 45, betSeconds: 35, points: 500, bets: [0, 250, 500], prompt: 'Wie viele Tore fielen insgesamt bei der Fußball-WM 2014 in Brasilien (64 Spiele)?', unit: 'Tore', answer: 171,
        explain: 'Bei der WM 2014 fielen 171 Tore – damals ein Rekord (bis die WM 2022 mit 172 knapp übertraf).' },
    ],
  },
];
