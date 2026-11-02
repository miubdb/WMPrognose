'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { parseFit } from '@/import/fit';
import { parseTcx } from '@/import/tcx';
import { parseGpx } from '@/import/gpx';
import { AppleHealthParser, type HealthResult } from '@/import/appleHealth';
import { extractWeights, parseCsv, type ParsedCsv } from '@/import/csv';
import type { ParsedActivity } from '@/import/types';
import { WORKOUT_TYPE_OPTS } from '@/components/fields';
import { formatDe } from '@/domain/dates';
import { Badge, Button, Card, Notice, PageHeader, Tabs } from '@/components/ui';

export default function ImportPage() {
  const [tab, setTab] = useState('act');
  return (
    <div className="space-y-3">
      <PageHeader title="Import" subtitle="Direkte Anbindungen (Garmin, Strava, Apple Health) sind nicht möglich bzw. nicht zulässig – stattdessen Dateiimport." />
      <Tabs tabs={[{ id: 'act', label: 'Aktivitäten' }, { id: 'apple', label: 'Apple Health' }, { id: 'csv', label: 'Gewicht (CSV)' }]} value={tab} onChange={setTab} />
      {tab === 'act' && <ActivityImport />}
      {tab === 'apple' && <AppleImport />}
      {tab === 'csv' && <CsvImport />}
      <Notice kind="info">Warum nur Dateien? Garmin Connect bietet nur Geschäftspartnern eine API, Strava verbietet in seinen API-Bedingungen die Nutzung der Daten in KI-Systemen, und Apple Health hat keine Web-Schnittstelle. Details: docs/INTEGRATIONEN.md.</Notice>
    </div>
  );
}

async function readBytes(file: File): Promise<{ name: string; bytes: Uint8Array }> {
  let name = file.name.toLowerCase();
  let bytes: Uint8Array;
  if (name.endsWith('.gz')) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Dein Browser kann .gz-Dateien nicht entpacken. Bitte die Datei vorher entpacken.');
    const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    name = name.slice(0, -3);
  } else bytes = new Uint8Array(await file.arrayBuffer());
  return { name, bytes };
}

type Row = ParsedActivity & { rpe?: number | null; file: string };

function ActivityImport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const [apiErr, setApiErr] = useState<string | null>(null);

  async function onFiles(files: FileList) {
    setResult(null); setApiErr(null);
    const ok: Row[] = []; const bad: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const { name, bytes } = await readBytes(f);
        let a: ParsedActivity;
        if (name.endsWith('.fit')) a = parseFit(bytes);
        else if (name.endsWith('.tcx')) a = parseTcx(new TextDecoder().decode(bytes));
        else if (name.endsWith('.gpx')) a = parseGpx(new TextDecoder().decode(bytes));
        else throw new Error('Dateityp nicht unterstützt (erlaubt: .fit, .tcx, .gpx, jeweils auch als .gz).');
        ok.push({ ...a, file: f.name, rpe: null });
      } catch (e) { bad.push(`${f.name}: ${(e as Error).message}`); }
    }
    setRows((r) => [...r, ...ok]); setErrors(bad);
  }
  const upd = (i: number, p: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  async function run() {
    setBusy(true); setApiErr(null);
    try {
      const activities = rows.map(({ file, rpe, ...a }) => ({ ...a, rpe: rpe ? Number(rpe) : null }));
      setResult(await api('/api/import/workouts', { method: 'POST', body: { activities } }));
      setRows([]);
    } catch (e) { setApiErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Card title="FIT, TCX, GPX">
      <p className="mb-3 text-sm text-slate-600">Garmin/Wahoo/Zwift: <strong>.fit</strong>. Strava-Export: Originaldateien (<strong>.fit.gz</strong>, <strong>.gpx</strong>, <strong>.tcx</strong>). Die Dateien werden in deinem Browser gelesen; übertragen werden nur die Kennzahlen.</p>
      <input type="file" multiple accept=".fit,.tcx,.gpx,.gz" data-testid="activity-files" aria-label="Aktivitätsdateien wählen" onChange={(e) => e.target.files && void onFiles(e.target.files)} className="mb-3 block w-full text-sm" />
      {errors.map((e) => <div key={e} className="mb-2"><Notice kind="error">{e}</Notice></div>)}
      {apiErr && <Notice kind="error">{apiErr}</Notice>}
      {result && <Notice kind="success">{result.imported} importiert, {result.duplicates} bereits vorhanden (übersprungen).</Notice>}
      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.externalId + i} className="space-y-2 rounded-xl bg-slate-50 p-3" data-testid="import-row">
              <div className="flex items-center justify-between text-sm"><span className="font-medium">{formatDe(r.date, true)} · {r.durationMin} min{r.distanceKm ? ` · ${r.distanceKm} km` : ''}</span><button className="text-red-700" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Entfernen</button></div>
              <div className="flex flex-wrap gap-1 text-xs text-slate-600">
                {r.normalizedPowerW ? <Badge tone="green">NP {r.normalizedPowerW} W</Badge> : <Badge tone="amber">keine Leistungsdaten</Badge>}
                {r.avgHr && <Badge>Ø {r.avgHr} bpm</Badge>}{r.elevationM != null && <Badge>{r.elevationM} Hm</Badge>}<Badge tone="blue">{r.source.toUpperCase()}</Badge>
              </div>
              <input aria-label="Titel" className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3" value={r.title} onChange={(e) => upd(i, { title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Art" className="min-h-[44px] rounded-xl border border-slate-300 px-2" value={r.type} onChange={(e) => upd(i, { type: e.target.value as any })}>{WORKOUT_TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                <input aria-label="RPE (1–10)" inputMode="numeric" placeholder={r.normalizedPowerW ? 'RPE (optional)' : 'RPE für Belastung'} className="min-h-[44px] rounded-xl border border-slate-300 px-3" value={r.rpe ?? ''} onChange={(e) => upd(i, { rpe: e.target.value as any })} />
              </div>
              {!r.normalizedPowerW && !r.rpe && <p className="text-xs text-amber-800">Ohne Leistungsdaten und ohne RPE wird für diese Einheit kein Belastungswert (TSS) berechnet.</p>}
            </div>
          ))}
          <Button busy={busy} onClick={run} data-testid="run-import">{rows.length} Aktivität(en) importieren</Button>
        </div>
      )}
    </Card>
  );
}

function AppleImport() {
  const [res, setRes] = useState<HealthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [opt, setOpt] = useState({ weights: true, overwrite: false, hr: true, workouts: true });
  async function onFile(file: File) {
    setErr(null); setRes(null); setDone(null); setBusy(true);
    try {
      const parser = new AppleHealthParser();
      const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
      let read = 0;
      for (;;) {
        const { done: d, value } = await reader.read();
        if (d) break;
        read += value.length; parser.push(value);
        if (read % 5_000_000 < value.length) setProgress(`${Math.round(read / 1_000_000)} MB gelesen …`);
      }
      const r = parser.finish();
      if (!r.weights.length && !r.restingHr.length && !r.workouts.length) throw new Error('In der Datei wurden keine Gewichts-, Ruhepuls- oder Workout-Daten gefunden. Bitte die entpackte export.xml aus dem Apple-Health-Export wählen.');
      setRes(r);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); setProgress(''); }
  }
  async function run() {
    setBusy(true); setErr(null);
    const parts: string[] = [];
    try {
      if (opt.weights && res!.weights.length) { const r = await api('/api/import/weights', { method: 'POST', body: { rows: res!.weights, overwrite: opt.overwrite } }); parts.push(`Gewicht: ${r.imported} importiert, ${r.skipped} übersprungen`); }
      if (opt.hr && res!.restingHr.length) { const r = await api('/api/import/resting-hr', { method: 'POST', body: { rows: res!.restingHr } }); parts.push(`Ruhepuls: ${r.imported} Tage`); }
      if (opt.workouts && res!.workouts.length) {
        let imp = 0, dup = 0;
        for (let i = 0; i < res!.workouts.length; i += 500) { const r = await api('/api/import/workouts', { method: 'POST', body: { activities: res!.workouts.slice(i, i + 500) } }); imp += r.imported; dup += r.duplicates; }
        parts.push(`Workouts: ${imp} importiert, ${dup} vorhanden`);
      }
      setDone(parts.join(' · ') || 'Nichts ausgewählt.');
    } catch (e) { setErr(`${parts.join(' · ')}${parts.length ? ' · ' : ''}Fehler: ${(e as Error).message}`); } finally { setBusy(false); }
  }
  return (
    <Card title="Apple Health (export.xml)">
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-600"><li>Health-App → Profilbild → „Alle Gesundheitsdaten exportieren“.</li><li>ZIP entpacken (Dateien-App) und <strong>export.xml</strong> hier wählen. Große Dateien werden stückweise im Browser gelesen.</li></ol>
      <input type="file" accept=".xml,text/xml" data-testid="health-file" aria-label="export.xml wählen" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} className="mb-3 block w-full text-sm" />
      {progress && <p className="text-sm text-slate-500" role="status">{progress}</p>}
      {err && <Notice kind="error">{err}</Notice>}
      {done && <Notice kind="success">{done}</Notice>}
      {res && (
        <div className="space-y-2">
          <p className="text-sm">Gefunden: {res.weights.length} Tage mit Gewicht, {res.restingHr.length} Tage mit Ruhepuls, {res.workouts.length} Workouts (Rad, Lauf, Fußball, Kraft, Mobilität).</p>
          {([['weights', 'Gewicht & Körperfett'], ['hr', 'Ruhepuls (in Check-ins)'], ['workouts', 'Workouts']] as const).map(([k, l]) => <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-pitch-600" checked={opt[k]} onChange={(e) => setOpt({ ...opt, [k]: e.target.checked })} />{l}</label>)}
          {opt.weights && <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-pitch-600" checked={opt.overwrite} onChange={(e) => setOpt({ ...opt, overwrite: e.target.checked })} />Vorhandene Gewichtswerte desselben Tages überschreiben</label>}
          <Button busy={busy} onClick={run} data-testid="run-apple">Importieren</Button>
        </div>
      )}
    </Card>
  );
}

function CsvImport() {
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [cols, setCols] = useState({ date: 0, weight: 1, fat: -1 });
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onFile(f: File) {
    setErr(null); setDone(null); setCsv(null);
    try {
      const p = parseCsv(await f.text());
      const find = (re: RegExp) => p.headers.findIndex((h) => re.test(h));
      setCols({ date: Math.max(0, find(/dat|time|zeit/i)), weight: Math.max(0, find(/gewicht|weight|kg/i)), fat: find(/fett|fat/i) });
      setCsv(p);
    } catch (e) { setErr((e as Error).message); }
  }
  const preview = csv ? extractWeights(csv, cols.date, cols.weight, cols.fat >= 0 ? cols.fat : null) : null;
  async function run() {
    setBusy(true); setErr(null);
    try { const r = await api('/api/import/weights', { method: 'POST', body: { rows: preview!.rows, overwrite } }); setDone(`${r.imported} importiert, ${r.skipped} bereits vorhanden.`); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const sel = (label: string, key: 'date' | 'weight' | 'fat', optional = false) => (
    <label className="block text-sm">{label}
      <select className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-2" value={cols[key]} onChange={(e) => setCols({ ...cols, [key]: Number(e.target.value) })}>
        {optional && <option value={-1}>– keine –</option>}{csv!.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
      </select>
    </label>
  );
  return (
    <Card title="Gewichtsdaten aus CSV">
      <p className="mb-3 text-sm text-slate-600">Erste Zeile = Spaltenüberschriften. Datum als <code>JJJJ-MM-TT</code> oder <code>TT.MM.JJJJ</code>; Dezimalkomma oder -punkt. Je Tag zählt der letzte Eintrag.</p>
      <input type="file" accept=".csv,text/csv,text/plain" data-testid="csv-file" aria-label="CSV-Datei wählen" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} className="mb-3 block w-full text-sm" />
      {err && <Notice kind="error">{err}</Notice>}
      {done && <Notice kind="success">{done}</Notice>}
      {csv && preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">{sel('Spalte Datum', 'date')}{sel('Spalte Gewicht (kg)', 'weight')}{sel('Spalte Körperfett (optional)', 'fat', true)}</div>
          <p className="text-sm">{preview.rows.length} gültige Tage{preview.skipped ? `, ${preview.skipped} Zeilen übersprungen (ungültiges Datum/Gewicht)` : ''}. Beispiel: {preview.rows[0] ? `${formatDe(preview.rows[0].date)} – ${preview.rows[0].weight_kg} kg` : '–'}</p>
          <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-pitch-600" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />Vorhandene Werte desselben Tages überschreiben</label>
          <Button busy={busy} disabled={!preview.rows.length} onClick={run} data-testid="run-csv">Importieren</Button>
        </div>
      )}
    </Card>
  );
}
