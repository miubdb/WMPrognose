// Reine Wertungsfunktionen – serverseitig verwendet und einzeln getestet.
import { haversineKm, normText, levenshtein, fuzzyLimit } from './util';
import type { GlitchZone, UniqueTask } from './types';

/** Basistabelle für 7 Spieler (Platz 1..7). */
export const GEO_TABLE = [1, 0.8, 0.65, 0.5, 0.35, 0.2, 0.1];
export const EST_TABLE = [1, 0.75, 0.55, 0.4, 0.28, 0.18, 0.1];

/** Prozentwert für Platz p (1-basiert) bei n Spielern – interpoliert die 7er-Tabelle. */
export function placeFactor(table: number[], place: number, n: number): number {
  if (n <= 1) return table[0];
  const pos = ((place - 1) * (table.length - 1)) / (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(table.length - 1, Math.ceil(pos));
  const f = pos - lo;
  return table[lo] * (1 - f) + table[hi] * f;
}

export interface Ranked { pid: string; value: number; place: number }
/** Wettbewerbs-Ranking (1,1,3): Gleichstand = gleicher (bester) Platz. */
export function rankAscending(items: { pid: string; value: number }[], eps = 0): Ranked[] {
  const sorted = items.slice().sort((a, b) => a.value - b.value);
  const out: Ranked[] = [];
  sorted.forEach((it, i) => {
    let place = i + 1;
    if (i > 0 && Math.abs(it.value - sorted[i - 1].value) <= eps) place = out[i - 1].place;
    out.push({ pid: it.pid, value: it.value, place });
  });
  return out;
}

// ---------- WO ZUR HÖLLE ----------
export function scoreGeo(
  guesses: Record<string, { lat: number; lon: number }>,
  answer: { lat: number; lon: number },
  budget: number,
  nPlayers: number,
) {
  const dists = Object.entries(guesses).map(([pid, g]) => ({ pid, value: Math.round(haversineKm(g, answer)) }));
  const ranked = rankAscending(dists, 0);
  const result: Record<string, { km: number; place: number; points: number }> = {};
  for (const r of ranked) {
    const pts = Math.round(budget * placeFactor(GEO_TABLE, r.place, Math.max(nPlayers, ranked.length)));
    result[r.pid] = { km: r.value, place: r.place, points: pts };
  }
  return result;
}

// ---------- BLIND RANK ----------
/** slots[i] = Index des Begriffs auf Rangplatz i (oder -1). Korrekte Reihenfolge: Begriff k gehört auf Platz k. */
export function rankPairs(slots: number[]): { correct: number; total: number } {
  const n = slots.length;
  const pos: number[] = new Array(n).fill(-1);
  slots.forEach((item, slot) => { if (item >= 0) pos[item] = slot; });
  let correct = 0;
  let total = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    total++;
    if (pos[i] >= 0 && pos[j] >= 0 && pos[i] < pos[j]) correct++;
  }
  return { correct, total };
}
export function scoreRank(slots: number[] | undefined, budget: number) {
  if (!slots) return { correct: 0, total: 10, points: 0 };
  const { correct, total } = rankPairs(slots);
  return { correct, total, points: Math.round((budget * correct) / total) };
}

// ---------- SETZ AUF MICH ----------
export function estimateError(guess: number, answer: number): number {
  if (guess > 0 && answer > 0) return Math.abs(Math.log(guess / answer));
  const scale = Math.max(Math.abs(answer), 1);
  const base = Math.abs(guess - answer) / scale;
  return guess > 0 && answer > 0 ? base : 50 + base; // nicht-positive Tipps bei positiver Lösung: ganz hinten
}
export function scoreEstimate(guesses: Record<string, number>, answer: number, budget: number, nPlayers: number) {
  const errs = Object.entries(guesses).map(([pid, g]) => ({ pid, value: estimateError(g, answer) }));
  const ranked = rankAscending(errs, 1e-9);
  const out: Record<string, { err: number; place: number; points: number; best: boolean }> = {};
  for (const r of ranked) {
    out[r.pid] = {
      err: r.value,
      place: r.place,
      points: Math.round(budget * placeFactor(EST_TABLE, r.place, Math.max(nPlayers, ranked.length))),
      best: r.place === 1,
    };
  }
  return out;
}

// ---------- GLITCH ----------
export function scoreGlitch(tap: { x: number; y: number } | undefined, zones: GlitchZone[], budget: number) {
  if (!tap) return { hit: false, points: 0, dist: null as number | null, accuracy: 0 };
  let best: { d: number; r: number } | null = null;
  for (const z of zones) {
    const d = Math.hypot(tap.x - z.x, tap.y - z.y);
    if (!best || d / z.r < best.d / best.r) best = { d, r: z.r };
  }
  if (!best) return { hit: false, points: 0, dist: null, accuracy: 0 };
  const ratio = best.d / best.r;
  if (ratio <= 1) {
    const accuracy = 1 - ratio;
    return { hit: true, points: Math.round(budget * (0.7 + 0.3 * accuracy)), dist: best.d, accuracy };
  }
  if (ratio <= 2) {
    // knapp daneben: kleiner Trostpreis
    return { hit: false, points: Math.round(budget * 0.15 * (2 - ratio)), dist: best.d, accuracy: 0 };
  }
  return { hit: false, points: 0, dist: best.d, accuracy: 0 };
}

// ---------- CODEBREAK ----------
export const HINT_FACTORS = [1, 0.75, 0.5, 0.25];
export function scoreCode(correct: boolean, hintsUsed: number, budget: number): number {
  if (!correct) return 0;
  const f = HINT_FACTORS[Math.min(hintsUsed, HINT_FACTORS.length - 1)];
  return Math.round(budget * f);
}
export function codeMatches(input: string, answers: string[]): boolean {
  const n = normText(input);
  if (!n) return false;
  return answers.some(a => normText(a) === n);
}

// ---------- EINZIGARTIG ----------
export interface UniqueGroup {
  key: string;
  label: string;
  state: 'valid' | 'unknown' | 'invalid';
  members: string[];
  raw: Record<string, string>; // pid -> Originaleingabe
}
/** Ordnet Eingaben der Liste gültiger Antworten zu (Schreibweise, Tippfehler, Synonyme). */
export function matchValid(input: string, valid: UniqueTask['valid']): string | null {
  const n = normText(input);
  if (!n) return null;
  for (const v of valid) {
    for (const form of [v.name, ...v.variants]) if (normText(form) === n) return v.name;
  }
  const lim = fuzzyLimit(n.length);
  if (lim > 0) {
    let best: { name: string; d: number } | null = null;
    for (const v of valid) for (const form of [v.name, ...v.variants]) {
      const f = normText(form);
      if (f.length < 5) continue;
      const d = levenshtein(n, f);
      if (d <= lim && (!best || d < best.d)) best = { name: v.name, d };
    }
    if (best) return best.name;
  }
  return null;
}
export function groupUnique(
  answers: Record<string, string>,
  valid: UniqueTask['valid'],
  overrides: Record<string, 'valid' | 'invalid' | { mapTo: string }> = {},
): UniqueGroup[] {
  const groups = new Map<string, UniqueGroup>();
  for (const [pid, raw] of Object.entries(answers)) {
    const n = normText(raw);
    if (!n) continue;
    let key: string, label: string, state: UniqueGroup['state'];
    const m = matchValid(raw, valid);
    if (m) { key = 'v:' + normText(m); label = m; state = 'valid'; }
    else {
      key = 'u:' + n; label = raw.trim(); state = 'unknown';
      const ov = overrides[key];
      if (ov === 'valid') state = 'valid';
      else if (ov === 'invalid') state = 'invalid';
      else if (ov && typeof ov === 'object') {
        const target = valid.find(v => v.name === ov.mapTo);
        if (target) { key = 'v:' + normText(target.name); label = target.name; state = 'valid'; }
      }
    }
    const g = groups.get(key) ?? { key, label, state, members: [], raw: {} };
    g.members.push(pid);
    g.raw[pid] = raw;
    groups.set(key, g);
  }
  return [...groups.values()];
}
export function scoreUnique(groups: UniqueGroup[], pointsUnique: number, pointsShared: number) {
  const out: Record<string, { points: number; kind: 'unique' | 'shared' | 'invalid' | 'unknown' }> = {};
  for (const g of groups) {
    for (const pid of g.members) {
      if (g.state === 'valid') out[pid] = g.members.length === 1 ? { points: pointsUnique, kind: 'unique' } : { points: pointsShared, kind: 'shared' };
      else out[pid] = { points: 0, kind: g.state === 'unknown' ? 'unknown' : 'invalid' };
    }
  }
  return out;
}

/** Wendet Punkteinträge der Reihe nach an; Gesamtstand wird nie negativ. */
export function applyClamped(balance: number, requested: number): number {
  if (requested >= 0) return requested;
  return -Math.min(balance, -requested);
}
