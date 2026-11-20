// Paket „Neue Spielmodi – Testpaket“: PIXELPANIK, DUELL DER DEPPEN, DIE ARENA, TONSPUR, ZEITSPRUNG, PANIK, HOCHSTAPLER (je 3 spielbare Aufgaben).
// Eigenes Paket – bestehende Pakete (Reus-Pakete, „Neue Spiele – Testlabor“) bleiben unverändert. Medien: siehe content/media.generated.ts.
import type { ShowStep, TaskDef, McQuestion } from '../shared/types';
import type { SeedShow } from '../server/content';
import { COLORS as C, type PoolQuestion } from './show';
import { SEED_SHOW_B44K } from './bestof3';
import { PIXEL_MEDIA, AUDIO_MEDIA } from './media.generated';

const Q = (topic: string, id: string, task: TaskDef): PoolQuestion => ({ id, topic, task });
const mc = (q: string, options: string[], correct: number): McQuestion => ({ q, options, correct });

const pixel = (id: string, motif: string, answer: string, accept: string[], explain: string) => Q('Bilderrätsel', id, { mode: 'pixel', prompt: 'Was ist auf dem Bild zu sehen?', answer, accept, levels: PIXEL_MEDIA[motif], levelSeconds: 6, points: 300, explain });
const duel = (id: string, topic: string, prompt: string, questions: McQuestion[], explain: string) => Q(topic, id, { mode: 'duel', prompt, questions, seconds: 20, points: 250, explain });
const arena = (id: string, topic: string, prompt: string, questions: McQuestion[], explain: string) => Q(topic, id, { mode: 'arena', prompt, questions, seconds: 20, points: 300, explain });
const sound = (id: string, key: string, answer: string, accept: string[], hint: string, explain: string) => Q('Geräusche', id, { mode: 'sound', prompt: 'Was hörst du?', answer, accept, audio: AUDIO_MEDIA[key].a1, audio2: AUDIO_MEDIA[key].a2, hint, playSeconds: 15, points: 300, explain });
const tl = (id: string, topic: string, prompt: string, anchors: [number, string][], answerYear: number, answerLabel: string, explain: string) => Q(topic, id, { mode: 'timeline', prompt, anchors: anchors.map(([year, label]) => ({ year, label })), answerYear, answerLabel, seconds: 40, points: 250, explain });
const panic = (id: string, prompt: string, code: string, clues: string[], explain: string) => Q('Teamrätsel', id, { mode: 'panic', prompt, code, clues, seconds: 90, points: 200, explain });
const imp = (id: string, topic: string, word: string, accept: string[], explain: string) => Q('Hochstapler', id, { mode: 'impostor', prompt: topic, word, accept, seconds: 40, voteSeconds: 45, points: 300, explain });

export const SPIELMODI_POOL: PoolQuestion[] = [
  pixel('nm-pix-1', 'pix-pokal', 'Pokal', ['Trophäe', 'Siegerpokal', 'Meisterpokal', 'WM-Pokal', 'Cup'], 'Ein goldener Pokal – das Ziel jedes Abends.'),
  pixel('nm-pix-2', 'pix-tor', 'Tor', ['Fußballtor', 'Fußball-Tor', 'Goal', 'Netz', 'Torgehäuse'], 'Ein Fußballtor mit Netz.'),
  pixel('nm-pix-3', 'pix-statue', 'Freiheitsstatue', ['Statue of Liberty', 'Lady Liberty', 'Freiheitsstatue New York', 'Liberty Statue'], 'Die Freiheitsstatue in New York – ein Geschenk Frankreichs von 1886.'),
  duel('nm-duel-1', 'Fußball & Allgemeinwissen', 'WER KENNT SICH BESSER AUS? – Fußballgeschichte', [
    mc('Wie viele WM-Titel hat Brasilien bis einschließlich 2022 gewonnen?', ['3', '4', '5', '6'], 2),
    mc('In welchem Land fand die Fußball-WM 2010 statt?', ['Brasilien', 'Südafrika', 'Katar', 'Japan'], 1),
    mc('Gegen wen verlor Borussia Dortmund das Champions-League-Finale 2013 in Wembley?', ['FC Chelsea', 'Real Madrid', 'FC Bayern München', 'Juventus Turin'], 2)],
    'Fünf Titel für Brasilien, Südafrika 2010 und das reine deutsche Finale 2013 in Wembley.'),
  duel('nm-duel-2', 'Popkultur & Wissen', 'WER KENNT SICH BESSER AUS? – Pop & Planet', [
    mc('Welche Band sang „Bohemian Rhapsody“?', ['Queen', 'Genesis', 'Pink Floyd', 'The Who'], 0),
    mc('Wie heißt die Hauptstadt von Australien?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2),
    mc('Wie viele Herzen hat ein Oktopus?', ['1', '2', '3', '4'], 2)],
    'Queen, Canberra (nicht Sydney!) und drei Herzen.'),
  duel('nm-duel-3', 'Allgemeinwissen', 'WER KENNT SICH BESSER AUS? – Schlaukopf-Duell', [
    mc('Welches ist das kleinste Land der Welt (nach Fläche)?', ['Monaco', 'Vatikanstadt', 'San Marino', 'Liechtenstein'], 1),
    mc('Welches Element hat das chemische Symbol „Fe“?', ['Fluor', 'Eisen', 'Francium', 'Fermium'], 1),
    mc('Was ist die Hauptstadt der Türkei?', ['Istanbul', 'Izmir', 'Ankara', 'Bursa'], 2)],
    'Vatikanstadt, Eisen und Ankara – nicht Istanbul.'),
  arena('nm-arena-1', 'Champions League 2004', 'DIE ARENA – Champions League 2004', [
    mc('Welcher Verein gewann 2004 die Champions League?', ['AS Monaco', 'FC Porto', 'Deportivo La Coruña', 'FC Chelsea'], 1),
    mc('Wer trainierte den FC Porto beim Sieg 2004?', ['Carlo Ancelotti', 'Luiz Felipe Scolari', 'José Mourinho', 'Didier Deschamps'], 2),
    mc('In welcher deutschen Stadt fand das Finale 2004 statt?', ['München', 'Gelsenkirchen', 'Dortmund', 'Hamburg'], 1)],
    'FC Porto unter José Mourinho gewann 3:0 gegen Monaco – im Stadion von Gelsenkirchen.'),
  arena('nm-arena-2', 'Wissen', 'DIE ARENA – Wissens-Gauntlet', [
    mc('Wie viele Zähne hat ein erwachsener Mensch normalerweise?', ['28', '30', '32', '36'], 2),
    mc('Welcher Planet unseres Sonnensystems hat die meisten bekannten Monde?', ['Jupiter', 'Saturn', 'Uranus', 'Neptun'], 1),
    mc('Welcher Fluss ist der längste Europas?', ['Donau', 'Rhein', 'Wolga', 'Dnepr'], 2)],
    '32 Zähne (mit Weisheitszähnen), Saturn und die Wolga.'),
  arena('nm-arena-3', 'Film', 'DIE ARENA – Kino-Gauntlet', [
    mc('Wer spielt Captain Jack Sparrow in „Fluch der Karibik“?', ['Orlando Bloom', 'Johnny Depp', 'Brad Pitt', 'Geoffrey Rush'], 1),
    mc('Welcher Film gewann 1998 elf Oscars?', ['Titanic', 'Gladiator', 'Forrest Gump', 'Avatar'], 0),
    mc('Wer führte bei „Pulp Fiction“ Regie?', ['Martin Scorsese', 'Quentin Tarantino', 'Guy Ritchie', 'David Fincher'], 1)],
    'Johnny Depp, Titanic und Quentin Tarantino.'),
  sound('nm-sound-1', 'snd-pfiff', 'Schiedsrichterpfiff', ['Pfiff', 'Trillerpfeife', 'Schiri-Pfiff', 'Pfeife', 'Schiedsrichterpfeife', 'Schiripfiff'], 'Du hörst ihn in fast jedem Fußballspiel.', 'Ein doppelter Pfiff der Schiedsrichterpfeife (selbst erzeugte Tonaufnahme).'),
  sound('nm-sound-2', 'snd-modem', 'Modem', ['Einwahl', 'Dial-up', 'Modem-Einwahl', 'Einwahlmodem', 'analoges Modem', 'Telefonmodem', 'Internet-Einwahl'], 'So klang das Internet in den 90ern.', 'Die Einwahl eines analogen Modems – als das Internet noch pfiff und kreischte.'),
  sound('nm-sound-3', 'snd-jubel', 'Torjubel', ['Jubel', 'Stadionjubel', 'Stadion', 'Fans', 'Publikum', 'Menschenmenge', 'Zuschauer', 'Torjubel im Stadion'], 'Gleich nach dem Tor ist es am lautesten.', 'Eine Stadionkulisse beim Torjubel mit Hupe (selbst erzeugt).'),
  tl('nm-time-1', 'Technik & Netz', 'Wann wurde YouTube gegründet?', [[1990, 'Deutsche Wiedervereinigung'], [1998, 'Google wird gegründet'], [2006, 'Fußball-WM in Deutschland'], [2014, 'Deutschland wird Weltmeister']], 2005, 'YouTube gegründet', 'YouTube wurde im Februar 2005 gegründet – ein Jahr vor dem „Sommermärchen“.'),
  tl('nm-time-2', 'Technik', 'Wann kam das erste iPhone auf den Markt?', [[1989, 'Mauerfall'], [1998, 'Google wird gegründet'], [2002, 'Euro-Bargeld'], [2014, 'Deutschland wird Weltmeister']], 2007, 'Erstes iPhone', 'Das erste iPhone erschien im Juni 2007.'),
  tl('nm-time-3', 'Fußballgeschichte', 'Wann startete die erste Bundesliga-Saison?', [[1954, 'Wunder von Bern (WM-Titel)'], [1974, 'WM-Titel in München'], [1990, 'WM-Titel in Rom'], [2014, 'WM-Titel in Rio']], 1963, 'Erste Bundesliga-Saison', 'Die Bundesliga startete mit der Saison 1963/64.'),
  tl('nm-time-4', 'Fußballgeschichte', 'Wann wurde Griechenland überraschend Europameister?', [[1990, 'WM-Titel in Rom'], [1996, 'Deutschland wird Europameister'], [2006, 'Fußball-WM in Deutschland'], [2014, 'WM-Titel in Rio']], 2004, 'Griechenland Europameister', 'Griechenland gewann 2004 in Portugal die EM – gegen alle Prognosen.'),
  panic('nm-panic-1', 'Tresor „Brasilien 7:1“', '724', [
    'Ziffer 1: So viele Tore schoss Deutschland 2014 im WM-Halbfinale gegen Brasilien.',
    'Ziffer 2: Die Hälfte der Eckfahnen auf einem Fußballfeld.',
    'Ziffer 3: Die Anzahl der Eckfahnen auf einem Fußballfeld.',
    'Der Code besteht aus Ziffer 1, 2 und 3 – genau in dieser Reihenfolge.'], 'Code 7-2-4: 7 Tore, 4 Eckfahnen halbiert = 2, 4 Eckfahnen.'),
  panic('nm-panic-2', 'Tresor „Elfmeter“', '915', [
    'Ziffer 1: Die Quersumme der regulären Spielzeit in Minuten (90).',
    'Ziffer 2: Die Anzahl der Torhüter eines Teams, die gleichzeitig auf dem Feld stehen.',
    'Ziffer 3: So viele Schützen hat jedes Team zu Beginn eines Elfmeterschießens.',
    'Die Ziffern 1, 2 und 3 ergeben den Code – in dieser Reihenfolge.'], 'Code 9-1-5: Quersumme von 90 = 9, ein Torwart, fünf Schützen.'),
  panic('nm-panic-3', 'Tresor „Spielfeld“', '362', [
    'Ziffer 1: So viele Punkte gibt es in der Bundesliga für einen Sieg.',
    'Ziffer 2: So viele Seiten hat ein normaler Spielwürfel.',
    'Ziffer 3: So viele Halbzeiten hat ein Fußballspiel.',
    'Reihenfolge im Code: Ziffer 1, Ziffer 2, Ziffer 3.'], 'Code 3-6-2: drei Punkte, sechs Würfelseiten, zwei Halbzeiten.'),
  imp('nm-imp-1', 'Fußball', 'Abseits', ['Abseitsfalle', 'Abseitsstellung'], 'Wort: Abseits. Der Hochstapler kannte nur das Thema „Fußball“.'),
  imp('nm-imp-2', 'Essen', 'Currywurst', ['Curry Wurst', 'Currywürste'], 'Wort: Currywurst. Der Hochstapler kannte nur das Thema „Essen“.'),
  imp('nm-imp-3', 'Urlaub', 'Campingplatz', ['Camping', 'Zeltplatz'], 'Wort: Campingplatz. Der Hochstapler kannte nur das Thema „Urlaub“.'),
];
const round = (id: string, title: string, icon: string, color: string, blurb: string, taskIds: string[]): SeedShow['rounds'][number] => ({ id, title, topic: title, icon, color, kind: 'tile', football: false, blurb, taskIds });
export const SPIELMODI_ROUNDS: SeedShow['rounds'] = [
  round('nm-r1', 'PIXELPANIK', '🟪', C.PU, 'Ein Bild wird Stufe für Stufe schärfer. Je früher du es erkennst, desto mehr Punkte.', ['nm-pix-1', 'nm-pix-2', 'nm-pix-3']),
  round('nm-r2', 'DUELL DER DEPPEN', '⚔️', C.PK, 'Zwei Spieler duellieren sich in drei Fragen – alle anderen tippen auf den Sieger.', ['nm-duel-1', 'nm-duel-2', 'nm-duel-3']),
  round('nm-r3', 'DIE ARENA', '🏟️', C.GO, 'Alle gleichzeitig: Wer falsch antwortet, scheidet aus. Wer alles überlebt, kassiert den Bonus.', ['nm-arena-1', 'nm-arena-2', 'nm-arena-3']),
  round('nm-r4', 'TONSPUR', '🎧', C.TE, 'Hört genau hin: Was ist das für ein Geräusch? Je früher richtig, desto mehr Punkte.', ['nm-sound-1', 'nm-sound-2', 'nm-sound-3']),
  round('nm-r5', 'ZEITSPRUNG', '⏳', C.CY, 'Vier Ereignisse stehen fest auf der Zeitleiste – ordne das gesuchte Ereignis richtig ein.', ['nm-time-1', 'nm-time-2', 'nm-time-3', 'nm-time-4']),
  round('nm-r6', 'PANIK', '🚨', C.GR, 'Teamspiel: Jeder kennt nur einen Teil der Lösung. Setzt den Code gemeinsam zusammen.', ['nm-panic-1', 'nm-panic-2', 'nm-panic-3']),
  round('nm-r7', 'HOCHSTAPLER', '🕵️', C.BL, 'Alle kennen das Wort – bis auf einen. Gebt Hinweise und enttarnt den Hochstapler.', ['nm-imp-1', 'nm-imp-2', 'nm-imp-3']),
];
const STEPS: ShowStep[] = [...SPIELMODI_ROUNDS.flatMap(r => [{ k: 'round' as const, cat: r.id }, { k: 'board' as const }]), { k: 'final', cat: 'b44-final-kk' }];
export const SEED_SHOW_SPIELMODI: SeedShow = {
  pack: { id: 'show-modes', name: 'Neue Spielmodi – Testpaket', description: 'Die sieben neuesten Spiele mit je drei spielbaren Aufgaben: PIXELPANIK, DUELL DER DEPPEN, DIE ARENA, TONSPUR, ZEITSPRUNG, PANIK, HOCHSTAPLER – dann KICKBASE-KONSENS.', rules: { ...SEED_SHOW_B44K.pack.rules!, tasksPerMode: 6 } },
  pool: SPIELMODI_POOL, rounds: SPIELMODI_ROUNDS, steps: STEPS,
};
