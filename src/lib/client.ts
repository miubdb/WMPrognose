'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}

export async function api<T = any>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiClientError(0, 'network', 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.');
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* leere Antwort */ }
  if (!res.ok) {
    const e = data?.error;
    if (res.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) location.href = '/login';
    if (e?.code === 'onboarding_required' && typeof window !== 'undefined' && !location.pathname.startsWith('/onboarding')) location.href = '/onboarding';
    throw new ApiClientError(res.status, e?.code ?? 'error', e?.message ?? `Fehler (${res.status})`, e?.fields);
  }
  return data as T;
}

export function useFetch<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!url) return;
    const my = ++seq.current;
    setLoading(true);
    try {
      const d = await api<T>(url);
      if (my === seq.current) { setData(d); setError(null); }
    } catch (e) {
      if (my === seq.current) setError((e as Error).message);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [url]);
  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

export const num = (v: unknown, d = 1) => (v == null || v === '' ? '–' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 }));

export const TYPE_LABEL: Record<string, string> = {
  rad: 'Rad', kraft: 'Kraft', lauf: 'Lauf', fussball: 'Fußball', torwart: 'Torwart', mannschaft: 'Mannschaft',
  mobilitaet: 'Mobilität', test: 'Test', spiel: 'Spiel', ruhe: 'Ruhe', sonstiges: 'Sonstiges',
};
export const TYPE_ICON: Record<string, string> = {
  rad: '🚴', kraft: '🏋️', lauf: '🏃', fussball: '⚽', torwart: '🧤', mannschaft: '👥', mobilitaet: '🧘', test: '📈', spiel: '🏟️', ruhe: '😴', sonstiges: '•',
};
export const INTENSITY_LABEL = ['', 'locker', 'mittel', 'hart'];
export const MEAL_LABEL: Record<string, string> = { fruehstueck: 'Frühstück', mittag: 'Mittagessen', abend: 'Abendessen', snack: 'Snacks' };
