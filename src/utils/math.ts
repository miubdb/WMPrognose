/**
 * Mathematische Hilfsfunktionen
 */

/**
 * Poisson-Wahrscheinlichkeitsmassenfunktion: P(X=k | λ)
 * Maher (1982): Tore als Poisson-Prozess
 */
export function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0 || k < 0) return 0;
  // Berechne log(PMF) für numerische Stabilität bei großem k
  let logPMF = -lambda + k * Math.log(lambda) - logFactorial(k);
  return Math.exp(logPMF);
}

/** Logarithmus der Fakultät (numerisch stabil via Stirling-Näherung für große n) */
function logFactorial(n: number): number {
  if (n < 0) return -Infinity;
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) result += Math.log(i);
  return result;
}

/** Klemmt einen Wert zwischen min und max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Lineare Normalisierung: Wert aus [inMin, inMax] → [outMin, outMax] */
export function linearNorm(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}

/** Logistische Funktion (Sigmoid) für sanfte S-Kurven */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Erwartete Siegchance aus ELO-Differenz (Hvattum & Arntzen 2010)
 * Formel: P(win) = 1 / (1 + 10^(-ΔElo/scaleFactor))
 */
export function eloWinProbability(eloDiff: number, scaleFactor: number): number {
  return 1 / (1 + Math.pow(10, -eloDiff / scaleFactor));
}

/**
 * Logarithmische Normalisierung eines Wertes relativ zu einem Referenzwert.
 * Liefert einen Multiplikator nahe 1.0 für den Durchschnitt.
 * Peeters (2018): Marktwerte logarithmisch transformieren
 */
export function logNormalize(value: number, reference: number, midpoint = 1.0): number {
  if (value <= 0 || reference <= 0) return midpoint * 0.5;
  // Verhältnis log(value)/log(reference), skaliert auf midpoint
  return (Math.log(value + 1) / Math.log(reference + 1)) * midpoint;
}

/** Rundet auf n Dezimalstellen */
export function round(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Normalisiert ein Array von Wahrscheinlichkeiten, sodass sie sich zu 1 summieren */
export function normalizeProbabilities(probs: number[]): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum === 0) return probs.map(() => 1 / probs.length);
  return probs.map(p => p / sum);
}
