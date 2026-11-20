// Release für Freunde: frische Installation (genau zwei Standardpakete), Update bestehender Installationen, Admin-Passwort-Einrichtung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { request } from 'node:http';
import { App } from '../server/app';
import { ContentService } from '../server/content';
import { AdminAuth } from '../server/auth';
import { Store } from '../server/store';
import { SCENES } from '../shared/scenes';
import { STANDARD_SHOWS, STANDARD_MAIN, STANDARD_SECOND, TILES, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';

const tmp = () => join(mkdtempSync(join(tmpdir(), 'outplay-rel-')), 'x.db');
const standard = (file: string) => new ContentService(new Store(file), { tiles: [], scenes: SCENES, extraShows: STANDARD_SHOWS, standard: { main: STANDARD_MAIN, second: STANDARD_SECOND } });
const legacy = (file: string) => new ContentService(new Store(file), { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW, extraShows: EXTRA_SHOWS });

test('Frische Installation: genau zwei Standardpakete, direkt veröffentlicht, ohne Alt-/Testpakete', () => {
  const c = standard(tmp());
  const packs = c.listPacksView();
  assert.deepEqual(packs.map(p => p.id).sort(), ['show-4z', 'show-after']);
  assert.ok(packs.every(p => p.status === 'published' && p.currentVersion === 1));
  assert.equal(c.getPack('show-4z').name, 'Kickbase-Abend bei MJ – Hauptversion');
  assert.equal(c.getPack('show-after').name, 'Kickbase-Abend bei MJ – Zweite Version');
  assert.deepEqual(c.listPublished().map(p => p.id).sort(), ['show-4z', 'show-after']);
  assert.equal(c.defaultRef(), 'show-4z@1');
  for (const p of packs) { const b = c.buildBook(p.id); assert.deepEqual(b.errors, [], p.id); }
  assert.equal(c.curation()?.main, 'show-4z'); assert.equal(c.curation()?.second, 'show-after');
  assert.equal(c.cleanupPlan().clean, true, 'Update-Prüfung meldet nichts zu tun');
  assert.equal(c.listQuestions().every(q => q.problems.length === 0), true, 'alle ausgelieferten Fragen sind technisch gültig');
  assert.ok(c.listCategories().length <= 16, 'nur Runden der beiden Pakete');
});

test('Wiederholtes Starten/Aktualisieren erzeugt nichts Neues und reaktiviert nichts', () => {
  const file = tmp(); const c = standard(file);
  c.setPackStatus('show-after', 'archived'); const n = c.listQuestions().length;
  const c2 = standard(file); c2.installSeed(); c2.cleanupApply();
  assert.equal(c2.listQuestions().length, n); assert.equal(c2.listPacksView().length, 2);
  assert.equal(c2.listPacksView().find(p => p.id === 'show-after')!.status, 'archived', 'archiviertes Paket bleibt archiviert');
});

test('Eigene Pakete und Fragen überstehen ein Update', () => {
  const file = tmp(); const c = standard(file);
  const q = c.createQuestion({ mode: 'vote', topic: 'Eigene', task: { mode: 'vote', prompt: 'Wer ist am pünktlichsten?', points: 100 } as any } as any);
  const pk = c.createPack({ name: 'Mein Abend', description: '', categoryIds: [], surprise: '', final: '' } as any);
  const c2 = standard(file); c2.cleanupApply();
  assert.ok(c2.listQuestions().some(x => x.id === (q as any).id)); assert.ok(c2.listPacksView().some(x => x.id === (pk as any).id));
});

test('Bestehende (alte) Installation: Update ändert Kuratierung, Archiv, Versionen und Namen nicht', () => {
  const file = tmp(); const old = legacy(file);
  old.curationApply({}, 'show-after');
  const snap = () => JSON.stringify(old.listPacksView().map(p => [p.id, p.status, p.currentVersion, p.name]));
  const before = snap(); const n = old.listQuestions().length;
  const upd = standard(file); upd.installSeed(); upd.cleanupApply();   // neuer Auslieferungsstand auf alter Datenbank
  assert.equal(JSON.stringify(upd.listPacksView().map(p => [p.id, p.status, p.currentVersion, p.name])), before);
  assert.equal(upd.listQuestions().length, n); assert.equal(upd.curation()!.second, 'show-after');
  assert.deepEqual(upd.listPublished().map(p => p.id).sort(), ['show-4z', 'show-after']);
});

test('Admin-Passwort: kein Standardpasswort, Einrichtung mit mindestens 12 Zeichen, nur einmal, Hash statt Klartext', () => {
  const file = tmp(); const store = new Store(file); let now = 1_800_000_000_000; const a = new AdminAuth(store, undefined, () => now);
  assert.equal(a.setupNeeded, true); assert.equal(a.configured, false);
  assert.equal(a.verify('admin123'), false); assert.equal(a.login('', 'x'), null);
  assert.throws(() => a.setup('kurz'), /mindestens 12/);
  assert.equal(a.setupNeeded, true, 'zu kurzes Passwort ändert nichts');
  const tok = a.setup('Mein sicheres Passwort!'); assert.ok(a.check(tok));
  assert.equal(a.setupNeeded, false); assert.throws(() => a.setup('Ein anderes Passwort 123'), /bereits abgeschlossen/);
  const stored = (store.db.prepare("SELECT value FROM settings WHERE key='admin_hash'").get() as any).value; assert.ok(!stored.includes('sicheres')); assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{64}$/);
  const again = new AdminAuth(new Store(file), undefined, () => now);   // „Update“: Zugang bleibt
  assert.equal(again.setupNeeded, false); assert.equal(again.verify('Mein sicheres Passwort!'), true); assert.equal(again.verify('falsch'), false);
  void now;
});

const http = (port: number, path: string, method: string, body?: unknown, headers: Record<string, string> = {}) => new Promise<{ status: number; json: any; cookie: string }>((res, rej) => {
  const r = request({ host: '127.0.0.1', port, path, method, headers: { 'content-type': 'application/json', ...headers } }, resp => { let s = ''; resp.on('data', d => (s += d)); resp.on('end', () => res({ status: resp.statusCode ?? 0, json: s ? JSON.parse(s) : {}, cookie: String(resp.headers['set-cookie'] ?? '') as string })); });
  r.on('error', rej); if (body) r.write(JSON.stringify(body)); r.end();
});

test('Einrichtung über HTTP: nur lokal (Host localhost), vorher kein Admin-Zugriff, danach Anmeldung nötig', async () => {
  const app = new App({ book: { tiles: [] }, extraShows: STANDARD_SHOWS, standard: { main: STANDARD_MAIN, second: STANDARD_SECOND }, dbFile: tmp(), tickMs: 50 });
  const port = await app.listen(0);
  try {
    const me = await http(port, '/api/admin/me', 'GET', undefined, { host: `localhost:${port}` }); assert.equal(me.status, 401); assert.equal(me.json.setup, true); assert.equal(me.json.local, true);
    const lan = await http(port, '/api/admin/setup', 'POST', { password: 'Ein langes Passwort 1', confirm: 'Ein langes Passwort 1' }, { host: '192.168.0.23:8080' });
    assert.equal(lan.status, 403, 'Einrichtung aus dem WLAN/mit fremdem Host wird abgelehnt');
    const proxy = await http(port, '/api/admin/setup', 'POST', { password: 'Ein langes Passwort 1', confirm: 'Ein langes Passwort 1' }, { host: `localhost:${port}`, 'x-forwarded-for': '8.8.8.8' }); assert.equal(proxy.status, 403);
    assert.equal((await http(port, '/api/admin/packs', 'GET', undefined, { host: `localhost:${port}` })).status, 401, 'vor der Einrichtung kein Admin-Zugriff');
    const bad = await http(port, '/api/admin/setup', 'POST', { password: 'Ein langes Passwort 1', confirm: 'anders' }, { host: `localhost:${port}` }); assert.equal(bad.status, 400);
    const short = await http(port, '/api/admin/setup', 'POST', { password: 'kurz', confirm: 'kurz' }, { host: `localhost:${port}` }); assert.equal(short.status, 400);
    const ok = await http(port, '/api/admin/setup', 'POST', { password: 'Ein langes Passwort 1', confirm: 'Ein langes Passwort 1' }, { host: `localhost:${port}` }); assert.equal(ok.status, 200); assert.match(ok.cookie, /outplay_admin=/);
    const cookie = ok.cookie.split(';')[0];
    assert.equal((await http(port, '/api/admin/packs', 'GET', undefined, { host: `localhost:${port}`, cookie })).json.length, 2);
    assert.equal((await http(port, '/api/admin/setup', 'POST', { password: 'Noch ein langes Passwort', confirm: 'Noch ein langes Passwort' }, { host: `localhost:${port}` })).status, 409, 'zweite Einrichtung nicht möglich');
    assert.equal((await http(port, '/api/admin/login', 'POST', { password: 'Ein langes Passwort 1' }, { host: `localhost:${port}` })).status, 200);
    assert.equal((await http(port, '/api/admin/login', 'POST', { password: 'admin123' }, { host: `localhost:${port}` })).status, 401);
  } finally { await app.close(); }
});
