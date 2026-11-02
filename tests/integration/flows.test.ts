import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, query } from '@/lib/db';
import { call, crud, onboard, registerAndLogin, type Session } from '../helpers/api';
import { weekday } from '@/domain/dates';

afterAll(closePool);
let A: Session, B: Session;

async function setAvailability(s: Session) {
  const { PUT } = await import('@/app/api/availability/route');
  const mins = [60, 75, 0, 90, 45, 120, 90];
  const days = mins.map((m, i) => ({ weekday: i + 1, available_minutes: m, team_training: i === 2, team_training_minutes: i === 2 ? 90 : 0 }));
  const r = await call(PUT, 'PUT', { days }, { cookie: s.cookie });
  expect(r.status, JSON.stringify(r.json)).toBe(200);
}

beforeAll(async () => {
  process.env.ALLOW_REGISTRATION = 'true';
  A = await registerAndLogin('flow-a@example.com');
  B = await registerAndLogin('flow-b@example.com');
});

describe('Onboarding & Profil', () => {
  it('Vor dem Onboarding sind Dashboard und Plan-Generator gesperrt (klare Meldung)', async () => {
    const dash = await import('@/app/api/dashboard/route');
    const r = await call(dash.GET, 'GET', undefined, { cookie: A.cookie });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('onboarding_required');
  });
  it('legt Profil, Start-Gewicht, Start-FTP und Verfügbarkeit an', async () => {
    const p = await onboard(A);
    expect(p).toMatchObject({ start_date: '2026-11-02', first_friendly_date: '2027-02-06', main_goal_date: '2027-03-07', start_weight_kg: 91.45, target_weight_kg: 86, start_ftp_w: 236 });
    const w = await (await crud(A, 'weights')).list();
    expect(w.json.rows[0]).toMatchObject({ date: '2026-11-02', weight_kg: 91.45 });
    const f = await (await crud(A, 'ftp-tests')).list();
    expect(f.json.rows[0]).toMatchObject({ ftp_w: 236, method: 'initial' });
    const av = await import('@/app/api/availability/route');
    expect((await call(av.GET, 'GET', undefined, { cookie: A.cookie })).json.days).toHaveLength(7);
  });
  it('validiert Meilensteine', async () => {
    const { PUT } = await import('@/app/api/profile/route');
    const r = await call(PUT, 'PUT', { start_date: '2026-11-02', first_friendly_date: '2026-10-01', main_goal_date: '2027-03-07', start_weight_kg: 91.45, target_weight_kg: 86, start_ftp_w: 236 }, { cookie: B.cookie });
    expect(r.status).toBe(422);
    expect(r.json.error.fields.first_friendly_date).toMatch(/nach dem Start/);
  });
  it('Profil lässt sich ändern, ohne Messwerte zu überschreiben', async () => {
    const { PUT, GET } = await import('@/app/api/profile/route');
    const cur = (await call(GET, 'GET', undefined, { cookie: A.cookie })).json.profile;
    const { user_id, onboarded_at, ...rest } = cur;
    void user_id; void onboarded_at;
    const r = await call(PUT, 'PUT', { ...rest, target_weight_kg: 87 }, { cookie: A.cookie });
    expect(r.json.profile.target_weight_kg).toBe(87);
    const w = await (await crud(A, 'weights')).list();
    expect(w.json.rows.filter((x: { date: string }) => x.date === '2026-11-02')).toHaveLength(1);
    await call(PUT, 'PUT', { ...rest, target_weight_kg: 86 }, { cookie: A.cookie });
  });
  it('Verfügbarkeit: Team-Training braucht Dauer; 7 Tage Pflicht', async () => {
    const { PUT } = await import('@/app/api/availability/route');
    const days = [1, 2, 3, 4, 5, 6, 7].map((w) => ({ weekday: w, available_minutes: 30, team_training: w === 3, team_training_minutes: 0 }));
    expect((await call(PUT, 'PUT', { days }, { cookie: A.cookie })).status).toBe(422);
    expect((await call(PUT, 'PUT', { days: days.slice(0, 5) }, { cookie: A.cookie })).status).toBe(422);
  });
});

describe('Trainingsplan', () => {
  it('generiert den Plan bis zum Hauptziel, speichert ihn und meldet nicht platzierbare Einheiten', async () => {
    await setAvailability(A);
    const { POST } = await import('@/app/api/plan/generate/route');
    const r = await call(POST, 'POST', { from: '2026-11-02', to: '2027-03-07' }, { cookie: A.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.created).toBeGreaterThan(60);
    expect(Array.isArray(r.json.unplaced)).toBe(true);
    const rows = await query<{ date: string; type: string; source: string; phase: string }>(`SELECT date, type, source, phase FROM plan_sessions WHERE user_id = (SELECT id FROM users WHERE email = 'flow-a@example.com')`);
    expect(rows.length).toBe(r.json.created);
    expect(rows.filter((x) => x.type === 'spiel').map((x) => x.date).sort()).toEqual(['2027-02-06', '2027-03-07']);
    expect(rows.every((x) => x.source === 'generator')).toBe(true);
    expect(rows.some((x) => x.phase === 'spezifisch')).toBe(true);
  });
  it('erneutes Generieren ersetzt nur geplante Generator-Einheiten; manuelle & erledigte bleiben', async () => {
    const plan = await crud(A, 'plan-sessions');
    const manual = await plan.create({ date: '2026-11-12', type: 'mobilitaet', title: 'Eigene Einheit', duration_min: 20, intensity: 1 });
    const list = await plan.list('from=2026-11-02&to=2026-11-08');
    const toDone = list.json.rows.find((r: { type: string }) => r.type === 'kraft');
    await plan.patch(toDone.id, { status: 'done' });
    const { POST } = await import('@/app/api/plan/generate/route');
    const r = await call(POST, 'POST', { from: '2026-11-02', to: '2026-11-15' }, { cookie: A.cookie });
    expect(r.status).toBe(200);
    expect(r.json.deleted).toBeGreaterThan(0);
    expect((await plan.get(manual.json.row.id)).status).toBe(200);
    expect((await plan.get(toDone.id)).status).toBe(200);
    const after = await plan.list('from=2026-11-02&to=2026-11-15');
    expect(after.json.rows.filter((x: { id: string }) => x.id === toDone.id)).toHaveLength(1);
  });
  it('plant nie an Tagen ohne Zeit (Mittwoch nur Mannschaftstraining)', async () => {
    const plan = await crud(A, 'plan-sessions');
    const rows = (await plan.list('from=2026-11-02&to=2027-03-07')).json.rows;
    const wed = rows.filter((r: { date: string; source: string }) => weekday(r.date) === 3 && r.source === 'generator');
    expect(wed.every((r: { type: string }) => r.type === 'mannschaft' || r.type === 'spiel')).toBe(true);
  });
  it('Nutzer B hat keinen Zugriff auf Pläne von A; Generieren wirkt nur auf eigene Daten', async () => {
    await onboard(B);
    const { POST } = await import('@/app/api/plan/generate/route');
    const before = await query<{ n: number }>(`SELECT count(*)::int AS n FROM plan_sessions WHERE user_id = (SELECT id FROM users WHERE email = 'flow-a@example.com')`);
    await call(POST, 'POST', { from: '2026-11-02', to: '2026-11-15' }, { cookie: B.cookie });
    const after = await query<{ n: number }>(`SELECT count(*)::int AS n FROM plan_sessions WHERE user_id = (SELECT id FROM users WHERE email = 'flow-a@example.com')`);
    expect(after[0].n).toBe(before[0].n);
  });
  it('validiert den Zeitraum', async () => {
    const { POST } = await import('@/app/api/plan/generate/route');
    expect((await call(POST, 'POST', { from: '2027-03-01', to: '2027-02-01' }, { cookie: A.cookie })).status).toBe(400);
    expect((await call(POST, 'POST', { from: '2026-11-02', to: '2027-12-31' }, { cookie: A.cookie })).status).toBe(400);
    expect((await call(POST, 'POST', { from: 'morgen' }, { cookie: A.cookie })).status).toBe(422);
  });
});

describe('Änderungsvorschläge (Bestätigungspflicht)', () => {
  it('Vorschlag wird gespeichert, aber NICHT angewendet; erst Bestätigung ändert den Plan', async () => {
    const { storeProposal } = await import('@/server/proposals');
    const plan = await crud(A, 'plan-sessions');
    const userId = (await query<{ id: string }>(`SELECT id FROM users WHERE email = 'flow-a@example.com'`))[0].id;
    const target = (await query<{ id: string; date: string; title: string }>(`SELECT id, date, title FROM plan_sessions WHERE user_id = $1 AND date >= '2026-11-06' AND status = 'planned' AND type <> 'spiel' ORDER BY date LIMIT 1`, [userId]))[0];
    const p = await storeProposal(userId, 'ai', { summary: 'Test', changes: [{ op: 'update', id: target.id, patch: { title: 'Von der KI geändert' }, reason: 'Test' }] }) as { id: string };
    expect((await plan.get(target.id)).json.row.title).toBe(target.title); // unverändert
    const dec = await import('@/app/api/proposals/[id]/route');
    const acc = await call(dec.POST, 'POST', { decision: 'accept' }, { cookie: A.cookie, params: { id: p.id } });
    expect(acc.status, JSON.stringify(acc.json)).toBe(200);
    expect((await plan.get(target.id)).json.row.title).toBe('Von der KI geändert');
    expect((await call(dec.POST, 'POST', { decision: 'accept' }, { cookie: A.cookie, params: { id: p.id } })).status).toBe(409);
  });
  it('Ablehnen ändert nichts; fremde Vorschläge sind nicht erreichbar; veraltete werden abgelehnt', async () => {
    const { storeProposal } = await import('@/server/proposals');
    const userId = (await query<{ id: string }>(`SELECT id FROM users WHERE email = 'flow-a@example.com'`))[0].id;
    const t = (await query<{ id: string; title: string }>(`SELECT id, title FROM plan_sessions WHERE user_id = $1 AND status = 'planned' AND type <> 'spiel' AND date >= '2026-11-06' ORDER BY date LIMIT 1`, [userId]))[0];
    const plan = await crud(A, 'plan-sessions');
    const dec = await import('@/app/api/proposals/[id]/route');
    const p1 = await storeProposal(userId, 'ai', { summary: 'x', changes: [{ op: 'delete', id: t.id, reason: 'r' }] }) as { id: string };
    expect((await call(dec.POST, 'POST', { decision: 'reject' }, { cookie: A.cookie, params: { id: p1.id } })).json.status).toBe('rejected');
    expect((await plan.get(t.id)).status).toBe(200);
    // fremder Nutzer
    const p2 = await storeProposal(userId, 'ai', { summary: 'y', changes: [{ op: 'delete', id: t.id, reason: 'r' }] }) as { id: string };
    expect((await call(dec.POST, 'POST', { decision: 'accept' }, { cookie: B.cookie, params: { id: p2.id } })).status).toBe(404);
    // veraltet: Einheit wird vorher gelöscht
    await plan.del(t.id);
    const stale = await call(dec.POST, 'POST', { decision: 'accept' }, { cookie: A.cookie, params: { id: p2.id } });
    expect(stale.status).toBe(409);
    expect(stale.json.error.message).toMatch(/nicht mehr/);
  });
  it('lehnt Vorschläge mit erfundenen Einheiten schon beim Speichern ab', async () => {
    const { storeProposal } = await import('@/server/proposals');
    const userId = (await query<{ id: string }>(`SELECT id FROM users WHERE email = 'flow-a@example.com'`))[0].id;
    await expect(storeProposal(userId, 'ai', { summary: 'x', changes: [{ op: 'delete', id: '99999999-9999-4999-8999-999999999999', reason: 'r' }] })).rejects.toThrow(/existiert nicht/);
  });
});

describe('Regelvorschlag & Tagesform', () => {
  it('ohne Daten keine Anpassung; mit schlechter Tagesform und harter Einheit wird ein Vorschlag erzeugt', async () => {
    const chk = await import('@/app/api/proposals/check/route');
    const none = await call(chk.POST, 'POST', {}, { cookie: B.cookie });
    expect(none.status).toBe(200);
    expect(none.json.proposal).toBeNull();
  });
  it('schlechte Tagesform + harte Einheit in 3 Tagen → Vorschlag (pending), Übernahme erst nach Bestätigung', async () => {
    const rd = await crud(B, 'readiness');
    const bad = { sleep_hours: 4.5, sleep_quality: 1, soreness: 5, energy: 1, mood: 2, stress: 5 };
    await rd.create({ date: '2026-11-03', ...bad });
    await rd.create({ date: '2026-11-04', ...bad });
    const plan = await crud(B, 'plan-sessions');
    const hard = await plan.create({ date: '2026-11-07', type: 'rad', title: 'Harte Intervalle', duration_min: 60, intensity: 3 });
    const chk = await import('@/app/api/proposals/check/route');
    const r = await call(chk.POST, 'POST', {}, { cookie: B.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.proposal.status).toBe('pending');
    expect(r.json.proposal.source).toBe('rule');
    expect((await plan.get(hard.json.row.id)).json.row.intensity).toBe(3);
    expect((await call(chk.POST, 'POST', {}, { cookie: B.cookie })).status).toBe(409);
    const dec = await import('@/app/api/proposals/[id]/route');
    expect((await call(dec.POST, 'POST', { decision: 'accept' }, { cookie: B.cookie, params: { id: r.json.proposal.id } })).status).toBe(200);
    const after = (await plan.get(hard.json.row.id)).json.row;
    expect(after.intensity).toBe(1);
    expect(after.title).toMatch(/reduziert/);
    const lst = await import('@/app/api/proposals/route');
    expect((await call(lst.GET, 'GET', undefined, { cookie: B.cookie, query: 'status=pending' })).json.proposals).toHaveLength(0);
  });
});

describe('Importe', () => {
  it('Trainingsimport: dedupliziert über externalId und rechnet TSS', async () => {
    const { POST } = await import('@/app/api/import/workouts/route');
    const act = { source: 'fit', date: '2026-11-03', startTime: '2026-11-03T17:00:00.000Z', durationMin: 60, distanceKm: 30, avgPowerW: 200, normalizedPowerW: 236, avgHr: 140, maxHr: 170, elevationM: 100, kcal: 700, type: 'rad', title: 'Radfahren (FIT-Import)', externalId: 'fit:2026-11-03T17:00:00.000Z:3600' };
    const r1 = await call(POST, 'POST', { activities: [act] }, { cookie: A.cookie });
    expect(r1.json).toEqual({ imported: 1, duplicates: 0 });
    const r2 = await call(POST, 'POST', { activities: [act] }, { cookie: A.cookie });
    expect(r2.json).toEqual({ imported: 0, duplicates: 1 });
    const w = (await (await crud(A, 'workouts')).list()).json.rows.find((x: { external_id: string }) => x.external_id === act.externalId);
    expect(w.tss).toBe(100);
    // derselbe Datei-Fingerprint bei Nutzer B ist erlaubt (Eindeutigkeit je Nutzer)
    expect((await call(POST, 'POST', { activities: [act] }, { cookie: B.cookie })).json.imported).toBe(1);
  });
  it('Gewichtsimport: überspringt vorhandene Tage, überschreibt optional', async () => {
    const { POST } = await import('@/app/api/import/weights/route');
    const rows = [{ date: '2026-11-02', weight_kg: 99 }, { date: '2026-11-21', weight_kg: 90.1, body_fat_pct: 22 }];
    expect((await call(POST, 'POST', { rows }, { cookie: A.cookie })).json).toEqual({ imported: 1, skipped: 1 });
    expect((await call(POST, 'POST', { rows, overwrite: true }, { cookie: A.cookie })).json).toEqual({ imported: 2, skipped: 0 });
    const w = (await (await crud(A, 'weights')).list()).json.rows.find((x: { date: string }) => x.date === '2026-11-02');
    expect(w.weight_kg).toBe(99);
  });
  it('Ruhepuls-Import erhält vorhandene Check-in-Werte', async () => {
    const r = await crud(A, 'readiness');
    await r.create({ date: '2026-11-22', sleep_hours: 7, energy: 4, sleep_quality: 4 });
    const { POST } = await import('@/app/api/import/resting-hr/route');
    await call(POST, 'POST', { rows: [{ date: '2026-11-22', resting_hr: 55 }, { date: '2026-11-23', resting_hr: 57 }] }, { cookie: A.cookie });
    const rows = (await r.list()).json.rows;
    const d = rows.find((x: { date: string }) => x.date === '2026-11-22');
    expect(d).toMatchObject({ resting_hr: 55, sleep_hours: 7, energy: 4 });
    expect(rows.some((x: { date: string }) => x.date === '2026-11-23')).toBe(true);
  });
  it('lehnt ungültige Importdaten ab', async () => {
    const { POST } = await import('@/app/api/import/workouts/route');
    expect((await call(POST, 'POST', { activities: [] }, { cookie: A.cookie })).status).toBe(422);
    expect((await call(POST, 'POST', { activities: [{ foo: 1 }] }, { cookie: A.cookie })).status).toBe(422);
  });
});

describe('Dashboard & Statistik', () => {
  it('liefert echte Daten ohne Platzhalter', async () => {
    const dash = await import('@/app/api/dashboard/route');
    const r = await call(dash.GET, 'GET', undefined, { cookie: A.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    const d = r.json;
    expect(d.countdown).toHaveProperty('firstFriendly');
    expect(d.weight.latest).toBeTruthy();
    expect(d.ftp.start).toBe(236);
    expect(d.nutrition.target).not.toBeUndefined();
    expect(d.dataQuality.workoutsWithoutTss).toBeGreaterThanOrEqual(0);
    expect(d.profile.main_goal_date).toBe('2027-03-07');
  });
  it('Statistik-Endpunkte', async () => {
    const { GET } = await import('@/app/api/stats/route');
    for (const kind of ['pmc', 'weight', 'ftp', 'readiness', 'gk']) {
      const r = await call(GET, 'GET', undefined, { cookie: A.cookie, query: `kind=${kind}` });
      expect(r.status, kind + JSON.stringify(r.json)).toBe(200);
    }
    expect((await call(GET, 'GET', undefined, { cookie: A.cookie, query: 'kind=foo' })).status).toBe(400);
  });
  it('Ernährungs-Tageswerte inkl. Ziel (Defizit Richtung Zielgewicht)', async () => {
    const { GET } = await import('@/app/api/nutrition/day/route');
    const r = await call(GET, 'GET', undefined, { cookie: A.cookie, query: 'date=2026-11-04' });
    expect(r.status).toBe(200);
    expect(r.json.target.kcal).toBeGreaterThan(1500);
    expect(r.json.target.deficitKcal).toBeGreaterThan(0);
    expect(r.json.entries).toBeDefined();
  });
  it('Ernährungsziel fehlt ehrlich, wenn Körperdaten fehlen', async () => {
    const C = await registerAndLogin('flow-c@example.com');
    await onboard(C, { sex: null, birth_year: null, height_cm: null });
    const { GET } = await import('@/app/api/nutrition/day/route');
    const r = await call(GET, 'GET', undefined, { cookie: C.cookie, query: 'date=2026-11-04' });
    expect(r.json.target).toBeNull();
    expect(r.json.missing).toEqual(['Geschlecht', 'Körpergröße', 'Geburtsjahr']);
  });
});

describe('Datenschutz: Export & Löschung', () => {
  it('Export enthält alle eigenen Daten und keine fremden', async () => {
    const { GET } = await import('@/app/api/account/export/route');
    const r = await call(GET, 'GET', undefined, { cookie: A.cookie });
    expect(r.status).toBe(200);
    expect(r.json.user.email).toBe('flow-a@example.com');
    expect(r.json.workouts.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.json)).not.toContain('flow-b@example.com');
    expect(JSON.stringify(r.json)).not.toContain('password_hash');
  });
  it('Konto löschen verlangt das Passwort und entfernt sämtliche Daten', async () => {
    const D = await registerAndLogin('flow-d@example.com');
    await onboard(D);
    const { DELETE } = await import('@/app/api/account/route');
    expect((await call(DELETE, 'DELETE', { password: 'falsch-falsch-falsch' }, { cookie: D.cookie })).status).toBe(403);
    expect((await call(DELETE, 'DELETE', { password: 'sehr-sicheres-passwort' }, { cookie: D.cookie })).status).toBe(200);
    const id = await query(`SELECT id FROM users WHERE email = 'flow-d@example.com'`);
    expect(id).toHaveLength(0);
    for (const t of ['profiles', 'weight_entries', 'ftp_tests', 'availability', 'sessions']) {
      const left = await query(`SELECT 1 FROM ${t} t WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id)`);
      expect(left, t).toHaveLength(0);
    }
    const me = await import('@/app/api/auth/me/route');
    expect((await call(me.GET, 'GET', undefined, { cookie: D.cookie })).status).toBe(401);
  });
});
