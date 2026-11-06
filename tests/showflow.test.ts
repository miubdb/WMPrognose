// Fester Showablauf: Reihenfolge, kontrollierte Freigabe, Persistenz, Pakete/Export/Import, Fragenpool, Dauer, Fairness.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Engine } from '../server/engine';
import { ContentService } from '../server/content';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { TILES, SEED_PACK, SEED_SHOW } from '../content';
import { AV, Admin, createRoom, joinPlayer, post, startEnv, type TestEnv } from './helpers';
import { glitchZones } from '../server/modes';
import { rng } from '../shared/util';
import { analyzeShow } from '../shared/analysis';
import type { Action, Book, TaskDef, View } from '../shared/types';

const mkContent = (dir = mkdtempSync(join(tmpdir(), 'outplay-show-'))) => { const st = new Store(join(dir, 'c.db')); return { st, c: new ContentService(st, { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW }) }; };
const { c: CS } = mkContent();
const SHOW: Book = CS.resolveBook('show-1@1');

function game(n = 7, flow: 'show' | 'classic' = 'show') {
  const eng = new Engine((id: string) => CS.resolveBook(id));
  let now = 1_800_000_000_000;
  const { room } = eng.newRoom('SHOW', now, flow === 'show' ? 'show-1@1' : 'standard-2@1', flow);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) { const r = eng.join(room, `Bot${i + 1}`, AV, now); assert.ok(r.ok); if (r.ok) ids.push(r.player.id); }
  let rq = 0;
  const host = (a: Action): any => eng.act(room, { role: 'host' }, `h${++rq}`, a, now);
  const pl = (i: number, a: Action): any => eng.act(room, { role: 'player', pid: ids[i] }, `p${i}-${++rq}`, a, now);
  const view = (who: number | 'host' | 'tv'): View => eng.buildView(room, who === 'host' ? { role: 'host' } : who === 'tv' ? { role: 'tv' } : { role: 'player', pid: ids[who] }, now);
  const advance = (ms: number) => { now += ms; eng.tick(room, now); };
  return { eng, room, ids, host, pl, view, advance, get now() { return now; } };
}
type G = ReturnType<typeof game>;

/** Bots mit unterschiedlicher Stärke; Spieler 6 gibt manchmal nichts ab. */
function bots(g: G, task: TaskDef, rand: () => number) {
  const { room, ids, pl } = g; const stage = room.round!.stage;
  ids.forEach((id, i) => {
    switch (task.mode) {
      case 'geo': if (i === 6) return; pl(i, { k: 'submit', payload: { lat: Math.max(-80, Math.min(80, task.answer.lat + (rand() - 0.5) * 12 * (i + 1))), lon: Math.max(-170, Math.min(170, task.answer.lon + (rand() - 0.5) * 16 * (i + 1))) } }); break;
      case 'rank': { const r = room.round!; const step = r.m.step as number; if (i === 0) pl(i, { k: 'submit', payload: { step, slot: task.order[step] } }); else { const pm = r.pm[id]; const free = [0, 1, 2, 3, 4].filter(s => !pm || pm.slots[s] === -1); if (free.length) pl(i, { k: 'submit', payload: { step, slot: free[Math.floor(rand() * free.length)] } }); } break; }
      case 'estimate': if (stage === 'open') pl(i, { k: 'submit', payload: { value: Math.round(task.answer * (0.4 + rand() * 1.2)) } }); else { const gs = ids.filter(x => room.round!.pm[x]?.guess !== undefined); pl(i, { k: 'submit', payload: { amount: task.bets[i % task.bets.length], target: gs[(i + 1) % gs.length] } }); } break;
      case 'glitch': { const z = glitchZones(task, g.eng.bk(room).scenes ?? SCENES)[0]; pl(i, { k: 'submit', payload: i % 3 === 0 ? { x: z.x, y: z.y } : { x: Math.min(990, z.x + 300), y: Math.min(590, z.y + 200) } }); break; }
      case 'unique': { const names = task.valid.map(v => v.name); pl(i, { k: 'submit', payload: { answer: i < 2 ? names[0] : i === 2 ? 'Atlantis' : names[i % names.length] } }); break; }
      case 'match': { const perfect = [0, 1, 2, 3, 4, 5].map(k => task.order.indexOf(k)); if (i === 5) return; const pairs = i === 0 ? perfect : i === 1 ? perfect.map((p, k) => (k < 3 ? p : -1)) : perfect.map((_, k) => perfect[(k + i) % 6]); pl(i, { k: 'submit', payload: { pairs, final: true } }); break; }
      case 'link': if (i === 6) return; pl(i, { k: 'submit', payload: { answer: i % 2 === 0 ? task.answer : 'Phantasie' + i } }); break;
    }
  });
}

/** Spielt die Aufgabe der laufenden Runde bis zur Auflösung. */
function playTask(g: G, rand: () => number) {
  const { room, eng, host, view } = g;
  const task = eng.curTask(room)!;
  assert.equal(room.round!.stage, 'intro', 'jede Aufgabe wartet auf die Freigabe durch den Showmaster');
  assert.equal(room.round!.deadline, null);
  assert.ok(host({ k: 'h.begin' }).ok);
  for (let step = 0; step < 14 && ['view', 'open', 'bet'].includes(room.round!.stage); step++) {
    if ((room.round!.stage as string) === 'view') { g.advance(room.round!.deadline! - g.now + 1); continue; }
    // Lösungen dürfen vor der Auflösung nicht in den Spieler-/TV-Sichten stehen
    for (const who of [0, 'tv'] as const) { const j = JSON.stringify(view(who).round!.data); assert.ok(!j.includes(task.explain.slice(0, 30)), 'Erklärung vorzeitig sichtbar'); if (task.mode === 'geo') assert.ok(!j.includes(task.answer.label), 'Ortslösung vorzeitig sichtbar'); if (task.mode === 'unique') assert.ok(!task.valid.some(v => j.includes('"' + v.name + '"') && !task.prompt.includes(v.name)), 'gültige Antworten vorzeitig sichtbar'); }
    bots(g, task, rand);
    if (['view', 'open', 'bet'].includes(room.round!.stage) && !['rank', 'estimate'].includes(task.mode)) host({ k: 'h.lock' });
  }
  if ((room.round!.stage as string) === 'review') for (const gr of (view('host').round!.data.groups ?? [])) if (gr.state === 'unknown') host({ k: 'h.review', groupKey: gr.key, decision: 'valid' });
  assert.ok(host({ k: 'h.reveal' }).ok, 'Auflösung ' + task.mode);
  for (const p of room.players) assert.ok(p.score >= 0, 'nie negativ');
  return task;
}

test('Showpaket: 31 Aufgaben, alle sieben Modi, feste Reihenfolge, Dauer 75–90 min, Fußball 25–35 %, Allianz-Pointe nur einmal', () => {
  const kinds = SHOW.show!.map(s => (s.k === 'board' ? 'board' : SHOW.tiles.find(t => t.id === s.cat)!.tasks[0].mode));
  assert.deepEqual(kinds, ['geo', 'match', 'rank', 'board', 'unique', 'glitch', 'estimate', 'link', 'board', 'geo']);
  const tasks = SHOW.show!.flatMap(s => (s.k === 'board' ? [] : SHOW.tiles.find(t => t.id === s.cat)!.tasks));
  assert.equal(tasks.length, 31);
  assert.equal(SHOW.tiles.find(t => t.id === 's3-r1')!.tasks.length, 4); assert.equal(SHOW.tiles.find(t => t.id === 's3-sur')!.tasks.length, 3);
  assert.deepEqual(new Set(tasks.map(t => t.mode)), new Set(['geo', 'rank', 'estimate', 'glitch', 'unique', 'match', 'link']));
  assert.equal(new Set(tasks.map(t => JSON.stringify(t))).size, 31, 'keine Aufgabe doppelt');
  const fin = SHOW.tiles.find(t => t.kind === 'final')!; assert.equal(fin.tasks.length, 4); assert.ok(new Set(fin.tasks.map(t => t.mode)).size >= 3);
  const a = analyzeShow(SHOW)!;
  assert.ok(a.minutesExpected >= 75 && a.minutesExpected <= 90, 'Dauer ' + a.minutesExpected);
  assert.deepEqual(a.modesMissing, []);
  const football = new Set(['v2-heimspiel-1', 'v2-heimspiel-2', 's3-match-spitznamen', 'v2-fussball-zeitreise-1', 'v2-fussball-zeitreise-3', 'v2-alles-im-blick-4', 'v2-sport-und-pop-1', 's3-link-pele', 'v2-einzigartig-2']);
  const ids = SHOW_IDS(); const fb = ids.filter(id => football.has(id)).length;
  assert.ok(fb / 31 >= 0.25 && fb / 31 <= 0.35, `Fußballanteil ${fb}/31`);
  const arena = tasks.filter(t => t.mode === 'geo' && Math.abs(t.answer.lat - 48.2188) < 0.01); assert.equal(arena.length, 2);
  // Fairness: erwartete Punkte je Runde (Durchschnittsspieler) liegen nah beieinander, keine dominante Runde
  const exp = (t: TaskDef) => t.mode === 'geo' ? 0.514 * t.points : t.mode === 'estimate' ? 0.466 * t.points : t.mode === 'rank' ? 0.65 * t.points : t.mode === 'glitch' ? 0.55 * t.points : t.mode === 'match' ? 0.55 * 300 : t.mode === 'link' ? 0.4 * 300 : t.mode === 'unique' ? 0.35 * t.pointsUnique : 0;
  const per = SHOW.tiles.filter(t => t.kind !== 'final').map(t => t.tasks.reduce((s, x) => s + exp(x), 0));
  assert.ok(Math.max(...per) / Math.min(...per) <= 1.6, 'Erwartungswerte je Runde: ' + per.map(Math.round).join('/'));
  assert.ok(a.finalShare >= 0.15 && a.finalShare <= 0.25, 'Finalanteil ' + a.finalShare);
});
function SHOW_IDS(): string[] { return SHOW_ROUND_IDS; }
const SHOW_ROUND_IDS = SEED_SHOW.rounds.flatMap(r => r.taskIds);

test('Fragenpool: 50–60 Aufgaben, alle gültig; Showpaket ist eine Auswahl daraus', () => {
  const qs = CS.listQuestions();
  assert.ok(qs.length >= 50 && qs.length <= 60, 'Pool ' + qs.length);
  assert.ok(qs.every(q => q.problems.length === 0), 'Probleme: ' + qs.filter(q => q.problems.length).map(q => q.id + ':' + q.problems.join(',')).join(' | '));
  assert.ok(!qs.some(q => q.mode === 'codebreak'));
  assert.ok(SHOW_ROUND_IDS.every(id => qs.some(q => q.id === id)), 'jede Showaufgabe liegt im Pool');
  const alt = qs.length - 31; assert.ok(alt >= 19, 'Alternativen: ' + alt);
  for (const m of ['geo', 'rank', 'estimate', 'glitch', 'unique', 'match', 'link']) assert.ok(qs.filter(q => q.mode === m).length >= (m === 'unique' ? 5 : 6), 'Alternativen für ' + m);
});

test('Fester Showablauf (7 Spieler): komplette Show in Reihenfolge, kontrollierte Freigabe, Zwischenstände, Finale verborgen, Siegerehrung', () => {
  const g = game(7); const { eng, room, host, view } = g; const rand = rng(11);
  assert.equal(room.flow, 'show');
  assert.ok(host({ k: 'h.startShow' }).ok); assert.ok(host({ k: 'h.introDone' }).ok);
  assert.equal(room.phase, 'round', 'direkt Runde 1 – keine Kategorienwand');
  assert.equal(view('tv').room.act, 'Runde 1 von 6');
  assert.equal(view('tv').room.agenda!.length, 10);
  assert.equal(host({ k: 'h.pick', tileId: 's3-r2' }).ok, false); assert.equal(g.pl(0, { k: 'pick', tileId: 's3-r2' }).ok, false);
  const modes: string[] = [], acts: string[] = []; let tasks = 0, boards = 0, guard = 0;
  while ((room.phase as string) !== 'ceremony' && guard++ < 200) {
    if ((room.phase as string) === 'scoreboard') { boards++; assert.equal(view('tv').scoreboard!.standings.length, 7); acts.push('board:' + view('tv').scoreboard!.title); assert.ok(host({ k: 'h.continue' }).ok); continue; }
    assert.equal(room.phase, 'round'); const t = eng.curTile(room)!; if (room.round!.taskIndex === 0) { acts.push(view('tv').room.act); modes.push(t.tasks[0].mode); }
    const task = playTask(g, rand); tasks++;
    assert.ok(host({ k: 'h.next' }).ok);
    // die nächste Aufgabe/Runde startet NIE von allein
    if (room.phase === 'round') { assert.equal(room.round!.stage, 'intro'); assert.equal(room.round!.deadline, null); }
    void task;
    if (room.hideScores) assert.ok(view(0).players.every(p => p.score === null), 'Finale: Rangliste verborgen');
  }
  assert.equal(tasks, 31); assert.equal(boards, 2);
  assert.deepEqual(modes, ['geo', 'match', 'rank', 'unique', 'glitch', 'estimate', 'link', 'geo']);
  assert.deepEqual(acts, ['Runde 1 von 6', 'Runde 2 von 6', 'Runde 3 von 6', 'board:Zwischenstand', 'Überraschungsrunde', 'Runde 4 von 6', 'Runde 5 von 6', 'Runde 6 von 6', 'board:Letzter sichtbarer Stand', 'FINAL LOCK']);
  assert.equal(room.phase, 'ceremony'); assert.equal(eng.ceremonySteps(room), 1 + 4 + 4);
  const steps = eng.ceremonySteps(room);
  for (let s = 0; s < steps - 1; s++) assert.ok(host({ k: 'h.ceremonyNext' }).ok);
  const st = view('tv').ceremony!.standings; for (let i = 1; i < st.length; i++) assert.ok(st[i - 1].score >= st[i].score);
  for (const p of eng.active(room)) assert.equal(p.score, room.scoreLog.filter(e => e.pid === p.id).reduce((a, e) => a + e.applied, 0), 'Gesamtstand = Summe der Einzelbuchungen');
  assert.equal(st[0].score, Math.max(...eng.active(room).map(p => p.score)));
  assert.ok(eng.active(room).every(p => p.score >= 0));
  assert.ok(host({ k: 'h.end' }).ok);
});

test('Showmodus: Aufgabe überspringen, neu starten, Punkte korrigieren, Runde überspringen; „Zurück zur Wand“ ist gesperrt', () => {
  const g = game(4); const { room, host, ids, eng } = g;
  host({ k: 'h.startShow' }); host({ k: 'h.introDone' });
  const rand = rng(5);
  host({ k: 'h.begin' }); bots(g, eng.curTask(room)!, rand); host({ k: 'h.lock' });
  assert.ok(host({ k: 'h.restartTask' }).ok); assert.equal(room.round!.stage, 'intro'); assert.equal(room.round!.attempt, 1); assert.equal(room.round!.taskIndex, 0);
  assert.ok(host({ k: 'h.skipTask' }).ok); assert.equal(room.round!.taskIndex, 1);
  assert.ok(host({ k: 'h.adjust', pid: ids[1], delta: 150, note: 'Korrektur' }).ok); assert.equal(room.players[1].score, 200 + 150);
  assert.ok(host({ k: 'h.adjust', pid: ids[1], delta: -9999, note: 'zu viel' }).ok === false, 'unplausibler Betrag wird abgelehnt'); assert.ok(room.players[1].score >= 0);
  assert.equal(host({ k: 'h.backToWall' }).ok, false);
  assert.ok(host({ k: 'h.skipTile' }).ok); assert.equal(room.round!.tileId, 's3-r2'); assert.equal(room.round!.stage, 'intro');
});

test('Klassischer Modus bleibt: Raum mit Flow „classic“ nutzt die Kategorienwand; Räume ohne Flow-Angabe (Altbestand) sind klassisch', () => {
  const g = game(3, 'classic'); const { room, host } = g;
  assert.equal(room.flow, 'classic'); host({ k: 'h.startShow' }); host({ k: 'h.introDone' }); assert.equal(room.phase, 'wall');
  // Altbestand ohne flow-Feld (JSON aus dem Vorgänger-Release)
  const old = JSON.parse(JSON.stringify(room)); delete old.flow; old.plan = old.plan.filter((s: string) => !s.startsWith('tile:'));
  const eng2 = new Engine((id: string) => CS.resolveBook(id)); const v = eng2.buildView(old, { role: 'tv' }, g.now);
  assert.equal(v.room.flow, 'classic'); assert.equal(v.room.agenda, undefined); assert.equal(v.room.phase, 'wall');
  // Show-Flow ohne Showablauf im Paket fällt sicher auf classic zurück
  const g2 = new Engine((id: string) => CS.resolveBook(id)); assert.equal(g2.newRoom('X1', 0, 'standard-2@1', 'show').room.flow, 'classic');
});

// ------------------------------------------------------------------ API, Persistenz, Neustart
const envs: TestEnv[] = [];
after(async () => { for (const e of envs) await e.close().catch(() => {}); });
const mkEnv = async (o: any = {}) => { const e = await startEnv(o); envs.push(e); return e; };

test('API: Paketliste meldet Ablaufmodelle; Raum standardmäßig im Showmodus, Klassik wählbar, ungeeignetes Paket wird abgelehnt', async () => {
  const e = await mkEnv();
  const packs = await (await fetch(e.url + '/api/packs')).json() as any[];
  const show = packs.find(p => p.id === 'show-1'), classic = packs.find(p => p.id === 'standard-2');
  assert.deepEqual([show.show, show.classic], [true, false]); assert.deepEqual([classic.show, classic.classic], [false, true]);
  const r1 = await post(e, '/api/rooms', { pack: 'show-1' }); assert.equal(r1.status, 200); assert.equal(r1.body.flow, 'show');
  const r2 = await post(e, '/api/rooms', { pack: 'standard-2' }); assert.equal(r2.body.flow, 'classic');
  assert.equal((await post(e, '/api/rooms', { pack: 'show-1', flow: 'classic' })).status, 400);
  assert.equal((await post(e, '/api/rooms', { pack: 'standard-2', flow: 'show' })).status, 400);
  assert.equal((await post(e, '/api/rooms', { pack: 'standard-2', flow: 'classic' })).body.flow, 'classic');
});

test('Serverneustart mitten in einer Runde: Ablaufmodell, Position, Antworten und Punkte bleiben erhalten; Show läuft weiter', async () => {
  const dbFile = join(mkdtempSync(join(tmpdir(), 'outplay-restart-')), 't.db');
  let e = await mkEnv({ dbFile });
  const room = await createRoom(e); // Standardpaket (klassisch) – für den Showmodus gezielt:
  const r = (await post(e, '/api/rooms', { pack: 'show-1' })).body; assert.equal(r.flow, 'show');
  const p1 = await joinPlayer(e, r.code, 'Anna'), p2 = await joinPlayer(e, r.code, 'Ben'); void room;
  const live = e.app.rooms.get(r.code)!; const eng = e.app.engine;
  const H = (a: Action) => eng.act(live, { role: 'host' }, '', a, e.clock.now);
  H({ k: 'h.startShow' }); H({ k: 'h.introDone' }); H({ k: 'h.begin' });
  eng.act(live, { role: 'player', pid: p1.playerId }, 'x1', { k: 'submit', payload: { lat: 48.2, lon: 11.6 } }, e.clock.now);
  e.app.persist(live);
  const before = { stage: live.round!.stage, tile: live.round!.tileId, plan: live.plan.slice(), idx: live.planIdx, flow: live.flow, pm: JSON.stringify(live.round!.pm), score: live.players.map(p => p.score) };
  await e.close(); envs.pop();
  e = await mkEnv({ dbFile });
  const back = e.app.rooms.get(r.code)!;
  assert.equal(back.flow, 'show'); assert.deepEqual(back.plan, before.plan); assert.equal(back.planIdx, before.idx);
  assert.equal(back.round!.tileId, before.tile); assert.equal(back.round!.stage, before.stage); assert.equal(JSON.stringify(back.round!.pm), before.pm);
  assert.deepEqual(back.players.map(p => p.score), before.score);
  const eng2 = e.app.engine; const H2 = (a: Action) => eng2.act(back, { role: 'host' }, '', a, e.clock.now);
  assert.equal(eng2.act(back, { role: 'player', pid: p2.playerId }, 'x2', { k: 'submit', payload: { lat: 48.0, lon: 11.0 } }, e.clock.now).ok, true, 'nach dem Neustart kann weitergespielt werden');
  assert.ok(H2({ k: 'h.lock' }).ok); assert.ok(H2({ k: 'h.reveal' }).ok); assert.ok(H2({ k: 'h.next' }).ok); assert.equal(back.round!.taskIndex, 1);
  void p1;
});

// ------------------------------------------------------------------ Pakete, Admin, Export/Import
test('Admin: Showablauf im Paket bearbeiten (Reihenfolge, Aufgabe ersetzen), prüfen, veröffentlichen; Konflikt-sicher', async () => {
  const e = await mkEnv({ adminPassword: 'test-admin-pw' }); const a = new Admin(e); await a.login();
  const pk = (await a.get('/packs/show-1')).data; assert.equal(pk.show.length, 10); assert.equal(pk.status, 'published');
  const an = (await a.get('/packs/show-1/analysis')).data; assert.equal(an.ok, true); assert.equal(an.show.tasksTotal, 31); assert.ok(an.show.minutesExpected >= 75 && an.show.minutesExpected <= 90);
  // Kopie anlegen, Runden 2 und 3 tauschen, Aufgabe ersetzen
  const cp = (await a.post('/packs/show-1/duplicate', {})).data; assert.equal(cp.show.length, 10);
  const swapped = cp.show.slice(); [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
  const up = await a.put('/packs/' + cp.id, { ...cp, show: swapped, ifUpdated: cp.updated }); assert.equal(up.status, 200);
  const cat = (await a.get('/categories/s3-r1')).data; assert.equal(cat.taskIds.length, 4);
  const dup = (await a.post('/categories/s3-r1/duplicate', { copyQuestions: false })).data;      // eigene Runde statt gemeinsame zu verändern
  const ids = dup.taskIds.slice(); ids[3] = 's3-geo-maracana';
  assert.equal((await a.put('/categories/' + dup.id, { ...dup, taskIds: ids, disabled: false, ifUpdated: dup.updated })).status, 200);
  const sh2 = up.data.show.map((s: any) => (s.cat === 's3-r1' ? { ...s, cat: dup.id } : s));
  const up2 = await a.put('/packs/' + cp.id, { ...up.data, show: sh2, ifUpdated: up.data.updated }); assert.equal(up2.status, 200);
  const pub = await a.post(`/packs/${cp.id}/publish`, { note: 'Test' }); assert.equal(pub.status, 200);
  const book = (await a.get(`/export?scope=pack:${cp.id}`)).data;
  assert.equal(book.packs[0].show.length, 10); assert.ok(book.categories.some((c: any) => c.id === dup.id));
  // fehlerhafter Ablauf wird abgelehnt: Finale nicht am Ende
  const bad = await a.put('/packs/' + cp.id, { ...up2.data, show: [...up2.data.show.slice(-1), ...up2.data.show.slice(0, -1)], ifUpdated: up2.data.updated }); assert.equal(bad.status, 200);
  const anBad = (await a.get(`/packs/${cp.id}/analysis`)).data; assert.equal(anBad.ok, false); assert.ok(anBad.errors.some((m: string) => m.includes('Finale')));
});

test('Export/Import: Showpaket inkl. Reihenfolge und Ablaufmodell in getrennter DB, identische Inhalte ohne Duplikate, danach vollständig spielbar', () => {
  const dump = CS.export({ pack: 'show-1' });
  assert.equal(dump.packs[0].show.length, 10);
  assert.equal(dump.categories.length, 8); assert.ok(dump.questions.length >= 31);
  const dir = mkdtempSync(join(tmpdir(), 'outplay-imp-')); const st = new Store(join(dir, 'frisch.db'));
  const c2 = new ContentService(st, { tiles: [], scenes: SCENES }); // frische Ziel-Datenbank ohne Standardpaket
  const dry = c2.import(dump, 'rename', { dryRun: true, publish: true }); assert.equal(dry.errors.length, 0);
  const rep = c2.import(dump, 'rename', { publish: true });
  assert.equal(rep.packResults[0].published, true, JSON.stringify(rep.packResults[0].errors));
  assert.equal(rep.packResults[0].match, true, 'Inhalt stimmt mit dem Export überein');
  const book = c2.resolveBook(rep.packResults[0].ref);
  assert.deepEqual(book.show!.map(s => (s.k === 'board' ? 'board' : s.k)), SHOW.show!.map(s => (s.k === 'board' ? 'board' : s.k)));
  assert.equal(book.tiles.reduce((n, t) => n + t.tasks.length, 0), 31);
  const again = c2.import(dump, 'rename', { publish: true });
  assert.equal(again.questions.created, 0); assert.equal(again.categories.created, 0); assert.equal(again.packs.created, 0, 'keine Duplikate');
  // und mit dem importierten Paket eine Show starten
  const eng = new Engine((id: string) => c2.resolveBook(id)); const { room } = eng.newRoom('IMP1', 0, rep.packResults[0].ref, 'show');
  assert.equal(room.flow, 'show'); assert.equal(room.plan.filter(s => s.startsWith('tile:')).length, 8);
  st.close();
});

test('Installer: Showpaket + Pool werden nachträglich ergänzt, bestehende Inhalte und Paketversionen bleiben unverändert, Wiederholung ohne Duplikate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-inst2-')); const file = join(dir, 'alt.db');
  const s1 = new Store(file);
  const c1 = new ContentService(s1, { tiles: TILES, scenes: SCENES, pack: SEED_PACK });          // Vorgänger-Release: nur klassisches Paket
  const mine = c1.createQuestion({ task: { ...(TILES[0].tasks[0] as any), prompt: 'Meine eigene Frage' }, topic: 'Eigen' }, 'q_meine');
  const refBefore = c1.listPublished().map(p => p.ref); const n0 = c1.listQuestions().length; s1.close();
  const s2 = new Store(file); const c2 = new ContentService(s2, { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW });
  assert.deepEqual(c2.listPublished().map(p => p.id), ['standard-2'], 'beim Start passiert nichts automatisch');
  const st = c2.seedStatus(); assert.equal(st.installed, false); assert.equal(st.show!.installed, false); assert.ok(st.poolMissing > 0);
  const rep = c2.installSeed({ archiveOlder: true });
  assert.equal(rep.showCreated, true); assert.equal(rep.showRef, 'show-1@1'); assert.deepEqual(rep.archived, []);
  assert.deepEqual(c2.listPublished().map(p => p.id).sort(), ['show-1', 'standard-2']);
  assert.deepEqual(refBefore.every(r => c2.listPublished().some(p => p.ref === r)), true, 'bestehende Paketversionen unverändert');
  assert.equal(c2.getQuestion('q_meine').task.prompt, 'Meine eigene Frage');
  assert.equal(c2.listQuestions().length, n0 + 26, 'nur die neuen Pool-Fragen kommen dazu');
  const again = c2.installSeed({ archiveOlder: true });
  assert.deepEqual(again.created, { scenes: 0, questions: 0, categories: 0, packs: 0 }); assert.equal(c2.listQuestions().length, n0 + 26);
  assert.equal(c2.seedStatus().installed, true);
  s2.close();
});
