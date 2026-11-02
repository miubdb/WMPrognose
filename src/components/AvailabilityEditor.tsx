'use client';
import { useEffect, useState } from 'react';
import { api, ApiClientError, useFetch } from '@/lib/client';
import { WEEKDAYS_DE } from '@/domain/dates';
import { Button, Notice, Spinner } from './ui';

interface Day { weekday: number; available_minutes: number; team_training: boolean; team_training_minutes: number; notes: string | null }

export function AvailabilityEditor({ onSaved, submitLabel = 'Verfügbarkeit speichern' }: { onSaved?: () => void; submitLabel?: string }) {
  const { data, error } = useFetch<{ days: Day[] }>('/api/availability');
  const [days, setDays] = useState<Day[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiClientError | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setDays(data.days.map((d) => ({ ...d }))); }, [data]);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!days) return <Spinner />;
  const set = (i: number, patch: Partial<Day>) => { setDays(days.map((d, j) => (j === i ? { ...d, ...patch } : d))); setSaved(false); };
  async function save() {
    setBusy(true); setErr(null);
    try {
      await api('/api/availability', { method: 'PUT', body: { days: days!.map((d) => ({ weekday: d.weekday, available_minutes: Number(d.available_minutes) || 0, team_training: d.team_training, team_training_minutes: d.team_training ? Number(d.team_training_minutes) || 0 : 0, notes: d.notes ?? null })) } });
      setSaved(true); onSaved?.();
    } catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-3">
      <p className="text-sm text-slate-600">Wie viele Minuten pro Tag stehen für <strong>eigenes</strong> Training zur Verfügung? 0 = kein Training. Mannschaftstraining ist ein fester Zusatztermin.</p>
      {err && <Notice kind="error">{err.message}</Notice>}
      {saved && <Notice kind="success">Verfügbarkeit gespeichert.</Notice>}
      {days.map((d, i) => (
        <div key={d.weekday} className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="w-24 font-medium">{WEEKDAYS_DE[d.weekday - 1]}</span>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Minuten für {WEEKDAYS_DE[d.weekday - 1]}</span>
              <input aria-label={`Minuten ${WEEKDAYS_DE[d.weekday - 1]}`} type="number" inputMode="numeric" min={0} max={600} step={5} className="min-h-[44px] w-24 rounded-xl border border-slate-300 px-3 text-right" value={d.available_minutes} onChange={(e) => set(i, { available_minutes: e.target.value as unknown as number })} />
              min
            </label>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-pitch-600" checked={d.team_training} onChange={(e) => set(i, { team_training: e.target.checked, team_training_minutes: e.target.checked && !d.team_training_minutes ? 90 : d.team_training_minutes })} />
              Mannschaftstraining
            </label>
            {d.team_training && (
              <label className="flex items-center gap-2 text-sm">
                <input aria-label={`Dauer Mannschaftstraining ${WEEKDAYS_DE[d.weekday - 1]}`} type="number" inputMode="numeric" min={0} max={300} step={5} className="min-h-[44px] w-24 rounded-xl border border-slate-300 px-3 text-right" value={d.team_training_minutes} onChange={(e) => set(i, { team_training_minutes: e.target.value as unknown as number })} />
                min
              </label>
            )}
          </div>
        </div>
      ))}
      <Button type="submit" busy={busy} data-testid="save-availability">{submitLabel}</Button>
    </form>
  );
}
