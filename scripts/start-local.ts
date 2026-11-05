// Komfort-Start für den Spieleabend (Windows/macOS/Linux): Prüfungen, Build, Netzwerkadresse wählen, Server starten.
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createServer } from 'node:net';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { netInfo } from '../server/net';

const PORT = Number(process.env.PORT ?? 8080);
const dataDir = resolve(process.env.DATA_DIR ?? './data');
const line = (s = '') => console.log(s);
const die = (m: string): never => { console.error('\n✗ ' + m + '\n'); process.exit(1); };

const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 13)) die(`Node.js ${process.versions.node} ist zu alt. Benötigt wird Node 22.13 oder neuer (LTS) – https://nodejs.org`);

const newest = (dir: string): number => { let m = 0; if (!existsSync(dir)) return 0; for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p); m = Math.max(m, s.isDirectory() ? newest(p) : s.mtimeMs); } return m; };
const dist = join('dist', 'index.html');
const srcTime = Math.max(newest('web'), newest('shared'), newest('content'), statSync('package.json').mtimeMs);
if (!existsSync(dist) || statSync(dist).mtimeMs < srcTime) {
  line('• Frontend wird gebaut (einmalig, dauert ca. 20 Sekunden) …');
  const r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) die('Der Frontend-Build ist fehlgeschlagen (siehe Meldungen oben).');
}

// Port frei?
await new Promise<void>(res => { const t = createServer(); t.once('error', () => die(`Port ${PORT} ist belegt – läuft OUTPLAY bereits in einem anderen Fenster? Sonst mit "set PORT=8081" einen anderen Port wählen.`)); t.once('listening', () => t.close(() => res())); t.listen(PORT, '0.0.0.0'); });

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

line();
line('══════════════════════════════════════════════════════════════');
line('  OUTPLAY läuft lokal – kein Internet nötig');
line('══════════════════════════════════════════════════════════════');
line(`  Showmaster (Laptop/Tablet):   ${base || `http://localhost:${PORT}`}/host`);
line(`  Admin (Fragen & Pakete):      ${base || `http://localhost:${PORT}`}/admin`);
line('  TV-Ansicht: Auf dem Laptop (am Fernseher) im Browser öffnen:');
line(`                                http://localhost:${PORT}/tv/RAUMCODE   (Raumcode steht im Showmaster-Pult)`);
line('                                Der QR-Code auf dem TV enthält automatisch die WLAN-Adresse:');
line(`                                ${base ? base + '/play/RAUMCODE' : '(keine Netzwerkadresse gefunden)'}`);
line(`  Datenbank:                    ${join(dataDir, 'outplay.db')}`);
line(`  Automatische Backups:         ${join(dataDir, 'backups')}`);
if (existsSync(join(dataDir, 'admin-passwort.txt'))) line(`  Admin-Passwort (1. Start):    siehe ${join(dataDir, 'admin-passwort.txt')}`);
line('  Beenden: dieses Fenster schließen oder Strg+C');
line('══════════════════════════════════════════════════════════════');
line('  Windows fragt beim ersten Start nach der Firewall: nur "Private Netzwerke" erlauben.');
line();

const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { stdio: 'inherit', env: { ...process.env, PORT: String(PORT), OUTPLAY_HOST: base || '' } });
child.on('exit', code => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => child.kill(sig));
