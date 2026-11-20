// Baut das Windows-Download-Paket: fertig gebündelte Anwendung + Node-Laufzeit (kein npm, kein Build beim Nutzer).
// Aufruf: node scripts/build-release.mjs [--no-build]   →   release-out/JANIQUIZITION-Windows.zip
// Enthält bewusst KEINE Datenbank, Backups, Passwörter, Tokens oder Konfigurationsdateien (nur Programmdateien + Standardinhalte im Code).
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const NODE_VERSION = process.env.NODE_VERSION || (await (await fetch('https://nodejs.org/dist/index.json')).json()).find(x => x.lts).version;   // neueste LTS
const OUT = 'release-out', STAGE = join(OUT, 'JANIQUIZITION'), CACHE = join(OUT, '.cache');
rmSync(STAGE, { recursive: true, force: true }); mkdirSync(STAGE, { recursive: true }); mkdirSync(CACHE, { recursive: true });
const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} fehlgeschlagen`); };

// 1) Frontend
if (!process.argv.includes('--no-build')) run('npx', ['vite', 'build']);
cpSync('dist', join(STAGE, 'dist'), { recursive: true });

// 2) Server, Launcher und Hilfsprogramme als einzelne Dateien bündeln
const banner = { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" };
const common = { bundle: true, platform: 'node', format: 'esm', target: 'node24', external: ['node:*'], legalComments: 'none', logLevel: 'warning', banner, define: { __DEV__: 'false' } };
mkdirSync(join(STAGE, 'app'));
await build({ ...common, entryPoints: ['server/index.ts'], outfile: join(STAGE, 'app/server.mjs') });
await build({ ...common, entryPoints: ['scripts/start-local.ts'], outfile: join(STAGE, 'app/launcher.mjs') });
await build({ ...common, entryPoints: ['scripts/build-maps.mjs'], outfile: join(STAGE, 'app/karte-laden.mjs') });
for (const f of ['reset-admin.mjs', 'restore-backup.mjs']) cpSync(join('scripts', f), join(STAGE, 'app', f));
mkdirSync(join(STAGE, 'app/mapdata')); cpSync('web/src/mapdata/detail.json', join(STAGE, 'app/mapdata/detail.json'));

// 3) Node-Laufzeit für Windows (x64), Prüfsumme gegen nodejs.org
const zipName = `node-${NODE_VERSION}-win-x64.zip`, nodeZip = join(CACHE, zipName);
if (!existsSync(nodeZip)) {
  console.log('• Lade ' + zipName);
  const r = await fetch(`https://nodejs.org/dist/${NODE_VERSION}/${zipName}`); if (!r.ok) throw new Error('Node-Download fehlgeschlagen: ' + r.status);
  writeFileSync(nodeZip, Buffer.from(await r.arrayBuffer()));
}
const sums = await (await fetch(`https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt`)).text();
const want = sums.split('\n').find(l => l.endsWith(zipName))?.split(/\s+/)[0]; const got = createHash('sha256').update(readFileSync(nodeZip)).digest('hex');
if (!want || want !== got) { rmSync(nodeZip); throw new Error('Prüfsumme der Node-Laufzeit stimmt nicht – Abbruch.'); }
const x = join(CACHE, 'node-x'); rmSync(x, { recursive: true, force: true }); mkdirSync(x);
run('unzip', ['-q', '-o', nodeZip, '-d', x]);
const nd = join(x, `node-${NODE_VERSION}-win-x64`); mkdirSync(join(STAGE, 'runtime'));
cpSync(join(nd, 'node.exe'), join(STAGE, 'runtime/node.exe')); cpSync(join(nd, 'LICENSE'), join(STAGE, 'runtime/LICENSE-node.txt'));

// 4) Startdateien, Anleitung (Windows-Zeilenenden), Version
const crlf = s => s.replace(/\r?\n/g, '\r\n');
for (const f of readdirSync('release/win')) writeFileSync(join(STAGE, f), crlf(readFileSync(join('release/win', f), 'utf8')));
writeFileSync(join(STAGE, 'VERSION'), pkg.version + '\r\n');

// 5) Sicherheitsprüfung: nichts Privates im Paket
const bad = [];
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(db|db-wal|db-shm|env|mbtiles)$|admin-passwort|\.pem$|token/i.test(f)) bad.push(p); } };
walk(STAGE); if (bad.length) throw new Error('Unerlaubte Dateien im Release: ' + bad.join(', '));

// 6) ZIP (stabiler Dateiname, damit der Link „releases/latest/download/…“ immer funktioniert)
const zip = join(OUT, 'JANIQUIZITION-Windows.zip'); rmSync(zip, { force: true });
const r = spawnSync('zip', ['-q', '-r', '-9', 'JANIQUIZITION-Windows.zip', 'JANIQUIZITION'], { cwd: OUT, stdio: 'inherit' }); if (r.status !== 0) throw new Error('zip fehlgeschlagen');
const sha = createHash('sha256').update(readFileSync(zip)).digest('hex'); writeFileSync(join(OUT, 'JANIQUIZITION-Windows.zip.sha256'), `${sha}  JANIQUIZITION-Windows.zip\n`);
console.log(`\n✓ ${zip} (${(statSync(zip).size / 1048576).toFixed(1)} MB) · Version ${pkg.version} · Node ${NODE_VERSION}\n  SHA-256 ${sha}`);
