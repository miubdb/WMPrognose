// Spielt ein vollständiges Server-Backup (SQLite) zurück. Der Server MUSS vorher beendet sein.
// Aufruf: node scripts/restore-backup.mjs <backup.db> [datenverzeichnis]
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [, , src, dirArg] = process.argv;
const fail = (m) => { console.error('\n✗ ' + m + '\n'); process.exit(1); };
if (!src) fail('Bitte die Backup-Datei angeben: node scripts/restore-backup.mjs <backup.db> [datenverzeichnis]');
if (!existsSync(src)) fail(`Datei nicht gefunden: ${src}`);
const dataDir = resolve(dirArg ?? process.env.DATA_DIR ?? './data');
if (readFileSync(src).subarray(0, 15).toString() !== 'SQLite format 3') fail('Das ist keine SQLite-Datei (kein OUTPLAY-Backup).');

// 1) Backup prüfen
let counts;
try {
  const db = new DatabaseSync(src, { readOnly: true });
  const chk = db.prepare('PRAGMA integrity_check').get().integrity_check;
  if (chk !== 'ok') fail('Das Backup ist beschädigt (integrity_check: ' + chk + ').');
  const n = (t) => { try { return db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n; } catch { return null; } };
  counts = { fragen: n('questions'), kategorien: n('categories'), pakete: n('packs'), paketversionen: n('pack_versions'), raeume: n('rooms') };
  if (counts.fragen === null || counts.raeume === null) fail('Das ist kein OUTPLAY-Backup (Tabellen fehlen).');
  db.close();
} catch (e) { fail('Backup konnte nicht gelesen werden: ' + e.message); }

// 2) Läuft der Server noch? (exklusive Sperre auf der aktuellen Datenbank)
mkdirSync(dataDir, { recursive: true });
const target = join(dataDir, 'outplay.db');
if (existsSync(target)) {
  let cur;
  try {
    // Exklusiver Sperrmodus schlägt fehl, solange eine andere Verbindung (der laufende Server) die Datenbank offen hat – auch im WAL-Betrieb.
    cur = new DatabaseSync(target);
    cur.exec('PRAGMA busy_timeout = 1500; PRAGMA locking_mode = EXCLUSIVE;');
    cur.prepare('SELECT COUNT(*) FROM sqlite_master').get();
    cur.close();
  } catch (e) {
    try { cur?.close(); } catch { /* */ } fail('Die Datenbank ist in Benutzung – bitte zuerst den OUTPLAY-Server beenden (Fenster schließen) und erneut versuchen.\n  (' + e.message + ')'); }
}

// 3) Alte Datenbank sichern, Backup einspielen
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
if (existsSync(target)) {
  for (const ext of ['', '-wal', '-shm']) if (existsSync(target + ext)) renameSync(target + ext, `${target}.vor-restore-${stamp}${ext}`);
  console.log(`• Bisherige Datenbank gesichert als ${target}.vor-restore-${stamp}`);
}
copyFileSync(src, target);
console.log('✓ Backup eingespielt:', target);
console.log('  Inhalt:', JSON.stringify(counts));
console.log('  Jetzt den OUTPLAY-Server wieder starten. Laufende Shows werden aus der Datenbank fortgesetzt (Spieler verbinden sich automatisch neu).');
