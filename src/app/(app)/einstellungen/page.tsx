'use client';
import { useEffect, useState } from 'react';
import { api, ApiClientError, useFetch } from '@/lib/client';
import { formatDe } from '@/domain/dates';
import { Button, Card, ConfirmButton, Field, FormFields, Notice, PageHeader, Spinner, Tabs, toPayload, fromRow, type FieldDef } from '@/components/ui';
import { AvailabilityEditor } from '@/components/AvailabilityEditor';
import { ResourceCrud } from '@/components/ResourceCrud';
import { PROFILE_FIELDS } from '@/components/fields';
import { useApp } from '@/components/AppContext';

const EVENT_FIELDS: FieldDef[] = [
  { name: 'kind', label: 'Art', type: 'select', required: true, options: [{ value: 'match', label: 'Spiel' }, { value: 'friendly', label: 'Freundschaftsspiel' }, { value: 'test', label: 'Test / Leistungsdiagnostik' }, { value: 'other', label: 'Sonstiges' }] },
  { name: 'title', label: 'Titel', type: 'text', required: true },
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'notes', label: 'Notizen', type: 'textarea' },
];
const EXC_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'available_minutes', label: 'Verfügbare Minuten an diesem Tag', type: 'int', required: true, help: '0 = kein Training (z. B. Urlaub, Krankheit)' },
  { name: 'reason', label: 'Grund', type: 'text' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  return (
    <div>
      <PageHeader title="Einstellungen" />
      <Tabs tabs={[{ id: 'profile', label: 'Profil' }, { id: 'avail', label: 'Zeit' }, { id: 'events', label: 'Termine' }, { id: 'account', label: 'Konto' }]} value={tab} onChange={setTab} />
      {tab === 'profile' && <ProfileForm />}
      {tab === 'avail' && (
        <div className="space-y-4">
          <Card title="Wochenverfügbarkeit"><AvailabilityEditor submitLabel="Speichern" /><Notice kind="info">Nach Änderungen den Plan unter „Plan → Plan neu erzeugen“ aktualisieren.</Notice></Card>
          <Card title="Ausnahmen (Urlaub, Krankheit, …)">
            <ResourceCrud<any> resource="exceptions" title="Ausnahme" addLabel="Ausnahme hinzufügen" emptyText="Keine Ausnahmen." fields={EXC_FIELDS}
              renderRow={(e) => <div className="flex justify-between"><span className="font-semibold">{formatDe(e.date, true)}</span><span className="text-sm text-slate-600">{e.available_minutes} min{e.reason ? ` · ${e.reason}` : ''}</span></div>} />
          </Card>
        </div>
      )}
      {tab === 'events' && (
        <Card title="Weitere Termine">
          <p className="mb-3 text-sm text-slate-600">Erstes Freundschaftsspiel und Hauptziel werden im Profil gepflegt. Hier weitere Spiele und Tests – Spiele beeinflussen die Planung (Belastung davor/danach).</p>
          <ResourceCrud<any> resource="events" title="Termin" addLabel="Termin hinzufügen" emptyText="Keine weiteren Termine." fields={EVENT_FIELDS}
            renderRow={(e) => <div className="flex justify-between"><span className="font-semibold">{e.title}</span><span className="text-sm text-slate-600">{formatDe(e.date, true)}</span></div>} />
        </Card>
      )}
      {tab === 'account' && <Account />}
    </div>
  );
}

function ProfileForm() {
  const { data, error } = useFetch<{ profile: any }>('/api/profile');
  const [v, setV] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiClientError | null>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => { if (data?.profile) setV(fromRow(PROFILE_FIELDS, data.profile)); }, [data]);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!v) return <Spinner />;
  async function save() {
    setBusy(true); setErr(null); setOk(false);
    try { await api('/api/profile', { method: 'PUT', body: toPayload(PROFILE_FIELDS, v!, 'update') }); setOk(true); }
    catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  return (
    <Card title="Ziele & Körperdaten">
      <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4">
        {ok && <Notice kind="success">Profil gespeichert. Phasen und Ziele wurden aktualisiert; den Plan bei Bedarf neu erzeugen.</Notice>}
        {err && <Notice kind="error">{err.message}</Notice>}
        <FormFields defs={PROFILE_FIELDS} values={v} setValues={setV} errors={err?.fields} />
        <p className="text-xs text-slate-500">Ausgangsgewicht und -FTP sind Referenzwerte für Fortschrittsanzeigen. Die erfassten Messwerte (Gewicht, FTP) bleiben unverändert.</p>
        <Button type="submit" busy={busy} data-testid="save-profile">Speichern</Button>
      </form>
    </Card>
  );
}

function Account() {
  const { user } = useApp();
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function changePw() {
    setBusy(true); setPwMsg(null);
    try { await api('/api/auth/password', { method: 'POST', body: pw }); setPwMsg({ ok: true, text: 'Passwort geändert. Andere Geräte wurden abgemeldet.' }); setPw({ current_password: '', new_password: '' }); }
    catch (e) { setPwMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  }
  async function logout() { await api('/api/auth/logout', { method: 'POST', body: {} }); location.href = '/login'; }
  async function del() {
    setDelErr(null);
    try { await api('/api/account', { method: 'DELETE', body: { password: delPw } }); location.href = '/login'; }
    catch (e) { setDelErr((e as Error).message); }
  }
  return (
    <div className="space-y-4">
      <Card title="Konto"><p className="mb-3 text-sm">Angemeldet als <strong>{user.email}</strong></p><Button variant="secondary" onClick={logout} data-testid="logout">Abmelden</Button></Card>
      <Card title="Passwort ändern">
        <form onSubmit={(e) => { e.preventDefault(); void changePw(); }} className="space-y-3">
          {pwMsg && <Notice kind={pwMsg.ok ? 'success' : 'error'}>{pwMsg.text}</Notice>}
          <Field def={{ name: 'current_password', label: 'Aktuelles Passwort', type: 'password', required: true }} value={pw.current_password} onChange={(x) => setPw({ ...pw, current_password: x })} />
          <Field def={{ name: 'new_password', label: 'Neues Passwort', type: 'password', required: true, help: 'Mindestens 10 Zeichen.' }} value={pw.new_password} onChange={(x) => setPw({ ...pw, new_password: x })} />
          <Button type="submit" busy={busy}>Passwort ändern</Button>
        </form>
      </Card>
      <Card title="Datenschutz & Daten">
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Alle Daten liegen in der Datenbank dieser Installation, getrennt pro Konto. Passwörter werden nur als scrypt-Hash gespeichert.</li>
          <li>Es gibt kein Tracking und keine Werbe-Dienste.</li>
          <li>Nur bei Nutzung der KI-Funktionen werden die dafür nötigen Daten (Coach: Trainings-, Gewichts-, Plan-, Tagesform- und Ernährungsdaten; Foto-Erkennung: das Foto, nicht gespeichert) an die Anthropic-API gesendet.</li>
          <li>Barcode-Suche sendet nur die Barcode-Nummer an Open Food Facts.</li>
        </ul>
        <a href="/api/account/export" download className="inline-flex min-h-[44px] items-center rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-slate-300" data-testid="export-data">Alle meine Daten exportieren (JSON)</a>
      </Card>
      <Card title="Konto löschen">
        <p className="mb-3 text-sm text-slate-700">Löscht dein Konto und <strong>alle</strong> Daten unwiderruflich.</p>
        {delErr && <Notice kind="error">{delErr}</Notice>}
        <Field def={{ name: 'delpw', label: 'Passwort zur Bestätigung', type: 'password' }} value={delPw} onChange={setDelPw} />
        <div className="mt-3"><ConfirmButton label="Konto endgültig löschen" confirmLabel="Ja, alles löschen" onConfirm={del} /></div>
      </Card>
    </div>
  );
}
