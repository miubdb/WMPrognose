import { route, readJson } from '@/lib/http';
import { saveProfile } from '@/server/profile';
import { getProfile } from '@/server/api-util';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async ({ user }) => ({ profile: await getProfile(user.id) }));
export const PUT = route(async ({ req, user }) => ({ profile: await saveProfile(user.id, await readJson(req)) }));
