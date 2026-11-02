import { normalizedPower } from '../domain/cycling';

export interface Sample { t: number; w?: number | null; hr?: number | null; alt?: number | null; dist?: number | null }

/** Auf 1 Hz resampeln (Halten des letzten Werts, Lücken > 10 s werden als Pause ausgelassen) und NP berechnen. */
export function npFromSamples(samples: Sample[]): { np: number | null; avg: number | null } {
  const pts = samples.filter((s) => s.w != null && Number.isFinite(s.w)).sort((a, b) => a.t - b.t);
  if (pts.length < 30) return { np: null, avg: null };
  const series: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const next = pts[i + 1];
    const span = next ? Math.min(Math.round(next.t - pts[i].t), 10) : 1;
    for (let k = 0; k < Math.max(1, span); k++) series.push(pts[i].w as number);
  }
  const avg = series.reduce((a, b) => a + b, 0) / series.length;
  return { np: normalizedPower(series), avg: Math.round(avg) };
}

/** Höhenmeter mit Hysterese gegen Messrauschen */
export function elevationGain(alts: number[], threshold = 3): number | null {
  if (alts.length < 2) return null;
  let gain = 0;
  let ref = alts[0];
  for (const a of alts) {
    if (a - ref >= threshold) { gain += a - ref; ref = a; }
    else if (ref - a >= threshold) ref = a;
  }
  return Math.round(gain);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0088;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
export const meanOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
