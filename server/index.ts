import { writeFileSync } from 'node:fs';
import { App } from './app';
import { BOOK } from '../content';

const port = Number(process.env.PORT ?? 8080);
const dataDir = process.env.DATA_DIR ?? './data';
const app = new App({
  book: BOOK,
  dbFile: `${dataDir}/outplay.db`,
  backupDir: `${dataDir}/backups`,
  staticDir: process.env.STATIC_DIR ?? 'dist',
  publicHost: process.env.OUTPLAY_HOST || process.env.PUBLIC_URL || undefined,
  hostPassword: process.env.HOST_PASSWORD || undefined,
  adminPassword: process.env.ADMIN_PASSWORD || undefined,
});
if (app.auth.initialPassword) {
  const f = `${dataDir}/admin-passwort.txt`;
  writeFileSync(f, app.auth.initialPassword + '\n');
  console.log(`\n=== ADMIN-PASSWORT (nur beim ersten Start erzeugt): ${app.auth.initialPassword}\n    gespeichert in ${f} – bitte notieren und die Datei danach löschen. Alternativ ADMIN_PASSWORD setzen. ===\n`);
}
app.listen(port).then(p => console.log(`OUTPLAY läuft auf Port ${p} (Daten: ${dataDir}, Räume geladen: ${app.rooms.size})`));
const stop = () => { app.close().finally(() => process.exit(0)); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
