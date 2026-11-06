// Gemeinsame Typen für Server, Inhalte und Client.

/** 'codebreak' ist ein Altmodus: wird nicht mehr angeboten, bestehende Inhalte/Pakete bleiben aber les- und spielbar. */
export type Mode = 'geo' | 'rank' | 'estimate' | 'glitch' | 'codebreak' | 'unique' | 'match' | 'link';
export type MapKind = 'world' | 'europe' | 'germany';

// ---------- Avatar ----------
export interface Avatar {
  face: number; // Gesichtsausdruck
  skin: number;
  hair: number; // Frisur
  hairColor: number;
  hat: number; // Kopfbedeckung
  shirt: number; // Trikot-Stil
  shirtColor: number;
  acc: number; // Accessoire
  bg: number; // Hintergrundfarbe
}
export const AVATAR_LIMITS: Record<keyof Avatar, number> = {
  face: 8, skin: 6, hair: 9, hairColor: 8, hat: 6, shirt: 5, shirtColor: 10, acc: 7, bg: 8,
};

// ---------- Inhalte ----------
export interface GeoTask {
  mode: 'geo';
  prompt: string;
  map: MapKind;
  answer: { lat: number; lon: number; label: string };
  seconds: number;
  points: number;
  explain: string;
}
export interface RankTask {
  mode: 'rank';
  prompt: string; // Kategorie / Kriterium
  topLabel: string; // z. B. "höchster Wert"
  bottomLabel: string;
  /** Begriffe in KORREKTER Reihenfolge (Platz 1 zuerst). Genau 5. */
  items: { text: string; value?: string }[];
  /** Reihenfolge, in der die Begriffe gezeigt werden (Indizes in items). */
  order: number[];
  secondsPerItem: number;
  /** Bedienvariante: 'sequence' (Standard, nacheinander) oder 'sort' (alle fünf sichtbar, sortieren). Paketregel rankVariant kann überschreiben. */
  variant?: 'sequence' | 'sort';
  points: number;
  explain: string;
}
export interface EstimateTask {
  mode: 'estimate';
  prompt: string;
  unit: string;
  answer: number;
  seconds: number;
  betSeconds: number;
  /** Maximale Punkte für die beste Schätzung. */
  points: number;
  /** Mögliche Einsätze. */
  bets: number[];
  explain: string;
}
/** Trefferzone in Szenenkoordinaten (1000×600). hw/hh = halbe Breite/Höhe der engen Box um das veränderte Objekt; r nur noch für alte Zonen ohne Box. */
export interface GlitchZone { x: number; y: number; r: number; hw?: number; hh?: number }
export interface GlitchTask {
  mode: 'glitch';
  prompt: string; // Suchauftrag (nach der Betrachtungsphase)
  viewPrompt: string; // Anweisung während der Betrachtungsphase
  scene: string; // Szenen-ID
  viewSeconds: number;
  seconds: number;
  points: number;
  explain: string;
  /** Optionale feste Zonen (sonst aus dem Unterschied der Szenen berechnet). */
  zones?: GlitchZone[];
}
export interface CodeTask {
  mode: 'codebreak';
  prompt: string;
  /** Optionale monospaced Darstellung (Raster, Folgen). */
  display?: string;
  input: 'text' | 'number';
  /** Akzeptierte Antworten (normalisiert verglichen). */
  answers: string[];
  hints: string[];
  seconds: number;
  points: number;
  explain: string;
}
export interface UniqueTask {
  mode: 'unique';
  prompt: string;
  /** Antwortliste ist vollständig: Unbekanntes wird automatisch als ungültig gewertet (z. B. Farben der Flagge) */
  closed?: boolean;
  placeholder: string;
  valid: { name: string; variants: string[] }[];
  seconds: number;
  /** Punkte für eine einmalige, gültige Antwort. */
  pointsUnique: number;
  /** Punkte für eine mehrfach genannte, gültige Antwort. */
  pointsShared: number;
  explain: string;
}
/** MATCHMAKER: sechs Paare verbinden. pairs[i].right gehört zu pairs[i].left; order = Anzeigereihenfolge der rechten Spalte (Permutation). */
export interface MatchTask {
  mode: 'match';
  prompt: string;
  pairs: { left: string; right: string }[];
  order: number[];
  seconds: number;
  /** abgeleitet: 6 × 50 */
  points: number;
  explain: string;
}
/** DIE VERBINDUNG: vier nacheinander erscheinende Hinweise, eine gemeinsame Lösung. */
export interface LinkTask {
  mode: 'link';
  prompt: string;
  clues: string[];
  answer: string;
  accept: string[];
  clueSeconds: number;
  /** abgeleitet: maximal erreichbare Punkte (Hinweis 1) */
  points: number;
  explain: string;
}
/** Proberunde: interaktive Beispielaufgabe ohne Wertung (Punkte werden nie vergeben). */
export interface TaskBase { practice?: boolean }
export type TaskDef = (GeoTask | RankTask | EstimateTask | GlitchTask | CodeTask | UniqueTask | MatchTask | LinkTask) & TaskBase;

/** Regeln eines Spielepakets (fairere Verteilung bei freier Kategorienwahl, Startguthaben). */
export interface PackRules {
  startCredit?: number; maxFootball?: number; maxPerMode?: number;
  /** BLIND RANK: 'task' = je Frage festgelegt (Standard), 'sequence' = Begriffe nacheinander, 'sort' = alle fünf sichtbar und sortieren */
  rankVariant?: 'task' | 'sequence' | 'sort';
  /** Branding: Titel der Show (TV-Eröffnung) und Gewinnerbezeichnung der Siegerehrung */
  showTitle?: string; winnerTitle?: string;
  /** Gewertete Aufgaben je regulärem Spielmodus im festen Showablauf: 4 = kompakte, 5 = längere Show (Proberunden zählen nicht). */
  tasksPerMode?: number;
  /** SETZ AUF MICH: eigene Einsatzstufen (leer = je Frage) und Bonus für die beste Schätzung (0 = kein Bonus) */
  estimateBets?: number[]; estimateBonus?: number;
  /** persönliche Note: Zeile unter dem Showtitel, Zeile unter dem Sieger, Titel der Zwischenstände (z. B. „Marktwert-Update“) */
  tagline?: string; winnerLine?: string; boardTitle?: string;
}
/** Ablaufmodell eines Raums: fester Showablauf (Standard) oder klassische Kategorienwand. */
export type Flow = 'show' | 'classic';
/** Schritt der festen Show: eine Runde (Kategorie/Kachel), die Überraschungsrunde, das Finale oder ein Zwischenstand. */
export type ShowStep = { k: 'round' | 'surprise' | 'final'; cat: string } | { k: 'board' };
/** Fester Inhaltsstand, mit dem ein Raum läuft (unveränderlich nach Veröffentlichung). */
export interface Book {
  tiles: TileDef[];
  /** fester Showablauf (cat = Kachel-ID in tiles); fehlt bei rein klassischen Paketen */
  show?: ShowStep[];
  /** true, wenn das Paket zusätzlich den klassischen Wand-Modus unterstützt (bei Paketen mit festem Showablauf optional) */
  classic?: boolean;
  scenes?: Record<string, import('./scenes').Scene>;
  rules?: PackRules;
  /** Paket-ID@Version, nur Information */
  ref?: string;
}

export interface TileDef {
  id: string;
  title: string;
  topic: string;
  icon: string;
  color: string; // Akzentfarbe
  mode: Mode;
  kind: 'tile' | 'surprise' | 'final';
  football: boolean;
  blurb: string; // Regelkarte (Kurz)
  tasks: TaskDef[];
}

// ---------- Zustand ----------
export type Phase = 'lobby' | 'intro' | 'wall' | 'round' | 'scoreboard' | 'ceremony' | 'ended';
export type Stage = 'intro' | 'view' | 'open' | 'bet' | 'locked' | 'review' | 'reveal';

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: Avatar;
  score: number | null; // null = verborgen
  rank: number | null;
  connected: boolean;
  answered: boolean;
  seatReleased: boolean;
  joinedOrder: number;
}

export interface TileView {
  id: string;
  title: string;
  topic: string;
  icon: string;
  color: string;
  status: 'open' | 'selected' | 'played';
  /** Wegen Verteilungsregeln (Fußball-/Modus-Limit) aktuell nicht wählbar */
  blocked?: boolean;
  kind: 'tile' | 'surprise' | 'final';
  mode?: Mode; // erst nach dem Öffnen sichtbar
}

export interface RoundView {
  rid: string;
  tileId: string;
  title: string;
  topic: string;
  icon: string;
  color: string;
  mode: Mode;
  kind: 'tile' | 'surprise' | 'final';
  blurb: string;
  taskIndex: number;
  taskCount: number;
  /** Proberunde (ungewertet) */
  practice: boolean;
  /** Zähler nur über gewertete Aufgaben: Nr. der aktuellen gewerteten Aufgabe (0 bei Probe) und Anzahl gewerteter Aufgaben der Runde */
  scoredIndex: number;
  scoredCount: number;
  stage: Stage;
  deadline: number | null;
  pausedLeft: number | null;
  stageSeconds: number | null;
  points: number; // Budget dieser Aufgabe
  /** modusspezifische Daten (rollenabhängig gefiltert) */
  data: any;
  /** Auflösung (nur im Stage 'reveal') */
  reveal: any | null;
}

export interface ScoreboardView {
  title: string;
  reason: string;
  standings: { id: string; score: number; prev: number }[];
}

export interface View {
  v: 1;
  seq: number;
  now: number;
  room: {
    code: string;
    phase: Phase;
    joinOpen: boolean;
    showPaused: boolean;
    sound: boolean;
    reduced: boolean;
    hideScores: boolean;
    act: string; // Anzeige: "Akt 1 – Kategorienwand" bzw. "Runde 2 von 6"
    flow: Flow;
    /** Programmübersicht der festen Show (nur Flow 'show') */
    /** Branding aus den Paketregeln */
    brand?: { title: string; winner: string; tagline?: string; winnerLine?: string };
    /** kleines Live-Ranking am TV-Rand (Showmaster schaltet) */
    liveRank?: boolean;
    /** Hintergrundmusik (Showmaster): an/aus und Lautstärke 0–100 */
    music?: { on: boolean; vol: number };
    agenda?: { k: 'round' | 'surprise' | 'final' | 'board'; title: string; icon?: string; mode?: Mode; tasks?: number; state: 'done' | 'now' | 'todo' }[];
    progress: { tilesPlayed: number; tilesTotal: number };
  };
  players: PlayerPublic[];
  wall: null | { tiles: TileView[]; pickerId: string | null; pickNo: number; pickerMayPick: boolean };
  round: RoundView | null;
  scoreboard: ScoreboardView | null;
  ceremony: null | { step: number; steps: number; stepTitle: string; standings: { id: string; score: number; delta: number; place: number }[] };
  me?: { id: string; recovery: string; score: number | null; rank: number | null };
  host?: { pin: string; recoveries: Record<string, string>; log: LogLine[]; scoreLog: ScoreEntry[]; tilesLeft: string[]; planNext: string };
  isPicker?: boolean;
}

export interface LogLine { at: number; text: string }
export interface ScoreEntry { id: number; key: string; pid: string; requested: number; applied: number; label: string; at: number; manual?: boolean }

// ---------- Netzwerk ----------
export type ClientMsg =
  | { t: 'hello'; role: 'tv' | 'host' | 'player'; room: string; key?: string }
  | { t: 'act'; reqId: string; a: Action }
  | { t: 'pong' };

export type ServerMsg =
  | { t: 'state'; view: View }
  | { t: 'hello_ok'; role: string; now: number }
  | { t: 'ack'; reqId: string; ok: boolean; err?: string; dup?: boolean; info?: any }
  | { t: 'ping' }
  | { t: 'kicked'; reason: string }
  | { t: 'error'; err: string };

export type Action =
  // Spieler
  | { k: 'submit'; payload: any }
  | { k: 'pick'; tileId: string }
  | { k: 'hint' }
  | { k: 'setAvatar'; name?: string; avatar?: Avatar }
  // Host
  | { k: 'h.joinOpen'; open: boolean }
  | { k: 'h.startShow' }
  | { k: 'h.introDone' }
  | { k: 'h.pick'; tileId: string }
  | { k: 'h.liveRank'; on: boolean }
  | { k: 'h.music'; on?: boolean; vol?: number }
  | { k: 'h.setPicker'; pid: string }
  | { k: 'h.begin' }            // Aufgabe starten (intro -> view/open)
  | { k: 'h.lock' }
  | { k: 'h.reveal' }
  | { k: 'h.next' }             // weiter nach Auflösung
  | { k: 'h.pause'; paused: boolean }
  | { k: 'h.addTime'; seconds: number }
  | { k: 'h.restartTask' }
  | { k: 'h.skipTask' }
  | { k: 'h.skipTile' }
  | { k: 'h.review'; groupKey: string; decision: 'valid' | 'invalid' | { mapTo: string } }
  | { k: 'h.adjust'; pid: string; delta: number; note: string }
  | { k: 'h.release'; pid: string }
  | { k: 'h.remove'; pid: string }
  | { k: 'h.scoreboard'; show: boolean }
  | { k: 'h.continue' }         // Zwischenstand/Wand weiter
  | { k: 'h.startFinal' }
  | { k: 'h.ceremonyNext' }
  | { k: 'h.end' }
  | { k: 'h.sound'; on: boolean }
  | { k: 'h.reduced'; on: boolean }
  | { k: 'h.showPause'; paused: boolean }
  | { k: 'h.backToWall' };
