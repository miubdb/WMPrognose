/**
 * Unified Core Prediction Function
 *
 * Single source of truth for all prediction pipelines:
 * - UI analyzeMatch (modelAdapter.ts)
 * - Backtest evaluateModel.ts
 * - Calibration grid search (calibration.ts)
 * - Monte Carlo tournament simulation
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

/** Override model params — used by calibration grid search and model lab */
export interface CorePredictParams {
  baseGoalRate?: number
  eloWeight?: number
  rho?: number
  // Factor flags for ablation and eval modes
  useManualRatings?: boolean  // attack/defense/setPiece ratings (default true)
  useMarketValue?: boolean    // squad market value factor (default true)
  useHeritage?: boolean       // tournament heritage factor (default true)
  // Fine-grained weight overrides for calibration parameter sweep
  marketValueWeight?: number  // override MODEL_WEIGHTS.marketValueLog (default: config value)
  heritageScale?: number      // multiplier on computed heritage log-effect (0.0=off, 1.0=full, default 1.0)
  // Caps sum of non-validated experimental factors per team (log-space).
  // 0.08 ≈ max ~8% xG effect from all experimental factors combined (default).
  experimentalOverlayMax?: number  // default: EXPERIMENTAL_OVERLAY_MAX_LOG_EFFECT (0.08)
  // Cap for lineup-based log effects (attack/defense/setPiece manual ratings).
  // 0.06 ≈ max ~6% xG shift from starting XI composition.
  lineupMaxLogEffect?: number  // default: 0.06
}

/** Validated core factors: ELO, MarketValue, Heritage, DixonColes */
export const EXPERIMENTAL_OVERLAY_MAX_LOG_EFFECT = 0.08

/** Full result including xG values — used by simulation for Poisson sampling */
export interface CorePredictFull {
  probs: [number, number, number]
  xgA: number
  xgB: number
}

// ─── Motivation Weights ───────────────────────────────────────────────────────

export const MOTIVATION_WEIGHTS = {
  alreadyThrough: -0.10,  // ~-10% xG: rotation reduces effective squad quality
  mustWin:         0.049, // ~+5% xG: aggressive pressing, more attacking play
  alreadyOut:      0.030, // ~+3% xG: nothing to lose, open attacking play
  mutualDraw:     -0.062, // ~-6% xG per team: both content with draw (Gijón effect)
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

// ─── Internal xG computation ──────────────────────────────────────────────────

function computeXG(
  teamA: CoreTeamData,
  teamB: CoreTeamData,
  motivation: MatchMotivation,
  venue: MatchVenueContext,
  params: CorePredictParams
): { xgA: number; xgB: number } {
  const baseGoalRate = params.baseGoalRate ?? MODEL_META.baseGoalRate
  const eloWeight    = params.eloWeight    ?? MODEL_WEIGHTS.elo

  const eloA = teamA.eloRating ?? 1500
  const eloB = teamB.eloRating ?? 1500
  const eloLogA = clampLogEffect(eloWeight * (eloA - eloB), 0.25)

  const useManualRatings = params.useManualRatings !== false    // default true
  const useMarketValue   = params.useMarketValue   !== false    // default true
  const useHeritage      = params.useHeritage      !== false    // default true

  // Market value — weight overridable for calibration sweep
  const mvWeight = params.marketValueWeight ?? MODEL_WEIGHTS.marketValueLog
  const mvA = teamA.squadMarketValueM ?? 200
  const mvB = teamB.squadMarketValueM ?? 200
  const mvRatio = mvA > 0 && mvB > 0 ? Math.log(mvA / mvB) / Math.log(10) : 0
  const mvLogA = useMarketValue ? clampLogEffect(mvWeight * mvRatio) : 0

  // Tournament heritage — disabled by default (heritageScale=0): not confirmed in OOS evaluation
  const hScale = params.heritageScale ?? 0
  const heritageLogA = useHeritage
    ? computeTournamentHeritage(teamA.worldCupTitles, teamA.worldCupAppearances) * hScale
    : 0
  const heritageLogB = useHeritage
    ? computeTournamentHeritage(teamB.worldCupTitles, teamB.worldCupAppearances) * hScale
    : 0

  // Manual editorial ratings — disabled in historical backtest modes
  const lineupCap = params.lineupMaxLogEffect ?? 0.06
  const attackLogA = useManualRatings
    ? clampLogEffect(MODEL_WEIGHTS.attackDefense * (teamA.attackRating - teamB.defenseRating) / 100, lineupCap)
    : 0
  const attackLogB = useManualRatings
    ? clampLogEffect(MODEL_WEIGHTS.attackDefense * (teamB.attackRating - teamA.defenseRating) / 100, lineupCap)
    : 0

  const spLogA = useManualRatings && teamA.setPieceRating !== undefined && teamB.setPieceRating !== undefined
    ? clampLogEffect(MODEL_WEIGHTS.setPiece * (teamA.setPieceRating - teamB.setPieceRating) / 100, lineupCap)
    : 0

  // Context factors (experimental — not historically validated, no historical data available)
  const hostLogA = venue.hostA    ? MODEL_WEIGHTS.host    : 0
  const hostLogB = venue.hostB    ? MODEL_WEIGHTS.host    : 0
  const diasLogA = venue.diasporaA ? MODEL_WEIGHTS.diaspora : 0
  const diasLogB = venue.diasporaB ? MODEL_WEIGHTS.diaspora : 0

  const altitude = venue.altitudeM ?? 0
  const altBase  = altitude > 1500 ? MODEL_WEIGHTS.altitude * (altitude - 1500) / 1000 : 0
  const heatAdaptA = venue.heatAdaptA ?? (HEAT_ADAPT[teamA.confederation ?? ''] ?? 0.35)
  const heatAdaptB = venue.heatAdaptB ?? (HEAT_ADAPT[teamB.confederation ?? ''] ?? 0.35)
  const altLogA = altBase !== 0
    ? clampLogEffect(altBase * (venue.altAcclimA ? 0 : 1) * (1 - heatAdaptA * 0.3), 0.12) : 0
  const altLogB = altBase !== 0
    ? clampLogEffect(altBase * (venue.altAcclimB ? 0 : 1) * (1 - heatAdaptB * 0.3), 0.12) : 0

  const wbgt     = venue.wbgt ?? 20
  const wbgtBase = wbgt > 28 ? MODEL_WEIGHTS.heat * (wbgt - 28) : 0
  const heatLogA = wbgtBase > 0 ? clampLogEffect(wbgtBase * (1 - heatAdaptA), 0.08) : 0
  const heatLogB = wbgtBase > 0 ? clampLogEffect(wbgtBase * (1 - heatAdaptB), 0.08) : 0

  const travelKmA = venue.travelKmA ?? 0
  const travelKmB = venue.travelKmB ?? 0
  const travelLogA = travelKmA > 1500 ? clampLogEffect(MODEL_WEIGHTS.travel * (travelKmA - 1500), 0.04) : 0
  const travelLogB = travelKmB > 1500 ? clampLogEffect(MODEL_WEIGHTS.travel * (travelKmB - 1500), 0.04) : 0

  const restA = venue.restDaysA ?? 7
  const restB = venue.restDaysB ?? 7
  const restLogA = restA < 4 ? MODEL_WEIGHTS.restDays.under4 : restA < 5 ? MODEL_WEIGHTS.restDays.under5 : 0
  const restLogB = restB < 4 ? MODEL_WEIGHTS.restDays.under4 : restB < 5 ? MODEL_WEIGHTS.restDays.under5 : 0

  const motivLogA = motivation.alreadyThroughA ? MOTIVATION_WEIGHTS.alreadyThrough
    : motivation.mustWinA  ? MOTIVATION_WEIGHTS.mustWin
    : motivation.alreadyOutA ? MOTIVATION_WEIGHTS.alreadyOut
    : 0
  const motivLogB = motivation.alreadyThroughB ? MOTIVATION_WEIGHTS.alreadyThrough
    : motivation.mustWinB  ? MOTIVATION_WEIGHTS.mustWin
    : motivation.alreadyOutB ? MOTIVATION_WEIGHTS.alreadyOut
    : 0

  // Sum experimental (non-validated) factors per team, then optionally cap them.
  // spLogA is a differential factor: +spLogA for A, -spLogA for B.
  let rawExpA = attackLogA + spLogA  + hostLogA + diasLogA + altLogA + heatLogA + travelLogA + restLogA + motivLogA
  let rawExpB = attackLogB - spLogA  + hostLogB + diasLogB + altLogB + heatLogB + travelLogB + restLogB + motivLogB

  const expMax = params.experimentalOverlayMax ?? EXPERIMENTAL_OVERLAY_MAX_LOG_EFFECT
  rawExpA = Math.max(-expMax, Math.min(expMax, rawExpA))
  rawExpB = Math.max(-expMax, Math.min(expMax, rawExpB))

  const xgA = computeLambda(baseGoalRate, [eloLogA, mvLogA, heritageLogA, rawExpA])
  const xgB = computeLambda(baseGoalRate, [-eloLogA, -mvLogA, heritageLogB, rawExpB])

  return { xgA, xgB }
}

// ─── Core Prediction ─────────────────────────────────────────────────────────

/**
 * Compute [winA, draw, winB] from team data + optional context.
 */
export function corePredict(
  teamA: CoreTeamData,
  teamB: CoreTeamData,
  motivation: MatchMotivation = {},
  venue: MatchVenueContext = {},
  params: CorePredictParams = {}
): [number, number, number] {
  const rho = params.rho ?? MODEL_META.dixonColesRho
  const { xgA, xgB } = computeXG(teamA, teamB, motivation, venue, params)
  const rawMatrix = computeScorelineMatrix(xgA, xgB)
  const dcMatrix  = applyDCWithRho(rawMatrix, xgA, xgB, rho)
  const { winA, draw, winB } = aggregateOutcomeProbabilities(dcMatrix)
  return [winA, draw, winB]
}

/**
 * Full prediction result including xgA/xgB.
 * Used by the tournament simulation (Poisson sampling) and model explanation UI.
 */
export function corePredictFull(
  teamA: CoreTeamData,
  teamB: CoreTeamData,
  motivation: MatchMotivation = {},
  venue: MatchVenueContext = {},
  params: CorePredictParams = {}
): CorePredictFull {
  const rho = params.rho ?? MODEL_META.dixonColesRho
  const { xgA, xgB } = computeXG(teamA, teamB, motivation, venue, params)
  const rawMatrix = computeScorelineMatrix(xgA, xgB)
  const dcMatrix  = applyDCWithRho(rawMatrix, xgA, xgB, rho)
  const { winA, draw, winB } = aggregateOutcomeProbabilities(dcMatrix)
  return { probs: [winA, draw, winB], xgA, xgB }
}
