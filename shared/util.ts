export const EARTH_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

/** Großkreisdistanz in km (Haversine). */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Normalisiert Freitext: klein, ohne Akzente, ß→ss, nur Buchstaben/Ziffern. */
export function normText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Erlaubte Tippfehler abhängig von der Länge. */
export function fuzzyLimit(len: number): number {
  return len >= 9 ? 2 : len >= 5 ? 1 : 0;
}

export function parseNumber(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  let s = String(input).trim().replace(/\s/g, '').replace(/[’']/g, '');
  if (!s) return null;
  // deutsche Schreibweise: 1.234,5 / 1.234 / 1,5
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Deterministischer PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fester Showablauf mit Zwischenständen: Ist rules.boardEveryRound gesetzt, folgt auf JEDE Runde/Überraschung automatisch ein Zwischenstand (auch vor dem Finale);
 *  nach dem Finale kommt direkt die Siegerehrung. Bereits vorhandene Zwischenstände werden nicht doppelt eingefügt. */
export function expandShowSteps<T extends { k: string }>(show: T[], rules?: { boardEveryRound?: boolean }): T[] {
  if (!rules?.boardEveryRound) return show;
  const out: T[] = [];
  show.forEach((st, i) => {
    if (st.k === 'board') { if (out.length && out[out.length - 1].k !== 'board') out.push(st); return; }
    out.push(st);
    if (st.k !== 'final' && show[i + 1]?.k !== 'board') out.push({ k: 'board' } as T);
  });
  return out;
}

/** SETZ AUF MICH: verständliche Netto-Anzeige, z. B. „Schätzung +30 · Wette −100 = −70 Punkte“. */
export function estimateNetLine(estimate: number, bet: number | null): string {
  const sg = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
  if (bet === null) return `Schätzung ${sg(estimate)} Punkte`;
  return `Schätzung ${sg(estimate)} · Wette ${sg(bet)} = ${sg(estimate + bet)} Punkte`;
}
