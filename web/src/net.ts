// Verbindungsschicht: automatischer Reconnect, Heartbeat, wartende Aktionen, Serveruhr, Wake Lock.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, ServerMsg, View } from '../../shared/types';

export type ConnState = 'connecting' | 'online' | 'offline' | 'kicked' | 'denied';
export interface Ack { reqId: string; ok: boolean; err?: string; dup?: boolean; info?: any }

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export function useGame(role: 'tv' | 'host' | 'player', room: string, key?: string) {
  const [view, setView] = useState<View | null>(null);
  const [conn, setConn] = useState<ConnState>('connecting');
  const [reason, setReason] = useState<string>('');
  const [pendingCount, setPendingCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const offset = useRef(0);
  const lastMsg = useRef(Date.now());
  const pending = useRef(new Map<string, { a: Action; resolve: (a: Ack) => void }>());
  const stopped = useRef(false);
  const attempt = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    for (const [reqId, p] of pending.current) ws.send(JSON.stringify({ t: 'act', reqId, a: p.a }));
  }, []);

  const connect = useCallback(() => {
    if (stopped.current) return;
    window.clearTimeout(timer.current);
    const old = wsRef.current;
    if (old && (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING)) return;
    setConn(c => (c === 'online' ? c : 'connecting'));
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;
    ws.onopen = () => {
      lastMsg.current = Date.now();
      ws.send(JSON.stringify({ t: 'hello', role, room, key }));
    };
    ws.onmessage = ev => {
      lastMsg.current = Date.now();
      let m: ServerMsg;
      try { m = JSON.parse(ev.data); } catch { return; }
      switch (m.t) {
        case 'hello_ok': offset.current = m.now - Date.now(); attempt.current = 0; setConn('online'); flush(); break;
        case 'state': offset.current = m.view.now - Date.now(); setView(m.view); setConn('online'); break;
        case 'ack': {
          const p = pending.current.get(m.reqId);
          if (p) { pending.current.delete(m.reqId); setPendingCount(pending.current.size); p.resolve(m); }
          break;
        }
        case 'ping': ws.send(JSON.stringify({ t: 'pong' })); break;
        case 'kicked': stopped.current = true; setReason(m.reason); setConn('kicked'); ws.close(); break;
        case 'error': stopped.current = true; setReason(m.err); setConn('denied'); ws.close(); break;
      }
    };
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      if (stopped.current) return;
      setConn('offline');
      const delay = Math.min(4000, 400 * 2 ** Math.min(attempt.current++, 4));
      timer.current = window.setTimeout(connect, delay);
    };
    ws.onerror = () => { try { ws.close(); } catch { /* */ } };
  }, [role, room, key, flush]);

  useEffect(() => {
    stopped.current = false;
    connect();
    const wake = () => {
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) { attempt.current = 0; connect(); }
      else if (Date.now() - lastMsg.current > 12000) { try { ws.close(); } catch { /* */ } }
    };
    const onVis = () => { if (document.visibilityState === 'visible') wake(); };
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('pageshow', wake);
    document.addEventListener('visibilitychange', onVis);
    const dog = window.setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMsg.current > 14000) { try { ws.close(); } catch { /* */ } }
      if (!ws && !stopped.current) connect();
    }, 3000);
    return () => {
      stopped.current = true;
      window.clearTimeout(timer.current);
      window.clearInterval(dog);
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('pageshow', wake);
      document.removeEventListener('visibilitychange', onVis);
      try { wsRef.current?.close(); } catch { /* */ }
    };
  }, [connect]);

  /** Aktion senden. Wird bei Verbindungsverlust automatisch (mit gleicher reqId) wiederholt, bis eine Bestätigung kommt. */
  const act = useCallback((a: Action): Promise<Ack> => {
    const reqId = uid();
    return new Promise(resolve => {
      pending.current.set(reqId, { a, resolve });
      setPendingCount(pending.current.size);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'act', reqId, a }));
      else connect();
    });
  }, [connect]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);
  return { view, conn, reason, act, serverNow, pendingCount };
}

/** Screen Wake Lock (wo unterstützt) – wird nach Rückkehr in den Tab neu angefordert. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let lock: any = null;
    let dead = false;
    const req = async () => {
      try { if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await (navigator as any).wakeLock.request('screen'); } catch { /* nicht verfügbar */ }
    };
    req();
    const onVis = () => { if (document.visibilityState === 'visible' && !dead) req(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { dead = true; document.removeEventListener('visibilitychange', onVis); try { lock?.release(); } catch { /* */ } };
  }, [active]);
}

export function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : initial; } catch { return initial; }
  });
  const set = useCallback((v: T) => { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* */ } }, [key]);
  return [val, set];
}
export const store = {
  get<T>(k: string): T | null { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* */ } },
};

export async function api<T = any>(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const r = await fetch(path, body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) as T };
  } catch {
    return { ok: false, status: 0, data: { err: 'network' } as any };
  }
}
