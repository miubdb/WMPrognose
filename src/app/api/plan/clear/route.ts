import { route, readJson } from '@/lib/http';
import { clearGenerated } from '@/server/plan';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req, user }) => clearGenerated(user.id, await readJson(req)));
