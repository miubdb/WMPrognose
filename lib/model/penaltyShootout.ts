import { PENALTY_CONFIG } from './config'
import type { PenaltySkills } from './types'

export interface PenaltyResult {
  winProbabilityA: number
  winProbabilityB: number
}

export function computePenaltyWinProbability(
  skillsA: PenaltySkills,
  skillsB: PenaltySkills
): PenaltyResult {
  const cfg = PENALTY_CONFIG

  const compositeA = (skillsA.goalkeeperSkill / 100) * cfg.gkWeight
    + (skillsA.penaltyTakerQuality / 100) * cfg.takerWeight
    + (skillsA.tournamentExperience / 100) * cfg.experienceWeight

  const compositeB = (skillsB.goalkeeperSkill / 100) * cfg.gkWeight
    + (skillsB.penaltyTakerQuality / 100) * cfg.takerWeight
    + (skillsB.tournamentExperience / 100) * cfg.experienceWeight

  const rawProbA = cfg.base + (compositeA - compositeB) * cfg.skillMax
  const probA = Math.max(cfg.clampMin, Math.min(cfg.clampMax, rawProbA))

  return { winProbabilityA: probA, winProbabilityB: 1 - probA }
}

export function simulatePenaltyWinner(skillsA: PenaltySkills, skillsB: PenaltySkills): 'A' | 'B' {
  const { winProbabilityA } = computePenaltyWinProbability(skillsA, skillsB)
  return Math.random() < winProbabilityA ? 'A' : 'B'
}

// Default penalty skills when no detailed data is available
export function defaultPenaltySkills(
  goalkeeperRating: number,
  attackRating: number,
  worldCupAppearances: number
): PenaltySkills {
  return {
    goalkeeperSkill: goalkeeperRating * 0.85,
    penaltyTakerQuality: attackRating * 0.80,
    tournamentExperience: Math.min(100, 55 + worldCupAppearances * 2),
  }
}
