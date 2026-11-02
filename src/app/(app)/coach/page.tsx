'use client';
import { useEffect, useRef, useState } from 'react';
import { api, ApiClientError, useFetch } from '@/lib/client';
import { Badge, Button, Card, ConfirmButton, Notice, PageHeader, Spinner } from '@/components/ui';
import { ProposalList } from '@/components/ProposalList';

const SUGGESTIONS = ['Wie steht es um meine Vorbereitung auf das Freundschaftsspiel?', 'Ist meine Trainingsbelastung gerade angemessen?', 'Sollte ich diese Woche etwas im Plan anpassen?'];

export default function CoachPage() {
  const status = useFetch<{ configured: boolean; model: string | null }>('/api/ai/status');
  const msgs = useFetch<{ messages: any[] }>('/api/coach');
  const proposals = useFetch<{ proposals: any[] }>('/api/proposals?status=pending');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.data, busy]);
  if (!status.data || !msgs.data) return <Spinner />;
  const ok = status.data.configured;

  async function send(message: string) {
    if (!message.trim()) return;
    setBusy(true); setErr(null); setInfo(null);
    try { await api('/api/coach', { method: 'POST', body: { message } }); setText(''); await msgs.reload(); await proposals.reload(); }
    catch (e) { setErr((e as ApiClientError).message); await msgs.reload(); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <PageHeader title="KI-Coach" subtitle="Antwortet auf Basis deiner echten Daten: Ziele, Verfügbarkeit, Training, Gewicht, Ernährung, Tagesform." />
      <Notice kind="info">Antworten sind KI-generiert und können Fehler enthalten. Der Coach schlägt Planänderungen nur vor – nichts wird ohne deine Bestätigung übernommen. Zu seiner Antwort werden deine Daten an die Anthropic-API übermittelt (siehe Datenschutz in den Einstellungen).</Notice>
      {!ok && <Notice kind="warn">Der KI-Coach ist auf dieser Installation nicht eingerichtet (ANTHROPIC_API_KEY fehlt). Alle übrigen Funktionen arbeiten normal.</Notice>}
      {info && <Notice kind="success">{info}</Notice>}
      {proposals.data && proposals.data.proposals.length > 0 && (
        <Card title="Offene Vorschläge">
          <ProposalList proposals={proposals.data.proposals} onDone={(t) => { setInfo(t); void proposals.reload(); void msgs.reload(); }} onError={(t) => setErr(t)} />
        </Card>
      )}
      <div className="space-y-2" aria-live="polite" data-testid="chat">
        {msgs.data.messages.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600">Noch keine Unterhaltung. Stelle eine Frage oder wähle einen Vorschlag.</p>}
        {msgs.data.messages.map((m) => (
          <div key={m.id} className={`max-w-[92%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${m.role === 'user' ? 'ml-auto bg-pitch-600 text-white' : 'bg-white ring-1 ring-slate-200'}`}>
            {m.role === 'assistant' && <div className="mb-1"><Badge tone="blue">KI</Badge>{m.proposal_id && <Badge tone={m.proposal_status === 'pending' ? 'amber' : m.proposal_status === 'accepted' ? 'green' : 'slate'}>{m.proposal_status === 'pending' ? 'Vorschlag offen' : m.proposal_status === 'accepted' ? 'Vorschlag übernommen' : 'Vorschlag abgelehnt'}</Badge>}</div>}
            {m.content}
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500" role="status">Der Coach denkt nach … (kann bis zu einer Minute dauern)</p>}
        <div ref={endRef} />
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => <button key={s} disabled={!ok || busy} onClick={() => send(s)} className="rounded-full bg-white px-3 py-2 text-left text-xs ring-1 ring-slate-300 disabled:opacity-50">{s}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex gap-2">
        <textarea aria-label="Nachricht an den Coach" rows={2} className="min-h-[44px] flex-1 rounded-xl border border-slate-300 p-2 text-base" value={text} disabled={!ok || busy} placeholder={ok ? 'Frage an den Coach …' : 'KI nicht eingerichtet'} onChange={(e) => setText(e.target.value)} maxLength={4000} />
        <Button type="submit" busy={busy} disabled={!ok || !text.trim()} data-testid="send-coach">Senden</Button>
      </form>
      {msgs.data.messages.length > 0 && <ConfirmButton variant="secondary" label="Unterhaltung löschen" confirmLabel="Wirklich löschen" onConfirm={async () => { await api('/api/coach', { method: 'DELETE' }); await msgs.reload(); }} />}
    </div>
  );
}
