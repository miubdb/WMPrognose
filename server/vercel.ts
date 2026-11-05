// Online-Admin auf Vercel (Serverless). Es läuft derselbe Admin-Code wie lokal; die SQLite-Inhaltsdatenbank
// wird dauerhaft in einem PRIVATEN Vercel-Blob-Speicher abgelegt (optimistische Sperre per ETag/ifMatch).
// Die Gameshow selbst (WebSockets) läuft online NICHT – sie wird lokal auf dem Laptop gespielt.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleAdmin, type AdminCtx } from './admin';
import { AdminAuth } from './auth';
import { ContentService } from './content';
import { Store } from './store';
import { TILES } from '../content/tiles';
import { SCENES } from '../shared/scenes';

export interface BlobBackend {
  head(): Promise<{ etag: string } | null>;
  get(): Promise<{ bytes: Buffer; etag: string } | null>;
  /** schreibt; ifMatch=null bedeutet "Blob darf noch nicht existieren/egal beim ersten Mal". Wirft 'conflict' bei abweichendem ETag. */
  put(bytes: Buffer, ifMatch: string | null): Promise<string>;
}
export class ConflictError extends Error {}

/** Dateibasiertes Backend (Tests/lokale Simulation von Vercel). */
export class FileBlobBackend implements BlobBackend {
  constructor(private file: string) { mkdirSync(join(this.file, '..'), { recursive: true }); }
  private etag(b: Buffer) { return createHash('sha1').update(b).digest('hex'); }
  async head() { return existsSync(this.file) ? { etag: this.etag(readFileSync(this.file)) } : null; }
  async get() { if (!existsSync(this.file)) return null; const bytes = readFileSync(this.file); return { bytes, etag: this.etag(bytes) }; }
  async put(bytes: Buffer, ifMatch: string | null) {
    const cur = existsSync(this.file) ? this.etag(readFileSync(this.file)) : null;
    if (ifMatch !== null && cur !== ifMatch) throw new ConflictError('etag');
    if (ifMatch === null && cur !== null) { /* erste Initialisierung gegen bestehenden Stand: nicht überschreiben */ throw new ConflictError('exists'); }
    writeFileSync(this.file, bytes); return this.etag(bytes);
  }
}

/** Vercel-Blob-Backend (privater Speicher, Token aus BLOB_READ_WRITE_TOKEN). */
export class SdkBlobBackend implements BlobBackend {
  constructor(private pathname = 'outplay/content.db') {}
  private async sdk() { return await import('@vercel/blob'); }
  async head() {
    const b = await this.sdk();
    try { const h = await b.head(this.pathname); return { etag: h.etag }; } catch (e) { if (e instanceof b.BlobNotFoundError) return null; throw e; }
  }
  async get() {
    const b = await this.sdk();
    const r = await b.get(this.pathname, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    const bytes = Buffer.from(await new Response(r.stream as any).arrayBuffer());
    return { bytes, etag: (r.blob as any).etag as string };
  }
  async put(bytes: Buffer, ifMatch: string | null) {
    const b = await this.sdk();
    try {
      // Mit ETag: nur überschreiben, wenn der Blob noch genau diesem Stand entspricht. Ohne ETag: nur ANLEGEN (nie blind überschreiben).
      const opts: any = { access: 'private', addRandomSuffix: false, contentType: 'application/octet-stream', cacheControlMaxAge: 60, allowOverwrite: !!ifMatch, ...(ifMatch ? { ifMatch } : {}) };
      const r: any = await b.put(this.pathname, bytes, opts);
      return (r.etag as string) ?? (await b.head(this.pathname)).etag;
    } catch (e: any) {
      if (e instanceof b.BlobPreconditionFailedError || /already exists/i.test(String(e?.message))) throw new ConflictError('etag');
      throw e;
    }
  }
  async destroy() { const b = await this.sdk(); try { await b.del(this.pathname); } catch { /* */ } }
}

interface Live { store: Store; content: ContentService; auth: AdminAuth; etag: string | null; checkedAt: number; file: string }

export class OnlineAdmin {
  private live: Live | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private dir = mkdtempSync(join(tmpdir(), 'outplay-online-'));
  constructor(private backend: BlobBackend | null, private opts: { adminPassword?: string; now?: () => number } = {}) {}
  private now = () => (this.opts.now ?? Date.now)();

  status() {
    return { storage: !!this.backend, password: !!this.opts.adminPassword };
  }

  private close() { try { this.live?.store.close(); } catch { /* */ } this.live = null; }
  /** Aktuellen Stand sicherstellen (lokaler Cache, maximal alle checkEveryMs gegen den Blob prüfen). */
  private async ensure(): Promise<Live> {
    const b = this.backend!;
    const l = this.live;
    // Vercel startet mehrere Instanzen: IMMER den aktuellen ETag prüfen (1 günstige Operation), nie auf einem zwischengespeicherten Stand arbeiten.
    const head = await b.head();
    if (l && head && head.etag === l.etag) { l.checkedAt = this.now(); return l; }
    this.close();
    const file = join(this.dir, `content-${Math.random().toString(36).slice(2)}.db`);
    let etag: string | null = null;
    if (head) { const got = await b.get(); if (got) { writeFileSync(file, got.bytes); etag = got.etag; } }
    const store = new Store(file, { wal: false });
    const content = new ContentService(store, { tiles: TILES, scenes: SCENES }, this.now);
    const auth = new AdminAuth(store, this.opts.adminPassword, this.now, { passwordRequiredFromEnv: true });
    this.live = { store, content, auth, etag, checkedAt: this.now(), file };
    if (content.wasSeeded) {                               // erste Initialisierung (Vorlagen) sofort sichern; scheitert, falls eine andere Instanz schneller war
      try { await this.persist(); } catch (e) { if (e instanceof ConflictError) { this.close(); return this.ensure(); } throw e; }
    }
    return this.live;
  }
  private async persist() {
    const l = this.live!;
    // konsistente Einzeldatei (journal_mode=DELETE; VACUUM INTO als zusätzliche Sicherheit)
    const snap = join(this.dir, 'snap.db'); if (existsSync(snap)) rmSync(snap);
    l.store.backupTo(snap);
    const bytes = readFileSync(snap); rmSync(snap, { force: true });
    try { l.etag = await this.backend!.put(bytes, l.etag); l.checkedAt = this.now(); }
    catch (e) { this.close(); throw e; }
  }

  /** Eine Admin-Anfrage ausführen. Schreibende Anfragen werden VOR der Antwort dauerhaft gespeichert. */
  handle(req: IncomingMessage, res: ServerResponse, parts: string[], url: URL, readBody: (limit: number) => Promise<any>): Promise<void> {
    const run = async () => {
      const st = this.status();
      if (!st.storage || !st.password) {
        return sendJson(res, 503, { err: !st.storage ? 'Speicher nicht eingerichtet (Vercel Blob fehlt)' : 'ADMIN_PASSWORD ist nicht gesetzt', setup: !st.storage ? 'blob' : 'password', status: st });
      }
      const method = req.method ?? 'GET';
      const wrote = method !== 'GET' || parts[2] === 'login';
      const body = method === 'GET' ? {} : await readBody(8 * 1024 * 1024);          // einmal lesen, bei Wiederholung wiederverwenden
      let lastConflict = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        let live: Live;
        try { live = await this.ensure(); } catch (e: any) { return sendJson(res, 503, { err: 'Speicher nicht erreichbar: ' + String(e?.message ?? e).slice(0, 200), setup: 'blob-error' }); }
        const buffered = new Buffered();
        const ctx: AdminCtx = { auth: live.auth, content: live.content, roomCount: () => 0, mode: 'online', backup: () => { const f = join(this.dir, 'bk.db'); if (existsSync(f)) rmSync(f); live.store.backupTo(f); const bt = readFileSync(f); rmSync(f, { force: true }); return bt; } };
        await handleAdmin(ctx, req, buffered as any, parts, url, async () => body);
        const failed = buffered.status >= 400 && parts[2] !== 'login';
        if (!wrote || buffered.status >= 500 || failed) { buffered.flushTo(res); return; }
        try { await this.persist(); buffered.flushTo(res); return; }
        catch (e) {
          if (e instanceof ConflictError) { lastConflict = true; this.close(); continue; }   // ein anderer Schreibvorgang war schneller: Anfrage auf dem neuen Stand wiederholen
          return sendJson(res, 503, { err: 'Speichern fehlgeschlagen – Änderung NICHT gesichert: ' + String((e as any)?.message ?? e).slice(0, 160) });
        }
      }
      void lastConflict;
      return sendJson(res, 409, { err: 'Der Speicher wird gerade von mehreren Seiten gleichzeitig verändert. Bitte in ein paar Sekunden erneut speichern – es ging nichts verloren.', conflict: true });
    };
    const p = this.chain.then(run, run); this.chain = p.catch(() => {});
    return p as Promise<void>;
  }

  /** Öffentliche Paketliste (nur veröffentlichte Pakete, keine Lösungen). */
  async publicPacks() {
    const st = this.status(); if (!st.storage) return [];
    const run = async () => (await this.ensure()).content.listPublished();
    const p = this.chain.then(run, run); this.chain = p.catch(() => {}); return p;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

/** Fängt writeHead/end ab, damit erst NACH erfolgreichem Speichern geantwortet wird. */
class Buffered {
  status = 200; headers: Record<string, string> = {}; chunks: Buffer[] = [];
  setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v; }
  writeHead(status: number, headers: Record<string, string | string[]> = {}) { this.status = status; for (const [k, v] of Object.entries(headers)) this.headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v); return this; }
  end(chunk?: string | Buffer) { if (chunk !== undefined) this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); }
  flushTo(res: ServerResponse) { res.writeHead(this.status, this.headers); res.end(Buffer.concat(this.chunks)); }
}

// ------------------------------------------------------------------ Einstiegspunkt der Vercel-Function
let singleton: OnlineAdmin | null = null;
export function getOnline(): OnlineAdmin {
  if (!singleton) singleton = new OnlineAdmin(process.env.BLOB_READ_WRITE_TOKEN ? new SdkBlobBackend() : null, { adminPassword: process.env.ADMIN_PASSWORD || undefined });
  return singleton;
}

async function readBodyOf(req: any, limit: number): Promise<any> {
  if (req.body !== undefined && req.body !== null) { // Vercel hat den Body bereits geparst
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
    if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString('utf8')); } catch { return {}; } }
    return req.body;
  }
  const chunks: Buffer[] = []; let size = 0;
  for await (const ch of req) { size += (ch as Buffer).length; if (size > limit) throw new Error('Anfrage zu groß'); chunks.push(ch as Buffer); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

/** TEMPORÄRER Selbsttest gegen den ECHTEN Blob-Speicher (eigener Test-Pfad outplay/selftest/…, berührt die echten Inhalte nie). */
export async function blobFlowTest() {
  const { Readable } = await import('node:stream');
  const path = `outplay/selftest/flow-${Date.now()}.db`;
  const backend = new SdkBlobBackend(path);
  const PW = 'selftest-password-1';
  const mkInst = () => new OnlineAdmin(backend, { adminPassword: PW });
  const report: { name: string; ok: boolean; detail?: any }[] = [];
  const check = (name: string, ok: boolean, detail?: unknown) => report.push({ name, ok, ...(detail !== undefined ? { detail } : {}) });
  const call = async (inst: OnlineAdmin, method: string, p: string, body?: unknown, cookie = '') => {
    const u = new URL('http://x' + p); const parts = u.pathname.split('/').filter(Boolean);
    const req: any = Object.assign(Readable.from([]), { headers: { 'x-outplay-admin': '1', 'x-forwarded-proto': 'https', host: 'x', ...(cookie ? { cookie } : {}) }, method, url: p, socket: { remoteAddress: '1.2.3.4' } });
    const out: any = { status: 0, headers: {} as any, chunks: [] as Buffer[], writeHead(st: number, h: any = {}) { this.status = st; Object.assign(this.headers, Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]))); return this; }, setHeader() {}, end(c?: any) { if (c !== undefined) this.chunks.push(Buffer.from(c)); } };
    await inst.handle(req, out, parts, u, async () => body ?? {});
    const text = Buffer.concat(out.chunks).toString('utf8'); let data: any = text; try { data = JSON.parse(text); } catch { /* */ }
    return { status: out.status as number, data, cookie: String(out.headers['set-cookie'] ?? '').split(';')[0] };
  };
  const geo = (prompt: string) => ({ task: { mode: 'geo', prompt, map: 'germany', answer: { lat: 51, lon: 10, label: 'Mitte' }, seconds: 30, points: 250, explain: 'Test.' }, topic: 'Selbsttest' });
  try {
    const A = mkInst();
    const login = await call(A, 'POST', '/api/admin/login', { password: PW }); check('Login', login.status === 200, login.status); const ck = login.cookie;
    const list = await call(A, 'GET', '/api/admin/questions', undefined, ck); check('Erstinitialisierung: 34 Vorlagenfragen', list.status === 200 && list.data.length === 34, list.data?.length ?? list.data);
    const q1 = await call(A, 'POST', '/api/admin/questions', geo('Kartenfrage 1'), ck); check('Frage erstellen', q1.status === 201, q1.data?.err ?? q1.status);
    const cat = (await call(A, 'GET', '/api/admin/categories/geo-daneben', undefined, ck)).data;
    const c1 = await call(A, 'PUT', '/api/admin/categories/geo-daneben', { ...cat, ifUpdated: cat.updated }, ck); check('Kategorie ohne Änderung speichern', c1.status === 200, c1.data?.err ?? c1.status);
    const c2 = await call(A, 'PUT', '/api/admin/categories/geo-daneben', { ...c1.data, title: 'Geografisch daneben (Test)', ifUpdated: c1.data.updated }, ck); check('Kategorie ändern', c2.status === 200, c2.data?.err ?? c2.status);
    let ok = true, last = q1.data; for (let i = 0; i < 6; i++) { const r = await call(A, 'PUT', '/api/admin/questions/' + q1.data.id, { task: { ...last.task, prompt: `Kartenfrage 1 – Version ${i + 2}` }, topic: 'Selbsttest', ifUpdated: last.updated }, ck); if (r.status !== 200) { ok = false; check('mehrere Speicherungen nacheinander', false, r.data?.err); break; } last = r.data; }
    if (ok) check('6 aufeinanderfolgende Speicherungen', true);
    // "Neu laden": frische Instanz (= anderer Kaltstart) sieht alles
    const B = mkInst(); const fresh = await call(B, 'GET', '/api/admin/questions?q=Kartenfrage', undefined, ck); check('Nach Neuladen (andere Instanz) vorhanden', fresh.status === 200 && fresh.data.length === 1 && fresh.data[0].task.prompt.endsWith('Version 7'), fresh.data?.[0]?.task?.prompt ?? fresh.data);
    const titles = (await call(B, 'GET', '/api/admin/categories/geo-daneben', undefined, ck)).data.title; check('Kategorie-Änderung dauerhaft', titles === 'Geografisch daneben (Test)', titles);
    // veralteter Cache einer zweiten Instanz: Schreiben direkt nach Schreiben einer anderen Instanz
    const C = mkInst(), D = mkInst();
    await call(C, 'GET', '/api/admin/overview', undefined, ck); await call(D, 'GET', '/api/admin/overview', undefined, ck);
    const w1 = await call(C, 'POST', '/api/admin/questions', geo('Instanz C schreibt'), ck); const w2 = await call(D, 'POST', '/api/admin/questions', geo('Instanz D schreibt sofort danach'), ck);
    check('Zweite Instanz schreibt direkt danach (kein 409)', w1.status === 201 && w2.status === 201, [w1.status, w2.status, w2.data?.err]);
    // echte gleichzeitige Schreibvorgänge über mehrere Instanzen
    const insts = [mkInst(), mkInst(), mkInst()];
    const results = await Promise.all(Array.from({ length: 9 }, (_, i) => call(insts[i % 3], 'POST', '/api/admin/questions', geo(`Parallel ${i}`), ck)));
    const created = results.filter(r => r.status === 201).length; const E = mkInst();
    const par = (await call(E, 'GET', '/api/admin/questions?q=Parallel', undefined, ck)).data;
    check('9 gleichzeitige Schreibvorgänge: alle gespeichert, keiner verloren', par.length === created && created === 9, { erfolgreich: created, gespeichert: par.length, status: results.map(r => r.status) });
    // echter Konflikt am selben Datensatz
    const base = (await call(E, 'GET', '/api/admin/questions/' + q1.data.id, undefined, ck)).data;
    const x1 = await call(mkInst(), 'PUT', '/api/admin/questions/' + q1.data.id, { task: base.task, topic: 'X1', ifUpdated: base.updated }, ck);
    const x2 = await call(mkInst(), 'PUT', '/api/admin/questions/' + q1.data.id, { task: base.task, topic: 'X2', ifUpdated: base.updated }, ck);
    check('Zwei Änderungen am selben Eintrag: zweite wird als Konflikt gemeldet, nichts überschrieben', x1.status === 200 && x2.status === 409 && x2.data?.details?.recordConflict === true, [x1.status, x2.status]);
    check('Standardinhalte unverändert (34 Vorlagen vorhanden)', (await call(mkInst(), 'GET', '/api/admin/questions?topic=Torjäger', undefined, ck)).status === 200);
  } catch (e: any) { check('Unerwarteter Fehler', false, String(e?.stack ?? e).slice(0, 400)); }
  finally { await backend.destroy(); }
  return { path, passed: report.filter(r => r.ok).length, total: report.length, report };
}

export async function handleVercel(req: IncomingMessage, res: ServerResponse, online: OnlineAdmin = getOnline()) {
  res.setHeader('x-content-type-options', 'nosniff');
  const url = new URL(req.url ?? '/', 'http://x');
  const parts = url.pathname.split('/').filter(Boolean); // api, ...
  const st = online.status();
  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, mode: 'online', gameshow: false, storage: { configured: st.storage, kind: 'vercel-blob' }, admin: { passwordConfigured: st.password } });
  if (url.pathname === '/api/selftest-flow') { try { return sendJson(res, 200, await blobFlowTest()); } catch (e: any) { return sendJson(res, 500, { err: String(e?.message ?? e) }); } }
  if (url.pathname === '/api/netinfo') return sendJson(res, 200, { online: true, preferred: null, candidates: [] });
  if (url.pathname === '/api/packs') { try { return sendJson(res, 200, await online.publicPacks()); } catch { return sendJson(res, 200, []); } }
  if (parts[1] === 'admin') {
    try { return await online.handle(req, res, parts, url, limit => readBodyOf(req, limit)); }
    catch (e) { console.error('online admin error', e); return sendJson(res, 500, { err: 'Serverfehler' }); }
  }
  if (parts[1] === 'rooms') return sendJson(res, 501, { err: 'online_nicht_verfuegbar', message: 'Die Gameshow läuft nur lokal (Laptop). Online steht der Admin-Bereich zur Verfügung: /admin' });
  return sendJson(res, 404, { err: 'not_found' });
}
