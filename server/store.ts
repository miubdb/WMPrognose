// Persistenz: SQLite (node:sqlite). Jede Zustandsänderung wird synchron gespeichert, bevor sie bestätigt wird.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Room } from './model';

export class Store {
  private db: DatabaseSync;
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
