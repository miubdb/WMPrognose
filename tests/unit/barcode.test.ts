import { describe, expect, it } from 'vitest';
import { lookupBarcode } from '@/server/barcode';

const resp = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('Open-Food-Facts-Lookup (HTTP-Antworten simuliert, Verhalten der Anbindung)', () => {
  it('liest Nährwerte pro 100 g', async () => {
    const r = await lookupBarcode('3017620422003', resp(200, { status: 1, product: { product_name: 'Haselnuss-Aufstrich', brands: 'X', serving_quantity: '15', nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 } } }));
    expect(r).toMatchObject({ name: 'Haselnuss-Aufstrich', kcal_100g: 539, protein_100g: 6.3, carbs_100g: 57.5, fat_100g: 30.9, serving_g: 15 });
  });
  it('rechnet kJ in kcal um, wenn kcal fehlt', async () => {
    const r = await lookupBarcode('12345678', resp(200, { status: 1, product: { product_name: 'A', nutriments: { 'energy-kj_100g': 418.4 } } }));
    expect(r.kcal_100g).toBe(100);
  });
  it('meldet fehlende Produkte / Nährwerte / Netzfehler verständlich', async () => {
    await expect(lookupBarcode('12345678', resp(404, {}))).rejects.toThrow(/kein Produkt/);
    await expect(lookupBarcode('12345678', resp(200, { status: 0 }))).rejects.toThrow(/kein Produkt/);
    await expect(lookupBarcode('12345678', resp(200, { status: 1, product: { product_name: 'A', nutriments: {} } }))).rejects.toThrow(/keine Nährwerte/);
    await expect(lookupBarcode('12345678', (async () => { throw new Error('offline'); }) as unknown as typeof fetch)).rejects.toThrow(/nicht erreichbar/);
    await expect(lookupBarcode('12ab', resp(200, {}))).rejects.toThrow(/Ziffern/);
  });
});
