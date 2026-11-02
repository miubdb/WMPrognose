'use client';
import { useState } from 'react';
import { num, useFetch } from '@/lib/client';
import { addDays, formatDe } from '@/domain/dates';
import { Badge, Button, Card, Empty, Notice, PageHeader, Spinner, type FieldDef } from '@/components/ui';
import { EditModal } from '@/components/ResourceCrud';
import { LineChart } from '@/components/charts';
import { useApp } from '@/components/AppContext';

const scale = (labels: string[]) => labels.map((l, i) => ({ value: String(i + 1), label: `${i + 1} – ${l}` }));
const FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'sleep_hours', label: 'Schlafdauer', type: 'number', unit: 'h', step: 0.25 },
  { name: 'sleep_quality', label: 'Schlafqualität', type: 'select', options: scale(['sehr schlecht', 'schlecht', 'okay', 'gut', 'sehr gut']), nullable: true },
  { name: 'soreness', label: 'Muskelkater / Steifheit', type: 'select', options: scale(['keiner', 'leicht', 'mittel', 'stark', 'sehr stark']) },
  { name: 'energy', label: 'Energie', type: 'select', options: scale(['leer', 'niedrig', 'mittel', 'gut', 'voll']) },
  { name: 'mood', label: 'Stimmung', type: 'select', options: scale(['schlecht', 'gedrückt', 'neutral', 'gut', 'sehr gut']) },
  { name: 'stress', label: 'Stress', type: 'select', options: scale(['kaum', 'wenig', 'mittel', 'hoch', 'sehr hoch']) },
  { name: 'resting_hr', label: 'Ruhepuls (optional)', type: 'int', unit: 'bpm' },
  { name: 'hrv_ms', label: 'HRV rMSSD (optional)', type: 'int', unit: 'ms' },
  { name: 'notes', label: 'Notiz', type: 'textarea' },
];
const INTS = ['sleep_quality', 'soreness', 'energy', 'mood', 'stress'];
const toInts = (p: Record<string, any>) => { const o = { ...p }; for (const k of INTS) if (o[k] != null && o[k] !== '') o[k] = Number(o[k]); return o; };
const tone = (l: string | null) => (l === 'gruen' ? 'green' : l === 'gelb' ? 'amber' : 'red');
const word = (l: string | null) => (l === 'gruen' ? 'gut' : l === 'gelb' ? 'mittel' : 'niedrig');

export default function RecoveryPage() {
  const { today } = useApp();
  const rows = useFetch<{ rows: any[] }>(`/api/r/readiness?from=${addDays(today, -60)}`);
  const stats = useFetch<{ days: any[] }>('/api/stats?kind=readiness&days=30');
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!rows.data || !stats.data) return <Spinner />;
  const score = (date: string) => stats.data!.days.find((d) => d.date === date);
  const todayRow = rows.data.rows.find((r) => r.date === today);
  const ts = score(today);
  const reload = () => { void rows.reload(); void stats.reload(); };

  return (
    <div className="space-y-4">
      <PageHeader title="Erholung" subtitle="Tägliche Tagesform – Grundlage für Anpassungen im Plan." />
      {msg && <Notice kind="success">{msg}</Notice>}
      <Card title="Heute">
        {ts?.score != null ? (
          <div className="flex items-center gap-3"><span className="text-4xl font-bold">{ts.score}</span><Badge tone={tone(ts.level)}>{word(ts.level)}</Badge><span className="text-xs text-slate-500">aus: {ts.usedFactors.join(', ')}</span></div>
        ) : todayRow ? <Notice kind="info">Für einen Score werden mindestens 3 Angaben benötigt.</Notice> : <Empty>Noch kein Check-in für heute.</Empty>}
        <div className="mt-3"><Button onClick={() => setEdit(todayRow ?? 'new')} data-testid="open-checkin">{todayRow ? 'Heutigen Check-in bearbeiten' : 'Check-in für heute'}</Button></div>
      </Card>
      <Card title="Verlauf (30 Tage)">
        <LineChart ariaLabel="Tagesform-Score" series={[{ name: 'Score', color: '#15803d', points: stats.data.days.filter((d) => d.score != null).map((d) => ({ x: d.date, y: d.score })) }]} hlines={[{ y: 70, label: 'gut', color: '#16a34a' }, { y: 45, label: 'niedrig', color: '#dc2626' }]} />
        <p className="mt-2 text-xs text-slate-500">Der Score (0–100) gewichtet Schlaf, Muskelkater, Energie, Stimmung, Stress sowie Ruhepuls und HRV im Vergleich zu deiner 14-Tage-Basis. Heuristik, keine medizinische Bewertung.</p>
      </Card>
      <Card title="Check-ins" action={<Button variant="ghost" onClick={() => setEdit('new')}>＋ Anderer Tag</Button>}>
        {rows.data.rows.length === 0 ? <Empty>Noch keine Check-ins.</Empty> : (
          <ul className="divide-y">{rows.data.rows.map((r) => {
            const sc = score(r.date);
            return <li key={r.id}><button className="flex min-h-[48px] w-full items-center justify-between py-2 text-left" onClick={() => setEdit(r)} data-testid="checkin-row"><span>{formatDe(r.date, true)}{r.sleep_hours != null && <span className="text-sm text-slate-500"> · {num(r.sleep_hours)} h Schlaf</span>}</span>{sc?.score != null ? <Badge tone={tone(sc.level)}>{sc.score}</Badge> : <Badge>kein Score</Badge>}</button></li>;
          })}</ul>
        )}
      </Card>
      <EditModal open={edit !== null} resource="readiness" title="Check-in" fields={FIELDS} row={edit === 'new' ? null : edit} defaults={{ date: today }} transformPayload={toInts}
        onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setMsg('Gespeichert.'); reload(); }} />
    </div>
  );
}
