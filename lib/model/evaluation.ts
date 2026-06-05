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

// Static constant kept for backwards compat — BIASED: computed vs homeWin only → 5/18 ≈ 0.2778
// The true expected RPS of a uniform predictor depends on the actual outcome distribution.
// Use computeDatasetBaselineRPS() for accurate per-dataset baselines.
export const RANDOM_RPS = rps([1/3, 1/3, 1/3], [1, 0, 0])  // 5/18 ≈ 0.2778

/**
 * Computes the true uniform-predictor RPS baseline for a given set of observed outcomes.
 *
 * A uniform predictor assigns [1/3, 1/3, 1/3] to every match.
 * The expected RPS depends on the actual outcome distribution:
 *   - all homeWins → 5/18 ≈ 0.2778
 *   - all draws    → 1/9  ≈ 0.1111
 *   - equal mix   → 2/9  ≈ 0.2222
 */
export function computeDatasetBaselineRPS(observed: [number, number, number][]): number {
  if (observed.length === 0) return RANDOM_RPS
  const uniform: [number, number, number] = [1 / 3, 1 / 3, 1 / 3]
  return observed.reduce((sum, o) => sum + rps(uniform, o), 0) / observed.length
}

// ─── Calibration / ECE ───────────────────────────────────────────────────────

export interface CalibrationBin {
  center: number      // bin midpoint (0.05, 0.15, ..., 0.95)
  predicted: number   // average predicted probability in this bin
  actual: number      // fraction of outcomes that occurred
  count: number       // number of data points in this bin
}

export interface ECEResult {
  ece: number                  // Expected Calibration Error (weighted avg |pred - actual|)
  mce: number                  // Maximum Calibration Error
  overconfidence: number       // avg(pred - actual) when pred > actual (positive = overconfident)
  bins: CalibrationBin[]
}

/**
 * Computes ECE + reliability diagram from a set of 3-way predictions.
 * Flattens all 3 outcomes (W/D/L) into binary pairs for maximum data efficiency.
 */
export function computeECE(
  predictions: [number, number, number][],
  outcomes: [number, number, number][],
  nBins = 10
): ECEResult {
  const binWidth = 1 / nBins
  const bins: { sumPred: number; sumAct: number; count: number }[] = Array.from({ length: nBins }, () => ({ sumPred: 0, sumAct: 0, count: 0 }))

  // Flatten: each prediction triplet yields 3 (p, o) pairs
  for (let i = 0; i < predictions.length; i++) {
    for (let k = 0; k < 3; k++) {
      const p = predictions[i][k]
      const o = outcomes[i][k]
      const binIdx = Math.min(nBins - 1, Math.floor(p / binWidth))
      bins[binIdx].sumPred += p
      bins[binIdx].sumAct += o
      bins[binIdx].count++
    }
  }

  const totalPoints = predictions.length * 3
  let ece = 0
  let mce = 0
  let overconfSum = 0
  let overconfCount = 0

  const calibBins: CalibrationBin[] = []
  for (let i = 0; i < nBins; i++) {
    if (bins[i].count === 0) continue
    const center = (i + 0.5) * binWidth
    const predicted = bins[i].sumPred / bins[i].count
    const actual = bins[i].sumAct / bins[i].count
    const err = Math.abs(predicted - actual)
    ece += (bins[i].count / totalPoints) * err
    mce = Math.max(mce, err)
    if (predicted > actual) { overconfSum += predicted - actual; overconfCount++ }
    calibBins.push({ center, predicted, actual, count: bins[i].count })
  }

  return { ece, mce, overconfidence: overconfCount > 0 ? overconfSum / overconfCount : 0, bins: calibBins }
}
