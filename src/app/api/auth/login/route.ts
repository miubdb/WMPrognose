import { route, readJson, json, clientIp } from '@/lib/http';
import { createSession, loginUser, sessionCookie, validateCredentials } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req }) => {
  const body = (await readJson(req)) as { email?: unknown; password?: unknown };
  const { email, password } = validateCredentials(body.email, body.password);
  const user = await loginUser(email, password, clientIp(req));
  const { token, expires } = await createSession(user.id);
  return json({ user }, 200, { 'set-cookie': sessionCookie(token, expires) });
}, { auth: false });
