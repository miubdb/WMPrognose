/**
 * Penalty-Shootout-Modell
 *
 * Csató & Petróczy (2026): Random Tiebreakers / Shootout als Coin-Flip mit Skill-Edge.
 * Grundidee: Elfmeterschießen ist fast ein Münzwurf, aber Skill-Edge von ±8% möglich.
 */

import { TeamData } from '../data/teams';
import { MODEL_CONFIG } from '../config/modelConfig';
import { clamp } from '../utils/math';

export interface PenaltyShootoutResult {
  probabilityTeamAWins: number;
  probabilityTeamBWins: number;
  skillEdgeTeamA: number;   // Netto-Skill-Vorteil Team A (+/-)
  breakdown: {
    goalkeeperEdge: number;
    takerQualityEdge: number;
    experienceEdge: number;
  };
  notes: string[];
}

/**
 * Berechnet die Elfmeter-Wahrscheinlichkeit für Team A.
 *
 * Skill-Edge-Komponenten (Csató & Petróczy 2026):
 * 1. Torwart-Fähigkeit: Paraden verhindern Gegentore
 * 2. Schützen-Qualität: Präzision und Stärke
 * 3. Turniererfahrung: Druck-Situationen kennen
 *
 * Begrenzung: 42% bis 58% – Elfmeterschießen bleibt ein Münzwurf
 */
export function computePenaltyShootout(
  teamA: TeamData,
  teamB: TeamData
): PenaltyShootoutResult {
  const notes: string[] = [];
  const {
    baseProbability,
    maxSkillEdge,
    goalkeeperWeight,
    takerQualityWeight,
    experienceWeight,
  } = MODEL_CONFIG.penalty;

  // Normalisierte Skill-Differenzen (-1 bis +1)
  const gkDiff = (teamA.penaltyGoalkeeperSkill - teamB.penaltyGoalkeeperSkill) / 100;
  const takerDiff = (teamA.penaltyTakerQuality - teamB.penaltyTakerQuality) / 100;
  const expDiff = (teamA.penaltyTournamentExperience - teamB.penaltyTournamentExperience) / 100;

  // Gewichtete Skill-Edge
  const goalkeeperEdge = gkDiff * goalkeeperWeight * maxSkillEdge;
  const takerQualityEdge = takerDiff * takerQualityWeight * maxSkillEdge;
  const experienceEdge = expDiff * experienceWeight * maxSkillEdge;

  const totalSkillEdge = goalkeeperEdge + takerQualityEdge + experienceEdge;

  // Endergebnis: Basis 50/50 + Skill-Edge, begrenzt auf [42%, 58%]
  const rawProbA = baseProbability + totalSkillEdge;
  const probabilityA = clamp(rawProbA, 0.42, 0.58);
  const probabilityB = 1 - probabilityA;

  // Notizen
  if (Math.abs(totalSkillEdge) < 0.02) {
    notes.push('Elfmeter fast Münzwurf: Skill-Differenz minimal');
  } else if (totalSkillEdge > 0) {
    notes.push(`${teamA.name} leichter Elfmeter-Vorteil (+${(totalSkillEdge * 100).toFixed(1)}%)`);
  } else {
    notes.push(`${teamB.name} leichter Elfmeter-Vorteil (+${(Math.abs(totalSkillEdge) * 100).toFixed(1)}%)`);
  }

  if (teamA.penaltyGoalkeeperSkill > teamB.penaltyGoalkeeperSkill + 10) {
    notes.push(`Torwart-Vorteil für ${teamA.name}`);
  } else if (teamB.penaltyGoalkeeperSkill > teamA.penaltyGoalkeeperSkill + 10) {
    notes.push(`Torwart-Vorteil für ${teamB.name}`);
  }

  return {
    probabilityTeamAWins: probabilityA,
    probabilityTeamBWins: probabilityB,
    skillEdgeTeamA: totalSkillEdge,
    breakdown: {
      goalkeeperEdge,
      takerQualityEdge,
      experienceEdge,
    },
    notes,
  };
}
