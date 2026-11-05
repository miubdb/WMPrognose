export interface Res<T = any> { ok: boolean; status: number; data: T }
export async function adm<T = any>(method: string, path: string, body?: unknown): Promise<Res<T>> {
  try {
    const r = await fetch('/api/admin' + path, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-outplay-admin': '1' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== '/me' && path !== '/login') window.dispatchEvent(new Event('outplay-admin-401'));
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: { err: 'Server nicht erreichbar' } as any }; }
}
export const errText = (r: Res) => {
  const d: any = r.data;
  const det = Array.isArray(d?.details) && d.details.length && typeof d.details[0] === 'string' ? ' – ' + d.details.slice(0, 6).join(' · ') : '';
  return (d?.err ?? 'Fehler') + det;
};
export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
