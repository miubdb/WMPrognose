import { useEffect, useState } from 'react';
import { adm, download, errText } from './api';
import { Badge, Dialog, Empty, PageHead, RowMenu, SearchBox, Toast, fmtDate, useConfirm, useList, useToast } from './ui';
import { PackBuilder } from './PackBuilder';

export function Packs({ rev, bump, openId, onOpened }: { rev: number; bump: () => void; openId?: string; onOpened?: () => void }) {
  const { data, loading } = useList<any>('/packs', rev);
  const [edit, setEdit] = useState<any>(null); const [neu, setNeu] = useState(false); const [q, setQ] = useState(''); const [cur, setCur] = useState<any>(null);
  const t = useToast(); const { ask, node } = useConfirm();
  const act = async (fn: () => Promise<any>, ok = '') => { const r = await fn(); if (!r.ok) t.show(errText(r)); else { bump(); if (ok) t.show(ok); } };
  useEffect(() => { if (openId && data.length) { const p = data.find((x: any) => x.id === openId); if (p) { setEdit(p); onOpened?.(); } } }, [openId, data]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { adm('GET', '/curate').then(r => r.ok && setCur(r.data)); }, [rev]);
  if (edit) return <PackBuilder key={edit.id} pack={edit} bump={bump} onClose={() => { setEdit(null); bump(); }} />;
  const match = (p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase());
  const sorted = [...data].filter(match).sort((a: any, b: any) => (b.updated ?? 0) - (a.updated ?? 0));
  const curated = cur?.done as { main: string; second: string } | null;
  const featured = curated ? [data.find((p: any) => p.id === curated.main), data.find((p: any) => p.id === curated.second)].filter(Boolean).filter(match) : [];
  const published = sorted.filter((p: any) => p.status === 'published' && !(curated && [curated.main, curated.second].includes(p.id)));
  const drafts = sorted.filter((p: any) => p.status === 'draft');
    const rounds = (p: any) => (p.show?.length ? p.show.filter((x: any) => x.k !== 'board').length : p.categoryIds?.length ?? 0);
  const menu = (p: any) => (
    <RowMenu>
      <button onClick={() => act(() => adm('POST', `/packs/${p.id}/duplicate`), 'Als Entwurf dupliziert ✓')}>⧉ Duplizieren</button>
      <button onClick={async () => { const r = await adm('GET', `/export?scope=pack:${p.id}`); if (r.ok) download(`JANIQUIZITION-Spieleabend-${p.id}.json`, r.data); else t.show(errText(r)); }}>📤 Exportieren</button>
      {p.versions > 0 && <button onClick={async () => { if (await ask({ title: `„${p.name}“ aus der Liste entfernen?`, text: 'Das Paket verschwindet aus der Übersicht und aus dem Showmaster-Pult. Laufende Räume sind nicht betroffen. Unter „Sicherung & Update“ lässt es sich wiederherstellen.', confirmLabel: 'Entfernen' })) act(() => adm('POST', `/packs/${p.id}/status`, { status: 'archived' }), 'Entfernt ✓'); }}>🗄 Archivieren</button>}
      {p.versions === 0 && <button className="danger" onClick={async () => { if (await ask({ title: 'Entwurf löschen?', text: 'Dieser Entwurf wurde nie veröffentlicht und wird endgültig gelöscht.', confirmLabel: 'Löschen', danger: true })) act(() => adm('DELETE', '/packs/' + p.id), 'Gelöscht'); }}>🗑 Löschen</button>}
    </RowMenu>);
  const card = (p: any) => (
    <div key={p.id} className={`pcard ${p.status}`}>
      <h4>{p.name}</h4>
      <div className="meta"><Badge kind={p.status === 'published' ? 'ok' : p.status === 'archived' ? 'muted' : 'warn'}>{p.status === 'published' ? `Veröffentlicht · v${p.currentVersion}` : p.status === 'archived' ? 'Archiviert' : 'Entwurf'}</Badge><span>{rounds(p)} Runden</span><span>· zuletzt bearbeitet {fmtDate(p.updated)}</span></div>
      <div className="acts"><button className={`btn small ${p.status === 'draft' ? 'primary' : ''}`} onClick={() => setEdit(p)}>{p.status === 'draft' ? 'Bearbeiten' : 'Öffnen'}</button>{menu(p)}</div>
    </div>);
  const big = (p: any, second: boolean) => (
    <div key={p.id} className={`bigpack ${second ? 'second' : ''}`}>
      <h4>{second ? 'Zweite Version' : 'Hauptversion'}</h4><b>{p.name}</b>
      <div className="meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0', color: 'var(--muted)', fontSize: '.85rem' }}><Badge kind="ok">v{p.currentVersion}</Badge><span>{rounds(p)} Runden</span><span>· zuletzt bearbeitet {fmtDate(p.updated)}</span></div>
      <div className="acts" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><button className="btn small primary" onClick={() => setEdit(p)}>Öffnen</button>{menu(p)}</div>
    </div>);
  return (
    <div>
      <PageHead title="Spielepakete" sub="Die Zusammenstellung für einen Spieleabend.">
        <button className="btn primary" onClick={() => setNeu(true)}>＋ Neues Paket erstellen</button>
      </PageHead>
      {data.length > 6 && <div className="qrow"><SearchBox value={q} onChange={setQ} placeholder="Paket suchen …" /></div>}
      {!loading && !data.length && <Empty icon="📦" title="Noch keine Pakete" text="Ein Paket ist die Zusammenstellung für einen Abend."><button className="btn primary" onClick={() => setNeu(true)}>＋ Neues Paket erstellen</button></Empty>}
      {!loading && data.length > 0 && !sorted.length && !featured.length && <Empty icon="🔎" title="Kein Paket gefunden" text="Andere Suche probieren." />}
      {featured.length > 0 && <section className="packgroup"><h3>Meine Spieleabende</h3><div className="curatecols">{featured.map((p: any) => big(p, p.id === curated!.second))}</div></section>}
      {published.length > 0 && <section className="packgroup">{(curated || drafts.length > 0) && <h3>Eigene Pakete</h3>}<div className="packgrid">{published.map(card)}</div></section>}
      {drafts.length > 0 && <section className="packgroup"><h3>Entwürfe</h3><div className="packgrid">{drafts.map(card)}</div></section>}
      {neu && <NewPack packs={data.filter((p: any) => p.show?.length && p.status !== 'archived')} onClose={() => setNeu(false)} onCreated={p => { setNeu(false); bump(); setEdit(p); }} />}
      {node}<Toast msg={t.msg} />
    </div>
  );
}

function NewPack({ packs, onClose, onCreated }: { packs: any[]; onClose: () => void; onCreated: (p: any) => void }) {
  const base = packs.find(p => p.status === 'published') ?? packs[0];
  const [name, setName] = useState(''); const [from, setFrom] = useState(base?.id ?? ''); const [len, setLen] = useState(0); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!name.trim() || !from) { setErr('Bitte einen Namen eingeben.'); return; }
    setBusy(true); const d = await adm('POST', `/packs/${from}/duplicate`);
    if (!d.ok) { setBusy(false); setErr(errText(d)); return; }
    const p = d.data; const rules = { ...p.rules, ...(len ? { tasksPerMode: len } : {}) };
    const u = await adm('PUT', '/packs/' + p.id, { ...p, name: name.trim(), rules, ifUpdated: p.updated }); setBusy(false);
    if (!u.ok) { setErr(errText(u)); return; }
    onCreated(u.data);
  };
  return (
    <div className="modal" onClick={onClose}><div className="modalbox" onClick={e => e.stopPropagation()}>
      <div className="row between"><h2>📦 Neues Paket</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
      <label className="field"><span>Name</span><input autoFocus value={name} maxLength={60} placeholder="z. B. Spieleabend Dezember" onChange={e => setName(e.target.value)} /></label>
      <label className="field"><span>Startpunkt: Kopie von</span><select value={from} onChange={e => setFrom(e.target.value)}>{packs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="field"><span>Länge</span><select value={len} onChange={e => setLen(Number(e.target.value))}><option value={0}>wie die Vorlage</option><option value={4}>Kompakt (4 Fragen je Spiel)</option><option value={5}>Mittel (5 Fragen je Spiel)</option><option value={6}>Lang (6 Fragen je Spiel)</option></select></label>
      {err && <div className="status bad">{err}</div>}
      <div className="actionbar"><span className="spacer" /><button className="btn primary" disabled={busy} onClick={go}>Paket anlegen</button></div>
    </div></div>
  );
}

