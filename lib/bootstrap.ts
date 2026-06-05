/**
 * Bootstrap Resampling for RPS delta significance testing.
 *
 * Given paired per-match RPS values from model A and baseline B,
 * estimates whether the observed improvement (delta = mean(A) - mean(B))
 * is statistically reliable via bootstrap resampling.
 *
 * Interpretation:
 *   delta < 0 → model A is better than baseline
 *   ci95 entirely < 0 → improvement is statistically reliable (p < 0.05)
 *   ci95 crosses 0 → improvement is NOT reliably demonstrated at n matches
 */

export interface BootstrapResult {
  delta: number             // observed mean(modelRps) - mean(baselineRps)
  ci95: [number, number]    // 95% bootstrap CI for delta
  ci99: [number, number]    // 99% bootstrap CI for delta
  pBetter: number           // P(model better than baseline) — fraction of boots with delta < 0
  nMatches: number
  nBoot: number
  reliable: boolean         // ci95[1] < 0  (entire CI below zero)
  interpretation: string
}

export function bootstrapDelta(
  pairs: Array<[number, number]>,  // [modelRps, baselineRps] per match
  nBoot = 2000
): BootstrapResult {
  const n = pairs.length
  if (n === 0) {
    return {
      delta: 0, ci95: [0, 0], ci99: [0, 0], pBetter: 0.5,
      nMatches: 0, nBoot, reliable: false,
      interpretation: 'Keine Spiele zum Auswerten.',
    }
  }

  const observedDelta = pairs.reduce((s, [a, b]) => s + a - b, 0) / n

  // Bootstrap resampling with replacement
  const bootDeltas: number[] = []
  for (let b = 0; b < nBoot; b++) {
    let sum = 0
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n)
      sum += pairs[idx][0] - pairs[idx][1]
    }
    bootDeltas.push(sum / n)
  }

  bootDeltas.sort((a, b) => a - b)

  const lo95 = bootDeltas[Math.floor(nBoot * 0.025)]
  const hi95 = bootDeltas[Math.floor(nBoot * 0.975)]
  const lo99 = bootDeltas[Math.floor(nBoot * 0.005)]
  const hi99 = bootDeltas[Math.floor(nBoot * 0.995)]

  const pBetter = bootDeltas.filter(d => d < 0).length / nBoot

  const reliable = hi95 < 0

  let interpretation: string
  if (reliable && observedDelta < 0) {
    interpretation = `Verbesserung statistisch belastbar (95%-KI vollständig < 0). ΔRPS ${observedDelta.toFixed(4)} ist signifikant bei n=${n} Spielen.`
  } else if (observedDelta < 0 && !reliable) {
    interpretation = `Verbesserung ΔRPS ${observedDelta.toFixed(4)} vorhanden, aber 95%-KI überschneidet 0 → bei n=${n} Spielen noch nicht statistisch gesichert.`
  } else if (observedDelta === 0) {
    interpretation = 'Kein Unterschied zwischen Modell und Baseline.'
  } else {
    interpretation = `Modell ist schlechter als Baseline. ΔRPS ${observedDelta.toFixed(4)} > 0.`
  }

  return {
    delta: observedDelta,
    ci95: [lo95, hi95],
    ci99: [lo99, hi99],
    pBetter,
    nMatches: n,
    nBoot,
    reliable,
    interpretation,
  }
}

/**
 * Tournament-level bootstrap: resample whole tournaments rather than individual matches.
 * Use when tournaments may have systematic differences (correlated outcomes within tournament).
 */
export function bootstrapTournamentLevel(
  tournamentDeltas: number[]  // average delta per tournament
): BootstrapResult {
  return bootstrapDelta(tournamentDeltas.map(d => [d, 0] as [number, number]))
}
