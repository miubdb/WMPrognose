// Online-Admin auf Vercel (Serverless). Es läuft derselbe Admin-Code wie lokal; die SQLite-Inhaltsdatenbank
// wird dauerhaft in einem PRIVATEN Vercel-Blob-Speicher abgelegt (optimistische Sperre per ETag/ifMatch).
// Die Gameshow selbst (WebSockets) läuft online NICHT – sie wird lokal auf dem Laptop gespielt.
import { RemoteTiles, handleMapTiles } from './maptiles';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleAdmin, type AdminCtx } from './admin';
import { AdminAuth } from './auth';
import { ContentService } from './content';
import { Store } from './store';
import { TILES, SEED_PACK } from '../content/tiles';
import { SEED_SHOW } from '../content';
import { SCENES } from '../shared/scenes';

export interface BlobBackend {
  head(): Promise<{ etag: string } | null>;
  get(): Promise<{ bytes: Buffer; etag: string } | null>;
  /** schreibt; ifMatch=null bedeutet "Blob darf noch nicht existieren/egal beim ersten Mal". Wirft 'conflict' bei abweichendem ETag. */
  put(bytes: Buffer, ifMatch: string | null): Promise<string>;
  /** optional: zusätzliche, unveränderte Sicherungskopie unter eigenem Namen (vor riskanten Änderungen) */
  snapshot?(bytes: Buffer, label: string): Promise<string>;
}
export class ConflictError extends Error {}

/** Dateibasiertes Backend (Tests/lokale Simulation von Vercel). */
export class FileBlobBackend implements BlobBackend {
  constructor(private file: string) { mkdirSync(join(this.file, '..'), { recursive: true }); }
  private etag(b: Buffer) { return createHash('sha1').update(b).digest('hex'); }
  async head() { return existsSync(this.file) ? { etag: this.etag(readFileSync(this.file)) } : null; }
  async get() { if (!existsSync(this.file)) return null; const bytes = readFileSync(this.file); return { bytes, etag: this.etag(bytes) }; }
  async snapshot(bytes: Buffer, label: string) { const f = join(this.file, '..', `snapshot-${label}.db`); writeFileSync(f, bytes); return f; }
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
  /**
   * WICHTIG (Ursache des früheren Dauer-409): get() liefert über das CDN bei größeren Dateien einen SCHWACHEN ETag (W/"…"),
   * den ifMatch niemals akzeptiert. Der ETag kommt deshalb ausschließlich aus head() (stark) – gemessen vor UND nach dem Download,
   * damit Inhalt und ETag zusammengehören.
   */
  async get() {
    const b = await this.sdk();
    for (let attempt = 0; attempt < 4; attempt++) {
      const before = await this.head(); if (!before) return null;
      const r = await b.get(this.pathname, { access: 'private', useCache: false });
      if (!r || r.statusCode !== 200) return null;
      const bytes = Buffer.from(await new Response(r.stream as any).arrayBuffer());
      const after = await this.head();
      if (after && after.etag === before.etag) return { bytes, etag: after.etag };
    }
    throw new Error('Blob ändert sich während des Ladens – bitte erneut versuchen');
  }
  async put(bytes: Buffer, ifMatch: string | null) {
    const b = await this.sdk();
    try {
      // Mit ETag: nur überschreiben, wenn der Blob noch genau diesem Stand entspricht. Ohne ETag: nur ANLEGEN (nie blind überschreiben).
      const opts: any = { access: 'private', addRandomSuffix: false, contentType: 'application/octet-stream', cacheControlMaxAge: 60, allowOverwrite: !!ifMatch, ...(ifMatch ? { ifMatch } : {}) };
      const r: any = await b.put(this.pathname, bytes, opts);
      return (r.etag as string) ?? (await b.head(this.pathname)).etag;
    } catch (e: any) {
      if (e instanceof b.BlobPreconditionFailedError || /already exists/i.test(String(e?.message))) { const c: any = new ConflictError('etag'); c.detail = `${e?.constructor?.name}: ${String(e?.message).slice(0, 120)} | ifMatch=${ifMatch}`; throw c; }
      throw e;
    }
  }
  async snapshot(bytes: Buffer, label: string) {
    const b = await this.sdk(); const name = `outplay/backups/${label}.db`;
    await b.put(name, bytes, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/octet-stream' } as any);
    return name;
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
    const content = new ContentService(store, { tiles: TILES, scenes: SCENES, pack: SEED_PACK, show: SEED_SHOW }, this.now);
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
        if (method === 'POST' && parts[2] === 'standard' && this.backend!.snapshot) {   // vor dem Installieren des Standardpakets: unveränderte Kopie des gesamten Bestands
          try { const f = join(this.dir, 'pre.db'); if (existsSync(f)) rmSync(f); live.store.backupTo(f); const bytes = readFileSync(f); rmSync(f, { force: true }); await this.backend!.snapshot(bytes, 'vor-standardpaket-' + new Date(this.now()).toISOString().replace(/[:.]/g, '-')); }
          catch (e: any) { return sendJson(res, 503, { err: 'Sicherung vor der Installation fehlgeschlagen – nichts wurde verändert: ' + String(e?.message ?? e).slice(0, 160) }); }
        }
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

let _rt: RemoteTiles | null = null;
const remoteTiles = () => (_rt ??= new RemoteTiles(process.env.MAP_PMTILES_URL ?? 'https://build.protomaps.com/20261104.pmtiles'));

export async function handleVercel(req: IncomingMessage, res: ServerResponse, online: OnlineAdmin = getOnline()) {
  res.setHeader('x-content-type-options', 'nosniff');
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname.startsWith('/api/maptiles/')) { await handleMapTiles(remoteTiles(), req, res, url.pathname); return; }
  const parts = url.pathname.split('/').filter(Boolean); // api, ...
  const st = online.status();
  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, mode: 'online', gameshow: false, storage: { configured: st.storage, kind: 'vercel-blob' }, admin: { passwordConfigured: st.password } });
  if (url.pathname === '/api/netinfo') return sendJson(res, 200, { online: true, preferred: null, candidates: [] });
  if (url.pathname === '/api/packs') { try { return sendJson(res, 200, await online.publicPacks()); } catch { return sendJson(res, 200, []); } }
  if (parts[1] === 'admin') {
    try { return await online.handle(req, res, parts, url, limit => readBodyOf(req, limit)); }
    catch (e) { console.error('online admin error', e); return sendJson(res, 500, { err: 'Serverfehler' }); }
  }
  if (parts[1] === 'rooms') return sendJson(res, 501, { err: 'online_nicht_verfuegbar', message: 'Die Gameshow läuft nur lokal (Laptop). Online steht der Admin-Bereich zur Verfügung: /admin' });
  return sendJson(res, 404, { err: 'not_found' });
}
