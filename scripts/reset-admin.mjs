// Admin-Passwort zurücksetzen (nur mit Zugriff auf den Rechner möglich): löscht den gespeicherten Passwort-Hash und alle Anmeldungen.
// Danach wird beim nächsten Öffnen von http://localhost:8080/admin ein neues Passwort festgelegt. Fragen, Pakete und Spielstände bleiben unverändert.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const dataDir = resolve(process.env.DATA_DIR ?? './data'); const file = join(dataDir, 'outplay.db');
if (!existsSync(file)) { console.log('\n  Es gibt noch keine Datenbank – das Passwort wird beim ersten Start ohnehin neu festgelegt.\n'); process.exit(0); }
mkdirSync(join(dataDir, 'backups'), { recursive: true }); copyFileSync(file, join(dataDir, 'backups', `vor-passwort-reset-${Date.now()}.db`));
const db = new DatabaseSync(file);
try { db.exec("DELETE FROM settings WHERE key='admin_hash' OR key LIKE 'fails:%'; DELETE FROM admin_sessions;"); } catch (e) { console.error('\n  FEHLER: ' + e.message + '\n  Läuft JANIQUIZITION noch? Bitte zuerst das JANIQUIZITION-Fenster schließen und erneut versuchen.\n'); process.exit(1); }
db.close();
console.log('\n  ✓ Das Admin-Passwort wurde zurückgesetzt.\n  Starte JANIQUIZITION und öffne /admin – dort legst du ein neues Passwort fest.\n  (Fragen, Pakete und Spielstände sind unverändert; eine Sicherheitskopie liegt in data\\backups.)\n');
