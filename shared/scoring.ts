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
/**
 * Entfernungswertung (Prinzip GeoGuessr): points = budget · exp(−(d − frei)/S).
 * - d ≤ frei (Treffer-Toleranz): volle Punkte; danach stetig fallend, unabhängig von den Mitspielern.
 * - Skala S je Karte (Entfernung, bei der noch ≈ 37 % übrig sind): Deutschland 50 km, Europa 180 km, Welt 600 km.
 */
export const GEO_SCALE: Record<'germany' | 'europe' | 'world', { scaleKm: number; freeKm: number }> = {
  germany: { scaleKm: 50, freeKm: 2 },       // Karte ≈ 850 km breit
  europe: { scaleKm: 180, freeKm: 5 },       // Karte ≈ 4.000 km breit
  world: { scaleKm: 600, freeKm: 15 },       // Weltkarte
};
export function geoFraction(km: number, map: 'germany' | 'europe' | 'world' = 'germany'): number {
  const { scaleKm, freeKm } = GEO_SCALE[map] ?? GEO_SCALE.germany;
  return km <= freeKm ? 1 : Math.exp(-(km - freeKm) / scaleKm);
}
export function geoPoints(km: number, budget: number, map: 'germany' | 'europe' | 'world' = 'germany'): number {
  return Math.round(budget * geoFraction(km, map));
}
export function scoreGeo(
  guesses: Record<string, { lat: number; lon: number }>,
  answer: { lat: number; lon: number },
  budget: number,
  _nPlayers = 0,
  map: 'germany' | 'europe' | 'world' = 'germany',
) {
  const result: Record<string, { km: number; place: number; points: number }> = {};
  const dists = Object.entries(guesses).map(([pid, g]) => ({ pid, km: Math.round(haversineKm(g, answer)) }));
  const ranked = rankAscending(dists.map(d => ({ pid: d.pid, value: d.km })), 0);   // Platz nur zur Anzeige, nicht für die Punkte
  for (const r of ranked) result[r.pid] = { km: r.value, place: r.place, points: geoPoints(r.value, budget, map) };
  return result;
}

// ---------- BLIND RANK ----------
/** Wirksame Bedienvariante: Paketregel (falls nicht 'task') vor Frage-Einstellung, Standard = nacheinander. */
export function rankVariantOf(t: { variant?: 'sequence' | 'sort' }, rules?: { rankVariant?: 'task' | 'sequence' | 'sort' }): 'sequence' | 'sort' {
  return rules?.rankVariant === 'sequence' || rules?.rankVariant === 'sort' ? rules.rankVariant : t.variant ?? 'sequence';
}
/** Gesamtzeit der Sortier-Variante (alle fünf Begriffe auf einmal). */
export const rankSortSeconds = (t: { items: unknown[]; secondsPerItem: number }) => Math.max(30, Math.round(t.items.length * t.secondsPerItem * 0.7));
/** Alle Paarvergleiche mit Ergebnis (für die Auflösung): Begriff i steht richtig vor Begriff j (i<j in korrekter Reihenfolge). */
export function rankPairDetail(slots: number[]): { a: number; b: number; ok: boolean; placed: boolean }[] {
  const pos: number[] = new Array(slots.length).fill(-1);
  slots.forEach((item, slot) => { if (item >= 0) pos[item] = slot; });
  const out: { a: number; b: number; ok: boolean; placed: boolean }[] = [];
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) out.push({ a: i, b: j, placed: pos[i] >= 0 && pos[j] >= 0, ok: pos[i] >= 0 && pos[j] >= 0 && pos[i] < pos[j] });
  return out;
}
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
/** Sortier-Variante: je Begriff auf exakt richtiger Position budget/5 Punkte (bei 250 → 50 je Begriff). */
export function scoreRankExact(slots: number[] | undefined, budget: number) {
  const n = 5; const correct = slots ? slots.filter((it, i) => it === i).length : 0;
  return { correct, total: n, points: Math.round(budget * correct / n) };
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
/** Fingertoleranz in Szenenkoordinaten (1000×600 ≙ Bildbreite): ca. 3,5 % der Bildbreite um die Objektbox. */
export const GLITCH_TOLERANCE = 35;
/** Abstand eines Tipps zur Zonenbox (0 = innerhalb der Box). Alte Zonen ohne Box: Kreis mit Radius r. */
export function zoneEdgeDistance(tap: { x: number; y: number }, z: GlitchZone): number {
  if (z.hw === undefined || z.hh === undefined) return Math.max(0, Math.hypot(tap.x - z.x, tap.y - z.y) - z.r);
  const dx = Math.max(0, Math.abs(tap.x - z.x) - z.hw), dy = Math.max(0, Math.abs(tap.y - z.y) - z.hh);
  return Math.hypot(dx, dy);
}
export function scoreGlitch(tap: { x: number; y: number } | undefined, zones: GlitchZone[], budget: number) {
  // Nur zwei Ergebnisse: Treffer (innerhalb Objektbox + Fingertoleranz) = volle Punkte; sonst oder ohne Abgabe = 0. Keine Trostpunkte.
  if (!tap) return { hit: false, points: 0, dist: null as number | null, accuracy: 0 };
  let e: number | null = null;
  for (const z of zones) { const d = zoneEdgeDistance(tap, z); if (e === null || d < e) e = d; }
  if (e === null) return { hit: false, points: 0, dist: null, accuracy: 0 };
  const hit = e <= GLITCH_TOLERANCE;
  return { hit, points: hit ? budget : 0, dist: e, accuracy: hit ? 1 : 0 };
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

// ---------- MATCHMAKER ----------
export const MATCH_PAIR_POINTS = 50;
export const MATCH_PAIRS = 6;
/** pairs[i] = Anzeigeposition in der rechten Spalte, die der Spieler dem linken Begriff i zugeordnet hat (-1 = keine). order[pos] = Index des richtigen linken Begriffs. */
export function scoreMatch(pairs: number[] | undefined, order: number[]) {
  const rows: boolean[] = [];
  let correct = 0;
  for (let i = 0; i < MATCH_PAIRS; i++) {
    const pos = pairs?.[i] ?? -1;
    const ok = Number.isInteger(pos) && pos >= 0 && pos < order.length && order[pos] === i;
    rows.push(ok); if (ok) correct++;
  }
  return { correct, points: correct * MATCH_PAIR_POINTS, rows };
}
/** Prüft Form und Eindeutigkeit (1:1) einer Zuordnung. */
export function validMatching(pairs: unknown, n = MATCH_PAIRS): pairs is number[] {
  if (!Array.isArray(pairs) || pairs.length !== n) return false;
  const used = new Set<number>();
  for (const p of pairs) {
    if (!Number.isInteger(p) || p < -1 || p >= n) return false;
    if (p >= 0) { if (used.has(p)) return false; used.add(p); }
  }
  return true;
}

// ---------- DIE VERBINDUNG ----------
/** Punkte nach Hinweisstufe (0 = Hinweis 1 sichtbar … 3 = Hinweis 4). */
export const LINK_POINTS = [300, 225, 150, 75];
export type LinkVerdict = 'exact' | 'close' | 'none';
/** exact: gleiche Schreibweise (normalisiert, inkl. hinterlegter Varianten); close: Tippfehler-Abstand → Host entscheidet; none: sonst. */
export function linkMatch(input: string, answer: string, accept: string[] = []): LinkVerdict {
  const n = normText(input);
  if (!n) return 'none';
  const forms = [answer, ...accept].map(normText).filter(Boolean);
  if (forms.includes(n)) return 'exact';
  const lim = fuzzyLimit(n.length);
  if (lim > 0 && forms.some(f => f.length >= 5 && levenshtein(n, f) <= lim)) return 'close';
  return 'none';
}

// ---------- EINZIGARTIG ----------
export interface UniqueGroup {
  key: string;
  label: string;
  state: 'valid' | 'unknown' | 'invalid';
  members: string[];
  raw: Record<string, string>; // pid -> Originaleingabe
  /** pids, deren Eingabe nur per Tippfehlererkennung zugeordnet wurde (Showmaster sieht sie und kann widersprechen) */
  auto?: string[];
  /** vollständige Antwortliste: unbekannte Antwort automatisch als ungültig gewertet (Showmaster kann korrigieren) */
  autoInvalid?: boolean;
}
/**
 * Ordnet eine Eingabe der Liste gültiger Antworten zu.
 * exact = gleiche Schreibweise nach Normalisierung (Groß-/Kleinschreibung, Akzente, Leerzeichen) oder hinterlegtes Synonym → automatisch sicher.
 * typo  = vorsichtige Tippfehlererkennung: mind. 6 Zeichen, gleicher Anfangsbuchstabe, 1 Fehler (2 ab 11 Zeichen), eindeutig EIN Ziel,
 *         und die gültigen Begriffe selbst dürfen sich nicht so ähnlich sein (sonst nie automatisch zusammenführen). Wird dem Showmaster angezeigt.
 */
/** Levenshtein mit Buchstabendreher (Spanein↔Spanien = 1 Fehler). */
function typoDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
export function matchValidDetail(input: string, valid: UniqueTask['valid']): { name: string; kind: 'exact' | 'typo' } | null {
  const n = normText(input);
  if (!n) return null;
  for (const v of valid) {
    for (const form of [v.name, ...v.variants]) if (normText(form) === n) return { name: v.name, kind: 'exact' };
  }
  if (n.length < 6) return null;
  const lim = n.length >= 11 ? 2 : 1;
  const forms = valid.flatMap(v => [v.name, ...v.variants].map(f => ({ name: v.name, f: normText(f) }))).filter(x => x.f.length >= 6 && x.f[0] === n[0]);
  const near = forms.map(x => ({ ...x, d: typoDistance(n, x.f) })).filter(x => x.d <= lim);
  const names = [...new Set(near.map(x => x.name))];
  if (names.length !== 1) return null;                                        // kein oder mehrdeutiges Ziel → Showmaster entscheidet
  const target = names[0];
  const others = valid.filter(v => v.name !== target).flatMap(v => [v.name, ...v.variants].map(normText));
  const mine = [valid.find(v => v.name === target)!.name, ...valid.find(v => v.name === target)!.variants].map(normText);
  if (mine.some(m => others.some(o => typoDistance(m, o) <= lim + 2))) return null;   // ähnliche gültige Begriffe (z. B. Slowakei/Slowenien)
  return { name: target, kind: 'typo' };
}
export function matchValid(input: string, valid: UniqueTask['valid']): string | null { return matchValidDetail(input, valid)?.name ?? null; }
export function groupUnique(
  answers: Record<string, string>,
  valid: UniqueTask['valid'],
  overrides: Record<string, 'valid' | 'invalid' | { mapTo: string }> = {},
  closed = false,
): UniqueGroup[] {
  const groups = new Map<string, UniqueGroup>();
  for (const [pid, raw] of Object.entries(answers)) {
    const n = normText(raw);
    if (!n) continue;
    let key: string, label: string, state: UniqueGroup['state']; let autoTypo = false; let autoInvalid = false;
    const md = matchValidDetail(raw, valid);
    const mine = overrides['u:' + n];
    if (md && !(md.kind === 'typo' && mine)) { key = 'v:' + normText(md.name); label = md.name; state = 'valid'; autoTypo = md.kind === 'typo'; }
    else {
      key = 'u:' + n; label = raw.trim(); state = closed ? 'invalid' : 'unknown'; autoInvalid = closed;
      const ov = overrides[key]; if (ov) autoInvalid = false;
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
    if (autoTypo) (g.auto ??= []).push(pid);
    if (autoInvalid) g.autoInvalid = true;
    groups.set(key, g);
  }
  return [...groups.values()];
}
export function scoreUnique(groups: UniqueGroup[], pointsUnique: number, pointsShared: number) {
  const out: Record<string, { points: number; kind: 'unique' | 'shared' | 'invalid' | 'unknown' }> = {};
  for (const g of groups) {
    for (const pid of g.members) {
      if (g.state === 'valid') out[pid] = g.members.length === 1 ? { points: pointsUnique, kind: 'unique' } : { points: 0, kind: 'shared' };   // mehrfach genannt = 0 Punkte (pointsShared ist veraltet)
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

/** Sekunden je Hinweis (DIE VERBINDUNG). Der frühere Standardwert 12 s wird – auch in bereits gespeicherten Fragen – als 20 s gespielt; jeder andere Wert gilt unverändert. */
export const CLUE_SECONDS_DEFAULT = 20;
export const clueSecs = (t: { clueSeconds: number }) => (t.clueSeconds === 12 ? CLUE_SECONDS_DEFAULT : t.clueSeconds);
