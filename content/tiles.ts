// Spielinhalte (Datenpakete). Alle Fakten wurden gegen gesicherte Standardquellen abgeglichen;
// unsichere oder zeitabhängige Zahlen (aktuelle Rekorde, laufende Saisons) wurden bewusst nicht verwendet.
import type { TileDef } from '../shared/types';

const PU = '#8b5cf6', BL = '#3b82f6', TE = '#14d9c0', GO = '#f5b82e', PK = '#ec4899', OR = '#fb923c', GR = '#22c55e', RD = '#ef4444', CY = '#38bdf8';

export const TILES: TileDef[] = [
  // ---------------------------------------------------------------- 1
  {
    id: 'geo-daneben', title: 'Geografisch daneben', topic: 'Weltkarte & Orte', icon: '🧭', color: TE, mode: 'geo', kind: 'tile', football: false,
    blurb: 'Setze deinen Pin auf der Karte. Je näher, desto besser – gewertet wird die Platzierung.',
    tasks: [
      { mode: 'geo', map: 'world', seconds: 40, points: 250, prompt: 'Wo liegt der Punkt auf dem Festland, der vom Meer am weitesten entfernt ist? (Eurasischer „Pol der Unzugänglichkeit“)',
        answer: { lat: 46.28, lon: 86.67, label: 'Nordwest-China (Xinjiang)' },
        explain: 'Der Punkt liegt in der Dzungarei in Xinjiang (Nordwest-China) – rund 2.600 km vom nächsten Meer entfernt.' },
      { mode: 'geo', map: 'world', seconds: 40, points: 250, prompt: 'Wo liegt die südlichste Hauptstadt der Welt?',
        answer: { lat: -41.2866, lon: 174.7756, label: 'Wellington, Neuseeland' },
        explain: 'Wellington (Neuseeland) liegt bei etwa 41° Süd und ist die südlichste Hauptstadt eines souveränen Staates.' },
      { mode: 'geo', map: 'europe', seconds: 40, points: 250, prompt: 'Wo liegt der nördlichste Punkt des europäischen FESTLANDS (nicht des Nordkaps auf der Insel Magerøya)?',
        answer: { lat: 71.134, lon: 27.654, label: 'Kinnarodden (Nordkinn), Norwegen' },
        explain: 'Das Nordkap liegt auf einer Insel. Der nördlichste Festlandpunkt Europas ist Kinnarodden auf der Halbinsel Nordkinn.' },
      { mode: 'geo', map: 'germany', seconds: 35, points: 250, prompt: 'Wo liegt – nach gängiger Berechnung – der geografische Mittelpunkt Deutschlands?',
        answer: { lat: 51.163, lon: 10.455, label: 'Niederdorla, Thüringen' },
        explain: 'Der Mittelpunkt wird meist bei Niederdorla (Vogtei) im Unstrut-Hainich-Kreis in Thüringen angegeben.' },
    ],
  },
  // ---------------------------------------------------------------- 2
  {
    id: 'koenig-fussball', title: 'König Fußball', topic: 'Bundesliga & Legenden', icon: '⚽', color: GR, mode: 'rank', kind: 'tile', football: true,
    blurb: 'Fünf Begriffe, fünf Plätze: Du siehst sie nacheinander und musst SOFORT einsortieren. Endgültig!',
    tasks: [
      { mode: 'rank', secondsPerItem: 12, points: 500, prompt: 'Die meisten Bundesliga-Tore aller Zeiten', topLabel: 'meiste Tore', bottomLabel: 'wenigste Tore',
        items: [
          { text: 'Gerd Müller', value: '365 Tore' }, { text: 'Robert Lewandowski', value: '312 Tore' }, { text: 'Klaus Fischer', value: '268 Tore' },
          { text: 'Jupp Heynckes', value: '220 Tore' }, { text: 'Manfred Burgsmüller', value: '213 Tore' },
        ], order: [3, 1, 4, 0, 2],
        explain: 'Gerd Müller (365) führt vor Lewandowski (312), Klaus Fischer (268), Jupp Heynckes (220) und Manfred Burgsmüller (213).' },
      { mode: 'rank', secondsPerItem: 12, points: 500, prompt: 'Gründungsjahr des Vereins – ältester zuerst', topLabel: 'ältester Verein', bottomLabel: 'jüngster Verein',
        items: [
          { text: 'VfB Stuttgart', value: '1893' }, { text: 'Werder Bremen', value: '1899' }, { text: 'FC Schalke 04', value: '1904' },
          { text: 'Borussia Dortmund', value: '1909' }, { text: '1. FC Köln', value: '1948' },
        ], order: [2, 4, 0, 3, 1],
        explain: 'Stuttgart (1893), Bremen (1899), Schalke (1904), Dortmund (1909) und der 1. FC Köln (1948, durch Fusion).' },
    ],
  },
  // ---------------------------------------------------------------- 3
  {
    id: 'kopfsalat', title: 'Kopfsalat', topic: 'Logik & Rätsel', icon: '🧩', color: PU, mode: 'codebreak', kind: 'tile', football: false,
    blurb: 'Knackt den Code! Du hast drei Versuche. Hinweise helfen – kosten aber Punkte.',
    tasks: [
      { mode: 'codebreak', input: 'number', seconds: 120, points: 300, prompt: 'Wie lautet die nächste Zahl der Folge?', display: '2 · 3 · 5 · 9 · 17 · 33 · ?',
        answers: ['65'], hints: ['Schau dir die Abstände zwischen den Zahlen an.', 'Die Abstände sind 1, 2, 4, 8, 16 …', 'Der nächste Abstand ist 32.'],
        explain: 'Die Differenzen verdoppeln sich: +1, +2, +4, +8, +16 und dann +32. Also 33 + 32 = 65.' },
      { mode: 'codebreak', input: 'number', seconds: 150, points: 300, prompt: 'Wie oft am Tag (24 Stunden) bilden Stunden- und Minutenzeiger einer Uhr genau einen rechten Winkel (90°)?',
        answers: ['44'], hints: ['Denk zuerst nur an 12 Stunden.', 'In 12 Stunden überholt der Minutenzeiger den Stundenzeiger 11-mal.', 'Zwischen zwei Überholungen gibt es genau zwei rechte Winkel.'],
        explain: 'In 12 Stunden gibt es 22 rechte Winkel (2 pro „Runde“ des Minutenzeigers gegenüber dem Stundenzeiger, 11 Runden). In 24 Stunden also 44.' },
      { mode: 'codebreak', input: 'number', seconds: 150, points: 400, prompt: 'Ein Frosch sitzt am Boden eines 10 m tiefen Brunnens. Tagsüber klettert er 3 m hoch, nachts rutscht er 2 m ab. An welchem Tag kommt er zum ersten Mal oben an?',
        answers: ['8'], hints: ['Pro vollem Tag samt Nacht kommt er netto 1 m weiter.', 'Aber: Wenn er oben ist, rutscht er nicht mehr ab.', 'Nach 7 Tagen (und Nächten) ist er auf 7 m. Was passiert am nächsten Tag?'],
        explain: 'Nach 7 Tagen und Nächten ist er bei 7 m. Am 8. Tag klettert er 3 m hoch und erreicht 10 m – der Rand ist erreicht, bevor die Nacht kommt.' },
    ],
  },
  // ---------------------------------------------------------------- 4
  {
    id: 'schaetz-mal', title: 'Schätz mal!', topic: 'Zahlen & Wetten', icon: '🎯', color: GO, mode: 'estimate', kind: 'tile', football: false,
    blurb: 'Erst schätzt jeder geheim. Dann sehen alle die Tipps – und du setzt Punkte auf die Schätzung, der du am meisten vertraust.',
    tasks: [
      { mode: 'estimate', seconds: 35, betSeconds: 25, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Jahre dauerte der „Hundertjährige Krieg“ zwischen England und Frankreich (1337–1453)?', unit: 'Jahre', answer: 116,
        explain: 'Von 1337 bis 1453 sind es 116 Jahre – der Krieg war also sogar länger als hundert Jahre.' },
      { mode: 'estimate', seconds: 35, betSeconds: 25, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Kilometer beträgt die Luftlinie zwischen Berlin und Tokio?', unit: 'km', answer: 8916,
        explain: 'Die Großkreisentfernung Berlin–Tokio beträgt rund 8.916 km.' },
    ],
  },
  // ---------------------------------------------------------------- 5
  {
    id: 'alles-im-blick', title: 'Alles im Blick', topic: 'Beobachtung', icon: '👁️', color: CY, mode: 'glitch', kind: 'tile', football: false,
    blurb: 'Merk dir das Bild auf dem Fernseher. Danach hat sich etwas verändert – tippe auf dem Handy genau auf die Stelle!',
    tasks: [
      { mode: 'glitch', scene: 'timetable1', viewSeconds: 12, seconds: 25, points: 300, viewPrompt: 'Merk dir die Abfahrtstafel!', prompt: 'Was hat sich geändert? Tippe darauf.',
        explain: 'Der Zug nach Dresden fährt jetzt von Gleis 12 statt Gleis 7.' },
      { mode: 'glitch', scene: 'receipt1', viewSeconds: 12, seconds: 25, points: 300, viewPrompt: 'Merk dir den Kassenzettel!', prompt: 'Welcher Preis wurde verändert?',
        explain: 'Die Butter kostete vorher 2,19 €, jetzt steht dort 2,91 € – die Summe (13,40 €) stimmte nur mit dem alten Preis.' },
      { mode: 'glitch', scene: 'grid1', viewSeconds: 6, seconds: 25, points: 400, viewPrompt: 'Schau genau hin!', prompt: 'Welches Obst passt nicht dazu?',
        explain: 'Zwischen lauter Äpfeln hat sich eine Tomate versteckt – botanisch eine Beere, aber kein Apfel.' },
    ],
  },
  // ---------------------------------------------------------------- 6
  {
    id: 'damals-wars', title: 'Damals war’s', topic: 'Geschichte & Technik', icon: '📼', color: PK, mode: 'rank', kind: 'tile', football: false,
    blurb: 'Fünf Begriffe, fünf Plätze: Du siehst sie nacheinander und musst SOFORT einsortieren. Endgültig!',
    tasks: [
      { mode: 'rank', secondsPerItem: 12, points: 500, prompt: 'Was war zuerst da? – ältestes Ereignis zuerst', topLabel: 'am längsten her', bottomLabel: 'am jüngsten',
        items: [
          { text: 'Erster Tatort im Fernsehen', value: '1970' }, { text: 'Fall der Berliner Mauer', value: '1989' }, { text: 'Erster Harry-Potter-Roman erscheint', value: '1997' },
          { text: 'Euro-Bargeld wird eingeführt', value: '2002' }, { text: 'Erstes iPhone kommt auf den Markt', value: '2007' },
        ], order: [3, 0, 4, 2, 1],
        explain: 'Tatort (1970), Mauerfall (1989), Harry Potter (1997), Euro-Bargeld (2002), iPhone (2007).' },
      { mode: 'rank', secondsPerItem: 12, points: 500, prompt: 'Erfindungen – wann wurden sie patentiert bzw. entdeckt? Älteste zuerst', topLabel: 'älteste', bottomLabel: 'jüngste',
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
      { mode: 'estimate', seconds: 35, betSeconds: 25, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Bundesligaspiele hat Karl-Heinz Körbel (Eintracht Frankfurt) absolviert – bis heute Rekord?', unit: 'Spiele', answer: 602,
        explain: 'Karl-Heinz Körbel bestritt zwischen 1972 und 1991 genau 602 Bundesligaspiele – alle für die Eintracht.' },
      { mode: 'estimate', seconds: 35, betSeconds: 25, points: 300, bets: [0, 100, 200], prompt: 'Wie viele Staaten sind Mitglied der Vereinten Nationen?', unit: 'Staaten', answer: 193,
        explain: 'Die UN hat 193 Mitgliedstaaten (Südsudan kam 2011 als 193. dazu).' },
    ],
  },
  // ---------------------------------------------------------------- 8
  {
    id: 'auswaertsspiel', title: 'Auswärtsspiel', topic: 'Fußball-Orte', icon: '🏟️', color: BL, mode: 'geo', kind: 'tile', football: true,
    blurb: 'Setze deinen Pin auf der Karte. Je näher, desto besser – gewertet wird die Platzierung.',
    tasks: [
      { mode: 'geo', map: 'germany', seconds: 35, points: 250, prompt: 'Wo liegt die Heimat des 1. FC Heidenheim (Voith-Arena)?',
        answer: { lat: 48.676, lon: 10.152, label: 'Heidenheim an der Brenz' }, explain: 'Heidenheim an der Brenz liegt auf der Schwäbischen Alb in Baden-Württemberg.' },
      { mode: 'geo', map: 'germany', seconds: 35, points: 250, prompt: 'Wo steht die „Alte Försterei“, das Stadion von Union Berlin?',
        answer: { lat: 52.457, lon: 13.568, label: 'Berlin-Köpenick' }, explain: 'Die Alte Försterei liegt im Berliner Stadtteil Köpenick, mitten im Wald an der Spree.' },
      { mode: 'geo', map: 'europe', seconds: 40, points: 250, prompt: 'Wo liegt der Celtic Park, das Stadion von Celtic?',
        answer: { lat: 55.8497, lon: -4.2055, label: 'Glasgow, Schottland' }, explain: 'Der Celtic Park steht im Osten von Glasgow.' },
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
        explain: 'Ein blauer Spieler (rechts unten) stand vorher weiter oben auf dem Feld.' },
      { mode: 'glitch', scene: 'pitch2', viewSeconds: 12, seconds: 25, points: 250, viewPrompt: 'Merk dir die Szene!', prompt: 'Was hat sich verändert? Tippe auf EINE veränderte Stelle!',
        explain: 'Der Ball wurde verschoben und ein rotes Männchen ist verschwunden. Beide Stellen zählen.' },
    ],
  },
  // ================================================================ ÜBERRASCHUNG
  {
    id: 'einzigartig', title: 'EINZIGARTIG', topic: 'Überraschungsrunde', icon: '✨', color: GO, mode: 'unique', kind: 'surprise', football: false,
    blurb: 'Nenne eine gültige Antwort – aber bloß keine, die auch ein anderer nennt! Einzigartige Antworten bringen die meisten Punkte, doppelte nur wenige.',
    tasks: [
      { mode: 'unique', seconds: 40, pointsUnique: 500, pointsShared: 150, placeholder: 'Land mit S …',
        prompt: 'Nenne ein Land in Europa, dessen Name mit „S“ beginnt.',
        valid: [
          { name: 'Schweden', variants: ['Sweden'] }, { name: 'Schweiz', variants: ['Switzerland', 'Suisse'] }, { name: 'Spanien', variants: ['Spain', 'Espana'] },
          { name: 'Serbien', variants: ['Serbia'] }, { name: 'Slowakei', variants: ['Slovakia', 'Slowakische Republik'] }, { name: 'Slowenien', variants: ['Slovenia'] },
          { name: 'San Marino', variants: [] },
        ],
        explain: 'Gültig: Schweden, Schweiz, Spanien, Serbien, Slowakei, Slowenien und San Marino.' },
      { mode: 'unique', seconds: 45, pointsUnique: 500, pointsShared: 150, placeholder: 'Nachname eines Spielers …',
        prompt: 'Nenne einen Spieler aus dem Kader Frankreichs bei der WM 2018 (Weltmeister).',
        valid: [
          { name: 'Hugo Lloris', variants: ['Lloris'] }, { name: 'Steve Mandanda', variants: ['Mandanda'] }, { name: 'Alphonse Areola', variants: ['Areola'] },
          { name: 'Benjamin Pavard', variants: ['Pavard'] }, { name: 'Raphaël Varane', variants: ['Varane'] }, { name: 'Samuel Umtiti', variants: ['Umtiti'] },
          { name: 'Presnel Kimpembe', variants: ['Kimpembe'] }, { name: 'Lucas Hernandez', variants: ['Hernandez', 'Hernández', 'Lucas Hernández'] }, { name: 'Benjamin Mendy', variants: ['Mendy'] },
          { name: 'Djibril Sidibé', variants: ['Sidibe', 'Sidibé'] }, { name: 'Adil Rami', variants: ['Rami'] }, { name: 'N’Golo Kanté', variants: ['Kante', 'Kanté', 'NGolo Kante'] },
          { name: 'Paul Pogba', variants: ['Pogba'] }, { name: 'Blaise Matuidi', variants: ['Matuidi'] }, { name: 'Corentin Tolisso', variants: ['Tolisso'] },
          { name: 'Steven Nzonzi', variants: ['Nzonzi'] }, { name: 'Antoine Griezmann', variants: ['Griezmann', 'Grizmann'] }, { name: 'Kylian Mbappé', variants: ['Mbappe', 'Mbappé'] },
          { name: 'Olivier Giroud', variants: ['Giroud'] }, { name: 'Ousmane Dembélé', variants: ['Dembele', 'Dembélé'] }, { name: 'Nabil Fekir', variants: ['Fekir'] },
          { name: 'Thomas Lemar', variants: ['Lemar'] }, { name: 'Florian Thauvin', variants: ['Thauvin'] },
        ],
        explain: 'Frankreichs 23-Mann-Kader 2018: Lloris, Mandanda, Areola, Pavard, Varane, Umtiti, Kimpembe, Hernandez, Mendy, Sidibé, Rami, Kanté, Pogba, Matuidi, Tolisso, Nzonzi, Griezmann, Mbappé, Giroud, Dembélé, Fekir, Lemar, Thauvin.' },
    ],
  },
  // ================================================================ FINALE
  {
    id: 'final-lock', title: 'FINAL LOCK', topic: 'Das große Finale', icon: '🔒', color: GO, mode: 'glitch', kind: 'final', football: false,
    blurb: 'Drei Aufgaben, 2.000 Punkte, die Rangliste bleibt verborgen. Erst bei der Siegerehrung zeigt sich, wer wirklich vorne liegt.',
    tasks: [
      { mode: 'glitch', scene: 'grid3', viewSeconds: 5, seconds: 30, points: 500, viewPrompt: 'Alles verriegelt …', prompt: 'Ein Schloss ist offen! Tippe darauf.',
        explain: 'Zwischen lauter geschlossenen Schlössern war ein einziges geöffnet.' },
      { mode: 'rank', secondsPerItem: 14, points: 500, prompt: 'Einwohnerzahl der Länder – größtes Land zuerst', topLabel: 'meiste Einwohner', bottomLabel: 'wenigste Einwohner',
        items: [
          { text: 'Indonesien', value: 'ca. 280 Mio.' }, { text: 'Pakistan', value: 'ca. 245 Mio.' }, { text: 'Nigeria', value: 'ca. 225 Mio.' },
          { text: 'Brasilien', value: 'ca. 213 Mio.' }, { text: 'Bangladesch', value: 'ca. 173 Mio.' },
        ], order: [3, 1, 4, 0, 2],
        explain: 'Indonesien, Pakistan, Nigeria, Brasilien, Bangladesch – dicht beieinander, aber in dieser Reihenfolge (UN-Schätzungen).' },
      { mode: 'estimate', seconds: 40, betSeconds: 30, points: 500, bets: [0, 250, 500], prompt: 'Wie viele Tore fielen insgesamt bei der Fußball-WM 2014 in Brasilien (64 Spiele)?', unit: 'Tore', answer: 171,
        explain: 'Bei der WM 2014 fielen 171 Tore – damals ein Rekord (bis die WM 2022 mit 172 knapp übertraf).' },
    ],
  },
];
