// Analyse eines Spielepakets: Spielzeit (erwartet/maximal), Verteilung der Modi und des Fußballanteils bei freier Kategorienwahl.
import type { Book, TileDef } from './types';
import { showSeconds, tileSeconds } from './timing';
import { taskMax } from './validate';

export interface PackAnalysis {
  tiles: { id: string; title: string; mode: string; football: boolean; tasks: number; points: number; expectedMin: number; maxMin: number }[];
  specials: { id: string; title: string; kind: string; tasks: number; points: number; expectedMin: number; maxMin: number }[];
  combos: null | {
    count: number;
    minutesExpected: { min: number; max: number };
    minutesMax: { min: number; max: number };
    footballShare: { min: number; mean: number; max: number };
    maxSameModeTiles: number;
    minDistinctModes: number;
  };
}

function combinations<T>(arr: T[], k: number, cap = 12000): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (out.length >= cap) return;
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

export function analyzeBook(book: Book, wallSlots = 6): PackAnalysis {
  const regular = book.tiles.filter(t => t.kind === 'tile');
  const surprise = book.tiles.find(t => t.kind === 'surprise');
  const final = book.tiles.find(t => t.kind === 'final');
  const pts = (t: TileDef) => t.tasks.reduce((a, x) => a + taskMax(x), 0);
  const row = (t: TileDef) => ({ tasks: t.tasks.length, points: pts(t), expectedMin: +(tileSeconds(t, 'expected') / 60).toFixed(1), maxMin: +(tileSeconds(t, 'max') / 60).toFixed(1) });
  const res: PackAnalysis = {
    tiles: regular.map(t => ({ id: t.id, title: t.title, mode: t.mode, football: t.football, ...row(t) })),
    specials: book.tiles.filter(t => t.kind !== 'tile').map(t => ({ id: t.id, title: t.title, kind: t.kind, ...row(t) })),
    combos: null,
  };
  if (regular.length < wallSlots || !surprise || !final) return res;
  const maxF = book.rules?.maxFootball ?? Infinity, maxM = book.rules?.maxPerMode ?? Infinity;
  const all = combinations(regular, wallSlots).filter(c => {
    if (c.filter(t => t.football).length > maxF) return false;
    const m: Record<string, number> = {};
    for (const t of c) m[t.mode] = (m[t.mode] ?? 0) + 1;
    return Math.max(...Object.values(m)) <= maxM;
  });
  const combos = all.length ? all : combinations(regular, wallSlots);
  let eMin = Infinity, eMax = 0, xMin = Infinity, xMax = 0, fMin = 1, fMax = 0, fSum = 0, sameMax = 0, distinctMin = 99;
  for (const c of combos) {
    const e = showSeconds(c, surprise, final, 'expected') / 60, x = showSeconds(c, surprise, final, 'max') / 60;
    eMin = Math.min(eMin, e); eMax = Math.max(eMax, e); xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
    const tasks = c.reduce((a, t) => a + t.tasks.length, 0);
    const f = c.filter(t => t.football).reduce((a, t) => a + t.tasks.length, 0) / tasks;
    fMin = Math.min(fMin, f); fMax = Math.max(fMax, f); fSum += f;
    const m: Record<string, number> = {};
    for (const t of c) m[t.mode] = (m[t.mode] ?? 0) + 1;
    sameMax = Math.max(sameMax, ...Object.values(m)); distinctMin = Math.min(distinctMin, Object.keys(m).length);
  }
  const r1 = (n: number) => +n.toFixed(1);
  res.combos = { count: combos.length, minutesExpected: { min: r1(eMin), max: r1(eMax) }, minutesMax: { min: r1(xMin), max: r1(xMax) },
    footballShare: { min: +fMin.toFixed(2), mean: +(fSum / combos.length).toFixed(2), max: +fMax.toFixed(2) }, maxSameModeTiles: sameMax, minDistinctModes: distinctMin };
  return res;
}
