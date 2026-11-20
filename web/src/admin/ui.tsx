// Gemeinsame Bausteine des Admin-Bereichs: Seitenkopf, Suche, Status, Leerzustand, Menü, Dialog, Bestätigung, Toast.
import { useCallback, useEffect, useRef, useState } from 'react';
import { adm } from './api';

export function useList<T>(path: string, rev: number, deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); adm<T[]>('GET', path).then(r => { if (r.ok) setData(r.data); setLoading(false); }); }, [path]);
  useEffect(load, [load, rev, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, reload: load };
}

/** Seitenkopf: Titel, ein erklärender Satz, Hauptaktion rechts. */
export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return <header className="pagehead"><div><h2>{title}</h2>{sub && <p className="muted">{sub}</p>}</div>{children && <div className="pageact">{children}</div>}</header>;
}
export function SearchBox({ value, onChange, placeholder = 'Suchen …' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="searchbox"><span aria-hidden>🔍</span><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />{value && <button type="button" className="clear" aria-label="Suche leeren" onClick={() => onChange('')}>✕</button>}</div>;
}
export type BadgeKind = 'ok' | 'warn' | 'muted' | 'info' | 'bad';
export function Badge({ kind = 'muted', children, title }: { kind?: BadgeKind; children: React.ReactNode; title?: string }) { return <span className={`sbadge ${kind}`} title={title}>{children}</span>; }
export function Empty({ icon = '🗂️', title, text, children }: { icon?: string; title: string; text?: string; children?: React.ReactNode }) {
  return <div className="emptystate"><div className="ei" aria-hidden>{icon}</div><b>{title}</b>{text && <p className="muted">{text}</p>}{children}</div>;
}
export function RowMenu({ children, label = 'Mehr' }: { children: React.ReactNode; label?: string }) {
  return <details className="rowmenu" onClick={e => { if ((e.target as HTMLElement).closest('button')) e.currentTarget.removeAttribute('open'); }}><summary aria-label={label} title={label}>⋯</summary><div role="menu">{children}</div></details>;
}
export function Toast({ msg }: { msg: string }) { return msg ? <div className="toast" role="status">{msg}</div> : null; }
export function useToast() { const [m, setM] = useState(''); return { msg: m, show: (t: string) => { setM(t); setTimeout(() => setM(''), 4000); } }; }

/** Modaler Dialog (Esc schließt, Fokus bleibt im Dialog). */
export function Dialog({ title, onClose, children, actions, wide }: { title: string; onClose: () => void; children: React.ReactNode; actions?: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); ref.current?.focus(); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="modal" onClick={onClose}>
      <div className={`modalbox ${wide ? 'wide' : ''} dlg`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={e => e.stopPropagation()}>
        <div className="row between"><h3>{title}</h3><button className="btn small ghost" aria-label="Schließen" onClick={onClose}>✕</button></div>
        {children}
        {actions && <div className="actionbar"><span className="spacer" />{actions}</div>}
      </div>
    </div>
  );
}

export interface ConfirmOpts { title: string; text?: React.ReactNode; confirmLabel?: string; danger?: boolean; input?: { label: string; placeholder?: string } }
/** Bestätigungsdialog als Promise: `const ok = await ask({...})` (bei `input` kommt der Text zurück, sonst true; Abbruch = null). */
export function useConfirm() {
  const [st, setSt] = useState<{ o: ConfirmOpts; res: (v: string | boolean | null) => void } | null>(null); const [val, setVal] = useState('');
  const ask = useCallback((o: ConfirmOpts) => new Promise<string | boolean | null>(res => { setVal(''); setSt({ o, res }); }), []);
  const done = (v: string | boolean | null) => { st?.res(v); setSt(null); };
  const node = st && (
    <Dialog title={st.o.title} onClose={() => done(null)} actions={<><button className="btn ghost" onClick={() => done(null)}>Abbrechen</button><button className={`btn ${st.o.danger ? 'warn' : 'primary'}`} onClick={() => done(st.o.input ? val : true)}>{st.o.confirmLabel ?? 'OK'}</button></>}>
      {st.o.text && <div className="dlgtext">{st.o.text}</div>}
      {st.o.input && <label className="field"><span>{st.o.input.label}</span><input autoFocus value={val} placeholder={st.o.input.placeholder} onChange={e => setVal(e.target.value)} /></label>}
    </Dialog>);
  return { ask, node };
}
export const fmtDate = (t?: number) => (t ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–');

/** Globaler Schutz: solange der Show-Builder ungespeicherte Änderungen hat, fragt die Navigation nach. */
export const guard = { dirty: false };
