import { App } from './app';
import { BOOK } from '../content';

const port = Number(process.env.PORT ?? 8080);
const dataDir = process.env.DATA_DIR ?? './data';
const app = new App({
  book: BOOK,
  dbFile: `${dataDir}/outplay.db`,
  staticDir: process.env.STATIC_DIR ?? 'dist',
  adminPassword: process.env.ADMIN_PASSWORD || undefined,
});
app.listen(port).then(p => console.log(`OUTPLAY läuft auf Port ${p} (Daten: ${dataDir}, Räume geladen: ${app.rooms.size})`));
const stop = () => { app.close().finally(() => process.exit(0)); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
