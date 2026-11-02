'use client';
import Link from 'next/link';
import { useState } from 'react';
import { num, TYPE_ICON, TYPE_LABEL, useFetch } from '@/lib/client';
import { formatDe } from '@/domain/dates';
import { Badge, Card, Notice, PageHeader, Spinner, Tabs } from '@/components/ui';
import { ResourceCrud } from '@/components/ResourceCrud';
import { WORKOUT_FIELDS } from '@/components/fields';
import { useApp } from '@/components/AppContext';
import { LineChart } from '@/components/charts';

export default function TrainingPage() {
  const { today } = useApp();
  const [tab, setTab] = useState('log');
  const [key, setKey] = useState(0);
  return (
    <div>
      <PageHeader title="Training" subtitle="Alle absolvierten Einheiten – manuell oder per Datei-Import." action={<Link href="/import" className="text-sm font-medium text-pitch-700">Datei importieren</Link>} />
      <Tabs tabs={[{ id: 'log', label: 'Einheiten' }, { id: 'load', label: 'Belastung' }]} value={tab} onChange={setTab} />
      {tab === 'log' ? (
        <ResourceCrud<any> key={key} resource="workouts" title="Training" addLabel="Training erfassen" emptyText="Noch keine Trainings erfasst. Erfasse eine Einheit oder importiere eine FIT/TCX/GPX-Datei." fields={WORKOUT_FIELDS}
          defaults={{ date: today, type: 'rad' }} onChanged={() => setKey(key)}
          renderRow={(w) => (
            <div>
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{TYPE_ICON[w.type]} {w.title}</span><span className="text-xs text-slate-500">{formatDe(w.date, true)}</span></div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{num(w.duration_min, 0)} min</span>
                {w.distance_km != null && <span>{num(w.distance_km)} km</span>}
                {w.normalized_power_w != null ? <span>NP {w.normalized_power_w} W</span> : w.avg_power_w != null ? <span>Ø {w.avg_power_w} W</span> : null}
                {w.avg_hr != null && <span>♥ {w.avg_hr}</span>}
                {w.tss != null ? <Badge tone={w.tss_source === 'power' ? 'green' : 'amber'}>TSS {num(w.tss, 0)}{w.tss_source === 'rpe' ? ' (aus RPE geschätzt)' : ''}</Badge> : <Badge>ohne Belastungswert</Badge>}
                {w.source !== 'manual' && <Badge tone="blue">Import {w.source.toUpperCase()}</Badge>}
              </div>
            </div>
          )} />
      ) : <LoadView />}
    </div>
  );
}

function LoadView() {
  const { data, error, loading } = useFetch<any>('/api/stats?kind=pmc');
  if (loading && !data) return <Spinner />;
  if (error) return <Notice kind="error">{error}</Notice>;
  const pts = data.points as { date: string; ctl: number; atl: number; tsb: number }[];
  const last = pts[pts.length - 1];
  return (
    <div className="space-y-3">
      <Card title="Fitness, Ermüdung, Form (12 Wochen)">
        <LineChart ariaLabel="CTL, ATL, TSB" series={[
          { name: 'CTL Fitness', color: '#15803d', points: pts.map((p) => ({ x: p.date, y: p.ctl })) },
          { name: 'ATL Ermüdung', color: '#dc2626', points: pts.map((p) => ({ x: p.date, y: p.atl })) },
          { name: 'TSB Form', color: '#2563eb', points: pts.map((p) => ({ x: p.date, y: p.tsb })), dashed: true },
        ]} />
        {last && <p className="mt-2 text-sm text-slate-700">Heute: CTL {last.ctl} · ATL {last.atl} · TSB {last.tsb}</p>}
      </Card>
      <Notice kind="info">CTL = gleitender Durchschnitt der Tagesbelastung (TSS) über 42 Tage, ATL über 7 Tage, TSB = CTL − ATL. Die Berechnung startet bei 0 am ersten erfassten Training – frühere Belastung ist nicht bekannt. Trainings ohne Leistungsdaten und ohne RPE fließen nicht ein{data.missingTss ? ` (aktuell ${data.missingTss})` : ''}.</Notice>
    </div>
  );
}
