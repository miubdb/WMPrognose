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
      const r = await b.put(this.pathname, bytes, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/octet-stream', cacheControlMaxAge: 60, ...(ifMatch ? { ifMatch } : {}) } as any);
      const h = await b.head(r.pathname); return h.etag;
    } catch (e) { if (e instanceof b.BlobPreconditionFailedError) throw new ConflictError('etag'); throw e; }
  }
}

interface Live { store: Store; content: ContentService; auth: AdminAuth; etag: string | null; checkedAt: number; file: string }

export class OnlineAdmin {
  private live: Live | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private dir = mkdtempSync(join(tmpdir(), 'outplay-online-'));
  constructor(private backend: BlobBackend | null, private opts: { adminPassword?: string; now?: () => number; checkEveryMs?: number } = {}) {}
  private now = () => (this.opts.now ?? Date.now)();

  status() {
    return { storage: !!this.backend, password: !!this.opts.adminPassword };
  }

  private close() { try { this.live?.store.close(); } catch { /* */ } this.live = null; }
  /** Aktuellen Stand sicherstellen (lokaler Cache, maximal alle checkEveryMs gegen den Blob prüfen). */
  private async ensure(): Promise<Live> {
    const b = this.backend!;
    const l = this.live;
    if (l && this.now() - l.checkedAt < (this.opts.checkEveryMs ?? 2500)) return l;
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
    if (content.wasSeeded) await this.persist(true);   // erste Initialisierung (Vorlagen) sofort sichern
    return this.live;
  }
  private async persist(force = false) {
    const l = this.live!;
    // konsistente Einzeldatei (journal_mode=DELETE; VACUUM INTO als zusätzliche Sicherheit)
    const snap = join(this.dir, 'snap.db'); if (existsSync(snap)) rmSync(snap);
    l.store.backupTo(snap);
    const bytes = readFileSync(snap); rmSync(snap, { force: true });
    try { l.etag = await this.backend!.put(bytes, l.etag); l.checkedAt = this.now(); }
    catch (e) { this.close(); throw e; }
    void force;
  }

  /** Eine Admin-Anfrage ausführen. Schreibende Anfragen werden VOR der Antwort dauerhaft gespeichert. */
  handle(req: IncomingMessage, res: ServerResponse, parts: string[], url: URL, readBody: (limit: number) => Promise<any>): Promise<void> {
    const run = async () => {
      const st = this.status();
      if (!st.storage || !st.password) {
        return sendJson(res, 503, { err: !st.storage ? 'Speicher nicht eingerichtet (Vercel Blob fehlt)' : 'ADMIN_PASSWORD ist nicht gesetzt', setup: !st.storage ? 'blob' : 'password', status: st });
      }
      let live: Live;
      try { live = await this.ensure(); } catch (e: any) { return sendJson(res, 503, { err: 'Speicher nicht erreichbar: ' + String(e?.message ?? e).slice(0, 200), setup: 'blob-error' }); }
      const before = live.store.db.prepare('PRAGMA data_version').get() as any;
      void before;
      const buffered = new Buffered();
      const method = req.method ?? 'GET';
      const ctx: AdminCtx = { auth: live.auth, content: live.content, roomCount: () => 0, mode: 'online', backup: () => { const f = join(this.dir, 'bk.db'); if (existsSync(f)) rmSync(f); live.store.backupTo(f); const bt = readFileSync(f); rmSync(f, { force: true }); return bt; } };
      const wrote = method !== 'GET' || parts[2] === 'login';
      await handleAdmin(ctx, req, buffered as any, parts, url, readBody);
      if (wrote && buffered.status < 500 && !(buffered.status >= 400 && parts[2] !== 'login')) {
        try { await this.persist(); }
        catch (e) {
          if (e instanceof ConflictError) return sendJson(res, 409, { err: 'Konflikt: Die Daten wurden zwischenzeitlich anderswo geändert. Bitte Seite neu laden und die Änderung wiederholen.', conflict: true });
          return sendJson(res, 503, { err: 'Speichern fehlgeschlagen – Änderung NICHT gesichert: ' + String((e as any)?.message ?? e).slice(0, 160) });
        }
      }
      buffered.flushTo(res);
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

/** TEMPORÄRE Diagnose gegen den ECHTEN Blob-Speicher (eigener Test-Pfad, berührt die Inhalte nicht). */
export async function blobDiagnostics() {
  const b = await import('@vercel/blob');
  const path = `outplay/selftest/diag-${Date.now()}.bin`;
  const out: any = { path, steps: [] as any[] };
  const step = async (name: string, fn: () => Promise<any>) => { try { out.steps.push({ name, ok: true, ...(await fn()) }); } catch (e: any) { out.steps.push({ name, ok: false, err: `${e?.constructor?.name}: ${String(e?.message ?? e).slice(0, 200)}` }); } };
  let r1: any, h1: any, g1: any, h2: any;
  await step('put#1', async () => { r1 = await b.put(path, Buffer.from('A'), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/octet-stream' } as any); return { keys: Object.keys(r1), putEtag: r1.etag ?? null }; });
  await step('head#1', async () => { h1 = await b.head(path); return { etag: h1.etag, size: h1.size }; });
  await step('get#1(useCache:false)', async () => { g1 = await b.get(path, { access: 'private', useCache: false }); return { statusCode: g1?.statusCode, blobEtag: g1?.blob?.etag, headerEtag: g1?.headers?.get('etag'), size: g1?.blob?.size }; });
  await step('put#2 ifMatch=head.etag', async () => { const r = await b.put(path, Buffer.from('B'), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/octet-stream', ifMatch: h1.etag } as any); return { putEtag: (r as any).etag ?? null }; });
  await step('head#2', async () => { h2 = await b.head(path); return { etag: h2.etag, changed: h2.etag !== h1.etag }; });
  await step('put#3 ifMatch=get.blob.etag(alt,stale)', async () => { const r = await b.put(path, Buffer.from('C'), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/octet-stream', ifMatch: g1?.blob?.etag } as any); return { note: 'sollte Konflikt sein (veralteter ETag)', putEtag: (r as any).etag ?? null }; });
  await step('head#3', async () => { const h = await b.head(path); return { etag: h.etag }; });
  await step('get#2 + put ifMatch=get.blob.etag', async () => { const g = await b.get(path, { access: 'private', useCache: false }); const r = await b.put(path, Buffer.from('D'), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/octet-stream', ifMatch: g!.blob.etag } as any); return { blobEtag: g!.blob.etag, putEtag: (r as any).etag ?? null }; });
  await step('del', async () => { await b.del(path); return {}; });
  return out;
}

export async function handleVercel(req: IncomingMessage, res: ServerResponse, online: OnlineAdmin = getOnline()) {
  res.setHeader('x-content-type-options', 'nosniff');
  const url = new URL(req.url ?? '/', 'http://x');
  const parts = url.pathname.split('/').filter(Boolean); // api, ...
  const st = online.status();
  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, mode: 'online', gameshow: false, storage: { configured: st.storage, kind: 'vercel-blob' }, admin: { passwordConfigured: st.password } });
  if (url.pathname === '/api/selftest-diag') { try { return sendJson(res, 200, await blobDiagnostics()); } catch (e: any) { return sendJson(res, 500, { err: String(e?.message ?? e) }); } }
  if (url.pathname === '/api/netinfo') return sendJson(res, 200, { online: true, preferred: null, candidates: [] });
  if (url.pathname === '/api/packs') { try { return sendJson(res, 200, await online.publicPacks()); } catch { return sendJson(res, 200, []); } }
  if (parts[1] === 'admin') {
    try { return await online.handle(req, res, parts, url, limit => readBodyOf(req, limit)); }
    catch (e) { console.error('online admin error', e); return sendJson(res, 500, { err: 'Serverfehler' }); }
  }
  if (parts[1] === 'rooms') return sendJson(res, 501, { err: 'online_nicht_verfuegbar', message: 'Die Gameshow läuft nur lokal (Laptop). Online steht der Admin-Bereich zur Verfügung: /admin' });
  return sendJson(res, 404, { err: 'not_found' });
}
