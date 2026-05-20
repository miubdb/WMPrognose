/**
 * Penalty-Shootout-Modell (Standalone nach Modell-Spezifikation)
 *
 * Csató & Petróczy (2026): Random Tiebreakers / Shootout als Coin-Flip mit Skill-Edge.
 * Grundidee: Elfmeterschießen ist fast ein Münzwurf, aber Skill-Edge von ±8% möglich.
 *
 * Dieses Modul stellt die öffentliche API-Variante bereit (mit PenaltyContext Interface).
 * Die interne Implementierung für predictMatch liegt in penalties.ts.
 */

import { MODEL_CONFIG } from '../config/modelConfig';
import { clamp } from '../utils/math';

/**
 * Kontext-Daten für das Elfmeterschießen eines Teams.
 */
export interface PenaltyContext {
  /** Torwart-Fähigkeit bei Elfmetern: 0–100 */
  goalkeeperSkill: number;
  /** Qualität der Elfmeter-Schützen: 0–100 */
  penaltyTakerQuality: number;
  /** Turniererfahrung im Elfmeterschießen: 0–10 */
  tournamentExperience: number;
}

/**
 * Berechnet die Gewinn-Wahrscheinlichkeit für Team A im Elfmeterschießen.
 *
 * Skill-Edge-Komponenten (Csató & Petróczy 2026):
 * 1. Torwart-Fähigkeit (Gewicht 40%): Paraden verhindern Gegentore
 * 2. Schützen-Qualität (Gewicht 35%): Präzision und Stärke der Tore
 * 3. Turniererfahrung (Gewicht 25%): Umgang mit Drucksituationen
 *
 * Begrenzung: [0.42, 0.58] – Elfmeterschießen bleibt ein Münzwurf.
 *
 * @param teamA - Elfmeter-Kontext für Team A
 * @param teamB - Elfmeter-Kontext für Team B
 * @returns Gewinn-Wahrscheinlichkeit für Team A (immer im Bereich [0.42, 0.58])
 */
export function penaltyShootoutProbability(
  teamA: PenaltyContext,
  teamB: PenaltyContext
): number {
  const { baseProbability, maxSkillEdge, goalkeeperWeight, takerQualityWeight, experienceWeight } =
    MODEL_CONFIG.penalty;

  // Normalisierte Skill-Differenzen: [-1, +1]
  const gkDiff = (teamA.goalkeeperSkill - teamB.goalkeeperSkill) / 100;
  const takerDiff = (teamA.penaltyTakerQuality - teamB.penaltyTakerQuality) / 100;
  // tournamentExperience ist 0–10 Skala → normalisieren auf 0–100 Bereich
  const expDiff = (teamA.tournamentExperience - teamB.tournamentExperience) / 10;

  // Gewichtete Skill-Edge: Jede Komponente trägt anteilig zur maxSkillEdge bei
  const goalkeeperEdge = gkDiff * goalkeeperWeight * maxSkillEdge;
  const takerQualityEdge = takerDiff * takerQualityWeight * maxSkillEdge;
  const experienceEdge = expDiff * experienceWeight * maxSkillEdge;

  const totalSkillEdge = goalkeeperEdge + takerQualityEdge + experienceEdge;

  // Basis 50/50 + Skill-Edge, hard cap auf [42%, 58%]
  const rawProbA = baseProbability + totalSkillEdge;
  return clamp(rawProbA, 0.42, 0.58);
}
