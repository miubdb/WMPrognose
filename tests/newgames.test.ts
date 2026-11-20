// Neue Spiele (Praxistest 5): LÜGEN HABEN KURZE BEINE, SCHÄTZKORRIDOR, VERDREHTE WELT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { corridorPoints, twistPoints } from '../shared/scoring';
import { normalizeTask, validateTask } from '../shared/validate';
import { buildPreview } from '../server/preview';
import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import { AV } from './helpers';
import type { Action, Book } from '../shared/types';

const fresh = () => new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-ng-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const CS = fresh(); const BOOK: Book = CS.resolveBook(CS.listPublished().find(p => p.id === 'show-new')!.ref);

function game(n: number) {
  let now = 1_800_000_000_000; const eng = new Engine(() => BOOK); const { room } = eng.newRoom('NG', now, 'x@1', 'show'); const ids: string[] = [];
  for (let i = 0; i < n; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); if (r.ok) ids.push(r.player.id); }
  let rq = 0; const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (w: 'host' | 'tv' | number) => eng.buildView(room, typeof w === 'number' ? { role: 'player', pid: ids[w] } : { role: w } as any, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const goto = (tile: string) => { for (let g = 0; g < 60; g++) { if (room.phase === 'scoreboard') { host({ k: 'h.continue' }); continue; } if (room.phase === 'round' && room.round!.tileId === tile) return; assert.ok(host({ k: 'h.skipTile' }).ok); } assert.fail('Kachel nicht erreicht ' + tile); };
  return { eng, room, ids, host, pl, view, advance, goto };
}

test('Paket „Neue Spiele – Testlabor“ ist veröffentlicht und bleibt bei der Bereinigung aktiv', () => {
  const c = fresh(); assert.ok(c.listPublished().some(p => p.id === 'show-new')); c.cleanupApply(); assert.ok(c.listPublished().some(p => p.id === 'show-new'), 'nicht archiviert');
  for (const q of ['ng-bluff-1', 'ng-corr-1', 'ng-twist-1']) assert.deepEqual(validateTask(normalizeTask((c.listQuestions().find((x: any) => x.id === q) as any).task)), [], q);
});

test('corridorPoints / twistPoints: Formeln', () => {
  assert.deepEqual(corridorPoints(90, 110, 100, 300), { hit: true, width: 20, points: 270 });
  assert.equal(corridorPoints(100, 100, 100, 300).points, 300); assert.equal(corridorPoints(50, 150, 100, 300).points, 150, 'Breite = Lösung → 50 %');
  assert.equal(corridorPoints(0, 1000, 100, 300).points, 30, 'mindestens 10 %'); assert.equal(corridorPoints(101, 120, 100, 300).points, 0, 'daneben'); assert.equal(corridorPoints(0, 0, 0, 300).points, 300);
  assert.equal(twistPoints(300, 0, 40), 300); assert.equal(twistPoints(300, 40_000, 40), 150); assert.equal(twistPoints(300, 99_000, 40), 150);
});

test('LÜGEN HABEN KURZE BEINE: Lügen, gemischte Auswahl ohne Preisgabe, Täuschen und Erkennen, keine Minuspunkte', () => {
  const g = game(4); g.goto('ng-r1'); const { host, pl, room, view, ids } = g;
  assert.ok(host({ k: 'h.begin' }).ok);
  assert.equal(pl(0, { k: 'submit', payload: { lie: 'schnecke' } }).err, 'is_truth', 'Wahrheit als Lüge wird abgelehnt');
  assert.equal(pl(0, { k: 'submit', payload: { lie: 'Chiocciola' } }).err, 'is_truth', 'auch Schreibvariante');
  assert.ok(pl(0, { k: 'submit', payload: { lie: 'Käfer' } }).ok); assert.ok(pl(1, { k: 'submit', payload: { lie: 'Maus' } }).ok); assert.ok(pl(2, { k: 'submit', payload: { lie: ' maus ' } }).ok, 'gleiche Lüge – wird zusammengefasst');
  assert.equal(JSON.stringify(view('tv').round!.data).includes('Maus'), false, 'Lügen bleiben beim Schreiben geheim');
  assert.ok(pl(3, { k: 'submit', payload: { lie: 'Ameise' } }).ok);
  assert.equal(room.round!.stage, 'bet');
  const opts = view('host').round!.data.options as any[]; assert.equal(opts.length, 4, 'Wahrheit + Käfer + Maus (zusammengefasst) + Ameise'); assert.equal(opts.filter(o => o.truth).length, 1);
  const tvOpts = view('tv').round!.data.options as any[]; assert.ok(tvOpts.every(o => !('truth' in o) && !('authors' in o)), 'TV sieht weder Wahrheit noch Autoren');
  const pOpts = view(0).round!.data; assert.ok(JSON.stringify(pOpts).indexOf('truth') < 0);
  const byText = (t: string) => opts.find(o => o.text.toLowerCase().trim() === t)!; const truth = opts.find(o => o.truth)!;
  assert.equal(pl(0, { k: 'submit', payload: { option: byText('käfer').id } }).err, 'own_lie'); assert.equal(pl(1, { k: 'submit', payload: { option: byText('maus').id } }).err, 'own_lie'); assert.equal(pl(2, { k: 'submit', payload: { option: byText('maus').id } }).err, 'own_lie', 'auch die zusammengefasste');
  assert.ok(pl(0, { k: 'submit', payload: { option: truth.id } }).ok);        // Bot1 erkennt die Wahrheit
  assert.ok(pl(1, { k: 'submit', payload: { option: byText('ameise').id } }).ok);   // Bot2 fällt auf Bot4 rein
  assert.ok(pl(2, { k: 'submit', payload: { option: byText('ameise').id } }).ok);   // Bot3 ebenfalls
  assert.ok(pl(3, { k: 'submit', payload: { option: byText('käfer').id } }).ok);    // Bot4 fällt auf Bot1 rein
  const before = room.players.map(p => p.score); assert.ok(host({ k: 'h.reveal' }).ok);
  assert.deepEqual(room.players.map((p, i) => p.score - before[i]), [200 + 100, 0, 0, 200], 'Bot1: erkannt + 1 getäuscht; Bot4: 2 getäuscht');
  const rev = view('tv').round!.reveal; assert.equal(rev.answer, 'Schnecke'); assert.ok(rev.options.find((o: any) => o.truth).text === 'Schnecke'); assert.deepEqual(rev.options.find((o: any) => /maus/i.test(o.text)).authors.length, 2);
  assert.ok(room.players.every(p => p.score >= 0));
});

test('LÜGEN: niemand lügt → keine Wahlphase; Phase wird vom Server weitergeschaltet, fehlende Wahl = 0', () => {
  const g = game(3); g.goto('ng-r1'); g.host({ k: 'h.begin' }); g.host({ k: 'h.lock' }); assert.equal(g.room.round!.stage, 'locked');
  const g2 = game(3); g2.goto('ng-r1'); g2.host({ k: 'h.begin' }); g2.pl(0, { k: 'submit', payload: { lie: 'Frosch' } }); g2.host({ k: 'h.lock' }); assert.equal(g2.room.round!.stage, 'bet');
  g2.advance(31_000); assert.equal(g2.room.round!.stage, 'locked'); const b = g2.room.players.map(p => p.score); g2.host({ k: 'h.reveal' }); assert.deepEqual(g2.room.players.map((p, i) => p.score - b[i]), [0, 0, 0]);
});

test('SCHÄTZKORRIDOR: Treffer nach Breite, Fehlschuss 0, ungültige Eingaben, Abgabe endgültig', () => {
  const g = game(4); g.goto('ng-r2'); const { host, pl, room, view } = g; host({ k: 'h.begin' });
  assert.equal(pl(0, { k: 'submit', payload: { low: 10, high: 5 } }).err, 'low_gt_high'); assert.equal(pl(0, { k: 'submit', payload: { low: 'abc', high: 5 } }).err, 'invalid');
  const ans = 8849;
  assert.ok(pl(0, { k: 'submit', payload: { low: 8700, high: 9000 } }).ok); assert.ok(pl(1, { k: 'submit', payload: { low: 1000, high: 20000 } }).ok); assert.ok(pl(2, { k: 'submit', payload: { low: 9000, high: 9500 } }).ok);
  assert.equal(pl(0, { k: 'submit', payload: { low: 1, high: 2 } }).err, 'already_submitted'); assert.equal(JSON.stringify(view('tv').round!.data).includes('8700'), false, 'geheim');
  host({ k: 'h.lock' }); const b = room.players.map(p => p.score); host({ k: 'h.reveal' });
  const d = room.players.map((p, i) => p.score - b[i]);
  assert.equal(d[0], corridorPoints(8700, 9000, ans, 300).points); assert.equal(d[1], corridorPoints(1000, 20000, ans, 300).points); assert.equal(d[2], 0); assert.equal(d[3], 0);
  assert.ok(d[0] > d[1] && d[1] > 0, 'enger Bereich schlägt weiten');
});

test('VERDREHTE WELT: Schreibweisen, Tippfehler-Toleranz, Tempo, Falsch = 0, ein Versuch', () => {
  const g = game(4); g.goto('ng-r3'); const { host, pl, room, advance } = g; host({ k: 'h.begin' });
  assert.ok(pl(0, { k: 'submit', payload: { answer: 'fast & furious' } }).ok); advance(20_000);
  assert.ok(pl(1, { k: 'submit', payload: { answer: 'Fast and Furious' } }).ok); assert.ok(pl(2, { k: 'submit', payload: { answer: 'Taxi Driver' } }).ok);
  assert.equal(pl(2, { k: 'submit', payload: { answer: 'Fast & Furious' } }).err, 'already_submitted');
  host({ k: 'h.lock' }); const b = room.players.map(p => p.score); host({ k: 'h.reveal' }); const d = room.players.map((p, i) => p.score - b[i]);
  assert.ok(d[0] >= 295 && d[0] <= 300, 'sofort richtig ≈ volle Punkte'); assert.ok(d[1] >= 220 && d[1] < d[0], 'später = weniger'); assert.equal(d[2], 0); assert.equal(d[3], 0);
});

test('Vorschau im Admin funktioniert für alle drei neuen Modi', () => {
  for (const q of ['ng-bluff-1', 'ng-corr-1', 'ng-twist-1']) { const task = (CS.listQuestions().find((x: any) => x.id === q) as any).task; const r: any = buildPreview(task, SCENES); assert.ok(r.ok, q + JSON.stringify(r.problems)); assert.ok(r.frames.length >= 3); assert.ok(r.formula.length > 20); }
});

test('Komplette Show „Neue Spiele – Testlabor“ ist durchspielbar (inkl. KICKBASE-KONSENS, Marktwert-Updates, Siegerehrung)', () => {
  const g = game(3); const { host, pl, room, view, ids, eng } = g;
  for (let guard = 0; guard < 300 && room.phase !== 'ceremony'; guard++) {
    if (room.phase === 'scoreboard') { host({ k: 'h.continue' }); continue; }
    const t = eng.curTask(room) as any; host({ k: 'h.begin' });
    ids.forEach((_, i) => { if (t.mode === 'bluff') pl(i, { k: 'submit', payload: { lie: 'Erfindung ' + i } }); if (t.mode === 'corridor') pl(i, { k: 'submit', payload: { low: t.answer * (0.5 + i * 0.2), high: t.answer * 1.5 } }); if (t.mode === 'twist') pl(i, { k: 'submit', payload: { answer: i ? 'x' : t.answer } }); if (t.mode === 'vote') pl(i, { k: 'submit', payload: { target: 'host:candidate' } }); });
    if (t.mode === 'bluff') { host({ k: 'h.lock' }); const o = view('host').round!.data.options as any[]; ids.forEach((_, i) => pl(i, { k: 'submit', payload: { option: (o.find(x => x.truth) as any).id } })); }
    host({ k: 'h.lock' }); host({ k: 'h.reveal' }); host({ k: 'h.next' });
  }
  assert.equal(room.phase, 'ceremony'); assert.ok(room.players.every(p => p.score >= 0));
});
