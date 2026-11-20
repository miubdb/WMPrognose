// Komfort-Start für den Spieleabend (Windows/macOS/Linux): Prüfungen, Build, Netzwerkadresse wählen, Server starten.
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createServer } from 'node:net';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, copyFileSync, accessSync, constants } from 'node:fs';
import { resolve, join } from 'node:path';
import { netInfo } from '../server/net';

const PORT = Number(process.env.PORT ?? 8080);
const dataDir = resolve(process.env.DATA_DIR ?? './data');
const line = (s = '') => console.log(s);
const die = (m: string): never => { console.error('\n✗ ' + m + '\n'); process.exit(1); };

/** Release-Paket (Windows-ZIP): fertig gebündelte Anwendung samt Node-Laufzeit – kein npm, kein Build. Entwicklung: Quellcode im Repository. */
const RELEASE = existsSync(join('app', 'server.mjs'));
const version = existsSync('VERSION') ? readFileSync('VERSION', 'utf8').trim() : 'dev';
const [maj, min] = process.versions.node.split('.').map(Number);
if (!RELEASE && maj < 24) die(`Node.js ${process.versions.node} ist zu alt. Benötigt wird Node 24 oder neuer (LTS) – https://nodejs.org`);

const newest = (dir: string): number => { let m = 0; if (!existsSync(dir)) return 0; for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p); m = Math.max(m, s.isDirectory() ? newest(p) : s.mtimeMs); } return m; };
const dist = join('dist', 'index.html');
if (RELEASE) {
  if (!existsSync(dist)) die('Programmdateien unvollständig (dist\\index.html fehlt). Bitte das ZIP erneut vollständig entpacken – nicht direkt aus dem ZIP starten.');
} else if (!existsSync(dist) || statSync(dist).mtimeMs < Math.max(newest('web'), newest('shared'), newest('content'), statSync('package.json').mtimeMs)) {
  line('• Frontend wird gebaut (einmalig, dauert ca. 20 Sekunden) …');
  const r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) die('Der Frontend-Build ist fehlgeschlagen (siehe Meldungen oben).');
}

// Datenordner: beschreibbar? (z. B. nicht direkt aus dem ZIP oder aus einem schreibgeschützten Ordner starten)
try { mkdirSync(dataDir, { recursive: true }); accessSync(dataDir, constants.W_OK); } catch { die(`Der Datenordner „${dataDir}“ ist nicht beschreibbar. Bitte den Ordner JANIQUIZITION an einen normalen Ort verschieben (z. B. Dokumente oder Desktop) und dort starten.`); }
const firstStart = !existsSync(join(dataDir, 'outplay.db'));
// Update-Schutz: bei neuer Programmversion vorher eine Sicherheitskopie der Datenbank anlegen (nichts wird überschrieben)
try {
  const vf = join(dataDir, 'version.txt'); const last = existsSync(vf) ? readFileSync(vf, 'utf8').trim() : '';
  if (!firstStart && last !== version) { mkdirSync(join(dataDir, 'backups'), { recursive: true }); copyFileSync(join(dataDir, 'outplay.db'), join(dataDir, 'backups', `vor-update-auf-${version}-${Date.now()}.db`)); line(`• Neue Version ${version}: Sicherheitskopie deiner Daten angelegt (data\\backups).`); }
  writeFileSync(vf, version + '\n');
} catch { /* Sicherung ist Zusatz – Start nicht blockieren */ }

// Port frei?
await new Promise<void>(res => { const t = createServer(); t.once('error', () => die(`Port ${PORT} ist belegt – läuft JANIQUIZITION bereits in einem anderen Fenster? Sonst mit "set PORT=8081" einen anderen Port wählen.`)); t.once('listening', () => t.close(() => res())); t.listen(PORT, '0.0.0.0'); });

// Netzwerkadresse
let host = process.env.OUTPLAY_HOST || process.env.PUBLIC_URL || '';
const info = netInfo(PORT, host || undefined);
if (!host) {
  const good = info.candidates.filter(c => !c.virtual);
  if (!good.length && !info.candidates.length) {
    line('⚠ Es wurde KEINE Netzwerkverbindung gefunden. Bitte den Laptop mit dem WLAN/LAN verbinden (oder einen Hotspot nutzen) und erneut starten.');
  } else if (good.length > 1) {
    line('Mehrere Netzwerkadapter gefunden – welcher ist das WLAN/LAN, mit dem die Handys verbunden sind?');
    good.forEach((c, i) => line(`  [${i + 1}] ${c.name}  →  http://${c.address}:${PORT}   (${c.kind})`));
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ans: string = await new Promise(r => rl.question(`Nummer eingeben [1]: `, a => { rl.close(); r(a); }));
    const pick = good[Math.max(0, Math.min(good.length - 1, (parseInt(ans, 10) || 1) - 1))];
    host = `http://${pick.address}:${PORT}`;
  } else host = (good[0] ?? info.candidates[0]) ? `http://${(good[0] ?? info.candidates[0]).address}:${PORT}` : '';
}
const base = host ? (/^https?:\/\//.test(host) ? host : `http://${host}`) : '';

const url = base || `http://localhost:${PORT}`;
line();
line('══════════════════════════════════════════════════');
line('  JANIQUIZITION läuft ✓   (kein Internet nötig)');
line('══════════════════════════════════════════════════');
line('  1. Showmaster-Pult (Laptop/Tablet):');
line(`       ${url}/host`);
line('  2. Fernseher: dieselbe Adresse mit /tv/ + Raumcode');
line('     (der Raumcode steht im Showmaster-Pult)');
line('  3. Handys: QR-Code auf dem Fernseher scannen');
line();
line(`  Verwaltung (Fragen & Pakete):  http://localhost:${PORT}/admin `);
if (firstStart) { line('  ERSTER START: Im Browser öffnet sich gleich die Einrichtung –'); line('  dort legst du dein eigenes Admin-Passwort fest.'); line('  Windows fragt eventuell nach der Firewall: „Private Netzwerke“ erlauben,'); line('  damit Handys und Fernseher sich verbinden können.'); }
line('  Beenden: Fenster schließen');
line('══════════════════════════════════════════════════');
line();

const serverArgs = ['--disable-warning=ExperimentalWarning', ...(RELEASE ? [join('app', 'server.mjs')] : ['--import', 'tsx', 'server/index.ts'])];
const child = spawn(process.execPath, serverArgs, { stdio: 'inherit', env: { ...process.env, PORT: String(PORT), OUTPLAY_HOST: base || '', OUTPLAY_QUIET: '1' } });
child.on('exit', code => { if (code) console.error(`\n✗ JANIQUIZITION wurde unerwartet beendet (Code ${code}). Bitte das Fenster nicht schließen und den Text oben (Fehlermeldung) notieren oder fotografieren.\n`); process.exit(code ?? 0); });
// Beim allerersten Start: Einrichtung automatisch im Browser öffnen (nur Windows/macOS/Linux-Standardbefehle, Fehler sind unkritisch)
if (firstStart && RELEASE && !process.env.JANIQ_NO_BROWSER) setTimeout(() => { try { const target = `http://localhost:${PORT}/admin`; if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', target], { stdio: 'ignore', detached: true }).unref(); else if (process.platform === 'darwin') spawn('open', [target], { stdio: 'ignore', detached: true }).unref(); else spawn('xdg-open', [target], { stdio: 'ignore', detached: true }).unref(); } catch { /* */ } }, 2500);
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => child.kill(sig));
