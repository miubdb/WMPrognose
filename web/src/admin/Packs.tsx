import { useEffect, useState } from 'react';
import { adm, download, errText } from './api';
import { Badge, Dialog, Empty, PageHead, RowMenu, SearchBox, Toast, fmtDate, useConfirm, useList, useToast } from './ui';
import { PackBuilder } from './PackBuilder';

/** Einmalige Kuratierung: zwei Spieleabende bleiben aktiv, alle anderen Pakete werden archiviert (nie gelöscht). */
function Curate({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [plan, setPlan] = useState<any>(null); const [sel, setSel] = useState<string>(''); const [busy, setBusy] = useState(false); const [res, setRes] = useState<any>(null); const [err, setErr] = useState('');
  const load = async (second?: string) => { const r = await adm('GET', '/curate' + (second ? `?second=${encodeURIComponent(second)}` : '')); if (r.ok) { setPlan(r.data); if (!second && r.data.second) setSel(r.data.second); } else setErr(errText(r)); };
  useEffect(() => { load(); }, []);       // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (id: string) => { setSel(id); load(id); };
  const run = async () => { setBusy(true); const r = await adm('POST', '/curate', { second: sel }); setBusy(false); if (r.ok) { setRes(r.data); onDone(); } else setErr(errText(r)); };
  const hasUsage = plan?.options?.some((o: any) => o.rooms > 0) || plan?.main?.rooms > 0;
  const when = (t: number | null) => (t ? new Date(t).toLocaleDateString('de-DE') : '–');
  if (res) return (
    <Dialog title="Fertig" onClose={onClose} actions={<button className="btn primary" onClick={onClose}>Schließen</button>}>
      <p><Badge kind="ok">Erledigt</Badge> Die Paketübersicht ist aufgeräumt.</p>
      <ul className="small"><li><b>{res.names.main}</b> (Hauptversion)</li><li><b>{res.names.second}</b> (Zweite Version)</li><li>{res.archived.length} Pakete archiviert – nichts gelöscht.</li>{res.backupFile && <li>Sicherung: {res.backupFile}</li>}</ul>
      <p className="small muted">{res.env === 'online' ? 'Gilt nur für die Online-Datenbank. Die lokale Datenbank auf dem Laptop ist getrennt und muss dort einzeln aufgeräumt werden.' : 'Gilt nur für die lokale Datenbank. Die Online-Version hat eine eigene Datenbank und wurde NICHT verändert.'}</p>
    </Dialog>);
  return (
    <Dialog title="Paketübersicht aufräumen" wide onClose={onClose} actions={<><button className="btn ghost" onClick={onClose}>Abbrechen</button><button className="btn primary" disabled={busy || !plan?.mainOk || !sel} onClick={run}>Archivieren &amp; umbenennen</button></>}>
      {!plan && !err && <p className="muted">Lade …</p>}
      {err && <div className="status bad">{err}</div>}
      {plan && <>
        <p className="muted small">Zwei Spieleabende bleiben aktiv, alle anderen Pakete werden <b>archiviert</b> (nicht gelöscht, später wieder aktivierbar). Fragen, veröffentlichte Versionen und Räume bleiben unverändert.</p>
        <div className="curatecols">
          <div className="bigpack"><h4>Hauptversion</h4>{plan.main ? <><b>{plan.names.main}</b><p className="small muted" style={{ margin: '4px 0 0' }}>bisher „{plan.main.name}“ · v{plan.main.version} · {plan.main.rounds} Runden{plan.main.rooms ? ` · ${plan.main.rooms} Räume gespielt` : ''}. Fragen und Ablauf bleiben unverändert.</p></> : <p className="small">Das Paket show-4z wurde nicht gefunden.</p>}</div>
          <div className="bigpack second"><h4>Zweite Version</h4>{sel ? (() => { const o = plan.options.find((x: any) => x.id === sel); return <><b>{plan.names.second}</b><p className="small muted" style={{ margin: '4px 0 0' }}>bisher „{o?.name}“ · v{o?.version} · {o?.rounds} Runden{o?.rooms ? ` · ${o.rooms} Räume gespielt, zuletzt ${when(o.last)}` : ' · in dieser Datenbank nie gespielt'}.</p></>; })() : <p className="small">Bitte unten das Paket wählen, das ihr tatsächlich als zweiten Abend gespielt habt.</p>}</div>
        </div>
        <h4>{plan.autoDetected ? 'Zweites Paket (aus der Raumhistorie erkannt) – bei Bedarf ändern' : 'Welches Paket war euer zweiter Spieleabend?'}</h4>
        {!hasUsage && <div className="banner"><span>In dieser Datenbank gibt es keine Raumhistorie, aus der sich das ableiten ließe{plan.env === 'online' ? ' (online gibt es keine Räume)' : ''}. Bitte selbst wählen.</span></div>}
        <div className="picklist">{plan.options.map((o: any) => (
          <label key={o.id} className={`pickrow2 ${sel === o.id ? 'sel' : ''}`}><input type="radio" name="second" checked={sel === o.id} onChange={() => pick(o.id)} />
            <span><b>{o.name}</b> {o.candidate && <Badge kind="info">Kandidat</Badge>}<small className="muted" style={{ display: 'block' }}>{o.id} · v{o.version} · {o.rounds} Runden · {o.rooms ? `${o.rooms} Räume (${o.finished} beendet), zuletzt ${when(o.last)}` : 'nie gespielt'}</small></span><span /></label>))}</div>
        <h4>Das passiert mit den übrigen Paketen ({plan.archive.length})</h4>
        <details className="more" open><summary>Wird archiviert (nicht gelöscht)</summary><ul className="small">{plan.archive.map((o: any) => <li key={o.id}>{o.name} <span className="muted">· v{o.version}{o.rooms ? ` · ${o.rooms} Räume` : ''}</span></li>)}{!plan.archive.length && <li>Keine.</li>}</ul></details>
        <ul className="small checklist"><li><b>Sicherung:</b> vor dem Archivieren wird automatisch eine Datenbanksicherung erstellt.</li><li><b>Spätere Updates</b> aktivieren die alten Pakete nicht wieder; neue mitgelieferte Pakete landen im Archiv.</li><li><b>{plan.env === 'online' ? 'Nur online:' : 'Nur lokal:'}</b> {plan.env === 'online' ? 'Die lokale Datenbank auf dem Laptop ist getrennt und bleibt unverändert.' : 'Die Online-Version hat eine eigene Datenbank und bleibt unverändert.'}</li></ul>
      </>}
    </Dialog>
  );
}

export function Packs({ rev, bump, openId, onOpened }: { rev: number; bump: () => void; openId?: string; onOpened?: () => void }) {
  const { data, loading } = useList<any>('/packs', rev);
  const [edit, setEdit] = useState<any>(null); const [neu, setNeu] = useState(false); const [q, setQ] = useState(''); const [cur, setCur] = useState<any>(null); const [curate, setCurate] = useState(false);
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
  const drafts = sorted.filter((p: any) => p.status === 'draft'); const archived = sorted.filter((p: any) => p.status === 'archived');
  const activeCount = data.filter((p: any) => p.status === 'published').length;
  const rounds = (p: any) => (p.show?.length ? p.show.filter((x: any) => x.k !== 'board').length : p.categoryIds?.length ?? 0);
  const menu = (p: any) => (
    <RowMenu>
      <button onClick={() => act(() => adm('POST', `/packs/${p.id}/duplicate`), 'Als Entwurf dupliziert ✓')}>⧉ Duplizieren</button>
      <button onClick={async () => { const r = await adm('GET', `/export?scope=pack:${p.id}`); if (r.ok) download(`JANIQUIZITION-Spieleabend-${p.id}.json`, r.data); else t.show(errText(r)); }}>📤 Exportieren</button>
      {p.status === 'archived'
        ? <button onClick={() => act(() => adm('POST', `/packs/${p.id}/status`, { status: 'published' }), 'Wieder aktiviert ✓')}>↩ Wieder aktivieren</button>
        : p.versions > 0 && <button onClick={async () => { if (await ask({ title: `„${p.name}“ archivieren?`, text: 'Das Paket bleibt mit allen Versionen gespeichert, ist aber für neue Shows nicht mehr wählbar. Laufende Räume sind nicht betroffen. Du kannst es jederzeit wieder aktivieren.', confirmLabel: 'Archivieren' })) act(() => adm('POST', `/packs/${p.id}/status`, { status: 'archived' }), 'Archiviert ✓'); }}>🗄 Archivieren</button>}
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
      <PageHead title="Spielepakete" sub="Ein Spielepaket legt fest, welche Runden und Fragen an einem Spieleabend vorkommen.">
        <button className="btn primary" onClick={() => setNeu(true)}>＋ Neues Paket erstellen</button>
      </PageHead>
      {!curated && activeCount > 2 && cur?.mainOk && <div className="banner" style={{ marginBottom: 10 }}><span><b>{activeCount} Pakete sind aktiv.</b> Die Übersicht lässt sich auf eure zwei Spieleabende reduzieren – alte Pakete werden archiviert, nicht gelöscht.</span><button className="btn small primary" onClick={() => setCurate(true)}>Übersicht aufräumen</button></div>}
      <div className="qrow"><SearchBox value={q} onChange={setQ} placeholder="Paket suchen …" /></div>
      {!loading && !data.length && <Empty icon="📦" title="Noch keine Pakete" text="Ein Paket ist die Zusammenstellung für einen Abend."><button className="btn primary" onClick={() => setNeu(true)}>＋ Neues Paket erstellen</button></Empty>}
      {!loading && data.length > 0 && !sorted.length && !featured.length && <Empty icon="🔎" title="Kein Paket gefunden" text="Andere Suche probieren." />}
      {featured.length > 0 && <section className="packgroup"><h3>Deine Spieleabende</h3><div className="curatecols">{featured.map((p: any) => big(p, p.id === curated!.second))}</div></section>}
      {(published.length > 0 || (!curated && !loading)) && <section className="packgroup"><h3>{curated ? 'Weitere aktive Pakete' : 'Aktuelle Pakete'} <Badge>{published.length}</Badge></h3><p className="muted small" style={{ margin: '0 0 8px' }}>Veröffentlicht – im Showmaster-Pult wählbar.</p><div className="packgrid">{published.map(card)}</div></section>}
      {drafts.length > 0 && <section className="packgroup"><h3>Entwürfe <Badge>{drafts.length}</Badge></h3><p className="muted small" style={{ margin: '0 0 8px' }}>Noch nicht veröffentlicht.</p><div className="packgrid">{drafts.map(card)}</div></section>}
      {archived.length > 0 && <details className="packgroup"><summary><b>Alte Pakete verwalten</b> <Badge>{archived.length}</Badge> <span className="muted small">– archiviert, bleiben gespeichert und lassen sich wieder aktivieren</span></summary><div className="packgrid" style={{ marginTop: 8 }}>{archived.map(card)}</div></details>}
      {curated && <p className="muted small">Übersicht aufgeräumt am {fmtDate(cur?.done?.at)}. Spätere Updates aktivieren alte Pakete nicht wieder.</p>}
      <details className="more"><summary>Was bedeuten Entwurf und Version?</summary><p className="small">Ein <b>Entwurf</b> ist in Arbeit und wird laufend gespeichert. Mit <b>Veröffentlichen</b> entsteht eine feste <b>Version</b>, die im Showmaster-Pult gewählt werden kann. Spätere Änderungen werden erst mit einer neuen Version wirksam; bereits gestartete Räume und ältere Versionen bleiben unverändert.</p></details>
      {neu && <NewPack packs={data.filter((p: any) => p.show?.length && p.status !== 'archived')} onClose={() => setNeu(false)} onCreated={p => { setNeu(false); bump(); setEdit(p); }} />}
      {curate && <Curate onClose={() => setCurate(false)} onDone={bump} />}
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

