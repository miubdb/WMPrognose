import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, query } from '@/lib/db';
import { call, crud, onboard, registerAndLogin, type Session } from '../helpers/api';

afterAll(closePool);

let A: Session, B: Session;
beforeAll(async () => {
  process.env.ALLOW_REGISTRATION = 'true';
  A = await registerAndLogin('crud-a@example.com');
  B = await registerAndLogin('crud-b@example.com');
  await onboard(A);
  await onboard(B);
});

const SAMPLES: Record<string, { create: Record<string, unknown>; patch: Record<string, unknown>; field: string }> = {
  events: { create: { kind: 'match', title: 'Testspiel', date: '2027-02-20' }, patch: { title: 'Testspiel 2' }, field: 'title' },
  'ftp-tests': { create: { date: '2026-12-14', ftp_w: 244, method: '20min', test_value_w: 257 }, patch: { ftp_w: 246 }, field: 'ftp_w' },
  weights: { create: { date: '2026-11-09', weight_kg: 90.8 }, patch: { weight_kg: 90.6, body_fat_pct: 24.1 }, field: 'weight_kg' },
  'plan-sessions': { create: { date: '2026-11-10', type: 'rad', title: 'Locker', duration_min: 60, intensity: 1 }, patch: { duration_min: 75 }, field: 'duration_min' },
  workouts: { create: { date: '2026-11-04', type: 'rad', title: 'Ausfahrt', duration_min: 60, avg_power_w: 180, normalized_power_w: 190 }, patch: { title: 'Ausfahrt lang' }, field: 'title' },
  readiness: { create: { date: '2026-11-04', sleep_hours: 7.5, sleep_quality: 4, soreness: 2, energy: 4 }, patch: { energy: 5 }, field: 'energy' },
  foods: { create: { name: 'Haferflocken', kcal_100g: 370, protein_100g: 13, carbs_100g: 59, fat_100g: 7 }, patch: { kcal_100g: 372 }, field: 'kcal_100g' },
  'food-entries': { create: { date: '2026-11-04', meal: 'fruehstueck', name: 'Haferflocken', amount_g: 80, kcal: 296, protein_g: 10, carbs_g: 47, fat_g: 5.6 }, patch: { amount_g: 100 }, field: 'amount_g' },
  'gk-exercises': { create: { name: 'Reaktionsball', category: 'reaktion', default_sets: 3, default_reps: 10 }, patch: { default_sets: 4 }, field: 'default_sets' },
  'gk-sessions': { create: { date: '2026-11-05', title: 'Technik', duration_min: 60, items: [{ name: 'Reaktionsball', sets: 3, reps: 10 }] }, patch: { items: [{ name: 'Flanken', sets: 4 }] }, field: 'items' },
  'match-analyses': { create: { date: '2027-02-06', opponent: 'FC Test', goals_for: 1, goals_against: 2, shots_faced: 8, saves: 6, goals_against_notes: [{ minute: 12, description: 'Flanke zu spät', avoidable: true }] }, patch: { rating: 7, saves: 5 }, field: 'rating' },
  exceptions: { create: { date: '2026-11-20', available_minutes: 0, reason: 'Urlaub' }, patch: { available_minutes: 30 }, field: 'available_minutes' },
};

describe.each(Object.entries(SAMPLES))('CRUD %s', (resource, s) => {
  it('anlegen, lesen, ändern, löschen – persistent in der Datenbank', async () => {
    const api = await crud(A, resource);
    const created = await api.create(s.create);
    expect(created.status, JSON.stringify(created.json)).toBe(201);
    const id = created.json.row.id;

    const list = await api.list();
    expect(list.json.rows.some((r: { id: string }) => r.id === id)).toBe(true);

    const patched = await api.patch(id, s.patch);
    expect(patched.status, JSON.stringify(patched.json)).toBe(200);
    expect(patched.json.row[s.field]).toEqual(Object.values(s.patch)[0] ?? patched.json.row[s.field]);

    const got = await api.get(id);
    expect(got.json.row.id).toBe(id);
    // Ungeänderte Felder bleiben erhalten
    for (const [k, v] of Object.entries(s.create)) if (!(k in s.patch) && typeof v !== 'object') expect(got.json.row[k]).toEqual(v);

    const table = (await import('@/server/resources')).RESOURCES[resource].table;
    const dbRow = await query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
    expect(dbRow).toHaveLength(1);

    expect((await api.del(id)).status).toBe(200);
    expect((await api.get(id)).status).toBe(404);
    expect(await query(`SELECT id FROM ${table} WHERE id = $1`, [id])).toHaveLength(0);
  });

  it('Mandantentrennung: Nutzer B sieht, ändert und löscht Daten von A nicht', async () => {
    const a = await crud(A, resource);
    const b = await crud(B, resource);
    const id = (await a.create(s.create)).json.row.id;
    expect((await b.get(id)).status).toBe(404);
    expect((await b.patch(id, s.patch)).status).toBe(404);
    expect((await b.del(id)).status).toBe(404);
    expect((await b.list()).json.rows.some((r: { id: string }) => r.id === id)).toBe(false);
    expect((await a.get(id)).status).toBe(200);
    await a.del(id);
  });

  it('lehnt unbekannte Felder ab (kein Mass-Assignment)', async () => {
    const api = await crud(A, resource);
    const r = await api.create({ ...s.create, user_id: '00000000-0000-4000-8000-000000000000', id: '00000000-0000-4000-8000-000000000001' });
    expect(r.status).toBe(422);
  });
});

describe('Validierung und Fehlermeldungen', () => {
  it('liefert verständliche deutsche Fehlermeldungen mit Feldbezug', async () => {
    const api = await crud(A, 'weights');
    const r = await api.create({ date: '2026-11-31', weight_kg: 5 });
    expect(r.status).toBe(422);
    expect(r.json.error.fields.date).toMatch(/Datum/);
    expect(r.json.error.fields.weight_kg).toBeTruthy();
    expect(r.json.error.message).toMatch(/Bitte prüfe deine Eingaben/);
  });
  it('doppeltes Datum beim Gewicht → 409 mit Hinweis', async () => {
    const api = await crud(A, 'weights');
    const first = await api.create({ date: '2026-11-15', weight_kg: 90 });
    expect(first.status).toBe(201);
    const dup = await api.create({ date: '2026-11-15', weight_kg: 91 });
    expect(dup.status).toBe(409);
    expect(dup.json.error.message).toMatch(/bereits/);
  });
  it('Spielanalyse: Paraden dürfen Schüsse nicht übersteigen (auch beim Ändern)', async () => {
    const api = await crud(A, 'match-analyses');
    const bad = await api.create({ date: '2027-02-06', opponent: 'X', shots_faced: 3, saves: 4 });
    expect(bad.status).toBe(422);
    const ok = await api.create({ date: '2027-02-06', opponent: 'X', shots_faced: 5, saves: 4 });
    const patch = await api.patch(ok.json.row.id, { saves: 9 });
    expect(patch.status).toBe(422);
  });
  it('ungültige ID und ungültiger Datumsfilter → 400', async () => {
    const api = await crud(A, 'workouts');
    expect((await api.get('abc')).status).toBe(400);
    expect((await api.list('from=gestern')).status).toBe(400);
  });
  it('unbekannte Ressource → 404, ungültiges JSON → 400', async () => {
    const api = await crud(A, 'users');
    expect((await api.list()).status).toBe(404);
    const res = await import('@/app/api/r/[resource]/route');
    const req = new Request('http://localhost:3000/x', { method: 'POST', headers: { cookie: A.cookie, host: 'localhost:3000' }, body: '{kaputt' });
    expect((await res.POST(req, { params: { resource: 'events' } })).status).toBe(400);
  });
  it('SQL-Injection-Versuche in Textfeldern werden als Daten gespeichert', async () => {
    const api = await crud(A, 'foods');
    const evil = "x'); DROP TABLE foods; --";
    const r = await api.create({ name: evil, kcal_100g: 10 });
    expect(r.status).toBe(201);
    expect((await api.get(r.json.row.id)).json.row.name).toBe(evil);
  });
  it('Datumsfilter in der Liste', async () => {
    const api = await crud(A, 'workouts');
    await api.create({ date: '2026-11-20', type: 'lauf', title: 'Lauf A', duration_min: 30 });
    await api.create({ date: '2026-12-20', type: 'lauf', title: 'Lauf B', duration_min: 30 });
    const r = await api.list('from=2026-12-01&to=2026-12-31');
    expect(r.json.rows.map((x: { title: string }) => x.title)).toContain('Lauf B');
    expect(r.json.rows.map((x: { title: string }) => x.title)).not.toContain('Lauf A');
  });
});

describe('Trainings-Logik', () => {
  it('berechnet TSS serverseitig aus Leistung und FTP zum Datum; Client-Wert wird nicht akzeptiert', async () => {
    const api = await crud(A, 'workouts');
    const r = await api.create({ date: '2026-11-06', type: 'rad', title: 'FTP-nah', duration_min: 60, normalized_power_w: 236 });
    expect(r.json.row.tss).toBe(100);
    expect(r.json.row.tss_source).toBe('power');
    const hack = await api.create({ date: '2026-11-06', type: 'rad', title: 'x', duration_min: 60, tss: 999 });
    expect(hack.status).toBe(422);
  });
  it('FTP-Änderung wirkt auf spätere Trainings, nicht auf frühere', async () => {
    const ftp = await crud(A, 'ftp-tests');
    await ftp.create({ date: '2026-12-01', ftp_w: 300, method: 'manual' });
    const api = await crud(A, 'workouts');
    const early = await api.create({ date: '2026-11-30', type: 'rad', title: 'früh', duration_min: 60, normalized_power_w: 236 });
    const late = await api.create({ date: '2026-12-02', type: 'rad', title: 'spät', duration_min: 60, normalized_power_w: 236 });
    expect(early.json.row.tss).toBe(100);
    expect(late.json.row.tss).toBeLessThan(70);
  });
  it('ohne Leistung: TSS aus RPE; ohne beides: kein erfundener Wert', async () => {
    const api = await crud(A, 'workouts');
    const rpe = await api.create({ date: '2026-11-07', type: 'kraft', title: 'Kraft', duration_min: 60, rpe: 7 });
    expect(rpe.json.row.tss_source).toBe('rpe');
    expect(rpe.json.row.tss).toBeGreaterThan(0);
    const none = await api.create({ date: '2026-11-07', type: 'kraft', title: 'Kraft ohne RPE', duration_min: 60 });
    expect(none.json.row.tss).toBeNull();
    const upd = await api.patch(none.json.row.id, { rpe: 5 });
    expect(upd.json.row.tss_source).toBe('rpe');
  });
  it('Training mit Planverknüpfung setzt Einheit auf erledigt; Löschen setzt zurück', async () => {
    const plan = await crud(A, 'plan-sessions');
    const p = await plan.create({ date: '2026-11-08', type: 'rad', title: 'Plan', duration_min: 60, intensity: 1 });
    const w = await crud(A, 'workouts');
    const wo = await w.create({ date: '2026-11-08', type: 'rad', title: 'Ist', duration_min: 55, plan_session_id: p.json.row.id });
    expect((await plan.get(p.json.row.id)).json.row.status).toBe('done');
    await w.del(wo.json.row.id);
    expect((await plan.get(p.json.row.id)).json.row.status).toBe('planned');
  });
  it('fremde Plan-Einheit kann nicht verknüpft werden', async () => {
    const planB = await crud(B, 'plan-sessions');
    const p = await planB.create({ date: '2026-11-08', type: 'rad', title: 'B-Plan', duration_min: 60, intensity: 1 });
    const w = await crud(A, 'workouts');
    const r = await w.create({ date: '2026-11-08', type: 'rad', title: 'Ist', duration_min: 55, plan_session_id: p.json.row.id });
    expect(r.status).toBe(422);
    expect((await planB.get(p.json.row.id)).json.row.status).toBe('planned');
  });
  it('KI-Schätzung in der Ernährung ist immer als Schätzung markiert', async () => {
    const api = await crud(A, 'food-entries');
    const r = await api.create({ date: '2026-11-04', meal: 'mittag', name: 'Pasta (Foto)', kcal: 700, source: 'ai_estimate', is_estimate: false });
    expect(r.json.row.is_estimate).toBe(true);
    const edit = await api.patch(r.json.row.id, { kcal: 650 });
    expect(edit.json.row.is_estimate).toBe(true);
    expect(edit.json.row.kcal).toBe(650);
    const manual = await api.patch(r.json.row.id, { source: 'manual', is_estimate: false });
    expect(manual.json.row.is_estimate).toBe(false);
  });
  it('Ressourcen-Registry passt zum Datenbankschema', async () => {
    const { RESOURCES } = await import('@/server/resources');
    for (const r of Object.values(RESOURCES)) {
      const cols = (await query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [r.table])).map((c) => c.column_name);
      for (const k of Object.keys(r.schema.shape)) expect(cols, `${r.table}.${k}`).toContain(k);
    }
  });
});

void call;
