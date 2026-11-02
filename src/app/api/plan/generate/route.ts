import { route, readJson } from '@/lib/http';
import { generateForUser } from '@/server/plan';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req, user }) => generateForUser(user.id, await readJson(req)));
