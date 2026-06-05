/**
 * Parameter Calibration for validated core factors.
 *
 * Based on ablation results:
 *   MarketValue ΔRPS = -0.0020, CI95 = [-0.0035, -0.0005] → confirmed
 *   Heritage    ΔRPS = -0.0002, CI95 crosses 0 → not confirmed
 *   Dixon-Coles improves ECE slightly but not RPS
 *
 * This module fine-tunes the weights of confirmed factors via walk-forward
 * cross-validation to find robust (not in-sample-optimal) values.
 */

import { ALL_HISTORICAL_MATCHES, HISTORICAL_MATCHES, type HistoricalMatch } from '@/src/data/historicalResults'
import { rps, logLoss, brierScore, computeECE, computeDatasetBaselineRPS } from '@/lib/model/evaluation'
import { corePredict, type CoreTeamData } from '@/lib/model/corePredict'
import { getHistoricalSnapshot } from '@/src/data/historicalSnapshots'
import { bootstrapDelta, type BootstrapResult } from '@/lib/bootstrap'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParamPoint {
  marketValueWeight: number
  heritageScale: number
  rho: number
}

export interface ParamEvalResult extends ParamPoint {
  rps: number
  logLoss: number
  brier: number
  ece: number
  drawCalibration: number   // drawPredAvg - actual drawRate
  correctTendency: number
  baselineRPS: number
  skillScore: number
  matchCount: number
  perTournamentRps: Record<string, number>
}

export interface SweepResult {
  grid: ParamEvalResult[]
  best: ParamEvalResult
  baseline: ParamEvalResult   // current config
}

export interface WalkForwardParamResult extends ParamPoint {
  folds: Array<{
    trainTournaments: string[]
    testTournament: string
    trainRPS: number
    testRPS: number
    overfit: number
    baselineRPS: number
    skillScore: number
  }>
  avgTestRPS: number
  avgOverfit: number
  conclusion: 'ok' | 'mild_overfit' | 'overfit'
}

export interface CalibratedConfig {
  marketValueWeight: number
  heritageScale: number
  rho: number
  inSampleRPS: number
  oosRPS: number
  avgOverfit: number
  bootstrap: BootstrapResult
  recommendation: string
  version: string
  boundaryWarning: BoundaryCheck
  stabilityStd: number  // std dev of per-fold OOS RPS (lower = more stable)
}

// ─── Sweep grids ─────────────────────────────────────────────────────────────

export const MV_WEIGHTS      = [0.00, 0.02, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.25, 0.30]
export const HERITAGE_SCALES = [0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 2.00]
export const RHO_VALUES      = [0.00, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10]

export interface BoundaryCheck {
  mv: boolean; heritage: boolean; rho: boolean; any: boolean; warnings: string[]
}

export function checkBoundary(p: ParamPoint): BoundaryCheck {
  const mv       = p.marketValueWeight >= MV_WEIGHTS[MV_WEIGHTS.length - 1] || p.marketValueWeight <= MV_WEIGHTS[0]
  const heritage = p.heritageScale >= HERITAGE_SCALES[HERITAGE_SCALES.length - 1] || p.heritageScale <= HERITAGE_SCALES[0]
  const rho      = p.rho >= RHO_VALUES[RHO_VALUES.length - 1] || p.rho <= RHO_VALUES[0]
  const warnings: string[] = []
  if (mv)       warnings.push(`marketValueWeight=${p.marketValueWeight} liegt am Rand [${MV_WEIGHTS[0]}–${MV_WEIGHTS[MV_WEIGHTS.length-1]}]`)
  if (heritage) warnings.push(`heritageScale=${p.heritageScale} liegt am Rand [${HERITAGE_SCALES[0]}–${HERITAGE_SCALES[HERITAGE_SCALES.length-1]}]`)
  if (rho)      warnings.push(`rho=${p.rho} liegt am Rand [${RHO_VALUES[0]}–${RHO_VALUES[RHO_VALUES.length-1]}]`)
  return { mv, heritage, rho, any: mv || heritage || rho, warnings }
}

// ─── Team resolution (historical ELO + snapshot) ─────────────────────────────

const SNAP_TOURN_MAP: Record<string, string> = {
  WM2022: 'WC2022', WM2018: 'WC2018', WM2014: 'WC2014', EURO2024: 'EURO2024',
}

function makeHistoricalTeam(
  teamName: string,
  elo: number,
  tournament: HistoricalMatch['tournament'],
  mvWeight: number,
  hScale: number
): CoreTeamData {
  const snapId = SNAP_TOURN_MAP[tournament] as any
  const snap = getHistoricalSnapshot(teamName, snapId)
  return {
    eloRating: elo,
    squadMarketValueM: snap?.marketValueM ?? 200,
    worldCupTitles:    snap?.worldCupTitles ?? 0,
    worldCupAppearances: snap?.worldCupAppearances ?? 5,
    attackRating: 70, defenseRating: 70, setPieceRating: 70,
    confederation: 'UEFA',
  }
}

// ─── Core fast evaluator ─────────────────────────────────────────────────────

export function evalParamSet(
  matches: HistoricalMatch[],
  p: ParamPoint
): ParamEvalResult {
  const params = {
    useManualRatings: false,
    useMarketValue:   p.marketValueWeight > 0,
    useHeritage:      p.heritageScale > 0,
    marketValueWeight: p.marketValueWeight,
    heritageScale:    p.heritageScale,
    rho:              p.rho,
  }

  let totalRPS = 0, totalLL = 0, totalBrier = 0
  let correct = 0, n = 0, drawCount = 0, drawPredSum = 0
  const allPreds: [number, number, number][] = []
  const allObs:   [number, number, number][] = []
  const tourRPS:  Record<string, number[]>  = {}
  const rpsPairs: Array<[number, number]>   = []

  for (const m of matches) {
    if (!m.homeElo || !m.awayElo) continue

    const teamA = makeHistoricalTeam(m.homeTeam, m.homeElo, m.tournament, p.marketValueWeight, p.heritageScale)
    const teamB = makeHistoricalTeam(m.awayTeam, m.awayElo, m.tournament, p.marketValueWeight, p.heritageScale)

    const [pW, pD, pL] = corePredict(teamA, teamB, {}, {}, params)
    const pred: [number, number, number] = [pW, pD, pL]

    const outcome: 'W' | 'D' | 'L' = m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const obs: [number, number, number] = outcome === 'W' ? [1,0,0] : outcome === 'D' ? [0,1,0] : [0,0,1]

    const r = rps(pred, obs)
    totalRPS   += r
    totalLL    += logLoss(pred, obs)
    totalBrier += brierScore(pred, obs)
    allPreds.push(pred)
    allObs.push(obs)
    n++

    if (outcome === 'D') drawCount++
    drawPredSum += pD

    const maxP = Math.max(pW, pD, pL)
    const tip = maxP === pW ? '1' : maxP === pD ? 'X' : '2'
    if ((tip === '1' && outcome === 'W') || (tip === 'X' && outcome === 'D') || (tip === '2' && outcome === 'L')) correct++

    if (!tourRPS[m.tournament]) tourRPS[m.tournament] = []
    tourRPS[m.tournament].push(r)
  }

  if (n === 0) return {
    ...p, rps: 1, logLoss: 10, brier: 1, ece: 1, drawCalibration: 0,
    correctTendency: 0, baselineRPS: 0.222, skillScore: -1, matchCount: 0,
    perTournamentRps: {},
  }

  const avgRPS = totalRPS / n
  const baseline = computeDatasetBaselineRPS(allObs)
  const ece = computeECE(allPreds, allObs).ece
  const perTournamentRps: Record<string, number> = {}
  for (const [t, vals] of Object.entries(tourRPS)) {
    perTournamentRps[t] = vals.reduce((s, v) => s + v, 0) / vals.length
  }

  return {
    ...p,
    rps: avgRPS,
    logLoss: totalLL / n,
    brier: totalBrier / n,
    ece,
    drawCalibration: drawPredSum / n - drawCount / n,
    correctTendency: correct / n,
    baselineRPS: baseline,
    skillScore: baseline > 0 ? (baseline - avgRPS) / baseline : 0,
    matchCount: n,
    perTournamentRps,
  }
}

// ─── Walk-forward for a single param set ─────────────────────────────────────

export function walkForwardEval(
  p: ParamPoint
): WalkForwardParamResult {
  const datasets: Array<{ train: HistoricalMatch[]; test: HistoricalMatch[]; trainLabels: string[]; testLabel: string }> = [
    {
      train: ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2014'),
      test:  ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2018'),
      trainLabels: ['WM2014'], testLabel: 'WM2018',
    },
    {
      train: ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2014' || m.tournament === 'WM2018'),
      test:  ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2022'),
      trainLabels: ['WM2014', 'WM2018'], testLabel: 'WM2022',
    },
    {
      train: ALL_HISTORICAL_MATCHES.filter(m => m.tournament !== 'EURO2024'),
      test:  ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'EURO2024'),
      trainLabels: ['WM2014', 'WM2018', 'WM2022'], testLabel: 'EURO2024',
    },
  ]

  const folds = datasets.map(d => {
    const trainRes = evalParamSet(d.train, p)
    const testRes  = evalParamSet(d.test,  p)
    return {
      trainTournaments: d.trainLabels,
      testTournament: d.testLabel,
      trainRPS: trainRes.rps,
      testRPS:  testRes.rps,
      overfit:  testRes.rps - trainRes.rps,
      baselineRPS: testRes.baselineRPS,
      skillScore: testRes.skillScore,
    }
  })

  const avgTestRPS  = folds.reduce((s, f) => s + f.testRPS,  0) / folds.length
  const avgOverfit  = folds.reduce((s, f) => s + f.overfit,  0) / folds.length
  const conclusion: WalkForwardParamResult['conclusion'] =
    avgOverfit > 0.02 ? 'overfit' : avgOverfit > 0.005 ? 'mild_overfit' : 'ok'

  return { ...p, folds, avgTestRPS, avgOverfit, conclusion }
}

// ─── 1-D sweeps ──────────────────────────────────────────────────────────────

export function sweepMarketValueWeight(
  matches: HistoricalMatch[],
  fixedHeritage: number = 0.0,
  fixedRho: number = MODEL_META.dixonColesRho
): SweepResult {
  const grid = MV_WEIGHTS.map(w => evalParamSet(matches, {
    marketValueWeight: w, heritageScale: fixedHeritage, rho: fixedRho,
  }))
  grid.sort((a, b) => a.rps - b.rps)
  const baseline = evalParamSet(matches, {
    marketValueWeight: MODEL_WEIGHTS.marketValueLog,
    heritageScale: 1.0, rho: MODEL_META.dixonColesRho,
  })
  return { grid, best: grid[0], baseline }
}

export function sweepHeritageScale(
  matches: HistoricalMatch[],
  fixedMvWeight: number,
  fixedRho: number = MODEL_META.dixonColesRho
): SweepResult {
  const grid = HERITAGE_SCALES.map(h => evalParamSet(matches, {
    marketValueWeight: fixedMvWeight, heritageScale: h, rho: fixedRho,
  }))
  grid.sort((a, b) => a.rps - b.rps)
  const baseline = evalParamSet(matches, {
    marketValueWeight: MODEL_WEIGHTS.marketValueLog,
    heritageScale: 1.0, rho: MODEL_META.dixonColesRho,
  })
  return { grid, best: grid[0], baseline }
}

export function sweepRho(
  matches: HistoricalMatch[],
  fixedMvWeight: number,
  fixedHeritage: number = 0.0
): SweepResult {
  const grid = RHO_VALUES.map(rho => evalParamSet(matches, {
    marketValueWeight: fixedMvWeight, heritageScale: fixedHeritage, rho,
  }))
  grid.sort((a, b) => a.rps - b.rps)
  const baseline = evalParamSet(matches, {
    marketValueWeight: MODEL_WEIGHTS.marketValueLog,
    heritageScale: 1.0, rho: MODEL_META.dixonColesRho,
  })
  return { grid, best: grid[0], baseline }
}

// ─── Combined grid search ─────────────────────────────────────────────────────

export function combinedGridSearch(
  matches: HistoricalMatch[],
  topN = 20
): {
  grid: ParamEvalResult[]
  topByRPS: ParamEvalResult[]
  topByECE: ParamEvalResult[]
  current: ParamEvalResult
} {
  const grid: ParamEvalResult[] = []

  for (const mvW of MV_WEIGHTS) {
    for (const hS of HERITAGE_SCALES) {
      for (const rho of RHO_VALUES) {
        grid.push(evalParamSet(matches, { marketValueWeight: mvW, heritageScale: hS, rho }))
      }
    }
  }

  const topByRPS = [...grid].sort((a, b) => a.rps  - b.rps).slice(0, topN)
  const topByECE = [...grid].sort((a, b) => a.ece  - b.ece).slice(0, topN)
  const current  = evalParamSet(matches, {
    marketValueWeight: MODEL_WEIGHTS.marketValueLog,
    heritageScale: 1.0,
    rho: MODEL_META.dixonColesRho,
  })

  return { grid, topByRPS, topByECE, current }
}

// ─── Bootstrap for top configs ────────────────────────────────────────────────

export function bootstrapTopConfigs(
  matches: HistoricalMatch[],
  configs: ParamPoint[],
  baselineConfig: ParamPoint,
  nBoot = 2000
): Array<ParamPoint & { rps: number; bootstrap: BootstrapResult }> {
  const baselinePerMatch: number[] = []
  for (const m of matches) {
    if (!m.homeElo || !m.awayElo) continue
    const teamA = makeHistoricalTeam(m.homeTeam, m.homeElo, m.tournament, baselineConfig.marketValueWeight, baselineConfig.heritageScale)
    const teamB = makeHistoricalTeam(m.awayTeam, m.awayElo, m.tournament, baselineConfig.marketValueWeight, baselineConfig.heritageScale)
    const [pW, pD, pL] = corePredict(teamA, teamB, {}, {}, {
      useManualRatings: false, useMarketValue: baselineConfig.marketValueWeight > 0,
      useHeritage: baselineConfig.heritageScale > 0,
      marketValueWeight: baselineConfig.marketValueWeight,
      heritageScale: baselineConfig.heritageScale,
      rho: baselineConfig.rho,
    })
    const outcome: 'W' | 'D' | 'L' = m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const obs: [number, number, number] = outcome === 'W' ? [1,0,0] : outcome === 'D' ? [0,1,0] : [0,0,1]
    baselinePerMatch.push(rps([pW, pD, pL], obs))
  }

  return configs.map(cfg => {
    const cfgPerMatch: number[] = []
    for (const m of matches) {
      if (!m.homeElo || !m.awayElo) continue
      const teamA = makeHistoricalTeam(m.homeTeam, m.homeElo, m.tournament, cfg.marketValueWeight, cfg.heritageScale)
      const teamB = makeHistoricalTeam(m.awayTeam, m.awayElo, m.tournament, cfg.marketValueWeight, cfg.heritageScale)
      const [pW, pD, pL] = corePredict(teamA, teamB, {}, {}, {
        useManualRatings: false, useMarketValue: cfg.marketValueWeight > 0,
        useHeritage: cfg.heritageScale > 0,
        marketValueWeight: cfg.marketValueWeight,
        heritageScale: cfg.heritageScale,
        rho: cfg.rho,
      })
      const outcome: 'W' | 'D' | 'L' = m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
      const obs: [number, number, number] = outcome === 'W' ? [1,0,0] : outcome === 'D' ? [0,1,0] : [0,0,1]
      cfgPerMatch.push(rps([pW, pD, pL], obs))
    }
    const pairs: Array<[number, number]> = cfgPerMatch.map((r, i) => [r, baselinePerMatch[i]])
    const avgRPS = cfgPerMatch.reduce((s, v) => s + v, 0) / cfgPerMatch.length
    return {
      ...cfg,
      rps: avgRPS,
      bootstrap: bootstrapDelta(pairs, nBoot),
    }
  })
}

// ─── Recommend robust config ──────────────────────────────────────────────────

export function recommendRobustConfig(
  matches: HistoricalMatch[],
  topConfigs: ParamEvalResult[]
): CalibratedConfig {
  const eloBaseline: ParamPoint = { marketValueWeight: 0, heritageScale: 0, rho: 0 }

  // Walk-forward for top 20 candidates to get OOS metrics
  const candidates = topConfigs.slice(0, 20)
  const oosResults = candidates.map(c => {
    const wf = walkForwardEval(c)
    const foldRPS = wf.folds.map(f => f.testRPS)
    const mean = foldRPS.reduce((s, v) => s + v, 0) / foldRPS.length
    const std  = Math.sqrt(foldRPS.reduce((s, v) => s + (v - mean) ** 2, 0) / foldRPS.length)
    return { config: c, wf, stabilityStd: std }
  })

  // Remove configs with confirmed overfitting (OOS much worse than train)
  const nonOverfit = oosResults.filter(r => r.wf.conclusion !== 'overfit')
  const pool = nonOverfit.length >= 3 ? nonOverfit : oosResults

  // Sort by OOS RPS (lower = better)
  pool.sort((a, b) => a.wf.avgTestRPS - b.wf.avgTestRPS)

  // Among configs within 0.001 of best OOS-RPS, prefer simpler (lower weights = less overfit risk)
  const bestOOS = pool[0].wf.avgTestRPS
  const nearlyEqual = pool.filter(r => r.wf.avgTestRPS - bestOOS < 0.001)
  nearlyEqual.sort((a, b) => {
    const mvDiff = a.config.marketValueWeight - b.config.marketValueWeight
    if (Math.abs(mvDiff) > 0.001) return mvDiff
    const hDiff = a.config.heritageScale - b.config.heritageScale
    if (Math.abs(hDiff) > 0.001) return hDiff
    return a.config.rho - b.config.rho
  })

  const best = nearlyEqual[0]

  // Bootstrap against ELO-only baseline
  const bootResults = bootstrapTopConfigs(matches, [best.config], eloBaseline)
  const boot = bootResults[0]?.bootstrap ?? {
    delta: 0, ci95: [0, 0] as [number, number], ci99: [0, 0] as [number, number],
    pBetter: 0.5, nMatches: 0, nBoot: 2000, reliable: false, interpretation: '',
  }

  const boundary = checkBoundary(best.config)
  const mvWStr   = best.config.marketValueWeight.toFixed(2)
  const hSStr    = best.config.heritageScale.toFixed(2)
  const rhoStr   = best.config.rho.toFixed(2)

  return {
    marketValueWeight: best.config.marketValueWeight,
    heritageScale:     best.config.heritageScale,
    rho:               best.config.rho,
    inSampleRPS:       best.config.rps,
    oosRPS:            best.wf.avgTestRPS,
    avgOverfit:        best.wf.avgOverfit,
    bootstrap:         boot,
    recommendation:    `marketValueLog=${mvWStr}, heritageScale=${hSStr}, rho=${rhoStr}. OOS-RPS=${best.wf.avgTestRPS.toFixed(4)}, Overfit-Δ=${best.wf.avgOverfit.toFixed(4)}.`,
    version:           `v3.1-calibrated-mv${mvWStr}-h${hSStr}-rho${rhoStr}`,
    boundaryWarning:   boundary,
    stabilityStd:      best.stabilityStd,
  }
}
