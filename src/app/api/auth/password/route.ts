import { route, readJson, json } from '@/lib/http';
import { changePassword } from '@/server/account';
import { query } from '@/lib/db';
import { hashToken, readCookie, SESSION_COOKIE } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req, user }) => {
  const out = await changePassword(user.id, await readJson(req));
  const cur = readCookie(req.headers.get('cookie'), SESSION_COOKIE);
  // alle anderen Sitzungen beenden
  await query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [user.id, hashToken(cur ?? '')]);
  return json(out);
});
