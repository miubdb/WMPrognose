// Datengetriebene SVG-Szenen (Koordinatensystem 1000 x 600).
// Variante "b" überschreibt einzelne Elemente per ID -> Trefferzonen werden exakt aus dem Unterschied berechnet.
import type { GlitchZone } from './types';

export type Item =
  | { id: string; t: 'rect'; x: number; y: number; w: number; h: number; fill: string; rx?: number; stroke?: string }
  | { id: string; t: 'circle'; x: number; y: number; r: number; fill: string; stroke?: string }
  | { id: string; t: 'line'; x: number; y: number; x2: number; y2: number; stroke: string; sw?: number }
  | { id: string; t: 'text'; x: number; y: number; text: string; size: number; fill: string; anchor?: 'start' | 'middle' | 'end'; weight?: number; mono?: boolean };

export interface Scene { id: string; title: string; bg: string; items: Item[]; changes: Record<string, Partial<Item> | null>; template?: any; builtin?: boolean }

export function bbox(it: Item): { x0: number; y0: number; x1: number; y1: number } {
  switch (it.t) {
    case 'rect': return { x0: it.x, y0: it.y, x1: it.x + it.w, y1: it.y + it.h };
    case 'circle': return { x0: it.x - it.r, y0: it.y - it.r, x1: it.x + it.r, y1: it.y + it.r };
    case 'line': return { x0: Math.min(it.x, it.x2), y0: Math.min(it.y, it.y2), x1: Math.max(it.x, it.x2), y1: Math.max(it.y, it.y2) };
    case 'text': {
      const w = it.text.length * it.size * (it.mono ? 0.6 : 0.55);
      const x0 = it.anchor === 'middle' ? it.x - w / 2 : it.anchor === 'end' ? it.x - w : it.x;
      return { x0, y0: it.y - it.size, x1: x0 + w, y1: it.y + it.size * 0.25 };
    }
  }
}

/** Liefert die Elemente in Variante a oder b. */
export function variantItems(scene: Scene, variant: 'a' | 'b'): Item[] {
  if (variant === 'a') return scene.items;
  return scene.items.flatMap(it => {
    if (!(it.id in scene.changes)) return [it];
    const ch = scene.changes[it.id];
    return ch === null ? [] : [{ ...it, ...ch } as Item];
  });
}

/** Trefferzonen aus dem tatsächlichen Unterschied (Union aus A- und B-Box je geändertem Element). */
export function diffZones(scene: Scene): GlitchZone[] {
  const a = variantItems(scene, 'a');
  const b = variantItems(scene, 'b');
  const zones: GlitchZone[] = [];
  for (const id of Object.keys(scene.changes)) {
    const ia = a.find(i => i.id === id);
    const ib = b.find(i => i.id === id);
    const boxes = [ia, ib].filter(Boolean).map(i => bbox(i as Item));
    if (!boxes.length) continue;
    const x0 = Math.min(...boxes.map(x => x.x0)), y0 = Math.min(...boxes.map(x => x.y0));
    const x1 = Math.max(...boxes.map(x => x.x1)), y1 = Math.max(...boxes.map(x => x.y1));
    zones.push({ x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2), r: Math.max(40, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2)) });
  }
  return zones;
}

// ---------- Szenenbau ----------
const T = (id: string, x: number, y: number, text: string, size: number, fill: string, o: Partial<Extract<Item, { t: 'text' }>> = {}): Item => ({ id, t: 'text', x, y, text, size, fill, ...o });

/** Transfermarkt-ähnliche Tabelle (fiktive, bewusst erfundene Daten). */
function marketTable(id: string, title: string, rows: [string, string, string, string][], changes: Scene['changes']): Scene {
  const items: Item[] = [
    { id: 'hdr', t: 'rect', x: 0, y: 0, w: 1000, h: 70, fill: '#12304f' },
    T('hdr-t', 30, 46, title, 30, '#ffffff', { weight: 700 }),
    T('c1', 40, 112, 'SPIELER', 18, '#8aa4c0', { weight: 700 }),
    T('c2', 420, 112, 'VEREIN', 18, '#8aa4c0', { weight: 700 }),
    T('c3', 700, 112, 'ALTER', 18, '#8aa4c0', { weight: 700 }),
    T('c4', 960, 112, 'MARKTWERT', 18, '#8aa4c0', { anchor: 'end', weight: 700 }),
  ];
  rows.forEach((r, i) => {
    const y = 140 + i * 72;
    items.push({ id: `bg${i}`, t: 'rect', x: 20, y, w: 960, h: 64, fill: i % 2 ? '#16283d' : '#1b3047', rx: 8 });
    items.push({ id: `dot${i}`, t: 'circle', x: 56, y: y + 32, r: 20, fill: ['#2d7fb8', '#c0392b', '#27ae60', '#8e44ad', '#e67e22', '#16a085'][i % 6] });
    items.push(T(`n${i}`, 90, y + 41, r[0], 26, '#ffffff', { weight: 600 }));
    items.push(T(`v${i}`, 420, y + 41, r[1], 24, '#c7d6e6'));
    items.push(T(`a${i}`, 700, y + 41, r[2], 24, '#c7d6e6', { mono: true }));
    items.push(T(`w${i}`, 960, y + 41, r[3], 26, '#ffd34d', { anchor: 'end', weight: 700 }));
  });
  return { id, title, bg: '#0d1b2b', items, changes };
}

/** Spielfeld mit Spielern (draufsicht). */
function pitch(id: string, title: string, home: [number, number][], away: [number, number][], ball: [number, number], changes: Scene['changes']): Scene {
  const items: Item[] = [
    { id: 'grass', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#1e6b34' },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ id: `stripe${i}`, t: 'rect' as const, x: i * 125, y: 0, w: 125, h: 600, fill: i % 2 ? '#1f7036' : '#1b6330' })),
    { id: 'l-out', t: 'rect', x: 30, y: 30, w: 940, h: 540, fill: 'none', stroke: '#ffffffcc' },
    { id: 'l-mid', t: 'line', x: 500, y: 30, x2: 500, y2: 570, stroke: '#ffffffcc', sw: 4 },
    { id: 'l-circ', t: 'circle', x: 500, y: 300, r: 70, fill: 'none', stroke: '#ffffffcc' },
    { id: 'box-l', t: 'rect', x: 30, y: 150, w: 150, h: 300, fill: 'none', stroke: '#ffffffcc' },
    { id: 'box-r', t: 'rect', x: 820, y: 150, w: 150, h: 300, fill: 'none', stroke: '#ffffffcc' },
  ];
  home.forEach(([x, y], i) => items.push({ id: `h${i}`, t: 'circle', x, y, r: 20, fill: '#e53935', stroke: '#ffffff' }));
  away.forEach(([x, y], i) => items.push({ id: `g${i}`, t: 'circle', x, y, r: 20, fill: '#1e88e5', stroke: '#ffffff' }));
  items.push({ id: 'ball', t: 'circle', x: ball[0], y: ball[1], r: 11, fill: '#ffffff', stroke: '#000000' });
  return { id, title, bg: '#1e6b34', items, changes };
}

/** Raster aus Emojis. */
function emojiGrid(id: string, title: string, cols: number, rows: number, symbols: string[], changes: Scene['changes']): Scene {
  const items: Item[] = [{ id: 'panel', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#241a3a' }];
  const cw = 1000 / cols, ch = 600 / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    items.push(T(`e${r}_${c}`, cw * c + cw / 2, ch * r + ch / 2 + 22, symbols[(r * cols + c) % symbols.length], 64, '#ffffff', { anchor: 'middle' }));
  }
  return { id, title, bg: '#241a3a', items, changes };
}

export const SCENES: Record<string, Scene> = {};
function reg(s: Scene) { SCENES[s.id] = s; return s; }

reg(marketTable('market1', 'MARKTWERTE · 1. LIGA (fiktiv)', [
  ['L. Brandt', 'FC Nordstern', '24', '45,0 Mio. €'],
  ['M. Okafor', 'SV Rheinblick', '27', '38,0 Mio. €'],
  ['T. Lindqvist', 'FC Nordstern', '21', '32,5 Mio. €'],
  ['A. Kowalczyk', 'Union Elbe', '29', '18,0 Mio. €'],
  ['J. Marchetti', 'SV Rheinblick', '31', '12,5 Mio. €'],
  ['D. Vogt', 'Union Elbe', '19', '9,0 Mio. €'],
], { w3: { text: '28,0 Mio. €' } }));

reg(marketTable('market2', 'TRANSFERS · SOMMER (fiktiv)', [
  ['P. Salmon', 'Atletico Mar → FC Nordstern', '26', '22,0 Mio. €'],
  ['K. Brandão', 'Union Elbe → SV Rheinblick', '23', '14,0 Mio. €'],
  ['E. Haraldsen', 'FC Nordstern → Real Costa', '25', '60,0 Mio. €'],
  ['N. Weiss', 'ablösefrei → Union Elbe', '34', '0,0 Mio. €'],
  ['S. Demir', 'SV Rheinblick → Leih', '20', '3,5 Mio. €'],
  ['R. Jansen', 'Union Elbe → Retiro FC', '28', '9,0 Mio. €'],
], { a2: { text: '52' }, n4: { text: 'S. Demirci' } }));

reg(pitch('pitch1', 'Taktiktafel', 
  [[110, 300], [250, 120], [250, 240], [250, 360], [250, 480], [420, 160], [420, 300], [420, 440], [600, 150], [620, 300], [600, 450]],
  [[890, 300], [760, 120], [760, 240], [760, 360], [760, 480], [620, 180], [580, 300], [620, 420], [450, 220], [450, 380], [350, 300]],
  [515, 305], { g4: { x: 760, y: 560 } }));

reg(pitch('pitch2', 'Standardsituation',
  [[110, 300], [300, 140], [300, 260], [300, 340], [300, 460], [430, 200], [430, 400], [560, 300], [640, 180], [640, 420], [700, 300]],
  [[890, 300], [800, 160], [800, 240], [800, 360], [800, 440], [720, 250], [720, 350], [660, 300], [560, 120], [560, 480], [400, 300]],
  [940, 90], { h3: null, ball: { x: 600, y: 330 } }));

reg(emojiGrid('grid1', 'Uhrenwand', 8, 5, ['🕐'], { e2_5: { text: '🕜' } }));

/** Szene mit Torjubel-Ergebnistafel */
reg((() => {
  const s: Scene = {
    id: 'board1', title: 'Anzeigetafel', bg: '#10101a',
    items: [
      { id: 'bg', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#10101a' },
      T('title', 500, 90, 'BUNDESLIGA · 34. SPIELTAG (fiktiv)', 34, '#ffd34d', { anchor: 'middle', weight: 700 }),
      ...([
        ['FC Nordstern', '3 : 1', 'Union Elbe'],
        ['SV Rheinblick', '0 : 0', 'Real Costa II'],
        ['Atletico Mar', '2 : 2', 'Retiro FC'],
        ['Dynamo Süd', '1 : 4', 'Borussia Ost'],
        ['Rot-Weiss Mitte', '5 : 0', 'FSV Küste'],
      ] as const).flatMap(([h, sc, g], i) => [
        T(`h${i}`, 400, 200 + i * 85, h, 30, '#ffffff', { anchor: 'end' }),
        T(`s${i}`, 500, 200 + i * 85, sc, 36, '#00e5c7', { anchor: 'middle', weight: 800, mono: true }),
        T(`g${i}`, 600, 200 + i * 85, g, 30, '#ffffff'),
      ]),
    ],
    changes: { s3: { text: '4 : 1' } },
  };
  return s;
})());


/** Abfahrtstafel (neutrale Szene). */
reg((() => {
  const rows: [string, string, string, string][] = [
    ['06:42', 'ICE 593', 'Hamburg Hbf', '4'], ['06:55', 'RE 4', 'Nürnberg Hbf', '11'], ['07:08', 'IC 2012', 'Dresden Hbf', '7'],
    ['07:15', 'S 1', 'Flughafen', '2'], ['07:31', 'ICE 71', 'München Hbf', '9'], ['07:44', 'RB 82', 'Kassel-Wilhelmshöhe', '5'],
  ];
  const items: Item[] = [
    { id: 'bg', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#0b1f3a' },
    T('title', 40, 60, 'ABFAHRT', 38, '#ffd34d', { weight: 800 }),
    T('h1', 40, 110, 'ZEIT', 18, '#8aa4c0'), T('h2', 190, 110, 'ZUG', 18, '#8aa4c0'), T('h3', 400, 110, 'ZIEL', 18, '#8aa4c0'), T('h4', 940, 110, 'GLEIS', 18, '#8aa4c0', { anchor: 'end' }),
  ];
  rows.forEach((r, i) => {
    const y = 160 + i * 70;
    items.push({ id: `row${i}`, t: 'line', x: 30, y: y + 22, x2: 970, y2: y + 22, stroke: '#1d3a5f', sw: 2 });
    items.push(T(`t${i}`, 40, y, r[0], 32, '#ffffff', { mono: true }));
    items.push(T(`z${i}`, 190, y, r[1], 30, '#c7d6e6'));
    items.push(T(`d${i}`, 400, y, r[2], 32, '#ffffff', { weight: 600 }));
    items.push(T(`g${i}`, 940, y, r[3], 34, '#00e5c7', { anchor: 'end', weight: 800, mono: true }));
  });
  return { id: 'timetable1', title: 'Abfahrtstafel', bg: '#0b1f3a', items, changes: { g2: { text: '12' } } } as Scene;
})());

/** Kassenzettel (neutrale Szene): ein Preis passt nicht zur Summe. */
reg((() => {
  const rows: [string, string][] = [['Vollkornbrot', '2,49'], ['Butter', '2,19'], ['Bio-Eier 10er', '3,29'], ['Milch 1 l', '1,15'], ['Äpfel 1 kg', '2,99'], ['Schokolade', '1,29']];
  const items: Item[] = [
    { id: 'paper', t: 'rect', x: 250, y: 10, w: 500, h: 580, fill: '#f6f1e4', rx: 6 },
    T('title', 500, 70, 'SUPERMARKT HEIMAT', 30, '#222222', { anchor: 'middle', weight: 800 }),
    { id: 'sep0', t: 'line', x: 280, y: 95, x2: 720, y2: 95, stroke: '#999999', sw: 2 },
  ];
  rows.forEach((r, i) => {
    const y = 150 + i * 62;
    items.push(T(`n${i}`, 285, y, r[0], 28, '#222222'));
    items.push(T(`p${i}`, 715, y, r[1] + ' €', 28, '#222222', { anchor: 'end', mono: true }));
  });
  items.push({ id: 'sep1', t: 'line', x: 280, y: 500, x2: 720, y2: 500, stroke: '#999999', sw: 2 });
  items.push(T('sum', 285, 548, 'SUMME', 32, '#222222', { weight: 800 }));
  items.push(T('sumv', 715, 548, '13,40 €', 32, '#222222', { anchor: 'end', weight: 800, mono: true }));
  return { id: 'receipt1', title: 'Kassenzettel', bg: '#3a3a44', items, changes: { p1: { text: '2,91 €' } } } as Scene;
})());

/** FINAL LOCK: Tabelle, in der Punkte = 3 x Siege + Unentschieden gilt – eine Zahl ist gefälscht. */
reg((() => {
  const rows: [string, number, number, number, string][] = [
    ['FC Nordstern', 9, 4, 3, '31:14'], ['SV Rheinblick', 8, 5, 3, '27:15'], ['Union Elbe', 7, 6, 3, '25:16'], ['Dynamo Süd', 7, 3, 6, '22:19'],
    ['Borussia Ost', 6, 5, 5, '21:20'], ['Rot-Weiss Mitte', 5, 6, 5, '18:19'], ['FSV Küste', 4, 5, 7, '15:24'], ['Real Costa II', 2, 6, 8, '11:26'],
  ];
  const items: Item[] = [
    { id: 'bg', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#120c2b' },
    T('title', 40, 56, '🔒 FINAL LOCK · TABELLE (fiktiv)', 32, '#f5b82e', { weight: 800 }),
    T('h0', 40, 104, 'TEAM', 18, '#9a8fd0'), T('h1', 520, 104, 'SP', 18, '#9a8fd0', { anchor: 'end' }), T('h2', 590, 104, 'S', 18, '#9a8fd0', { anchor: 'end' }),
    T('h3', 660, 104, 'U', 18, '#9a8fd0', { anchor: 'end' }), T('h4', 730, 104, 'N', 18, '#9a8fd0', { anchor: 'end' }), T('h5', 840, 104, 'TORE', 18, '#9a8fd0', { anchor: 'end' }), T('h6', 960, 104, 'PKT', 18, '#9a8fd0', { anchor: 'end' }),
  ];
  rows.forEach(([n, w, d, l, g], i) => {
    const y = 160 + i * 54;
    items.push({ id: `bg${i}`, t: 'rect', x: 20, y: y - 34, w: 960, h: 48, fill: i % 2 ? '#1a1340' : '#211852', rx: 8 });
    items.push(T(`n${i}`, 40, y, `${i + 1}. ${n}`, 26, '#ffffff', { weight: 600 }));
    items.push(T(`sp${i}`, 520, y, String(w + d + l), 26, '#c9c2ee', { anchor: 'end', mono: true }));
    items.push(T(`w${i}`, 590, y, String(w), 26, '#c9c2ee', { anchor: 'end', mono: true }));
    items.push(T(`d${i}`, 660, y, String(d), 26, '#c9c2ee', { anchor: 'end', mono: true }));
    items.push(T(`l${i}`, 730, y, String(l), 26, '#c9c2ee', { anchor: 'end', mono: true }));
    items.push(T(`g${i}`, 840, y, g, 26, '#c9c2ee', { anchor: 'end', mono: true }));
    items.push(T(`p${i}`, 960, y, String(3 * w + d), 28, '#14d9c0', { anchor: 'end', weight: 800, mono: true }));
  });
  return { id: 'table1', title: 'Tabelle', bg: '#120c2b', items, changes: { p3: { text: '26' } } } as Scene;
})());

/** Speisekarte (neutrale Szene). */
reg((() => {
  const rows: [string, string][] = [['Käsespätzle', '11,50'], ['Flammkuchen', '9,80'], ['Currywurst mit Pommes', '7,90'], ['Gulaschsuppe', '6,50'], ['Schnitzel Wiener Art', '14,90'], ['Apfelstrudel', '5,20']];
  const items: Item[] = [
    { id: 'bg', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#2b1d12' },
    { id: 'frame', t: 'rect', x: 60, y: 30, w: 880, h: 540, fill: '#f3e7cf', rx: 14 },
    T('title', 500, 100, 'Gasthaus „Zum goldenen Löwen“', 36, '#5a3825', { anchor: 'middle', weight: 800 }),
    { id: 'sep', t: 'line', x: 140, y: 125, x2: 860, y2: 125, stroke: '#a0522d', sw: 3 },
  ];
  rows.forEach((r, i) => {
    const y = 190 + i * 62;
    items.push(T(`n${i}`, 140, y, r[0], 30, '#3a2616'));
    items.push(T(`p${i}`, 860, y, r[1] + ' €', 30, '#3a2616', { anchor: 'end', mono: true, weight: 700 }));
  });
  return { id: 'menu1', title: 'Speisekarte', bg: '#2b1d12', items, changes: { p4: { text: '19,40 €' } } } as Scene;
})());
