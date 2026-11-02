// Radsport-Berechnungen (Coggan-Modell). Quellen: Allen & Coggan, "Training and Racing with a Power Meter".

export interface PowerZone { id: number; name: string; minPct: number; maxPct: number | null; low: number; high: number | null }

const ZONES: [string, number, number | null][] = [
  ['Z1 Aktive Erholung', 0, 55],
  ['Z2 Grundlagenausdauer', 56, 75],
  ['Z3 Tempo', 76, 90],
  ['Z4 Schwelle', 91, 105],
  ['Z5 VO2max', 106, 120],
  ['Z6 Anaerobe Kapazität', 121, 150],
  ['Z7 Neuromuskulär', 151, null],
];

export function powerZones(ftp: number): PowerZone[] {
  if (!(ftp > 0)) throw new Error('FTP muss größer als 0 sein.');
  return ZONES.map(([name, lo, hi], i) => ({
    id: i + 1, name, minPct: lo, maxPct: hi,
    low: Math.round((ftp * lo) / 100),
    high: hi === null ? null : Math.round((ftp * hi) / 100),
  }));
}

/** Zielwatt-Bereich in Prozent der FTP */
export const wattsRange = (ftp: number, loPct: number, hiPct: number): [number, number] => [Math.round((ftp * loPct) / 100), Math.round((ftp * hiPct) / 100)];

/** Normalized Power aus 1-Hz-Leistungswerten: 30-s-gleitender Mittelwert, 4. Potenz, Mittel, 4. Wurzel. */
export function normalizedPower(watts: number[]): number | null {
  const w = watts.map((x) => (Number.isFinite(x) && x >= 0 ? x : 0));
  if (w.length < 30) return null;
  let sum = 0;
  for (let i = 0; i < 30; i++) sum += w[i];
  const rolling: number[] = [sum / 30];
  for (let i = 30; i < w.length; i++) {
    sum += w[i] - w[i - 30];
    rolling.push(sum / 30);
  }
  const mean4 = rolling.reduce((a, x) => a + x ** 4, 0) / rolling.length;
  return Math.round(mean4 ** 0.25);
}

export const intensityFactor = (np: number, ftp: number): number => np / ftp;

/** Training Stress Score = (Sekunden × NP × IF) / (FTP × 3600) × 100 */
export function tss(durationSec: number, np: number, ftp: number): number {
  const ifac = intensityFactor(np, ftp);
  return Math.round(((durationSec * np * ifac) / (ftp * 3600)) * 1000) / 10;
}

export type FtpMethod = 'initial' | '20min' | 'ramp' | 'manual';

/** FTP aus Testergebnis: 20-min-Test × 0,95; Ramp-Test (bestes 1-min-Mittel) × 0,75. */
export function ftpFromTest(method: '20min' | 'ramp', testWatts: number): number {
  if (!(testWatts > 0)) throw new Error('Testwert muss größer als 0 sein.');
  return Math.round(testWatts * (method === '20min' ? 0.95 : 0.75));
}

/** FTP, die zu einem Datum galt (letzter Test mit date <= Datum; sonst Startwert). */
export function ftpOn(date: string, tests: { date: string; ftp_w: number }[], fallback: number): number {
  let best: { date: string; ftp_w: number } | null = null;
  for (const t of tests) if (t.date <= date && (!best || t.date >= best.date)) best = t;
  return best ? best.ftp_w : fallback;
}

/** Watt pro Kilogramm */
export const wattsPerKg = (ftp: number, kg: number): number => Math.round((ftp / kg) * 100) / 100;
