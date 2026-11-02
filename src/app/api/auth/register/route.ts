import { route, readJson, json, clientIp } from '@/lib/http';
import { createSession, registerUser, sessionCookie, validateCredentials } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async ({ req }) => {
  const body = (await readJson(req)) as { email?: unknown; password?: unknown };
  const { email, password } = validateCredentials(body.email, body.password);
  void clientIp;
  const user = await registerUser(email, password);
  const { token, expires } = await createSession(user.id);
  return json({ user }, 201, { 'set-cookie': sessionCookie(token, expires) });
}, { auth: false });
