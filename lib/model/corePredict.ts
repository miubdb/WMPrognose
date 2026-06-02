/**
 * Unified Core Prediction Function
 *
 * Single source of truth for all prediction pipelines:
 * - UI analyzeMatch (modelAdapter.ts)
 * - Backtest evaluateModel.ts
 * - Calibration grid search (calibration.ts)
 *
 * All optional context fields default to neutral (no effect).
 */

import { computeScorelineMatrix } from '@/src/model/poisson'
import { aggregateOutcomeProbabilities } from '@/src/model/dixonColes'
import { computeLambda, clampLogEffect } from '@/lib/model/logLambda'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'
import { computeTournamentHeritage } from '@/lib/model/coachScore'

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Minimal team data needed for prediction — compatible with TeamBasic */
export interface CoreTeamData {
  eloRating: number
  squadMarketValueM: number
  worldCupTitles: number
  worldCupAppearances: number
  attackRating: number
  defenseRating: number
  setPieceRating?: number
  confederation?: string
}

/**
 * Motivation / group-stage pressure context.
 * Used in backtest (hardcoded known facts) and UI (derived from standings).
 */
export interface MatchMotivation {
  alreadyThroughA?: boolean  // team already qualified → likely rotating
  alreadyThroughB?: boolean
  mustWinA?: boolean          // team must win to stay alive
  mustWinB?: boolean
  alreadyOutA?: boolean       // team cannot advance → nothing to lose
  alreadyOutB?: boolean
}

/** Venue / context factors — all optional, default = neutral */
export interface MatchVenueContext {
  hostA?: boolean
  hostB?: boolean
  diasporaA?: boolean
  diasporaB?: boolean
  altitudeM?: number
  wbgt?: number
  heatAdaptA?: number    // 0..1 — confederation default if omitted
  heatAdaptB?: number
  altAcclimA?: boolean   // true = no altitude penalty
  altAcclimB?: boolean
  travelKmA?: number
  travelKmB?: number
  restDaysA?: number
  restDaysB?: number
}

/** Override model params — used by calibration grid search */
export interface CorePredictParams {
  baseGoalRate?: number
  eloWeight?: number
  rho?: number
}

// ─── Motivation Weights ───────────────────────────────────────────────────────

export const MOTIVATION_WEIGHTS = {
  alreadyThrough: -0.10,  // ~-10% xG: rotation reduces effective squad quality
  mustWin:         0.049, // ~+5% xG: aggressive pressing, more attacking play
  alreadyOut:      0.030, // ~+3% xG: nothing to lose, open attacking play
} as const

// ─── Dixon-Coles with variable rho ───────────────────────────────────────────

function dcFactor(ga: number, gb: number, la: number, lb: number, rho: number): number {
  if (ga === 0 && gb === 0) return 1 - rho * la * lb
  if (ga === 0 && gb === 1) return 1 + rho * la
  if (ga === 1 && gb === 0) return 1 + rho * lb
  if (ga === 1 && gb === 1) return 1 - rho
  return 1.0
}

function applyDCWithRho(
  matrix: { goalsA: number; goalsB: number; probability: number }[][],
  lambdaA: number,
  lambdaB: number,
  rho: number
): { goalsA: number; goalsB: number; probability: number }[][] {
  let totalProb = 0
  const corrected = matrix.map((row, a) =>
    row.map((cell, b) => {
      const p = cell.probability * dcFactor(a, b, lambdaA, lambdaB, rho)
      totalProb += p
      return { ...cell, probability: p }
    })
  )
  if (totalProb > 0) {
    corrected.forEach(row => row.forEach(cell => { cell.probability /= totalProb }))
  }
  return corrected
}

// ─── Heat adaptation defaults ────────────────────────────────────────────────

const HEAT_ADAPT: Record<string, number> = {
  CAF: 0.75, AFC: 0.65, CONCACAF: 0.60, CONMEBOL: 0.55, OFC: 0.45, UEFA: 0.30,
}

// ─── Core Prediction ─────────────────────────────────────────────────────────

/**
 * Compute [winA, draw, winB] from team data + optional context.
 * All factors match exactly what analyzeMatch/evaluateModel/calibration use.
 */
export function corePredict(
  teamA: CoreTeamData,
  teamB: CoreTeamData,
  motivation: MatchMotivation = {},
  venue: MatchVenueContext = {},
  params: CorePredictParams = {}
): [number, number, number] {
  const baseGoalRate = params.baseGoalRate ?? MODEL_META.baseGoalRate
  const eloWeight    = params.eloWeight    ?? MODEL_WEIGHTS.elo
  const rho          = params.rho          ?? MODEL_META.dixonColesRho

  // ── ELO ──
  const eloA = teamA.eloRating ?? 1500
  const eloB = teamB.eloRating ?? 1500
  const eloLogA = clampLogEffect(eloWeight * (eloA - eloB), 0.25)

  // ── Market Value ──
  const mvA = teamA.squadMarketValueM ?? 200
  const mvB = teamB.squadMarketValueM ?? 200
  const mvRatio = mvA > 0 && mvB > 0 ? Math.log(mvA / mvB) / Math.log(10) : 0
  const mvLogA = clampLogEffect(MODEL_WEIGHTS.marketValueLog * mvRatio)

  // ── Experience diff ──
  const expDiff = (teamA.worldCupTitles * 3 + teamA.worldCupAppearances)
                - (teamB.worldCupTitles * 3 + teamB.worldCupAppearances)
  const expLogA = clampLogEffect(MODEL_WEIGHTS.experience * expDiff)

  // ── Heritage (absolute per team) ──
  const heritageLogA = computeTournamentHeritage(teamA.worldCupTitles, teamA.worldCupAppearances)
  const heritageLogB = computeTournamentHeritage(teamB.worldCupTitles, teamB.worldCupAppearances)

  // ── Attack vs Defense ──
  const attackLogA = clampLogEffect(MODEL_WEIGHTS.attackDefense * (teamA.attackRating - teamB.defenseRating) / 100)
  const attackLogB = clampLogEffect(MODEL_WEIGHTS.attackDefense * (teamB.attackRating - teamA.defenseRating) / 100)

  // ── Set Pieces ──
  const spLogA = (teamA.setPieceRating !== undefined && teamB.setPieceRating !== undefined)
    ? clampLogEffect(MODEL_WEIGHTS.setPiece * (teamA.setPieceRating - teamB.setPieceRating) / 100, 0.10)
    : 0

  // ── Host / Diaspora ──
  const hostLogA = venue.hostA    ? MODEL_WEIGHTS.host    : 0
  const hostLogB = venue.hostB    ? MODEL_WEIGHTS.host    : 0
  const diasLogA = venue.diasporaA ? MODEL_WEIGHTS.diaspora : 0
  const diasLogB = venue.diasporaB ? MODEL_WEIGHTS.diaspora : 0

  // ── Altitude ──
  const altitude = venue.altitudeM ?? 0
  const altBase  = altitude > 1500 ? MODEL_WEIGHTS.altitude * (altitude - 1500) / 1000 : 0
  const heatAdaptA = venue.heatAdaptA ?? (HEAT_ADAPT[teamA.confederation ?? ''] ?? 0.35)
  const heatAdaptB = venue.heatAdaptB ?? (HEAT_ADAPT[teamB.confederation ?? ''] ?? 0.35)
  const altLogA = altBase !== 0
    ? clampLogEffect(altBase * (venue.altAcclimA ? 0 : 1) * (1 - heatAdaptA * 0.3), 0.12) : 0
  const altLogB = altBase !== 0
    ? clampLogEffect(altBase * (venue.altAcclimB ? 0 : 1) * (1 - heatAdaptB * 0.3), 0.12) : 0

  // ── Heat / WBGT ──
  const wbgt     = venue.wbgt ?? 20
  const wbgtBase = wbgt > 28 ? MODEL_WEIGHTS.heat * (wbgt - 28) : 0
  const heatLogA = wbgtBase > 0 ? clampLogEffect(wbgtBase * (1 - heatAdaptA), 0.08) : 0
  const heatLogB = wbgtBase > 0 ? clampLogEffect(wbgtBase * (1 - heatAdaptB), 0.08) : 0

  // ── Travel ──
  const travelKmA = venue.travelKmA ?? 0
  const travelKmB = venue.travelKmB ?? 0
  const travelLogA = travelKmA > 1500 ? clampLogEffect(MODEL_WEIGHTS.travel * (travelKmA - 1500), 0.04) : 0
  const travelLogB = travelKmB > 1500 ? clampLogEffect(MODEL_WEIGHTS.travel * (travelKmB - 1500), 0.04) : 0

  // ── Rest Days ──
  const restA = venue.restDaysA ?? 7
  const restB = venue.restDaysB ?? 7
  const restLogA = restA < 4 ? MODEL_WEIGHTS.restDays.under4 : restA < 5 ? MODEL_WEIGHTS.restDays.under5 : 0
  const restLogB = restB < 4 ? MODEL_WEIGHTS.restDays.under4 : restB < 5 ? MODEL_WEIGHTS.restDays.under5 : 0

  // ── Motivation / Rotation ──
  const motivLogA = motivation.alreadyThroughA ? MOTIVATION_WEIGHTS.alreadyThrough
    : motivation.mustWinA  ? MOTIVATION_WEIGHTS.mustWin
    : motivation.alreadyOutA ? MOTIVATION_WEIGHTS.alreadyOut
    : 0
  const motivLogB = motivation.alreadyThroughB ? MOTIVATION_WEIGHTS.alreadyThrough
    : motivation.mustWinB  ? MOTIVATION_WEIGHTS.mustWin
    : motivation.alreadyOutB ? MOTIVATION_WEIGHTS.alreadyOut
    : 0

  // ── Final xG ──
  const xgA = computeLambda(baseGoalRate, [
    eloLogA, mvLogA, expLogA, heritageLogA, attackLogA, spLogA,
    hostLogA, diasLogA, altLogA, heatLogA, travelLogA, restLogA, motivLogA,
  ])
  const xgB = computeLambda(baseGoalRate, [
    -eloLogA, -mvLogA, -expLogA, heritageLogB, attackLogB, -spLogA,
    hostLogB, diasLogB, altLogB, heatLogB, travelLogB, restLogB, motivLogB,
  ])

  const rawMatrix = computeScorelineMatrix(xgA, xgB)
  const dcMatrix  = applyDCWithRho(rawMatrix, xgA, xgB, rho)
  const { winA, draw, winB } = aggregateOutcomeProbabilities(dcMatrix)
  return [winA, draw, winB]
}
