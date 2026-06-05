/**
 * Unit Tests für alle Metriken.
 *
 * Kein externes Test-Framework notwendig — läuft als API-Route (/api/test-metrics).
 * Alle Erwartungswerte manuell berechenbar.
 */

import {
  rps, logLoss, brierScore, computeECE,
  computeDatasetBaselineRPS, RANDOM_RPS,
} from '@/lib/model/evaluation'

export interface TestCase {
  name: string
  passed: boolean
  actual: number | string
  expected: string
  note?: string
}

export interface TestSuite {
  name: string
  cases: TestCase[]
  passed: number
  failed: number
}

function approx(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) < tol
}

function pass(name: string, actual: number, expected: number, tol = 1e-6, note?: string): TestCase {
  const ok = approx(actual, expected, tol)
  return { name, passed: ok, actual: actual.toFixed(8), expected: `≈ ${expected.toFixed(8)}`, note }
}

function passStr(name: string, actual: boolean, expected: boolean, note?: string): TestCase {
  return { name, passed: actual === expected, actual: String(actual), expected: String(expected), note }
}

// ─── RPS Tests ───────────────────────────────────────────────────────────────

export function testRPS(): TestSuite {
  const cases: TestCase[] = []

  // Perfect prediction: homeWin predicted with certainty, homeWin occurred
  // F = [1, 1] (cumulative), O = [1, 1] → RPS = 0.5*(0+0) = 0
  cases.push(pass('Perfect homeWin prediction', rps([1, 0, 0], [1, 0, 0]), 0))

  // Perfect draw prediction
  // F_cum = [0, 1], O_cum = [0, 1] → RPS = 0
  cases.push(pass('Perfect draw prediction', rps([0, 1, 0], [0, 1, 0]), 0))

  // Perfect awayWin prediction
  cases.push(pass('Perfect awayWin prediction', rps([0, 0, 1], [0, 0, 1]), 0))

  // Worst case: predict homeWin with certainty but awayWin occurred
  // F_cum = [1, 1], O_cum = [0, 0] → 0.5*((1-0)^2 + (1-0)^2) = 0.5*2 = 1.0
  cases.push(pass('Worst case: predict homeWin, awayWin occurs', rps([1, 0, 0], [0, 0, 1]), 1.0))

  // Worst case: predict awayWin with certainty but homeWin occurred
  // F_cum = [0, 0], O_cum = [1, 1] → 0.5*((0-1)^2 + (0-1)^2) = 1.0
  cases.push(pass('Worst case: predict awayWin, homeWin occurs', rps([0, 0, 1], [1, 0, 0]), 1.0))

  // Uniform predictor vs homeWin: F_cum = [1/3, 2/3], O_cum = [1, 1]
  // 0.5*((1/3-1)^2 + (2/3-1)^2) = 0.5*(4/9 + 1/9) = 5/18 ≈ 0.27778
  cases.push(pass('Uniform vs homeWin', rps([1/3, 1/3, 1/3], [1, 0, 0]), 5/18, 1e-9))

  // Uniform predictor vs draw: F_cum = [1/3, 2/3], O_cum = [0, 1]
  // 0.5*((1/3-0)^2 + (2/3-1)^2) = 0.5*(1/9 + 1/9) = 1/9 ≈ 0.11111
  cases.push(pass('Uniform vs draw', rps([1/3, 1/3, 1/3], [0, 1, 0]), 1/9, 1e-9))

  // Uniform predictor vs awayWin: F_cum = [1/3, 2/3], O_cum = [0, 0]
  // 0.5*((1/3-0)^2 + (2/3-0)^2) = 0.5*(1/9 + 4/9) = 5/18 ≈ 0.27778
  cases.push(pass('Uniform vs awayWin', rps([1/3, 1/3, 1/3], [0, 0, 1]), 5/18, 1e-9))

  // Correct tendency but bad draw prediction:
  // predict [0.8, 0.1, 0.1], homeWin: F=[0.8, 0.9], O=[1,1] → 0.5*(0.04+0.01) = 0.025
  cases.push(pass('Confident homeWin correct', rps([0.8, 0.1, 0.1], [1, 0, 0]), 0.5*(0.04+0.01), 1e-9))

  // Draw case: predict [0.2, 0.6, 0.2], draw occurs
  // F_cum = [0.2, 0.8], O_cum = [0, 1] → 0.5*(0.04 + 0.04) = 0.04
  cases.push(pass('Draw case: [0.2,0.6,0.2] vs draw', rps([0.2, 0.6, 0.2], [0, 1, 0]), 0.04, 1e-9,
    'F_cum=[0.2,0.8], O_cum=[0,1] → 0.5*(0.04+0.04)=0.04'))

  // RANDOM_RPS constant sanity check
  cases.push(pass('RANDOM_RPS constant = 5/18', RANDOM_RPS, 5/18, 1e-9,
    'Static constant — computed vs homeWin only (biased baseline)'))

  return summarize('RPS', cases)
}

// ─── LogLoss Tests ───────────────────────────────────────────────────────────

export function testLogLoss(): TestSuite {
  const cases: TestCase[] = []

  // Perfect prediction
  // p clamped to 0.999 → LL = -log(0.999) ≈ 0.001
  const nearPerfect = -Math.log(0.999)
  cases.push(pass('Perfect homeWin prediction (clamped)', logLoss([1, 0, 0], [1, 0, 0]), nearPerfect, 1e-9,
    'p=1 clamped to 0.999 → -log(0.999)'))
  cases.push(pass('Perfect draw prediction (clamped)', logLoss([0, 1, 0], [0, 1, 0]), nearPerfect, 1e-9))

  // Worst case: predict certainty for wrong outcome
  // p=0 for winning outcome → clamped to 0.001 → LL = -log(0.001) ≈ 6.9
  const worstCase = -Math.log(0.001)
  cases.push(pass('Worst case: predict homeWin, awayWin occurs',
    logLoss([1, 0, 0], [0, 0, 1]), worstCase, 1e-9,
    '-log(0.001) ≈ 6.9 (p for occurring outcome is 0 → clamped to 0.001)'))

  // Uniform predictor: LL = -log(1/3) ≈ 1.0986
  const uniformLL = -Math.log(1/3)
  cases.push(pass('Uniform vs homeWin', logLoss([1/3, 1/3, 1/3], [1, 0, 0]), uniformLL, 1e-9))
  cases.push(pass('Uniform vs draw', logLoss([1/3, 1/3, 1/3], [0, 1, 0]), uniformLL, 1e-9))

  return summarize('LogLoss', cases)
}

// ─── Brier Score Tests ────────────────────────────────────────────────────────

export function testBrierScore(): TestSuite {
  const cases: TestCase[] = []

  // Perfect prediction: all squared diffs = 0
  cases.push(pass('Perfect homeWin', brierScore([1, 0, 0], [1, 0, 0]), 0))
  cases.push(pass('Perfect draw', brierScore([0, 1, 0], [0, 1, 0]), 0))
  cases.push(pass('Perfect awayWin', brierScore([0, 0, 1], [0, 0, 1]), 0))

  // Worst case: predict homeWin, awayWin occurs
  // ((1-0)^2 + (0-0)^2 + (0-1)^2) / 3 = (1+0+1)/3 = 2/3
  cases.push(pass('Worst case homeWin vs awayWin', brierScore([1, 0, 0], [0, 0, 1]), 2/3, 1e-9))

  // Uniform predictor: ((1/3-1)^2 + (1/3-0)^2 + (1/3-0)^2) / 3 = (4/9+1/9+1/9)/3 = (6/9)/3 = 2/9
  cases.push(pass('Uniform vs homeWin', brierScore([1/3, 1/3, 1/3], [1, 0, 0]), 2/9, 1e-9))
  // Draw: ((1/3-0)^2 + (1/3-1)^2 + (1/3-0)^2) / 3 = same = 2/9
  cases.push(pass('Uniform vs draw', brierScore([1/3, 1/3, 1/3], [0, 1, 0]), 2/9, 1e-9))

  // [0.2, 0.6, 0.2] vs draw: ((0.04+0.16+0.04)/3 = 0.24/3 = 0.08
  cases.push(pass('Draw case [0.2,0.6,0.2]', brierScore([0.2, 0.6, 0.2], [0, 1, 0]), 0.08, 1e-9))

  return summarize('BrierScore', cases)
}

// ─── Dynamic Baseline Tests ───────────────────────────────────────────────────

export function testBaseline(): TestSuite {
  const cases: TestCase[] = []

  // All homeWins → baseline = 5/18
  cases.push(pass('All homeWins → 5/18', computeDatasetBaselineRPS([[1,0,0],[1,0,0],[1,0,0]]), 5/18, 1e-9))

  // All draws → baseline = 1/9
  cases.push(pass('All draws → 1/9', computeDatasetBaselineRPS([[0,1,0],[0,1,0]]), 1/9, 1e-9))

  // All awayWins → baseline = 5/18
  cases.push(pass('All awayWins → 5/18', computeDatasetBaselineRPS([[0,0,1],[0,0,1]]), 5/18, 1e-9))

  // Equal mix (1 homeWin, 1 draw, 1 awayWin): (5/18 + 1/9 + 5/18) / 3 = (10/18+2/18)/3 = 12/54 = 2/9
  cases.push(pass('Equal mix → 2/9',
    computeDatasetBaselineRPS([[1,0,0],[0,1,0],[0,0,1]]), 2/9, 1e-9,
    '(5/18 + 1/9 + 5/18) / 3 = 2/9 ≈ 0.2222'))

  // Static RANDOM_RPS != dataset baseline for draws
  cases.push(passStr('RANDOM_RPS ≠ dataset baseline for draws (detects bias)',
    !approx(RANDOM_RPS, computeDatasetBaselineRPS([[0,1,0]]), 0.001), true,
    '5/18 ≠ 1/9 — confirms static constant is biased toward homeWins'))

  return summarize('Baseline', cases)
}

// ─── ECE Tests ───────────────────────────────────────────────────────────────

export function testECE(): TestSuite {
  const cases: TestCase[] = []

  // Perfect calibration: predicted 0.7 for homeWin, homeWin occurs
  // All predictions in [0.65, 0.75) bin. 100% actual = 1.0, predicted avg ≈ 0.7
  // If all 10 predictions are [0.7, 0.15, 0.15] with homeWin:
  // W-bin: center 0.75, pred=0.7, actual=1.0 → error = 0.3 (but all in that bin)
  // This tests that ECE increases with miscalibration
  const wellCalibrated = computeECE(
    Array(20).fill([0.6, 0.2, 0.2] as [number,number,number]),
    Array(20).fill([1,  0,   0  ] as [number,number,number])
  )
  // The homeWin prediction of 0.6 but actual rate is 1.0 → miscalibrated
  // Just test it returns a positive value
  cases.push(passStr('ECE > 0 for miscalibrated predictions', wellCalibrated.ece > 0, true))

  // Perfect calibration: uniform predictions with mixed outcomes
  const perfectMix = computeECE(
    [[1/3,1/3,1/3],[1/3,1/3,1/3],[1/3,1/3,1/3]],
    [[1,0,0],[0,1,0],[0,0,1]]
  )
  // All probabilities = 1/3, all outcomes occur equally → actual ≈ predicted → low ECE
  cases.push(passStr('ECE ≈ 0 for uniform predictions with balanced outcomes', perfectMix.ece < 0.05, true))

  // Empty input returns ece = 0
  const empty = computeECE([], [])
  cases.push(pass('Empty input ECE = 0', empty.ece, 0))

  // MCE ≥ ECE always
  const r = computeECE(
    [[0.9,0.05,0.05],[0.1,0.8,0.1],[0.1,0.1,0.8]],
    [[1,0,0],[0,1,0],[0,0,1]]
  )
  cases.push(passStr('MCE ≥ ECE', r.mce >= r.ece, true))

  return summarize('ECE', cases)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function summarize(name: string, cases: TestCase[]): TestSuite {
  return {
    name,
    cases,
    passed: cases.filter(c => c.passed).length,
    failed: cases.filter(c => !c.passed).length,
  }
}

export function runAllTests(): TestSuite[] {
  return [
    testRPS(),
    testLogLoss(),
    testBrierScore(),
    testBaseline(),
    testECE(),
  ]
}
