'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, INTENSITY_LABEL, num, TYPE_ICON, TYPE_LABEL, useFetch } from '@/lib/client';
import { formatDe } from '@/domain/dates';
import { Badge, Button, Card, Empty, Notice, PageHeader, ProgressBar, Spinner, Stat } from '@/components/ui';
import { EditModal } from '@/components/ResourceCrud';
import { WORKOUT_FIELDS } from '@/components/fields';
import { useApp } from '@/components/AppContext';
import { LineChart } from '@/components/charts';

export default function Dashboard() {
  const { today } = useApp();
  const { data: d, error, loading, reload } = useFetch<any>('/api/dashboard');
  const [logFor, setLogFor] = useState<any | null>(null);
  if (loading && !d) return <Spinner />;
  if (error || !d) return <Notice kind="error">{error ?? 'Daten konnten nicht geladen werden.'}</Notice>;

  const skip = async (id: string) => { await api(`/api/r/plan-sessions/${id}`, { method: 'PATCH', body: { status: 'skipped' } }); void reload(); };
  const p = d.weight.progress;
  const t = d.nutrition.target;
  const lowData = d.dataQuality.workoutsLast28d < 3;

  return (
    <div className="space-y-4">
      <PageHeader title={`Heute, ${formatDe(today, true)}`} subtitle={<><Badge tone="green">{d.phase.label}</Badge> {d.phase.focus}</>} />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Freundschaftsspiel" value={d.countdown.firstFriendly >= 0 ? `${d.countdown.firstFriendly} Tage` : 'vorbei'} sub={formatDe(d.profile.first_friendly_date, true)} />
        <Stat label="Hauptziel" value={d.countdown.mainGoal >= 0 ? `${d.countdown.mainGoal} Tage` : 'vorbei'} sub={formatDe(d.profile.main_goal_date, true)} />
      </div>

      <Card title="Schwerpunkt der Vorbereitung">
        <div className="mb-1 flex justify-between text-sm"><span>Allgemeine Fitness</span><span>Fußballspezifisch</span></div>
        <ProgressBar percent={d.phase.specificityPct} label="Fußballspezifischer Anteil" />
        <p className="mt-2 text-sm text-slate-600">Aktuell ca. {d.phase.specificityPct} % fußballspezifische Inhalte im Plan.</p>
      </Card>

      {d.pendingProposals > 0 && (
        <Notice kind="warn">
          Es liegen {d.pendingProposals} Planvorschläge zur Bestätigung vor. <Link href="/plan" className="font-semibold underline">Jetzt prüfen</Link>
        </Notice>
      )}

      <Card title="Heute geplant" action={<Link href="/plan" className="text-sm font-medium text-pitch-700">Zum Plan</Link>}>
        {d.todaySessions.length === 0 ? <Empty>Für heute ist nichts geplant. Ruhetag oder keine Zeit laut Verfügbarkeit.</Empty> : (
          <ul className="space-y-3">
            {d.todaySessions.map((s: any) => (
              <li key={s.id} className="rounded-xl bg-slate-50 p-3" data-testid="today-session">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{TYPE_ICON[s.type]} {s.title}</div>
                    <div className="text-sm text-slate-600">{s.duration_min} min · {INTENSITY_LABEL[s.intensity]}</div>
                    {s.description && <p className="mt-1 text-sm text-slate-600">{s.description}</p>}
                  </div>
                  <Badge tone={s.status === 'done' ? 'green' : s.status === 'skipped' ? 'amber' : 'slate'}>{s.status === 'done' ? 'erledigt' : s.status === 'skipped' ? 'übersprungen' : 'geplant'}</Badge>
                </div>
                {s.status === 'planned' && s.type !== 'spiel' && (
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => setLogFor(s)} data-testid="log-session">Erledigt erfassen</Button>
                    <Button variant="secondary" onClick={() => skip(s.id)}>Überspringen</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Tagesform" action={<Link href="/erholung" className="text-sm font-medium text-pitch-700">Check-in</Link>}>
        {d.readinessToday?.score != null ? (
          <div className="flex items-center gap-3"><span className="text-3xl font-bold">{d.readinessToday.score}</span><Badge tone={d.readinessToday.level === 'gruen' ? 'green' : d.readinessToday.level === 'gelb' ? 'amber' : 'red'}>{d.readinessToday.level === 'gruen' ? 'gut' : d.readinessToday.level === 'gelb' ? 'mittel' : 'niedrig'}</Badge></div>
        ) : <Empty>Noch kein Check-in heute. <Link href="/erholung" className="font-semibold text-pitch-700 underline">Jetzt eintragen</Link></Empty>}
      </Card>

      <Card title="Gewicht" action={<Link href="/koerper" className="text-sm font-medium text-pitch-700">Details</Link>}>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Aktuell" value={`${num(p.currentKg, 2)} kg`} />
          <Stat label="Ziel" value={`${num(p.targetKg, 2)} kg`} sub={`noch ${num(Math.max(0, p.remainingKg), 2)} kg`} />
          <Stat label="Trend" value={d.weight.rate == null ? '–' : `${num(d.weight.rate, 2)} kg/Wo`} sub={d.weight.rate == null ? 'zu wenig Daten' : undefined} />
        </div>
        <div className="mt-3"><ProgressBar percent={p.percent} label="Fortschritt zum Zielgewicht" /></div>
        <p className="mt-1 text-xs text-slate-500">{p.percent} % des Wegs von {num(p.startKg, 2)} kg zum Zielgewicht{p.projectedKgAtGoal != null ? ` · Prognose zum Hauptziel bei aktuellem Trend: ${num(p.projectedKgAtGoal)} kg` : ''}. Das Zielgewicht ist eine flexible Orientierung.</p>
        {d.weight.trend.length > 1 && <LineChart ariaLabel="Gewichtsverlauf" unit="kg" hlines={[{ y: p.targetKg, label: 'Ziel' }]} series={[{ name: 'Gewicht', color: '#94a3b8', points: d.weight.trend.map((x: any) => ({ x: x.date, y: x.weight_kg })) }, { name: 'Trend', color: '#15803d', points: d.weight.trend.map((x: any) => ({ x: x.date, y: x.trend })) }]} />}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card title="Leistung"><Stat label="FTP" value={`${d.ftp.current} W`} sub={`${num(d.ftp.wattsPerKg, 2)} W/kg · Start ${d.ftp.start} W`} /></Card>
        <Card title="Form">
          {d.form ? <Stat label="TSB (Frische)" value={num(d.form.tsb)} sub={`CTL ${num(d.form.ctl)} · ATL ${num(d.form.atl)}`} /> : <p className="text-sm text-slate-500">Noch keine Trainings mit Belastungswert.</p>}
        </Card>
      </div>

      <Card title="Ernährung heute" action={<Link href="/ernaehrung" className="text-sm font-medium text-pitch-700">Öffnen</Link>}>
        {t ? (
          <>
            <div className="flex items-baseline justify-between"><span className="text-2xl font-bold">{num(d.nutrition.totals.kcal, 0)} kcal</span><span className="text-sm text-slate-600">Ziel {t.kcal} kcal</span></div>
            <ProgressBar percent={(d.nutrition.totals.kcal / t.kcal) * 100} label="Kalorien heute" />
            <p className="mt-1 text-xs text-slate-500">Eiweiß {num(d.nutrition.totals.protein_g, 0)} / {t.proteinG} g</p>
          </>
        ) : <Empty>Für ein Kalorienziel fehlen Angaben: {d.nutrition.missing.join(', ')}. <Link href="/einstellungen" className="font-semibold text-pitch-700 underline">Im Profil ergänzen</Link></Empty>}
      </Card>

      <Card title="Diese Woche">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Einheiten" value={`${d.week.done}/${d.week.planned}`} sub="erledigt/geplant" />
          <Stat label="Trainiert" value={`${d.week.minutes} min`} sub={`${d.week.sessions} Trainings`} />
          <Stat label="Belastung" value={num(d.week.tss, 0)} sub="TSS" />
        </div>
      </Card>

      <Card title="Nächste 7 Tage">
        {d.upcoming.length === 0 ? <Empty>Keine Einheiten geplant.</Empty> : (
          <ul className="divide-y">{d.upcoming.map((s: any) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm"><span>{TYPE_ICON[s.type]} {s.title}</span><span className="text-slate-500">{formatDe(s.date, true).slice(0, 9)} · {s.duration_min} min</span></li>
          ))}</ul>
        )}
      </Card>

      {lowData && <Notice kind="info">Aussagen zu Trends und Belastung werden erst mit mehr Daten belastbar (aktuell {d.dataQuality.workoutsLast28d} Trainings in den letzten 28 Tagen). Es werden keine Werte geschätzt oder ergänzt.</Notice>}

      <EditModal open={!!logFor} resource="workouts" title="Training erfassen" fields={WORKOUT_FIELDS}
        defaults={logFor ? { date: logFor.date, type: logFor.type === 'ruhe' ? 'sonstiges' : logFor.type, title: logFor.title, duration_min: logFor.duration_min } : undefined}
        transformPayload={(p) => ({ ...p, plan_session_id: logFor?.id })}
        onClose={() => setLogFor(null)} row={null} onSaved={() => { setLogFor(null); void reload(); }} />
    </div>
  );
}
