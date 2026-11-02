// Tagesform-Score (0–100). Heuristik, keine medizinische Bewertung.
export interface Checkin {
  date: string;
  sleep_hours: number | null;
  sleep_quality: number | null; // 1 schlecht … 5 sehr gut
  soreness: number | null; // 1 keine … 5 stark
  energy: number | null; // 1 leer … 5 voll
  mood: number | null; // 1 schlecht … 5 sehr gut
  stress: number | null; // 1 gering … 5 hoch
  resting_hr: number | null;
  hrv_ms: number | null;
}

export type ReadinessLevel = 'gruen' | 'gelb' | 'rot';

export interface ReadinessResult { score: number | null; level: ReadinessLevel | null; usedFactors: string[]; missing: string[] }

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const scale5 = (v: number, invert = false) => clamp01(((invert ? 6 - v : v) - 1) / 4);

export function baselineOf(history: Checkin[], key: 'resting_hr' | 'hrv_ms', date: string, days = 14): number | null {
  const vals = history.filter((c) => c.date < date && c.date >= shift(date, -days) && c[key] != null).map((c) => c[key] as number);
  if (vals.length < 3) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function shift(d: string, n: number) { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }

/** Gewichtete Faktoren; fehlende Faktoren werden ausgelassen und die Gewichte neu normiert. Mindestens 3 Faktoren nötig. */
export function readiness(c: Checkin, history: Checkin[] = []): ReadinessResult {
  const f: { name: string; w: number; v: number | null }[] = [
    { name: 'Schlafdauer', w: 0.2, v: c.sleep_hours == null ? null : clamp01((c.sleep_hours - 4) / 4) }, // 4 h = 0, ≥ 8 h = 1
    { name: 'Schlafqualität', w: 0.15, v: c.sleep_quality == null ? null : scale5(c.sleep_quality) },
    { name: 'Muskelkater', w: 0.15, v: c.soreness == null ? null : scale5(c.soreness, true) },
    { name: 'Energie', w: 0.15, v: c.energy == null ? null : scale5(c.energy) },
    { name: 'Stimmung', w: 0.05, v: c.mood == null ? null : scale5(c.mood) },
    { name: 'Stress', w: 0.1, v: c.stress == null ? null : scale5(c.stress, true) },
  ];
  const rhrBase = baselineOf(history, 'resting_hr', c.date);
  if (c.resting_hr != null && rhrBase != null) f.push({ name: 'Ruhepuls', w: 0.1, v: clamp01(1 - (c.resting_hr - rhrBase) / 10) }); // +10 bpm = 0
  const hrvBase = baselineOf(history, 'hrv_ms', c.date);
  if (c.hrv_ms != null && hrvBase != null) f.push({ name: 'HRV', w: 0.1, v: clamp01(0.5 + (c.hrv_ms / hrvBase - 1) * 2.5) }); // −20 % = 0, +20 % = 1
  const used = f.filter((x) => x.v != null);
  const missing = f.filter((x) => x.v == null).map((x) => x.name);
  if (used.length < 3) return { score: null, level: null, usedFactors: used.map((x) => x.name), missing };
  const wsum = used.reduce((a, x) => a + x.w, 0);
  const score = Math.round((used.reduce((a, x) => a + x.w * (x.v as number), 0) / wsum) * 100);
  return { score, level: score >= 70 ? 'gruen' : score >= 45 ? 'gelb' : 'rot', usedFactors: used.map((x) => x.name), missing };
}
