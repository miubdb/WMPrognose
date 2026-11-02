// Open Food Facts (offizielle, dokumentierte REST-API v2): https://openfoodfacts.github.io/openfoodfacts-server/api/
import { ApiError, badRequest, notFound, unprocessable } from '@/lib/errors';

export interface BarcodeResult {
  barcode: string; name: string; brand: string | null;
  kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number; serving_g: number | null;
  source: 'openfoodfacts';
}

type Fetch = typeof fetch;

export async function lookupBarcode(code: string, doFetch: Fetch = fetch): Promise<BarcodeResult> {
  if (!/^\d{8,14}$/.test(code)) throw badRequest('Ein Barcode besteht aus 8 bis 14 Ziffern.');
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_quantity`;
  let res: Response;
  try {
    res = await doFetch(url, { headers: { 'user-agent': process.env.OFF_USER_AGENT ?? 'RoadToMatchday/1.0 (self-hosted)' }, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new ApiError(503, 'unavailable', 'Open Food Facts ist gerade nicht erreichbar. Bitte später erneut versuchen oder das Lebensmittel manuell anlegen.');
  }
  if (res.status === 404) throw notFound('Zu diesem Barcode gibt es kein Produkt bei Open Food Facts. Bitte manuell anlegen.');
  if (!res.ok) throw new ApiError(503, 'unavailable', `Open Food Facts hat mit Status ${res.status} geantwortet.`);
  const data = (await res.json()) as { status?: number; product?: { product_name?: string; brands?: string; serving_quantity?: number | string; nutriments?: Record<string, number | string> } };
  if (data.status === 0 || !data.product) throw notFound('Zu diesem Barcode gibt es kein Produkt bei Open Food Facts. Bitte manuell anlegen.');
  const n = data.product.nutriments ?? {};
  const get = (k: string) => (n[k] === undefined || n[k] === '' ? null : Number(n[k]));
  let kcal = get('energy-kcal_100g');
  if (kcal == null) { const kj = get('energy-kj_100g') ?? get('energy_100g'); if (kj != null) kcal = Math.round(kj / 4.184); }
  if (kcal == null || !Number.isFinite(kcal)) throw unprocessable('Für dieses Produkt sind bei Open Food Facts keine Nährwerte hinterlegt. Bitte manuell anlegen.');
  const serving = data.product.serving_quantity != null ? Number(data.product.serving_quantity) : NaN;
  return {
    barcode: code,
    name: (data.product.product_name || 'Unbenanntes Produkt').slice(0, 160),
    brand: data.product.brands ?? null,
    kcal_100g: Math.round(kcal * 10) / 10,
    protein_100g: Math.round((get('proteins_100g') ?? 0) * 10) / 10,
    carbs_100g: Math.round((get('carbohydrates_100g') ?? 0) * 10) / 10,
    fat_100g: Math.round((get('fat_100g') ?? 0) * 10) / 10,
    serving_g: Number.isFinite(serving) && serving > 0 ? serving : null,
    source: 'openfoodfacts',
  };
}
