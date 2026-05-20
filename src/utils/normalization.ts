/**
 * Normalisierungshilfen für Ratings und Scores
 *
 * Enthält alle Standalone-Normalisierungsfunktionen nach der Modell-Spezifikation:
 * - eloToMultiplier        (ELO → Multiplikator um 1.0)
 * - marketValueMultiplier  (log-normalisierter Marktwert)
 * - peakAgeMultiplier      (1.0 bei 27-29, Penalty außerhalb)
 * - coachMultiplier        (U-Shape Tenure + Turniererfahrung)
 * - heritageMultiplier     (WM-Titel + Teilnahmen, capped ±3%)
 * - setPieceMultiplier     (normalisiert auf 0.95–1.05)
 */

import { clamp, logNormalize } from './math';
import { MODEL_CONFIG } from '../config/modelConfig';

/**
 * Normalisiert ein Team-Rating (0..100) zu einem Multiplikator um 1.0.
 * Rating 50 → 1.0, Rating 100 → 1+maxDelta, Rating 0 → 1-maxDelta
 * Beispiel: maxDelta=0.4 → Bereich [0.6, 1.4]
 */
export function ratingToMultiplier(
  rating: number,
  maxDelta = 0.4,
  midpoint = 50
): number {
  const normalized = (rating - midpoint) / midpoint; // [-1, 1]
  return 1 + clamp(normalized * maxDelta, -maxDelta, maxDelta);
}

/**
 * Transformiert Marktwert (in Mio EUR) zu einem Squad-Score-Multiplikator.
 * Peeters (2018): Logarithmische Transformation verhindert lineare Überbewertung.
 * Bereich: ~0.6 (Schwächste Teams) bis ~1.3 (Stärkste Teams)
 */
export function marketValueToMultiplier(
  valueM: number,
  referenceM = MODEL_CONFIG.squad.marketValueReferenceM
): number {
  const raw = logNormalize(valueM, referenceM, 1.0);
  // Zentrieren auf 1.0 und begrenzen
  return clamp(raw, 0.65, 1.30);
}

/**
 * Konvertiert ELO-Rating zu einem Stärke-Multiplikator.
 * Hvattum & Arntzen (2010): ELO als lineare Basiskomponente
 * Referenz 1750 (eloratings.net-Skala, Ø WM-Team 2026):
 *   ELO 1500 → 0.75, ELO 1750 → 1.0, ELO 2165 (Spanien) → 1.415 → geclampt 1.4
 */
export function eloToMultiplier(elo: number, reference?: number): number {
  const ref = reference ?? MODEL_CONFIG.elo.referenceRating;
  const raw = 1 + (elo - ref) / 1000;
  return clamp(raw, MODEL_CONFIG.elo.minRatingMultiplier, MODEL_CONFIG.elo.maxRatingMultiplier);
}

/**
 * Alias für marketValueToMultiplier (klare Benennung nach Spezifikation).
 * Log-normalisierter Marktwert → Multiplikator um 1.0.
 * Peeters (2018): Logarithmische Transformation verhindert lineare Überbewertung.
 */
export function marketValueMultiplier(
  valueM: number,
  referenceM?: number
): number {
  const ref: number = referenceM !== undefined ? referenceM : MODEL_CONFIG.squad.marketValueReferenceM;
  const raw = logNormalize(valueM, ref, 1.0);
  return clamp(raw, 0.65, 1.30);
}

/**
 * Peak-Age-Multiplikator nach Dendir (2016).
 * Gibt 1.0 bei Alter 27–29 zurück.
 * Außerhalb des Peaks: symmetrische Penalty von penaltyPerYear pro Jahr.
 */
export function peakAgeMultiplier(avgAge: number): number {
  const { peakMin, peakMax, penaltyPerYear, maxPenalty } = MODEL_CONFIG.peakAge;
  let penalty = 0;
  if (avgAge < peakMin) {
    penalty = (peakMin - avgAge) * penaltyPerYear;
  } else if (avgAge > peakMax) {
    penalty = (avgAge - peakMax) * penaltyPerYear;
  }
  return 1.0 - clamp(penalty, 0, maxPenalty);
}

/**
 * Coach-Multiplikator: U-Shape Tenure (Audas et al. 2006) + Turniererfahrungs-Bonus.
 * - Kurze Amtszeit (<1J): Malus
 * - Optimale Amtszeit (~4J): max Bonus
 * - Lange Amtszeit (>8J): langsamer Rückgang
 * - majorTournaments: zusätzlicher Erfahrungs-Bonus
 * Ergebnis capped bei ±maxBonus (±6%)
 */
export function coachMultiplier(tenureYears: number, majorTournaments: number = 0): number {
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
    modifier = 1 - shortTenurePenalty * (1 - tenureYears / shortTenureThreshold);
  } else if (tenureYears <= tenureOptimalYears) {
    const progress = (tenureYears - shortTenureThreshold) / (tenureOptimalYears - shortTenureThreshold);
    modifier = 1 + progress * maxBonus;
  } else if (tenureYears <= longTenureThreshold) {
    modifier = 1 + maxBonus;
  } else {
    const overlong = tenureYears - longTenureThreshold;
    modifier = 1 + maxBonus - overlong * longTenurePenalty;
  }

  // Turniererfahrungs-Bonus: Sättigungskurve, max +2.5%
  const expBonus = Math.min(majorTournaments * 0.008, 0.025);
  modifier += expBonus;

  return clamp(modifier, 1 - maxPenalty, 1 + maxBonus);
}

/**
 * Heritage-Multiplikator (Forrest et al. 2005): Turniertradition gibt Mentalitäts-Vorteil.
 * Capped bei ±3% (heritageMaxBonus aus Coach-Config).
 * - worldCupTitles: logarithmischer Bonus (diminishing returns)
 * - appearances: leichter Erfahrungs-Bonus
 */
export function heritageMultiplier(worldCupTitles: number, appearances: number = 0): number {
  const maxBonus = MODEL_CONFIG.coach.heritageMaxBonus;  // 0.04 (capped bei 0.03 in Formel)
  const cap = 0.03; // Per Spezifikation: max ±3%

  const titleBonus = Math.log(worldCupTitles + 1) * 0.015;
  const finalBonus = Math.log(appearances + 1) * 0.005;

  return 1 + clamp(titleBonus + finalBonus, 0, Math.min(maxBonus, cap));
}

/**
 * Set-Piece-Multiplikator (Power et al. / StatsBomb 2018).
 * setPieceRating: 0–100 → Multiplikator im Bereich [0.95, 1.05].
 * Rating 50 → 1.0, Rating 0 → 0.95, Rating 100 → 1.05.
 */
export function setPieceMultiplier(setPieceRating: number): number {
  // Normalisieren: 0-100 → [-0.05, +0.05] zentriert auf 0.95-1.05
  const normalized = (setPieceRating / 100) * 0.10 + 0.95;
  return clamp(normalized, 0.95, 1.05);
}
