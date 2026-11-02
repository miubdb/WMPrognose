// Prüft den ECHTEN SDK-Pfad (getLlm → @anthropic-ai/sdk → HTTP) gegen einen lokalen Server, der API-förmige Antworten liefert.
// Das belegt Request-Aufbau (Header, Parameter, Tool-Schema) und Fehlerabbildung – NICHT das Verhalten des echten Modells.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool } from '@/lib/db';
import { setLlmForTests } from '@/ai/llm';
import { call, onboard, registerAndLogin, type Session } from '../helpers/api';

let server: http.Server;
let A: Session;
const seen: { headers: http.IncomingHttpHeaders; body: any; url: string }[] = [];
let respond: (body: any) => { status: number; json: unknown };

const msg = (content: unknown[], stop_reason = 'end_turn') => ({ status: 200, json: { id: 'msg_x', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } } });

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : null;
      seen.push({ headers: req.headers, body, url: req.url ?? '' });
      const r = respond(body);
      res.writeHead(r.status, { 'content-type': 'application/json', 'x-should-retry': 'false' });
      res.end(JSON.stringify(r.json));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
  process.env.ALLOW_REGISTRATION = 'true';
  setLlmForTests(null);
  A = await registerAndLogin('ai-http@example.com');
  await onboard(A);
});
afterAll(async () => { server.close(); delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_BASE_URL; await closePool(); });

describe('Anthropic-SDK über HTTP (lokaler Server)', () => {
  it('Coach: korrekter Endpunkt, Header und Anfrageparameter; Antwort wird verarbeitet', async () => {
    respond = () => msg([{ type: 'text', text: 'Antwort vom Server' }]);
    const { POST } = await import('@/app/api/coach/route');
    const r = await call(POST, 'POST', { message: 'Hallo' }, { cookie: A.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.reply).toBe('Antwort vom Server');
    const s = seen[seen.length - 1];
    expect(s.url).toBe('/v1/messages');
    expect(s.headers.authorization).toBe('Bearer sk-ant-test-key'); // SDK 1.x authentifiziert per Bearer-Header
    expect(s.headers['anthropic-version']).toBe('2026-10-21'); // ab dieser API-Version sind temperature/top_p/top_k verboten – wir senden sie nicht
    expect(s.body.model).toBe('claude-opus-5-5');
    expect(s.body.max_tokens).toBe(8000);
    expect(s.body.output_config).toEqual({ effort: 'medium' });
    expect(s.body.tools[0]).toMatchObject({ name: 'propose_plan_changes', strict: true });
    expect(s.body.tools[0].input_schema.additionalProperties).toBe(false);
    expect(s.body.tool_choice).toBeUndefined();
    expect(s.body.thinking).toBeUndefined();
    expect(s.body.temperature).toBeUndefined();
    expect(s.body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(s.body.messages.at(-1).content).toContain('<daten>');
  });

  it('Foto: Bildblock (base64) und JSON-Schema-Ausgabeformat werden gesendet', async () => {
    respond = () => msg([{ type: 'text', text: JSON.stringify({ items: [{ name: 'Brot', grams: 60, kcal: 150, protein_g: 5, carbs_g: 28, fat_g: 1.5, confidence: 'high' }], notes: '' }) }]);
    const { POST } = await import('@/app/api/ai/food/route');
    const r = await call(POST, 'POST', { image_base64: Buffer.alloc(300, 7).toString('base64'), media_type: 'image/jpeg' }, { cookie: A.cookie });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.items[0]).toMatchObject({ name: 'Brot', is_estimate: true });
    const b = seen[seen.length - 1].body;
    expect(b.messages[0].content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg' } });
    expect(b.output_config.format.type).toBe('json_schema');
    expect(b.output_config.format.schema.required).toEqual(['items', 'notes']);
  });

  it('Fehlerabbildung: 401 → 503, 429 → 429, 400 → 502, 500 → 502, nicht erreichbar → 503', async () => {
    const { POST } = await import('@/app/api/coach/route');
    const err = (status: number, type: string) => ({ status, json: { type: 'error', error: { type, message: 'x' } } });
    for (const [status, type, expected] of [[401, 'authentication_error', 503], [429, 'rate_limit_error', 429], [400, 'invalid_request_error', 502], [500, 'api_error', 502]] as const) {
      respond = () => err(status, type);
      const r = await call(POST, 'POST', { message: 'Test ' + status }, { cookie: A.cookie });
      expect(r.status, `Status ${status}`).toBe(expected);
      expect(r.json.error.message).toMatch(/KI|Schlüssel|überlastet/);
    }
  });

  it('Tool-Aufruf über HTTP wird als offener Vorschlag gespeichert, nicht angewendet', async () => {
    const gen = await import('@/app/api/plan/generate/route');
    const { PUT } = await import('@/app/api/availability/route');
    await call(PUT, 'PUT', { days: [1, 2, 3, 4, 5, 6, 7].map((w) => ({ weekday: w, available_minutes: 60, team_training: false, team_training_minutes: 0 })) }, { cookie: A.cookie });
    await call(gen.POST, 'POST', { from: '2026-11-06', to: '2026-11-20' }, { cookie: A.cookie });
    const list = await import('@/app/api/r/[resource]/route');
    const sess = (await call(list.GET, 'GET', undefined, { cookie: A.cookie, params: { resource: 'plan-sessions' }, query: 'from=2026-11-06&to=2026-11-20' })).json.rows.find((s: { type: string }) => s.type !== 'spiel');
    respond = () => msg([{ type: 'text', text: 'Kürzen.' }, { type: 'tool_use', id: 'toolu_1', name: 'propose_plan_changes', input: { summary: 'Kürzen', rationale: 'Test', changes: [{ op: 'update', id: sess.id, reason: 'r', date: null, type: null, title: null, duration_min: 20, intensity: null, description: null }] } }], 'tool_use');
    const { POST } = await import('@/app/api/coach/route');
    const r = await call(POST, 'POST', { message: 'Plan?' }, { cookie: A.cookie });
    expect(r.json.proposal).toMatchObject({ status: 'pending', source: 'ai' });
    const one = await import('@/app/api/r/[resource]/[id]/route');
    expect((await call(one.GET, 'GET', undefined, { cookie: A.cookie, params: { resource: 'plan-sessions', id: sess.id } })).json.row.duration_min).toBe(sess.duration_min);
  });
});
