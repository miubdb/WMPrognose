import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  placeFactor, GEO_TABLE, scoreGeo, geoFraction, geoPoints, rankPairs, scoreRank, scoreEstimate, estimateError, scoreGlitch, scoreCode, codeMatches,
  groupUnique, scoreUnique, applyClamped, matchValid, rankAscending,
} from '../shared/scoring';
import { haversineKm, normText, parseNumber } from '../shared/util';
import { SCENES, diffZones, variantItems } from '../shared/scenes';
import { TILES } from '../content/tiles';
import { glitchZones } from '../server/modes';

test('Haversine: Berlin–Tokio ≈ 8.916 km, gleicher Punkt = 0', () => {
  assert.equal(Math.round(haversineKm({ lat: 52.52, lon: 13.405 }, { lat: 35.6762, lon: 139.6503 })), 8916);
  assert.equal(haversineKm({ lat: 1, lon: 1 }, { lat: 1, lon: 1 }), 0);
  // Datumsgrenze: 179.9 → -179.9 ist sehr nah
  assert.ok(haversineKm({ lat: 0, lon: 179.9 }, { lat: 0, lon: -179.9 }) < 30);
});

test('Platzierungstabelle: 7 Spieler = 100/80/65/50/35/20/10 %', () => {
  const pcts = [1, 2, 3, 4, 5, 6, 7].map(p => Math.round(placeFactor(GEO_TABLE, p, 7) * 100));
  assert.deepEqual(pcts, [100, 80, 65, 50, 35, 20, 10]);
  assert.equal(placeFactor(GEO_TABLE, 1, 1), 1);
  // 6 Spieler: erster 100, letzter 10, monoton fallend
  const six = [1, 2, 3, 4, 5, 6].map(p => placeFactor(GEO_TABLE, p, 6));
  assert.equal(six[0], 1); assert.ok(Math.abs(six[5] - 0.1) < 1e-9);
  for (let i = 1; i < six.length; i++) assert.ok(six[i] < six[i - 1]);
});

test('Geo: Punkte hängen nur von der Entfernung ab (nicht von Mitspielern/Rang), stetig fallend, Treffer = volle Punkte', () => {
  const ans = { lat: 50, lon: 10 };
  const g = { a: { lat: 50, lon: 10 }, b: { lat: 51, lon: 10 }, c: { lat: 49, lon: 10 }, d: { lat: 0, lon: 0 } };
  const r = scoreGeo(g, ans, 1000, 7, 'germany');
  assert.equal(r.a.points, 1000); assert.equal(r.b.points, r.c.points, 'gleiche Entfernung = gleiche Punkte');
  assert.ok(r.a.points > r.b.points && r.b.points > r.d.points); assert.equal(r.e, undefined);
  // unabhängig von den Mitspielern: derselbe Tipp allein oder mit anderen = dieselben Punkte
  const alone = scoreGeo({ b: g.b }, ans, 1000, 1, 'germany'); assert.equal(alone.b.points, r.b.points);
  const crowd = scoreGeo({ ...g, x: { lat: 50.01, lon: 10 }, y: { lat: 50.02, lon: 10 } }, ans, 1000, 7, 'germany'); assert.equal(crowd.b.points, r.b.points);
  // zwei Spieler gleich weit entfernt in verschiedene Richtungen
  const t = scoreGeo({ x: { lat: 50, lon: 11 }, y: { lat: 50, lon: 11 } }, ans, 250, 4); assert.equal(t.x.points, t.y.points);
});

test('Geo-Kalibrierung: Skalen für Deutschland / Europa / Welt (Prozent der Maximalpunkte)', () => {
  const pct = (km: number, m: 'germany' | 'europe' | 'world') => Math.round(geoFraction(km, m) * 100);
  // Deutschland (S = 200 km)
  assert.deepEqual([0, 2, 10, 50, 100, 300, 600].map(k => pct(k, 'germany')), [100, 100, 96, 79, 61, 23, 5]);
  // Europa (S = 700 km)
  assert.deepEqual([0, 5, 100, 500, 1500, 3000].map(k => pct(k, 'europe')), [100, 100, 87, 49, 12, 1]);
  // Welt (S = 2000 km)
  assert.deepEqual([0, 15, 500, 1000, 5000, 10000].map(k => pct(k, 'world')), [100, 100, 78, 61, 8, 1]);
  // dieselbe Entfernung zählt auf größeren Karten großzügiger
  assert.ok(geoFraction(300, 'world') > geoFraction(300, 'europe') && geoFraction(300, 'europe') > geoFraction(300, 'germany'));
  // monoton fallend
  for (const m of ['germany', 'europe', 'world'] as const) { let prev = 2; for (let k = 0; k <= 20000; k += 50) { const f = geoFraction(k, m); assert.ok(f <= prev + 1e-12); prev = f; } }
  assert.equal(geoPoints(1234, 300, 'europe'), Math.round(300 * geoFraction(1234, 'europe')));
});

test('Blind Rank: 10 Paare, Punkte anteilig', () => {
  assert.deepEqual(rankPairs([0, 1, 2, 3, 4]), { correct: 10, total: 10 });
  assert.deepEqual(rankPairs([4, 3, 2, 1, 0]), { correct: 0, total: 10 });
  assert.equal(rankPairs([1, 0, 2, 3, 4]).correct, 9); // eine Vertauschung = 1 Paar falsch
  assert.equal(scoreRank([0, 1, 2, 3, 4], 500).points, 500);
  assert.equal(scoreRank([1, 0, 2, 3, 4], 500).points, 450);
  assert.equal(scoreRank(undefined, 500).points, 0);
  // nicht platzierte Begriffe zählen nicht (Plätze 3,4 leer)
  assert.equal(rankPairs([0, 1, -1, -1, 2]).correct, 3);
});

test('Setz auf mich: Schätzung relativ (log), große Zahlen nicht benachteiligt, Gleichstand', () => {
  // Faktor 2 daneben ist bei 100 und bei 10 Mio. gleich schlecht
  assert.ok(Math.abs(estimateError(200, 100) - estimateError(20_000_000, 10_000_000)) < 1e-12);
  assert.ok(Math.abs(estimateError(50, 100) - estimateError(200, 100)) < 1e-12); // symmetrisch
  const r = scoreEstimate({ a: 90, b: 110, c: 300, d: 1 }, 100, 300, 7);
  // 90 und 110 sind nicht gleich weit (log): 110 ist näher an 100
  assert.equal(r.b.place, 1); assert.equal(r.b.points, 300); assert.equal(r.a.place, 2);
  const tie = scoreEstimate({ a: 50, b: 200 }, 100, 300, 7);
  assert.equal(tie.a.place, 1); assert.equal(tie.b.place, 1); assert.equal(tie.a.points, tie.b.points);
  const z = scoreEstimate({ a: 0, b: 5 }, 100, 300, 2); // 0/negativ = ganz hinten
  assert.equal(z.b.place, 1);
});

test('Glitch: nur Treffer (volle Punkte) oder 0 – keine Trostpunkte; enge Box + Fingertoleranz; kein Fehlalarm', () => {
  const zones = [{ x: 500, y: 300, r: 150, hw: 150, hh: 15 }];   // lange Textzeile: flache Box
  assert.equal(scoreGlitch({ x: 500, y: 300 }, zones, 250).points, 250);
  assert.equal(scoreGlitch({ x: 640, y: 310 }, zones, 250).points, 250, 'innerhalb der Box');
  assert.equal(scoreGlitch({ x: 500, y: 340 }, zones, 250).points, 250, '25 px unter der Box = Fingertoleranz → volle Punkte');
  for (const dy of [51, 60, 80, 100, 200]) { const r = scoreGlitch({ x: 500, y: 300 + dy }, zones, 250); assert.equal(r.hit, false); assert.equal(r.points, 0, `dy=${dy}: keine Trostpunkte`); }
  assert.equal(scoreGlitch(undefined, zones, 250).points, 0);
  assert.equal(scoreGlitch({ x: 500, y: 300 }, [{ x: 500, y: 300, r: 50 }], 250).points, 250, 'alte Kreiszonen funktionieren weiter');
  assert.equal(scoreGlitch({ x: 600, y: 300 }, [{ x: 500, y: 300, r: 50 }], 250).points, 0);
});

test('Glitch: alle mitgelieferten Szenen – Zonen eng, plausibel und lesbar', () => {
  for (const [id, sc] of Object.entries(SCENES)) {
    const zs = diffZones(sc); assert.equal(zs.length, Object.keys(sc.changes).length, id);
    for (const z of zs) {
      assert.ok(z.hw! >= 18 && z.hh! >= 18, id + ' Mindestgröße'); assert.ok(z.hw! <= 260 && z.hh! <= 120, `${id}: Zone zu groß (${z.hw}×${z.hh})`);
      assert.ok(z.x - z.hw! >= -5 && z.x + z.hw! <= 1005 && z.y - z.hh! >= -5 && z.y + z.hh! <= 605, id + ' innerhalb des Bildes');
      assert.equal(scoreGlitch({ x: z.x, y: z.y }, zs, 100).points, 100, id + ' Mitte trifft');
      assert.ok(!scoreGlitch({ x: z.x + z.hw! + 140, y: z.y + z.hh! + 140 }, zs, 100).hit, id + ' weit daneben trifft nicht');
    }
  }
});

test('Codebreak: Hinweise reduzieren, Normalisierung', () => {
  assert.deepEqual([0, 1, 2, 3].map(h => scoreCode(true, h, 400)), [400, 300, 200, 100]);
  assert.equal(scoreCode(false, 0, 400), 0);
  assert.ok(codeMatches(' 65 ', ['65']));
  assert.ok(codeMatches('Fünfundsechzig', ['fuenfundsechzig']));
  assert.ok(!codeMatches('', ['65']));
});

test('Einzigartig: Schreibweisen, Synonyme, Duplikate, Host-Entscheidung', () => {
  const valid = [{ name: 'Slowakei', variants: ['Slovakia'] }, { name: 'Schweden', variants: [] }, { name: 'Serbien', variants: [] }];
  assert.equal(matchValid('  slowakei ', valid), 'Slowakei');
  assert.equal(matchValid('Slovakia', valid), 'Slowakei');
  assert.equal(matchValid('Schwedn', valid), 'Schweden'); // Tippfehler
  assert.equal(matchValid('Peru', valid), null);
  const groups = groupUnique({ a: 'Schweden', b: 'schweden', c: 'Serbien', d: 'Peru', e: 'Peru' }, valid);
  const res = scoreUnique(groups, 500, 150);
  assert.equal(res.a.points, 0, 'mehrfach genannt = 0'); assert.equal(res.b.points, 0);
  assert.equal(res.c.points, 500); assert.equal(res.d.points, 0); assert.equal(res.d.kind, 'unknown');
  // Host gibt "Peru" frei (wird als gültig, mehrfach gewertet) bzw. mappt auf Serbien
  const g2 = groupUnique({ a: 'Peru', b: 'Serbien' }, valid, { 'u:peru': 'valid' });
  assert.equal(scoreUnique(g2, 500, 150).a.points, 500);
  const g3 = groupUnique({ a: 'Peru', b: 'Serbien' }, valid, { 'u:peru': { mapTo: 'Serbien' } });
  const r3 = scoreUnique(g3, 500, 150);
  assert.equal(r3.a.points, 0); assert.equal(r3.b.points, 0);
  const g4 = groupUnique({ a: 'Peru' }, valid, { 'u:peru': 'invalid' });
  assert.equal(scoreUnique(g4, 500, 150).a.kind, 'invalid');
});

test('Punktestand wird nie negativ', () => {
  assert.equal(applyClamped(50, -200), -50);
  assert.equal(applyClamped(0, -200), -0);
  assert.equal(applyClamped(300, -200), -200);
  assert.equal(applyClamped(10, 200), 200);
});

test('Zahlen- und Textparser', () => {
  assert.equal(parseNumber('1.234,5'), 1234.5);
  assert.equal(parseNumber('8916'), 8916);
  assert.equal(parseNumber('1.000.000'), 1000000);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber('3,5'), 3.5);
  assert.equal(normText('Mbappé'), 'mbappe');
  assert.equal(normText('Straße'), 'strasse');
});

test('Rangfolge mit Gleichstand (1,1,3)', () => {
  const r = rankAscending([{ pid: 'a', value: 5 }, { pid: 'b', value: 5 }, { pid: 'c', value: 9 }]);
  assert.deepEqual(r.map(x => x.place), [1, 1, 3]);
});

// ---------------- Inhalte ----------------
const maxOf = (t: any) => t.mode === 'estimate' ? t.points + Math.max(...t.bets) : t.mode === 'unique' ? t.pointsUnique : t.points;

test('Inhalte: Budget je Kachel = 1000 (Rank 750, Match/Link 900), Überraschung = 1000, Finale = 2000', () => {
  for (const t of TILES) {
    const sum = t.tasks.reduce((a, x) => a + maxOf(x), 0);
    const expected = t.kind === 'final' ? 2000 : (t.mode === 'match' || t.mode === 'link') ? 900 : t.mode === 'rank' ? 750 : 1000;
    assert.equal(sum, expected, `${t.id}: ${sum}`);
  }
  assert.ok(TILES.filter(t => t.kind === 'tile').length >= 8);
});

test('Inhalte: Struktur & Rätsel eindeutig lösbar', () => {
  for (const t of TILES) for (const task of t.tasks) {
    if (task.mode === 'rank') {
      assert.equal(task.items.length, 5); assert.deepEqual([...task.order].sort(), [0, 1, 2, 3, 4]);
      assert.notDeepEqual(task.order, [0, 1, 2, 3, 4]);
    }
    if (task.mode === 'codebreak') { assert.ok(task.answers.length && task.hints.length === 3 && task.explain); }
    if (task.mode === 'geo') { assert.ok(Math.abs(task.answer.lat) <= 90 && Math.abs(task.answer.lon) <= 180); }
    if (task.mode === 'estimate') { assert.ok(task.bets[0] === 0 && task.answer > 0); }
    if (task.mode === 'unique') { assert.ok(task.valid.length >= 5); }
    assert.ok(!/lorem|todo|platzhalter/i.test(JSON.stringify(task)));
  }
});

test('Inhalte: Fußball-Anteil ≈ 25 %+, Rank-Werte streng sortiert', () => {
  const tasks = TILES.flatMap(t => t.tasks.map(x => ({ t, x })));
  const fb = tasks.filter(({ t }) => t.football).length;
  assert.ok(fb / tasks.length >= 0.2 && fb / tasks.length <= 0.4, `Anteil ${fb}/${tasks.length}`);
  const num = (s?: string) => Number((s ?? '').replace(/[^\d]/g, ''));
  for (const { x } of tasks) if (x.mode === 'rank') {
    const vals = x.items.map(i => num(i.value));
    for (let i = 1; i < vals.length; i++) assert.notEqual(vals[i], vals[i - 1]);
  }
});

test('Glitch-Szenen: Änderungen sind exakt, Zonen innerhalb der Szene', () => {
  for (const t of TILES) for (const task of t.tasks) if (task.mode === 'glitch') {
    const scene = SCENES[task.scene];
    assert.ok(scene, task.scene);
    const zones = glitchZones(task);
    assert.ok(zones.length >= 1, task.scene);
    for (const z of zones) assert.ok(z.x > 0 && z.x < 1000 && z.y > 0 && z.y < 600 && z.hw! >= 18);
    // Jede Änderung verändert die Szene tatsächlich
    const a = JSON.stringify(variantItems(scene, 'a')), b = JSON.stringify(variantItems(scene, 'b'));
    assert.notEqual(a, b);
    assert.equal(diffZones(scene).length, Object.keys(scene.changes).length);
  }
});

test('Einzigartig: vorsichtige Tippfehlererkennung – ähnliche gültige Begriffe werden nie zusammengeführt, Showmaster sieht Auto-Treffer', () => {
  const valid = [{ name: 'Kamerun', variants: [] }, { name: 'Kamerum', variants: [] }, { name: 'Spanien', variants: ['Espana'] }, { name: 'Schweden', variants: [] }];
  assert.equal(matchValid('Kamerin', valid), null, 'ähnliche gültige Begriffe → nie automatisch zusammenführen');
  assert.equal(matchValid('Kamerux', valid), null);
  assert.equal(matchValid('kamerum', valid), 'Kamerum', 'exakte Schreibweise bleibt automatisch');
  assert.equal(matchValid('Spanein', valid), 'Spanien', 'eindeutiger Tippfehler, gleicher Anfangsbuchstabe');
  assert.equal(matchValid('Pani', valid), null); assert.equal(matchValid('Weden', valid), null, 'zu kurz / anderer Anfangsbuchstabe');
  const g = groupUnique({ a: 'Spanien', b: 'Spanein', c: 'Peruu' }, valid);
  const sp = g.find(x => x.label === 'Spanien')!; assert.deepEqual(sp.members.sort(), ['a', 'b']); assert.deepEqual(sp.auto, ['b']);
  assert.equal(g.find(x => x.state === 'unknown')!.members[0], 'c');
  // Showmaster widerspricht dem Auto-Treffer: Eingabe wird getrennt behandelt
  const g2 = groupUnique({ a: 'Spanien', b: 'Spanein' }, valid, { 'u:spanein': 'invalid' });
  assert.equal(scoreUnique(g2, 500, 150).a.points, 500); assert.equal(scoreUnique(g2, 500, 150).b.kind, 'invalid');
});
