// Online-Admin (Vercel-Adapter): echte HTTP-Anfragen gegen handleVercel() mit dateibasiertem Blob-Ersatz.
// Das ist eine Simulation des Blob-Speichers (nicht der echte Vercel-Dienst), aber derselbe Code wie in der Function.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { FileBlobBackend, OnlineAdmin, handleVercel, type BlobBackend } from '../server/vercel';

const servers: Server[] = [];
after(() => { servers.forEach(s => s.close()); });
const PW = 'online-test-pw-123';

async function boot(online: OnlineAdmin) {
  const srv = createServer((req, res) => { handleVercel(req, res, online).catch(e => { res.statusCode = 500; res.end(String(e)); }); });
  await new Promise<void>(r => srv.listen(0, '127.0.0.1', r)); servers.push(srv);
  const base = `http://127.0.0.1:${(srv.address() as any).port}`;
  let cookie = '';
  const call = async (method: string, path: string, body?: unknown, h: Record<string, string> = {}) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-outplay-admin': '1', 'x-forwarded-proto': 'https', ...(cookie ? { cookie } : {}), ...h }, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc && sc.startsWith('outplay_admin=') && !sc.includes('Max-Age=0')) cookie = sc.split(';')[0];
    const t = await r.text(); let d: any = t; try { d = JSON.parse(t); } catch { /* */ }
    return { status: r.status, data: d, setCookie: sc ?? '' };
  };
  return { call, setCookie: (c: string) => { cookie = c; }, getCookie: () => cookie };
}
const newBlob = () => new FileBlobBackend(join(mkdtempSync(join(tmpdir(), 'outplay-blob-')), 'content.db'));
const q = { task: { mode: 'geo', prompt: 'Wo liegt Online-Testhausen?', map: 'germany', answer: { lat: 51, lon: 10, label: 'Mitte' }, seconds: 30, points: 250, explain: 'Test.' }, topic: 'Online' };

test('Online: ohne Blob-Speicher oder ohne ADMIN_PASSWORD wird NICHT still "flüchtig" gearbeitet, sondern klar gemeldet', async () => {
  const a = await boot(new OnlineAdmin(null, { adminPassword: PW }));
  const r = await a.call('POST', '/api/admin/login', { password: PW }); assert.equal(r.status, 503); assert.equal(r.data.setup, 'blob');
  const h = await a.call('GET', '/api/health'); assert.equal(h.data.mode, 'online'); assert.equal(h.data.storage.configured, false);
  const b = await boot(new OnlineAdmin(newBlob(), {}));
  const r2 = await b.call('POST', '/api/admin/login', { password: 'x' }); assert.equal(r2.status, 503); assert.equal(r2.data.setup, 'password');
  assert.equal((await b.call('GET', '/api/health')).data.admin.passwordConfigured, false);
});

test('Online: Login, Secure-Cookie, Erstinitialisierung (75 Fragen), Schreiben, Persistenz über "Kaltstart" (neue Instanz)', async () => {
  const blob = newBlob(); const opts = { adminPassword: PW };
  const a = await boot(new OnlineAdmin(blob, opts));
  assert.equal((await a.call('POST', '/api/admin/login', { password: 'falsch' })).status, 401);
  const l = await a.call('POST', '/api/admin/login', { password: PW }); assert.equal(l.status, 200);
  assert.match(l.setCookie, /HttpOnly/); assert.match(l.setCookie, /Secure/); assert.match(l.setCookie, /SameSite=Strict/);
  assert.equal((await a.call('GET', '/api/admin/questions')).data.length, 75, 'Vorlagen wurden initial übernommen');
  const c = await a.call('POST', '/api/admin/questions', q); assert.equal(c.status, 201);
  assert.ok(existsSync((blob as any).file), 'Daten liegen im Blob-Speicher');
  // neue Instanz (Kaltstart) – gleiche Daten, gleiche Sitzung
  const b = await boot(new OnlineAdmin(blob, opts)); b.setCookie(a.getCookie());
  const list = await b.call('GET', '/api/admin/questions?q=Online-Testhausen'); assert.equal(list.status, 200); assert.equal(list.data.length, 1);
  // Bearbeiten über die zweite Instanz, erste Instanz sieht es danach
  await b.call('PUT', '/api/admin/questions/' + c.data.id, { task: { ...q.task, prompt: 'Geändert über Instanz B' } });
  assert.equal((await a.call('GET', '/api/admin/questions/' + c.data.id)).data.task.prompt, 'Geändert über Instanz B');
  // Abmelden macht die Sitzung ungültig
  await a.call('POST', '/api/admin/logout'); assert.equal((await b.call('GET', '/api/admin/overview')).status, 401);
});

test('Online: Passwort-Falschversuche werden persistent gesperrt (über Instanzen hinweg)', async () => {
  const blob = newBlob(); const opts = { adminPassword: PW };
  const a = await boot(new OnlineAdmin(blob, opts));
  let last = 0; for (let i = 0; i < 9; i++) last = (await a.call('POST', '/api/admin/login', { password: 'nein' + i })).status;
  assert.equal(last, 429);
  const b = await boot(new OnlineAdmin(blob, opts)); assert.equal((await b.call('POST', '/api/admin/login', { password: PW })).status, 429);
});

test('Online: Schreiben nach Schreiben einer anderen Instanz führt NICHT zum 409 – beide Änderungen bleiben erhalten', async () => {
  const blob = newBlob();
  const a = await boot(new OnlineAdmin(blob, { adminPassword: PW }));
  await a.call('POST', '/api/admin/login', { password: PW });
  const b = await boot(new OnlineAdmin(blob, { adminPassword: PW })); b.setCookie(a.getCookie());
  assert.equal((await b.call('GET', '/api/admin/overview')).status, 200);               // Instanz B kennt den alten Stand
  await a.call('POST', '/api/admin/questions', q);                                      // A schreibt
  const r = await b.call('POST', '/api/admin/questions', { ...q, task: { ...q.task, prompt: 'Zweite Frage' } });  // B schreibt direkt danach
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const fresh = await boot(new OnlineAdmin(blob, { adminPassword: PW })); fresh.setCookie(a.getCookie());
  assert.equal((await fresh.call('GET', '/api/admin/questions?topic=Online')).data.length, 2, 'beide Schreibvorgänge sind gespeichert');
});

test('Online: viele gleichzeitige Schreibvorgänge über mehrere Instanzen – keiner geht verloren', async () => {
  const blob = newBlob();
  const insts = await Promise.all([0, 1, 2].map(async () => boot(new OnlineAdmin(blob, { adminPassword: PW }))));
  await insts[0].call('POST', '/api/admin/login', { password: PW }); insts.forEach(i => i.setCookie(insts[0].getCookie()));
  const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => insts[i % 3].call('POST', '/api/admin/questions', { ...q, task: { ...q.task, prompt: 'Parallel ' + i } })));
  assert.ok(rs.every(r => r.status === 201), JSON.stringify(rs.map(r => r.status)));
  const fresh = await boot(new OnlineAdmin(blob, { adminPassword: PW })); fresh.setCookie(insts[0].getCookie());
  assert.equal((await fresh.call('GET', '/api/admin/questions?q=Parallel')).data.length, 12);
});

test('Online: normale Einzelbenutzer-Abfolge (Frage erstellen, Kategorie speichern ohne Änderung, mehrfach speichern, neu laden) ohne 409', async () => {
  const blob = newBlob(); const a = await boot(new OnlineAdmin(blob, { adminPassword: PW }));
  await a.call('POST', '/api/admin/login', { password: PW });
  const c = await a.call('POST', '/api/admin/questions', q); assert.equal(c.status, 201);
  const cat = (await a.call('GET', '/api/admin/categories/v2-orte-mit-geschichte')).data;
  for (let i = 0; i < 4; i++) { const r = await a.call('PUT', '/api/admin/categories/v2-orte-mit-geschichte', { ...cat, ifUpdated: (await a.call('GET', '/api/admin/categories/v2-orte-mit-geschichte')).data.updated }); assert.equal(r.status, 200, JSON.stringify(r.data)); }
  let last = c.data; for (let i = 0; i < 5; i++) { const r = await a.call('PUT', '/api/admin/questions/' + c.data.id, { task: { ...q.task, prompt: 'V' + i }, topic: 'Online', ifUpdated: last.updated }); assert.equal(r.status, 200, JSON.stringify(r.data)); last = r.data; }
  const b = await boot(new OnlineAdmin(blob, { adminPassword: PW })); b.setCookie(a.getCookie());
  assert.equal((await b.call('GET', '/api/admin/questions/' + c.data.id)).data.task.prompt, 'V4');
});

test('Online: Änderung am selben Eintrag von zwei Seiten: der zweite wird als echter Konflikt gemeldet und überschreibt nichts', async () => {
  const blob = newBlob(); const a = await boot(new OnlineAdmin(blob, { adminPassword: PW })); await a.call('POST', '/api/admin/login', { password: PW });
  const b = await boot(new OnlineAdmin(blob, { adminPassword: PW })); b.setCookie(a.getCookie());
  const c = (await a.call('POST', '/api/admin/questions', q)).data;
  const r1 = await a.call('PUT', '/api/admin/questions/' + c.id, { task: { ...q.task, prompt: 'von A' }, topic: 'Online', ifUpdated: c.updated }); assert.equal(r1.status, 200);
  const r2 = await b.call('PUT', '/api/admin/questions/' + c.id, { task: { ...q.task, prompt: 'von B' }, topic: 'Online', ifUpdated: c.updated });
  assert.equal(r2.status, 409); assert.equal(r2.data.details.recordConflict, true);
  assert.equal((await b.call('GET', '/api/admin/questions/' + c.id)).data.task.prompt, 'von A');
});

test('Online: schlägt das Speichern fehl, wird NICHT Erfolg gemeldet', async () => {
  const inner = newBlob(); let fail = false;
  const flaky: BlobBackend = { head: () => inner.head(), get: () => inner.get(), put: async (b, m) => { if (fail) throw new Error('Blob down'); return inner.put(b, m); } };
  const a = await boot(new OnlineAdmin(flaky, { adminPassword: PW }));
  await a.call('POST', '/api/admin/login', { password: PW });
  fail = true;
  const r = await a.call('POST', '/api/admin/questions', q); assert.equal(r.status, 503); assert.match(r.data.err, /NICHT gesichert/);
  fail = false;
  assert.equal((await a.call('GET', '/api/admin/questions?q=Online-Testhausen')).data.length, 0, 'nichts wurde halb gespeichert');
});

test('Online: Sicherheit – nicht angemeldet = 401, CSRF-Header Pflicht, Gameshow-API klar abgelehnt, Backup nur mit Anmeldung', async () => {
  const blob = newBlob(); const a = await boot(new OnlineAdmin(blob, { adminPassword: PW }));
  for (const [m, p] of [['GET', '/api/admin/questions'], ['POST', '/api/admin/questions'], ['GET', '/api/admin/export'], ['GET', '/api/admin/backup'], ['POST', '/api/admin/import'], ['GET', '/api/admin/packs']] as const)
    assert.equal((await a.call(m, p, m === 'GET' ? undefined : {})).status, 401, `${m} ${p}`);
  await a.call('POST', '/api/admin/login', { password: PW });
  assert.equal((await a.call('POST', '/api/admin/questions', q, { 'x-outplay-admin': '0' })).status, 403);
  assert.equal((await a.call('POST', '/api/rooms', {})).status, 501);
  assert.equal((await a.call('GET', '/api/packs')).data.map((p: any) => p.ref).sort().join(), 'show-1@1,show-2@1,show-3@1,standard-2@1');
});

test('Online: Voll-Backup (SQLite) ist eine gültige, vollständige Datenbank', async () => {
  const blob = newBlob(); const a = await boot(new OnlineAdmin(blob, { adminPassword: PW }));
  await a.call('POST', '/api/admin/login', { password: PW }); await a.call('POST', '/api/admin/questions', q);
  const srvBase = (servers[servers.length - 1].address() as any).port;
  const r = await fetch(`http://127.0.0.1:${srvBase}/api/admin/backup`, { headers: { cookie: a.getCookie() } });
  assert.equal(r.status, 200); assert.match(r.headers.get('content-disposition') ?? '', /VERTRAULICH/);
  const bytes = Buffer.from(await r.arrayBuffer()); assert.equal(bytes.subarray(0, 15).toString(), 'SQLite format 3');
  const { DatabaseSync } = await import('node:sqlite'); const f = join(mkdtempSync(join(tmpdir(), 'bk-')), 'b.db'); (await import('node:fs')).writeFileSync(f, bytes);
  const db = new DatabaseSync(f); assert.equal((db.prepare('SELECT COUNT(*) n FROM questions').get() as any).n, 76); assert.equal((db.prepare('PRAGMA integrity_check').get() as any).integrity_check, 'ok'); db.close(); rmSync(f);
});

test('Die eingecheckte Vercel-Function (api/index.js) entspricht dem aktuellen Quellcode', async () => {
  const out = join(mkdtempSync(join(tmpdir(), 'bundle-')), 'x.js');
  await build({ entryPoints: ['api-src/handler.ts'], outfile: out, bundle: true, platform: 'node', format: 'esm', target: 'node22', external: ['node:*'], sourcemap: false, legalComments: 'none', logLevel: 'silent',
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" } });
  assert.equal(readFileSync(out, 'utf8'), readFileSync('api/index.js', 'utf8'), 'Bitte "npm run bundle:api" ausführen und api/index.js einchecken');
});
