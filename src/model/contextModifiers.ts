/**
 * Kontext-Modifier für Spielort und Reise-Umstände
 *
 * Quellen:
 * - McSharry (2007): Altitude and Athletic Performance
 * - Mohr et al. (2012): Hitze/WBGT und physische Leistungsfähigkeit
 * - Reilly et al. (2007): Jetlag/Reise-Asymmetrie
 * - Field et al. (2022): Recovery/Rest Days
 * - Pollard (1986): Home Advantage
 * - Sors et al. (2020) / Bryson (2021): Crowd Effects
 */

import { VenueData } from '../data/venues';
import { TeamData } from '../data/teams';
import { MatchContext } from '../data/matches';
import { MODEL_CONFIG } from '../config/modelConfig';
import { clamp } from '../utils/math';

export interface ContextModifierResult {
  // Modifier für Team A (auf Expected Goals)
  teamAModifiers: TeamContextModifiers;
  // Modifier für Team B
  teamBModifiers: TeamContextModifiers;
  // Kontextbeschreibung
  contextBreakdown: ContextBreakdown;
}

export interface TeamContextModifiers {
  altitudeModifier: number;
  heatModifier: number;
  travelFatigueModifier: number;
  restDaysModifier: number;
  homeAdvantageModifier: number;
  crowdSupportModifier: number;
  // Gesamtprodukt aller Modifier
  totalContextModifier: number;
}

export interface ContextBreakdown {
  venueDescription: string;
  altitudeEffect: string;
  heatEffect: string;
  teamATravel: string;
  teamBTravel: string;
  homeAdvantage: string;
  notes: string[];
}

/**
 * Höhen-Modifier (McSharry 2007)
 * Höhe über 1500m reduziert Leistung für nicht-akklimatisierte Teams,
 * verbessert sie für akklimatisierte.
 */
function computeAltitudeModifier(
  venueAltitude: number,
  teamAccustomedAltitude: number
): number {
  const { thresholdMeters, bonusPerKm, penaltyPerKm, maxBonus, maxPenalty } = MODEL_CONFIG.context.altitude;

  if (venueAltitude <= thresholdMeters) return 1.0;

  const altitudeAboveThreshold = venueAltitude - thresholdMeters;
  const diffKm = altitudeAboveThreshold / 1000;

  // Ist das Team bereits an ähnliche Höhe gewöhnt?
  const altitudeDiff = venueAltitude - teamAccustomedAltitude;

  if (altitudeDiff <= 0) {
    // Team kommt aus gleicher oder höherer Altitude → kleiner Vorteil
    return 1 + clamp(diffKm * bonusPerKm, 0, maxBonus);
  } else {
    // Team muss sich akklimatisieren → Nachteil
    const disadvantageKm = altitudeDiff / 1000;
    return 1 - clamp(disadvantageKm * penaltyPerKm, 0, maxPenalty);
  }
}

/**
 * Hitze/WBGT-Modifier (Mohr et al. 2012)
 * WBGT über 28°C reduziert physische Leistungsfähigkeit.
 * Teams aus heißem Klima haben Anpassungsvorteil.
 */
function computeHeatModifier(
  estimatedWBGT: number,
  teamHeatAdaptation: number  // 0-1
): number {
  const { wbgtThreshold, penaltyPerDegree, heatAdaptationBonus, maxPenalty } = MODEL_CONFIG.context.heat;

  if (estimatedWBGT <= wbgtThreshold) return 1.0;

  const wbgtExcess = estimatedWBGT - wbgtThreshold;
  const basePenalty = clamp(wbgtExcess * penaltyPerDegree, 0, maxPenalty);

  // Hitze-angepasste Teams haben weniger Penalty
  const adaptationRelief = basePenalty * teamHeatAdaptation;
  const netPenalty = basePenalty - adaptationRelief;

  // Sehr gut adaptierte Teams bekommen kleinen Vorteil
  const adaptationBonus = teamHeatAdaptation > 0.7 ? teamHeatAdaptation * heatAdaptationBonus * 0.3 : 0;

  return 1 - netPenalty + adaptationBonus;
}

/**
 * Reisemüdigkeit (Reilly et al. 2007)
 * Ost-West-Reisen sind belastender als West-Ost.
 * Große Zeitzonendifferenzen erhöhen den Jetlag.
 */
function computeTravelFatigueModifier(
  timezoneShiftHours: number,  // Positiv = Ost, Negativ = West
  travelDistanceKm: number
): number {
  const {
    timezoneThreshold,
    eastWestPenalty,
    westEastPenalty,
    maxPenalty,
    distancePenaltyPer3000km,
    distanceThresholdKm,
  } = MODEL_CONFIG.context.travel;

  let penalty = 0;
  const absShift = Math.abs(timezoneShiftHours);

  if (absShift >= timezoneThreshold) {
    const shiftBeyondThreshold = absShift - timezoneThreshold;
    // Ost-West (negative Shift) ist schlimmer (Reilly 2007)
    if (timezoneShiftHours < 0) {
      penalty += shiftBeyondThreshold * eastWestPenalty;
    } else {
      penalty += shiftBeyondThreshold * westEastPenalty;
    }
  }

  // Distanz-Penalty (sehr lange Reisen zusätzlich erschöpfend)
  if (travelDistanceKm > distanceThresholdKm) {
    const extra3000km = (travelDistanceKm - distanceThresholdKm) / 3000;
    penalty += extra3000km * distancePenaltyPer3000km;
  }

  return 1 - clamp(penalty, 0, maxPenalty);
}

/**
 * Erholungszeit-Modifier (Field et al. 2022)
 * Weniger als 5 Tage Pause → messbare Leistungseinbuße.
 */
function computeRestDaysModifier(restDays: number): number {
  const { penaltyThreshold, penaltyPerDayUnder, maxPenalty } = MODEL_CONFIG.context.rest;

  if (restDays >= penaltyThreshold) return 1.0;

  const daysUnder = penaltyThreshold - restDays;
  const penalty = clamp(daysUnder * penaltyPerDayUnder, 0, maxPenalty);
  return 1 - penalty;
}

/**
 * Heimvorteil-Modifier (Pollard 1986, Sors 2020, Bryson 2021)
 */
function computeHomeAdvantageModifier(
  isHostNation: boolean,
  hasDiasporaSupport: boolean,
  venueCloseTeams: string[],
  teamId: string
): number {
  const { hostNationBonus, diasporaBonus } = MODEL_CONFIG.context.homeAdvantage;
  let bonus = 0;

  if (isHostNation) {
    bonus += hostNationBonus;
  }

  if (hasDiasporaSupport || venueCloseTeams.includes(teamId)) {
    bonus += diasporaBonus;
  }

  return 1 + bonus;
}

/**
 * Crowd-Support-Modifier (Sors 2020, Bryson 2021)
 * Heimvorteil durch Crowd-Effekte (separate Komponente)
 */
function computeCrowdSupportModifier(
  isHostNation: boolean,
  hasDiasporaSupport: boolean
): number {
  // Crowd-Effekt ist in HomeAdvantage enthalten, hier nur geringe Zusatzkomponente
  // bei starker Unterstützung (beide Faktoren aktiv)
  if (isHostNation && hasDiasporaSupport) return 1.01;
  return 1.0;
}

/**
 * Berechnet alle Kontext-Modifier für beide Teams.
 */
export function computeContextModifiers(
  teamA: TeamData,
  teamB: TeamData,
  venue: VenueData,
  matchCtx: MatchContext
): ContextModifierResult {
  const notes: string[] = [];

  // ─── Team A ──────────────────────────────────────────────────────────────────
  const teamAAltitude = computeAltitudeModifier(venue.altitudeMeters, teamA.accustomedAltitudeM);
  const teamAHeat = computeHeatModifier(venue.estimatedWBGT, teamA.heatAdaptation);
  const teamATravel = computeTravelFatigueModifier(
    matchCtx.teamATimezoneShiftHours,
    matchCtx.teamATravelDistanceKm
  );
  const teamARest = computeRestDaysModifier(matchCtx.teamARestDays);
  const teamAHome = computeHomeAdvantageModifier(
    matchCtx.teamAIsHostNation,
    matchCtx.teamADiasporaSupport,
    venue.culturallyCloseTeams,
    teamA.id
  );
  const teamACrowd = computeCrowdSupportModifier(
    matchCtx.teamAIsHostNation,
    matchCtx.teamADiasporaSupport
  );

  const teamATotalModifier = clamp(
    teamAAltitude * teamAHeat * teamATravel * teamARest * teamAHome * teamACrowd,
    0.75, 1.20
  );

  // ─── Team B ──────────────────────────────────────────────────────────────────
  const teamBAltitude = computeAltitudeModifier(venue.altitudeMeters, teamB.accustomedAltitudeM);
  const teamBHeat = computeHeatModifier(venue.estimatedWBGT, teamB.heatAdaptation);
  const teamBTravel = computeTravelFatigueModifier(
    matchCtx.teamBTimezoneShiftHours,
    matchCtx.teamBTravelDistanceKm
  );
  const teamBRest = computeRestDaysModifier(matchCtx.teamBRestDays);
  const teamBHome = computeHomeAdvantageModifier(
    matchCtx.teamBIsHostNation,
    matchCtx.teamBDiasporaSupport,
    venue.culturallyCloseTeams,
    teamB.id
  );
  const teamBCrowd = computeCrowdSupportModifier(
    matchCtx.teamBIsHostNation,
    matchCtx.teamBDiasporaSupport
  );

  const teamBTotalModifier = clamp(
    teamBAltitude * teamBHeat * teamBTravel * teamBRest * teamBHome * teamBCrowd,
    0.75, 1.20
  );

  // ─── Kontext-Notizen ─────────────────────────────────────────────────────────
  if (venue.altitudeMeters > MODEL_CONFIG.context.altitude.thresholdMeters) {
    notes.push(`⛰ Höheneffekt: ${venue.altitudeMeters}m (Schwelle: ${MODEL_CONFIG.context.altitude.thresholdMeters}m)`);
    notes.push(`  ${teamA.name}: ×${teamAAltitude.toFixed(3)} | ${teamB.name}: ×${teamBAltitude.toFixed(3)}`);
  }
  if (venue.estimatedWBGT > MODEL_CONFIG.context.heat.wbgtThreshold) {
    notes.push(`🌡 Hitze: WBGT ${venue.estimatedWBGT.toFixed(1)}°C (Schwelle: ${MODEL_CONFIG.context.heat.wbgtThreshold}°C)`);
    notes.push(`  ${teamA.name}: ×${teamAHeat.toFixed(3)} | ${teamB.name}: ×${teamBHeat.toFixed(3)}`);
  }
  if (matchCtx.teamARestDays < MODEL_CONFIG.context.rest.penaltyThreshold) {
    notes.push(`😴 ${teamA.name} kurze Pause: ${matchCtx.teamARestDays}d → ×${teamARest.toFixed(3)}`);
  }
  if (matchCtx.teamBRestDays < MODEL_CONFIG.context.rest.penaltyThreshold) {
    notes.push(`😴 ${teamB.name} kurze Pause: ${matchCtx.teamBRestDays}d → ×${teamBRest.toFixed(3)}`);
  }
  if (matchCtx.teamAIsHostNation) notes.push(`🏠 Gastgeber-Vorteil: ${teamA.name}`);
  if (matchCtx.teamBIsHostNation) notes.push(`🏠 Gastgeber-Vorteil: ${teamB.name}`);

  // Venue-Beschreibung
  const venueDesc = `${venue.city} (${venue.country}), ${venue.altitudeMeters}m, WBGT ${venue.estimatedWBGT.toFixed(1)}°C`;

  return {
    teamAModifiers: {
      altitudeModifier: teamAAltitude,
      heatModifier: teamAHeat,
      travelFatigueModifier: teamATravel,
      restDaysModifier: teamARest,
      homeAdvantageModifier: teamAHome,
      crowdSupportModifier: teamACrowd,
      totalContextModifier: teamATotalModifier,
    },
    teamBModifiers: {
      altitudeModifier: teamBAltitude,
      heatModifier: teamBHeat,
      travelFatigueModifier: teamBTravel,
      restDaysModifier: teamBRest,
      homeAdvantageModifier: teamBHome,
      crowdSupportModifier: teamBCrowd,
      totalContextModifier: teamBTotalModifier,
    },
    contextBreakdown: {
      venueDescription: venueDesc,
      altitudeEffect: venue.altitudeMeters > 1500 ?
        `Signifikant (${venue.altitudeMeters}m)` : 'Kein signifikanter Effekt',
      heatEffect: venue.estimatedWBGT > 28 ?
        `Kritisch (WBGT ${venue.estimatedWBGT.toFixed(1)}°C)` : 'Moderat',
      teamATravel: `${matchCtx.teamATravelDistanceKm.toLocaleString()}km, TZ-Shift: ${matchCtx.teamATimezoneShiftHours > 0 ? '+' : ''}${matchCtx.teamATimezoneShiftHours}h`,
      teamBTravel: `${matchCtx.teamBTravelDistanceKm.toLocaleString()}km, TZ-Shift: ${matchCtx.teamBTimezoneShiftHours > 0 ? '+' : ''}${matchCtx.teamBTimezoneShiftHours}h`,
      homeAdvantage: matchCtx.teamAIsHostNation ? teamA.name :
                     matchCtx.teamBIsHostNation ? teamB.name : 'Keiner',
      notes,
    },
  };
}
