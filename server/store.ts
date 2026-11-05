// Persistenz: SQLite (node:sqlite). Jede Zustandsänderung wird synchron gespeichert, bevor sie bestätigt wird.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Room } from './model';

export class Store {
  db: DatabaseSync;
  private upsert: ReturnType<DatabaseSync['prepare']>;
  private ev: ReturnType<DatabaseSync['prepare']>;
  constructor(file: string) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, json TEXT NOT NULL, seq INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, at INTEGER NOT NULL, actor TEXT NOT NULL, req TEXT, action TEXT NOT NULL, result TEXT);
      CREATE INDEX IF NOT EXISTS idx_events_room ON events(room, id);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS admin_sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, data TEXT NOT NULL, builtin INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, mode TEXT NOT NULL, topic TEXT NOT NULL DEFAULT '', data TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS packs (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', current_version INTEGER, created INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS pack_versions (id TEXT PRIMARY KEY, pack_id TEXT NOT NULL, version INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', book TEXT NOT NULL, created INTEGER NOT NULL);
    `);
    this.upsert = this.db.prepare('INSERT INTO rooms (code, json, seq, updated) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET json = excluded.json, seq = excluded.seq, updated = excluded.updated');
    this.ev = this.db.prepare('INSERT INTO events (room, at, actor, req, action, result) VALUES (?, ?, ?, ?, ?, ?)');
  }
  save(room: Room, now: number) { this.upsert.run(room.code, JSON.stringify(room), room.seq, now); }
  event(room: string, at: number, actor: string, req: string | undefined, action: unknown, result: unknown) {
    this.ev.run(room, at, actor, req ?? null, JSON.stringify(action), JSON.stringify(result));
  }
  loadAll(): Room[] {
    return (this.db.prepare('SELECT json FROM rooms').all() as { json: string }[]).map(r => JSON.parse(r.json) as Room);
  }
  deleteOlderThan(ts: number) {
    const old = this.db.prepare('SELECT code FROM rooms WHERE updated < ?').all(ts) as { code: string }[];
    for (const o of old) { this.db.prepare('DELETE FROM rooms WHERE code = ?').run(o.code); this.db.prepare('DELETE FROM events WHERE room = ?').run(o.code); }
    return old.length;
  }
  eventCount(room: string): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM events WHERE room = ?').get(room) as { n: number }).n;
  }
  close() { this.db.close(); }
}
