/**
 * Squad-Signale und Spieler-bezogene Modifikatoren
 *
 * Quellen:
 * - Peeters (2018): Marktwerte als Informationssignal
 * - Caley xG Methodology: xG als bessere Qualitätsmessung
 * - Brechot & Flepp (2020): Opponent-adjusted xG
 * - Dendir (2016): Peak Age 27-29
 * - McHale & Holmes (2023): Positionsabhängige Bewertung
 * - Power et al. / StatsBomb (2018): Set-piece threat
 */

import { TeamData } from '../data/teams';
import { MODEL_CONFIG } from '../config/modelConfig';
import { clamp } from '../utils/math';

export interface SquadSignalResult {
  // xG-Form-Modifier: Wie ist die aktuelle Angriffsform?
  xgFormModifier: number;
  // xG-Against-Modifier: Wie gut ist die Defensivform?
  xgAgainstModifier: number;
  // Peak-Age-Modifier: Wie optimal ist das Kaderalter?
  peakAgeModifier: number;
  // Set-Piece-Modifier: Wie gefährlich ist das Team bei Standards?
  setPieceModifier: number;
  // Gesamter Squad-Attack-Bonus (auf xG)
  squadAttackModifier: number;
  // Gesamter Squad-Defense-Bonus (auf gegnerische xG)
  squadDefenseModifier: number;
  // Erläuterungen
  notes: string[];
}

/**
 * Peak-Age-Score nach Dendir (2016).
 * Maximum bei 27-29 Jahren, symmetrische Penalty außerhalb.
 */
export function computePeakAgeScore(avgAge: number): number {
  const { peakMin, peakMax, penaltyPerYear, maxPenalty } = MODEL_CONFIG.peakAge;
  let penalty = 0;

  if (avgAge < peakMin) {
    penalty = (peakMin - avgAge) * penaltyPerYear;
  } else if (avgAge > peakMax) {
    penalty = (avgAge - peakMax) * penaltyPerYear;
  }
  // Kein Bonus für Peak-Alter, nur Penalty außerhalb
  // Modifier: 1.0 im Peak, reduziert außerhalb
  return 1.0 - clamp(penalty, 0, maxPenalty);
}

/**
 * xG-Form-Modifier aus den letzten Spielen (Caley / Brechot & Flepp 2020).
 * Vergleicht recentXGFor mit einem Referenzwert (baseExpectedGoals).
 * Opponent-adjusted xG wird bevorzugt wenn vorhanden.
 */
export function computeXGFormModifier(team: TeamData): number {
  const base = MODEL_CONFIG.poisson.baseExpectedGoals;
  // Nutze opponent-adjusted xG wenn verfügbar
  const xgFor = team.opponentAdjustedXG || team.recentXGFor;
  // Ratio zum Durchschnitt, aber gedämpft
  const ratio = xgFor / base;
  // Dämpfung: xG-Form-Gewicht (20%) → maximal ±20% Einfluss
  const weight = MODEL_CONFIG.squad.xgFormWeight;
  const modifier = 1 + (ratio - 1) * weight;
  return clamp(modifier, 0.85, 1.20);
}

/**
 * Defensiv-xG-Modifier: Wie gut verhindert das Team gegnerische Chancen?
 * Brechot & Flepp (2020): Niedrige xG-against ist Qualitätssignal.
 */
export function computeXGAgainstModifier(team: TeamData): number {
  const base = MODEL_CONFIG.poisson.baseExpectedGoals;
  const xgAgainst = team.recentXGAgainst;
  // Niedrige xG-against → Team reduziert gegnerische Chancen
  // Modifier: 1.0 = durchschnittlich, > 1.0 = stärker defensiv
  const ratio = base / xgAgainst;  // invertiert
  const weight = MODEL_CONFIG.squad.xgFormWeight;
  const modifier = 1 + (ratio - 1) * weight;
  return clamp(modifier, 0.88, 1.18);
}

/**
 * Berechnet alle Squad-Signale für ein Team.
 */
export function computeSquadSignals(team: TeamData): SquadSignalResult {
  const notes: string[] = [];

  // ─── xG-Form (Caley / Brechot & Flepp 2020) ─────────────────────────────────
  const xgFormModifier = computeXGFormModifier(team);
  const xgAgainstModifier = computeXGAgainstModifier(team);

  if (team.opponentAdjustedXG !== team.recentXGFor) {
    notes.push(`xG-Form basiert auf opponent-adjusted xG (${team.opponentAdjustedXG.toFixed(2)})`);
  }

  // ─── Peak-Age-Score (Dendir 2016) ────────────────────────────────────────────
  const peakAgeModifier = computePeakAgeScore(team.keyPlayersAvgAge);
  if (team.keyPlayersAvgAge < MODEL_CONFIG.peakAge.peakMin) {
    notes.push(`Kader jung (⌀${team.keyPlayersAvgAge.toFixed(1)}J): leichter Erfahrungs-Malus`);
  } else if (team.keyPlayersAvgAge > MODEL_CONFIG.peakAge.peakMax) {
    notes.push(`Kader älter (⌀${team.keyPlayersAvgAge.toFixed(1)}J): leichter Fitness-Malus`);
  } else {
    notes.push(`Kader im Peak-Alter (⌀${team.keyPlayersAvgAge.toFixed(1)}J)`);
  }

  // ─── Set-Piece-Threat (Power et al. / StatsBomb 2018) ───────────────────────
  // Höherer setPieceRating → mehr xG durch Standards
  const setPieceModifier = 1 + (team.setPieceRating / 100) * MODEL_CONFIG.squad.setPieceMaxBonus;

  // ─── Gesamt-Squad-Attack-Modifier ─────────────────────────────────────────────
  // Kombiniert xG-Form, Peak-Age, Set-Pieces
  // Capped bei ±maxImpact (15%)
  const rawAttack = xgFormModifier * peakAgeModifier * setPieceModifier;
  // Dämpfung: Wirkung nicht zu stark (Peeters 2018 zeigt moderate Effekte)
  const squadAttackModifier = clamp(
    rawAttack,
    1 - MODEL_CONFIG.squad.maxImpact,
    1 + MODEL_CONFIG.squad.maxImpact
  );

  // ─── Gesamt-Squad-Defense-Modifier ────────────────────────────────────────────
  const rawDefense = xgAgainstModifier * peakAgeModifier;
  const squadDefenseModifier = clamp(
    rawDefense,
    1 - MODEL_CONFIG.squad.maxImpact,
    1 + MODEL_CONFIG.squad.maxImpact
  );

  return {
    xgFormModifier,
    xgAgainstModifier,
    peakAgeModifier,
    setPieceModifier,
    squadAttackModifier,
    squadDefenseModifier,
    notes,
  };
}
