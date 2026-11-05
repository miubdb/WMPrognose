// Gemeinsame Typen für Server, Inhalte und Client.

export type Mode = 'geo' | 'rank' | 'estimate' | 'glitch' | 'codebreak' | 'unique';
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
export interface GlitchZone { x: number; y: number; r: number }
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
  placeholder: string;
  valid: { name: string; variants: string[] }[];
  seconds: number;
  /** Punkte für eine einmalige, gültige Antwort. */
  pointsUnique: number;
  /** Punkte für eine mehrfach genannte, gültige Antwort. */
  pointsShared: number;
  explain: string;
}
export type TaskDef = GeoTask | RankTask | EstimateTask | GlitchTask | CodeTask | UniqueTask;

/** Regeln eines Spielepakets (fairere Verteilung bei freier Kategorienwahl, Startguthaben). */
export interface PackRules { startCredit?: number; maxFootball?: number; maxPerMode?: number }
/** Fester Inhaltsstand, mit dem ein Raum läuft (unveränderlich nach Veröffentlichung). */
export interface Book {
  tiles: TileDef[];
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
    act: string; // Anzeige: "Akt 1 – Kategorienwand"
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
