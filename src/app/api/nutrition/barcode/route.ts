import { route } from '@/lib/http';
import { lookupBarcode } from '@/server/barcode';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const GET = route(async ({ url }) => ({ product: await lookupBarcode(url.searchParams.get('code') ?? '') }));
