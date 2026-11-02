import { afterAll, describe, expect, it } from 'vitest';
import { closePool, query } from '@/lib/db';
import { call, registerAndLogin } from '../helpers/api';

afterAll(closePool);

describe('Authentifizierung', () => {
  it('Migrationen laufen und RLS ist auf allen Tabellen aktiv', async () => {
    const rows = await query<{ tablename: string; rowsecurity: boolean }>(`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`);
    expect(rows.length).toBeGreaterThan(15);
    for (const r of rows) if (r.tablename !== 'schema_migrations') expect(r.rowsecurity, r.tablename).toBe(true);
  });

  it('erste Registrierung ist offen, weitere sind ohne ALLOW_REGISTRATION geschlossen', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    await query('DELETE FROM users'); // leere Installation
    delete process.env.ALLOW_REGISTRATION;
    const first = await call(POST, 'POST', { email: 'erster@example.com', password: 'sehr-sicheres-passwort' });
    expect(first.status).toBe(201);
    expect(first.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(first.headers.get('set-cookie')).toMatch(/SameSite=Lax/);
    const second = await call(POST, 'POST', { email: 'zweiter@example.com', password: 'sehr-sicheres-passwort' });
    expect(second.status).toBe(403);
    expect(second.json.error.message).toMatch(/Registrierung/);
    process.env.ALLOW_REGISTRATION = 'true';
    const third = await call(POST, 'POST', { email: 'zweiter@example.com', password: 'sehr-sicheres-passwort' });
    expect(third.status).toBe(201);
  });

  it('lehnt schwache Passwörter, ungültige E-Mails und Duplikate ab', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    process.env.ALLOW_REGISTRATION = 'true';
    expect((await call(POST, 'POST', { email: 'a@b.de', password: 'kurz' })).status).toBe(400);
    expect((await call(POST, 'POST', { email: 'kaputt', password: 'sehr-sicheres-passwort' })).status).toBe(400);
    const dup = await call(POST, 'POST', { email: 'ERSTER@example.com', password: 'sehr-sicheres-passwort' });
    expect(dup.status).toBe(409);
  });

  it('speichert nur Hashes (Passwort scrypt, Session-Token HMAC)', async () => {
    const s = await registerAndLogin('hash@example.com');
    const u = (await query<{ password_hash: string }>(`SELECT password_hash FROM users WHERE email = 'hash@example.com'`))[0];
    expect(u.password_hash.startsWith('scrypt$')).toBe(true);
    expect(u.password_hash).not.toContain('sehr-sicheres');
    const token = decodeURIComponent(s.cookie.split('=')[1]);
    const sess = await query<{ token_hash: string }>('SELECT token_hash FROM sessions');
    expect(sess.some((x) => x.token_hash === token)).toBe(false);
  });

  it('Login, me, Logout', async () => {
    process.env.ALLOW_REGISTRATION = 'true';
    await registerAndLogin('login@example.com');
    const login = await import('@/app/api/auth/login/route');
    const me = await import('@/app/api/auth/me/route');
    const logout = await import('@/app/api/auth/logout/route');
    const bad = await call(login.POST, 'POST', { email: 'login@example.com', password: 'falsches-passwort-xx' });
    expect(bad.status).toBe(401);
    expect(bad.json.error.message).toBe('E-Mail oder Passwort ist falsch.');
    const ok = await call(login.POST, 'POST', { email: 'LOGIN@example.com', password: 'sehr-sicheres-passwort' });
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get('set-cookie')!.split(';')[0];
    const who = await call(me.GET, 'GET', undefined, { cookie });
    expect(who.json.user.email).toBe('login@example.com');
    expect(who.json.onboarded).toBe(false);
    await call(logout.POST, 'POST', {}, { cookie });
    expect((await call(me.GET, 'GET', undefined, { cookie })).status).toBe(401);
  });

  it('unbekanntes Konto und falsches Passwort sind nicht unterscheidbar; Rate-Limit greift', async () => {
    const login = await import('@/app/api/auth/login/route');
    const unknown = await call(login.POST, 'POST', { email: 'niemand@example.com', password: 'irgendein-passwort' });
    expect(unknown.json.error.message).toBe('E-Mail oder Passwort ist falsch.');
    let last = unknown;
    for (let i = 0; i < 9; i++) last = await call(login.POST, 'POST', { email: 'niemand@example.com', password: 'irgendein-passwort' });
    expect(last.status).toBe(429);
  });

  it('geschützte Routen verlangen Anmeldung', async () => {
    const dash = await import('@/app/api/dashboard/route');
    const res = await import('@/app/api/r/[resource]/route');
    expect((await call(dash.GET, 'GET')).status).toBe(401);
    expect((await call(res.GET, 'GET', undefined, { params: { resource: 'workouts' } })).status).toBe(401);
    expect((await call(res.GET, 'GET', undefined, { params: { resource: 'workouts' }, cookie: 'rtm_session=gefaelscht' })).status).toBe(401);
  });

  it('CSRF: schreibende Requests von fremder Herkunft werden abgelehnt', async () => {
    const s = await registerAndLogin('csrf@example.com');
    const res = await import('@/app/api/r/[resource]/route');
    const evil = await call(res.POST, 'POST', { kind: 'other', title: 'x', date: '2027-01-01' }, { cookie: s.cookie, params: { resource: 'events' }, headers: { origin: 'https://evil.example' } });
    expect(evil.status).toBe(403);
    const fetchSite = await call(res.POST, 'POST', { kind: 'other', title: 'x', date: '2027-01-01' }, { cookie: s.cookie, params: { resource: 'events' }, headers: { 'sec-fetch-site': 'cross-site' } });
    expect(fetchSite.status).toBe(403);
    const same = await call(res.POST, 'POST', { kind: 'other', title: 'x', date: '2027-01-01' }, { cookie: s.cookie, params: { resource: 'events' }, headers: { origin: 'http://localhost:3000' } });
    expect(same.status).toBe(201);
  });

  it('Passwort ändern beendet andere Sitzungen', async () => {
    const s = await registerAndLogin('pw@example.com');
    const login = await import('@/app/api/auth/login/route');
    const other = await call(login.POST, 'POST', { email: 'pw@example.com', password: 'sehr-sicheres-passwort' });
    const otherCookie = other.headers.get('set-cookie')!.split(';')[0];
    const pw = await import('@/app/api/auth/password/route');
    const me = await import('@/app/api/auth/me/route');
    expect((await call(pw.POST, 'POST', { current_password: 'falsch-falsch-xx', new_password: 'neues-passwort-123' }, { cookie: s.cookie })).status).toBe(403);
    expect((await call(pw.POST, 'POST', { current_password: 'sehr-sicheres-passwort', new_password: 'neues-passwort-123' }, { cookie: s.cookie })).status).toBe(200);
    expect((await call(me.GET, 'GET', undefined, { cookie: s.cookie })).status).toBe(200);
    expect((await call(me.GET, 'GET', undefined, { cookie: otherCookie })).status).toBe(401);
    expect((await call(login.POST, 'POST', { email: 'pw@example.com', password: 'neues-passwort-123' })).status).toBe(200);
  });
});
