// Erzeugt PNG-Icons (apple-touch-icon, PWA-Icons) aus public/icon.svg mit dem vorinstallierten Chromium.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const svg = fs.readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname, omitBackground: false });
  await page.close();
}
await browser.close();
console.log('Icons erzeugt');
