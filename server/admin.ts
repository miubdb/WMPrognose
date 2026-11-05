// Admin-API (/api/admin/*). Jede Route außer login/me/logout verlangt eine gültige Sitzung UND (bei Schreibzugriffen) den CSRF-Header.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AdminAuth } from './auth';
import { ApiError, type ContentService } from './content';
import { buildPreview } from './preview';

export const COOKIE = 'outplay_admin';
/** Was die Admin-Routen brauchen – lokal (Node-Server) und online (Vercel) liefern jeweils eine eigene Implementierung. */
export interface AdminCtx {
  auth: AdminAuth;
  content: ContentService;
  roomCount(): number;
  mode: 'local' | 'online';
  /** konsistenter Voll-Snapshot der SQLite-Datenbank (VACUUM INTO) */
  backup(): Buffer;
  /** Meldet nach einer Admin-Anfrage, ob geschrieben wurde (Online: dann wird nach Blob gespeichert) */
  setupProblem?(): { err: string; setup: string } | null;
}
function cookie(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) { const [k, ...v] = part.trim().split('='); if (k === name) return decodeURIComponent(v.join('=')); }
  return undefined;
}

export async function handleAdmin(app: AdminCtx, req: IncomingMessage, res: ServerResponse, parts: string[], url: URL, readBody: (limit: number) => Promise<any>) {
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
    res.end(JSON.stringify(body));
  };
  const method = req.method ?? 'GET';
  const [, , a, b, c, d] = parts; // api, admin, <a>, <b>, <c>, <d>
  const token = cookie(req, COOKIE);
  const secure = (req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';

  try {
    const prob = app.setupProblem?.();
    if (prob && a !== 'me') return json(503, prob);
    // ---- Anmeldung
    if (a === 'login' && method === 'POST') {
      const body = await readBody(4096);
      const ip = req.socket.remoteAddress ?? 'x';
      const t = app.auth.login(String(body.password ?? ''), ip);
      if (t === 'limited') return json(429, { err: 'Zu viele Fehlversuche. Bitte in 10 Minuten erneut versuchen.' });
      if (!t) return json(401, { err: 'Falsches Passwort' });
      return json(200, { ok: true }, { 'set-cookie': `${COOKIE}=${t}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${12 * 3600}${secure}` });
    }
    const authed = app.auth.check(token);
    if (a === 'me') return json(authed ? 200 : 401, { ok: authed });
    if (a === 'logout' && method === 'POST') { app.auth.logout(token); return json(200, { ok: true }, { 'set-cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0` }); }
    if (!authed) return json(401, { err: 'Nicht angemeldet' });
    // ---- CSRF: Schreibzugriffe nur mit Custom-Header und passender Herkunft
    if (method !== 'GET') {
      if (req.headers['x-outplay-admin'] !== '1') return json(403, { err: 'CSRF-Schutz: Header fehlt' });
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(403, { err: 'Fremde Herkunft' });
    }
    const C = app.content;
    const q = url.searchParams;

    switch (a) {
      case 'overview': return json(200, { questions: C.listQuestions().length, categories: C.listCategories().length, packs: C.listPacksView().length, rooms: app.roomCount(), mode: app.mode, defaultRef: C.defaultRef() });
      case 'scenes': {
        if (method === 'GET') return json(200, C.listScenes());
        const body = await readBody(256 * 1024);
        if (method === 'POST' && !b) return json(201, C.saveScene(null, body.template));
        if (method === 'PUT' && b) return json(200, C.saveScene(b, body.template));
        if (method === 'DELETE' && b) { C.deleteScene(b); return json(200, { ok: true }); }
        break;
      }
      case 'questions': {
        if (method === 'GET') {
          if (b) return json(200, C.getQuestion(b));
          return json(200, C.listQuestions({ q: q.get('q') ?? undefined, mode: q.get('mode') ?? undefined, topic: q.get('topic') ?? undefined, archived: q.has('archived') ? q.get('archived') === '1' : undefined }));
        }
        const body = await readBody(256 * 1024);
        if (method === 'POST' && !b) return json(201, C.createQuestion(body));
        if (method === 'POST' && c === 'duplicate') return json(201, C.duplicateQuestion(b));
        if (method === 'PUT' && b) return json(200, C.updateQuestion(b, body));
        if (method === 'DELETE' && b) { C.deleteQuestion(b); return json(200, { ok: true }); }
        break;
      }
      case 'categories': {
        if (method === 'GET') return json(200, b ? C.getCategory(b) : C.listCategories());
        const body = await readBody(256 * 1024);
        if (method === 'POST' && !b) return json(201, C.createCategory(body));
        if (method === 'POST' && c === 'duplicate') return json(201, C.duplicateCategory(b, !!body.copyQuestions));
        if (method === 'PUT' && b) return json(200, C.updateCategory(b, body));
        if (method === 'DELETE' && b) { C.deleteCategory(b); return json(200, { ok: true }); }
        break;
      }
      case 'packs': {
        if (method === 'GET') {
          if (!b) return json(200, C.listPacksView());
          if (c === 'versions') return json(200, C.versions(b));
          if (c === 'analysis') return json(200, C.analysis(b));
          return json(200, C.getPack(b));
        }
        const body = await readBody(256 * 1024);
        if (method === 'POST' && !b) return json(201, C.createPack(body));
        if (method === 'POST' && c === 'duplicate') return json(201, C.duplicatePack(b));
        if (method === 'POST' && c === 'publish') return json(200, C.publish(b, body.note ?? ''));
        if (method === 'POST' && c === 'status') return json(200, C.setPackStatus(b, body.status === 'archived' ? 'archived' : body.status === 'draft' ? 'draft' : 'published'));
        if (method === 'POST' && c === 'rollback') return json(200, C.rollback(b, Number(body.version)));
        if (method === 'PUT' && b) return json(200, C.updatePack(b, body));
        if (method === 'DELETE' && b) { C.deletePack(b); return json(200, { ok: true }); }
        break;
      }
      case 'preview': {
        if (method !== 'POST') break;
        const body = await readBody(256 * 1024);
        return json(200, buildPreview(body.task, C.sceneMap(), body.meta ?? {}));
      }
      case 'backup': {
        if (method !== 'GET') break;
        const buf = app.backup();
        const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="OUTPLAY-VOLLBACKUP-VERTRAULICH-${stamp}.db"` });
        return void res.end(buf);
      }
      case 'export': {
        if (method !== 'GET') break;
        const scope = q.get('scope') ?? 'all';
        const data = scope === 'questions' ? C.export('questions') : scope.startsWith('pack:') ? C.export({ pack: scope.slice(5) }) : C.export('all');
        return json(200, data, { 'content-disposition': `attachment; filename="outplay-${scope.replace(/[^a-z0-9_:-]/gi, '')}.json"` });
      }
      case 'import': {
        if (method !== 'POST') break;
        const body = await readBody(8 * 1024 * 1024);
        const mode = body.onConflict === 'skip' || body.onConflict === 'overwrite' ? body.onConflict : 'rename';
        return json(200, C.import(body.data, mode, { dryRun: !!body.dryRun, publish: !!body.publish }));
      }
    }
    void d;
    return json(404, { err: 'Unbekannte Admin-Route' });
  } catch (e) {
    if (e instanceof ApiError) return json(e.status, { err: e.message, details: e.details });
    console.error('admin error', e);
    return json(500, { err: 'Serverfehler' });
  }
}
