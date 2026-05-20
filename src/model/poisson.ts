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
 * Aggregiert 1X2-Wahrscheinlichkeiten direkt aus einer flachen ScorelineProbability-Liste.
 * Standalone-Funktion nach Modell-Spezifikation.
 *
 * @param matrix - Flache Liste von ScorelineProbability (aus computeScorelineMatrix nach Flatten)
 */
export function compute1X2(
  matrix: ScorelineProbability[]
): { winA: number; draw: number; winB: number } {
  let winA = 0, draw = 0, winB = 0;

  for (const cell of matrix) {
    if (cell.goalsA > cell.goalsB) winA += cell.probability;
    else if (cell.goalsA === cell.goalsB) draw += cell.probability;
    else winB += cell.probability;
  }

  return { winA, draw, winB };
}

/**
 * Ranked Probability Score (RPS) für 3 Outcomes (1X2).
 * Constantinou & Fenton (2012): Berücksichtigt ordinale Struktur.
 *
 * @param predicted - [pWinA, pDraw, pWinB] - Prognose-Wahrscheinlichkeiten
 * @param observed  - [1|0, 1|0, 1|0] - tatsächliches Ergebnis als Indikatorvektor
 * @returns RPS-Wert (niedriger = besser, 0 = perfekte Prognose)
 */
export function rps(
  predicted: [number, number, number],
  observed: [number, number, number]
): number {
  // Kumulative Prognose-Wahrscheinlichkeiten
  const F1 = predicted[0];
  const F2 = predicted[0] + predicted[1];

  // Kumulative tatsächliche Outcomes
  const O1 = observed[0];
  const O2 = observed[0] + observed[1];

  // RPS = (1/2) * [(F1-O1)^2 + (F2-O2)^2]  (Constantinou & Fenton 2012)
  return 0.5 * (Math.pow(F1 - O1, 2) + Math.pow(F2 - O2, 2));
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
