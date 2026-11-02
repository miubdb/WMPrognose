'use client';
import { useState } from 'react';
import { num, useFetch } from '@/lib/client';
import { formatDe } from '@/domain/dates';
import { Badge, Button, Card, Field, FormFields, Notice, PageHeader, Spinner, Stat, Tabs, type FieldDef } from '@/components/ui';
import { EditModal, ResourceCrud } from '@/components/ResourceCrud';
import { useApp } from '@/components/AppContext';

const CATS: Record<string, string> = { fangen: 'Fangen', fussarbeit: 'Fußarbeit', stellungsspiel: 'Stellungsspiel', reaktion: 'Reaktion', eins_gegen_eins: '1-gegen-1', spieleroeffnung: 'Spieleröffnung', flanken: 'Flanken', athletik: 'Athletik', sonstiges: 'Sonstiges' };
const EX_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Name der Übung', type: 'text', required: true },
  { name: 'category', label: 'Kategorie', type: 'select', required: true, options: Object.entries(CATS).map(([value, label]) => ({ value, label })) },
  { name: 'description', label: 'Beschreibung / Ablauf', type: 'textarea' },
  { name: 'default_sets', label: 'Standard-Sätze', type: 'int' },
  { name: 'default_reps', label: 'Standard-Wiederholungen', type: 'int' },
  { name: 'default_duration_min', label: 'Standard-Dauer', type: 'int', unit: 'min' },
];
const SESSION_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'title', label: 'Titel', type: 'text', required: true },
  { name: 'duration_min', label: 'Dauer', type: 'int', unit: 'min', required: true },
  { name: 'rpe', label: 'Anstrengung (RPE 1–10)', type: 'int', min: 1, max: 10 },
  { name: 'focus', label: 'Schwerpunkt', type: 'text' },
  { name: 'notes', label: 'Notizen', type: 'textarea' },
];
const MATCH_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'opponent', label: 'Gegner', type: 'text', required: true },
  { name: 'competition', label: 'Wettbewerb', type: 'text', placeholder: 'z. B. Freundschaftsspiel' },
  { name: 'goals_for', label: 'Eigene Tore', type: 'int' },
  { name: 'goals_against', label: 'Gegentore', type: 'int' },
  { name: 'minutes_played', label: 'Gespielte Minuten', type: 'int' },
  { name: 'shots_faced', label: 'Schüsse aufs Tor', type: 'int' },
  { name: 'saves', label: 'Paraden', type: 'int' },
  { name: 'crosses_faced', label: 'Flanken in den Strafraum', type: 'int' },
  { name: 'crosses_claimed', label: 'Davon abgefangen', type: 'int' },
  { name: 'passes_attempted', label: 'Pässe (Versuche)', type: 'int' },
  { name: 'passes_completed', label: 'Pässe (angekommen)', type: 'int' },
  { name: 'errors_leading_to_goal', label: 'Fehler vor Gegentor', type: 'int' },
  { name: 'rating', label: 'Eigene Bewertung (1–10)', type: 'int', min: 1, max: 10 },
  { name: 'strengths', label: 'Das lief gut', type: 'textarea' },
  { name: 'weaknesses', label: 'Das muss besser werden', type: 'textarea' },
  { name: 'training_goals', label: 'Trainingsziele daraus', type: 'textarea' },
];

export default function GoalkeeperPage() {
  const [tab, setTab] = useState('sessions');
  return (
    <div>
      <PageHeader title="Torwart" subtitle="Eigene Übungen, Trainings und Spielanalysen." />
      <Tabs tabs={[{ id: 'sessions', label: 'Trainings' }, { id: 'exercises', label: 'Übungen' }, { id: 'matches', label: 'Spiele' }]} value={tab} onChange={setTab} />
      {tab === 'exercises' && (
        <div className="space-y-3">
          <Notice kind="info">Hier legst du deine eigenen Übungen an. Es gibt bewusst keine vorgefertigte Übungsbibliothek.</Notice>
          <ResourceCrud<any> resource="gk-exercises" title="Übung" addLabel="Übung anlegen" emptyText="Noch keine Übungen angelegt." fields={EX_FIELDS}
            renderRow={(e) => <div><div className="flex justify-between"><span className="font-semibold">{e.name}</span><Badge>{CATS[e.category]}</Badge></div>{e.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{e.description}</p>}</div>} />
        </div>
      )}
      {tab === 'sessions' && <Sessions />}
      {tab === 'matches' && <Matches />}
    </div>
  );
}

interface Item { exercise_id?: string | null; name: string; sets?: number | string | null; reps?: number | string | null; duration_min?: number | string | null; notes?: string | null }

function Sessions() {
  const { today } = useApp();
  const exercises = useFetch<{ rows: any[] }>('/api/r/gk-exercises');
  const [items, setItems] = useState<Item[]>([]);
  const [key, setKey] = useState(0);
  // Übungen als Teil des Formulars: EditModal bekommt den Items-Editor als zusätzliche Felder über Zustand außerhalb
  return (
    <SessionsList key={key} today={today} exercises={exercises.data?.rows ?? []} items={items} setItems={setItems} refresh={() => setKey(key + 1)} />
  );
}

function SessionsList({ today, exercises, items, setItems, refresh }: { today: string; exercises: any[]; items: Item[]; setItems: (i: Item[]) => void; refresh: () => void }) {
  const list = useFetch<{ rows: any[] }>('/api/r/gk-sessions');
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  const open = (r: any | 'new') => { setItems(r === 'new' ? [] : (r.items ?? [])); setEdit(r); };
  if (!list.data) return <Spinner />;
  const upd = (i: number, patch: Partial<Item>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      <Button onClick={() => open('new')} data-testid="add-gk-session">＋ Torwarttraining erfassen</Button>
      {list.data.rows.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600">Noch keine Torwarttrainings erfasst.</p> : (
        <ul className="space-y-2">{list.data.rows.map((s) => (
          <li key={s.id}><button className="w-full rounded-xl bg-white p-3 text-left ring-1 ring-slate-200" onClick={() => open(s)} data-testid="row-gk-sessions">
            <div className="flex justify-between"><span className="font-semibold">🧤 {s.title}</span><span className="text-xs text-slate-500">{formatDe(s.date, true)}</span></div>
            <p className="text-sm text-slate-600">{s.duration_min} min{s.focus ? ` · ${s.focus}` : ''}{s.rpe ? ` · RPE ${s.rpe}` : ''} · {s.items.length} Übungen</p>
          </button></li>
        ))}</ul>
      )}
      <EditModal open={edit !== null} resource="gk-sessions" title="Torwarttraining" fields={SESSION_FIELDS} row={edit === 'new' ? null : edit} defaults={{ date: today, duration_min: 60 }}
        transformPayload={(p) => ({ ...p, items: items.filter((it) => it.name.trim()).map((it) => ({ exercise_id: it.exercise_id || null, name: it.name.trim(), sets: it.sets ? Number(it.sets) : null, reps: it.reps ? Number(it.reps) : null, duration_min: it.duration_min ? Number(it.duration_min) : null, notes: it.notes || null })) })}
        extraFields={<ItemsEditor items={items} upd={upd} setItems={setItems} exercises={exercises} />}
        onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />
    </div>
  );
}

/** Übungsliste des Trainings: wird als eigenes Panel über dem Formular eingeblendet */
function ItemsEditor({ items, upd, setItems, exercises }: { items: Item[]; upd: (i: number, p: Partial<Item>) => void; setItems: (i: Item[]) => void; exercises: any[] }) {
  return (
    <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200" data-testid="items-editor">
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Übungen in diesem Training ({items.length})</h3>
        <div className="flex gap-2">
          {exercises.length > 0 && (
            <select aria-label="Übung aus Bibliothek hinzufügen" className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 text-sm" value="" onChange={(e) => { const ex = exercises.find((x) => x.id === e.target.value); if (ex) setItems([...items, { exercise_id: ex.id, name: ex.name, sets: ex.default_sets, reps: ex.default_reps, duration_min: ex.default_duration_min }]); }}>
              <option value="">＋ aus meinen Übungen</option>
              {exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
          <button type="button" className="min-h-[40px] rounded-lg bg-white px-3 text-sm ring-1 ring-slate-300" onClick={() => setItems([...items, { name: '' }])}>＋ frei</button>
        </div>
      </div>
      {items.map((it, i) => (
        <div key={i} className="mb-2 grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem_2.25rem] items-end gap-1">
          <input aria-label={`Übung ${i + 1}`} className="min-h-[40px] rounded-lg border border-slate-300 px-2 text-base" placeholder="Übung" value={it.name} onChange={(e) => upd(i, { name: e.target.value })} />
          <input aria-label="Sätze" inputMode="numeric" placeholder="Sätze" className="min-h-[40px] rounded-lg border border-slate-300 px-1 text-center text-base" value={it.sets ?? ''} onChange={(e) => upd(i, { sets: e.target.value })} />
          <input aria-label="Wiederholungen" inputMode="numeric" placeholder="Wdh." className="min-h-[40px] rounded-lg border border-slate-300 px-1 text-center text-base" value={it.reps ?? ''} onChange={(e) => upd(i, { reps: e.target.value })} />
          <input aria-label="Minuten" inputMode="numeric" placeholder="Min" className="min-h-[40px] rounded-lg border border-slate-300 px-1 text-center text-base" value={it.duration_min ?? ''} onChange={(e) => upd(i, { duration_min: e.target.value })} />
          <button type="button" aria-label="Übung entfernen" className="min-h-[40px] text-red-700" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
    </div>
  );
}

function Matches() {
  const { today } = useApp();
  const stats = useFetch<any>('/api/stats?kind=gk');
  const [key, setKey] = useState(0);
  const [notes, setNotes] = useState<{ minute?: string; description: string; avoidable: boolean }[]>([]);
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  const list = useFetch<{ rows: any[] }>(`/api/r/match-analyses?k=${key}`);
  const t = stats.data?.totals;
  const open = (r: any | 'new') => { setNotes(r === 'new' ? [] : (r.goals_against_notes ?? []).map((n: any) => ({ minute: n.minute ?? '', description: n.description, avoidable: !!n.avoidable }))); setEdit(r); };
  if (!list.data || !t) return <Spinner />;
  return (
    <div className="space-y-3">
      <Card title="Gesamtstatistik">
        {t.matches === 0 ? <p className="text-sm text-slate-600">Noch keine Spiele analysiert.</p> : (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Spiele" value={t.matches} sub={`${t.wins}S ${t.draws}U ${t.losses}N`} />
            <Stat label="Gegentore/90" value={num(t.goalsAgainstPer90, 2)} sub={`${t.cleanSheets}× zu null`} />
            <Stat label="Fangquote" value={t.savePct == null ? '–' : `${num(t.savePct)} %`} />
            <Stat label="Flanken" value={t.crossClaimPct == null ? '–' : `${num(t.crossClaimPct)} %`} />
            <Stat label="Passquote" value={t.passPct == null ? '–' : `${num(t.passPct)} %`} />
            <Stat label="Ø Bewertung" value={t.avgRating == null ? '–' : num(t.avgRating)} />
          </div>
        )}
      </Card>
      <Button onClick={() => open('new')} data-testid="add-match">＋ Spiel analysieren</Button>
      {list.data.rows.length === 0 ? null : (
        <ul className="space-y-2">{list.data.rows.map((m) => (
          <li key={m.id}><button className="w-full rounded-xl bg-white p-3 text-left ring-1 ring-slate-200" onClick={() => open(m)} data-testid="row-match">
            <div className="flex justify-between"><span className="font-semibold">⚽ {m.opponent} {m.goals_for}:{m.goals_against}</span><span className="text-xs text-slate-500">{formatDe(m.date, true)}</span></div>
            <p className="text-sm text-slate-600">{m.saves}/{m.shots_faced} Paraden{m.rating ? ` · Bewertung ${m.rating}` : ''}{m.competition ? ` · ${m.competition}` : ''}</p>
          </button></li>
        ))}</ul>
      )}
      <EditModal open={edit !== null} resource="match-analyses" title="Spielanalyse" fields={MATCH_FIELDS} row={edit === 'new' ? null : edit} defaults={{ date: today, goals_for: 0, goals_against: 0, minutes_played: 90, shots_faced: 0, saves: 0, crosses_faced: 0, crosses_claimed: 0, passes_attempted: 0, passes_completed: 0, errors_leading_to_goal: 0 }}
        transformPayload={(p) => ({ ...p, goals_against_notes: notes.filter((n) => n.description.trim()).map((n) => ({ minute: n.minute !== '' && n.minute != null ? Number(n.minute) : null, description: n.description.trim(), avoidable: n.avoidable })) })}
        extraFields={<GoalNotes notes={notes} setNotes={setNotes} />}
        onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setKey(key + 1); void stats.reload(); }} />
    </div>
  );
}
void Field; void FormFields;

type GoalNote = { minute?: string; description: string; avoidable: boolean };
function GoalNotes({ notes, setNotes }: { notes: GoalNote[]; setNotes: (n: GoalNote[]) => void }) {
  return (
    <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200" data-testid="goal-notes">
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Gegentore analysieren ({notes.length})</h3><button type="button" className="min-h-[40px] rounded-lg bg-white px-3 text-sm ring-1 ring-slate-300" onClick={() => setNotes([...notes, { description: '', avoidable: false }])}>＋ Gegentor</button></div>
      {notes.map((n, i) => (
        <div key={i} className="mb-2 grid grid-cols-[3.5rem_1fr_auto_2.25rem] items-center gap-1">
          <input aria-label="Minute" inputMode="numeric" placeholder="Min" className="min-h-[40px] rounded-lg border border-slate-300 px-1 text-center text-base" value={n.minute ?? ''} onChange={(e) => setNotes(notes.map((x, j) => (j === i ? { ...x, minute: e.target.value } : x)))} />
          <input aria-label="Beschreibung des Gegentors" placeholder="Was ist passiert?" className="min-h-[40px] rounded-lg border border-slate-300 px-2 text-base" value={n.description} onChange={(e) => setNotes(notes.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={n.avoidable} onChange={(e) => setNotes(notes.map((x, j) => (j === i ? { ...x, avoidable: e.target.checked } : x)))} />vermeidbar</label>
          <button type="button" aria-label="Gegentor entfernen" className="min-h-[40px] text-red-700" onClick={() => setNotes(notes.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
    </div>
  );
}
