// HTTP-API + WebSocket-Hub. Autoritativer Zustand liegt hier und in SQLite.
import { createServer as createHttp, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import type { Action, ClientMsg, ServerMsg } from '../shared/types';
import { Engine, type Actor, type Book } from './engine';
import type { Room } from './model';
import { Store } from './store';
import { ContentService, ApiError } from './content';
import { AdminAuth } from './auth';
import { handleAdmin, type AdminCtx } from './admin';
import { mkdtempSync, readFileSync as rf, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin } from 'node:path';
import { SCENES } from '../shared/scenes';
import { netInfo } from './net';
import { LocalTiles, handleMapTiles } from './maptiles';

interface Conn {
  ws: WebSocket;
  room: Room;
  role: 'tv' | 'host' | 'player';
  pid?: string;
  tokenHash?: string;
  hostHash?: string;
  alive: number;
}

export interface AppOptions {
  book: Book;
  dbFile: string;
  staticDir?: string;
  /** optional: Passwort zum Erstellen von Räumen (Host-Zugang) */
  /** feste Adresse für QR-Codes (z. B. http://192.168.0.23:8080) */
  publicHost?: string;
  hostPassword?: string;
  /** optional: Admin-Passwort (sonst wird beim ersten Start eines erzeugt) */
  adminPassword?: string;
  clock?: () => number;
  tickMs?: number;
  /** Verzeichnis für automatische Sicherungen (leer = aus) */
  backupDir?: string;
  backupEveryMin?: number;
  /** MBTiles-Datei der Offline-Karte (Standard: <Datenordner>/maps/outplay-karte.mbtiles) */
  mapFile?: string;
  seedPack?: { id: string; name: string; description: string };
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.pbf': 'application/x-protobuf', '.txt': 'text/plain; charset=utf-8',
};

export class App {
  engine: Engine;
  store: Store;
  content: ContentService;
  auth: AdminAuth;
  tiles: LocalTiles;
  rooms = new Map<string, Room>();
  conns = new Set<Conn>();
  http: Server;
  wss: WebSocketServer;
  clock: () => number;
  private timers: NodeJS.Timeout[] = [];
  private closing = false;
  lastBackup: { at: number; file: string } | null = null;
  adminCtx!: AdminCtx;
  private backupBuffer(): Buffer {
    const dir = mkdtempSync(pjoin(tmpdir(), 'outplay-bk-'));
    try { const f = pjoin(dir, 'backup.db'); this.store.backupTo(f); return rf(f); } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  /** Automatische Sicherung nach <backupDir> (konsistent per VACUUM INTO), die letzten 30 bleiben erhalten. */
  autoBackup(dir: string, keep = 30): string {
    const stamp = new Date(this.clock()).toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const f = pjoin(dir, `outplay-${stamp}.db`);
    this.store.backupTo(f);
    const files = readdirSync(dir).filter(x => /^outplay-.*\.db$/.test(x)).sort();
    for (const old of files.slice(0, Math.max(0, files.length - keep))) rmSync(pjoin(dir, old), { force: true });
    this.lastBackup = { at: this.clock(), file: f };
    return f;
  }

  constructor(public opts: AppOptions) {
    this.tiles = new LocalTiles(opts.mapFile ?? join(dirname(opts.dbFile), 'maps', 'outplay-karte.mbtiles'));
    this.clock = opts.clock ?? Date.now;
    this.store = new Store(opts.dbFile);
    this.content = new ContentService(this.store, { tiles: opts.book.tiles, scenes: SCENES, pack: opts.seedPack }, this.clock);
    this.auth = new AdminAuth(this.store, opts.adminPassword, this.clock);
    this.adminCtx = { auth: this.auth, content: this.content, roomCount: () => this.rooms.size, mode: 'local', backup: () => this.backupBuffer() };
    this.engine = new Engine((id: string) => this.content.resolveBook(id));
    for (const r of this.store.loadAll()) this.rooms.set(r.code, r);
    this.store.deleteOlderThan(this.clock() - 14 * 24 * 3600 * 1000);
    this.http = createHttp((req, res) => { this.handleHttp(req, res).catch(e => { if (e instanceof ApiError) return this.json(res, e.status, { err: e.message }); console.error(e); this.json(res, 500, { err: 'server_error' }); }); });
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
    this.http.on('upgrade', (req, socket, head) => {
      if (!req.url?.startsWith('/ws')) { socket.destroy(); return; }
      this.wss.handleUpgrade(req, socket, head, ws => this.onSocket(ws));
    });
    // Fristen-Ticker + Heartbeat
    this.timers.push(setInterval(() => this.tick(), opts.tickMs ?? 250));
    this.timers.push(setInterval(() => this.heartbeat(), 5000));
    if (opts.backupDir) {
      const dir = opts.backupDir;
      const tryBackup = () => { try { this.autoBackup(dir); } catch (e) { console.error('Auto-Backup fehlgeschlagen:', e); } };
      tryBackup();
      const t = setInterval(tryBackup, (opts.backupEveryMin ?? 10) * 60000); t.unref?.(); this.timers.push(t);
    }
  }

  listen(port: number, host = '0.0.0.0'): Promise<number> {
    return new Promise(res => this.http.listen(port, host, () => res((this.http.address() as any).port)));
  }
  async close() {
    this.closing = true;
    this.timers.forEach(clearInterval);
    for (const c of this.conns) c.ws.terminate();
    this.wss.close();
    await new Promise<void>(r => this.http.close(() => r()));
    this.http.closeAllConnections?.();
    this.store.close();
  }

  // ----------------------------------------------------------- Persistenz & Broadcast
  persist(room: Room) { if (!this.closing) this.store.save(room, this.clock()); }
  send(c: Conn, msg: ServerMsg) { if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg)); }
  sendState(c: Conn) {
    const now = this.clock();
    this.send(c, { t: 'state', view: this.engine.buildView(c.room, { role: c.role, pid: c.pid }, now) });
  }
  broadcast(room: Room) {
    for (const c of this.conns) if (c.room === room) this.sendState(c);
  }
  commit(room: Room) { this.persist(room); this.broadcast(room); }

  private syncLive() {
    this.engine.liveSet.clear();
    for (const c of this.conns) if (c.role === 'player' && c.pid && c.ws.readyState === WebSocket.OPEN) this.engine.liveSet.add(c.room.code + ':' + c.pid);
  }

  tick() {
    const now = this.clock();
    for (const room of this.rooms.values()) {
      if (this.engine.tick(room, now)) this.commit(room);
    }
  }
  heartbeat() {
    const now = this.clock();
    let changed = new Set<Room>();
    for (const c of [...this.conns]) {
      if (now - c.alive > 25000) { c.ws.terminate(); this.drop(c, changed); continue; }
      this.send(c, { t: 'ping' });
    }
    for (const r of changed) this.commit(r);
  }
  private drop(c: Conn, changed?: Set<Room>) {
    if (!this.conns.delete(c)) return;
    if (c.role === 'player' && c.pid) {
      const p = c.room.players.find(x => x.id === c.pid);
      if (p) p.lastSeen = this.clock();
      this.syncLive();
      if (changed) changed.add(c.room); else { this.engine.bump(c.room); this.commit(c.room); }
    }
  }

  // ----------------------------------------------------------- WebSocket
  private onSocket(ws: WebSocket) {
    let conn: Conn | null = null;
    const helloTimer = setTimeout(() => { if (!conn) ws.close(4000, 'hello_timeout'); }, 8000);
    ws.on('message', raw => {
      let msg: ClientMsg;
      try { msg = JSON.parse(String(raw)); } catch { return; }
      if (conn) conn.alive = this.clock();
      if (msg.t === 'pong') return;
      if (msg.t === 'hello') {
        const room = this.rooms.get(String(msg.room ?? '').toUpperCase());
        if (!room) { ws.send(JSON.stringify({ t: 'error', err: 'unknown_room' })); ws.close(4004, 'unknown_room'); return; }
        let c: Conn | null = null;
        if (msg.role === 'tv') c = { ws, room, role: 'tv', alive: this.clock() };
        else if (msg.role === 'host') {
          if (!this.engine.checkHost(room, msg.key)) { ws.send(JSON.stringify({ t: 'error', err: 'bad_host_key' })); ws.close(4001, 'bad_host_key'); return; }
          c = { ws, room, role: 'host', alive: this.clock() };
        } else if (msg.role === 'player') {
          const p = this.engine.playerByToken(room, msg.key);
          if (!p) { ws.send(JSON.stringify({ t: 'error', err: 'bad_token' })); ws.close(4001, 'bad_token'); return; }
          c = { ws, room, role: 'player', pid: p.id, tokenHash: p.tokenHash, alive: this.clock() };
          p.lastSeen = this.clock();
        }
        if (!c) return;
        clearTimeout(helloTimer);
        conn = c;
        this.conns.add(c);
        this.send(c, { t: 'hello_ok', role: c.role, now: this.clock() });
        if (c.role === 'player') { this.syncLive(); this.engine.bump(room); this.commit(room); } // Host sieht "verbunden"
        else this.sendState(c);
        return;
      }
      if (!conn) return;
      if (msg.t === 'act') this.handleAct(conn, msg.reqId, msg.a);
    });
    ws.on('close', () => { clearTimeout(helloTimer); if (conn && !this.closing) this.drop(conn); });
    ws.on('error', () => { /* close folgt */ });
  }

  private handleAct(c: Conn, reqId: string, a: Action) {
    const room = c.room;
    const now = this.clock();
    // Token-/Schlüsselprüfung bei jeder Aktion (Rotation macht alte Geräte ungültig)
    if (c.role === 'player') {
      const p = room.players.find(x => x.id === c.pid && !x.removed);
      if (!p || p.tokenHash !== c.tokenHash) { this.send(c, { t: 'ack', reqId, ok: false, err: 'session_replaced' }); this.send(c, { t: 'kicked', reason: 'replaced' }); return; }
    }
    const actor: Actor = { role: c.role, pid: c.pid };
    let res;
    try { res = this.engine.act(room, actor, String(reqId ?? ''), a, now); }
    catch (e) { console.error('act failed', e); res = { ok: false as const, err: 'server_error' }; }
    // Persistieren VOR der Bestätigung
    this.persist(room);
    try { if (!this.closing) this.store.event(room.code, now, c.role + (c.pid ? ':' + c.pid : ''), reqId, a, res); } catch { /* Audit ist nachrangig */ }
    this.send(c, { t: 'ack', reqId, ok: res.ok, err: res.ok ? undefined : res.err, dup: res.ok ? res.dup : undefined, info: res.ok ? res.info : undefined });
    if (res.ok) this.broadcast(room);
  }

  // ----------------------------------------------------------- HTTP
  private json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  }
  private async body(req: IncomingMessage, limit = 32 * 1024): Promise<any> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const ch of req) { size += (ch as Buffer).length; if (size > limit) throw new ApiError(413, 'Anfrage zu groß'); chunks.push(ch as Buffer); }
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
  }
  private async handleHttp(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('x-content-type-options', 'nosniff');
    const url = new URL(req.url ?? '/', 'http://x');
    const path = url.pathname;
    if (path.startsWith('/api/')) return this.handleApi(req, res, path, url);
    return this.serveStatic(res, path);
  }
  private async handleApi(req: IncomingMessage, res: ServerResponse, path: string, _url: URL) {
    const now = this.clock();
    const parts = path.split('/').filter(Boolean); // api, rooms, CODE, action
    if (path.startsWith('/api/maptiles/')) { await handleMapTiles(this.tiles, req, res, path); return; }
    if (path === '/api/health') return this.json(res, 200, { ok: true, mode: 'local', rooms: this.rooms.size, now, backup: this.lastBackup ? { at: this.lastBackup.at } : null });
    if (parts[1] === 'admin') return handleAdmin(this.adminCtx, req, res, parts, _url, limit => this.body(req, limit));
    if (path === '/api/netinfo') return this.json(res, 200, netInfo((this.http.address() as any)?.port ?? 8080, this.opts.publicHost));
    if (path === '/api/packs' && req.method === 'GET') return this.json(res, 200, this.content.listPublished());
    if (parts[1] !== 'rooms') return this.json(res, 404, { err: 'not_found' });
    if (req.method === 'POST' && parts.length === 2) {
      const b = await this.body(req);
      if (this.opts.hostPassword && b.password !== this.opts.hostPassword) return this.json(res, 403, { err: 'bad_password' });
      const published = this.content.listPublished();
      const pick = b.pack ? published.find(p => p.id === b.pack || p.ref === b.pack) : published.find(p => p.ref === this.content.defaultRef());
      if (!pick) return this.json(res, 400, { err: 'unknown_pack' });
      const code = Engine.newCode(c => this.rooms.has(c));
      const { room, hostKey } = this.engine.newRoom(code, now, pick.ref);
      this.rooms.set(code, room);
      this.persist(room);
      return this.json(res, 200, { code, hostKey, hostPin: room.hostPin, pack: pick.name, version: pick.version });
    }
    const code = String(parts[2] ?? '').toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return this.json(res, 404, { err: 'unknown_room' });
    const act = parts[3];
    if (req.method === 'GET' && !act) {
      return this.json(res, 200, { code, phase: room.phase, joinOpen: room.joinOpen, players: this.engine.active(room).length, seats: this.engine.releasedSeats(room) });
    }
    if (req.method !== 'POST') return this.json(res, 405, { err: 'method' });
    const b = await this.body(req);
    switch (act) {
      case 'join': {
        const r = this.engine.join(room, b.name, b.avatar, now);
        if (!r.ok) return this.json(res, 400, { err: r.err });
        this.commit(room);
        return this.json(res, 200, { playerId: r.player.id, token: r.token, recovery: r.player.recovery });
      }
      case 'recover': {
        const r = this.engine.recover(room, b.code, now);
        if (!r.ok) return this.json(res, 400, { err: r.err });
        this.kickStale(room);
        this.commit(room);
        return this.json(res, 200, { playerId: r.player.id, token: r.token, recovery: r.player.recovery });
      }
      case 'claim': {
        const r = this.engine.claim(room, String(b.playerId ?? ''), now);
        if (!r.ok) return this.json(res, 400, { err: r.err });
        this.kickStale(room);
        this.commit(room);
        return this.json(res, 200, { playerId: r.player.id, token: r.token, recovery: r.player.recovery });
      }
      case 'host-login': {
        if (!this.engine.hostLoginPin(room, b.pin)) return this.json(res, 403, { err: 'bad_pin' });
        const key = this.engine.rotateHostKey(room);
        for (const c of [...this.conns]) if (c.room === room && c.role === 'host') { this.send(c, { t: 'kicked', reason: 'host_elsewhere' }); c.ws.close(4001, 'replaced'); }
        this.persist(room);
        return this.json(res, 200, { hostKey: key });
      }
    }
    return this.json(res, 404, { err: 'not_found' });
  }
  private kickStale(room: Room) {
    for (const c of [...this.conns]) {
      if (c.room !== room || c.role !== 'player') continue;
      const p = room.players.find(x => x.id === c.pid);
      if (!p || p.tokenHash !== c.tokenHash) { this.send(c, { t: 'kicked', reason: 'replaced' }); c.ws.close(4002, 'replaced'); this.conns.delete(c); }
    }
    this.syncLive();
  }

  private serveStatic(res: ServerResponse, path: string) {
    const root = resolve(this.opts.staticDir ?? 'dist');
    let rel = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html'); // SPA-Fallback
    if (!existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('OUTPLAY: Frontend nicht gebaut. Bitte "npm run build" ausführen.'); return; }
    const ext = extname(file);
    const immutable = file.includes('/assets/');
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(readFileSync(file));
  }
}
