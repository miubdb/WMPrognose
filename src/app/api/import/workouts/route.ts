import { route, readJson } from '@/lib/http';
import { importWorkouts } from '@/server/imports';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req, user }) => importWorkouts(user.id, await readJson(req, 8_000_000)));
