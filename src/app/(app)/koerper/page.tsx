'use client';
import { useState } from 'react';
import { num, useFetch } from '@/lib/client';
import { formatDe } from '@/domain/dates';
import { powerZones, ftpFromTest } from '@/domain/cycling';
import { Badge, Card, Field, Notice, PageHeader, ProgressBar, Spinner, Stat, Tabs, type FieldDef } from '@/components/ui';
import { ResourceCrud } from '@/components/ResourceCrud';
import { LineChart } from '@/components/charts';
import { useApp } from '@/components/AppContext';

const WEIGHT_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'weight_kg', label: 'Gewicht', type: 'number', unit: 'kg', step: 0.05, required: true },
  { name: 'body_fat_pct', label: 'Körperfett', type: 'number', unit: '%', step: 0.1 },
  { name: 'notes', label: 'Notiz', type: 'textarea' },
];
const FTP_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'method', label: 'Methode', type: 'select', required: true, options: [{ value: '20min', label: '20-Minuten-Test (× 0,95)' }, { value: 'ramp', label: 'Ramp-Test (× 0,75)' }, { value: 'manual', label: 'Manuell festgelegt' }, { value: 'initial', label: 'Ausgangswert' }] },
  { name: 'test_value_w', label: 'Testwert (20-min-Mittel bzw. bestes Minutenmittel)', type: 'int', unit: 'W' },
  { name: 'ftp_w', label: 'FTP', type: 'int', unit: 'W', required: true, help: 'Wird beim Speichern aus Methode und Testwert vorgeschlagen, wenn leer.' },
  { name: 'notes', label: 'Notiz', type: 'textarea' },
];

export default function BodyPage() {
  const [tab, setTab] = useState('weight');
  return (
    <div>
      <PageHeader title="Körper & Leistung" />
      <Tabs tabs={[{ id: 'weight', label: 'Gewicht' }, { id: 'ftp', label: 'FTP' }]} value={tab} onChange={setTab} />
      {tab === 'weight' ? <WeightView /> : <FtpView />}
    </div>
  );
}

function WeightView() {
  const { today } = useApp();
  const stats = useFetch<any>('/api/stats?kind=weight');
  const [v, setV] = useState(0);
  if (!stats.data) return <Spinner />;
  const s = stats.data; const p = s.progress;
  return (
    <div className="space-y-3">
      <Card title="Verlauf">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Aktuell" value={`${num(p.currentKg, 2)} kg`} />
          <Stat label="Bisher" value={`${p.lostKg > 0 ? '−' : '+'}${num(Math.abs(p.lostKg), 2)} kg`} />
          <Stat label="Noch" value={`${num(Math.max(0, p.remainingKg), 2)} kg`} sub={`Ziel ${num(p.targetKg, 2)}`} />
        </div>
        <div className="my-3"><ProgressBar percent={p.percent} label="Fortschritt" /></div>
        <LineChart ariaLabel="Gewichtsverlauf" unit="kg" hlines={[{ y: p.targetKg, label: 'Ziel' }]} series={[
          { name: 'Messwert', color: '#94a3b8', points: s.series.map((x: any) => ({ x: x.date, y: x.weight_kg })) },
          { name: 'Trend', color: '#15803d', points: s.series.map((x: any) => ({ x: x.date, y: x.trend })) },
        ]} />
        <p className="mt-2 text-sm text-slate-600">{s.rate == null ? 'Für einen Trend werden mindestens 3 Messungen über mindestens 7 Tage benötigt.' : `Trend der letzten 4 Wochen: ${num(s.rate, 2)} kg pro Woche.`} {p.requiredWeeklyKg != null && `Für das Zielgewicht bis zum Hauptziel wären ${num(p.requiredWeeklyKg, 2)} kg/Woche nötig.`}</p>
      </Card>
      <ResourceCrud<any> key={v} resource="weights" title="Gewichtseintrag" addLabel="Gewicht eintragen" emptyText="Noch keine Einträge." fields={WEIGHT_FIELDS} defaults={{ date: today }} onChanged={() => { void stats.reload(); setV(v); }}
        renderRow={(w) => <div className="flex items-center justify-between"><span className="font-semibold">{num(w.weight_kg, 2)} kg {w.body_fat_pct != null && <span className="text-sm font-normal text-slate-500">· {num(w.body_fat_pct)} % KFA</span>}</span><span className="text-sm text-slate-500">{formatDe(w.date, true)} {w.source === 'import' && <Badge tone="blue">Import</Badge>}</span></div>} />
    </div>
  );
}

function FtpView() {
  const { today } = useApp();
  const stats = useFetch<any>('/api/stats?kind=ftp');
  const [calc, setCalc] = useState<{ method: '20min' | 'ramp'; w: string }>({ method: '20min', w: '' });
  if (!stats.data) return <Spinner />;
  const s = stats.data;
  const zones = powerZones(s.current);
  const suggestion = Number(calc.w) > 0 ? ftpFromTest(calc.method, Number(calc.w)) : null;
  return (
    <div className="space-y-3">
      <Card title="Aktuelle FTP">
        <div className="grid grid-cols-3 gap-2"><Stat label="FTP" value={`${s.current} W`} /><Stat label="W/kg" value={num(s.wattsPerKg, 2)} /><Stat label="Start" value={`${s.start} W`} sub={s.current !== s.start ? `${s.current > s.start ? '+' : ''}${s.current - s.start} W` : undefined} /></div>
        {s.history.length > 1 && <LineChart ariaLabel="FTP-Verlauf" unit="W" series={[{ name: 'FTP', color: '#15803d', points: s.history.map((h: any) => ({ x: h.date, y: h.ftp_w })) }]} />}
      </Card>
      <Card title="Leistungszonen">
        <table className="w-full text-sm"><tbody>{zones.map((z) => <tr key={z.id} className="border-t first:border-0"><td className="py-1.5">{z.name}</td><td className="text-right text-slate-600">{z.low}{z.high ? `–${z.high}` : '+'} W</td></tr>)}</tbody></table>
      </Card>
      <Card title="FTP aus Test berechnen">
        <div className="grid grid-cols-2 gap-3">
          <Field def={{ name: 'm', label: 'Methode', type: 'select', required: true, options: [{ value: '20min', label: '20-min-Test' }, { value: 'ramp', label: 'Ramp-Test' }] }} value={calc.method} onChange={(v) => setCalc({ ...calc, method: v })} />
          <Field def={{ name: 'w', label: 'Testwert', type: 'int', unit: 'W' }} value={calc.w} onChange={(v) => setCalc({ ...calc, w: v })} />
        </div>
        {suggestion && <Notice kind="info">Ergibt FTP ≈ <strong>{suggestion} W</strong>. Trage das Ergebnis unten als FTP-Eintrag ein, damit es für künftige Trainings gilt.</Notice>}
      </Card>
      <ResourceCrud<any> resource="ftp-tests" title="FTP-Eintrag" addLabel="FTP-Eintrag hinzufügen" emptyText="Keine Einträge." fields={FTP_FIELDS} defaults={{ date: today, method: '20min' }} onChanged={() => void stats.reload()}
        transformPayload={(p) => ({ ...p, ftp_w: p.ftp_w ?? (p.test_value_w && (p.method === '20min' || p.method === 'ramp') ? ftpFromTest(p.method, p.test_value_w) : undefined) })}
        renderRow={(f) => <div className="flex items-center justify-between"><span className="font-semibold">{f.ftp_w} W</span><span className="text-sm text-slate-500">{formatDe(f.date)} · {f.method === 'initial' ? 'Ausgangswert' : f.method === '20min' ? '20-min-Test' : f.method === 'ramp' ? 'Ramp-Test' : 'manuell'}</span></div>} />
    </div>
  );
}
