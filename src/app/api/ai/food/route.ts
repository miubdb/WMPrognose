import { route, readJson } from '@/lib/http';
import { analyzeFoodPhoto } from '@/ai/food';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export const POST = route(async ({ req, user }) => analyzeFoodPhoto(user.id, await readJson(req, 6_000_000)));
