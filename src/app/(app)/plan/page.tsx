'use client';
import { useMemo, useState } from 'react';
import { api, ApiClientError, INTENSITY_LABEL, TYPE_ICON, TYPE_LABEL, useFetch } from '@/lib/client';
import { addDays, eachDay, formatDe, startOfWeek, WEEKDAYS_SHORT } from '@/domain/dates';
import { boundaries, PHASES, phaseOf } from '@/domain/phases';
import { Badge, Button, Card, ConfirmButton, Empty, Modal, Notice, PageHeader, Spinner } from '@/components/ui';
import { EditModal } from '@/components/ResourceCrud';
import { PLAN_FIELDS, planPayload, WORKOUT_FIELDS } from '@/components/fields';
import { ProposalList } from '@/components/ProposalList';
import { useApp } from '@/components/AppContext';

export default function PlanPage() {
  const { today } = useApp();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const weekEnd = addDays(weekStart, 6);
  const profile = useFetch<{ profile: any }>('/api/profile');
  const sessions = useFetch<{ rows: any[] }>(`/api/r/plan-sessions?from=${weekStart}&to=${weekEnd}`);
  const events = useFetch<{ rows: any[] }>(`/api/r/events?from=${weekStart}&to=${weekEnd}`);
  const exceptions = useFetch<{ rows: any[] }>(`/api/r/exceptions?from=${weekStart}&to=${weekEnd}`);
  const proposals = useFetch<{ proposals: any[] }>('/api/proposals?status=pending');
  const [open, setOpen] = useState<any | null>(null);
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  const [newDate, setNewDate] = useState(today);
  const [log, setLog] = useState<any | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error' | 'warn' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showGen, setShowGen] = useState(false);

  const p = profile.data?.profile;
  const m = p ? { start: p.start_date, firstFriendly: p.first_friendly_date, mainGoal: p.main_goal_date } : null;
  const reloadAll = () => { void sessions.reload(); void events.reload(); void proposals.reload(); };
  const phase = m ? PHASES[phaseOf(weekStart < m.start ? m.start : weekStart, m)] : null;

  const days = useMemo(() => eachDay(weekStart, weekEnd), [weekStart, weekEnd]);
  if (!p || !sessions.data) return <Spinner />;

  async function checkRules() {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ message: string }>('/api/proposals/check', { method: 'POST', body: {} });
      setMsg({ kind: 'info', text: r.message }); void proposals.reload();
    } catch (e) { setMsg({ kind: 'error', text: (e as Error).message }); } finally { setBusy(false); }
  }
  async function setStatus(s: any, status: string) {
    try { await api(`/api/r/plan-sessions/${s.id}`, { method: 'PATCH', body: { status } }); setOpen(null); reloadAll(); }
    catch (e) { setMsg({ kind: 'error', text: (e as Error).message }); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Trainingsplan" subtitle={phase ? <><Badge tone="green">{phase.label}</Badge> {phase.focus}</> : undefined} />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {proposals.data && proposals.data.proposals.length > 0 && (
        <Card title="Vorschläge zur Bestätigung">
          <ProposalList proposals={proposals.data.proposals} onDone={(text) => { setMsg({ kind: 'success', text }); reloadAll(); }} onError={(text) => setMsg({ kind: 'error', text })} />
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Vorherige Woche">‹</Button>
        <div className="text-center">
          <div className="font-semibold">{formatDe(weekStart).slice(0, 6)} – {formatDe(weekEnd)}</div>
          {weekStart !== startOfWeek(today) && <button className="text-xs font-medium text-pitch-700" onClick={() => setWeekStart(startOfWeek(today))}>Zur aktuellen Woche</button>}
        </div>
        <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Nächste Woche">›</Button>
      </div>

      <div className="space-y-2">
        {days.map((d, i) => {
          const items = sessions.data!.rows.filter((s) => s.date === d);
          const evs = (events.data?.rows ?? []).filter((e) => e.date === d);
          const ex = (exceptions.data?.rows ?? []).find((e) => e.date === d);
          const milestone = d === p.first_friendly_date ? 'Erstes Freundschaftsspiel' : d === p.main_goal_date ? 'Hauptziel' : null;
          return (
            <section key={d} className={`rounded-2xl bg-white p-3 ring-1 ${d === today ? 'ring-2 ring-pitch-500' : 'ring-slate-200'}`} aria-label={formatDe(d, true)} data-testid="plan-day">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{WEEKDAYS_SHORT[i]} {formatDe(d).slice(0, 5)}{d === today && <span className="ml-2 text-xs text-pitch-700">heute</span>}</h3>
                <button className="min-h-[36px] px-2 text-lg text-pitch-700" aria-label={`Einheit am ${formatDe(d)} hinzufügen`} onClick={() => { setNewDate(d); setEdit('new'); }}>＋</button>
              </div>
              {milestone && <div className="mb-1"><Badge tone="amber">🏟️ {milestone}</Badge></div>}
              {evs.map((e) => <div key={e.id} className="mb-1"><Badge tone="blue">📌 {e.title}</Badge></div>)}
              {ex && <div className="mb-1"><Badge tone="slate">Verfügbarkeit angepasst: {ex.available_minutes} min{ex.reason ? ` (${ex.reason})` : ''}</Badge></div>}
              {items.length === 0 ? <p className="text-sm text-slate-400">Frei</p> : (
                <ul className="space-y-1">
                  {items.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => setOpen(s)} data-testid="plan-session" className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 p-2 text-left active:bg-slate-100">
                        <span className={s.status === 'skipped' ? 'text-slate-400 line-through' : ''}>{TYPE_ICON[s.type]} {s.title}</span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">{s.duration_min} min
                          {s.status === 'done' && <Badge tone="green">✓</Badge>}{s.source === 'ai' && <Badge tone="blue">KI</Badge>}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Card title="Plan verwalten">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowGen(true)} data-testid="open-generate">Plan neu erzeugen</Button>
          <Button variant="secondary" busy={busy} onClick={checkRules}>Belastung prüfen</Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">„Belastung prüfen“ nutzt feste Regeln (Tagesform, Form/TSB). Ein Vorschlag wird erst nach deiner Bestätigung übernommen.</p>
      </Card>

      <PhaseOverview m={m!} />

      <SessionDetail s={open} onClose={() => setOpen(null)} onEdit={() => { setEdit(open); setOpen(null); }} onLog={() => { setLog(open); setOpen(null); }} onStatus={setStatus}
        onDelete={async () => { try { await api(`/api/r/plan-sessions/${open.id}`, { method: 'DELETE' }); setOpen(null); reloadAll(); } catch (e) { setMsg({ kind: 'error', text: (e as Error).message }); } }} />

      <EditModal open={edit !== null} resource="plan-sessions" title={edit === 'new' ? 'Einheit hinzufügen' : 'Einheit bearbeiten'} fields={PLAN_FIELDS}
        row={edit === 'new' ? null : edit} defaults={{ date: newDate, type: 'rad', intensity: '1', duration_min: 60, status: 'planned' }} transformPayload={planPayload}
        onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reloadAll(); }} />
      <EditModal open={!!log} resource="workouts" title="Training erfassen" fields={WORKOUT_FIELDS} row={null}
        defaults={log ? { date: log.date, type: log.type === 'ruhe' ? 'sonstiges' : log.type, title: log.title, duration_min: log.duration_min } : undefined}
        transformPayload={(pl) => ({ ...pl, plan_session_id: log?.id })} onClose={() => setLog(null)} onSaved={() => { setLog(null); reloadAll(); }} />
      <GenerateModal open={showGen} onClose={() => setShowGen(false)} today={today} profile={p} onDone={(text, kind) => { setShowGen(false); setMsg({ kind, text }); reloadAll(); }} />
    </div>
  );
}

function SessionDetail({ s, onClose, onEdit, onLog, onStatus, onDelete }: { s: any | null; onClose: () => void; onEdit: () => void; onLog: () => void; onStatus: (s: any, st: string) => void; onDelete: () => void }) {
  if (!s) return null;
  const blocks = s.details?.blocks as { label: string; minutes: number; watts: [number, number] }[] | undefined;
  const exercises = s.details?.exercises as string[] | undefined;
  return (
    <Modal open onClose={onClose} title={`${TYPE_ICON[s.type]} ${s.title}`}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{formatDe(s.date, true)} · {s.duration_min} min · {INTENSITY_LABEL[s.intensity]} · {TYPE_LABEL[s.type]}</p>
        <div className="flex gap-2">{s.status === 'done' && <Badge tone="green">erledigt</Badge>}{s.status === 'skipped' && <Badge tone="amber">übersprungen</Badge>}{s.source === 'generator' && <Badge>aus Planer</Badge>}{s.source === 'ai' && <Badge tone="blue">KI-Vorschlag (bestätigt)</Badge>}{s.details?.deload && <Badge tone="amber">Entlastungswoche</Badge>}</div>
        {s.description && <p className="text-sm">{s.description}</p>}
        {blocks && (
          <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Abschnitt</th><th>Min</th><th className="text-right">Watt</th></tr></thead>
            <tbody>{blocks.map((b, i) => <tr key={i} className="border-t"><td>{b.label}</td><td>{b.minutes}</td><td className="text-right">{b.watts[0]}–{b.watts[1]}</td></tr>)}</tbody></table>
        )}
        {exercises && <ul className="list-disc space-y-0.5 pl-5 text-sm">{exercises.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div className="flex flex-wrap gap-2 pt-2">
          {s.status !== 'done' && s.type !== 'spiel' && <Button onClick={onLog} data-testid="detail-log">Erledigt erfassen</Button>}
          {s.status === 'planned' && <Button variant="secondary" onClick={() => onStatus(s, 'skipped')}>Überspringen</Button>}
          {s.status !== 'planned' && <Button variant="secondary" onClick={() => onStatus(s, 'planned')}>Wieder auf „geplant“</Button>}
          <Button variant="secondary" onClick={onEdit}>Bearbeiten</Button>
          <ConfirmButton label="Löschen" confirmLabel="Wirklich löschen" onConfirm={onDelete} />
        </div>
      </div>
    </Modal>
  );
}

function PhaseOverview({ m }: { m: { start: string; firstFriendly: string; mainGoal: string } }) {
  const b = boundaries(m);
  const rows: [string, string, string][] = [
    [PHASES.grundlage.label, m.start, addDays(b.aufbauStart, -1)],
    [PHASES.aufbau.label, b.aufbauStart, addDays(b.spezifischStart, -1)],
    [PHASES.spezifisch.label, b.spezifischStart, addDays(b.spielwocheStart, -1)],
    [PHASES.spielwoche.label, b.spielwocheStart, m.firstFriendly],
    [PHASES.hauptphase.label, addDays(m.firstFriendly, 1), addDays(b.finaleStart, -1)],
    [PHASES.finale.label, b.finaleStart, m.mainGoal],
  ];
  return (
    <Card title="Phasen bis zum Hauptziel">
      <ul className="divide-y text-sm">{rows.filter((r) => r[1] <= r[2]).map(([n, a, z]) => <li key={n} className="flex justify-between py-2"><span>{n}</span><span className="text-slate-500">{formatDe(a).slice(0, 6)} – {formatDe(z).slice(0, 6)}</span></li>)}</ul>
    </Card>
  );
}

function GenerateModal({ open, onClose, today, profile, onDone }: { open: boolean; onClose: () => void; today: string; profile: any; onDone: (t: string, k: 'success' | 'warn') => void }) {
  const [from, setFrom] = useState(today > profile.start_date ? today : profile.start_date);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ created: number; deleted: number; unplaced: { title: string }[] }>('/api/plan/generate', { method: 'POST', body: { from, to: profile.main_goal_date } });
      onDone(`Plan erzeugt: ${r.created} Einheiten neu, ${r.deleted} alte Planer-Einheiten ersetzt.${r.unplaced.length ? ` ${r.unplaced.length} Einheiten passten nicht in deine Verfügbarkeit.` : ''}`, r.unplaced.length ? 'warn' : 'success');
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Plan neu erzeugen">
      <div className="space-y-3">
        <p className="text-sm text-slate-700">Ersetzt alle <strong>noch geplanten, vom Planer erzeugten</strong> Einheiten ab dem gewählten Datum bis zum Hauptziel ({formatDe(profile.main_goal_date)}). Eigene, erledigte und übersprungene Einheiten bleiben unverändert.</p>
        {err && <Notice kind="error">{err}</Notice>}
        <label className="block text-sm font-medium">Ab Datum
          <input type="date" className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3" value={from} min={profile.start_date} max={profile.main_goal_date} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <div className="flex gap-2"><Button busy={busy} onClick={run} data-testid="confirm-generate">Plan erzeugen</Button><Button variant="secondary" onClick={onClose}>Abbrechen</Button></div>
      </div>
    </Modal>
  );
}
