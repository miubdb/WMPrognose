/**
 * K.-o.-Match-Logik
 *
 * Heuer & Rubner (2009): Skill vs Chance in Single-Knockout
 * Csató & Petróczy (2026): Shootout-Mechanismus
 *
 * K.-o.-Ablauf:
 * 1. 90 Minuten Regulärzeit
 * 2. Falls Remis → Verlängerung (ET)
 * 3. Falls weiter Remis → Elfmeterschießen
 */

import { MODEL_CONFIG } from '../config/modelConfig';
import { clamp } from '../utils/math';
import { PoissonResult } from './poisson';
import { PenaltyShootoutResult } from './penalties';

export interface KnockoutResult {
  // Gesamtwahrscheinlichkeit Weiterkommen
  probabilityTeamAAdvances: number;
  probabilityTeamBAdvances: number;

  // Phasierte Wahrscheinlichkeiten
  probabilityTeamAWinsIn90: number;
  probabilityTeamBWinsIn90: number;
  probabilityExtraTime: number;
  probabilityTeamAWinsInET: number;
  probabilityTeamBWinsInET: number;
  probabilityPenaltyShootout: number;
  probabilityTeamAWinsOnPenalties: number;
  probabilityTeamBWinsOnPenalties: number;

  // Elfmeter-Vorteil
  penaltyEdgeTeamA: number;

  notes: string[];
}

/**
 * Berechnet die K.-o.-Wahrscheinlichkeiten aus den Regularzeit-Prognosen.
 *
 * Logik:
 * - pWinA90, pDraw90, pWinB90 aus Poisson-Modell
 * - Bei Remis: ET → einer von beiden gewinnt mit extraTimeFactor-Wahrscheinlichkeit
 * - Rest → Elfmeterschießen mit Skill-Edge
 *
 * ANNAHME: In der Verlängerung sind die Stärkeverhältnisse ähnlich wie in 90min,
 * aber Ermüdung macht das Ergebnis etwas zufälliger → extraTimeFactor
 */
export function computeKnockoutResult(
  poissonResult: PoissonResult,
  penaltyResult: PenaltyShootoutResult,
  teamAName: string,
  teamBName: string
): KnockoutResult {
  const notes: string[] = [];
  const { extraTimeFactor, shootoutAfterETProb } = MODEL_CONFIG.knockout;

  // 90-Minuten-Wahrscheinlichkeiten
  const pWinA90 = poissonResult.winProbabilityA;
  const pDraw90 = poissonResult.drawProbability;
  const pWinB90 = poissonResult.winProbabilityB;

  // Bei K.-o.-Spiel: kein Remis nach 90min → ET+Elfmeter
  // pDraw90 verteilt auf ET und Elfmeter

  // ET: Stärke-basierter Ausgang, aber etwas zufälliger
  // extraTimeFactor = Wahrscheinlichkeit, dass der Stärkere in ET gewinnt
  // Wir gewichten nach relativem Stärkeverhältnis in 90min
  const relStrengthA = pWinA90 / (pWinA90 + pWinB90);
  const relStrengthB = 1 - relStrengthA;

  // In ET: Der Stärkere gewinnt mit factor-Wahrscheinlichkeit von pDraw90
  // 55% der Fälle endet ET mit Sieger, 40% der verbleibenden → Elfmeter
  const pETPlusShootout = pDraw90;

  // Wer gewinnt in ET?
  const pETdecided = pETPlusShootout * (1 - shootoutAfterETProb);
  const pShootout = pETPlusShootout * shootoutAfterETProb;

  // In ET: Sieger hängt von Stärkeverhältnis ab, aber extraTimeFactor dämpft
  // Stärkerer gewinnt mit extraTimeFactor + Stärke-Bonus (Heuer & Rubner 2009)
  const dampedStrengthA = 0.5 + (relStrengthA - 0.5) * extraTimeFactor;
  const pWinAinET = pETdecided * dampedStrengthA;
  const pWinBinET = pETdecided * (1 - dampedStrengthA);

  // Elfmeter
  const pWinAonPenalties = pShootout * penaltyResult.probabilityTeamAWins;
  const pWinBonPenalties = pShootout * penaltyResult.probabilityTeamBWins;

  // Gesamtwahrscheinlichkeit Weiterkommen
  const probAadvances = clamp(pWinA90 + pWinAinET + pWinAonPenalties, 0.05, 0.95);
  const probBadvances = clamp(pWinB90 + pWinBinET + pWinBonPenalties, 0.05, 0.95);

  // Normalisieren (sollte ohnehin ~1 ergeben)
  const total = probAadvances + probBadvances;

  notes.push(`Regulärzeit: ${teamAName} ${(pWinA90 * 100).toFixed(1)}% | Remis ${(pDraw90 * 100).toFixed(1)}% | ${teamBName} ${(pWinB90 * 100).toFixed(1)}%`);
  notes.push(`Verlängerung: ${(pETdecided * 100).toFixed(1)}% Entscheidung in 120min`);
  notes.push(`Elfmeter: ${(pShootout * 100).toFixed(1)}% Chance`);
  if (penaltyResult.skillEdgeTeamA > 0.01) {
    notes.push(...penaltyResult.notes);
  }

  return {
    probabilityTeamAAdvances: probAadvances / total,
    probabilityTeamBAdvances: probBadvances / total,
    probabilityTeamAWinsIn90: pWinA90,
    probabilityTeamBWinsIn90: pWinB90,
    probabilityExtraTime: pETPlusShootout,
    probabilityTeamAWinsInET: pWinAinET,
    probabilityTeamBWinsInET: pWinBinET,
    probabilityPenaltyShootout: pShootout,
    probabilityTeamAWinsOnPenalties: pWinAonPenalties,
    probabilityTeamBWinsOnPenalties: pWinBonPenalties,
    penaltyEdgeTeamA: penaltyResult.skillEdgeTeamA,
    notes,
  };
}
