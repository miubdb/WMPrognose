// Ranked Probability Score (Constantinou & Fenton 2012)
// Optimal für ordinale 3-Outcome-Prognosen (1X2)
export function rps(
  predicted: [number, number, number],
  observed: [number, number, number]
): number {
  const F1 = predicted[0]
  const F2 = predicted[0] + predicted[1]
  const O1 = observed[0]
  const O2 = observed[0] + observed[1]
  return 0.5 * ((F1 - O1) ** 2 + (F2 - O2) ** 2)
}

// Log Loss für binäres Outcome (z.B. Team A gewinnt ja/nein)
export function logLoss(predicted: number, observed: 0 | 1): number
// Log Loss für 3-Outcome (W/D/L)
export function logLoss(predicted: [number, number, number], observed: [number, number, number]): number
export function logLoss(
  predicted: number | [number, number, number],
  observed: 0 | 1 | [number, number, number]
): number {
  if (Array.isArray(predicted) && Array.isArray(observed)) {
    // Multinomial log loss: -sum(o_i * log(p_i))
    return -predicted.reduce((sum, p, i) => {
      const pc = Math.max(0.001, Math.min(0.999, p))
      return sum + (observed as number[])[i] * Math.log(pc)
    }, 0)
  }
  const p = Math.max(0.001, Math.min(0.999, predicted as number))
  const o = observed as 0 | 1
  return -(o * Math.log(p) + (1 - o) * Math.log(1 - p))
}

// Brier Score für W/D/L
export function brierScore(
  predicted: [number, number, number],
  observed: [number, number, number]
): number {
  return (
    (predicted[0] - observed[0]) ** 2 +
    (predicted[1] - observed[1]) ** 2 +
    (predicted[2] - observed[2]) ** 2
  ) / 3
}

// Referenz-RPS für Gleichverteilung (Baseline)
export const RANDOM_RPS = rps([1/3, 1/3, 1/3], [1, 0, 0])  // = 0.333
