// Kartendaten & Vorberechnung (komplett lokal, keine externen Kartenserver).
// Quellen: Natural Earth (gemeinfrei), GeoNames (CC BY 4.0), world-atlas (Natural Earth).
import { geoPath, geoNaturalEarth1, geoConicConformal, geoMercator, type GeoProjection } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { MapKind } from '../../../shared/types';
import { GERMAN_SEAS, ISLANDS, PEAKS, REGIONS } from '../mapdata/landmarks';

export const W = 1000;
export const HEIGHTS: Record<MapKind, number> = { world: 540, europe: 700, germany: 800 };
export const MAX_ZOOM: Record<MapKind, number> = { world: 30, europe: 36, germany: 48 };
const BOUNDS: Record<MapKind, [number, number][]> = {
  world: [[-180, -58], [180, 84]],
  europe: [[-24, 33], [46, 72]],
  germany: [[5.4, 47], [15.8, 55.4]],
};

export type LabelKind = 'sea' | 'country' | 'state' | 'city' | 'river' | 'lake' | 'peak' | 'island' | 'region';
export interface LabelItem {
  id: string; kind: LabelKind; text: string; x: number; y: number;
  /** Mindest-Zoom, ab dem das Label erscheinen darf; höhere prio gewinnt bei Kollisionen */
  minK: number; maxK?: number; prio: number; fs: number; bold?: boolean; cap?: boolean; angle?: number; dot?: number;
}
export interface Prepared {
  projection: GeoProjection; H: number; kind: MapKind;
  worldLand: string; worldBorders: string;       // 50m (Welt/Europa-Übersicht)
  detLand: string; detCoast: string; detBorders: string; // 10m-Nachbarländer (Deutschland/Europa nah)
  stateFill: string; stateBorders: string;
  lakes: string; riversMain: string; riversMid: string; riversMinor: string;
  labels: LabelItem[];
}

function makeProjection(kind: MapKind): GeoProjection {
  const [[x0, y0], [x1, y1]] = BOUNDS[kind];
  const H = HEIGHTS[kind];
  const poly: any = { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, y1], [(x0 + x1) / 2, y0], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]] } };
  const proj = kind === 'world' ? geoNaturalEarth1() : kind === 'europe' ? geoConicConformal().rotate([-12, 0]).parallels([40, 62]) : geoMercator();
  proj.fitExtent([[10, 10], [W - 10, H - 10]], poly);
  if (kind !== 'world') proj.clipExtent([[-60, -60], [W + 60, H + 60]]);
  return proj;
}

let dataP: Promise<{ world: any; detail: any; places: any; labels: any }> | null = null;
function loadData() {
  dataP ??= Promise.all([
    import('world-atlas/countries-50m.json').then(m => (m as any).default ?? m),
    import('../mapdata/detail.json').then(m => (m as any).default ?? m),
    import('../mapdata/places.json').then(m => (m as any).default ?? m),
    import('../mapdata/labels.json').then(m => (m as any).default ?? m),
  ]).then(([world, detail, places, labels]) => ({ world, detail, places, labels }));
  return dataP;
}

const cache = new Map<MapKind, Promise<Prepared>>();
export function prepareMap(kind: MapKind): Promise<Prepared> {
  if (!cache.has(kind)) cache.set(kind, build(kind));
  return cache.get(kind)!;
}

/** Flächenmittelpunkt-ähnlicher Ankerpunkt einer Linie samt Winkel (Mitte des längsten Teilstücks). */
function lineAnchor(coords: number[][][], proj: GeoProjection): { x: number; y: number; angle: number; len: number } | null {
  let best: { pts: [number, number][]; len: number } | null = null;
  for (const line of coords) {
    const pts = line.map(p => proj(p as [number, number])).filter(Boolean) as [number, number][];
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (!best || len > best.len) best = { pts, len };
  }
  if (!best || best.pts.length < 2 || best.len < 4) return null;
  // Punkt bei 50 % der Länge
  let acc = 0; const half = best.len / 2;
  for (let i = 1; i < best.pts.length; i++) {
    const d = Math.hypot(best.pts[i][0] - best.pts[i - 1][0], best.pts[i][1] - best.pts[i - 1][1]);
    if (acc + d >= half) {
      const f = (half - acc) / (d || 1); const a = best.pts[i - 1], b = best.pts[i];
      let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, angle: ang, len: best.len };
    }
    acc += d;
  }
  return null;
}

async function build(kind: MapKind): Promise<Prepared> {
  const { world, detail, places, labels } = await loadData();
  const projection = makeProjection(kind);
  const path = geoPath(projection);
  const H = HEIGHTS[kind];
  const de = kind === 'germany';
  const eu = kind === 'europe';
  const worldFeat = (o: any) => feature(world, o) as any;

  const worldLand = kind === 'germany' ? '' : path(worldFeat(world.objects.land)) ?? '';
  const worldBorders = kind === 'germany' ? '' : path(mesh(world, world.objects.countries, (a: any, b: any) => a !== b) as any) ?? '';

  let detLand = '', detCoast = '', detBorders = '', stateFill = '', stateBorders = '';
  let lakes = '', riversMain = '', riversMid = '', riversMinor = '';
  if (kind !== 'world') {
    detLand = path(feature(detail, detail.objects.neighbors) as any) ?? '';
    detCoast = path(mesh(detail, detail.objects.neighbors, (a: any, b: any) => a === b) as any) ?? '';
    detBorders = path(mesh(detail, detail.objects.neighbors, (a: any, b: any) => a !== b) as any) ?? '';
    stateFill = path(feature(detail, detail.objects.states) as any) ?? '';
    stateBorders = path(mesh(detail, detail.objects.states, (a: any, b: any) => a !== b) as any) ?? '';
    const lk = (feature(detail, detail.objects.lakes) as any).features.filter((f: any) => (f.properties.s ?? 9) <= (de ? 8 : 6));
    lakes = path({ type: 'FeatureCollection', features: lk } as any) ?? '';
    const rv = (feature(detail, detail.objects.rivers) as any).features;
    const tiers: [number, number][] = de ? [[8, 10], [10, 12]] : [[6, 8], [8, 12]];
    const sel = (lo: number, hi: number, strict: boolean) => ({ type: 'FeatureCollection', features: rv.filter((f: any) => (strict ? f.properties.s > lo : f.properties.s <= lo) && f.properties.s <= hi) });
    riversMain = path(sel(tiers[0][0], tiers[0][0], false) as any) ?? '';
    riversMid = path(sel(tiers[0][0], tiers[1][0], true) as any) ?? '';
    riversMinor = path(sel(tiers[1][0], 12, true) as any) ?? '';
  } else {
    const rv = (feature(detail, detail.objects.riversWorld) as any).features;
    riversMain = path({ type: 'FeatureCollection', features: rv } as any) ?? '';
  }

  // ---------- Beschriftungen ----------
  const items: LabelItem[] = [];
  const P = (lon: number, lat: number) => projection([lon, lat]) as [number, number] | null;
  const add = (it: Omit<LabelItem, 'x' | 'y'>, lon: number, lat: number) => { const q = P(lon, lat); if (q && q[0] > -20 && q[0] < W + 20 && q[1] > -20 && q[1] < H + 20) items.push({ ...it, x: q[0], y: q[1] }); };

  // Meere
  if (de) for (const [n, lon, lat] of GERMAN_SEAS) add({ id: 'sea' + n, kind: 'sea', text: n, minK: 1, prio: 95, fs: 15 }, lon, lat);
  else for (const [n, lon, lat] of (labels.seas as [string, number, number][]).filter(([n]) => kind === 'world' ? /Ozean|polar/.test(n) : !/Ozean/.test(n))) add({ id: 'sea' + n, kind: 'sea', text: n, minK: 1, maxK: 9, prio: 95, fs: kind === 'world' ? 15 : 13 }, lon, lat);

  // Länder
  const NEIGH_DE = new Set(['AUT', 'CHE', 'FRA', 'BEL', 'NLD', 'LUX', 'DNK', 'POL', 'CZE', 'LIE']);
  for (const [n, lon, lat, a3, pop, rank] of labels.countries as [string, number, number, string, number, number][]) {
    if (a3 === 'DEU' && de) continue;
    if (de) { if (!NEIGH_DE.has(a3)) continue; add({ id: 'c' + a3, kind: 'country', text: n, minK: 1, maxK: 12, prio: 90, fs: 12, cap: true }, lon, lat); continue; }
    if (eu) { if (pop < 1.5e6 && rank > 4) continue; add({ id: 'c' + a3, kind: 'country', text: n, minK: Math.max(1, (rank - 2) * 0.6), maxK: 14, prio: 70 + Math.min(20, Math.log10(pop + 1)), fs: 11.5, cap: true }, lon, lat); continue; }
    add({ id: 'c' + a3, kind: 'country', text: n, minK: Math.max(1, (rank - 1.5) * 0.9), maxK: 16, prio: 70 + Math.min(20, Math.log10(pop + 1)), fs: 11, cap: true }, lon, lat);
  }
  // Bundesländer
  if (de || eu) for (const [n, lon, lat] of labels.states as [string, number, number][]) add({ id: 's' + n, kind: 'state', text: n, minK: de ? 1 : 3.2, maxK: de ? 14 : 30, prio: 80, fs: de ? 12 : 11, cap: true }, lon, lat);

  // Städte: Schwellen je Zoom über minK. pop → minK (kleinere Orte erst bei höherem Zoom)
  const list: [string, number, number, number, number][] = de ? places.germany : eu ? places.europe : places.world;
  const extra: [string, number, number, number, number][] = de ? [] : eu ? places.germany.filter((p: any) => p[3] >= 90000 && p[3] < 250000) : places.germany.filter((p: any) => p[3] >= 150000);
  const seen = new Set<string>(); const inList = new Set(list.map(p => p[0]));
  const minKFor = (pop: number, cap: number, base: number) => {
    // base = Einwohnerzahl, die schon bei Zoom 1 gezeigt wird
    if (cap && pop > 0) return 1;
    if (pop >= base) return 1;
    return Math.max(1, Math.pow(base / pop, de ? 0.62 : 0.78));
  };
  const base = de ? 450000 : eu ? 3.2e6 : 9e6;
  for (const [n, lon, lat, pop, cap] of [...list, ...extra]) {
    if (seen.has(n)) continue; seen.add(n);
    const big = pop >= 1e6 || cap === 1 && pop >= 3e5;
    const mk = (!de && !inList.has(n)) ? (eu ? 5 + (250000 - Math.min(pop, 250000)) / 80000 : 9) : minKFor(pop, cap, base);
    const stateCap = de && cap === 1;
    add({ id: 'p' + n, kind: 'city', text: n, minK: stateCap ? 1 : mk, prio: 40 + Math.log10(pop + 10) * 4 + (cap ? 3 : 0), fs: big ? 14 : pop >= 2e5 ? 12.5 : 11.5, bold: big || stateCap, dot: big ? 3.6 : cap ? 3.4 : 2.8 }, lon, lat);
  }

  // Flüsse (Namen) – nur benannte, längste Teilstücke je Name
  if (kind !== 'world') {
    const best = new Map<string, { f: any; len: number }>();
    for (const f of (feature(detail, detail.objects.rivers) as any).features) {
      const n = f.properties.n; if (!n) continue;
      const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const a = lineAnchor(lines, projection); if (!a) continue;
      const cur = best.get(n); if (!cur || a.len > cur.len) best.set(n, { f, len: a.len });
    }
    for (const [n, { f }] of best) {
      const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const a = lineAnchor(lines, projection)!; const s = f.properties.s as number;
      if (a.x < 10 || a.x > W - 10 || a.y < 10 || a.y > H - 10) continue;
      const need = de ? (s <= 5 ? 1.4 : s <= 8 ? 2.2 : s <= 10 ? 3.8 : 6.5) : (s <= 4 ? 1.6 : s <= 6 ? 2.6 : s <= 8 ? 4.2 : 9);
      if (a.len < 22 * (de ? 1 : 0.7) && need < 5) continue;
      items.push({ id: 'r' + n, kind: 'river', text: n, x: a.x, y: a.y, angle: a.angle, minK: need, prio: 30 + (12 - s), fs: 10.5 });
    }
    // Seen
    for (const f of (feature(detail, detail.objects.lakes) as any).features) {
      const n = f.properties.n; const s = f.properties.s ?? 9; if (!n || s > (de ? 7 : 5)) continue;
      const c = geoPath(projection).centroid(f); if (!Number.isFinite(c[0]) || c[0] < 10 || c[0] > W - 10 || c[1] < 10 || c[1] > H - 10) continue;
      if (items.some(i => i.id === 'l' + n)) continue;
      items.push({ id: 'l' + n, kind: 'lake', text: n.replace(/^Lake /, ''), x: c[0], y: c[1], minK: de ? 1.8 : 2.5 + s * 0.3, prio: 45, fs: 10.5 });
    }
  }
  // Orientierungspunkte (nur Deutschland-Karte und nah gezoomtes Europa)
  if (de) {
    for (const [n, lon, lat] of PEAKS) add({ id: 'pk' + n, kind: 'peak', text: n, minK: 2.4, prio: 42, fs: 10.5, dot: 1 }, lon, lat);
    for (const [n, lon, lat] of ISLANDS) add({ id: 'is' + n, kind: 'island', text: n, minK: 1.6, prio: 50, fs: 11 }, lon, lat);
    for (const [n, lon, lat] of REGIONS) add({ id: 'rg' + n, kind: 'region', text: n, minK: 2.0, maxK: 9, prio: 35, fs: 10.5 }, lon, lat);
  }
  return { projection, H, kind, worldLand, worldBorders, detLand, detCoast, detBorders, stateFill, stateBorders, lakes, riversMain, riversMid, riversMinor, labels: items };
}

/** Kollisionsfreie Auswahl der Beschriftungen für einen Zoomfaktor. `S` = SVG-Einheiten je Design-Pixel. */
export interface PlacedLabel { it: LabelItem; side: 1 | -1 }
export function layoutLabels(all: LabelItem[], k: number, S: number, extra: { x: number; y: number; dx: number; dy: number; w: number; h: number }[] = []): PlacedLabel[] {
  const vis = all.filter(l => k >= l.minK && (l.maxK === undefined || k <= l.maxK)).sort((a, b) => b.prio - a.prio);
  const rects: [number, number, number, number][] = [];
  for (const e of extra) rects.push([e.x * k + e.dx, e.y * k + e.dy, e.w, e.h]);
  const hit = (r: [number, number, number, number]) => rects.some(q => r[0] < q[0] + q[2] + 4 * S && r[0] + r[2] + 4 * S > q[0] && r[1] < q[1] + q[3] + 2.5 * S && r[1] + r[3] + 2.5 * S > q[1]);
  const out: PlacedLabel[] = [];
  const cap = 260;
  for (const it of vis) {
    if (out.length >= cap) break;
    const fs = it.fs * S; const w = it.text.length * fs * (it.cap ? 0.78 : it.bold ? 0.6 : 0.56); const h = fs * 1.15;
    const px = it.x * k, py = it.y * k;
    let side: 1 | -1 = 1; let r: [number, number, number, number];
    if (it.kind === 'city' || it.kind === 'peak') {
      r = [px + 5 * S, py - h * 0.7, w, h];
      if (hit(r)) { side = -1; r = [px - 5 * S - w, py - h * 0.7, w, h]; if (hit(r)) continue; }
    } else if (it.angle) {
      const a = Math.abs(it.angle) * Math.PI / 180; const bw = w * Math.cos(a) + h * Math.sin(a), bh = w * Math.sin(a) + h * Math.cos(a);
      r = [px - bw / 2, py - bh / 2, bw, bh]; if (hit(r)) continue;
    } else { r = [px - w / 2, py - h / 2, w, h]; if (hit(r)) continue; }
    rects.push(r);
    if ((it.kind === 'city' || it.kind === 'peak') && it.dot) rects.push([px - 3 * S, py - 3 * S, 6 * S, 6 * S]);
    out.push({ it, side });
  }
  return out;
}
