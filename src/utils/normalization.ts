/**
 * Normalisierungshilfen für Ratings und Scores
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
export function eloToMultiplier(elo: number): number {
  const reference = MODEL_CONFIG.elo.referenceRating; // 1750
  const raw = 1 + (elo - reference) / 1000;
  return clamp(raw, MODEL_CONFIG.elo.minRatingMultiplier, MODEL_CONFIG.elo.maxRatingMultiplier);
}
