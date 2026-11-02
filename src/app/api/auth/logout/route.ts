import { route, json } from '@/lib/http';
import { clearCookie, destroySession, readCookie, SESSION_COOKIE } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req }) => {
  const t = readCookie(req.headers.get('cookie'), SESSION_COOKIE);
  if (t) await destroySession(t);
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}, { auth: false });
