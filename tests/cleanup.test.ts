// Paketbereinigung (nur show-5 / show-4z / show-3 aktiv) und Marktwert-Update nach jeder Runde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { expandShowSteps } from '../shared/util';
import { TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import { AV } from './helpers';
import type { Action, Book } from '../shared/types';

const fresh = () => new ContentService(new Store(join(mkdtempSync(join(tmpdir(), 'outplay-cl-')), 'c.db')), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });
const counts = (c: ContentService) => ({ q: c.listQuestions().length, cat: c.listCategories().length, packs: c.listPacksView().length, vers: c.listPacksView().reduce((n: number, p: any) => n + p.versions, 0) });
const OLD = ['show-4', 'show-3z', 'show-2k', 'show-2', 'show-1', 'standard-2'];

test('Bereinigung: Vorschau ändert nichts; Ausführen archiviert nur ältere Pakete, löscht nichts, ist wiederholbar', () => {
  const c = fresh(); const before = counts(c);
  const plan = c.cleanupPlan(); assert.deepEqual(counts(c), before, 'Vorschau ändert nichts');
  for (const id of OLD) assert.ok(plan.archive.includes(id) || !c.listPacksView().some(p => p.id === id), id);
  for (const id of ['show-5', 'show-4z', 'show-3']) assert.ok(!plan.archive.includes(id), id + ' bleibt');
  const r = c.cleanupApply();
  assert.deepEqual(counts(c), before, 'keine Fragen/Kategorien/Pakete/Versionen verloren');
  const pub = c.listPublished().map(p => p.id).sort(); assert.deepEqual(pub, ['show-3', 'show-4z', 'show-5']);
  for (const id of OLD) { const p = c.listPacksView().find(x => x.id === id); if (p) assert.equal(p.status, 'archived', id); }
  assert.match(c.defaultRef(), /^show-4z@/);
  assert.ok(c.cleanupPlan().clean, 'danach nichts mehr zu tun'); const again = c.cleanupApply(); assert.deepEqual([again.archived, again.updated], [[], []]);
  assert.ok(r.archived.length >= 5);
});

test('Bereinigung: bereits archivierte Pakete werden nicht reaktiviert, auch nicht ein archiviertes Keep-Paket; Seed-Installation reaktiviert nichts', () => {
  const c = fresh(); c.setPackStatus('show-3', 'archived'); c.cleanupApply();
  assert.equal(c.getPack('show-3').status, 'archived'); assert.ok(!c.listPublished().some(p => p.id === 'show-3'));
  assert.equal(c.cleanupPlan().rows.find(r => r.id === 'show-3')!.action, 'keep-archived');
  c.installSeed(); assert.equal(c.getPack('show-3').status, 'archived'); assert.equal(c.getPack('show-4').status, 'archived');
});

test('Bereinigung: Best-of-Paket ohne Marktwert-Update bekommt NEUE Version, alte Version und laufender Raum bleiben unverändert', () => {
  const c = fresh();
  const p = c.getPack('show-5'); c.updatePack('show-5', { ...p, rules: { ...p.rules, boardEveryRound: false } }); const old = c.publish('show-5', 'alt ohne MU').ref;
  const oldBook = JSON.stringify(c.resolveBook(old));
  const eng = new Engine(r => c.resolveBook(r)); const { room } = eng.newRoom('R', 1_800_000_000_000, old, 'show');
  const planBefore = [...room.plan];
  assert.deepEqual(c.cleanupPlan().update, ['show-5']);
  const r = c.cleanupApply(); assert.equal(r.updated.length, 1); assert.notEqual(r.updated[0], old);
  assert.equal(c.resolveBook(r.updated[0]).rules!.boardEveryRound, true);
  assert.equal(JSON.stringify(c.resolveBook(old)), oldBook, 'alte Version unverändert');
  assert.deepEqual(room.plan, planBefore); assert.equal(room.bookId, old, 'bestehender Raum behält seine Version');
  assert.equal(c.listPublished().find(x => x.id === 'show-5')!.ref, r.updated[0]);
});

test('expandShowSteps: ein Update nach jeder Runde, keine Dopplung, keins nach dem Finale', () => {
  const s = (...k: string[]) => k.map(x => ({ k: x }));
  assert.deepEqual(expandShowSteps(s('t', 't', 'final'), { boardEveryRound: true }).map(x => x.k), ['t', 'board', 't', 'board', 'final']);
  assert.deepEqual(expandShowSteps(s('t', 'board', 't', 'board', 'final'), { boardEveryRound: true }).map(x => x.k), ['t', 'board', 't', 'board', 'final']);
  assert.deepEqual(expandShowSteps(s('t', 'board', 't'), {}).map(x => x.k), ['t', 'board', 't'], 'ohne Regel unverändert');
});

function drive(book: Book, ref: string, restoreEach = false) {
  const eng = new Engine(() => book); let now = 1_800_000_000_000;
  let { room } = eng.newRoom('MU', now, ref, 'show'); const ids: string[] = [];
  for (let i = 0; i < 4; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); if (r.ok) ids.push(r.player.id); }
  let rq = 0; const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const view = (w: 'host' | 'tv') => eng.buildView(room, { role: w } as any, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const boards: any[] = []; const scoresDuringBoard: number[][] = []; let practiceBefore: number[] | null = null; const order: string[] = [];
  for (let g = 0; g < 600 && room.phase !== 'ceremony'; g++) {
    if (restoreEach) { room = JSON.parse(JSON.stringify(room)); }
    if (room.phase === 'scoreboard') {
      const v = view('tv'); boards.push(v.scoreboard); order.push('board'); scoresDuringBoard.push(room.players.map(p => p.score));
      assert.equal(v.scoreboard!.standings.length, 4);
      if (restoreEach) { const again = JSON.stringify(view('tv').scoreboard); room = JSON.parse(JSON.stringify(room)); assert.equal(JSON.stringify(view('tv').scoreboard), again, 'Reconnect zeigt dasselbe Board'); }
      host({ k: 'h.continue' }); continue;
    }
    const r = room.round!; const t = eng.curTask(room) as any;
    if (!order.length || order[order.length - 1] !== r.tileId) order.push(r.tileId);
    host({ k: 'h.begin' });
    for (let s = 0; s < 14 && ['view', 'open', 'bet'].includes(room.round!.stage); s++) {
      if (room.round!.stage === 'view') { now += (t.viewSeconds ?? 5) * 1000 + 300; eng.tick(room, now); continue; }
      if (t.mode === 'geo' && !t.practice) ids.forEach((_, i) => pl(i, { k: 'submit', payload: { lat: t.answer.lat + i * 2, lon: t.answer.lon + i * 2 } }));
      if (t.mode === 'rank') { now += 60_000; eng.tick(room, now); } else host({ k: 'h.lock' });
    }
    practiceBefore = t.practice ? room.players.map(p => p.score) : null;
    host({ k: 'h.reveal' });
    for (const gr of (view('host').round?.data?.groups ?? [])) if (gr.state === 'unknown') host({ k: 'h.review', groupKey: gr.key, decision: 'invalid' });
    if (room.round!.stage !== 'reveal') host({ k: 'h.reveal' });
    if (t.practice && practiceBefore) assert.deepEqual(room.players.map(p => p.score), practiceBefore, 'Probe ändert keine Punkte');
    host({ k: 'h.next' });
  }
  return { room, boards, order, scoresDuringBoard, view };
}

for (const [pid, name] of [['show-5', 'Best of 42'], ['show-4z', 'KICKBASE-KONSENS-Finale']] as const) {
  test(`Show ${pid} (${name}): Marktwert-Update nach jeder Runde bei 4/5/6 Aufgaben je Modus, Letztes Update vor dem Finale, danach direkt Siegerehrung`, () => {
    const c = fresh();
    for (const n of [4, 5, 6]) {
      const p = c.getPack(pid); c.updatePack(pid, { ...p, rules: { ...p.rules, tasksPerMode: n } }); const ref = c.publish(pid, `${n}`).ref; const book = c.resolveBook(ref);
      const plan = Engine.showPlan(book); const rounds = plan.filter(x => x.startsWith('tile:')).length;
      const finalIdx = plan.length - 1;
      assert.equal(plan.filter(x => x === 'board').length, 7, `${n}: 7 Updates`);
      assert.ok(plan[finalIdx].startsWith('tile:') || plan[finalIdx] === 'final'); assert.equal(plan[finalIdx - 1], 'board', 'direkt vor dem Finale ein Update');
      assert.equal(plan.length, rounds + 7);
      for (let i = 0; i < plan.length - 1; i++) if (plan[i] === 'board') assert.notEqual(plan[i + 1], 'board', 'keine doppelten Boards');
      assert.equal(book.rules!.tasksPerMode, n);
    }
    const ref = c.defaultRef().startsWith(pid) ? c.defaultRef() : c.listPublished().find(x => x.id === pid)!.ref;
    const book = c.resolveBook(ref);
    for (const restore of [false, true]) {
      const g = drive(book, ref, restore);
      assert.equal(g.room.phase, 'ceremony'); assert.equal(g.boards.length, 7, 'genau 7 Updates (kein Board nach dem Finale, keine Dopplung)');
      g.boards.forEach((b, i) => assert.ok(/Marktwert-Update/i.test(b.title), b.title));
      assert.equal(g.boards[6].title, 'Letztes Marktwert-Update'); assert.ok(g.boards.slice(0, 6).every(b => b.title === 'Marktwert-Update'));
      assert.equal(g.order[g.order.length - 1] === 'board', false, 'nach dem Finale direkt Siegerehrung');
      assert.equal(g.order[g.order.length - 2], 'board');
      // Rangänderungen: nach der ersten gewerteten Runde stehen Platzierungen fest, spätere Boards tragen den Vorgänger-Stand
      g.boards.forEach((b, i) => { if (i === 0) return; const prevScores = Object.fromEntries(g.boards[i - 1].standings.map((x: any) => [x.id, x.score])); assert.deepEqual(Object.fromEntries(b.standings.map((x: any) => [x.id, x.prev])), prevScores, `Board ${i + 1} vergleicht mit Board ${i}`); });
      assert.ok(g.boards[0].standings.some((x: any) => x.score > x.prev), 'erstes Update zeigt Punktzuwachs ggü. Start'); assert.ok(g.boards[6].standings.every((x: any) => x.score >= g.boards[0].standings.find((y: any) => y.id === x.id).score), 'Punkte nie rückläufig');
      assert.equal(g.view('tv').room.hideScores === true || g.room.phase === 'ceremony', true);
    }
  });
}
