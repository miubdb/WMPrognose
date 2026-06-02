import { COACH_CONFIG } from './config'
import type { CoachData, CoachScore } from './types'
import { clampLogEffect } from './logLambda'

export function computeCoachScore(coach: CoachData): CoachScore {
  const cfg = COACH_CONFIG

  // Tenure: U-shape. < 1 year = instability penalty; > 6 years = staleness penalty
  let tenureLog = 0
  if (coach.tenureYears < 1) {
    tenureLog = cfg.tenurePenaltyNew * (1 - coach.tenureYears)
  } else if (coach.tenureYears > cfg.tenureOptimalMax + 2) {
    tenureLog = cfg.tenurePenaltyStale * (coach.tenureYears - (cfg.tenureOptimalMax + 2))
  }
  tenureLog = clampLogEffect(tenureLog, 0.03)

  // Major tournament experience (WC / EURO / Copa etc. as head coach)
  const experienceLog = Math.min(0.020, coach.majorTournamentExperience * cfg.tournamentExpBonus)

  // Tactical stability: consistent system helps at tournament level
  const stabilityLog = (coach.tacticalStability / 100) * 0.010

  const totalLog = clampLogEffect(tenureLog + experienceLog + stabilityLog, cfg.maxCoachEffect)

  return {
    tenureLog,
    experienceLog,
    stabilityLog,
    totalLog,
    label: buildCoachLabel(coach),
  }
}

// Tournament heritage: titles and appearances create measurable performance uplift
// Strongly bounded — effect is real but small (Forrest et al. 2005, Bridgewater 2010)
export function computeTournamentHeritage(
  worldCupTitles: number,
  worldCupAppearances: number,
  continentalTitles: number = 0
): number {
  const rawScore = worldCupTitles * 3 + worldCupAppearances * 0.3 + continentalTitles * 0.5
  // Brazil (5 WC titles, 22 appearances) → rawScore ≈ 21.6 → ~0.022 log effect
  return clampLogEffect(rawScore * 0.001, COACH_CONFIG.heritageMax)
}

function buildCoachLabel(coach: CoachData): string {
  if (coach.tenureYears < 1) return 'Neuer Trainer (< 1J.) — taktische Instabilität'
  if (coach.tenureYears >= COACH_CONFIG.tenureOptimalMin && coach.tenureYears <= COACH_CONFIG.tenureOptimalMax)
    return `${coach.tenureYears.toFixed(1)}J. — optimale Einspielzeit`
  if (coach.tenureYears > 6) return `${coach.tenureYears.toFixed(0)}J. — mögliche Stagnation`
  return `${coach.tenureYears.toFixed(1)}J. Amtszeit`
}
