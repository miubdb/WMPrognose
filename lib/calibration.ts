/**
 * Phase 6: Modell-Kalibrierung via Grid Search
 *
 * Grid Search über baseGoalRate × eloWeight × dixonColesRho
 * Optimierungsmetrik: RPS (Ranked Probability Score) minimieren
 * Datenbasis: WM 2022 Gruppenspiele (nur Teams die auch in WM 2026 sind)
 */

import { HISTORICAL_MATCHES, ALL_HISTORICAL_MATCHES, type HistoricalMatch } from '@/src/data/historicalResults'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { rps, logLoss, brierScore, RANDOM_RPS, computeDatasetBaselineRPS } from '@/lib/model/evaluation'
import { MODEL_META, MODEL_WEIGHTS } from '@/lib/model/config'
import { corePredict, type CoreTeamData, type MatchMotivation } from '@/lib/model/corePredict'

// ─── Name-zu-ID Mapping (aus evaluateModel.ts) ────────────────────────────────

const NAME_TO_ID: Record<string, string> = {
  'Germany': 'germany',
  'France': 'france',
  'Spain': 'spain',
  'Brazil': 'brazil',
  'Argentina': 'argentina',
  'England': 'england',
  'Portugal': 'portugal',
  'Netherlands': 'netherlands',
  'Belgium': 'belgium',
  'Croatia': 'croatia',
  'Denmark': 'denmark',
  'Switzerland': 'switzerland',
  'Uruguay': 'uruguay',
  'Mexico': 'mexico',
  'USA': 'usa',
  'Japan': 'japan',
  'South Korea': 'south_korea',
  'Australia': 'australia',
  'Canada': 'canada',
  'Morocco': 'morocco',
  'Senegal': 'senegal',
  'Ghana': 'ghana',
  'Cameroon': 'cameroon',
  'Tunisia': 'tunisia',
  'Ecuador': 'ecuador',
  'Poland': 'poland',
  'Serbia': 'serbia',
  'Iran': 'iran',
  'Qatar': 'qatar',
  'Saudi Arabia': 'saudi_arabia',
  'Costa Rica': 'costa_rica',
  'Wales': 'wales',
}

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface CalibrationResult {
  baseGoalRate: number
  eloWeight: number
  dixonColesRho: number
  rps: number
  logLoss: number
  brier: number
  matchesEvaluated: number
}

export interface CalibrationSummary {
  best: CalibrationResult
  baseline: { rps: number; logLoss: number; brier: number }
  skillScore: number  // (baseline.rps - best.rps) / baseline.rps * 100
  current: CalibrationResult  // aktuell konfigurierte Werte
  top10: CalibrationResult[]
}

// ─── Walk-Forward Typen ───────────────────────────────────────────────────────

export interface WalkForwardFold {
  trainTournaments: string[]
  testTournament: string
  trainMatches: number
  testMatches: number
  bestParams: { baseGoalRate: number; eloWeight: number; dixonColesRho: number }
  trainRPS: number  // in-sample (best params on training data)
  testRPS: number   // out-of-sample
  testLogLoss: number
  testBrier: number
  baselineRPS: number
  skillScore: number
  overfit: number   // testRPS - trainRPS (positive = overfit)
}

export interface WalkForwardResult {
  folds: WalkForwardFold[]
  avgOosRPS: number
  avgTrainRPS: number
  avgOosSkillScore: number
  conclusion: 'ok' | 'mild_overfit' | 'overfit'
}

// ─── Vorberechnete Match-Daten aus historischen Ergebnissen ──────────────────

interface PreparedMatch {
  teamA: CoreTeamData
  teamB: CoreTeamData
  motivation: MatchMotivation
  outcome: 'W' | 'D' | 'L'
  observed: [number, number, number]
}

function prepareMatches(): PreparedMatch[] {
  const result: PreparedMatch[] = []

  for (const m of HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2022')) {
    const homeId = NAME_TO_ID[m.homeTeam]
    const awayId = NAME_TO_ID[m.awayTeam]
    if (!homeId || !awayId) continue

    const homeTeam = TEAM_BY_ID[homeId]
    const awayTeam = TEAM_BY_ID[awayId]
    if (!homeTeam || !awayTeam) continue

    const outcome: 'W' | 'D' | 'L' =
      m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const observed: [number, number, number] =
      outcome === 'W' ? [1, 0, 0] : outcome === 'D' ? [0, 1, 0] : [0, 0, 1]

    result.push({
      teamA: homeTeam,
      teamB: awayTeam,
      motivation: {
        alreadyThroughA: m.alreadyThroughHome ?? false,
        alreadyThroughB: m.alreadyThroughAway ?? false,
        mustWinA: m.mustWinHome ?? false,
        mustWinB: m.mustWinAway ?? false,
      },
      outcome,
      observed,
    })
  }

  return result
}

// ─── Einzelner Parameter-Satz evaluieren ─────────────────────────────────────

function evaluateParams(
  matches: PreparedMatch[],
  baseGoalRate: number,
  eloWeight: number,
  rho: number
): { rps: number; logLoss: number; brier: number; matchesEvaluated: number } {
  let totalRPS = 0
  let totalLogLoss = 0
  let totalBrier = 0

  for (const m of matches) {
    const [winA, draw, winB] = corePredict(m.teamA, m.teamB, m.motivation, {}, { baseGoalRate, eloWeight, rho })

    const predicted: [number, number, number] = [winA, draw, winB]
    totalRPS += rps(predicted, m.observed)
    totalLogLoss += logLoss(predicted, m.observed)
    totalBrier += brierScore(predicted, m.observed)
  }

  const n = matches.length
  return {
    rps: n > 0 ? totalRPS / n : 0,
    logLoss: n > 0 ? totalLogLoss / n : 0,
    brier: n > 0 ? totalBrier / n : 0,
    matchesEvaluated: n,
  }
}

// ─── Grid Search ──────────────────────────────────────────────────────────────

const BASE_GOAL_RATES = [1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50]
const ELO_WEIGHTS    = [0.0003, 0.0004, 0.0005, 0.0006, 0.0007, 0.0008]
const DIXON_COLES_RHOS = [0.04, 0.06, 0.08, 0.10, 0.12]

export function runGridSearch(): CalibrationSummary {
  const matches = prepareMatches()
  const results: CalibrationResult[] = []

  for (const baseGoalRate of BASE_GOAL_RATES) {
    for (const eloWeight of ELO_WEIGHTS) {
      for (const rho of DIXON_COLES_RHOS) {
        const metrics = evaluateParams(matches, baseGoalRate, eloWeight, rho)
        results.push({
          baseGoalRate,
          eloWeight,
          dixonColesRho: rho,
          rps: metrics.rps,
          logLoss: metrics.logLoss,
          brier: metrics.brier,
          matchesEvaluated: metrics.matchesEvaluated,
        })
      }
    }
  }

  // Nach RPS aufsteigend sortieren (niedrigerer RPS = besser)
  results.sort((a, b) => a.rps - b.rps)

  const best = results[0]
  const top10 = results.slice(0, 10)

  // Baseline: Gleichverteilung 1/3 für alle Spiele
  const baselineRPS = RANDOM_RPS  // = 0.25 (rps([1/3,1/3,1/3],[1,0,0]))

  // Basis-LogLoss und Basis-Brier berechnen
  const baselineLogLoss = logLoss([1/3, 1/3, 1/3], [1, 0, 0])
  const baselineBrier = brierScore([1/3, 1/3, 1/3], [1, 0, 0])

  const skillScore = baselineRPS > 0
    ? (baselineRPS - best.rps) / baselineRPS * 100
    : 0

  // Aktuelle Konfiguration evaluieren
  const currentMetrics = evaluateParams(
    matches,
    MODEL_META.baseGoalRate,
    MODEL_WEIGHTS.elo,
    MODEL_META.dixonColesRho
  )
  const current: CalibrationResult = {
    baseGoalRate: MODEL_META.baseGoalRate,
    eloWeight: MODEL_WEIGHTS.elo,
    dixonColesRho: MODEL_META.dixonColesRho,
    rps: currentMetrics.rps,
    logLoss: currentMetrics.logLoss,
    brier: currentMetrics.brier,
    matchesEvaluated: currentMetrics.matchesEvaluated,
  }

  return {
    best,
    baseline: {
      rps: baselineRPS,
      logLoss: baselineLogLoss,
      brier: baselineBrier,
    },
    skillScore,
    current,
    top10,
  }
}

// ─── Walk-Forward Validation ──────────────────────────────────────────────────

// Extended name map including non-WM2026 teams (null = use historical ELO)
const NAME_TO_ID_ALL: Record<string, string | null> = {
  ...NAME_TO_ID,
  'Denmark': null, 'Cameroon': null, 'Poland': null, 'Serbia': null,
  'Costa Rica': null, 'Wales': null, 'Russia': null, 'Peru': null,
  'Iceland': null, 'Panama': null, 'Italy': null, 'Greece': null,
  'Honduras': null, 'Bosnia': null,
  'Egypt': 'egypt', 'Nigeria': 'nigeria', 'Sweden': 'sweden',
  'Colombia': 'colombia', 'Chile': 'chile', 'Ivory Coast': 'ivory_coast',
  'Algeria': 'algeria',
}

function makeMinimalCoreTeam(elo: number): CoreTeamData {
  return {
    eloRating: elo,
    squadMarketValueM: 200,
    worldCupTitles: 0,
    worldCupAppearances: 5,
    attackRating: 70,
    defenseRating: 70,
    setPieceRating: 70,
    confederation: 'UEFA',
  }
}

function prepareMatchesFromList(matches: HistoricalMatch[]): PreparedMatch[] {
  const result: PreparedMatch[] = []

  for (const m of matches) {
    const homeId = NAME_TO_ID_ALL[m.homeTeam]
    const awayId = NAME_TO_ID_ALL[m.awayTeam]
    // Unknown team name → skip
    if (homeId === undefined || awayId === undefined) continue

    // Resolve team: WM2026 data if available, else historical ELO
    const homeTeam: CoreTeamData | null =
      (homeId !== null && TEAM_BY_ID[homeId]) ? TEAM_BY_ID[homeId]! :
      (m.homeElo !== undefined ? makeMinimalCoreTeam(m.homeElo) : null)
    const awayTeam: CoreTeamData | null =
      (awayId !== null && TEAM_BY_ID[awayId]) ? TEAM_BY_ID[awayId]! :
      (m.awayElo !== undefined ? makeMinimalCoreTeam(m.awayElo) : null)

    if (!homeTeam || !awayTeam) continue

    const outcome: 'W' | 'D' | 'L' =
      m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const observed: [number, number, number] =
      outcome === 'W' ? [1, 0, 0] : outcome === 'D' ? [0, 1, 0] : [0, 0, 1]

    result.push({
      teamA: homeTeam,
      teamB: awayTeam,
      motivation: {
        alreadyThroughA: m.alreadyThroughHome ?? false,
        alreadyThroughB: m.alreadyThroughAway ?? false,
        mustWinA: m.mustWinHome ?? false,
        mustWinB: m.mustWinAway ?? false,
      },
      outcome,
      observed,
    })
  }

  return result
}

function gridSearchOnMatches(matches: PreparedMatch[]): { best: { baseGoalRate: number; eloWeight: number; rho: number }; trainRPS: number } {
  let bestRPS = Infinity
  let best: { baseGoalRate: number; eloWeight: number; rho: number } = { baseGoalRate: MODEL_META.baseGoalRate, eloWeight: MODEL_WEIGHTS.elo, rho: MODEL_META.dixonColesRho }

  for (const baseGoalRate of BASE_GOAL_RATES) {
    for (const eloWeight of ELO_WEIGHTS) {
      for (const rho of DIXON_COLES_RHOS) {
        const m = evaluateParams(matches, baseGoalRate, eloWeight, rho)
        if (m.rps < bestRPS) {
          bestRPS = m.rps
          best = { baseGoalRate, eloWeight, rho }
        }
      }
    }
  }
  return { best, trainRPS: bestRPS }
}

/**
 * Walk-forward (expanding window) validation:
 *   Fold 1: Train on WM2014 → Test on WM2018
 *   Fold 2: Train on WM2014 + WM2018 → Test on WM2022
 *   Fold 3: Train on WM2014 + WM2018 + WM2022 → Test on EURO2024
 *
 * All folds use historical ELO only (no WM2026 data, no manual ratings).
 * OOS RPS significantly above in-sample RPS signals overfitting.
 *
 * Note: Fold 3 crosses format boundaries (WM → EURO). Treat with caution.
 */
export function runWalkForwardCalibration(): WalkForwardResult {
  const wm2014  = ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2014')
  const wm2018  = ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2018')
  const wm2022  = ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'WM2022')
  const euro24  = ALL_HISTORICAL_MATCHES.filter(m => m.tournament === 'EURO2024')

  const folds: WalkForwardFold[] = []

  function makeFold(
    trainMatches: HistoricalMatch[],
    testMatches: HistoricalMatch[],
    trainTournaments: string[],
    testTournament: string
  ) {
    const train = prepareMatchesFromList(trainMatches)
    const test  = prepareMatchesFromList(testMatches)
    if (train.length === 0 || test.length === 0) return

    const { best: p, trainRPS: tr } = gridSearchOnMatches(train)
    const oos = evaluateParams(test, p.baseGoalRate, p.eloWeight, p.rho)

    // Compute dynamic baseline for this test set
    const testObserved: [number, number, number][] = testMatches.map(m =>
      m.homeGoals > m.awayGoals ? [1,0,0] : m.homeGoals === m.awayGoals ? [0,1,0] : [0,0,1]
    )
    const dynamicBaseline = computeDatasetBaselineRPS(testObserved)

    folds.push({
      trainTournaments,
      testTournament,
      trainMatches: train.length,
      testMatches:  test.length,
      bestParams:   { baseGoalRate: p.baseGoalRate, eloWeight: p.eloWeight, dixonColesRho: p.rho },
      trainRPS:     tr,
      testRPS:      oos.rps,
      testLogLoss:  oos.logLoss,
      testBrier:    oos.brier,
      baselineRPS:  dynamicBaseline,
      skillScore:   dynamicBaseline > 0 ? (dynamicBaseline - oos.rps) / dynamicBaseline * 100 : 0,
      overfit:      oos.rps - tr,
    })
  }

  makeFold(wm2014,                          wm2018,  ['WM2014'],                   'WM2018')
  makeFold([...wm2014, ...wm2018],          wm2022,  ['WM2014', 'WM2018'],         'WM2022')
  makeFold([...wm2014, ...wm2018, ...wm2022], euro24, ['WM2014', 'WM2018', 'WM2022'], 'EURO2024')

  const avgOosRPS       = folds.length > 0 ? folds.reduce((s, f) => s + f.testRPS,    0) / folds.length : 0
  const avgTrainRPS     = folds.length > 0 ? folds.reduce((s, f) => s + f.trainRPS,   0) / folds.length : 0
  const avgOosSkillScore = folds.length > 0 ? folds.reduce((s, f) => s + f.skillScore, 0) / folds.length : 0
  const avgOverfit      = folds.length > 0 ? folds.reduce((s, f) => s + f.overfit,    0) / folds.length : 0
  const conclusion: WalkForwardResult['conclusion'] = avgOverfit > 0.02 ? 'overfit' : avgOverfit > 0.005 ? 'mild_overfit' : 'ok'

  return { folds, avgOosRPS, avgTrainRPS, avgOosSkillScore, conclusion }
}
