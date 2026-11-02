// Tests der KI-Anbindung mit einem Ersatzclient (kein Netzwerk). Verifiziert wird die Anwendungslogik:
// Kontext aus echten Daten, Bestätigungspflicht, Fehlerbehandlung. Live-Aufrufe gegen die Anthropic-API sind
// in dieser Umgebung NICHT möglich (kein API-Schlüssel) und deshalb nicht Teil dieser Tests.
import type Anthropic from '@anthropic-ai/sdk';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closePool, query } from '@/lib/db';
import { setLlmForTests, type LlmClient } from '@/ai/llm';
import { call, crud, onboard, registerAndLogin, type Session } from '../helpers/api';

afterAll(async () => { setLlmForTests(null); await closePool(); });

let A: Session;
let seen: Anthropic.MessageCreateParamsNonStreaming[] = [];
let nextResponse: (p: Anthropic.MessageCreateParamsNonStreaming) => Partial<Anthropic.Message>;

const fake: LlmClient = {
  async create(p) {
    seen.push(p);
    return { id: 'msg_test', type: 'message', role: 'assistant', model: p.model, stop_reason: 'end_turn', stop_sequence: null, content: [], usage: {} as never, ...nextResponse(p) } as Anthropic.Message;
  },
};
const text = (t: string): Anthropic.TextBlock => ({ type: 'text', text: t, citations: null } as Anthropic.TextBlock);
const tool = (input: unknown): Anthropic.ToolUseBlock => ({ type: 'tool_use', id: 'toolu_1', name: 'propose_plan_changes', input } as Anthropic.ToolUseBlock);

beforeAll(async () => {
  process.env.ALLOW_REGISTRATION = 'true';
  delete process.env.ANTHROPIC_API_KEY;
  A = await registerAndLogin('ai-a@example.com');
  await onboard(A);
  const { PUT } = await import('@/app/api/availability/route');
  await call(PUT, 'PUT', { days: [1, 2, 3, 4, 5, 6, 7].map((w) => ({ weekday: w, available_minutes: 60, team_training: false, team_training_minutes: 0 })) }, { cookie: A.cookie });
  const gen = await import('@/app/api/plan/generate/route');
  await call(gen.POST, 'POST', { from: '2026-11-05', to: '2026-11-30' }, { cookie: A.cookie });
  await (await crud(A, 'workouts')).create({ date: '2026-11-04', type: 'rad', title: 'Testfahrt-Alpha', duration_min: 60, normalized_power_w: 170 });
});
beforeEach(() => { seen = []; setLlmForTests(null); });

describe('KI nicht konfiguriert', () => {
  it('Coach und Foto liefern eine ehrliche Meldung statt erfundener Antworten', async () => {
    const { POST } = await import('@/app/api/coach/route');
    const r = await call(POST, 'POST', { message: 'Wie geht es mir?' }, { cookie: A.cookie });
    expect(r.status).toBe(503);
    expect(r.json.error.message).toMatch(/ANTHROPIC_API_KEY/);
    const food = await import('@/app/api/ai/food/route');
    const f = await call(food.POST, 'POST', { image_base64: 'A'.repeat(200), media_type: 'image/jpeg' }, { cookie: A.cookie });
    expect(f.status).toBe(503);
    const st = await import('@/app/api/ai/status/route');
    expect((await call(st.GET, 'GET', undefined, { cookie: A.cookie })).json.configured).toBe(false);
  });
});

describe('KI-Coach', () => {
  it('sendet echte Daten (Ziele, Verfügbarkeit, Training, Plan-IDs) und nutzt nur erlaubte API-Parameter', async () => {
    setLlmForTests(fake);
    nextResponse = () => ({ content: [text('Du hast bisher eine Einheit protokolliert; für Trends reicht das nicht.')] });
    const { POST } = await import('@/app/api/coach/route');
    const r = await call(POST, 'POST', { message: 'Wie läuft es?' }, { cookie: A.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.reply).toMatch(/Einheit/);
    expect(r.json.proposal).toBeNull();
    const req = seen[0];
    expect(req.model).toBe('claude-opus-5-5');
    expect(req).not.toHaveProperty('temperature');
    expect(req).not.toHaveProperty('thinking');
    expect(req.tool_choice).toBeUndefined();
    expect(req.tools?.[0]).toMatchObject({ name: 'propose_plan_changes', strict: true });
    const last = req.messages[req.messages.length - 1].content as string;
    const ctx = JSON.parse(last.split('<daten>\n')[1].split('\n</daten>')[0]);
    expect(ctx.ziele).toMatchObject({ hauptziel: '2027-03-07', erstes_freundschaftsspiel: '2027-02-06', zielgewicht_kg: 86, ausgangsgewicht_kg: 91.45, ausgangs_ftp_w: 236 });
    expect(ctx.verfuegbarkeit_pro_wochentag_1_bis_7).toHaveLength(7);
    expect(ctx.trainings_letzte_28_tage).toHaveLength(1);
    expect(ctx.trainings_letzte_28_tage[0]).toMatchObject({ title: 'Testfahrt-Alpha', tss_source: 'power' });
    expect(ctx.geplante_einheiten_naechste_14_tage.length).toBeGreaterThan(5);
    expect(ctx.geplante_einheiten_naechste_14_tage[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(ctx.datenqualitaet.trainings_letzte_28_tage).toBe(1);
    expect(ctx.tagesform_letzte_7_tage).toEqual([]);
    expect(String(req.system && JSON.stringify(req.system))).toMatch(/Erfinde keine Messwerte/);
  });

  it('Planvorschlag der KI wird gespeichert, aber nicht angewendet; Bestätigung wendet an', async () => {
    setLlmForTests(fake);
    const plan = await crud(A, 'plan-sessions');
    const target = (await plan.list('from=2026-11-06&to=2026-11-30')).json.rows.find((s: { type: string }) => s.type !== 'spiel');
    nextResponse = () => ({
      stop_reason: 'tool_use',
      content: [text('Ich schlage vor, die Einheit zu kürzen.'), tool({
        summary: 'Einheit kürzen', rationale: 'Wenige Daten, daher vorsichtig.',
        changes: [{ op: 'update', id: target.id, reason: 'Vorsicht', date: null, type: null, title: null, duration_min: 30, intensity: null, description: null },
                  { op: 'add', id: null, reason: 'Mobilität', date: '2026-11-20', type: 'mobilitaet', title: 'Mobilität extra', duration_min: 20, intensity: 1, description: null }],
      })],
    });
    const { POST } = await import('@/app/api/coach/route');
    const r = await call(POST, 'POST', { message: 'Plan anpassen?' }, { cookie: A.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.proposal.status).toBe('pending');
    expect(r.json.proposal.source).toBe('ai');
    expect(r.json.proposal.changes).toHaveLength(2);
    expect((await plan.get(target.id)).json.row.duration_min).toBe(target.duration_min); // unverändert
    const dec = await import('@/app/api/proposals/[id]/route');
    expect((await call(dec.POST, 'POST', { decision: 'accept' }, { cookie: A.cookie, params: { id: r.json.proposal.id } })).status).toBe(200);
    expect((await plan.get(target.id)).json.row.duration_min).toBe(30);
    expect((await plan.list('from=2026-11-20&to=2026-11-20')).json.rows.some((s: { title: string; source: string }) => s.title === 'Mobilität extra' && s.source === 'ai')).toBe(true);
  });

  it('verwirft Vorschläge mit erfundenen Einheiten und sagt das offen', async () => {
    setLlmForTests(fake);
    nextResponse = () => ({
      stop_reason: 'tool_use',
      content: [text('Vorschlag folgt.'), tool({ summary: 'x', rationale: 'y', changes: [{ op: 'delete', id: '99999999-9999-4999-8999-999999999999', reason: 'r', date: null, type: null, title: null, duration_min: null, intensity: null, description: null }] })],
    });
    const { POST } = await import('@/app/api/coach/route');
    const before = await query<{ n: number }>(`SELECT count(*)::int AS n FROM plan_proposals`);
    const r = await call(POST, 'POST', { message: 'Lösche etwas' }, { cookie: A.cookie });
    expect(r.status).toBe(200);
    expect(r.json.proposal).toBeNull();
    expect(r.json.reply).toMatch(/verworfen/);
    expect((await query<{ n: number }>(`SELECT count(*)::int AS n FROM plan_proposals`))[0].n).toBe(before[0].n);
  });

  it('Unvollständige neue Einheiten werden nicht geraten', async () => {
    setLlmForTests(fake);
    nextResponse = () => ({ stop_reason: 'tool_use', content: [tool({ summary: 'x', rationale: 'y', changes: [{ op: 'add', id: null, reason: 'r', date: '2026-11-20', type: null, title: 'Ohne Typ', duration_min: 30, intensity: 1, description: null }] })] });
    const { POST } = await import('@/app/api/coach/route');
    const r = await call(POST, 'POST', { message: 'hinzufügen' }, { cookie: A.cookie });
    expect(r.json.proposal).toBeNull();
    expect(r.json.reply).toMatch(/unvollständig/);
  });

  it('Refusal wird ehrlich gemeldet; Verlauf wird gespeichert und beim nächsten Aufruf mitgesendet', async () => {
    setLlmForTests(fake);
    nextResponse = () => ({ stop_reason: 'refusal', content: [] });
    const { POST, GET, DELETE } = await import('@/app/api/coach/route');
    const r = await call(POST, 'POST', { message: 'Test' }, { cookie: A.cookie });
    expect(r.json.reply).toMatch(/abgelehnt/);
    nextResponse = () => ({ content: [text('Antwort 2')] });
    await call(POST, 'POST', { message: 'Frage 2' }, { cookie: A.cookie });
    const last = seen[seen.length - 1];
    expect(last.messages.length).toBeGreaterThan(1);
    expect(last.messages[0].role).toBe('user');
    const msgs = (await call(GET, 'GET', undefined, { cookie: A.cookie })).json.messages;
    expect(msgs.length).toBeGreaterThanOrEqual(4);
    expect((await call(DELETE, 'DELETE', undefined, { cookie: A.cookie })).status).toBe(200);
    expect((await call(GET, 'GET', undefined, { cookie: A.cookie })).json.messages).toEqual([]);
  });

  it('validiert Eingabe und Tageslimit', async () => {
    setLlmForTests(fake);
    nextResponse = () => ({ content: [text('ok')] });
    const { POST } = await import('@/app/api/coach/route');
    expect((await call(POST, 'POST', { message: '' }, { cookie: A.cookie })).status).toBe(422);
    process.env.AI_DAILY_LIMIT = '1';
    const r = await call(POST, 'POST', { message: 'noch eine' }, { cookie: A.cookie });
    expect(r.status).toBe(429);
    expect(r.json.error.message).toMatch(/Tageslimit/);
    delete process.env.AI_DAILY_LIMIT;
  });

  it('Mandantentrennung: Kontext enthält nur Daten des anfragenden Nutzers', async () => {
    setLlmForTests(fake);
    nextResponse = () => ({ content: [text('ok')] });
    const B = await registerAndLogin('ai-b@example.com');
    await onboard(B, { start_weight_kg: 77.7 });
    const { POST } = await import('@/app/api/coach/route');
    await call(POST, 'POST', { message: 'Hallo' }, { cookie: B.cookie });
    const sent = JSON.stringify(seen[seen.length - 1].messages);
    expect(sent).toContain('77.7');
    expect(sent).not.toContain('Testfahrt-Alpha');
    expect(sent).not.toContain('91.45');
  });
});

describe('KI-Ernährungserkennung', () => {
  const img = Buffer.alloc(300, 1).toString('base64');
  it('liefert Schätzungen, markiert sie als Schätzung und prüft Plausibilität', async () => {
    setLlmForTests(fake);
    nextResponse = () => ({ content: [text(JSON.stringify({
      items: [
        { name: 'Reis', grams: 180, kcal: 235, protein_g: 4.5, carbs_g: 51, fat_g: 0.5, confidence: 'medium' },
        { name: 'Unplausibel', grams: 100, kcal: 100, protein_g: 50, carbs_g: 50, fat_g: 50, confidence: 'low' },
        { name: 'Absurd', grams: 100, kcal: 9000, protein_g: 1, carbs_g: 1, fat_g: 1, confidence: 'low' },
      ], notes: 'Soße nicht erkennbar',
    }))] });
    const { POST } = await import('@/app/api/ai/food/route');
    const r = await call(POST, 'POST', { image_base64: img, media_type: 'image/jpeg', hint: 'ca. 180 g Reis' }, { cookie: A.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.items).toHaveLength(2);
    expect(r.json.dropped).toBe(1);
    expect(r.json.items.every((i: { is_estimate: boolean }) => i.is_estimate)).toBe(true);
    expect(r.json.items[0].plausible).toBe(true);
    expect(r.json.items[1].plausible).toBe(false);
    expect(r.json.disclaimer).toMatch(/Schätzung/);
    const req = seen[0];
    expect(req.output_config?.format).toMatchObject({ type: 'json_schema' });
    const content = req.messages[0].content as Anthropic.ContentBlockParam[];
    expect(content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg' } });
    expect(JSON.stringify(content[1])).toMatch(/180 g Reis/);
  });
  it('Fehlerfälle: ungültige Antwort, Refusal, zu großes oder ungültiges Bild', async () => {
    setLlmForTests(fake);
    const { POST } = await import('@/app/api/ai/food/route');
    nextResponse = () => ({ content: [text('kein json')] });
    expect((await call(POST, 'POST', { image_base64: img, media_type: 'image/png' }, { cookie: A.cookie })).status).toBe(502);
    nextResponse = () => ({ stop_reason: 'refusal', content: [] });
    expect((await call(POST, 'POST', { image_base64: img, media_type: 'image/png' }, { cookie: A.cookie })).status).toBe(422);
    expect((await call(POST, 'POST', { image_base64: 'A'.repeat(5_000_000), media_type: 'image/png' }, { cookie: A.cookie })).status).toBe(413);
    expect((await call(POST, 'POST', { image_base64: '!!!'.repeat(50), media_type: 'image/png' }, { cookie: A.cookie })).status).toBe(400);
    expect((await call(POST, 'POST', { image_base64: img, media_type: 'application/pdf' }, { cookie: A.cookie })).status).toBe(422);
  });
  it('speichert nichts automatisch – erst die manuelle Bestätigung legt einen Eintrag als Schätzung an', async () => {
    const before = await query<{ n: number }>(`SELECT count(*)::int AS n FROM food_entries`);
    setLlmForTests(fake);
    nextResponse = () => ({ content: [text(JSON.stringify({ items: [{ name: 'Pasta', grams: 250, kcal: 400, protein_g: 14, carbs_g: 75, fat_g: 4, confidence: 'high' }], notes: '' }))] });
    const { POST } = await import('@/app/api/ai/food/route');
    await call(POST, 'POST', { image_base64: img, media_type: 'image/webp' }, { cookie: A.cookie });
    expect((await query<{ n: number }>(`SELECT count(*)::int AS n FROM food_entries`))[0].n).toBe(before[0].n);
    const fe = await crud(A, 'food-entries');
    const saved = await fe.create({ date: '2026-11-05', meal: 'mittag', name: 'Pasta', amount_g: 250, kcal: 380, protein_g: 14, carbs_g: 75, fat_g: 4, source: 'ai_estimate' });
    expect(saved.json.row).toMatchObject({ is_estimate: true, kcal: 380 }); // manuell korrigierter Wert, weiterhin als Schätzung markiert
  });
});
