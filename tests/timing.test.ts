import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES } from '../content/tiles';
import { tileSeconds, showSeconds } from '../shared/timing';

const regular = TILES.filter(t => t.kind === 'tile');
const surprise = TILES.find(t => t.kind === 'surprise')!;
const final = TILES.find(t => t.kind === 'final')!;

test('Spielzeit: jede Kachel dauert 5–8 Minuten, Überraschung ca. 6–8, Finale 10–13', () => {
  for (const t of regular) { const m = tileSeconds(t) / 60; assert.ok(m >= 5 && m <= 8, `${t.id}: ${m.toFixed(1)} min`); }
  const su = tileSeconds(surprise) / 60, fi = tileSeconds(final) / 60;
  assert.ok(su >= 5.5 && su <= 8, `Überraschung ${su.toFixed(1)}`);
  assert.ok(fi >= 9.5 && fi <= 13, `Finale ${fi.toFixed(1)}`);
});

test('Spielzeit: jede mögliche Auswahl von 6 Kacheln ergibt 60–75 Minuten', () => {
  const idx = regular.map((_, i) => i);
  const combos: number[][] = [];
  const rec = (start: number, cur: number[]) => { if (cur.length === 6) { combos.push(cur.slice()); return; } for (let i = start; i < idx.length; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  let min = Infinity, max = 0;
  for (const c of combos) { const m = showSeconds(c.map(i => regular[i]), surprise, final) / 60; min = Math.min(min, m); max = Math.max(max, m); }
  console.log(`# Spielzeit: ${combos.length} Kombinationen, ${min.toFixed(1)}–${max.toFixed(1)} min`);
  assert.ok(min >= 60 && max <= 75, `${min.toFixed(1)}–${max.toFixed(1)}`);
});
