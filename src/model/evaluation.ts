/**
 * Evaluationsmetriken
 *
 * Constantinou & Fenton (2012): RPS als primäre Evaluationsmetrik
 * für probabilistische Fußballprognosen.
 *
 * Ranked Probability Score (RPS):
 * - Berücksichtigt ordinale Struktur der Outcomes (Sieg A > Remis > Sieg B)
 * - Niedriger RPS = bessere Prognose
 * - Bester mögl. RPS = 0, schlechtester ≈ 1
 *
 * Brier Score:
 * - Für binäre und mehrklassige Prognosen
 * - Ebenfalls: niedriger = besser
 */

export type MatchOutcome = 'A' | 'draw' | 'B';

export interface MatchPrediction {
  winProbabilityA: number;
  drawProbability: number;
  winProbabilityB: number;
}

export interface EvaluationResult {
  rps: number;
  brierScore: number;
  outcome: MatchOutcome;
  wasCorrect: boolean;  // Hat die wahrscheinlichste Outcome-Prognose gestimmt?
  notes: string[];
}

/**
 * Ranked Probability Score (RPS) für 3 Outcomes (1X2).
 *
 * Formel (Constantinou & Fenton 2012):
 * RPS = (1/2) * Σ_{r=1}^{2} [(F_r - O_r)^2]
 * wobei F_r = kumulative Prognose, O_r = kumulatives Outcome
 *
 * Outcomes geordnet: [Sieg A, Remis, Sieg B]
 */
export function computeRPS(
  prediction: MatchPrediction,
  actualOutcome: MatchOutcome
): number {
  // Kumulative Prognose-Wahrscheinlichkeiten
  const F1 = prediction.winProbabilityA;
  const F2 = prediction.winProbabilityA + prediction.drawProbability;

  // Kumulative tatsächliche Outcomes
  let O1: number, O2: number;
  switch (actualOutcome) {
    case 'A':
      O1 = 1; O2 = 1;
      break;
    case 'draw':
      O1 = 0; O2 = 1;
      break;
    case 'B':
      O1 = 0; O2 = 0;
      break;
  }

  // RPS = (1/2) * [(F1-O1)^2 + (F2-O2)^2]
  return 0.5 * (Math.pow(F1 - O1, 2) + Math.pow(F2 - O2, 2));
}

/**
 * Brier Score für 3-Klassen-Problem (optional).
 * BS = (1/n) * Σ (p_i - o_i)^2
 */
export function computeBrierScore(
  prediction: MatchPrediction,
  actualOutcome: MatchOutcome
): number {
  const probs = [prediction.winProbabilityA, prediction.drawProbability, prediction.winProbabilityB];
  const actuals = [
    actualOutcome === 'A' ? 1 : 0,
    actualOutcome === 'draw' ? 1 : 0,
    actualOutcome === 'B' ? 1 : 0,
  ];

  const sumSquares = probs.reduce((sum, p, i) => sum + Math.pow(p - actuals[i], 2), 0);
  return sumSquares / probs.length;
}

/**
 * Vollständige Evaluierung einer Prognose gegen ein echtes Ergebnis.
 */
export function evaluatePrediction(
  prediction: MatchPrediction,
  actualOutcome: MatchOutcome
): EvaluationResult {
  const rps = computeRPS(prediction, actualOutcome);
  const brierScore = computeBrierScore(prediction, actualOutcome);
  const notes: string[] = [];

  // War die häufigste Prognose korrekt?
  const probs = {
    A: prediction.winProbabilityA,
    draw: prediction.drawProbability,
    B: prediction.winProbabilityB,
  };
  const predictedOutcome = (Object.keys(probs) as MatchOutcome[])
    .reduce((a, b) => probs[a] > probs[b] ? a : b);
  const wasCorrect = predictedOutcome === actualOutcome;

  // RPS-Interpretation
  if (rps < 0.05) notes.push('Exzellente Prognose (RPS < 0.05)');
  else if (rps < 0.10) notes.push('Gute Prognose (RPS < 0.10)');
  else if (rps < 0.20) notes.push('Moderate Prognose (RPS < 0.20)');
  else notes.push('Schwache Prognose (RPS ≥ 0.20)');

  if (!wasCorrect) {
    notes.push(`Prognose: ${predictedOutcome}, tatsächlich: ${actualOutcome}`);
  }

  return {
    rps,
    brierScore,
    outcome: actualOutcome,
    wasCorrect,
    notes,
  };
}

/**
 * Durchschnittlicher RPS über eine Liste von Prognosen.
 * Dient als Kalibrierungsmetrik.
 */
export function averageRPS(evaluations: EvaluationResult[]): number {
  if (evaluations.length === 0) return 0;
  return evaluations.reduce((sum, e) => sum + e.rps, 0) / evaluations.length;
}
