// Sieben neue Spiele: PIXELPANIK, DUELL DER DEPPEN, DIE ARENA, TONSPUR, ZEITSPRUNG, PANIK, HOCHSTAPLER.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { ACTIVE_MODES, normalizeTask, validateTask } from '../shared/validate';
import { PIXEL_POINTS, SOUND_POINTS, timelineSlot, timelinePoints } from '../shared/scoring';
import { buildPreview } from '../server/preview';
import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import { GAMES } from '../shared/games';
import { AV } from './helpers';
import type { Action, Book } from '../shared/types';

const fresh = () => new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-sm-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const CS = fresh(); const BOOK: Book = CS.resolveBook(CS.listPublished().find(p => p.id === 'show-modes')!.ref);

function game(n: number, book: Book = BOOK) {
  let now = 1_800_000_000_000; const eng = new Engine(() => book); const { room } = eng.newRoom('SM', now, 'x@1', 'show'); const ids: string[] = [];
  for (let i = 0; i < n; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); if (r.ok) ids.push(r.player.id); }
  let rq = 0; const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (w: 'host' | 'tv' | number) => eng.buildView(room, typeof w === 'number' ? { role: 'player', pid: ids[w] } : { role: w } as any, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const goto = (tile: string, task = 0) => { for (let g = 0; g < 80; g++) { if (room.phase === 'scoreboard') { host({ k: 'h.continue' }); continue; } if (room.phase === 'round' && room.round!.tileId === tile) break; assert.ok(host({ k: 'h.skipTile' }).ok); } for (let i = 0; i < task; i++) host({ k: 'h.skipTask' }); };
  const delta = (fn: () => void) => { const b = room.players.map(p => p.score); fn(); return room.players.map((p, i) => p.score - b[i]); };
  return { eng, room, ids, host, pl, view, advance, goto, delta, idx: (id: string) => ids.indexOf(id) };
}
const data = (g: ReturnType<typeof game>, w: 'host' | 'tv' | number = 'host') => g.view(w).round!.data;

test('17 aktive reguläre Spielmodi, alle verschieden, alle in der Spieleliste; Testpaket veröffentlicht und alle Aufgaben gültig', () => {
  assert.equal(ACTIVE_MODES.length, 17); assert.equal(new Set(ACTIVE_MODES).size, 17); assert.ok(!ACTIVE_MODES.includes('codebreak' as any));
  for (const m of ACTIVE_MODES) assert.ok(GAMES.some(g => g.mode === m), m); assert.equal(GAMES.filter(g => g.kind === 'Spiel').length, 17);
  const modes = new Set(BOOK.tiles.flatMap(t => t.tasks.map(x => x.mode))); for (const m of ['pixel', 'duel', 'arena', 'sound', 'timeline', 'panic', 'impostor']) assert.ok(modes.has(m as any), m);
  for (const t of BOOK.tiles.filter(x => x.kind === 'tile')) { assert.ok(t.tasks.length >= 3, t.title); for (const k of t.tasks) assert.deepEqual(validateTask(normalizeTask(k)), [], t.title + ': ' + (k as any).prompt); }
  assert.ok(CS.listPublished().some(p => p.id === 'show-modes'));
});

test('PIXELPANIK: Stufen steigen mit der Zeit, Punkte 300/240/180/120/60, Bild/Medien nur für TV/Host und nie weiter als gezeigt', () => {
  const g = game(3); g.goto('nm-r1'); g.host({ k: 'h.begin' }); const { pl, room, view, eng } = g;
  const pv = JSON.stringify(view(0).round); assert.ok(!pv.includes('data:image') && !pv.includes('"media"'), 'Handy sieht weder Bild noch Schlüssel');
  const tvd = data(g, 'tv'); assert.ok(tvd.media && !JSON.stringify(view('tv')).includes('data:image'), 'TV bekommt nur einen Schlüssel, keine Bilddaten');
  assert.ok(eng.mediaFor(room, tvd.media, 'l0')); assert.equal(eng.mediaFor(room, tvd.media, 'l3'), null, 'noch nicht freigegebene Stufe'); assert.equal(eng.mediaFor(room, 'falsch', 'l0'), null);
  assert.ok(pl(0, { k: 'submit', payload: { answer: 'Pokal' } }).ok); g.advance(7000); assert.ok(pl(1, { k: 'submit', payload: { answer: 'pokal' } }).ok); assert.equal(data(g, 'tv').level, 1);
  assert.ok(eng.mediaFor(room, tvd.media, 'l1')); assert.equal(pl(0, { k: 'submit', payload: { answer: 'Tor' } }).err, 'already_submitted'); assert.equal(pl(2, { k: 'submit', payload: { answer: 'Auto' } }).ok, true);
  const d = g.delta(() => g.host({ k: 'h.reveal' })); assert.deepEqual(d, [PIXEL_POINTS[0], PIXEL_POINTS[1], 0]);
  assert.ok(eng.mediaFor(room, tvd.media, 'l4'), 'nach der Auflösung ist die Originalstufe freigegeben');
});

test('PIXELPANIK: Tippfehler werden toleriert, Zeit läuft bis Stufe 5 und endet dann', () => {
  const g = game(2); g.goto('nm-r1', 2); g.host({ k: 'h.begin' }); for (let i = 0; i < 4; i++) g.advance(7000); assert.equal(data(g, 'tv').level, 4);
  g.pl(0, { k: 'submit', payload: { answer: 'Freiheitstatue' } }); g.advance(7000); assert.equal(g.room.round!.stage, 'locked');
  const d = g.delta(() => g.host({ k: 'h.reveal' })); assert.deepEqual(d, [PIXEL_POINTS[4], 0]);
});

test('DUELL DER DEPPEN: faire Rotation, Showmaster kann ändern, Wissen entscheidet, Prognosen werden gewertet, Lösung bleibt geheim', () => {
  const g = game(4); g.goto('nm-r2'); const { host, pl, room, view } = g;
  const prop = view('host').round!.assign!; assert.equal(prop.kind, 'duel'); assert.equal(prop.pids.length, 2); assert.equal(view('tv').round!.assign, undefined, 'Vorschlag nur für den Showmaster');
  assert.deepEqual(view('host').round!.assign!.pids, prop.pids, 'Vorschlag ist stabil');
  assert.equal(host({ k: 'h.assign', pids: [g.ids[0], g.ids[0]] }).ok, false); assert.ok(host({ k: 'h.assign', pids: [g.ids[2], g.ids[3]] }).ok);
  host({ k: 'h.begin' }); assert.deepEqual(data(g).duelists, [g.ids[2], g.ids[3]]);
  assert.equal(pl(2, { k: 'submit', payload: { winner: g.ids[3] } }).err, 'duelist'); assert.equal(room.round!.stage, 'open');
  assert.ok(pl(0, { k: 'submit', payload: { winner: g.ids[2] } }).ok); assert.ok(pl(1, { k: 'submit', payload: { winner: g.ids[3] } }).ok);
  assert.equal(room.round!.stage, 'bet'); assert.equal(pl(0, { k: 'submit', payload: { answer: 1 } }).err, 'spectator');
  const t: any = g.eng.curTask(room); assert.ok(!JSON.stringify(view(2).round!.data).includes('correct'), 'richtige Antwort bleibt geheim');
  for (let q = 0; q < 3; q++) { assert.equal(data(g).q, q); assert.ok(pl(2, { k: 'submit', payload: { answer: t.questions[q].correct } }).ok); assert.ok(pl(3, { k: 'submit', payload: { answer: q === 0 ? t.questions[0].correct : (t.questions[q].correct + 1) % 4 } }).ok); }
  assert.equal(room.round!.stage, 'locked'); const d = g.delta(() => host({ k: 'h.reveal' }));
  assert.deepEqual(d, [100, 0, 250, 0], 'Bot3 gewinnt 3:1, Bot1 tippte richtig, Bot2 falsch');
});

test('DUELL: Unentschieden = 75 je Duellant, Zuschauertipps neutral; Rotation verteilt die Duelle; zwei Spieler duellieren sofort', () => {
  const g = game(4); g.goto('nm-r2'); g.host({ k: 'h.begin' }); const [a, b] = data(g).duelists as string[]; g.ids.filter(i => i !== a && i !== b).forEach(i => g.pl(g.idx(i), { k: 'submit', payload: { winner: a } }));
  const t: any = g.eng.curTask(g.room); for (let q = 0; q < 3; q++) { g.pl(g.idx(a), { k: 'submit', payload: { answer: t.questions[q].correct } }); g.pl(g.idx(b), { k: 'submit', payload: { answer: t.questions[q].correct } }); }
  const d = g.delta(() => g.host({ k: 'h.reveal' })); assert.equal(d[g.idx(a)], 75); assert.equal(d[g.idx(b)], 75); assert.ok(g.ids.filter(i => i !== a && i !== b).every(i => d[g.idx(i)] === 0));
  const seen = new Set<string>(); const g2 = game(4); g2.goto('nm-r2'); for (let k = 0; k < 3; k++) { g2.host({ k: 'h.begin' }); (data(g2).duelists as string[]).forEach(x => seen.add(x)); g2.host({ k: 'h.skipTask' }); }
  assert.equal(seen.size, 4, 'in drei Duellen waren alle vier Spieler mindestens einmal dran');
  const g3 = game(2); g3.goto('nm-r2'); g3.host({ k: 'h.begin' }); assert.equal(g3.room.round!.stage, 'bet', 'bei zwei Spielern gibt es keine Prognosephase');
});

test('DIE ARENA: Ausscheiden pro Frage, Punkte 50/50/50 + 150, Überlebende spielen weiter, früher Abbruch, Nichtantwort = ausgeschieden', () => {
  const g = game(4); g.goto('nm-r3'); const { host, pl, room, view } = g; host({ k: 'h.begin' }); const t: any = g.eng.curTask(room);
  assert.ok(!JSON.stringify(view(0).round!.data).includes('"correct"'), 'Lösung geheim');
  const ans = (q: number, right: boolean[]) => right.forEach((r, i) => { if (r !== undefined && (data(g).alive as string[]).includes(g.ids[i])) pl(i, { k: 'submit', payload: { answer: r ? t.questions[q].correct : (t.questions[q].correct + 1) % 4 } }); });
  ans(0, [true, true, true, false]); assert.equal(room.round!.stage, 'bet'); assert.deepEqual(data(g).results[0].eliminated, [g.ids[3]]);
  assert.equal(pl(3, { k: 'submit', payload: { answer: 0 } }).ok, false);
  g.advance(9000); assert.equal(data(g).q, 1); ans(1, [true, false, true, true]); g.advance(9000); assert.equal(data(g).q, 2); assert.deepEqual(data(g).alive, [g.ids[0], g.ids[2]]);
  ans(2, [true, true, true]);   // Bot3 nicht antworten lassen? beide antworten richtig
  g.advance(9000); assert.equal(room.round!.stage, 'locked'); const d = g.delta(() => host({ k: 'h.reveal' }));
  assert.deepEqual(d, [300, 50, 300, 0], 'Bot1+Bot3: alle drei (+Bonus); Bot2 nur Frage 1; Bot4 nichts');
  const g2 = game(3); g2.goto('nm-r3'); g2.host({ k: 'h.begin' }); g2.advance(21_000); assert.equal(data(g2).results[0].eliminated.length, 3, 'wer nicht antwortet, scheidet aus'); g2.advance(9000); assert.equal(g2.room.round!.stage, 'locked', 'Arena endet vorzeitig, wenn alle ausgeschieden sind');
  assert.ok(g2.delta(() => g2.host({ k: 'h.reveal' })).every(x => x === 0));
});

test('ARENA: Pause und Wiederverbinden erhalten vorhandene Antworten (Zustand übersteht Neuaufbau aus JSON)', () => {
  const g = game(3); g.goto('nm-r3'); g.host({ k: 'h.begin' }); g.pl(0, { k: 'submit', payload: { answer: 1 } });
  assert.ok(g.host({ k: 'h.pause', paused: true }).ok); const copy = JSON.parse(JSON.stringify(g.room)); assert.equal(copy.round.pm[g.ids[0]].ans[0], 1); assert.equal(copy.round.m.alive.length, 3);
  g.advance(60_000); assert.equal(g.room.round!.stage, 'open', 'Pause hält die Zeit an'); g.host({ k: 'h.pause', paused: false });
});

test('TONSPUR: Stufen (1. Hören 300, 2. Hören 200, Hinweis 100), Hinweis erst spät, Audio nur über Schlüssel für TV/Host', () => {
  const g = game(4); g.goto('nm-r4'); g.host({ k: 'h.begin' }); const { pl, room, view, eng } = g;
  assert.ok(!JSON.stringify(view(0).round).includes('data:audio') && data(g, 0).media === undefined, 'Handy: kein Audio, kein Schlüssel');
  const tok = data(g, 'tv').media; assert.ok(eng.mediaFor(room, tok, 'a1')); assert.equal(eng.mediaFor(room, tok, 'a2'), null, 'zweite Fassung erst beim zweiten Hören');
  assert.equal(data(g, 'tv').hint, null); pl(0, { k: 'submit', payload: { answer: 'Pfiff' } });
  g.advance(16_000); assert.equal(data(g, 'tv').phase, 1); assert.ok(eng.mediaFor(room, tok, 'a2')); pl(1, { k: 'submit', payload: { answer: 'schiedsrichterpfiff' } });
  g.advance(16_000); assert.equal(data(g, 0).phase, 2); assert.ok(data(g, 0).hint, 'Hinweis auch auf dem Handy'); pl(2, { k: 'submit', payload: { answer: 'Trillerpfeife' } }); pl(3, { k: 'submit', payload: { answer: 'Hubschrauber' } });
  assert.equal(room.round!.stage, 'locked'); assert.deepEqual(g.delta(() => g.host({ k: 'h.reveal' })), [300, 200, 100, 0]);
  assert.equal(SOUND_POINTS.length, 3);
});

test('ZEITSPRUNG: Feldberechnung, 250 / 100 / 0, Validierung der Ankerjahre', () => {
  assert.equal(timelineSlot([1990, 1998, 2006, 2014], 2005), 2); assert.equal(timelineSlot([1990, 1998, 2006, 2014], 1980), 0); assert.equal(timelineSlot([1990, 1998, 2006, 2014], 2020), 4);
  assert.deepEqual([timelinePoints(2, 2), timelinePoints(3, 2), timelinePoints(1, 2), timelinePoints(4, 2), timelinePoints(0, 2)], [250, 100, 100, 0, 0]);
  const g = game(4); g.goto('nm-r5'); g.host({ k: 'h.begin' }); const { pl, room } = g; const t: any = g.eng.curTask(room); const c = timelineSlot(t.anchors.map((a: any) => a.year), t.answerYear);
  assert.ok(!JSON.stringify(data(g, 0)).includes(String(t.answerYear)) || t.anchors.some((a: any) => a.year === t.answerYear), 'Lösungsjahr nicht in der Handy-Ansicht');
  pl(0, { k: 'submit', payload: { slot: c } }); pl(1, { k: 'submit', payload: { slot: c + 1 > 4 ? c - 1 : c + 1 } }); pl(2, { k: 'submit', payload: { slot: c >= 3 ? 0 : 4 } }); assert.equal(pl(0, { k: 'submit', payload: { slot: 9 } }).ok, false);
  g.host({ k: 'h.lock' }); assert.deepEqual(g.delta(() => g.host({ k: 'h.reveal' })), [250, 100, 0, 0]);
  const bad = normalizeTask({ ...t, anchors: [{ year: 2000, label: 'a' }, { year: 1990, label: 'b' }, { year: 2010, label: 'c' }, { year: 2020, label: 'd' }] }); assert.ok(validateTask(bad).some(e => /aufsteigend/.test(e)));
  assert.ok(validateTask(normalizeTask({ ...t, answerYear: t.anchors[1].year })).some(e => /Ankerjahr/.test(e)));
});

for (const n of [2, 3, 5, 8]) test(`PANIK: kooperativ mit ${n} Spielern – jeder Hinweis liegt bei genau einem Helfer, Entschärfer sieht keine, 200 (+50) für alle`, () => {
  const g = game(n); g.goto('nm-r6'); const { host, pl, room, view } = g; const prop = view('host').round!.assign!; assert.equal(prop.kind, 'defuser'); host({ k: 'h.begin' });
  const def = data(g).defuser as string; const t: any = g.eng.curTask(room); const held: number[] = [];
  g.ids.forEach((id, i) => { const d = data(g, i); if (id === def) { assert.equal(d.role, 'defuser'); assert.deepEqual(d.myClues, [], 'Entschärfer sieht keine Hinweise'); } else if (n > 1) { assert.equal(d.role, 'helper'); held.push(...d.myClues.map((c: any) => c.no)); } assert.equal(d.solution, undefined, 'Code nirgends im Handy-Datensatz'); });
  if (n > 1) assert.deepEqual(held.sort(), t.clues.map((_: any, i: number) => i + 1), 'alle Hinweise genau einmal verteilt');
  assert.ok(!JSON.stringify(view('tv').round!.data).includes(t.clues[0]), 'TV zeigt keine Hinweise');
  const di = g.idx(def); const other = g.ids.findIndex(x => x !== def); assert.equal(pl(other, { k: 'submit', payload: { code: t.code } }).err, 'not_defuser');
  const wrong = t.code === '000' ? '111' : '000'; const r1 = pl(di, { k: 'submit', payload: { code: wrong } }); assert.deepEqual(r1.info, { correct: false, left: 2 });
  const r2 = pl(di, { k: 'submit', payload: { code: t.code } }); assert.equal(r2.info.correct, true); assert.equal(room.round!.stage, 'locked');
  const d = g.delta(() => host({ k: 'h.reveal' })); assert.ok(d.every(x => x === 200 || x === 250), JSON.stringify(d)); assert.equal(new Set(d).size, 1, 'alle gleich viel');
});

test('PANIK: Fehlversuche, Zeitablauf = nicht gelöst (0), Entschärfer rotiert, schnelles Lösen gibt +50', () => {
  const g = game(4); g.goto('nm-r6'); g.host({ k: 'h.begin' }); const di = g.idx(data(g).defuser); const t: any = g.eng.curTask(g.room);
  for (let k = 0; k < 3; k++) g.pl(di, { k: 'submit', payload: { code: t.code === String(k).repeat(3) ? '999' : String(k).repeat(3) } }); assert.equal(g.room.round!.stage, 'locked'); assert.ok(g.delta(() => g.host({ k: 'h.reveal' })).every(x => x === 0));
  const g2 = game(4); g2.goto('nm-r6'); g2.host({ k: 'h.begin' }); g2.advance(100_000); assert.equal(g2.room.round!.stage, 'locked'); assert.ok(g2.delta(() => g2.host({ k: 'h.reveal' })).every(x => x === 0));
  const seen = new Set<string>(); const g3 = game(4); g3.goto('nm-r6'); for (let k = 0; k < 3; k++) { g3.host({ k: 'h.begin' }); seen.add(data(g3).defuser); g3.host({ k: 'h.skipTask' }); } assert.equal(seen.size, 3, 'drei verschiedene Entschärfer');
  const g4 = game(3); g4.goto('nm-r6'); g4.host({ k: 'h.begin' }); const t4: any = g4.eng.curTask(g4.room); g4.advance(10_000); g4.pl(g4.idx(data(g4).defuser), { k: 'submit', payload: { code: t4.code } }); assert.deepEqual(g4.delta(() => g4.host({ k: 'h.reveal' })), [250, 250, 250]);
  const g5 = game(3); g5.goto('nm-r6'); g5.host({ k: 'h.begin' }); const t5: any = g5.eng.curTask(g5.room); g5.advance(80_000); g5.pl(g5.idx(data(g5).defuser), { k: 'submit', payload: { code: t5.code } }); assert.deepEqual(g5.delta(() => g5.host({ k: 'h.reveal' })), [200, 200, 200]);
});

test('HOCHSTAPLER: Rollen, Wort nur für die Crew, Hinweis ≠ Wort, Abstimmung, Wertung (enttarnt / unentdeckt / Wort erraten)', () => {
  const g = game(4); g.goto('nm-r7'); const { host, pl, room, view } = g; host({ k: 'h.begin' }); const t: any = g.eng.curTask(room); const imp = data(g).impostor as string; const ii = g.idx(imp);
  g.ids.forEach((id, i) => { const d = data(g, i); if (id === imp) { assert.equal(d.role, 'impostor'); assert.equal(d.word, undefined); assert.ok(!JSON.stringify(d).includes(t.word)); } else { assert.equal(d.role, 'crew'); assert.equal(d.word, t.word); } });
  assert.ok(!JSON.stringify(view('tv').round!.data).includes(t.word), 'TV zeigt das Wort nicht');
  const crew = g.ids.map((_, i) => i).filter(i => i !== ii); assert.equal(pl(crew[0], { k: 'submit', payload: { clue: t.word } }).err, 'is_word'); assert.ok(pl(ii, { k: 'submit', payload: { clue: t.word } }).ok, 'der Hochstapler kennt das Wort nicht');
  crew.forEach((i, k) => assert.ok(pl(i, { k: 'submit', payload: { clue: 'Tipp' + k } }).ok)); assert.equal(room.round!.stage, 'bet'); assert.equal((data(g, 0).clues as any[]).length, 4);
  assert.equal(pl(crew[0], { k: 'submit', payload: { guess: 'x' } }).err, 'not_impostor'); assert.equal(pl(crew[0], { k: 'submit', payload: { vote: g.ids[crew[0]] } }).err, 'invalid_target');
  crew.forEach(i => assert.ok(pl(i, { k: 'submit', payload: { vote: imp } }).ok)); assert.ok(pl(ii, { k: 'submit', payload: { guess: t.word } }).ok); assert.ok(pl(ii, { k: 'submit', payload: { vote: g.ids[crew[0]] } }).ok);
  const d = g.delta(() => host({ k: 'h.reveal' })); const exp = g.ids.map((_, i) => (i === ii ? 150 : 100)); assert.deepEqual(d, exp, 'enttarnt, aber Wort erraten = 150; Ermittler je 100');
  const g2 = game(4); g2.goto('nm-r7'); g2.host({ k: 'h.begin' }); const imp2 = g2.idx(data(g2).impostor); g2.ids.forEach((_, i) => g2.pl(i, { k: 'submit', payload: { clue: 'W' + i } }));
  const c2 = g2.ids.map((_, i) => i).filter(i => i !== imp2); c2.forEach((i, k) => g2.pl(i, { k: 'submit', payload: { vote: g2.ids[c2[(k + 1) % 3]] } })); g2.pl(imp2, { k: 'submit', payload: { vote: g2.ids[c2[0]] } });
  assert.deepEqual(g2.delta(() => g2.host({ k: 'h.reveal' })).map((x, i) => (i === imp2 ? x : -x)).map((x, i) => (i === imp2 ? x : -x)), g2.ids.map((_, i) => (i === imp2 ? 300 : 0)), 'unentdeckt = 300');
});

test('Vorschau im Admin funktioniert für alle sieben neuen Modi', () => {
  for (const q of ['nm-pix-1', 'nm-duel-1', 'nm-arena-1', 'nm-sound-1', 'nm-time-1', 'nm-panic-1', 'nm-imp-1']) { const task = (CS.listQuestions().find((x: any) => x.id === q) as any).task; const r: any = buildPreview(task, SCENES); assert.ok(r.ok, q + JSON.stringify(r.problems)); assert.ok(r.frames.length >= 3, q); assert.ok(r.formula.length > 30, q); }
});

for (const n of [2, 7]) test(`Komplette Show „Neue Spielmodi“ mit ${n} Spielern bis zur Siegerehrung (inkl. Pause, Wiederherstellen aus JSON, Marktwert-Updates)`, () => {
  const g = game(n); const { host, pl, room, eng, view } = g; let rounds = 0;
  for (let guard = 0; guard < 400 && room.phase !== 'ceremony'; guard++) {
    if (room.phase === 'scoreboard') { host({ k: 'h.continue' }); continue; }
    const t: any = eng.curTask(room); host({ k: 'h.begin' }); rounds++;
    const st = () => room.round!.stage; const all = (f: (i: number) => any) => g.ids.forEach((_, i) => { if (st() !== 'locked') pl(i, f(i)); });
    if (t.mode === 'pixel' || t.mode === 'sound') all(i => ({ k: 'submit', payload: { answer: i ? 'x' : t.answer } }));
    if (t.mode === 'duel') { const d = data(g).duelists as string[]; g.ids.forEach((id, i) => { if (!d.includes(id)) pl(i, { k: 'submit', payload: { winner: d[0] } }); }); for (let q = 0; q < 3; q++) d.forEach(id => { if (st() === 'bet') pl(g.idx(id), { k: 'submit', payload: { answer: t.questions[q].correct } }); }); }
    if (t.mode === 'arena') { for (let q = 0; q < 3; q++) { const alive = data(g).alive as string[]; alive.forEach(id => { if (st() === 'open') pl(g.idx(id), { k: 'submit', payload: { answer: t.questions[q].correct } }); }); if (st() === 'bet') host({ k: 'h.lock' }); } }
    if (t.mode === 'timeline') all(() => ({ k: 'submit', payload: { slot: 2 } }));
    if (t.mode === 'panic') pl(g.idx(data(g).defuser), { k: 'submit', payload: { code: t.code } });
    if (t.mode === 'impostor') { all(i => ({ k: 'submit', payload: { clue: 'W' + i } })); const imp = data(g).impostor as string; g.ids.forEach((id, i) => { if (st() === 'bet') pl(i, { k: 'submit', payload: { vote: id === imp ? g.ids.find(x => x !== imp)! : imp } }); }); }
    if (t.mode === 'vote') all(() => ({ k: 'submit', payload: { target: 'host:candidate' } }));
    if (rounds === 5) { host({ k: 'h.pause', paused: true }); const copy = JSON.parse(JSON.stringify(room)); assert.equal(copy.phase, 'round'); host({ k: 'h.pause', paused: false }); }
    host({ k: 'h.lock' }); host({ k: 'h.reveal' }); assert.equal(room.round!.stage, 'reveal', t.mode); assert.ok(view('tv').round!.reveal); host({ k: 'h.next' });
  }
  assert.equal(room.phase, 'ceremony'); assert.ok(room.players.every(p => p.score >= 0)); assert.ok(rounds >= 21 + 5);
});
