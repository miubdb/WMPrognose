/**
 * Phase 6: Modell-Kalibrierung via Grid Search
 *
 * Grid Search über baseGoalRate × eloWeight × dixonColesRho
 * Optimierungsmetrik: RPS (Ranked Probability Score) minimieren
 * Datenbasis: WM 2022 Gruppenspiele (nur Teams die auch in WM 2026 sind)
 */

import { HISTORICAL_MATCHES } from '@/src/data/historicalResults'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { computeScorelineMatrix } from '@/src/model/poisson'
import { aggregateOutcomeProbabilities } from '@/src/model/dixonColes'
import { rps, logLoss, brierScore, RANDOM_RPS } from '@/lib/model/evaluation'
import { clampLogEffect } from '@/lib/model/logLambda'
import { MODEL_META, MODEL_WEIGHTS } from '@/lib/model/config'

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

// ─── Dixon-Coles Korrekturfunktion mit überschreibbarem rho ──────────────────

function dixonColesFactor(
  goalsA: number,
  goalsB: number,
  lambdaA: number,
  lambdaB: number,
  rho: number
): number {
  if (goalsA === 0 && goalsB === 0) return 1 - rho * lambdaA * lambdaB
  if (goalsA === 0 && goalsB === 1) return 1 + rho * lambdaA
  if (goalsA === 1 && goalsB === 0) return 1 + rho * lambdaB
  if (goalsA === 1 && goalsB === 1) return 1 - rho
  return 1.0
}

function applyDixonColesCorrectionWithRho(
  matrix: { goalsA: number; goalsB: number; probability: number }[][],
  lambdaA: number,
  lambdaB: number,
  rho: number
): { goalsA: number; goalsB: number; probability: number }[][] {
  const corrected: { goalsA: number; goalsB: number; probability: number }[][] = []
  let totalProb = 0

  for (let a = 0; a < matrix.length; a++) {
    corrected[a] = []
    for (let b = 0; b < matrix[a].length; b++) {
      const factor = dixonColesFactor(a, b, lambdaA, lambdaB, rho)
      const newProb = matrix[a][b].probability * factor
      corrected[a][b] = { goalsA: a, goalsB: b, probability: newProb }
      totalProb += newProb
    }
  }

  if (totalProb > 0) {
    for (let a = 0; a < corrected.length; a++) {
      for (let b = 0; b < corrected[a].length; b++) {
        corrected[a][b].probability /= totalProb
      }
    }
  }

  return corrected
}

// ─── Schnelle Prognose-Funktion mit überschreibbaren Parametern ───────────────

const LOG_LAMBDA_MIN = Math.log(0.3)
const LOG_LAMBDA_MAX = Math.log(4.0)

function quickPredict(
  eloDiffAminusB: number,
  mvRatio: number,       // log10(mvA/mvB)
  expDiff: number,       // expA - expB (titles*3 + appearances)
  attackDiffA: number,   // (attackA - defB) / 100
  attackDiffB: number,   // (attackB - defA) / 100
  baseGoalRate: number,
  eloWeight: number,
  rho: number
): { winA: number; draw: number; winB: number } {
  // ELO-Effekt (mit überschriebenem Gewicht)
  const eloLogA = clampLogEffect(eloWeight * eloDiffAminusB, 0.25)

  // Marktwert-Effekt (fixes Gewicht aus MODEL_WEIGHTS)
  const mvLogA = clampLogEffect(MODEL_WEIGHTS.marketValueLog * mvRatio)

  // Erfahrungs-Effekt (fixes Gewicht)
  const expLogA = clampLogEffect(MODEL_WEIGHTS.experience * expDiff)

  // Angriff vs. Abwehr (fixes Gewicht)
  const attackLogA = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffA)
  const attackLogB = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffB)

  // log(lambda) berechnen
  const logLambdaA = Math.log(baseGoalRate) + eloLogA + mvLogA + expLogA + attackLogA
  const logLambdaB = Math.log(baseGoalRate) + (-eloLogA) + (-mvLogA) + (-expLogA) + attackLogB

  const xgA = Math.exp(Math.max(LOG_LAMBDA_MIN, Math.min(LOG_LAMBDA_MAX, logLambdaA)))
  const xgB = Math.exp(Math.max(LOG_LAMBDA_MIN, Math.min(LOG_LAMBDA_MAX, logLambdaB)))

  // Poisson Score-Matrix
  const rawMatrix = computeScorelineMatrix(xgA, xgB)

  // Dixon-Coles mit überschriebenem rho
  const correctedMatrix = applyDixonColesCorrectionWithRho(rawMatrix, xgA, xgB, rho)

  return aggregateOutcomeProbabilities(correctedMatrix)
}

// ─── Vorberechnete Match-Daten aus historischen Ergebnissen ──────────────────

interface PreparedMatch {
  homeId: string
  awayId: string
  eloDiff: number     // homeElo - awayElo
  mvRatio: number     // log10(mvHome / mvAway)
  expDiff: number
  attackDiffA: number // (homeAttack - awayDefense) / 100
  attackDiffB: number // (awayAttack - homeDefense) / 100
  outcome: 'W' | 'D' | 'L'
  observed: [number, number, number]
}

function prepareMatches(): PreparedMatch[] {
  const result: PreparedMatch[] = []

  for (const m of HISTORICAL_MATCHES) {
    const homeId = NAME_TO_ID[m.homeTeam]
    const awayId = NAME_TO_ID[m.awayTeam]
    if (!homeId || !awayId) continue

    const homeTeam = TEAM_BY_ID[homeId]
    const awayTeam = TEAM_BY_ID[awayId]
    if (!homeTeam || !awayTeam) continue

    const eloA = homeTeam.eloRating ?? 1500
    const eloB = awayTeam.eloRating ?? 1500
    const mvA = homeTeam.squadMarketValueM ?? 200
    const mvB = awayTeam.squadMarketValueM ?? 200
    const expA = homeTeam.worldCupTitles * 3 + homeTeam.worldCupAppearances
    const expB = awayTeam.worldCupTitles * 3 + awayTeam.worldCupAppearances

    const outcome: 'W' | 'D' | 'L' =
      m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const observed: [number, number, number] =
      outcome === 'W' ? [1, 0, 0] : outcome === 'D' ? [0, 1, 0] : [0, 0, 1]

    result.push({
      homeId,
      awayId,
      eloDiff: eloA - eloB,
      mvRatio: mvA > 0 && mvB > 0 ? Math.log(mvA / mvB) / Math.log(10) : 0,
      expDiff: expA - expB,
      attackDiffA: (homeTeam.attackRating - awayTeam.defenseRating) / 100,
      attackDiffB: (awayTeam.attackRating - homeTeam.defenseRating) / 100,
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
    const { winA, draw, winB } = quickPredict(
      m.eloDiff, m.mvRatio, m.expDiff,
      m.attackDiffA, m.attackDiffB,
      baseGoalRate, eloWeight, rho
    )

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
