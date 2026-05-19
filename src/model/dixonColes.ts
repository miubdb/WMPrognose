/**
 * Dixon-Coles-Korrektur für Low-Score-Ergebnisse
 *
 * Dixon & Coles (1997): "Modelling Association Football Scores and Inefficiencies
 * in the Football Betting Market"
 *
 * Korrektur für 0:0, 1:0, 0:1, 1:1 – diese Ergebnisse sind in echten Spielen
 * häufiger als ein unabhängiges Poisson-Modell vorhersagt.
 */

import { MODEL_CONFIG } from '../config/modelConfig';
import { ScorelineProbability } from './poisson';

/**
 * Dixon-Coles τ(rho)-Korrekturfaktor für Low-Score-Ergebnisse.
 *
 * Formel (Dixon & Coles 1997):
 *   τ(x, y, λ, μ, ρ) = 1 − ρ·λ·μ    falls x=0, y=0
 *   τ(x, y, λ, μ, ρ) = 1 + ρ·λ       falls x=0, y=1
 *   τ(x, y, λ, μ, ρ) = 1 + ρ·μ       falls x=1, y=0
 *   τ(x, y, λ, μ, ρ) = 1 − ρ         falls x=1, y=1
 *   τ(x, y, λ, μ, ρ) = 1             sonst
 *
 * ρ (rho): Korrelationsparameter (kalibriert, typisch 0.08–0.13)
 */
export function dixonColesToFactor(
  goalsA: number,
  goalsB: number,
  lambdaA: number,
  lambdaB: number,
  rho: number = MODEL_CONFIG.dixonColes.rho
): number {
  if (goalsA === 0 && goalsB === 0) return 1 - rho * lambdaA * lambdaB;
  if (goalsA === 0 && goalsB === 1) return 1 + rho * lambdaA;
  if (goalsA === 1 && goalsB === 0) return 1 + rho * lambdaB;
  if (goalsA === 1 && goalsB === 1) return 1 - rho;
  return 1.0;
}

/**
 * Wendet die Dixon-Coles-Korrektur auf eine komplette Scoreline-Matrix an.
 * Renormalisiert danach, damit sich alle Wahrscheinlichkeiten wieder zu 1 summieren.
 */
export function applyDixonColesCorrection(
  matrix: ScorelineProbability[][],
  lambdaA: number,
  lambdaB: number
): ScorelineProbability[][] {
  const corrected: ScorelineProbability[][] = [];
  let totalProb = 0;

  // Korrektur anwenden
  for (let a = 0; a < matrix.length; a++) {
    corrected[a] = [];
    for (let b = 0; b < matrix[a].length; b++) {
      const factor = dixonColesToFactor(a, b, lambdaA, lambdaB);
      const newProb = matrix[a][b].probability * factor;
      corrected[a][b] = { goalsA: a, goalsB: b, probability: newProb };
      totalProb += newProb;
    }
  }

  // Renormalisieren
  if (totalProb > 0) {
    for (let a = 0; a < corrected.length; a++) {
      for (let b = 0; b < corrected[a].length; b++) {
        corrected[a][b].probability /= totalProb;
      }
    }
  }

  return corrected;
}

/**
 * Aggregiert 1X2-Wahrscheinlichkeiten aus einer (ggf. korrigierten) Scoreline-Matrix.
 */
export function aggregateOutcomeProbabilities(
  matrix: ScorelineProbability[][]
): { winA: number; draw: number; winB: number } {
  let winA = 0, draw = 0, winB = 0;

  for (const row of matrix) {
    for (const cell of row) {
      if (cell.goalsA > cell.goalsB) winA += cell.probability;
      else if (cell.goalsA === cell.goalsB) draw += cell.probability;
      else winB += cell.probability;
    }
  }

  return { winA, draw, winB };
}
