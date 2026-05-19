/**
 * Team-Rating-Aggregation
 * Inspiriert von FiveThirtyEight SPI: Trennung von Attack/Defense-Stärke.
 * Hvattum & Arntzen (2010): ELO als Basiskomponente.
 */

import { TeamData } from '../data/teams';
import { MODEL_CONFIG } from '../config/modelConfig';
import { ratingToMultiplier, eloToMultiplier, marketValueToMultiplier } from '../utils/normalization';
import { clamp } from '../utils/math';

export interface TeamRatingResult {
  // Offensive Stärke: wie viele Tore erzeugt das Team?
  attackStrength: number;
  // Defensive Stärke: wie viele Tore verhindert das Team?
  // > 1 = starke Defensive (reduziert gegnerische xG)
  defenseStrength: number;
  // Mittelfeld-Einfluss (auf Ballbesitz und Spielkontrolle)
  midfieldStrength: number;
  // Torwart-Einfluss (auf Defense)
  goalkeeperModifier: number;
  // Set-Piece-Stärke (StatsBomb / Power et al. 2018)
  setPieceModifier: number;
  // Coach-Modifier (Bridgewater 2010)
  coachModifier: number;
  // ELO-Multiplikator
  eloModifier: number;
  // Squad-Value-Multiplikator (Peeters 2018)
  squadValueModifier: number;
  // Gesamtrating (0-100 normalisiert)
  compositeRating: number;
}

/**
 * Berechnet alle Team-Stärke-Komponenten aus den Rohdaten.
 * Jede Komponente ist ein Multiplikator (typisch 0.7..1.3) auf Expected Goals.
 */
export function computeTeamRatings(team: TeamData): TeamRatingResult {

  // ELO als Basismultiplikator
  const eloModifier = eloToMultiplier(team.eloRating);

  // Squad-Marktwert (log-normalisiert, Peeters 2018)
  const squadValueModifier = marketValueToMultiplier(team.squadMarketValueM);

  // Angriffsstärke aus Attack-Rating (FiveThirtyEight-Stil)
  // Centering um 50, maxDelta=0.35 → Bereich [0.65, 1.35]
  const attackStrength = ratingToMultiplier(team.attackRating, 0.35, 50);

  // Defensive Stärke: hoher Rating = gegnerische xG stärker reduziert
  // WICHTIG: defenseStrength > 1 = starke Defense → reduziert gegnerische Tore
  const rawDefense = ratingToMultiplier(team.defenseRating, 0.35, 50);
  const goalkeeperBonus = ratingToMultiplier(team.goalkeeperRating, 0.15, 50);
  const defenseStrength = clamp(rawDefense * goalkeeperBonus, 0.60, 1.45);

  // Torwart separat für Penalty-Berechnung
  const goalkeeperModifier = ratingToMultiplier(team.goalkeeperRating, 0.20, 50);

  // Mittelfeld-Einfluss: beeinflusst leicht Attack UND Defense
  const midfieldStrength = ratingToMultiplier(team.midfieldRating, 0.20, 50);

  // Set-Piece-Modifier: bis +8% Bonus auf xG (Power et al. / StatsBomb 2018)
  // Rating 50 → 0% Bonus, Rating 100 → +8% Bonus
  const setPieceModifier = 1 + (team.setPieceRating / 100) * MODEL_CONFIG.squad.setPieceMaxBonus;

  // Coach-Modifier: aus coachExperience-Modul, hier Basiskalkulation
  // Detailliertere Berechnung in coachExperience.ts
  const coachModifier = 1.0; // Placeholder, wird in predictMatch überschrieben

  // Composite-Rating für Vergleiche (gewichtetes Mittel der 0-100-Ratings)
  const compositeRating =
    team.attackRating * 0.30 +
    team.midfieldRating * 0.25 +
    team.defenseRating * 0.25 +
    team.goalkeeperRating * 0.20;

  return {
    attackStrength,
    defenseStrength,
    midfieldStrength,
    goalkeeperModifier,
    setPieceModifier,
    coachModifier,
    eloModifier,
    squadValueModifier,
    compositeRating,
  };
}

/**
 * Gibt einen menschenlesbaren Rating-Breakdown als String zurück.
 */
export function formatRatingBreakdown(team: TeamData, ratings: TeamRatingResult): string {
  const lines = [
    `  Team:              ${team.name}`,
    `  ELO:              ${team.eloRating} → Modifier ×${ratings.eloModifier.toFixed(3)}`,
    `  Angriff:          ${team.attackRating}/100 → Stärke ×${ratings.attackStrength.toFixed(3)}`,
    `  Abwehr+TW:        ${team.defenseRating}+${team.goalkeeperRating}/100 → Stärke ×${ratings.defenseStrength.toFixed(3)}`,
    `  Mittelfeld:       ${team.midfieldRating}/100 → Modifier ×${ratings.midfieldStrength.toFixed(3)}`,
    `  Set-Pieces:       ${team.setPieceRating}/100 → Modifier ×${ratings.setPieceModifier.toFixed(3)}`,
    `  Marktwert:        ${team.squadMarketValueM}M EUR → Modifier ×${ratings.squadValueModifier.toFixed(3)}`,
    `  Composit-Rating:  ${ratings.compositeRating.toFixed(1)}/100`,
  ];
  return lines.join('\n');
}
