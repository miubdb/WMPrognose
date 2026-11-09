// End-to-End: Online-Admin -> Export -> zweite, leere Installation -> Import -> Veröffentlichen -> Raum -> echte Runde mit eigener Glitch-Szene.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Admin, Client, joinPlayer, post, startEnv, type TestEnv } from './helpers';
import { App } from '../server/app';
import { BOOK } from '../content';
import { candidates, netInfo } from '../server/net';
import { canonical } from '../server/content';
import { glitchZones } from '../server/modes';

const envs: TestEnv[] = [];
const mk = async (o: any = {}) => { const e = await startEnv({ adminPassword: 'transfer-pw-123', ...o }); envs.push(e); return e; };
after(async () => { for (const e of envs) await e.close().catch(() => {}); });

const geo = (prompt: string, over: any = {}) => ({ task: { mode: 'geo', prompt, map: 'germany', answer: { lat: 52.52, lon: 13.4, label: 'Berlin' }, seconds: 30, points: 1000, explain: 'Test-Erklärung.', ...over }, topic: 'Transfer' });

test('Transfer Online -> Lokal: vollständiger Spieleabend inkl. eigener Glitch-Szene, Paketregeln und Startguthaben', async () => {
  // ===== Server A ("Online-Admin") =====
  const A = await mk(); const a = new Admin(A, 'transfer-pw-123'); await a.login();
  // 1) neue Szene aus Vorlage + 2) Glitch-Frage mit Antwort/Erklärung
  const scene = (await a.post('/scenes', { template: { kind: 'table', title: 'Eigene Tabelle', headers: ['Team', 'S', 'U', 'N', 'Pkt'], rows: [['Alpha', '3', '1', '0', '10'], ['Beta', '2', '2', '0', '8'], ['Gamma', '1', '1', '2', '4']], changeRow: 1, changeCol: 4, newValue: '9' } })).data;
  assert.equal(scene.template.kind, 'table');
  const gq = (await a.post('/questions', { task: { mode: 'glitch', prompt: 'Welche Punktzahl wurde gefälscht?', viewPrompt: 'Merk dir die Tabelle!', scene: scene.id, viewSeconds: 6, seconds: 30, points: 1000, explain: 'Beta hat 2 Siege und 2 Unentschieden = 8 Punkte.' }, topic: 'Transfer' })).data;
  assert.deepEqual(gq.problems, []);
  // 3) Frage einer Kategorie zuordnen; Kategorien + Reihenfolge, Überraschung, Finale
  const cats: string[] = [];
  cats.push((await a.post('/categories', { title: 'Eigene Glitch-Runde', topic: 'Zahlen', icon: '🧪', color: '#14d9c0', kind: 'tile', football: false, blurb: 'Tippe auf die gefälschte Zahl.', taskIds: [gq.id] })).data.id);
  for (let i = 1; i < 6; i++) {
    const q = (await a.post('/questions', geo(`Transfer ${i}: Wo liegt Berlin?`))).data;
    cats.push((await a.post('/categories', { title: `Transfer ${i}`, topic: 'Geo', icon: '🧭', color: '#8b5cf6', kind: 'tile', football: i === 5, blurb: 'Pin setzen.', taskIds: [q.id] })).data.id);
  }
  const u1 = (await a.post('/questions', { task: { mode: 'unique', prompt: 'Nenne eine Ampelfarbe', placeholder: 'Farbe …', seconds: 30, pointsUnique: 500, pointsShared: 100, explain: 'Rot, Gelb, Grün.', valid: [{ name: 'Rot', variants: ['Red'] }, { name: 'Gelb', variants: ['Orange', 'Amber'] }, { name: 'Grün', variants: ['Gruen', 'Green'] }] } })).data.id;
  const u2 = (await a.post('/questions', { task: { mode: 'unique', prompt: 'Nenne ein Haustier', placeholder: 'Tier …', seconds: 30, pointsUnique: 500, pointsShared: 100, explain: 'Hund, Katze, Hamster.', valid: [{ name: 'Hund', variants: ['Dog'] }, { name: 'Katze', variants: ['Cat', 'Kater'] }, { name: 'Hamster', variants: [] }] } })).data.id;
  const sur = (await a.post('/categories', { title: 'Eigene Überraschung', topic: 'Psychologie', icon: '✨', color: '#ec4899', kind: 'surprise', football: false, blurb: 'Einzigartig sein!', taskIds: [u1, u2] })).data.id;
  const f1 = (await a.post('/questions', geo('Finale 1: Wo liegt Berlin?', { points: 1000 }))).data.id, f2 = (await a.post('/questions', geo('Finale 2: Wo liegt Berlin?', { points: 1000 }))).data.id;
  const fin = (await a.post('/categories', { title: 'Eigenes Finale', topic: 'Finale', icon: '🔒', color: '#f5b82e', kind: 'final', football: false, blurb: 'Alles oder nichts.', taskIds: [f1, f2] })).data.id;
  // 4) Paket mit Regeln veröffentlichen
  const pack = (await a.post('/packs', { name: 'Transfer-Abend', description: 'Online vorbereitet', categoryIds: cats, surprise: sur, final: fin, rules: { startCredit: 150, maxFootball: 1, maxPerMode: 6 } })).data;
  const pub = await a.post(`/packs/${pack.id}/publish`, { note: 'online' }); assert.equal(pub.status, 200, JSON.stringify(pub.data));
  // 5) Export
  const exportRes = await a.req('GET', `/export?scope=pack:${pack.id}`); assert.equal(exportRes.status, 200);
  const file = JSON.parse(JSON.stringify(exportRes.data));          // = die heruntergeladene JSON-Datei
  assert.equal(file.version, 2); assert.equal(file.counts.questions, 10); assert.equal(file.counts.categories, 8); assert.equal(file.counts.scenes, 1); assert.equal(file.counts.packs, 1);
  assert.ok(file.scenes[0].template && file.scenes[0].data.items.length, 'Szene enthält Vorlage UND gerenderte Daten');
  assert.ok(file.packs[0].bookHash && file.packs[0].book, 'veröffentlichter Paketstand ist enthalten');
  const exportedQs = (await a.get('/questions?topic=Transfer')).data;
  const before = { q: exportedQs.length, cats: (await a.get('/categories')).data.filter((c: any) => cats.includes(c.id)).length };

  // ===== Server B ("Laptop", leere Installation mit eigener Datenbank) =====
  const B = await mk(); const b = new Admin(B, 'transfer-pw-123'); await b.login();
  const baseQ = (await b.get('/questions')).data.length, baseC = (await b.get('/categories')).data.length, baseS = (await b.get('/scenes')).data.length;
  assert.equal((await b.get('/questions?topic=Transfer')).data.length, 0, 'zweite Installation kennt die Inhalte noch nicht');
  // 6) Trockenlauf ändert nichts
  const dry = (await b.post('/import', { data: file, dryRun: true, publish: true })).data;
  assert.equal(dry.dryRun, true); assert.equal(dry.questions.created, 10); assert.equal(dry.scenes.created, 1);
  assert.equal((await b.get('/questions')).data.length, baseQ); assert.equal((await b.get('/scenes')).data.length, baseS);
  assert.equal((await b.get('/packs')).data.length, 10, 'Trockenlauf legt kein Paket an');
  // 7) echter Import mit Prüfung + Veröffentlichung
  const imp = (await b.post('/import', { data: file, publish: true })).data;
  assert.deepEqual(imp.errors, []); assert.deepEqual(imp.warnings, []);
  assert.equal(imp.questions.created, 10); assert.equal(imp.categories.created, 8); assert.equal(imp.scenes.created, 1); assert.equal(imp.packs.created, 1);
  const pr = imp.packResults[0]; assert.equal(pr.published, true, JSON.stringify(pr)); assert.equal(pr.match, true, 'Inhalt des veröffentlichten Pakets stimmt mit dem Export überein (Hash)'); assert.deepEqual(pr.errors, []);
  // 8) Vorher/Nachher-Vergleich
  assert.equal((await b.get('/questions')).data.length, baseQ + 10); assert.equal((await b.get('/categories')).data.length, baseC + 8); assert.equal((await b.get('/scenes')).data.length, baseS + 1);
  const importedQs = (await b.get('/questions?topic=Transfer')).data;
  assert.equal(importedQs.length, before.q);
  const strip = (x: any) => canonical(x.task);
  assert.deepEqual(importedQs.map(strip).sort(), exportedQs.map(strip).sort(), 'alle Fragen inkl. Antworten, Varianten, Zeiten und Punkte sind identisch');
  const sceneB = (await b.get('/scenes')).data.find((s: any) => s.title === 'Eigene Tabelle'); assert.ok(sceneB && !sceneB.builtin);
  assert.deepEqual(sceneB.template, scene.template); assert.equal(canonical({ items: sceneB.items, changes: sceneB.changes }), canonical({ items: scene.items, changes: scene.changes }));
  const packB = (await b.get('/packs')).data.find((p: any) => p.id === pr.id); assert.deepEqual(packB.rules, { startCredit: 150, maxFootball: 1, maxPerMode: 6, rankVariant: 'task', showTitle: 'OUTPLAY', winnerTitle: 'OUTPLAY-Champion', tasksPerMode: 4, estimateBets: [], estimateBonus: 0, tagline: '', winnerLine: '', boardTitle: '', uniquePoints: 0, boardEveryRound: false }); assert.equal(packB.categoryIds.length, 6); assert.equal(packB.currentVersion, 1);
  const catTitles = packB.categoryIds.map((id: string) => (imp.idMap.categories && Object.values(imp.idMap.categories).includes(id)) ? id : id);
  assert.equal(catTitles.length, 6);
  const orderB = (await Promise.all(packB.categoryIds.map(async (id: string) => (await b.get('/categories/' + id)).data.title)));
  assert.deepEqual(orderB, ['Eigene Glitch-Runde', 'Transfer 1', 'Transfer 2', 'Transfer 3', 'Transfer 4', 'Transfer 5'], 'Reihenfolge der Kategorien bleibt erhalten');
  // erneuter Import ist idempotent (keine Duplikate, keine neue Version)
  const again = (await b.post('/import', { data: file, publish: true })).data;
  assert.equal(again.questions.identical, 10); assert.equal(again.questions.created, 0); assert.equal(again.packs.identical, 1); assert.equal(again.packResults[0].note, 'unverändert (bereits veröffentlicht)');
  assert.equal((await b.get('/questions')).data.length, baseQ + 10); assert.equal((await b.get(`/packs/${pr.id}/versions`)).data.length, 1);

  // ===== 9) Raum mit dem importierten Paket erstellen und die importierte Glitch-Frage SPIELEN =====
  const room = await post(B, '/api/rooms', { pack: pr.id }); assert.equal(room.status, 200); assert.equal(room.body.pack, 'Transfer-Abend');
  const code = room.body.code, ids: string[] = [], pcs: Client[] = [];
  const host = new Client(B, 'host', code, room.body.hostKey); await host.connect();
  for (let i = 0; i < 3; i++) { const j = await joinPlayer(B, code, 'T' + i); ids.push(j.playerId); const c = new Client(B, 'player', code, j.token); await c.connect(); pcs.push(c); }
  await host.act({ k: 'h.startShow' }); await host.act({ k: 'h.introDone' });
  assert.ok(host.view!.players.every(p => p.score === 150), 'Startguthaben des Pakets (150) gilt');
  const glitchId = packB.categoryIds[0];
  assert.equal((await host.act({ k: 'h.pick', tileId: glitchId })).ok, true);
  await host.act({ k: 'h.begin' }); await pcs[0].waitFor(v => v.round?.stage === 'view');
  const tvView = host.view!.round!.data; assert.equal(tvView.sceneData.title, 'Eigene Tabelle'); assert.ok(!('changes' in tvView.sceneData), 'Änderungsliste wird nie ausgeliefert');
  await host.act({ k: 'h.lock' }); await pcs[0].waitFor(v => v.round?.stage === 'open');
  const sd = pcs[0].view!.round!.data.sceneData; assert.ok(sd.items.some((i: any) => i.text === '9'), 'Handy zeigt Bild B der eigenen Szene');
  const zone = (host.view!.round!.data.zones as any[])[0]; assert.ok(zone, 'Host kennt die Trefferzone');
  await pcs[0].act({ k: 'submit', payload: { x: zone.x, y: zone.y } });               // Treffer
  await pcs[1].act({ k: 'submit', payload: { x: 20, y: 20 } });                        // Fehlschuss
  await host.act({ k: 'h.reveal' }); for (const gr of (host.view!.round?.data?.groups ?? [])) if (gr.state === 'unknown') await host.act({ k: 'h.review', groupKey: gr.key, decision: 'invalid' }); await host.act({ k: 'h.reveal' }); await host.waitFor(v => v.round?.stage === 'reveal');
  const sc = (id: string) => host.view!.players.find(p => p.id === id)!.score!;
  assert.ok(sc(ids[0]) >= 150 + 700, 'Treffer bringt 70–100 % von 1000 Punkten'); assert.equal(sc(ids[1]), 150); assert.equal(sc(ids[2]), 150);
  assert.match(host.view!.round!.reveal.explain, /Beta hat 2 Siege/);
  pcs.forEach(c => c.disconnect()); host.disconnect();
  void glitchZones;
});

test('Backup: VACUUM-INTO-Voll-Backup ist auch im WAL-Betrieb konsistent und vollständig; Auto-Backup; Wiederherstellung per Skript', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'outplay-bk-')); const dbFile = join(dir, 'outplay.db'); const bdir = join(dir, 'backups');
  const clock = { now: 1_800_000_000_000 };
  const app = new App({ book: BOOK, dbFile, clock: () => clock.now, tickMs: 50, adminPassword: 'bk-pw-12345', backupDir: bdir });
  const port = await app.listen(0, '127.0.0.1'); const env: TestEnv = { app, port, url: `http://127.0.0.1:${port}`, clock, dbFile, close: () => app.close() }; envs.push(env);
  const a = new Admin(env, 'bk-pw-12345'); await a.login();
  const room = await post(env, '/api/rooms', {}); const j = await joinPlayer(env, room.body.code, 'Sicher');
  const host = new Client(env, 'host', room.body.hostKey ? room.body.code : room.body.code, room.body.hostKey); await host.connect();
  await host.act({ k: 'h.startShow' });                                                   // Spielzustand schreiben (Startguthaben)
  await a.post('/questions', geo('Backup-Frage'));
  assert.ok(existsSync(dbFile + '-wal'), 'WAL-Datei existiert (ungesicherte Daten dort)');
  const bytes = Buffer.from(await (await fetch(env.url + '/api/admin/backup', { headers: { cookie: a.cookie } })).arrayBuffer());
  assert.equal(bytes.subarray(0, 15).toString(), 'SQLite format 3');
  assert.equal((await fetch(env.url + '/api/admin/backup')).status, 401, 'Voll-Backup nur mit Admin-Anmeldung');
  assert.ok(readdirSync(bdir).some(f => f.endsWith('.db')), 'automatisches Backup wurde angelegt');
  const bk = join(dir, 'voll.db'); writeFileSync(bk, bytes);
  host.disconnect(); await env.close();
  // Wiederherstellung in ein neues Datenverzeichnis (Skript)
  const target = join(dir, 'restored');
  const r = spawnSync(process.execPath, ['scripts/restore-backup.mjs', bk, target], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout); assert.match(r.stdout, /Backup eingespielt/);
  const app2 = new App({ book: BOOK, dbFile: join(target, 'outplay.db'), clock: () => clock.now, tickMs: 50, adminPassword: 'bk-pw-12345' });
  const port2 = await app2.listen(0, '127.0.0.1'); const env2: TestEnv = { app: app2, port: port2, url: `http://127.0.0.1:${port2}`, clock, dbFile: join(target, 'outplay.db'), close: () => app2.close() }; envs.push(env2);
  const a2 = new Admin(env2, 'bk-pw-12345'); await a2.login();
  assert.equal((await a2.get('/questions?q=Backup-Frage')).data.length, 1, 'Fragen wiederhergestellt');
  const hv = new Client(env2, 'host', room.body.code, room.body.hostKey); await hv.connect();
  assert.equal(hv.view!.room.phase, 'intro'); assert.equal(hv.view!.players.length, 1); assert.equal(hv.view!.players[0].name, 'Sicher'); assert.equal(hv.view!.players[0].score, 200, 'Raum, Spieler und Punkte wiederhergestellt');
  const pc = new Client(env2, 'player', room.body.code, j.token); await pc.connect(); assert.equal(pc.view!.me!.id, j.playerId, 'Spieler-Token bleibt gültig');
  hv.disconnect(); pc.disconnect();
  // Skript verweigert, wenn die Datenbank noch in Benutzung ist
  const busy = spawnSync(process.execPath, ['scripts/restore-backup.mjs', bk, target], { encoding: 'utf8' });
  assert.notEqual(busy.status, 0); assert.match(busy.stderr, /in Benutzung/);
  // Fehlerfälle
  assert.notEqual(spawnSync(process.execPath, ['scripts/restore-backup.mjs', join(dir, 'gibtsnicht.db'), target], { encoding: 'utf8' }).status, 0);
  writeFileSync(join(dir, 'kaputt.db'), 'das ist kein sqlite'); assert.notEqual(spawnSync(process.execPath, ['scripts/restore-backup.mjs', join(dir, 'kaputt.db'), target], { encoding: 'utf8' }).status, 0);
});

test('Netzwerk: richtige LAN-Adresse bei mehreren Adaptern (WLAN, Ethernet, WSL, VirtualBox, VPN, APIPA); nie localhost', () => {
  const mkIf = (address: string, mac = 'aa:bb:cc:00:00:01', internal = false) => [{ address, netmask: '255.255.255.0', family: 'IPv4', mac, internal, cidr: null }] as any;
  const ifs = {
    'Loopback Pseudo-Interface 1': mkIf('127.0.0.1', '00:00:00:00:00:00', true),
    'vEthernet (WSL)': mkIf('172.28.16.1', '00:15:5d:01:02:03'),
    'VirtualBox Host-Only Network': mkIf('192.168.56.1', '0a:00:27:00:00:05'),
    'OpenVPN TAP-Windows Adapter': mkIf('10.8.0.6'),
    'Ethernet 2': mkIf('169.254.12.9'),
    'WLAN': mkIf('192.168.178.42'),
  };
  const c = candidates(ifs);
  assert.equal(c[0].address, '192.168.178.42'); assert.ok(c.filter(x => x.virtual).length >= 3);
  const info = netInfo(8080, undefined, ifs);
  assert.equal(info.preferred, 'http://192.168.178.42:8080'); assert.equal(info.ambiguous, false);
  assert.ok(!info.candidates.some(x => x.url.includes('169.254') || x.url.includes('localhost') || x.url.includes('127.')));
  // WLAN + Ethernet echt -> uneindeutig, WLAN bevorzugt
  const two = netInfo(8080, undefined, { 'WLAN': mkIf('192.168.1.50'), 'Ethernet': mkIf('192.168.1.60') });
  assert.equal(two.ambiguous, true); assert.equal(two.preferred, 'http://192.168.1.50:8080');
  // feste Konfiguration schlägt Heuristik
  assert.equal(netInfo(8080, '192.168.9.9', ifs).preferred, 'http://192.168.9.9:8080'); assert.equal(netInfo(8081, 'http://10.0.0.5:8081', ifs).preferred, 'http://10.0.0.5:8081');
  // kein Netzwerk -> kein localhost-Ersatz
  const none = netInfo(8080, undefined, { Loopback: mkIf('127.0.0.1', '00:00:00:00:00:00', true) }); assert.equal(none.preferred, null);
});

test('Sicherheit: Datenbank-, Backup- und Quelldateien werden nie öffentlich ausgeliefert', async () => {
  const e = await mk();
  for (const p of ['/outplay.db', '/data/outplay.db', '/../data/outplay.db', '/%2e%2e/outplay.db', '/data/backups/x.db', '/.env', '/server/index.ts', '/package.json', '/data/admin-passwort.txt', '/..%2fpackage.json']) {
    const r = await fetch(e.url + p); const buf = Buffer.from(await r.arrayBuffer());
    assert.ok(!buf.subarray(0, 15).toString().startsWith('SQLite format 3'), p);
    assert.ok(!buf.toString('utf8', 0, 400).includes('"name": "outplay"') && !buf.toString('utf8', 0, 400).includes('import '), `Quelltext/Konfiguration ausgeliefert: ${p}`);
  }
  // Raum-/Spielerdaten stecken nicht in öffentlichen Antworten
  const room = await post(e, '/api/rooms', {}); const pub = await (await fetch(`${e.url}/api/rooms/${room.body.code}`)).text();
  assert.ok(!pub.includes(room.body.hostPin) && !pub.includes(room.body.hostKey));
  const netinfo = await (await fetch(e.url + '/api/netinfo')).json() as any; assert.ok(!JSON.stringify(netinfo).includes('localhost'));
});
