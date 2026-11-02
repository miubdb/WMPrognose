'use client';
import { useState, type ReactNode } from 'react';
import { api, ApiClientError, useFetch } from '@/lib/client';
import { Button, ConfirmButton, Empty, FormFields, fromRow, Modal, Notice, Spinner, toPayload, type FieldDef } from './ui';

/** Generische Liste mit Anlegen / Bearbeiten / Löschen für eine API-Ressource. */
export function ResourceCrud<T extends { id: string }>({
  resource, query = '', fields, defaults, renderRow, addLabel, emptyText, title, onChanged, transformPayload,
}: {
  resource: string; query?: string; fields: FieldDef[]; defaults?: Record<string, any>;
  renderRow: (row: T) => ReactNode; addLabel: string; emptyText: string; title: string;
  onChanged?: () => void; transformPayload?: (p: Record<string, any>) => Record<string, any>;
}) {
  const { data, error, loading, reload } = useFetch<{ rows: T[] }>(`/api/r/${resource}${query ? '?' + query : ''}`);
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing('new')} data-testid={`add-${resource}`}>＋ {addLabel}</Button>
      {error && <Notice kind="error">{error}</Notice>}
      {loading && !data ? <Spinner /> : data && data.rows.length === 0 ? <Empty>{emptyText}</Empty> : (
        <ul className="space-y-2">
          {data?.rows.map((r) => (
            <li key={r.id}>
              <button className="w-full rounded-xl bg-white p-3 text-left ring-1 ring-slate-200 active:bg-slate-50" onClick={() => setEditing(r)} data-testid={`row-${resource}`}>
                {renderRow(r)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <EditModal
        open={editing !== null} row={editing === 'new' ? null : editing} title={editing === 'new' ? addLabel : `${title} bearbeiten`}
        fields={fields} defaults={defaults} resource={resource} transformPayload={transformPayload}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); void reload(); onChanged?.(); }}
      />
    </div>
  );
}

export function EditModal({ open, row, title, fields, defaults, resource, onClose, onSaved, transformPayload, extraActions, extraFields }: {
  open: boolean; row: any | null; title: string; fields: FieldDef[]; defaults?: Record<string, any>; resource: string;
  onClose: () => void; onSaved: (row: any) => void; transformPayload?: (p: Record<string, any>) => Record<string, any>; extraActions?: ReactNode; extraFields?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open && <EditForm row={row} fields={fields} defaults={defaults} resource={resource} onClose={onClose} onSaved={onSaved} transformPayload={transformPayload} extraActions={extraActions} extraFields={extraFields} />}
    </Modal>
  );
}

function EditForm({ row, fields, defaults, resource, onClose, onSaved, transformPayload, extraActions, extraFields }: {
  row: any | null; fields: FieldDef[]; defaults?: Record<string, any>; resource: string; onClose: () => void; onSaved: (row: any) => void;
  transformPayload?: (p: Record<string, any>) => Record<string, any>; extraActions?: ReactNode; extraFields?: ReactNode;
}) {
  const [values, setValues] = useState(() => fromRow(fields, row, defaults));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiClientError | null>(null);
  async function save() {
    setBusy(true); setErr(null);
    try {
      let payload = toPayload(fields, values, row ? 'update' : 'create');
      if (transformPayload) payload = transformPayload(payload);
      const res = row ? await api(`/api/r/${resource}/${row.id}`, { method: 'PATCH', body: payload }) : await api(`/api/r/${resource}`, { method: 'POST', body: payload });
      onSaved(res.row);
    } catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  async function del() {
    setBusy(true); setErr(null);
    try { await api(`/api/r/${resource}/${row.id}`, { method: 'DELETE' }); onSaved(null); } catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4">
      {err && <Notice kind="error">{err.message}</Notice>}
      <FormFields defs={fields} values={values} setValues={setValues} errors={err?.fields} />
      {extraFields}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" busy={busy} data-testid="save">Speichern</Button>
        <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
        {row && <ConfirmButton label="Löschen" confirmLabel="Wirklich löschen" onConfirm={del} busy={busy} />}
        {extraActions}
      </div>
    </form>
  );
}
