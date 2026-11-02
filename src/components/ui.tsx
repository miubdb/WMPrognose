'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';

export function Card({ title, children, action, className = '' }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnProps = { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; busy?: boolean; className?: string; 'data-testid'?: string; title?: string };
export function Button({ children, onClick, type = 'button', variant = 'primary', disabled, busy, className = '', ...rest }: BtnProps) {
  const base = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50';
  const v = {
    primary: 'bg-pitch-600 text-white hover:bg-pitch-700',
    secondary: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-pitch-700 hover:bg-pitch-50',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} className={`${base} ${v} ${className}`} {...rest}>
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success' | 'warn'; children: ReactNode }) {
  const c = { info: 'bg-sky-50 text-sky-900 ring-sky-200', error: 'bg-red-50 text-red-900 ring-red-200', success: 'bg-green-50 text-green-900 ring-green-200', warn: 'bg-amber-50 text-amber-900 ring-amber-200' }[kind];
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ring-1 ${c}`}>{children}</div>;
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const c = { slate: 'bg-slate-100 text-slate-700', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', blue: 'bg-sky-100 text-sky-800' }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{children}</span>;
}

export function Spinner({ label = 'Lade …' }: { label?: string }) {
  return <p className="p-6 text-center text-sm text-slate-500" role="status">{label}</p>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600">{children}</p>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Schließen" className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Zweistufiger Lösch-/Bestätigungsbutton (kein versehentliches Löschen). */
export function ConfirmButton({ label, confirmLabel = 'Wirklich?', onConfirm, variant = 'danger', busy }: { label: string; confirmLabel?: string; onConfirm: () => void | Promise<void>; variant?: 'danger' | 'secondary'; busy?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (armed) { const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); } }, [armed]);
  return (
    <Button variant={armed ? 'danger' : variant === 'danger' ? 'secondary' : variant} busy={busy} onClick={() => { if (armed) { setArmed(false); void onConfirm(); } else setArmed(true); }}>
      {armed ? confirmLabel : label}
    </Button>
  );
}

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'number' | 'int' | 'date' | 'select' | 'checkbox';
  options?: { value: string; label: string }[];
  step?: number | string;
  min?: number;
  max?: number;
  required?: boolean;
  nullable?: boolean;
  help?: string;
  placeholder?: string;
  unit?: string;
}

const inputCls = 'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-pitch-500 focus:outline-none focus:ring-2 focus:ring-pitch-500/30';

export function Field({ def, value, onChange, error }: { def: FieldDef; value: any; onChange: (v: any) => void; error?: string }) {
  const id = useId();
  const common = { id, name: def.name, 'aria-invalid': !!error, 'aria-describedby': error ? id + '-err' : undefined } as const;
  let input: ReactNode;
  switch (def.type) {
    case 'textarea':
      input = <textarea {...common} className={inputCls + ' py-2'} rows={3} value={value ?? ''} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'select':
      input = (
        <select {...common} className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {!def.required && <option value="">–</option>}
          {def.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case 'checkbox':
      input = (
        <label className="flex min-h-[44px] items-center gap-3">
          <input {...common} type="checkbox" className="h-5 w-5 accent-pitch-600" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-sm text-slate-700">{def.help ?? 'Ja'}</span>
        </label>
      );
      break;
    default:
      input = (
        <input
          {...common}
          className={inputCls}
          type={def.type === 'date' ? 'date' : def.type === 'text' || def.type === 'password' ? def.type : 'number'}
          autoComplete={def.type === 'password' ? (def.name === 'new_password' ? 'new-password' : 'current-password') : def.name === 'email' ? 'email' : undefined}
          autoCapitalize={def.type === 'password' || def.name === 'email' ? 'none' : undefined}
          inputMode={def.type === 'int' ? 'numeric' : def.type === 'number' ? 'decimal' : undefined}
          step={def.type === 'int' ? 1 : def.step ?? 'any'}
          min={def.min}
          max={def.max}
          value={value ?? ''}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {def.label}{def.unit ? <span className="text-slate-400"> ({def.unit})</span> : null}{def.required && <span className="text-red-600"> *</span>}
      </label>
      {input}
      {def.help && def.type !== 'checkbox' && <p className="text-xs text-slate-500">{def.help}</p>}
      {error && <p id={id + '-err'} className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

/** Formularwerte (Strings) → API-Nutzlast: Zahlen parsen, leere optionale Felder → null, Pflichtfelder leer → weglassen. */
export function toPayload(defs: FieldDef[], values: Record<string, any>, mode: 'create' | 'update'): Record<string, any> {
  const out: Record<string, any> = {};
  for (const d of defs) {
    const v = values[d.name];
    const empty = v === undefined || v === null || v === '';
    if (d.type === 'checkbox') { out[d.name] = !!v; continue; }
    if (empty) {
      if (d.required) continue;
      if (d.nullable !== false && (mode === 'update' || d.nullable)) out[d.name] = null;
      continue;
    }
    out[d.name] = d.type === 'number' || d.type === 'int' ? Number(String(v).replace(',', '.')) : v;
  }
  return out;
}

export function fromRow(defs: FieldDef[], row: Record<string, any> | null, defaults: Record<string, any> = {}): Record<string, any> {
  const v: Record<string, any> = {};
  for (const d of defs) v[d.name] = row ? row[d.name] ?? '' : defaults[d.name] ?? (d.type === 'checkbox' ? false : '');
  return v;
}

export function FormFields({ defs, values, setValues, errors }: { defs: FieldDef[]; values: Record<string, any>; setValues: (v: Record<string, any>) => void; errors?: Record<string, string> }) {
  return (
    <div className="space-y-3">
      {defs.map((d) => <Field key={d.name} def={d} value={values[d.name]} onChange={(v) => setValues({ ...values, [d.name]: v })} error={errors?.[d.name]} />)}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`min-h-[40px] flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-medium ${value === t.id ? 'bg-white text-pitch-700 shadow-sm' : 'text-slate-600'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-pitch-500" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}
