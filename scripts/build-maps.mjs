// Erzeugt die OFFLINE-Vektorkarte (OpenStreetMap-Daten) als MBTiles-Datei für die Show.
//   node scripts/build-maps.mjs [--maxzoom 12] [--out data/maps/outplay-karte.mbtiles] [--source <pmtiles-URL>]
//        [--europe-maxzoom 7]  Europa-Detailstufe (Standard 7; 8 = deutlich mehr Details beim Hineinzoomen, ca. +50–60 MB, geschätzt)
//        [--world-maxzoom 5]   Welt-Detailstufe (Standard 5; 6 = mehr Details, ca. +40 MB, geschätzt)
// Zusätzliche Stufen ERGÄNZEN eine vorhandene Datei (bereits geladene Kacheln werden übersprungen) – die alte Datei bleibt voll nutzbar.
// Quelle: Protomaps-Basiskarte (OpenStreetMap-Daten, © OpenStreetMap-Mitwirkende, ODbL). Es werden nur die benötigten Kacheln
// (Welt grob, Europa mittel, Deutschland detailliert) per HTTP-Range geladen, überflüssige Ebenen (Gebäude, POIs, Ackerflächen …)
// entfernt und alles in eine SQLite-Datei geschrieben. Abbrechen und erneut starten setzt fort. Einmalig mit Internet nötig.
import { createRequire } from 'node:module';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname } from 'node:path';
import zlib from 'node:zlib';
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
const require = createRequire(import.meta.url);
const vtpbf = require('vt-pbf');
const Pbf3 = require('vt-pbf/node_modules/pbf');
const { feature, merge } = require('topojson-client');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const MAXZ = Number(arg('maxzoom', 12));
const OUT = arg('out', 'data/maps/outplay-karte.mbtiles');
const conc = Number(arg('concurrency', 12));
const EUZ = Math.max(7, Number(arg('europe-maxzoom', 7)));   // höchste Zoomstufe für ganz Europa
const WZ = Math.max(5, Number(arg('world-maxzoom', 5)));      // höchste Zoomstufe für die ganze Welt

async function findSource() {
  const given = arg('source', '');
  if (given) return given;
  for (let d = 0; d < 20; d++) {      // jüngster verfügbarer Tagesstand
    const dt = new Date(Date.now() - d * 864e5); const s = dt.toISOString().slice(0, 10).replace(/-/g, '');
    const u = `https://build.protomaps.com/${s}.pmtiles`;
    try { const r = await fetch(u, { headers: { range: 'bytes=0-15' } }); if (r.status === 206 || r.status === 200) return u; } catch { /* nächster */ }
  }
  throw new Error('Keine Protomaps-Quelle erreichbar (Internet nötig).');
}
const SRC = await findSource();
console.log('Quelle:', SRC, '→', OUT, '· bis Zoom', MAXZ);
const pm = new PMTiles(SRC);
const hdr = await pm.getHeader(); const meta = await pm.getMetadata();

// ---------- Kachelmengen ----------
const lon2x = (lon, z) => Math.min(2 ** z - 1, Math.max(0, Math.floor((lon + 180) / 360 * 2 ** z)));
const lat2y = (lat, z) => { const r = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180; return Math.min(2 ** z - 1, Math.max(0, Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z))); };
const x2lon = (x, z) => x / 2 ** z * 360 - 180;
const y2lat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI;

const detail = JSON.parse((await import('node:fs')).readFileSync('web/src/mapdata/detail.json', 'utf8'));
const deu = merge(detail, detail.objects.neighbors.geometries.filter(g => g.properties.a === 'DEU'));
const rings = (deu.type === 'Polygon' ? [deu.coordinates] : deu.coordinates).flatMap(p => p.map(r => r));
const inRing = (pt, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
const polys = (deu.type === 'Polygon' ? [deu.coordinates] : deu.coordinates).map(p => ({ p, bb: p[0].reduce((b, q) => [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])], [999, 999, -999, -999]) }));
const inDE = pt => polys.some(({ p, bb }) => pt[0] >= bb[0] && pt[0] <= bb[2] && pt[1] >= bb[1] && pt[1] <= bb[3] && inRing(pt, p[0]) && !p.slice(1).some(h => inRing(pt, h)));

function tilesFor(z) {
  if (z <= WZ) { const n = 2 ** z, a = []; for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) a.push([x, y]); return a; }
  if (z <= EUZ) { const a = []; for (let x = lon2x(-26, z); x <= lon2x(48, z); x++) for (let y = lat2y(72, z); y <= lat2y(33, z); y++) a.push([x, y]); return a; }
  const set = new Map(); const add = (x, y) => set.set(x + '/' + y, [x, y]);
  const x0 = lon2x(5.3, z), x1 = lon2x(15.9, z), y0 = lat2y(55.5, z), y1 = lat2y(46.9, z);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const w = x2lon(x, z), e = x2lon(x + 1, z), n = y2lat(y, z), s = y2lat(y + 1, z);
    if ([[.5, .5], [.2, .2], [.8, .2], [.2, .8], [.8, .8]].some(([fx, fy]) => inDE([w + (e - w) * fx, n + (s - n) * fy]))) add(x, y);
  }
  for (const ring of rings) for (let i = 1; i < ring.length; i++) {       // Randkacheln lückenlos
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i]; const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (360 / 2 ** z / 4)));
    for (let k = 0; k <= steps; k++) add(lon2x(ax + (bx - ax) * k / steps, z), lat2y(ay + (by - ay) * k / steps, z));
  }
  return [...set.values()];
}

// ---------- Ausdünnen ----------
const DROP_LAYERS = new Set(['buildings', 'pois']);
const LAND_LOW = new Set(['forest', 'wood', 'park', 'nature_reserve', 'national_park']);
const LAND_MID = new Set(['residential', 'industrial']);
function keep(layer, f, z) {
  const k = f.properties.kind;
  if (layer === 'landuse') return LAND_LOW.has(k) || (z >= 9 && LAND_MID.has(k)) || (z >= 11 && k === 'cemetery');
  if (layer === 'roads') return !(z <= 12 && k === 'path') && !(z < 8 && k === 'minor_road');
  return true;
}
function prune(raw, z) {
  const vt = new VectorTile(new PbfReader(raw)); const out = { layers: {} };
  for (const [name, l] of Object.entries(vt.layers)) {
    if (DROP_LAYERS.has(name)) continue;
    const feats = []; for (let i = 0; i < l.length; i++) { const f = l.feature(i); if (keep(name, f, z)) feats.push(f); }
    if (!feats.length) continue;
    out.layers[name] = { version: l.version, name, extent: l.extent, length: feats.length, feature: i => feats[i] };
  }
  return zlib.gzipSync(Buffer.from(vtpbf.fromVectorTileJs(out)), { level: 9 });
}

// ---------- MBTiles ----------
mkdirSync(dirname(OUT), { recursive: true });
const db = new DatabaseSync(OUT);
db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; CREATE TABLE IF NOT EXISTS metadata(name TEXT, value TEXT); CREATE TABLE IF NOT EXISTS tiles(zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB, PRIMARY KEY(zoom_level, tile_column, tile_row)) WITHOUT ROWID;');
const has = db.prepare('SELECT 1 FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?');
const ins = db.prepare('INSERT OR REPLACE INTO tiles VALUES(?,?,?,?)');
const setMeta = (k, v) => { db.prepare('DELETE FROM metadata WHERE name=?').run(k); db.prepare('INSERT INTO metadata VALUES(?,?)').run(k, String(v)); };

let done = 0, bytes = 0, skipped = 0, rawBytes = 0; const t0 = Date.now();
for (let z = 0; z <= MAXZ; z++) {
  const list = tilesFor(z).filter(([x, y]) => !has.get(z, x, (2 ** z - 1) - y));
  console.log(`Zoom ${z}: ${list.length} Kacheln …`);
  let idx = 0;
  const worker = async () => {
    while (idx < list.length) {
      const [x, y] = list[idx++]; let tile = null;
      for (let a = 0; a < 5; a++) { try { tile = await pm.getZxy(z, x, y); break; } catch (e) { await new Promise(r => setTimeout(r, 500 * (a + 1))); } }
      if (!tile) { skipped++; continue; }
      const raw = Buffer.from(tile.data); rawBytes += raw.length;
      const gz = prune(raw, z); bytes += gz.length;
      ins.run(z, x, (2 ** z - 1) - y, gz); done++;
      if (done % 500 === 0) console.log(`  … ${done} Kacheln, ${(bytes / 1048576).toFixed(0)} MB, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    }
  };
  db.exec('BEGIN'); await Promise.all(Array.from({ length: conc }, worker)); db.exec('COMMIT');
}
const total = db.prepare('SELECT COUNT(*) c, SUM(LENGTH(tile_data)) b FROM tiles').get();
setMeta('name', 'OUTPLAY Karte'); setMeta('format', 'pbf'); setMeta('minzoom', 0); setMeta('maxzoom', MAXZ); setMeta('bounds', '-180,-85,180,85');
setMeta('attribution', '© OpenStreetMap-Mitwirkende (ODbL), Protomaps'); setMeta('source', SRC);
setMeta('json', JSON.stringify({ vector_layers: (meta.vector_layers ?? []).filter(l => !DROP_LAYERS.has(l.id)) }));
db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close();
console.log(`Fertig: ${total.c} Kacheln, ${(total.b / 1048576).toFixed(0)} MB (Datei ${(statSync(OUT).size / 1048576).toFixed(0)} MB), neu geladen ${done}, übersprungen ${skipped}, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
