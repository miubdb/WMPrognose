import { CONTEXT_CONFIG } from './config'
import type { VenueContext, TeamContext, ContextModifiers } from './types'
import { clampLogEffect } from './logLambda'

export function computeContextModifiers(
  venue: VenueContext,
  team: TeamContext
): ContextModifiers {
  const cfg = CONTEXT_CONFIG

  // Altitude: penalty for non-acclimatized teams above 1500m
  const altitudePenaltyBase = venue.altitudeMeters > cfg.altitudeThresholdM
    ? cfg.altitudePer1000m * (venue.altitudeMeters - cfg.altitudeThresholdM) / 1000
    : 0
  const altitudeAcclim = team.accustomedAltitudeM > 1200 ? 1.0 : 0.0
  const altitudeLog = clampLogEffect(
    altitudePenaltyBase * (1 - altitudeAcclim) * (1 - team.heatAdaptation * 0.3),
    cfg.maxAltitudeEffect
  )

  // Heat/WBGT: penalty above 28°C WBGT, reduced for heat-adapted teams
  const wbgtPenaltyBase = venue.estimatedWBGT > cfg.wbgtThreshold
    ? cfg.wbgtPerDegree * (venue.estimatedWBGT - cfg.wbgtThreshold)
    : 0
  const heatLog = clampLogEffect(wbgtPenaltyBase * (1 - team.heatAdaptation), cfg.maxHeatEffect)

  // Travel fatigue: within-tournament camp-to-venue distance
  const travelLog = team.travelDistanceKm > cfg.travelThresholdKm
    ? clampLogEffect(cfg.travelPerKm * (team.travelDistanceKm - cfg.travelThresholdKm), cfg.maxTravelEffect)
    : 0

  // Rest days: short turnaround penalty
  const restLog = team.restDays < 4 ? cfg.restUnder4Days
    : team.restDays < 5 ? cfg.restUnder5Days
    : 0

  // Host nation home advantage
  const homeLog = team.isHostNation ? cfg.hostBonus : 0

  // Diaspora crowd support
  const diasporaLog = team.diasporaCrowdSupport ? cfg.diasporaBonus : 0

  const totalLog = altitudeLog + heatLog + travelLog + restLog + homeLog + diasporaLog

  return { altitudeLog, heatLog, travelLog, restLog, homeLog, diasporaLog, totalLog }
}

// ─── Heat Adaptation Defaults by Confederation ────────────────────────────────

const CONFEDERATION_HEAT_ADAPTATION: Record<string, number> = {
  CAF: 0.75,
  AFC: 0.65,
  CONCACAF: 0.60,
  CONMEBOL: 0.55,
  OFC: 0.45,
  UEFA: 0.30,
}

export function heatAdaptationFromConfederation(confederation: string): number {
  return CONFEDERATION_HEAT_ADAPTATION[confederation] ?? 0.40
}

// ─── High Altitude Nations (no acclimatization penalty) ───────────────────────

const HIGH_ALTITUDE_NATIONS = new Set([
  'mexico', 'colombia', 'ecuador', 'bolivia', 'chile', 'venezuela', 'usa',
])

export function accustomedAltitudeM(teamId: string): number {
  return HIGH_ALTITUDE_NATIONS.has(teamId) ? 1800 : 200
}
