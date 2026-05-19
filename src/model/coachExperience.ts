/**
 * Coach-Tenure & Turniererfahrung
 *
 * Quellen:
 * - Bridgewater (2010): Football Management
 * - Audas, Goddard & Rowe (2006): U-Shape / Tenure-Effekte
 * - Heuer & Rubner (2009): Skill vs Chance in Single-Knockout
 * - Forrest, Goddard & Simmons (2005): Heritage-Premium
 */

import { TeamData } from '../data/teams';
import { MODEL_CONFIG } from '../config/modelConfig';
import { clamp } from '../utils/math';

export interface CoachSignalResult {
  // Tenure-Modifier (U-Shape): optimal bei ~4 Jahren
  tenureModifier: number;
  // Turniererfahrungs-Modifier
  tournamentExperienceModifier: number;
  // Heritage-Modifier (begrenzt, damit große Namen nicht überbewertet werden)
  heritageModifier: number;
  // Taktische Stabilität (Bridgewater 2010)
  tacticalStabilityModifier: number;
  // Gesamtmodifier
  totalCoachModifier: number;
  notes: string[];
}

/**
 * Tenure-Modifier nach Audas et al. (2006): U-Shape-Kurve.
 * - Sehr kurze Amtszeit (<1 Jahr): Nachteil (kein eingespieltes System)
 * - Optimale Amtszeit (~4 Jahre): leichter Vorteil
 * - Sehr lange Amtszeit (>8 Jahre): Stagnation, leichter Rückgang
 *
 * ANNAHME: Monotone Kurve mit max ±5% Einfluss
 */
export function computeTenureModifier(tenureYears: number): number {
  const {
    tenureOptimalYears,
    shortTenurePenalty,
    shortTenureThreshold,
    longTenureThreshold,
    longTenurePenalty,
    maxBonus,
    maxPenalty,
  } = MODEL_CONFIG.coach;

  let modifier = 1.0;

  if (tenureYears < shortTenureThreshold) {
    // Sehr kurze Amtszeit: linearer Malus
    modifier = 1 - shortTenurePenalty * (1 - tenureYears / shortTenureThreshold);
  } else if (tenureYears <= tenureOptimalYears) {
    // Aufbauphase: linearer Anstieg zum Optimum
    const progress = (tenureYears - shortTenureThreshold) / (tenureOptimalYears - shortTenureThreshold);
    modifier = 1 + progress * maxBonus;
  } else if (tenureYears <= longTenureThreshold) {
    // Stabilitätsphase: Bonus auf Plateau
    modifier = 1 + maxBonus;
  } else {
    // Stagnationsphase: langsamer Rückgang (Audas 2006: "Stale" Manager)
    const overlong = tenureYears - longTenureThreshold;
    modifier = 1 + maxBonus - overlong * longTenurePenalty;
  }

  return clamp(modifier, 1 - maxPenalty, 1 + maxBonus);
}

/**
 * Turniererfahrungs-Modifier: Mehr K.-o.-Erfahrung → bessere Turniertaktik.
 * Heuer & Rubner (2009): Erfahrung hilft in Einzelspielen.
 * Begrenzt auf ±3% Einfluss.
 */
export function computeTournamentExperienceModifier(
  majorTournaments: number,
  knockoutGames: number
): number {
  // Sättigungskurve: erste Turniere wichtiger als weitere
  const tournamentBonus = Math.min(majorTournaments * 0.008, 0.025);
  const knockoutBonus = Math.min(knockoutGames * 0.001, 0.015);
  return 1 + tournamentBonus + knockoutBonus;
}

/**
 * Heritage-Score: Traditionsreiche Teams haben Mentality/Heritage-Vorteil.
 * Forrest et al. (2005): Heritage-Premium existiert, aber klein.
 * STARK BEGRENZT: max +4% damit Brasilien/Deutschland nicht überbewertet werden.
 */
export function computeHeritageModifier(team: TeamData): number {
  const { heritageMaxBonus } = MODEL_CONFIG.coach;
  // Titelerfahrung: logarithmisch (viele Titel → diminishing returns)
  const titleBonus = Math.log(team.worldCupTitles + 1) * 0.015;
  // Finale-Erfahrung: zeigt Turniermentalität
  const finalBonus = Math.log(team.worldCupFinals + 1) * 0.010;
  // Gesamtbonus, stark gedeckelt
  return 1 + clamp(titleBonus + finalBonus, 0, heritageMaxBonus);
}

/**
 * Taktische Stabilität: Ein klar eingespieltes System hilft besonders in Turnieren.
 * Bridgewater (2010): Systemtreue oft wichtiger als Einzelgenialität.
 */
export function computeTacticalStabilityModifier(tacticalStability: number): number {
  // 0-100 → +0% bis +3% (nicht zu groß)
  return 1 + (tacticalStability / 100) * 0.03;
}

/**
 * Hauptfunktion: Berechnet alle Coach-Signale.
 */
export function computeCoachSignals(team: TeamData): CoachSignalResult {
  const notes: string[] = [];
  const coach = team.coach;

  const tenureModifier = computeTenureModifier(coach.tenureYears);
  const tournamentExperienceModifier = computeTournamentExperienceModifier(
    coach.majorTournamentExperience,
    coach.knockoutExperience
  );
  const heritageModifier = computeHeritageModifier(team);
  const tacticalStabilityModifier = computeTacticalStabilityModifier(coach.tacticalStability);

  // Coaching-Notizen
  if (coach.tenureYears < MODEL_CONFIG.coach.shortTenureThreshold) {
    notes.push(`Trainer ${coach.name} erst ${coach.tenureYears.toFixed(1)}J im Amt: Synergie-Malus`);
  } else if (coach.tenureYears > MODEL_CONFIG.coach.longTenureThreshold) {
    notes.push(`Trainer ${coach.name} seit ${coach.tenureYears.toFixed(0)}J: Stagnations-Malus möglich`);
  } else {
    notes.push(`Trainer ${coach.name} (${coach.tenureYears.toFixed(1)}J): optimale Amtszeit`);
  }

  if (team.worldCupTitles > 0) {
    notes.push(`Heritage-Bonus: ${team.worldCupTitles}× Weltmeister`);
  }

  // Gesamtmodifier: Produkt aller Komponenten, dann clampen
  const combined = tenureModifier * tournamentExperienceModifier * heritageModifier * tacticalStabilityModifier;
  const totalCoachModifier = clamp(combined, 1 - MODEL_CONFIG.coach.maxPenalty, 1 + MODEL_CONFIG.coach.maxBonus + 0.05);

  return {
    tenureModifier,
    tournamentExperienceModifier,
    heritageModifier,
    tacticalStabilityModifier,
    totalCoachModifier,
    notes,
  };
}
