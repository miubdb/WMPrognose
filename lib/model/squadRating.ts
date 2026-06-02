import type { SquadRating, PeakAgeScore } from './types'
import { SQUAD_RATING_CONFIG } from './config'

export interface SquadPlayer {
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  marketValueM: number
  xgPer90: number | null
  xgaPer90: number | null
  age: number
  isInStartingXI: boolean
}

export function computeSquadRating(players: SquadPlayer[]): SquadRating {
  const starters = players.filter(p => p.isInStartingXI)
  const effective = starters.length >= 11 ? starters : players

  const gks = effective.filter(p => p.position === 'GK')
  const defs = effective.filter(p => p.position === 'DEF')
  const mids = effective.filter(p => p.position === 'MID')
  const fwds = effective.filter(p => p.position === 'FWD')

  const attackValue = computeWeightedXG([...fwds, ...mids])
  const defenseValue = computeWeightedXGA([...defs, ...gks])
  const midfieldValue = computeMidfieldBalance(mids)
  const goalkeeperValue = computeGKValue(gks)

  const avgAge = effective.length > 0
    ? effective.reduce((s, p) => s + p.age, 0) / effective.length
    : 27

  const totalMarketValueM = players.reduce((s, p) => s + p.marketValueM, 0)

  return {
    attackValue,
    midfieldValue,
    defenseValue,
    goalkeeperValue,
    peakAgeScore: computePeakAgeScore(avgAge),
    totalMarketValueM,
    playerCount: players.length,
    starterCount: starters.length,
  }
}

function weightedAvg(values: number[], weights: number[]): number | null {
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  if (totalWeight === 0) return null
  return values.reduce((s, v, i) => s + v * weights[i], 0) / totalWeight
}

function computeWeightedXG(players: SquadPlayer[]): number | null {
  const withData = players.filter(p => p.xgPer90 !== null && p.xgPer90 > 0)
  if (withData.length < 2) return null
  return weightedAvg(
    withData.map(p => p.xgPer90!),
    withData.map(p => Math.max(0.1, p.marketValueM))
  )
}

function computeWeightedXGA(players: SquadPlayer[]): number | null {
  const withData = players.filter(p => p.xgaPer90 !== null && p.xgaPer90 > 0)
  if (withData.length < 2) return null
  return weightedAvg(
    withData.map(p => p.xgaPer90!),
    withData.map(p => Math.max(0.1, p.marketValueM))
  )
}

function computeMidfieldBalance(mids: SquadPlayer[]): number {
  const withXG = mids.filter(p => p.xgPer90 !== null)
  const withXGA = mids.filter(p => p.xgaPer90 !== null)
  const avgXG = withXG.length > 0
    ? withXG.reduce((s, p) => s + p.xgPer90!, 0) / withXG.length
    : 0.10
  const avgXGA = withXGA.length > 0
    ? withXGA.reduce((s, p) => s + p.xgaPer90!, 0) / withXGA.length
    : 0.10
  return Math.max(-1, Math.min(1, (avgXG - avgXGA) * 2))
}

function computeGKValue(gks: SquadPlayer[]): number {
  if (gks.length === 0) return 50
  const avgMV = gks.reduce((s, g) => s + g.marketValueM, 0) / gks.length
  return Math.min(100, (avgMV / SQUAD_RATING_CONFIG.gkNormValueM) * 100)
}

export function computePeakAgeScore(avgAge: number): PeakAgeScore {
  const { peakAgeMin, peakAgeMax, youngPenaltyPerYear, oldPenaltyPerYear, maxAgePenalty } = SQUAD_RATING_CONFIG

  let logPenalty = 0
  let label: string

  if (avgAge < peakAgeMin) {
    logPenalty = Math.max(-maxAgePenalty, -(peakAgeMin - avgAge) * youngPenaltyPerYear)
    label = `Zu jung (Ø ${avgAge.toFixed(1)})`
  } else if (avgAge > peakAgeMax) {
    logPenalty = Math.max(-maxAgePenalty, -(avgAge - peakAgeMax) * oldPenaltyPerYear)
    label = `Zu alt (Ø ${avgAge.toFixed(1)})`
  } else {
    label = `Peak-Alter (Ø ${avgAge.toFixed(1)})`
  }

  return { avgAge, logPenalty, label }
}
