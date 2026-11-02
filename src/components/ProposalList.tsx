'use client';
import { useState } from 'react';
import { api, ApiClientError } from '@/lib/client';
import { describeChange } from '@/domain/proposals';
import { Badge, Button } from './ui';

export function ProposalList({ proposals, onDone, onError }: { proposals: any[]; onDone: (t: string) => void; onError: (t: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function decide(id: string, decision: 'accept' | 'reject') {
    setBusy(id);
    try { await api(`/api/proposals/${id}`, { method: 'POST', body: { decision } }); onDone(decision === 'accept' ? 'Vorschlag übernommen.' : 'Vorschlag abgelehnt – am Plan wurde nichts geändert.'); }
    catch (e) { onError((e as ApiClientError).message); } finally { setBusy(null); }
  }
  return (
    <ul className="space-y-3">
      {proposals.map((p) => (
        <li key={p.id} className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200" data-testid="proposal">
          <div className="mb-1 flex items-center gap-2"><Badge tone={p.source === 'ai' ? 'blue' : 'slate'}>{p.source === 'ai' ? 'KI-Vorschlag' : 'Regel-Vorschlag'}</Badge><span className="text-xs text-slate-500">Noch nicht übernommen</span></div>
          <p className="font-semibold">{p.summary}</p>
          {p.rationale && <p className="text-sm text-slate-700">{p.rationale}</p>}
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{p.changes.map((c: any, i: number) => <li key={i}>{describeChange(c, p.currentSessions)}<div className="text-xs text-slate-500">Grund: {c.reason}</div></li>)}</ul>
          <div className="mt-3 flex gap-2">
            <Button busy={busy === p.id} onClick={() => decide(p.id, 'accept')} data-testid="accept-proposal">Übernehmen</Button>
            <Button variant="secondary" disabled={busy === p.id} onClick={() => decide(p.id, 'reject')} data-testid="reject-proposal">Ablehnen</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
