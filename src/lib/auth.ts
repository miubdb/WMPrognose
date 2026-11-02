import crypto from 'node:crypto';
import { query, queryOne } from './db';
import { badRequest, conflict, forbidden, tooMany, unauthorized } from './errors';

export const SESSION_COOKIE = 'rtm_session';
const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export interface AuthUser { id: string; email: string }

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
      throw new Error('SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen.');
    }
    return 'dev-only-secret-dev-only-secret-dev-only';
  }
  return s;
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', secret()).update(token).digest('hex');
}

function scrypt(password: string, salt: Buffer, keylen: number, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, keylen, { N, r, p, maxmem: 128 * N * r * 2 }, (e, k) => (e ? reject(e) : resolve(k))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.keylen, SCRYPT.N, SCRYPT.r, SCRYPT.p);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, N, r, p, salt, key] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, +N, +r, +p);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function validateCredentials(email: unknown, password: unknown): { email: string; password: string } {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 200) {
    throw badRequest('Bitte eine gültige E-Mail-Adresse angeben.', { email: 'Ungültige E-Mail-Adresse' });
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) {
    throw badRequest('Das Passwort muss mindestens 10 Zeichen lang sein.', { password: 'Mindestens 10 Zeichen' });
  }
  return { email: email.trim().toLowerCase(), password };
}

export async function registrationOpen(): Promise<boolean> {
  if (process.env.ALLOW_REGISTRATION === 'true') return true;
  const row = await queryOne<{ n: number }>('SELECT count(*)::int AS n FROM users');
  return (row?.n ?? 0) === 0;
}

export async function registerUser(email: string, password: string): Promise<AuthUser> {
  if (!(await registrationOpen())) {
    throw forbidden('Die Registrierung ist geschlossen. Setze ALLOW_REGISTRATION=true, um weitere Konten zuzulassen.');
  }
  const hash = await hashPassword(password);
  try {
    const row = await queryOne<AuthUser>('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', [email, hash]);
    return row!;
  } catch (e) {
    if ((e as { code?: string }).code === '23505') throw conflict('Für diese E-Mail-Adresse existiert bereits ein Konto.');
    throw e;
  }
}

const MAX_FAILED = 8;
const WINDOW_MIN = 15;

export async function loginUser(email: string, password: string, ip: string): Promise<AuthUser> {
  const key = `${email}|${ip}`;
  const failed = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM login_attempts WHERE key = $1 AND at > now() - make_interval(mins => $2)`,
    [key, WINDOW_MIN],
  );
  if ((failed?.n ?? 0) >= MAX_FAILED) {
    throw tooMany(`Zu viele fehlgeschlagene Anmeldeversuche. Bitte in ${WINDOW_MIN} Minuten erneut versuchen.`);
  }
  const row = await queryOne<AuthUser & { password_hash: string }>('SELECT id, email, password_hash FROM users WHERE lower(email) = $1', [email]);
  // Konstante Arbeit auch bei unbekanntem Konto (Timing)
  const ok = row ? await verifyPassword(password, row.password_hash) : (await verifyPassword(password, DUMMY_HASH), false);
  if (!row || !ok) {
    await query('INSERT INTO login_attempts (key) VALUES ($1)', [key]);
    throw unauthorized('E-Mail oder Passwort ist falsch.');
  }
  await query('DELETE FROM login_attempts WHERE key = $1', [key]);
  return { id: row.id, email: row.email };
}
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, hashToken(token), expires]);
  await query('DELETE FROM sessions WHERE expires_at < now()');
  return { token, expires };
}

export async function destroySession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function userFromToken(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null;
  return queryOne<AuthUser>(
    `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export function sessionCookie(token: string, expires: Date): string {
  const secure = process.env.COOKIE_SECURE === 'false' ? '' : process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${secure}`;
}
export function clearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** CSRF-Schutz für schreibende Requests: Origin muss zum Host passen. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin) {
    let ok = false;
    try { ok = new URL(origin).host === host; } catch { ok = false; }
    if (!ok) throw forbidden('Anfrage von fremder Herkunft abgelehnt.');
    return;
  }
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw forbidden('Anfrage von fremder Herkunft abgelehnt.');
  // Ohne Origin/Sec-Fetch-Site (z. B. Server-zu-Server, Tests) greift SameSite=Lax für Cookies.
}
