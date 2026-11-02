import { route, readJson, json } from '@/lib/http';
import { clearCookie } from '@/lib/auth';
import { deleteAccount } from '@/server/account';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const DELETE = route(async ({ req, user }) => json(await deleteAccount(user.id, await readJson(req)), 200, { 'set-cookie': clearCookie() }));
