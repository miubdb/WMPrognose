// Interner (persistenter) Zustand eines Raums.
import type { Avatar, Phase, Stage, ScoreEntry, LogLine, Flow } from '../shared/types';

export interface PlayerRec {
  id: string;
  name: string;
  avatar: Avatar;
  tokenHash: string;
  recovery: string;
  score: number;
  joinedOrder: number;
  released: boolean;
  lastSeen: number;
  removed?: boolean;
}

/** 'tile:<id>' = feste Show: diese Kachel direkt starten. */
export type PlanStep = 'wall' | 'surprise' | 'board' | 'final' | `tile:${string}`;

export interface RoundState {
  tileId: string;
  taskIndex: number;
  stage: Stage;
  stageStartedAt: number;
  deadline: number | null;
  pausedLeft: number | null;
  stageSeconds: number | null;
  /** modusweiter Zustand */
  m: any;
  /** je Spieler: Antworten/Zustand */
  pm: Record<string, any>;
  /** Ergebnis (nach Auflösung) */
  result: { entries: { pid: string; delta: number; label: string }[]; reveal: any } | null;
  /** Anzahl Neustarts dieser Aufgabe (für Schlüssel/Audit) */
  attempt: number;
}

export interface Room {
  code: string;
  /** Paketversion (Inhaltsstand) dieses Raums, z. B. "standard-1@1" */
  bookId?: string;
  /** Ablaufmodell; fehlt bei älteren Räumen → klassisch (Kategorienwand) */
  flow?: Flow;
  /** Live-Ranking am TV-Rand (Standard an) und Hintergrundmusik (Standard aus) */
  liveRank?: boolean;
  music?: { on: boolean; vol: number };
  createdAt: number;
  hostKeyHash: string;
  hostPin: string;
  hostPinHash: string;
  phase: Phase;
  joinOpen: boolean;
  showPaused: boolean;
  frozen: boolean;
  sound: boolean;
  reduced: boolean;
  hideScores: boolean;
  players: PlayerRec[];
  nextPlayerNo: number;
  seq: number;
  plan: PlanStep[];
  planIdx: number;
  tileStatus: Record<string, 'open' | 'selected' | 'played'>;
  pickOrder: string[];
  pickNo: number;
  pickerId: string | null;
  round: RoundState | null;
  scoreLog: ScoreEntry[];
  scoreSeq: number;
  scoreboard: { title: string; reason: string; prev: Record<string, number>; manual?: boolean } | null;
  lastBoard: Record<string, number>;
  ceremonyStep: number;
  tilesPlayed: number;
  log: LogLine[];
  /** Idempotenz: reqId -> Antwort */
  processed: Record<string, any>;
  processedOrder: string[];
  seed: number;
}
