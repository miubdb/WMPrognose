// Vorlagen zum Erstellen einfacher Glitch-Szenen ohne Code. Die Unterschiede (changes) werden exakt aus den Parametern erzeugt.
import type { Item, Scene } from './scenes';

export type SceneTemplate =
  | { kind: 'grid'; title: string; emoji: string; oddEmoji: string; cols: number; rows: number; oddRow: number; oddCol: number }
  | { kind: 'list'; title: string; rows: { label: string; value: string }[]; changeRow: number; newValue: string; style: 'menu' | 'receipt' | 'dark' }
  | { kind: 'table'; title: string; headers: string[]; rows: string[][]; changeRow: number; changeCol: number; newValue: string }
  | { kind: 'pitch'; title: string; change: 'ball' | 'home' | 'away' | 'remove-home'; index: number; dx: number; dy: number };

const T = (id: string, x: number, y: number, text: string, size: number, fill: string, o: Partial<Extract<Item, { t: 'text' }>> = {}): Item => ({ id, t: 'text', x, y, text, size, fill, ...o });

export function validateTemplate(t: SceneTemplate): string[] {
  const e: string[] = [];
  const str = (s: unknown, max: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  if (!t || typeof t !== 'object') return ['Vorlage fehlt'];
  if (!str(t.title, 40)) e.push('Titel (1–40 Zeichen) fehlt');
  switch (t.kind) {
    case 'grid':
      if (!(t.cols >= 3 && t.cols <= 12 && t.rows >= 2 && t.rows <= 8)) e.push('Raster: 3–12 Spalten, 2–8 Zeilen');
      if (!str(t.emoji, 8) || !str(t.oddEmoji, 8)) e.push('Symbole fehlen');
      else if (t.emoji === t.oddEmoji) e.push('Das abweichende Symbol muss sich unterscheiden');
      if (!(t.oddRow >= 0 && t.oddRow < t.rows && t.oddCol >= 0 && t.oddCol < t.cols)) e.push('Position des Unterschieds liegt außerhalb');
      break;
    case 'list':
      if (!Array.isArray(t.rows) || t.rows.length < 2 || t.rows.length > 9) e.push('Liste: 2–9 Zeilen');
      else {
        if (t.rows.some(r => !str(r.label, 28) || !str(r.value, 14))) e.push('Jede Zeile braucht Text (≤28) und Wert (≤14)');
        if (!(t.changeRow >= 0 && t.changeRow < t.rows.length)) e.push('Geänderte Zeile ungültig');
        else if (!str(t.newValue, 14) || t.newValue === t.rows[t.changeRow].value) e.push('Neuer Wert fehlt oder ist unverändert');
      }
      break;
    case 'table':
      if (!Array.isArray(t.headers) || t.headers.length < 2 || t.headers.length > 7) e.push('Tabelle: 2–7 Spalten');
      else if (!Array.isArray(t.rows) || t.rows.length < 2 || t.rows.length > 10) e.push('Tabelle: 2–10 Zeilen');
      else {
        if (t.rows.some(r => !Array.isArray(r) || r.length !== t.headers.length || r.some(c => typeof c !== 'string' || c.length > 24))) e.push('Alle Zeilen brauchen genau so viele Zellen wie Spalten (≤24 Zeichen)');
        else if (!(t.changeRow >= 0 && t.changeRow < t.rows.length && t.changeCol >= 0 && t.changeCol < t.headers.length)) e.push('Geänderte Zelle ungültig');
        else if (!str(t.newValue, 24) || t.newValue === t.rows[t.changeRow][t.changeCol]) e.push('Neuer Wert fehlt oder ist unverändert');
      }
      break;
    case 'pitch':
      if (!['ball', 'home', 'away', 'remove-home'].includes(t.change)) e.push('Änderungsart ungültig');
      if (!(t.index >= 0 && t.index <= 10)) e.push('Spielernummer 1–11');
      if (t.change !== 'remove-home' && Math.hypot(t.dx, t.dy) < 40) e.push('Verschiebung zu klein (mind. 40) – sonst kaum erkennbar');
      break;
    default: e.push('Unbekannte Vorlage');
  }
  return e;
}

const HOME: [number, number][] = [[110, 300], [250, 120], [250, 240], [250, 360], [250, 480], [420, 160], [420, 300], [420, 440], [600, 150], [620, 300], [600, 450]];
const AWAY: [number, number][] = [[890, 300], [760, 120], [760, 240], [760, 360], [760, 480], [620, 180], [580, 300], [620, 420], [450, 220], [450, 380], [350, 300]];

export function buildScene(id: string, t: SceneTemplate): Scene {
  const base = { id, title: t.title, template: t } as const;
  switch (t.kind) {
    case 'grid': {
      const items: Item[] = [{ id: 'panel', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#241a3a' }];
      const cw = 1000 / t.cols, ch = 600 / t.rows;
      const size = Math.min(64, Math.floor(Math.min(cw, ch) * 0.8));
      for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) items.push(T(`e${r}_${c}`, cw * c + cw / 2, ch * r + ch / 2 + size * 0.34, t.emoji, size, '#ffffff', { anchor: 'middle' }));
      return { ...base, bg: '#241a3a', items, changes: { [`e${t.oddRow}_${t.oddCol}`]: { text: t.oddEmoji } } };
    }
    case 'list': {
      const dark = t.style === 'dark', paper = t.style === 'receipt';
      const bg = dark ? '#10101a' : paper ? '#3a3a44' : '#2b1d12';
      const sheet = dark ? '#1b1b2e' : paper ? '#f6f1e4' : '#f3e7cf';
      const ink = dark ? '#ffffff' : '#2a1d12';
      const items: Item[] = [
        { id: 'bg', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: bg },
        { id: 'sheet', t: 'rect', x: 120, y: 24, w: 760, h: 552, fill: sheet, rx: 14 },
        T('title', 500, 90, t.title, 34, ink, { anchor: 'middle', weight: 800 }),
        { id: 'sep', t: 'line', x: 170, y: 116, x2: 830, y2: 116, stroke: dark ? '#4a4a7a' : '#a0522d', sw: 3 },
      ];
      const step = Math.min(62, 420 / t.rows.length);
      t.rows.forEach((r, i) => {
        const y = 175 + i * step;
        items.push(T(`n${i}`, 170, y, r.label, 28, ink));
        items.push(T(`v${i}`, 830, y, r.value, 28, ink, { anchor: 'end', mono: true, weight: 700 }));
      });
      return { ...base, bg, items, changes: { [`v${t.changeRow}`]: { text: t.newValue } } };
    }
    case 'table': {
      const n = t.headers.length;
      const items: Item[] = [
        { id: 'bg', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#120c2b' },
        T('title', 40, 56, t.title, 32, '#f5b82e', { weight: 800 }),
      ];
      const x0 = 40, x1 = 960, firstW = n > 2 ? 380 : 560;
      const colX = (c: number) => (c === 0 ? x0 : x0 + firstW + ((x1 - x0 - firstW) / (n - 1)) * c);
      t.headers.forEach((h, c) => items.push(T(`h${c}`, c === 0 ? x0 : colX(c), 104, h, 18, '#9a8fd0', { anchor: c === 0 ? 'start' : 'end' })));
      const rh = Math.min(54, 440 / t.rows.length), fs = Math.min(26, Math.floor(rh * 0.5));
      t.rows.forEach((row, r) => {
        const y = 150 + r * rh;
        items.push({ id: `bg${r}`, t: 'rect', x: 20, y: y - rh * 0.68, w: 960, h: rh * 0.9, fill: r % 2 ? '#1a1340' : '#211852', rx: 8 });
        row.forEach((cell, c) => items.push(T(`c${r}_${c}`, c === 0 ? x0 : colX(c), y, cell, fs, c === n - 1 ? '#14d9c0' : '#ffffff', { anchor: c === 0 ? 'start' : 'end', mono: c > 0, weight: c === 0 ? 600 : 400 })));
      });
      return { ...base, bg: '#120c2b', items, changes: { [`c${t.changeRow}_${t.changeCol}`]: { text: t.newValue } } };
    }
    case 'pitch': {
      const items: Item[] = [
        { id: 'grass', t: 'rect', x: 0, y: 0, w: 1000, h: 600, fill: '#1e6b34' },
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ id: `stripe${i}`, t: 'rect' as const, x: i * 125, y: 0, w: 125, h: 600, fill: i % 2 ? '#1f7036' : '#1b6330' })),
        { id: 'l-out', t: 'rect', x: 30, y: 30, w: 940, h: 540, fill: 'none', stroke: '#ffffffcc' },
        { id: 'l-mid', t: 'line', x: 500, y: 30, x2: 500, y2: 570, stroke: '#ffffffcc', sw: 4 },
        { id: 'l-circ', t: 'circle', x: 500, y: 300, r: 70, fill: 'none', stroke: '#ffffffcc' },
        { id: 'box-l', t: 'rect', x: 30, y: 150, w: 150, h: 300, fill: 'none', stroke: '#ffffffcc' },
        { id: 'box-r', t: 'rect', x: 820, y: 150, w: 150, h: 300, fill: 'none', stroke: '#ffffffcc' },
      ];
      HOME.forEach(([x, y], i) => items.push({ id: `h${i}`, t: 'circle', x, y, r: 20, fill: '#e53935', stroke: '#ffffff' }));
      AWAY.forEach(([x, y], i) => items.push({ id: `g${i}`, t: 'circle', x, y, r: 20, fill: '#1e88e5', stroke: '#ffffff' }));
      items.push({ id: 'ball', t: 'circle', x: 515, y: 305, r: 11, fill: '#ffffff', stroke: '#000000' });
      const clampX = (v: number) => Math.max(50, Math.min(950, v)), clampY = (v: number) => Math.max(50, Math.min(550, v));
      let changes: Scene['changes'] = {};
      if (t.change === 'ball') changes = { ball: { x: clampX(515 + t.dx), y: clampY(305 + t.dy) } };
      else if (t.change === 'home') changes = { [`h${t.index}`]: { x: clampX(HOME[t.index][0] + t.dx), y: clampY(HOME[t.index][1] + t.dy) } };
      else if (t.change === 'away') changes = { [`g${t.index}`]: { x: clampX(AWAY[t.index][0] + t.dx), y: clampY(AWAY[t.index][1] + t.dy) } };
      else changes = { [`h${t.index}`]: null };
      return { ...base, bg: '#1e6b34', items, changes };
    }
  }
}
