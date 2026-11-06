import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Admin, Client, closeAll, createRoom, joinPlayer, post, startEnv, type TestEnv } from './helpers';
import { normalizeTask, validateTask } from '../shared/validate';
import { buildScene, validateTemplate } from '../shared/sceneTemplates';
import { diffZones } from '../shared/scenes';
import { analyzeBook } from '../shared/analysis';
import { TILES } from '../content/tiles';
import { SEED_SHOW, EXTRA_SHOWS } from '../content';
import { SCENES } from '../shared/scenes';

const envs: TestEnv[] = [];
const mk = async (o: any = {}) => { const e = await startEnv({ adminPassword: 'test-admin-pw', ...o }); envs.push(e); return e; };
after(async () => { for (const e of envs) await e.close().catch(() => {}); });

const geoTask = (over: any = {}) => ({ mode: 'geo', prompt: 'Wo liegt Hamburg?', map: 'germany', answer: { lat: 53.55, lon: 9.99, label: 'Hamburg' }, seconds: 30, points: 500, explain: 'Hamburg liegt an der Elbe.', ...over });
const q2 = (over: any = {}) => ({ task: geoTask(over), topic: 'Test' });
const cat = (over: any = {}) => ({ title: 'Testkategorie', topic: 'Eigene Fragen', icon: '🧪', color: '#14d9c0', kind: 'tile', football: false, blurb: 'Setze deinen Pin.', taskIds: [], ...over });

test('Sicherheit: ohne Anmeldung ist KEINE Admin-Route erreichbar (lesen wie schreiben)', async () => {
  const e = await mk(); const a = new Admin(e);
  for (const [m, p] of [['GET', '/questions'], ['GET', '/categories'], ['GET', '/packs'], ['GET', '/export'], ['GET', '/scenes'], ['POST', '/questions'], ['PUT', '/questions/x'], ['DELETE', '/categories/x'], ['POST', '/packs/standard-1/publish'], ['POST', '/import'], ['POST', '/preview']] as const) {
    const r = await a.req(m, p, m === 'GET' ? undefined : {}, { cookie: false });
    assert.equal(r.status, 401, `${m} ${p}`);
  }
  // gefälschtes Cookie
  a.cookie = 'outplay_admin=erfunden';
  assert.equal((await a.get('/questions')).status, 401);
  // Spieler-Token / Host-Schlüssel eines Raums geben keinen Admin-Zugriff
  const room = await createRoom(e); const j = await joinPlayer(e, room.code, 'Mallory');
  a.cookie = `outplay_admin=${j.token}`; assert.equal((await a.get('/questions')).status, 401);
  a.cookie = `outplay_admin=${room.hostKey}`; assert.equal((await a.post('/questions', q2())).status, 401);
});

test('Sicherheit: Login, HttpOnly-Cookie, CSRF-Header, Logout, Rate-Limit', async () => {
  const e = await mk(); const a = new Admin(e);
  assert.equal((await a.login('falsch')).status, 401);
  const ok = await a.login();
  assert.equal(ok.status, 200);
  assert.match(ok.setCookie, /HttpOnly/); assert.match(ok.setCookie, /SameSite=Strict/);
  assert.equal((await a.get('/overview')).status, 200);
  assert.equal((await a.req('POST', '/questions', q2(), { csrf: false })).status, 403); // ohne CSRF-Header
  const r = await fetch(e.url + '/api/admin/questions', { method: 'POST', headers: { 'content-type': 'application/json', 'x-outplay-admin': '1', cookie: a.cookie, origin: 'http://evil.example' }, body: JSON.stringify(q2()) });
  assert.equal(r.status, 403); // fremde Herkunft
  assert.equal((await a.post('/logout')).status, 200);
  assert.equal((await a.get('/overview')).status, 401);
  // Rate-Limit nach 8 Fehlversuchen (auch das richtige Passwort wird dann kurz abgewiesen)
  const b = new Admin(e); let last = 0;
  for (let i = 0; i < 9; i++) last = (await b.login('x' + i)).status;
  assert.equal(last, 429); assert.equal((await b.login()).status, 429);
});

test('Initiale Vorlagen: alle bisherigen Inhalte sind im Admin sichtbar (Fragen, Kategorien, Standardpaket v1)', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const total = TILES.reduce((n, t) => n + t.tasks.length, 0) + SEED_SHOW.pool.length + EXTRA_SHOWS.reduce((n, x) => n + x.pool.length, 0);
  const qs = (await a.get('/questions')).data; assert.equal(qs.length, total);
  assert.ok(qs.every((q: any) => q.problems.length === 0), 'alle Vorlagen-Fragen sind gültig');
  const cats = (await a.get('/categories')).data; assert.equal(cats.length, TILES.length + SEED_SHOW.rounds.length + EXTRA_SHOWS.reduce((n, x) => n + x.rounds.length, 0));
  assert.ok(cats.every((c: any) => c.problems.length === 0), JSON.stringify(cats.filter((c: any) => c.problems.length)));
  const packs = (await a.get('/packs')).data; const std = packs.find((p: any) => p.id === 'standard-2'); assert.ok(std); assert.equal(std.currentVersion, 1); assert.equal(std.status, 'published'); assert.ok(packs.some((p: any) => p.id === 'show-1' && p.status === 'published'));
  assert.equal((await (await fetch(e.url + '/api/packs')).json() as any[]).map((p: any) => p.ref).sort().join(), 'show-1@1,show-2@1,show-2k@1,show-3@1,standard-2@1');
  // Filter & Suche
  assert.ok((await a.get('/questions?mode=geo')).data.every((q: any) => q.mode === 'geo'));
  assert.ok((await a.get('/questions?q=timbuktu')).data.length === 1);
  const sc = (await a.get('/scenes')).data; assert.ok(sc.some((s: any) => s.id === 'table1' && s.builtin));
});

test('Fragen: erstellen, bearbeiten, duplizieren, filtern, löschen (und Löschschutz)', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const c = await a.post('/questions', q2({ prompt: 'Wo liegt Lübeck?' })); assert.equal(c.status, 201); assert.deepEqual(c.data.problems, []);
  const id = c.data.id;
  const u = await a.put('/questions/' + id, { task: geoTask({ prompt: 'Wo liegt Lübeck an der Ostsee?', points: 400 }), topic: 'Norden' });
  assert.equal(u.data.task.points, 400); assert.equal(u.data.topic, 'Norden');
  const dup = await a.post(`/questions/${id}/duplicate`); assert.equal(dup.status, 201); assert.match(dup.data.task.prompt, /\(Kopie\)/);
  assert.equal((await a.get('/questions?topic=Norden')).data.length, 2);
  assert.equal((await a.get('/questions?q=lübeck')).data.length, 2);
  // unvollständige Fragen lassen sich als Entwurf speichern, melden aber Probleme
  const bad = await a.post('/questions', q2({ prompt: '', explain: '' })); assert.ok(bad.data.problems.length >= 2);
  // Löschschutz
  const k = await a.post('/categories', cat({ taskIds: [id] })); assert.equal(k.status, 201);
  assert.equal((await a.del('/questions/' + id)).status, 409);
  assert.equal((await a.del('/questions/' + dup.data.id)).status, 200);
  assert.equal((await a.get('/questions/' + dup.data.id)).status, 404);
  // Modus nicht änderbar, wenn in Kategorie
  assert.equal((await a.put('/questions/' + id, { task: { mode: 'estimate', prompt: 'x' } })).status, 409);
});

test('Kategorien: anlegen, bearbeiten, duplizieren, deaktivieren, löschen; Budget-/Modus-Prüfung', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const q1 = (await a.post('/questions', q2({ points: 1100 }))).data.id, q3 = (await a.post('/questions', q2({ points: 1100 }))).data.id;
  const est = (await a.post('/questions', { task: { mode: 'estimate', prompt: 'Wie viele?', unit: 'x', answer: 5, seconds: 30, betSeconds: 20, points: 100, bets: [0, 100], explain: 'e' } })).data.id;
  const c = (await a.post('/categories', cat({ taskIds: [q1, q3] }))).data;
  assert.equal(c.mode, 'geo'); assert.equal(c.points, 2200);
  assert.ok(c.problems.some((p: string) => p.includes('Budget')), 'mehr als das Kategorienbudget wird gemeldet');
  const fixed = (await a.put('/categories/' + c.id, { ...c, taskIds: [q1] })).data; assert.equal(fixed.points, 1100); assert.deepEqual(fixed.problems, []);
  const mixed = (await a.put('/categories/' + c.id, { ...c, taskIds: [q1, est] })).data; assert.ok(mixed.problems.some((p: string) => p.includes('Spielmodus')));
  const d = (await a.post(`/categories/${c.id}/duplicate`, { copyQuestions: true })).data; assert.equal(d.disabled, true); assert.notEqual(d.id, c.id);
  assert.notDeepEqual(d.taskIds, c.taskIds);
  const off = (await a.put('/categories/' + d.id, { ...d, disabled: true, icon: '🚀' })).data; assert.equal(off.icon, '🚀');
  assert.equal((await a.del('/categories/' + d.id)).status, 200);
  assert.equal((await a.get('/categories/' + d.id)).status, 404);
  // In Paket verwendete Kategorie ist geschützt
  const std = (await a.get('/categories/v2-orte-mit-geschichte')).data; assert.ok(std.usedInPacks.length === 1);
  assert.equal((await a.del('/categories/v2-orte-mit-geschichte')).status, 409);
});

/** Baut ein vollständiges eigenes Paket (6 neue Kategorien + Überraschung + Finale) und veröffentlicht es. */
async function buildCustomPack(a: Admin, tag = 'Eigen') {
  const catIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const qa = (await a.post('/questions', q2({ prompt: `${tag} ${i}: Wo liegt Hamburg?`, points: 500 }))).data.id;
    const qb = (await a.post('/questions', q2({ prompt: `${tag} ${i}: Wo liegt München?`, answer: { lat: 48.14, lon: 11.58, label: 'München' }, points: 500 }))).data.id;
    catIds.push((await a.post('/categories', cat({ title: `${tag} ${i}`, taskIds: [qa, qb] }))).data.id);
  }
  const su = (await a.post('/questions', { task: { mode: 'unique', prompt: 'Nenne eine Farbe der Ampel', placeholder: 'Farbe …', seconds: 30, pointsUnique: 500, pointsShared: 100, explain: 'Rot, Gelb, Grün.', valid: [{ name: 'Rot', variants: [] }, { name: 'Gelb', variants: ['Orange'] }, { name: 'Grün', variants: [] }] } })).data.id;
  const su2 = (await a.post('/questions', { task: { mode: 'unique', prompt: 'Nenne ein Haustier', placeholder: 'Tier …', seconds: 30, pointsUnique: 500, pointsShared: 100, explain: 'Hund, Katze, Hamster.', valid: [{ name: 'Hund', variants: [] }, { name: 'Katze', variants: [] }, { name: 'Hamster', variants: [] }] } })).data.id;
  const surprise = (await a.post('/categories', cat({ title: 'Eigene Überraschung', kind: 'surprise', taskIds: [su, su2] }))).data.id;
  const f1 = (await a.post('/questions', q2({ prompt: 'Finale: Wo liegt Berlin?', answer: { lat: 52.52, lon: 13.4, label: 'Berlin' }, points: 1000 }))).data.id;
  const f2 = (await a.post('/questions', q2({ prompt: 'Finale: Wo liegt Köln?', answer: { lat: 50.94, lon: 6.96, label: 'Köln' }, points: 1000 }))).data.id;
  const fin = (await a.post('/categories', cat({ title: 'Eigenes Finale', kind: 'final', taskIds: [f1, f2] }))).data.id;
  const pack = (await a.post('/packs', { name: 'Eigener Abend', description: 'Test', categoryIds: catIds, surprise, final: fin, rules: { startCredit: 100, maxFootball: 2, maxPerMode: 6 } })).data;
  return { pack, catIds, surprise, fin, firstQ: qa0(catIds) };
}
const qa0 = (c: string[]) => c;

test('Spielepaket: Entwurf → Prüfung → Veröffentlichung; Fehler verhindern Veröffentlichung', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const bad = (await a.post('/packs', { name: 'Leer', categoryIds: [], surprise: '', final: '' })).data;
  const r = await a.post(`/packs/${bad.id}/publish`, {}); assert.equal(r.status, 422); assert.ok(r.data.details.length >= 2);
  const { pack } = await buildCustomPack(a);
  const an = (await a.get(`/packs/${pack.id}/analysis`)).data; assert.equal(an.ok, true, JSON.stringify(an.errors));
  const pub = await a.post(`/packs/${pack.id}/publish`, { note: 'erste Version' }); assert.equal(pub.status, 200); assert.equal(pub.data.ref, `${pack.id}@1`);
  assert.ok((await (await fetch(e.url + '/api/packs')).json() as any[]).some(p => p.ref === `${pack.id}@1`));
  assert.equal((await a.del(`/packs/${pack.id}`)).status, 409); // veröffentlicht: nur archivieren
  assert.equal((await a.post(`/packs/${pack.id}/status`, { status: 'archived' })).data.status, 'archived');
  assert.ok(!(await (await fetch(e.url + '/api/packs')).json() as any[]).some(p => p.id === pack.id), 'archivierte Pakete sind für neue Räume nicht wählbar');
  assert.equal((await a.del(`/packs/${bad.id}`)).status, 200);
});

test('Laufende Show bleibt unverändert, wenn Inhalte/Pakete im Admin geändert werden; neue Räume nutzen die neue Version; Rollback', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const { pack, catIds } = await buildCustomPack(a, 'Alt');
  await a.post(`/packs/${pack.id}/publish`, { note: 'v1' });
  // Raum mit v1 starten
  const room = await post(e, '/api/rooms', { pack: pack.id }); assert.equal(room.body.version, 1);
  const code = room.body.code;
  const ids: string[] = [], toks: string[] = [];
  for (let i = 0; i < 2; i++) { const j = await joinPlayer(e, code, 'P' + i); ids.push(j.playerId); toks.push(j.token); }
  const host = new Client(e, 'host', code, room.body.hostKey); await host.connect();
  const p0 = new Client(e, 'player', code, toks[0]); await p0.connect();
  await host.act({ k: 'h.startShow' }); await host.act({ k: 'h.introDone' });
  await host.act({ k: 'h.pick', tileId: catIds[0] }); await host.act({ k: 'h.begin' });
  await p0.waitFor(v => v.round?.stage === 'open');
  const promptBefore = p0.view!.round!.data.prompt; assert.match(promptBefore, /^Alt 0:/);
  // Admin ändert Frage, Kategorie (Titel) und veröffentlicht v2
  const cats = (await a.get('/categories/' + catIds[0])).data;
  const q = (await a.get('/questions/' + cats.taskIds[0])).data;
  await a.put('/questions/' + q.id, { task: { ...q.task, prompt: 'GEÄNDERT während der Show', points: 100 } });
  await a.put('/categories/' + catIds[0], { ...cats, title: 'Neuer Titel' });
  assert.equal((await a.post(`/packs/${pack.id}/publish`, { note: 'v2' })).data.version, 2);
  // Show läuft mit alter Version weiter, auch nach Reconnect und Serverneustart des Lesers
  await p0.act({ k: 'submit', payload: { lat: 53.55, lon: 9.99 } });
  await host.act({ k: 'h.reveal' }); for (const gr of (host.view!.round?.data?.groups ?? [])) if (gr.state === 'unknown') await host.act({ k: 'h.review', groupKey: gr.key, decision: 'invalid' }); await host.act({ k: 'h.reveal' }); await host.waitFor(v => v.round?.stage === 'reveal');
  assert.match(host.view!.round!.title, /Alt 0/); assert.equal(host.view!.round!.points, 500);
  p0.disconnect(); const p0b = new Client(e, 'player', code, toks[0]); await p0b.connect();
  assert.match(p0b.view!.round!.title, /Alt 0/);
  assert.equal(p0b.view!.me!.score, 100 + 500); // Startguthaben 100 + volle Punkte der ALTEN Version
  // Neuer Raum nutzt v2
  const room2 = await post(e, '/api/rooms', { pack: pack.id }); assert.equal(room2.body.version, 2);
  // Rollback auf v1: neue Räume nutzen wieder v1
  assert.equal((await a.post(`/packs/${pack.id}/rollback`, { version: 1 })).data.currentVersion, 1);
  assert.equal((await post(e, '/api/rooms', { pack: pack.id })).body.version, 1);
  const vs = (await a.get(`/packs/${pack.id}/versions`)).data; assert.deepEqual(vs.map((v: any) => v.version), [2, 1]); assert.equal(vs.find((v: any) => v.current).version, 1);
  assert.equal((await a.post(`/packs/${pack.id}/rollback`, { version: 99 })).status, 404);
  closeAll({ host, tv: host, players: [p0b], } as any); p0b.disconnect();
});

test('Vollständige Multiplayer-Show mit EIGENEN Fragen (Wand → Runde → Überraschung → Finale → Siegerehrung)', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const { pack, catIds, surprise, fin } = await buildCustomPack(a, 'Show');
  await a.post(`/packs/${pack.id}/publish`, {});
  const room = await post(e, '/api/rooms', { pack: pack.id });
  const code = room.body.code; const ids: string[] = [], clients: Client[] = [];
  const host = new Client(e, 'host', code, room.body.hostKey); await host.connect();
  for (let i = 0; i < 3; i++) { const j = await joinPlayer(e, code, 'S' + i); ids.push(j.playerId); const c = new Client(e, 'player', code, j.token); await c.connect(); clients.push(c); }
  await host.act({ k: 'h.startShow' }); await host.act({ k: 'h.introDone' });
  const guess = [{ lat: 53.55, lon: 9.99 }, { lat: 50, lon: 9 }, { lat: 40, lon: 0 }];
  let played = 0;
  for (let guard = 0; guard < 80 && host.view!.room.phase !== 'ceremony'; guard++) {
    const ph = host.view!.room.phase;
    if (ph === 'wall') { const next = catIds.find(id => host.view!.wall!.tiles.find(t => t.id === id)!.status === 'open')!; await host.act({ k: 'h.pick', tileId: next }); played++; }
    else if (ph === 'scoreboard') await host.act({ k: 'h.continue' });
    else if (ph === 'round') {
      const r = host.view!.round!;
      if (r.stage === 'intro') { await host.act({ k: 'h.begin' }); await host.waitFor(v => v.round!.stage !== 'intro'); }
      const mode = host.view!.round!.mode;
      if (mode === 'geo') for (let i = 0; i < 3; i++) await clients[i].act({ k: 'submit', payload: guess[i] });
      if (mode === 'unique') { await clients[0].act({ k: 'submit', payload: { answer: 'Rot' } }); await clients[1].act({ k: 'submit', payload: { answer: 'rot' } }); await clients[2].act({ k: 'submit', payload: { answer: 'Grün' } }); await clients[0].act({ k: 'submit', payload: { answer: 'Rot' } }); }
      await host.act({ k: 'h.reveal' }); for (const gr of (host.view!.round?.data?.groups ?? [])) if (gr.state === 'unknown') await host.act({ k: 'h.review', groupKey: gr.key, decision: 'invalid' }); await host.act({ k: 'h.reveal' }); await host.waitFor(v => v.round?.stage === 'reveal');
      await host.act({ k: 'h.next' });
    }
    await new Promise(r => setTimeout(r, 30));
  }
  assert.equal(host.view!.room.phase, 'ceremony'); assert.equal(played, 6);
  assert.ok(host.view!.players.every(p => p.score! >= 100), 'Startguthaben des eigenen Pakets (100) bleibt erhalten');
  assert.ok(host.view!.players.some(p => p.score! > 100), 'Punkte aus eigenen Fragen wurden vergeben');
  void surprise; void fin; clients.forEach(c => c.disconnect()); host.disconnect();
});

test('Persistenz: Inhalte, Pakete, Versionen und Admin-Sitzung überleben einen Serverneustart', async () => {
  const e1 = await mk(); const a = new Admin(e1); await a.login();
  const { pack } = await buildCustomPack(a, 'Persist'); await a.post(`/packs/${pack.id}/publish`, { note: 'p1' });
  const sc = (await a.post('/scenes', { template: { kind: 'grid', title: 'Persistenz', emoji: '🔵', oddEmoji: '🔴', cols: 6, rows: 4, oddRow: 1, oddCol: 2 } })).data;
  const cookie = a.cookie; await e1.close();
  const e2 = await mk({ dbFile: e1.dbFile }); const b = new Admin(e2); b.cookie = cookie;
  assert.equal((await b.get('/overview')).status, 200, 'Sitzung bleibt gültig');
  assert.equal((await b.get(`/packs/${pack.id}/versions`)).data.length, 1);
  assert.equal((await b.get('/questions?q=persist')).data.length, 12);
  assert.ok((await b.get('/scenes')).data.some((s: any) => s.id === sc.id && !s.builtin));
  assert.equal((await post(e2, '/api/rooms', { pack: pack.id })).body.version, 1);
});

test('Import/Export: Roundtrip, Konfliktmodi, ungültige Dateien', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const { pack } = await buildCustomPack(a, 'Exp');
  const sc = (await a.post('/scenes', { template: { kind: 'list', title: 'Karte', rows: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }], changeRow: 1, newValue: '9', style: 'menu' } })).data;
  await a.post('/questions', { task: { mode: 'glitch', prompt: 'Was änderte sich?', viewPrompt: 'Merken!', scene: sc.id, viewSeconds: 8, seconds: 20, points: 100, explain: 'B' }, topic: 'Szene' });
  const ex = (await a.req('GET', `/export?scope=pack:${pack.id}`)).data;
  assert.equal(ex.format, 'outplay-content'); assert.equal(ex.version, 2); assert.equal(ex.packs.length, 1); assert.equal(ex.categories.length, 8); assert.equal(ex.questions.length, 16); assert.ok(ex.checksum);
  const all = (await a.get('/export?scope=all')).data; assert.ok(all.questions.length > 40 && all.packs.some((p: any) => p.versions));
  const qOnly = (await a.get('/export?scope=questions')).data; assert.ok(!qOnly.packs && qOnly.scenes.some((s: any) => s.id === sc.id));
  const before = (await a.get('/questions')).data.length;
  // Gleicher Inhalt, gleiche IDs -> alles "identisch", nichts wird doppelt angelegt
  const same = (await a.post('/import', { data: ex })).data;
  assert.equal(same.questions.identical, 16); assert.equal(same.questions.created + same.questions.renamed, 0); assert.equal(same.categories.identical, 8);
  assert.equal((await a.get('/questions')).data.length, before);
  // Lokale Änderung -> Konflikt: skip lässt lokal, rename legt Kopie an, overwrite überschreibt
  const q0 = ex.questions[0];
  await a.put('/questions/' + q0.id, { task: { ...q0.task, prompt: 'Lokal geändert' } });
  assert.equal((await a.post('/import', { data: ex, onConflict: 'skip' })).data.questions.skipped, 1);
  assert.equal((await a.get('/questions/' + q0.id)).data.task.prompt, 'Lokal geändert');
  const ren = (await a.post('/import', { data: ex, onConflict: 'rename' })).data;
  assert.equal(ren.questions.renamed, 1); assert.equal(ren.questions.identical, 15);
  assert.equal((await a.get('/questions')).data.length, before + 1);
  assert.ok(ren.idMap.questions[q0.id] !== q0.id);
  // Szenen-Referenzen werden mitgezogen
  const glitch = (await a.get('/questions?mode=glitch&q=änderte')).data; assert.ok(glitch.every((q: any) => !q.problems.length), JSON.stringify(glitch.map((q: any) => q.problems)));
  q0.task.prompt = 'Überschrieben!';
  const ow = (await a.post('/import', { data: { ...ex, checksum: undefined }, onConflict: 'overwrite' })).data;
  assert.equal(ow.questions.overwritten, 1);
  assert.equal((await a.get('/questions/' + q0.id)).data.task.prompt, 'Überschrieben!');
  // Ungültig
  assert.equal((await a.post('/import', { data: { foo: 1 } })).status, 422);
  const junk = (await a.post('/import', { data: { format: 'outplay-content', version: 1, questions: [{ id: 'zz', task: { mode: 'nope' } }, { id: 'zz2', task: { mode: 'geo', prompt: '<script>alert(1)</script>', map: 'world', answer: { lat: 1, lon: 1, label: 'x' }, seconds: 20, points: 10, explain: 'x' } }] } })).data;
  assert.equal(junk.questions.created, 1); assert.ok(junk.errors.length === 1);
});

test('Vorschau: nutzt die echte Engine, liefert TV-/Handy-/Host-Sichten, Auflösung und Punkte – ohne echte Räume zu berühren', async () => {
  const e = await mk(); const a = new Admin(e); await a.login();
  const room = await createRoom(e);
  const roomsBefore = e.app.rooms.size; const eventsBefore = e.app.store.eventCount(room.code);
  for (const t of TILES) for (const task of t.tasks.slice(0, 1)) {
    const r = (await a.post('/preview', { task, meta: { title: t.title, kind: t.kind } })).data;
    assert.equal(r.ok, true, t.id + JSON.stringify(r.problems));
    assert.ok(r.frames.length >= 3); const last = r.frames[r.frames.length - 1];
    assert.equal(last.label, 'Auflösung'); assert.equal(last.tv.round.stage, 'reveal'); assert.ok(last.tv.round.reveal);
    assert.ok(r.scores.length === 4 && r.scores.some((s: any) => s.points > 0), task.mode + JSON.stringify(r.scores));
    assert.ok(r.formula.length > 20);
    // Die Handysicht verrät nichts vorab
    const open = r.frames[1];
    assert.equal(open.player.round.stage === 'intro', false);
    assert.equal(open.player.host, undefined); assert.ok(open.host.host);
  }
  const bad = (await a.post('/preview', { task: { ...geoTask(), answer: { lat: 999, lon: 0, label: '' } } })).data; assert.equal(bad.ok, false); assert.ok(bad.problems.length);
  assert.equal(e.app.rooms.size, roomsBefore); assert.equal(e.app.store.eventCount(room.code), eventsBefore);
});

test('Glitch-Szenen aus Vorlagen: Unterschiede und Trefferzonen werden exakt erzeugt', () => {
  const tpls: any[] = [
    { kind: 'grid', title: 'G', emoji: '🔵', oddEmoji: '🔴', cols: 8, rows: 5, oddRow: 3, oddCol: 6 },
    { kind: 'list', title: 'L', rows: [{ label: 'Brot', value: '2,10' }, { label: 'Milch', value: '1,20' }, { label: 'Käse', value: '3,50' }], changeRow: 2, newValue: '5,30', style: 'receipt' },
    { kind: 'table', title: 'T', headers: ['Team', 'S', 'U', 'N', 'Pkt'], rows: [['A', '3', '1', '0', '10'], ['B', '2', '2', '0', '8'], ['C', '1', '1', '2', '4']], changeRow: 1, changeCol: 4, newValue: '9' },
    { kind: 'pitch', title: 'P', change: 'ball', index: 0, dx: 120, dy: -80 },
    { kind: 'pitch', title: 'P2', change: 'remove-home', index: 4, dx: 0, dy: 0 },
  ];
  for (const t of tpls) {
    assert.deepEqual(validateTemplate(t), [], t.kind);
    const s = buildScene('x', t); const z = diffZones(s);
    assert.equal(z.length, 1, t.kind); assert.ok(z[0].x > 0 && z[0].x < 1000 && z[0].y > 0 && z[0].y < 600 && z[0].hw! >= 18 && z[0].hh! >= 18);
  }
  assert.ok(validateTemplate({ ...tpls[0], oddEmoji: '🔵' }).length, 'identisches Symbol = kein Unterschied');
  assert.ok(validateTemplate({ ...tpls[2], newValue: '8' }).length, 'unveränderter Wert');
  assert.ok(validateTemplate({ ...tpls[3], dx: 3, dy: 3 }).length, 'zu kleine Verschiebung');
});

test('Validierung: jeder Modus meldet verständliche Fehler', () => {
  const v = (t: any) => validateTask(normalizeTask(t), id => id in SCENES);
  assert.ok(v({ mode: 'rank', prompt: 'x', explain: 'x', items: [{ text: 'a' }, { text: 'b' }], order: [0, 1], secondsPerItem: 10, points: 100, topLabel: 'o', bottomLabel: 'u' }).some(m => m.includes('fünf')));
  assert.ok(v({ mode: 'rank', prompt: 'x', explain: 'x', items: ['a', 'b', 'c', 'd', 'e'].map(text => ({ text })), order: [0, 1, 2, 3, 4], secondsPerItem: 10, points: 100, topLabel: 'o', bottomLabel: 'u' }).some(m => m.includes('Enthüllungsreihenfolge')));
  assert.ok(v({ mode: 'estimate', prompt: 'x', explain: 'x', unit: 'km', answer: -3, seconds: 30, betSeconds: 20, points: 100, bets: [0, 100] }).some(m => m.includes('größer als 0')));
  assert.ok(v({ mode: 'estimate', prompt: 'x', explain: 'x', unit: 'km', answer: 3, seconds: 30, betSeconds: 20, points: 100, bets: [100, 50] }).some(m => m.includes('Einsätze')));
  assert.ok(v({ mode: 'glitch', prompt: 'x', explain: 'x', viewPrompt: 'v', scene: 'gibtsnicht', viewSeconds: 10, seconds: 20, points: 100 }).some(m => m.includes('Szene')));
  assert.ok(v({ mode: 'codebreak', prompt: 'x', explain: 'x', answers: [], seconds: 60, points: 100 }).some(m => m.includes('richtige Antwort')));
  assert.ok(v({ mode: 'unique', prompt: 'x', explain: 'x', placeholder: 'p', valid: [{ name: 'a' }], seconds: 30, pointsUnique: 100, pointsShared: 200 }).length >= 2);
  assert.ok(v({ mode: 'geo', prompt: 'x', explain: 'x', map: 'mars', answer: { lat: 0, lon: 0, label: 'a' }, seconds: 30, points: 100 }).some(m => m.includes('Karte')));
  assert.deepEqual(v(TILES[0].tasks[0]), []);
});

test('Analyse: Spielzeit erwartet vs. maximal, Modusverteilung, Fußballanteil mit und ohne Limit', () => {
  const book: any = { tiles: TILES, scenes: SCENES, rules: { maxFootball: 99, maxPerMode: 99 } };
  const free = analyzeBook(book)!.combos!;
  const limited = analyzeBook({ ...book, rules: { maxFootball: 2, maxPerMode: 2 } }).combos!;
  assert.ok(free.minutesMax.max > free.minutesExpected.max + 5, 'Worst-Case ist deutlich länger');
  assert.ok(free.minutesExpected.min >= 60 && free.minutesExpected.max <= 80, JSON.stringify(free.minutesExpected));
  assert.ok(limited.footballShare.max <= free.footballShare.max, 'Limit senkt den maximalen Fußballanteil');
  assert.ok(limited.footballShare.max < 0.45, String(limited.footballShare.max));
  console.log('# Analyse Standardpaket:', JSON.stringify({ frei: free, mitLimit: limited }));
});
