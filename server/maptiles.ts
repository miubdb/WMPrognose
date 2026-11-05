// Kartenkacheln (Vektor, OpenStreetMap-Daten): lokal aus einer MBTiles-Datei (SQLite), online per Protomaps-Quelle.
import { existsSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import zlib from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface TileSource {
  status(): Promise<{ available: boolean; minzoom: number; maxzoom: number; source: 'local' | 'remote' | 'none'; sizeMB?: number }>;
  /** gzip-komprimierte MVT-Kachel oder null */
  tile(z: number, x: number, y: number): Promise<Buffer | null>;
}

export class LocalTiles implements TileSource {
  private db: DatabaseSync | null = null; private maxz = 0; private minz = 0;
  constructor(private file: string) {}
  private open() {
    if (this.db) return this.db;
    if (!existsSync(this.file)) return null;
    try {
      const d = new DatabaseSync(this.file, { readOnly: true });
      const m = new Map((d.prepare('SELECT name, value FROM metadata').all() as any[]).map(r => [r.name, r.value]));
      this.maxz = Number(m.get('maxzoom') ?? 0); this.minz = Number(m.get('minzoom') ?? 0);
      this.db = d; return d;
    } catch { return null; }
  }
  async status() {
    const d = this.open();
    if (!d) return { available: false, minzoom: 0, maxzoom: 0, source: 'none' as const };
    return { available: true, minzoom: this.minz, maxzoom: this.maxz, source: 'local' as const, sizeMB: Math.round(statSync(this.file).size / 1048576) };
  }
  async tile(z: number, x: number, y: number) {
    const d = this.open(); if (!d) return null;
    const r = d.prepare('SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?').get(z, x, 2 ** z - 1 - y) as any;
    return r ? Buffer.from(r.tile_data) : null;
  }
}

/** Online (Vercel): Kacheln aus dem öffentlichen Protomaps-Tagesstand per HTTP-Range, serverseitig (kein CORS-Problem im Browser). */
export class RemoteTiles implements TileSource {
  private pm: any = null;
  constructor(private url: string) {}
  private async get() { if (!this.pm) { const { PMTiles } = await import('pmtiles'); this.pm = new PMTiles(this.url); } return this.pm; }
  async status() { return { available: true, minzoom: 0, maxzoom: 15, source: 'remote' as const }; }
  async tile(z: number, x: number, y: number) {
    const pm = await this.get(); const t = await pm.getZxy(z, x, y);
    return t ? zlib.gzipSync(Buffer.from(t.data)) : null;
  }
}

/** Routen /api/maptiles/status und /api/maptiles/z/x/y.pbf. Gibt true zurück, wenn behandelt. */
export async function handleMapTiles(src: TileSource, req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
  if (!path.startsWith('/api/maptiles/')) return false;
  const send = (code: number, headers: Record<string, string>, body?: Buffer | string) => { res.writeHead(code, headers); res.end(body); };
  if (path === '/api/maptiles/status') { send(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }, JSON.stringify(await src.status())); return true; }
  const m = /^\/api\/maptiles\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.pbf$/.exec(path);
  if (!m) { send(404, { 'content-type': 'text/plain' }, 'not found'); return true; }
  const z = +m[1], x = +m[2], y = +m[3];
  if (z > 15 || x >= 2 ** z || y >= 2 ** z) { send(404, { 'content-type': 'text/plain' }, 'not found'); return true; }
  try {
    const t = await src.tile(z, x, y);
    if (!t) { send(204, { 'cache-control': 'public, max-age=3600' }); return true; }
    send(200, { 'content-type': 'application/x-protobuf', 'content-encoding': 'gzip', 'cache-control': 'public, max-age=86400', 'content-length': String(t.length) }, t);
  } catch { send(502, { 'content-type': 'text/plain' }, 'tile source error'); }
  return true;
}
