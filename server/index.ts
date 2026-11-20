import { App } from './app';
import { STANDARD_MAIN, STANDARD_SECOND, STANDARD_SHOWS } from '../content';

const port = Number(process.env.PORT ?? 8080);
const dataDir = process.env.DATA_DIR ?? './data';
const app = new App({
  book: { tiles: [] },   // frische Installation: keine Alt-Pakete, nur die zwei Standardpakete
  extraShows: STANDARD_SHOWS,
  standard: { main: STANDARD_MAIN, second: STANDARD_SECOND },
  dbFile: `${dataDir}/outplay.db`,
  backupDir: `${dataDir}/backups`,
  staticDir: process.env.STATIC_DIR ?? 'dist',
  publicHost: process.env.OUTPLAY_HOST || process.env.PUBLIC_URL || undefined,
  hostPassword: process.env.HOST_PASSWORD || undefined,
  adminPassword: process.env.ADMIN_PASSWORD || undefined,
  mapFile: process.env.MAP_FILE || undefined,
});
app.listen(port).then(p => !process.env.OUTPLAY_QUIET && console.log(`JANIQUIZITION läuft auf Port ${p} (Daten: ${dataDir}, Räume geladen: ${app.rooms.size})`));
const stop = () => { app.close().finally(() => process.exit(0)); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
