import { ONBOARDING_DEFAULTS } from '@/domain/defaults';

type Handler = (req: Request, ctx?: { params?: Record<string, string> }) => Promise<Response>;

export interface Session { cookie: string; email: string }

export async function call(handler: Handler, method: string, body?: unknown, opts: { cookie?: string; params?: Record<string, string>; query?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', host: 'localhost:3000', ...(opts.headers ?? {}) };
  if (opts.cookie) headers.cookie = opts.cookie;
  const req = new Request(`http://localhost:3000/api/x${opts.query ? '?' + opts.query : ''}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await handler(req, { params: opts.params });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}

export async function registerAndLogin(email: string, password = 'sehr-sicheres-passwort'): Promise<Session> {
  const { POST } = await import('@/app/api/auth/register/route');
  const r = await call(POST, 'POST', { email, password });
  if (r.status !== 201) throw new Error(`Registrierung fehlgeschlagen: ${JSON.stringify(r.json)}`);
  const setCookie = r.headers.get('set-cookie')!;
  return { cookie: setCookie.split(';')[0], email };
}

export async function onboard(s: Session, over: Record<string, unknown> = {}) {
  const { PUT } = await import('@/app/api/profile/route');
  const r = await call(PUT, 'PUT', { ...ONBOARDING_DEFAULTS, sex: 'm', birth_year: 1990, height_cm: 185, activity_level: 'moderate', ...over }, { cookie: s.cookie });
  if (r.status !== 200) throw new Error(`Onboarding fehlgeschlagen: ${JSON.stringify(r.json)}`);
  return r.json.profile;
}

export async function crud(s: Session, resource: string) {
  const list = (await import('@/app/api/r/[resource]/route'));
  const one = (await import('@/app/api/r/[resource]/[id]/route'));
  return {
    list: (query?: string) => call(list.GET, 'GET', undefined, { cookie: s.cookie, params: { resource }, query }),
    create: (body: unknown) => call(list.POST, 'POST', body, { cookie: s.cookie, params: { resource } }),
    get: (id: string) => call(one.GET, 'GET', undefined, { cookie: s.cookie, params: { resource, id } }),
    patch: (id: string, body: unknown) => call(one.PATCH, 'PATCH', body, { cookie: s.cookie, params: { resource, id } }),
    del: (id: string) => call(one.DELETE, 'DELETE', undefined, { cookie: s.cookie, params: { resource, id } }),
  };
}
