import { ZodError } from 'zod';
import { ApiError, unauthorized } from './errors';
import { assertSameOrigin, readCookie, SESSION_COOKIE, userFromToken, type AuthUser } from './auth';

export interface Ctx { req: Request; user: AuthUser; params: Record<string, string>; url: URL }

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof ApiError) return json({ error: { code: e.code, message: e.message, fields: e.fields } }, e.status);
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of e.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    return json({ error: { code: 'validation', message: 'Bitte prüfe deine Eingaben: ' + Object.entries(fields).map(([k, v]) => (k === '_' ? v : `${k}: ${v}`)).join('; '), fields } }, 422);
  }
  const pg = e as { code?: string; constraint?: string; message?: string };
  if (pg?.code === '23505') return json({ error: { code: 'conflict', message: 'Dieser Eintrag existiert bereits.' } }, 409);
  if (pg?.code === '23503') return json({ error: { code: 'conflict', message: 'Der Eintrag verweist auf nicht vorhandene Daten.' } }, 409);
  if (pg?.code === '23514' || pg?.code === '22P02' || pg?.code === '22007' || pg?.code === '22008' || pg?.code === '22003') {
    return json({ error: { code: 'validation', message: 'Ein Wert liegt außerhalb des zulässigen Bereichs oder hat ein ungültiges Format.' } }, 422);
  }
  if (e instanceof SyntaxError) return json({ error: { code: 'bad_request', message: 'Die Anfrage enthält kein gültiges JSON.' } }, 400);
  console.error('[api] Unerwarteter Fehler:', e);
  return json({ error: { code: 'internal', message: 'Interner Fehler. Bitte versuche es später erneut.' } }, 500);
}

type Handler = (ctx: Ctx) => Promise<Response | unknown>;
type Opts = { auth?: boolean };

/** Wrapper für Route-Handler: Auth, CSRF-Prüfung, einheitliche Fehlerbehandlung. */
export function route(handler: Handler, opts: Opts = {}) {
  return async (req: Request, routeCtx?: { params?: Record<string, string> }): Promise<Response> => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req);
      let user: AuthUser | null = null;
      if (opts.auth !== false) {
        user = await userFromToken(readCookie(req.headers.get('cookie'), SESSION_COOKIE));
        if (!user) throw unauthorized();
      }
      const out = await handler({ req, user: user as AuthUser, params: routeCtx?.params ?? {}, url: new URL(req.url) });
      return out instanceof Response ? out : json(out);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson(req: Request, maxBytes = 2_000_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, 'too_large', 'Die Anfrage ist zu groß.');
  if (!text) return {};
  return JSON.parse(text);
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
}
