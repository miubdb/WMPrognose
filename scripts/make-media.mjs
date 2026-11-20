// Erzeugt die mitgelieferten Medien für PIXELPANIK (Bildstufen aus Emojis) und TONSPUR (selbst synthetisierte Geräusche) → content/media.generated.ts.
// Alles selbst erzeugt bzw. Apache-2.0 (Noto Emoji) – frei nutzbar, offline. Aufruf: node scripts/make-media.mjs
import { createRequire } from 'node:module'; import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const MOTIFS = { 'pix-pokal': '🏆', 'pix-tor': '🥅', 'pix-statue': '🗽', 'pix-rakete': '🚀' };
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 500, height: 500 } }); await page.setContent('<canvas id=c width=480 height=480></canvas>');
const pixel = {};
for (const [id, em] of Object.entries(MOTIFS)) {
  pixel[id] = await page.evaluate(([emoji]) => {
    const S = 480, cv = document.getElementById('c'), ctx = cv.getContext('2d'); ctx.fillStyle = '#1a1f3a'; ctx.fillRect(0, 0, S, S); ctx.font = '340px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 240, 260);
    const src = document.createElement('canvas'); src.width = S; src.height = S; src.getContext('2d').drawImage(cv, 0, 0);
    return [6, 10, 18, 40, 0].map(n => { const o = document.createElement('canvas'); o.width = S; o.height = S; const c = o.getContext('2d'); if (!n) { c.drawImage(src, 0, 0); return o.toDataURL('image/png'); } const t = document.createElement('canvas'); t.width = n; t.height = n; const tc = t.getContext('2d'); tc.imageSmoothingEnabled = true; tc.drawImage(src, 0, 0, n, n); c.imageSmoothingEnabled = false; c.drawImage(t, 0, 0, S, S); return o.toDataURL('image/png'); });
  }, [em]);
}
await b.close();

// ---- Audio (WAV, 12 kHz, 16 Bit, mono)
const SR = 12000; const rnd = () => Math.random() * 2 - 1;
const wav = (f) => { const n = f.length, buf = Buffer.alloc(44 + n * 2); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, f[i])) * 32000 | 0, 44 + i * 2); return 'data:audio/wav;base64,' + buf.toString('base64'); };
const gen = (sec, fn) => Float32Array.from({ length: Math.floor(sec * SR) }, (_, i) => fn(i / SR));
const env = (t, a, b, c, d) => (t < a || t > d ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : (d - t) / (d - c));
const whistle = gen(2.6, t => { const e = env(t, 0.1, 0.15, 0.85, 0.95) + env(t, 1.3, 1.35, 2.2, 2.3); const f = 2700 + 80 * Math.sin(2 * Math.PI * 7 * t); return 0.5 * e * Math.sin(2 * Math.PI * f * t + 6 * Math.sin(2 * Math.PI * 38 * t)) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 38 * t)) + 0.03 * rnd(); });
const modem = gen(2.8, t => { const dt = [[697, 1209], [770, 1336], [852, 1477], [941, 1209], [697, 1336]]; if (t < 0.9) { const k = Math.floor(t / 0.18), ph = t % 0.18; const [a, c] = dt[k % 5]; return ph < 0.13 ? 0.35 * (Math.sin(2 * Math.PI * a * t) + Math.sin(2 * Math.PI * c * t)) : 0; } if (t < 1.4) return 0.5 * Math.sin(2 * Math.PI * (t < 1.15 ? 2100 : 1300) * t); const k = Math.floor((t - 1.4) / 0.07); return 0.38 * Math.sin(2 * Math.PI * [1200, 2400, 1800, 600, 2200][k % 5] * t) + 0.35 * rnd() * (k % 3 === 0 ? 1 : 0.4); });
let lp = 0, lp2 = 0; const crowd = gen(3.0, t => { lp += 0.35 * (rnd() - lp); lp2 += 0.12 * (lp - lp2); const swell = Math.min(1, t / 1.1) * Math.exp(-Math.max(0, t - 1.6) * 0.9); const roar = (0.85 * lp + 0.5 * lp2) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 3 * t) ** 2); const horn = t > 1.0 && t < 1.8 ? 0.12 * Math.sin(2 * Math.PI * 440 * t) : 0; return 1.3 * swell * roar + horn; });
const muffle = (f) => { let a = 0, b2 = 0; return Float32Array.from(f, x => { a += 0.12 * (x - a); b2 += 0.12 * (a - b2); return b2 * 1.6 + 0.04 * rnd(); }); };
const audio = { 'snd-pfiff': { a1: wav(muffle(whistle)), a2: wav(whistle) }, 'snd-modem': { a1: wav(muffle(modem)), a2: wav(modem) }, 'snd-jubel': { a1: wav(muffle(crowd)), a2: wav(crowd) } };

writeFileSync('content/media.generated.ts', `// GENERIERT von scripts/make-media.mjs – nicht von Hand ändern. Bilder: Noto Color Emoji (Apache-2.0); Töne: selbst synthetisiert (frei nutzbar).\nexport const PIXEL_MEDIA: Record<string, string[]> = ${JSON.stringify(pixel)};\nexport const AUDIO_MEDIA: Record<string, { a1: string; a2: string }> = ${JSON.stringify(audio)};\n`);
console.log('ok', Object.keys(pixel).length, 'Motive,', Object.keys(audio).length, 'Töne');
