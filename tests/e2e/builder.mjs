// Browser-Test Show-Builder: Ziehen (Maus/Touch/Tastatur), Runden/Fragen verwalten, Autosave, Speicherfehler, Wiederherstellung, Copy-on-Write, Veröffentlichen, Kuratierung.
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import { mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium, devices } = require('playwright');
const SHOTS = '/tmp/claude-0/shots-builder'; mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failures = 0; const check = (c, m) => { if (c) console.log('• ✓', m); else { failures++; console.log('✗ FEHLER:', m); } };
const PORT = 8105, BASE = `http://localhost:${PORT}`, PW = 'pw-e2e-12345', DATA = '/tmp/outplay-builder-e2e'; rmSync(DATA, { recursive: true, force: true });
const srv = spawn('node', ['--import', 'tsx', 'server/index.ts'], { cwd: '/home/user/WMPrognose', env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, ADMIN_PASSWORD: PW }, stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* */ } await sleep(500); }
const browser = await chromium.launch();
const login = async (ctxOpts = { viewport: { width: 1280, height: 1100 } }) => { const ctx = await browser.newContext(ctxOpts); const p = await ctx.newPage(); p.on('pageerror', e => { failures++; console.log('pageerror', e.message); }); await p.goto(BASE + '/admin'); await p.getByLabel('Admin-Passwort').fill(PW); await p.getByRole('button', { name: 'Anmelden' }).click(); await p.waitForSelector('.dash'); return p; };
const api = (p, path) => p.evaluate(async path => (await fetch('/api/admin' + path, { headers: { 'x-outplay-admin': '1' } })).json(), path);
const gotoPacks = async p => { await p.locator('nav').getByRole('button', { name: '📦 Pakete' }).click(); await p.waitForSelector('.pcard, .bigpack'); };
const titles = p => p.locator('.round > .rhead .rmain b').allInnerTexts();
const drag = async (p, handle, toY) => { const b = await handle.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); const steps = 12; for (let i = 1; i <= steps; i++) await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + (toY - (b.y + b.height / 2)) * i / steps); await p.mouse.up(); };
const status = p => p.locator('.savestate').innerText();
const waitSaved = async p => { for (let i = 0; i < 40; i++) { if (/Gespeichert/.test(await status(p))) return true; await sleep(300); } return false; };

// ================= Teil A: Arbeitsansicht =================
let p = await login(); await gotoPacks(p);
const catsBefore = (await api(p, '/categories')).map(c => [c.id, JSON.stringify(c.taskIds), c.title]);
const packsBefore = (await api(p, '/packs')).map(x => [x.id, JSON.stringify(x.show), x.status, x.currentVersion, x.name]);
const orig = p.locator('.pcard', { hasText: 'KICKBASE-KONSENS (Hauptshow)' }).first(); await orig.locator('.rowmenu summary').click(); await orig.getByRole('button', { name: '⧉ Duplizieren' }).click(); await sleep(900);
await p.locator('.pcard.draft').first().getByRole('button', { name: 'Bearbeiten' }).click(); await p.waitForSelector('.builder'); await sleep(1500);
const packId = (await api(p, '/packs')).find(x => x.status === 'draft').id; const baseShow = JSON.stringify((await api(p, '/packs/' + packId)).show.filter(s => s.k !== 'board').map(s => s.cat));
check((await p.locator('.round').count()) === 8, 'Show-Builder zeigt 8 Runden als Playlist');
check((await p.locator('.round .draghandle').count()) >= 7 && (await p.locator('.round .draghandle.off').count()) === 1, 'Sichtbare Ziehgriffe; Finale ist gesperrt (🔒)');
// 1) Runde per Drag & Drop (Maus)
let t0 = await titles(p); const h = p.locator('.round .draghandle').nth(0); const target = await p.locator('.round').nth(2).boundingBox();
await drag(p, h, target.y + target.height + 5); await sleep(300); let t1 = await titles(p); check(t1[2] === t0[0] && t1[0] === t0[1], `Runde per Maus verschoben: „${t0[0]}“ jetzt an Position 3`);
check(/Ungespeichert|Speichert|Gespeichert/.test(await status(p)), 'Speicherstatus sichtbar'); check(await waitSaved(p), 'Autosave: Gespeichert');
check(JSON.stringify((await api(p, '/packs/' + packId)).show.filter(s => s.k !== 'board').map(s => s.cat)) !== baseShow, 'Neue Reihenfolge liegt als Entwurf auf dem Server'); await p.screenshot({ path: `${SHOTS}/1-runden.png` });
// Finale bleibt am Ende
const fin = (await titles(p)).at(-1); await drag(p, p.locator('.round .draghandle').nth(0), (await p.locator('.round').last().boundingBox()).y + 200); await sleep(300); check((await titles(p)).at(-1) === fin, 'Finale bleibt am Ende (nichts kann dahinter gezogen werden)'); await waitSaved(p);
// Tastatur
t0 = await titles(p); const hk = p.locator('.round .draghandle').nth(1); await hk.focus(); await p.keyboard.press('Space'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Space'); await sleep(300); t1 = await titles(p); check(t1[2] === t0[1], 'Barrierefreie Alternative: Runde per Tastatur verschoben'); await waitSaved(p);

// 2) Fragen innerhalb einer Runde (Copy-on-Write)
for (let ri = 0; ri < 7; ri++) { await p.locator('.round .rmain').nth(ri).click(); await sleep(400); if ((await p.locator('.round .rbody .qitem').count()) >= 3) break; await p.locator('.round .rmain').nth(ri).click(); await sleep(200); } const q0 = await p.locator('.round .rbody .qitem .qtxt').allInnerTexts();
await drag(p, p.locator('.round .rbody .qitem .draghandle').nth(2), (await p.locator('.round .rbody .qitem').nth(0).boundingBox()).y - 4); await sleep(500); await waitSaved(p); await sleep(500); const q1 = await p.locator('.round .rbody .qitem .qtxt').allInnerTexts(); console.log('DBG', q0.length, q1.length, await p.locator('.round .rbody').count()); await p.screenshot({ path: `${SHOTS}/dbg-q.png` });
check(q1[0].replace(/^\d+\.\s*/, '') === q0[2].replace(/^\d+\.\s*/, ''), 'Frage per Ziehen nach oben verschoben'); check(await waitSaved(p), 'Frage-Reihenfolge gespeichert');
const catsAfter1 = await api(p, '/categories'); const newCat = catsAfter1.find(c => !catsBefore.some(b => b[0] === c.id));
check(!!newCat, 'Copy-on-Write: Das Paket arbeitet mit einer eigenen Kopie der geteilten Runde'); check(catsBefore.every(([id, tj]) => JSON.stringify(catsAfter1.find(c => c.id === id).taskIds) === tj), 'Die ursprünglichen Runden (anderer Pakete) sind unverändert');
// 3) Vorhandene Frage hinzufügen
const openRound = p.locator('.round').filter({ has: p.locator('.rbody') }).first(); const before = await openRound.locator('.qitem').count();
await openRound.getByRole('button', { name: '＋ Vorhandene Frage auswählen' }).click(); await p.waitForSelector('.picklist'); const opts = await p.locator('.picklist .pickrow2').count(); check(opts > 0, `Fragenauswahl zeigt passende Fragen (${opts})`);
await p.locator('.picklist .pickrow2:not(.sel)').first().click(); await p.locator('.dlg, .modalbox').last().getByRole('button', { name: /^\d+ hinzufügen/ }).click(); await sleep(1500); await p.screenshot({ path: `${SHOTS}/dbg-add.png` }); check((await openRound.locator('.qitem').count()) === before + 1, 'Vorhandene Frage zur Runde hinzugefügt'); await waitSaved(p);
// Ersetzen / Entfernen
await openRound.locator('.qitem').last().getByRole('button', { name: 'Entfernen' }).click(); await sleep(500); check((await openRound.locator('.qitem').count()) === before, 'Frage entfernt (bleibt in der Bibliothek)'); await waitSaved(p);
await p.screenshot({ path: `${SHOTS}/2-fragen.png` });

// 4) Neue Runde + neue Frage im Paketkontext
await p.getByRole('button', { name: '＋ Spielrunde hinzufügen' }).click(); await p.waitForSelector('.gamepick'); check((await p.locator('.gamepick button').count()) === 17, 'Rundenauswahl: alle 17 Spielmodi mit Icon und Erklärung');
await p.locator('.gamepick button', { hasText: 'HOCHSTAPLER' }).click(); await p.getByLabel('Name der Runde').fill('Mein Hochstapler'); await p.getByRole('button', { name: 'Neue Runde anlegen' }).click(); await sleep(900);
check((await titles(p)).some(x => /Mein Hochstapler/.test(x)), 'Neue Runde „Mein Hochstapler“ im Paket angelegt (ohne Wechsel zu „Weitere Inhalte“)'); check((await titles(p)).at(-1) !== 'Mein Hochstapler', 'Neue Runde steht vor dem Finale');
const nr = p.locator('.round').filter({ hasText: 'Mein Hochstapler' }); await nr.getByRole('button', { name: '＋ Neue Frage erstellen' }).click(); await p.waitForSelector('.modalbox.editor');
check(/HOCHSTAPLER/.test(await p.locator('.modalbox.editor h2').innerText()), 'Neue Frage: direkt der passende Editor (HOCHSTAPLER)');
await p.locator('.modalbox.editor label.field', { hasText: 'Thema' }).first().locator('textarea,input').first().fill('Reisen'); await p.locator('.modalbox.editor label.field', { hasText: 'Geheimes Wort' }).locator('input').fill('Koffer'); await p.locator('.modalbox.editor textarea').last().fill('Das Wort war Koffer.');
// 5) Klick außerhalb schließt nicht
await p.mouse.click(5, 5); await sleep(300); check(await p.locator('.modalbox.editor').count() === 1, 'Klick außerhalb schließt den Frageneditor nicht (Eingaben bleiben)');
await p.locator('.modalbox.editor').getByRole('button', { name: '💾 Speichern' }).click(); await p.waitForSelector('.modalbox.editor', { state: 'detached' }); await sleep(900);
check((await nr.locator('.qitem').count()) === 1, 'Nach dem Speichern zurück in der Runde – neue Frage ist übernommen'); check(await waitSaved(p), 'Paket gespeichert');
await p.screenshot({ path: `${SHOTS}/3-neue-runde.png` });

// 6) Speicherfehler
await p.route('**/api/admin/packs/*', r => (r.request().method() === 'PUT' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"err":"Testfehler"}' }) : r.continue()));
const nm = 'Testname Original'; await p.getByLabel('Paketname').fill(nm); await sleep(2500); const nm0 = nm; await p.getByLabel('Paketname').fill('Fehlertest');await sleep(2500);
check(/fehlgeschlagen/.test(await status(p)), 'Speicherfehler wird sichtbar gemeldet'); check((await p.getByLabel('Paketname').inputValue()) === 'Fehlertest', 'Bei Speicherfehler bleiben die Änderungen im Editor erhalten');
// 7) Neuladen mit ungespeicherten Änderungen → Wiederherstellung
p.on('dialog', d => d.accept()); await p.reload({ waitUntil: 'load' }); await p.waitForSelector('.pcard, .bigpack'); await p.locator('.pcard.draft').first().getByRole('button', { name: 'Bearbeiten' }).click(); await p.waitForSelector('.builder'); await sleep(800);
check(await p.getByText('ungespeicherte Änderungen aus einer früheren Sitzung').count() > 0, 'Nach Neuladen: Wiederherstellung wird angeboten'); await p.unroute('**/api/admin/packs/*'); await p.getByRole('button', { name: 'Wiederherstellen' }).click(); await sleep(400); check((await p.getByLabel('Paketname').inputValue()) === 'Fehlertest', 'Änderung wiederhergestellt'); check(await waitSaved(p), 'Wiederhergestellte Änderung gespeichert');
// 8) Veröffentlichen
await p.getByRole('button', { name: '🚀 Veröffentlichen' }).click(); await p.waitForSelector('.dlg'); check(/Bereits gestartete Räume bleiben unverändert/.test(await p.locator('.dlg').innerText()) || /nicht möglich/.test(await p.locator('.dlg').innerText()), 'Veröffentlichen erklärt die Folgen');
const errDlg = /nicht möglich/.test(await p.locator('.dlg').innerText()); if (errDlg) console.log('  Hinweis:', (await p.locator('.dlg').innerText()).slice(0, 300)); await p.locator('.dlg').getByRole('button', { name: errDlg ? 'Abbrechen' : 'Veröffentlichen' }).click(); await sleep(1500);
const pk = await api(p, '/packs/' + packId); check(pk.status === 'published' && pk.currentVersion === 1, 'Neue Version veröffentlicht (nur auf ausdrücklichen Klick)'); 
// 9) Andere Pakete unverändert
const packsAfter = (await api(p, '/packs')).map(x => [x.id, JSON.stringify(x.show), x.status, x.currentVersion, x.name]); check(packsBefore.every(b => JSON.stringify(packsAfter.find(a => a[0] === b[0])) === JSON.stringify(b)), 'Alle anderen Pakete (Entwurf, Status, Version, Name) unverändert');
const catsFinal = await api(p, '/categories'); check(catsBefore.every(([id, tj, ti]) => JSON.stringify(catsFinal.find(c => c.id === id).taskIds) === tj && catsFinal.find(c => c.id === id).title === ti), 'Alle bestehenden Runden unverändert (nur Kopien neu)');
check((await api(p, '/packs/' + packId + '/versions')).length === 1, 'Genau eine Version – kein automatisches Veröffentlichen beim Speichern');
await p.close();

// ================= Teil B: Touch (Tablet & Smartphone) =================
for (const [name, opts] of [['Tablet', { ...devices['iPad Mini'] }], ['Smartphone', { ...devices['iPhone SE'], viewport: { width: 320, height: 1000 } }]]) {
  const tp = await login({ ...opts }); await gotoPacks(tp); await tp.locator('.pcard', { hasText: 'Fehlertest' }).first().getByRole('button', { name: /Bearbeiten|Öffnen/ }).click(); await tp.waitForSelector('.builder'); await sleep(1200);
  const cdp = await tp.context().newCDPSession(tp); const t0 = await titles(tp); const hb = await tp.locator('.round .draghandle').nth(0).boundingBox(); const tb = await tp.locator('.round').nth(1).boundingBox();
  const tx = hb.x + hb.width / 2, ty = hb.y + hb.height / 2; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty + (tb.y + tb.height + 10 - ty) * i / 10 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500); const t1 = await titles(tp);
  check(t1[0] !== t0[0] && t1[1] === t0[0], `${name}: Runde per Touch verschoben`); check(await waitSaved(tp), `${name}: gespeichert`);
  const ov = await tp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); check(ov <= 1, `${name}: kein horizontaler Überlauf`); await tp.screenshot({ path: `${SHOTS}/touch-${name}.png` }); await tp.close();
}
await browser.close(); srv.kill();
console.log(failures ? `\n${failures} Fehler` : '\nAlle Browser-Prüfungen bestanden'); process.exit(failures ? 1 : 0);
