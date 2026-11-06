import { WebSocket } from 'ws';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App } from '../server/app';
import { BOOK, SEED_PACK, SEED_SHOW, EXTRA_SHOWS } from '../content';
import type { Action, Avatar, ServerMsg, View } from '../shared/types';

export const AV: Avatar = { face: 0, skin: 0, hair: 0, hairColor: 0, hat: 0, shirt: 0, shirtColor: 0, acc: 0, bg: 0 };

export interface TestEnv { app: App; port: number; url: string; clock: { now: number }; dbFile: string; close(): Promise<void> }

export async function startEnv(opts: { dbFile?: string; book?: any; adminPassword?: string } = {}): Promise<TestEnv> {
  const dbFile = opts.dbFile ?? join(mkdtempSync(join(tmpdir(), 'outplay-')), 'test.db');
  const clock = { now: 1_800_000_000_000 };
  const app = new App({ book: opts.book ?? BOOK, seedPack: SEED_PACK, seedShow: SEED_SHOW, extraShows: EXTRA_SHOWS, dbFile, clock: () => clock.now, tickMs: 40, adminPassword: opts.adminPassword });
  const port = await app.listen(0, '127.0.0.1');
  return { app, port, url: `http://127.0.0.1:${port}`, clock, dbFile, close: () => app.close() };
}

export async function post(env: TestEnv, path: string, body: any = {}) {
  const r = await fetch(env.url + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() as any };
}

export class Client {
  ws!: WebSocket;
  view: View | null = null;
  acks = new Map<string, any>();
  waiters: (() => void)[] = [];
  kicked: string | null = null;
  closed = false;
  n = 0;
  constructor(public env: TestEnv, public role: 'tv' | 'host' | 'player', public room: string, public key?: string, public name: string = role) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.closed = false;
      this.ws = new WebSocket(`ws://127.0.0.1:${this.env.port}/ws`);
      this.ws.on('open', () => this.ws.send(JSON.stringify({ t: 'hello', role: this.role, room: this.room, key: this.key })));
      this.ws.on('message', raw => {
        const m = JSON.parse(String(raw)) as ServerMsg;
        if (m.t === 'state') { this.view = m.view; this.wake(); if (!this.ready) { this.ready = true; resolve(); } }
        else if (m.t === 'ack') { this.acks.set(m.reqId, m); this.wake(); }
        else if (m.t === 'kicked') { this.kicked = m.reason; this.wake(); }
        else if (m.t === 'ping') this.ws.send(JSON.stringify({ t: 'pong' }));
        else if (m.t === 'error') reject(new Error(m.err));
      });
      this.ws.on('close', () => { this.closed = true; this.ready = false; this.wake(); });
      this.ws.on('error', reject);
    });
  }
  ready = false;
  private wake() { const w = this.waiters; this.waiters = []; w.forEach(f => f()); }
  disconnect() { this.ws.terminate(); this.ready = false; }
  async waitFor(pred: (v: View) => boolean, ms = 3000, label = 'cond'): Promise<View> {
    const t0 = Date.now();
    while (!(this.view && pred(this.view))) {
      if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${label}; phase=${this.view?.room.phase} stage=${this.view?.round?.stage}`);
      await new Promise<void>(r => { this.waiters.push(r); setTimeout(r, 50); });
    }
    return this.view!;
  }
  async act(a: Action, reqId?: string) {
    const id = reqId ?? `${this.name}-${++this.n}-${Math.random().toString(36).slice(2, 7)}`;
    this.acks.delete(id);
    this.ws.send(JSON.stringify({ t: 'act', reqId: id, a }));
    const t0 = Date.now();
    while (!this.acks.has(id)) {
      if (Date.now() - t0 > 3000) throw new Error('no ack for ' + JSON.stringify(a));
      await new Promise<void>(r => { this.waiters.push(r); setTimeout(r, 50); });
    }
    return this.acks.get(id) as { ok: boolean; err?: string; dup?: boolean; info?: any };
  }
}

export async function createRoom(env: TestEnv) {
  const r = await post(env, '/api/rooms', { pack: 'standard-2' });
  return r.body as { code: string; hostKey: string; hostPin: string };
}
export async function joinPlayer(env: TestEnv, code: string, name: string) {
  const r = await post(env, `/api/rooms/${code}/join`, { name, avatar: AV });
  if (r.status !== 200) throw new Error('join failed ' + JSON.stringify(r.body));
  return r.body as { playerId: string; token: string; recovery: string };
}

export interface Setup { env: TestEnv; code: string; host: Client; tv: Client; players: Client[]; ids: string[]; tokens: string[]; recov: string[]; hostKey: string; hostPin: string }
export async function setupShow(env: TestEnv, n = 6, startShow = true): Promise<Setup> {
  const { code, hostKey, hostPin } = await createRoom(env);
  const host = new Client(env, 'host', code, hostKey, 'host'); await host.connect();
  const tv = new Client(env, 'tv', code, undefined, 'tv'); await tv.connect();
  const players: Client[] = []; const ids: string[] = []; const tokens: string[] = []; const recov: string[] = [];
  for (let i = 0; i < n; i++) {
    const j = await joinPlayer(env, code, `Spieler${i + 1}`);
    const c = new Client(env, 'player', code, j.token, `p${i + 1}`); await c.connect();
    players.push(c); ids.push(j.playerId); tokens.push(j.token); recov.push(j.recovery);
  }
  if (startShow) {
    await host.act({ k: 'h.startShow' });
    await host.act({ k: 'h.introDone' });
  }
  return { env, code, host, tv, players, ids, tokens, recov, hostKey, hostPin };
}
export const closeAll = (s: Setup) => { [s.host, s.tv, ...s.players].forEach(c => { try { c.ws.terminate(); } catch { /* */ } }); };

/** Admin-Client mit Cookie-Verwaltung (wie ein Browser). */
export class Admin {
  cookie = '';
  constructor(public env: TestEnv, public password = 'test-admin-pw') {}
  async login(pw = this.password) {
    const r = await fetch(this.env.url + '/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const sc = r.headers.get('set-cookie');
    if (r.status === 200 && sc) this.cookie = sc.split(';')[0];
    return { status: r.status, setCookie: sc ?? '' };
  }
  async req(method: string, path: string, body?: unknown, opts: { csrf?: boolean; cookie?: boolean } = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.csrf !== false) headers['x-outplay-admin'] = '1';
    if (opts.cookie !== false && this.cookie) headers.cookie = this.cookie;
    const r = await fetch(this.env.url + '/api/admin' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let data: any = null; try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data };
  }
  get = (p: string) => this.req('GET', p);
  post = (p: string, b?: unknown) => this.req('POST', p, b ?? {});
  put = (p: string, b: unknown) => this.req('PUT', p, b);
  del = (p: string) => this.req('DELETE', p);
}
