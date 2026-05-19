/**
 * Poisson-basiertes Scoreline-Modell
 *
 * Maher (1982): Fußballergebnisse als Poisson-Prozess mit Team-Angriffs-
 * und Team-Verteidigungsstärken.
 * Karlis & Ntzoufras (2003): Korrelation zwischen Team-Toren (bivariate Poisson).
 */

import { MODEL_CONFIG } from '../config/modelConfig';
import { poissonPMF, clamp } from '../utils/math';

export interface ScorelineProbability {
  goalsA: number;
  goalsB: number;
  probability: number;
}

export interface PoissonResult {
  expectedGoalsA: number;
  expectedGoalsB: number;
  winProbabilityA: number;
  drawProbability: number;
  winProbabilityB: number;
  scorelineMatrix: ScorelineProbability[][];  // [goalsA][goalsB]
  topScorelines: ScorelineProbability[];      // Top 10 wahrscheinlichste
}

/**
 * Berechnet die Score-Matrix via unabhängiger bivariater Poisson-Verteilung.
 * Version 1: Unabhängige Poisson-Variablen (vereinfacht).
 * Karlis & Ntzoufras (2003): Korrelation wird in Dixon-Coles-Korrektur berücksichtigt.
 */
export function computeScorelineMatrix(
  expectedGoalsA: number,
  expectedGoalsB: number
): ScorelineProbability[][] {
  const maxGoals = MODEL_CONFIG.poisson.maxGoals;
  const matrix: ScorelineProbability[][] = [];

  for (let a = 0; a <= maxGoals; a++) {
    matrix[a] = [];
    for (let b = 0; b <= maxGoals; b++) {
      const prob = poissonPMF(expectedGoalsA, a) * poissonPMF(expectedGoalsB, b);
      matrix[a][b] = { goalsA: a, goalsB: b, probability: prob };
    }
  }

  return matrix;
}

/**
 * Hauptfunktion: Berechnet alle Poisson-Prognosen.
 *
 * @param expectedGoalsA - Erwartete Tore Team A (nach allen Modifikatoren)
 * @param expectedGoalsB - Erwartete Tore Team B
 */
export function computePoissonPrediction(
  expectedGoalsA: number,
  expectedGoalsB: number
): PoissonResult {
  // Sicherheits-Clamp
  const lambdaA = clamp(expectedGoalsA, MODEL_CONFIG.limits.minExpectedGoals, MODEL_CONFIG.limits.maxExpectedGoals);
  const lambdaB = clamp(expectedGoalsB, MODEL_CONFIG.limits.minExpectedGoals, MODEL_CONFIG.limits.maxExpectedGoals);

  const matrix = computeScorelineMatrix(lambdaA, lambdaB);

  // Aggregate 1X2-Wahrscheinlichkeiten
  let winA = 0, draw = 0, winB = 0;
  const allScorelines: ScorelineProbability[] = [];

  for (let a = 0; a <= MODEL_CONFIG.poisson.maxGoals; a++) {
    for (let b = 0; b <= MODEL_CONFIG.poisson.maxGoals; b++) {
      const p = matrix[a][b].probability;
      if (a > b) winA += p;
      else if (a === b) draw += p;
      else winB += p;

      allScorelines.push(matrix[a][b]);
    }
  }

  // Top-Scorelines nach Wahrscheinlichkeit sortiert
  const topScorelines = [...allScorelines]
    .sort((x, y) => y.probability - x.probability)
    .slice(0, 10);

  return {
    expectedGoalsA: lambdaA,
    expectedGoalsB: lambdaB,
    winProbabilityA: clamp(winA, MODEL_CONFIG.limits.minWinProbability, MODEL_CONFIG.limits.maxWinProbability),
    drawProbability: clamp(draw, MODEL_CONFIG.limits.minWinProbability, MODEL_CONFIG.limits.maxWinProbability),
    winProbabilityB: clamp(winB, MODEL_CONFIG.limits.minWinProbability, MODEL_CONFIG.limits.maxWinProbability),
    scorelineMatrix: matrix,
    topScorelines,
  };
}
