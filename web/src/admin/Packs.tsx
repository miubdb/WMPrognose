import { useCallback, useEffect, useState } from 'react';
import type { Mode, ShowStep } from '../../../shared/types';
import { MODE_LABEL, taskMax } from '../../../shared/validate';
import { MODE_ICON } from './QuestionEditor';
import { adm, download, errText } from './api';
import { Badge, Empty, PageHead, RowMenu, SearchBox, Toast, fmtDate, useConfirm, useList, useToast } from './ui';

export function Packs({ rev, bump, openId, onOpened }: { rev: number; bump: () => void; openId?: string; onOpened?: () => void }) {
  const { data, loading } = useList<any>('/packs', rev);
  const [edit, setEdit] = useState<any>(null); const [neu, setNeu] = useState(false); const [q, setQ] = useState('');
  const t = useToast(); const { ask, node } = useConfirm();
  const act = async (fn: () => Promise<any>, ok = '') => { const r = await fn(); if (!r.ok) t.show(errText(r)); else { bump(); if (ok) t.show(ok); } };
  useEffect(() => { if (openId && data.length) { const p = data.find((x: any) => x.id === openId); if (p) { setEdit(p); onOpened?.(); } } }, [openId, data]);   // eslint-disable-line react-hooks/exhaustive-deps
  const match = (p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase());
  const sorted = [...data].filter(match).sort((a: any, b: any) => (b.updated ?? 0) - (a.updated ?? 0));
  const groups = [
    { key: 'published', title: 'Aktuelle Pakete', hint: 'Veröffentlicht – im Showmaster-Pult wählbar.', items: sorted.filter((p: any) => p.status === 'published') },
    { key: 'draft', title: 'Entwürfe', hint: 'Noch nicht veröffentlicht.', items: sorted.filter((p: any) => p.status === 'draft') },
    { key: 'archived', title: 'Archiv', hint: 'Alte Pakete – bleiben gespeichert, sind aber nicht mehr wählbar.', items: sorted.filter((p: any) => p.status === 'archived') },
  ];
  const rounds = (p: any) => (p.show?.length ? p.show.filter((x: any) => x.k !== 'board').length : p.categoryIds?.length ?? 0);
  const card = (p: any) => (
    <div key={p.id} className={`pcard ${p.status}`}>
      <h4>{p.name}</h4>
      <div className="meta">
        <Badge kind={p.status === 'published' ? 'ok' : p.status === 'archived' ? 'muted' : 'warn'}>{p.status === 'published' ? `Veröffentlicht · v${p.currentVersion}` : p.status === 'archived' ? 'Archiviert' : 'Entwurf'}</Badge>
        <span>{rounds(p)} Runden</span><span>zuletzt bearbeitet {fmtDate(p.updated)}</span>
      </div>
      <div className="acts">
        <button className={`btn small ${p.status === 'draft' ? 'primary' : ''}`} onClick={() => setEdit(p)}>{p.status === 'draft' ? 'Bearbeiten' : 'Öffnen'}</button>
        <RowMenu>
          <button onClick={() => act(() => adm('POST', `/packs/${p.id}/duplicate`), 'Als Entwurf dupliziert ✓')}>⧉ Duplizieren</button>
          <button onClick={async () => { const r = await adm('GET', `/export?scope=pack:${p.id}`); if (r.ok) download(`JANIQUIZITION-Spieleabend-${p.id}.json`, r.data); else t.show(errText(r)); }}>📤 Exportieren</button>
          {p.status === 'archived'
            ? <button onClick={() => act(() => adm('POST', `/packs/${p.id}/status`, { status: 'published' }), 'Wieder aktiviert ✓')}>↩ Wieder aktivieren</button>
            : p.versions > 0 && <button onClick={async () => { if (await ask({ title: `„${p.name}“ archivieren?`, text: 'Das Paket bleibt mit allen Versionen gespeichert, ist aber für neue Shows nicht mehr wählbar. Laufende Räume sind nicht betroffen. Du kannst es jederzeit wieder aktivieren.', confirmLabel: 'Archivieren' })) act(() => adm('POST', `/packs/${p.id}/status`, { status: 'archived' }), 'Archiviert ✓'); }}>🗄 Archivieren</button>}
          {p.versions === 0 && <button className="danger" onClick={async () => { if (await ask({ title: 'Entwurf löschen?', text: 'Dieser Entwurf wurde nie veröffentlicht und wird endgültig gelöscht.', confirmLabel: 'Löschen', danger: true })) act(() => adm('DELETE', '/packs/' + p.id), 'Gelöscht'); }}>🗑 Löschen</button>}
        </RowMenu>
      </div>
    </div>
  );
  return (
    <div>
      <PageHead title="Spielepakete" sub="Ein Spielepaket legt fest, welche Runden und Fragen an einem Spieleabend vorkommen.">
        <button className="btn primary" onClick={() => setNeu(true)}>＋ Neues Paket erstellen</button>
      </PageHead>
      <div className="qrow"><SearchBox value={q} onChange={setQ} placeholder="Paket suchen …" /></div>
      {!loading && !data.length && <Empty icon="📦" title="Noch keine Pakete" text="Ein Paket ist die Zusammenstellung für einen Abend."><button className="btn primary" onClick={() => setNeu(true)}>＋ Neues Paket erstellen</button></Empty>}
      {!loading && data.length > 0 && !sorted.length && <Empty icon="🔎" title="Kein Paket gefunden" text="Andere Suche probieren." />}
      {groups.filter(g => g.key !== 'archived' && (g.items.length || g.key === 'published')).map(g => (
        <section key={g.key} className="packgroup"><h3>{g.title} <Badge>{g.items.length}</Badge></h3><p className="muted small" style={{ margin: '0 0 8px' }}>{g.hint}</p><div className="packgrid">{g.items.map(card)}</div></section>))}
      {groups[2].items.length > 0 && <details className="packgroup"><summary><b>Archiv</b> <Badge>{groups[2].items.length}</Badge> <span className="muted small">– alte Pakete, bleiben gespeichert</span></summary><div className="packgrid" style={{ marginTop: 8 }}>{groups[2].items.map(card)}</div></details>}
      <details className="more"><summary>Was bedeuten Entwurf und Version?</summary><p className="small">Ein <b>Entwurf</b> ist in Arbeit. Mit <b>Veröffentlichen</b> entsteht eine feste <b>Version</b>, die im Showmaster-Pult gewählt werden kann. Spätere Änderungen werden erst mit einer neuen Version wirksam; bereits gestartete Räume und ältere Versionen bleiben unverändert.</p></details>
      {edit && <PackEditor pack={edit} onClose={() => { setEdit(null); bump(); }} />}
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

/** Fester Showablauf eines Pakets: Reihenfolge, Runden, Aufgaben tauschen, Dauer/Punkte. Nutzt die bestehende Kategorien-/Fragenverwaltung. */
function ShowEditor({ p, set, cats, lib, reloadCats, onChanged, show }: { p: any; set: (k: string, v: any) => void; cats: any[]; lib: any[]; reloadCats: () => void; onChanged: () => void; show: any }) {
  const steps: ShowStep[] = p.show ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const [swap, setSwap] = useState<{ cat: string; idx: number } | null>(null);
  const [msg, setMsg] = useState('');
  const byId = new Map(cats.map((c: any) => [c.id, c]));
  const qById = new Map(lib.map((q: any) => [q.id, q]));
  const setSteps = (a: ShowStep[]) => set('show', a);
  const move = (i: number, d: number) => { const a = steps.slice(); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setSteps(a); };
  const rounds = show?.rounds as any[] | undefined;
  let rn = 0; const minutes: Record<number, any> = {}; steps.forEach((st, i) => { if (st.k !== 'board') minutes[i] = rounds?.[rn++]; });
  const template = () => {
    const used = new Set<string>(); const pick = (kind: string, mode?: string) => { const c = cats.find((x: any) => x.kind === kind && !x.disabled && !used.has(x.id) && (!mode || x.mode === mode) && !x.problems.length); if (c) used.add(c.id); return c; };
    const seq: [ShowStep['k'] | 'board', string?][] = [['round', 'geo'], ['round', 'match'], ['round', 'rank'], ['board'], ['surprise'], ['round', 'glitch'], ['round', 'estimate'], ['round', 'link'], ['board'], ['final']];
    const out: ShowStep[] = []; const missing: string[] = [];
    for (const [k, mode] of seq) { if (k === 'board') { out.push({ k: 'board' }); continue; } const c = pick(k === 'round' ? 'tile' : k, mode); if (c) out.push({ k: k as any, cat: c.id }); else missing.push(mode ?? k); }
    setSteps(out); setMsg(missing.length ? `Für diese Abschnitte fehlt eine passende Kategorie: ${missing.join(', ')}` : 'Vorlage eingefügt – bitte prüfen.');
  };
  const replaceTask = async (cat: any, idx: number, newId: string) => {
    const ids = cat.taskIds.slice(); ids[idx] = newId;
    const r = await adm('PUT', '/categories/' + cat.id, { ...cat, taskIds: ids, ifUpdated: cat.updated });
    if (!r.ok) { setMsg(errText(r)); return; }
    setSwap(null); setMsg('Aufgabe ersetzt ✓'); reloadCats(); onChanged();
  };
  const moveTask = async (cat: any, idx: number, d: number) => {
    const ids = cat.taskIds.slice(); const j = idx + d; if (j < 0 || j >= ids.length) return; [ids[idx], ids[j]] = [ids[j], ids[idx]];
    const r = await adm('PUT', '/categories/' + cat.id, { ...cat, taskIds: ids, ifUpdated: cat.updated });
    if (!r.ok) { setMsg(errText(r)); return; } reloadCats(); onChanged();
  };
  const kindOf = (st: ShowStep) => (st.k === 'round' ? 'tile' : st.k);
  if (!steps.length) return (
    <div className="card">
      <h3 id="pk-rounds">🎬 Fester Showablauf</h3>
      <p className="small muted">Alle Runden in bewusst festgelegter Reihenfolge statt Kategorienwand. Du kannst eine Vorlage einfügen (6 Runden, Überraschung, Finale) und danach Runden und Aufgaben anpassen.</p>
      <button className="btn" onClick={template}>＋ Showablauf aus Vorlage anlegen</button>{msg && <div className="status">{msg}</div>}
    </div>
  );
  return (
    <div className="card showed">
      <h3 id="pk-rounds">🎬 Fester Showablauf</h3>
      {show && <div className="stats">
        <div><b>{show.tasksTotal}</b><small>Aufgaben in {show.rounds.length} Runden</small></div>
        <div><b>{show.minutesExpected} min</b><small>erwartete Dauer (max. {show.minutesMax} min)</small></div>
        <div><b>{show.pointsMax.toLocaleString('de-DE')}</b><small>Maximalpunkte (ohne Startguthaben und Wetten); Finale {Math.round(show.finalShare * 100)} %</small></div>
        <div><b>{7 - show.modesMissing.length} / 7</b><small>Spielmodi{show.modesMissing.length ? ` – fehlt: ${show.modesMissing.join(', ')}` : ' – alle kommen vor'}</small></div>
      </div>}
      {steps.map((st, i) => {
        if (st.k === 'board') return (
          <div key={i} className="row taskrow"><span className="rankno">{i + 1}</span><span className="ordtext">📊 Zwischenstand</span>
            <button className="btn tiny ghost" aria-label="Nach oben" onClick={() => move(i, -1)}>▲</button><button className="btn tiny ghost" aria-label="Nach unten" onClick={() => move(i, 1)}>▼</button>
            <button className="btn tiny ghost" aria-label="Entfernen" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>✕</button></div>);
        const c: any = byId.get(st.cat); const m = minutes[i];
        return (
          <div key={i} className={`showstep ${open === i ? 'open' : ''}`}>
            <div className="row taskrow">
              <span className="rankno">{i + 1}</span>
              <button className="ordtext linkbtn" onClick={() => setOpen(open === i ? null : i)}>{c ? `${c.icon} ${c.title}` : st.cat}
                <small className="muted"> · {st.k === 'round' ? 'Runde' : st.k === 'surprise' ? 'Überraschung' : 'Finale'}{c ? ` · ${c.taskCount} Aufg. · ${c.points} P.` : ' · fehlt!'}{m ? ` · ca. ${m.expectedMin} min` : ''}{c?.problems?.length ? ' · ⚠' : ''}</small></button>
              <button className="btn tiny ghost" aria-label="Nach oben" onClick={() => move(i, -1)}>▲</button><button className="btn tiny ghost" aria-label="Nach unten" onClick={() => move(i, 1)}>▼</button>
              <button className="btn tiny ghost" aria-label="Entfernen" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>✕</button>
            </div>
            {open === i && c && (
              <div className="showtasks">
                <label className="field"><span>Kategorie für diesen Abschnitt</span>
                  <select value={st.cat} onChange={e => setSteps(steps.map((x, j) => (j === i ? { ...x, cat: e.target.value } as ShowStep : x)))}>{cats.filter((x: any) => x.kind === kindOf(st) && !x.disabled).map((x: any) => <option key={x.id} value={x.id}>{x.icon} {x.title} ({MODE_LABEL[x.mode as Mode] ?? '–'}, {x.taskCount} Aufg.)</option>)}</select></label>
                {c.usedInPacks.length > 1 && <p className="small muted">⚠ Diese Runde wird auch in {c.usedInPacks.filter((x: any) => x.id !== p.id).map((x: any) => x.name).join(', ')} verwendet – Änderungen an den Aufgaben gelten dort ebenso.</p>}
                {c.taskIds.map((qid: string, k: number) => { const q: any = qById.get(qid); return (
                  <div key={qid + k} className="row taskrow"><span className="rankno">{k + 1}</span>
                    <span className="ordtext">{q ? `${MODE_ICON[q.mode]} ${q.task.prompt || '(ohne Text)'}` : qid} <small className="muted">· {q ? taskMax(q.task) : '?'} P.</small></span>
                    <button className="btn tiny ghost" aria-label="Nach oben" onClick={() => moveTask(c, k, -1)}>▲</button><button className="btn tiny ghost" aria-label="Nach unten" onClick={() => moveTask(c, k, 1)}>▼</button>
                    <button className="btn tiny" onClick={() => setSwap(!!swap && swap.cat === c.id && swap.idx === k ? null : { cat: c.id, idx: k })}>↻ ersetzen</button></div>); })}
                {swap && swap.cat === c.id && (
                  <div className="pickbox"><p className="small muted">Alternative aus dem Fragenpool wählen (gleicher Spielmodus):</p>
                    {lib.filter((q: any) => (c.kind === 'final' ? true : q.mode === c.mode) && !c.taskIds.includes(q.id) && !q.problems.length).slice(0, 60).map((q: any) => (
                      <button key={q.id} className="pickrow" onClick={() => replaceTask(c, swap!.idx, q.id)}>{MODE_ICON[q.mode]} {q.task.prompt} <small className="muted">{q.topic} · {taskMax(q.task)} P.</small></button>))}
                  </div>)}
              </div>)}
          </div>);
      })}
      <div className="row wrap">
        <button className="btn small ghost" onClick={() => setSteps([...steps, { k: 'board' }])}>＋ Zwischenstand</button>
        <select value="" onChange={e => { const c = cats.find((x: any) => x.id === e.target.value); if (c) setSteps([...steps.slice(0, c.kind === 'final' ? steps.length : steps.length), { k: c.kind === 'tile' ? 'round' : c.kind, cat: c.id } as ShowStep]); }} style={{ width: 'auto', maxWidth: 260 }}>
          <option value="">＋ Runde hinzufügen …</option>{cats.filter((x: any) => !x.disabled && !steps.some(s => s.k !== 'board' && s.cat === x.id)).map((x: any) => <option key={x.id} value={x.id}>{x.icon} {x.title} ({x.kind === 'tile' ? 'Runde' : x.kind === 'surprise' ? 'Überraschung' : 'Finale'})</option>)}</select>
        <button className="btn small ghost" onClick={template}>Vorlage neu einfügen</button>
      </div>
      {msg && <div className="status">{msg}</div>}
    </div>
  );
}

function PackEditor({ pack, onClose }: { pack: any; onClose: () => void }) {
  const [p, setP] = useState<any>(pack);
  const [msg, setMsg] = useState(''); const [ana, setAna] = useState<any>(null); const [vers, setVers] = useState<any[]>([]);
  const { data: cats, reload: reloadCats } = useList<any>('/categories', 0);
  const { data: lib } = useList<any>('/questions?archived=0', 0);
  const [rev, setRev] = useState(0);
  const set = (k: string, v: any) => setP({ ...p, [k]: v });
  const setRule = (k: string, v: string) => set('rules', { ...p.rules, [k]: v === '' ? '' : Number(v) });
  const tiles = cats.filter((c: any) => c.kind === 'tile'), byId = new Map(cats.map((c: any) => [c.id, c]));
  const loadVers = useCallback(() => { if (p.id) adm('GET', `/packs/${p.id}/versions`).then(r => r.ok && setVers(r.data)); }, [p.id]);
  useEffect(loadVers, [loadVers]);
  const put = () => p.id ? adm('PUT', '/packs/' + p.id, { ...p, ifUpdated: p.updated }) : adm('POST', '/packs', p);
  const save = async (): Promise<boolean> => {
    const r = await put();
    if (!r.ok) { setMsg(errText(r)); return false; }
    setP(r.data); setMsg('Entwurf gespeichert ✓'); return true;
  };
  useEffect(() => { if (p.id) adm('GET', `/packs/${p.id}/analysis`).then(r => r.ok && setAna(r.data)); }, [p.id, msg, rev]);
  const { ask, node: confirmNode } = useConfirm();
  const doPublish = async () => {
    const note = await ask({ title: ana?.errors?.length ? 'Veröffentlichen nicht möglich' : 'Paket veröffentlichen?', confirmLabel: 'Veröffentlichen',
      text: ana?.errors?.length ? <><p>Bitte zuerst beheben:</p><ul>{ana.errors.slice(0, 6).map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></> : <p>Die neue Version ist für zukünftige Shows verfügbar. <b>Bereits gestartete Räume bleiben unverändert.</b> Ältere Versionen bleiben erhalten.</p>,
      input: ana?.errors?.length ? undefined : { label: 'Notiz zu dieser Version (optional)', placeholder: 'z. B. Neue Fragen für Runde 3' } });
    if (note === null || ana?.errors?.length) return;
    const r0 = await put();
    if (!r0.ok) { setMsg(errText(r0)); return; }
    const id = r0.data.id; setP(r0.data);
    const r = await adm('POST', `/packs/${id}/publish`, { note: typeof note === 'string' ? note : '' });
    if (!r.ok) { setMsg(errText(r)); return; }
    setMsg(`Veröffentlicht: Version ${r.data.version} ✓`); const g = await adm('GET', '/packs/' + id); if (g.ok) setP(g.data); loadVers();
  };
  const addCat = (id: string) => set('categoryIds', [...p.categoryIds, id]);
  const moveCat = (i: number, d: number) => { const a = p.categoryIds.slice(); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set('categoryIds', a); };
  const a = ana?.analysis;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modalbox wide editor" onClick={e => e.stopPropagation()}>
        <div className="row between sticky-top"><h2>📦 {p.id ? 'Paket bearbeiten' : 'Neues Paket'} {p.id && <Badge kind={p.status === 'published' ? 'ok' : p.status === 'archived' ? 'muted' : 'warn'}>{p.status === 'published' ? `Veröffentlicht · v${p.currentVersion}` : p.status === 'archived' ? 'Archiviert' : 'Entwurf'}</Badge>}</h2><button className="btn small ghost" onClick={onClose}>Schließen ✕</button></div>
        <div className="stepsbar" role="navigation" aria-label="Schritte">
          {[['pk-name', '1 · Name & Einstellungen'], ['pk-rounds', '2 · Runden zusammenstellen'], ['pk-rounds', '3 · Fragen auswählen'], ['pk-check', `4 · Ablauf prüfen${ana?.errors?.length ? ` (${ana.errors.length} ⚠)` : ana ? ' ✓' : ''}`], ['pk-publish', '5 · Veröffentlichen']].map(([id, label], i) => <button key={i} type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{label}</button>)}
        </div>
        <label className="field" id="pk-name"><span>Name</span><input value={p.name} maxLength={60} placeholder="z. B. Spieleabend November" onChange={e => set('name', e.target.value)} /></label>
        <ShowEditor p={p} set={set} cats={cats} lib={lib} reloadCats={reloadCats} onChanged={() => setRev(x => x + 1)} show={ana?.show} />
        {p.show?.length ? <details className="more"><summary>Klassischer Modus (Kategorienwand, optional)</summary>
        <h3>Kategorien <small className="muted">({p.categoryIds.length}, empfohlen 8–9)</small></h3>
        {p.categoryIds.map((id: string, i: number) => { const c: any = byId.get(id); return (
          <div className="row taskrow" key={id}><span className="rankno">{i + 1}</span><span className="ordtext">{c ? `${c.icon} ${c.title}` : id} {c && <small className="muted">· {MODE_LABEL[c.mode as Mode] ?? '–'}{c.football ? ' · ⚽' : ''}{c.disabled ? ' · deaktiviert!' : ''}{c.problems.length ? ' · ⚠' : ''}</small>}</span>
            <button className="btn tiny ghost" aria-label="Nach oben" onClick={() => moveCat(i, -1)}>▲</button><button className="btn tiny ghost" aria-label="Nach unten" onClick={() => moveCat(i, 1)}>▼</button>
            <button className="btn tiny ghost" aria-label="Entfernen" onClick={() => set('categoryIds', p.categoryIds.filter((x: string) => x !== id))}>✕</button></div>); })}
        <label className="field"><span>＋ Kategorie hinzufügen</span>
          <select value="" onChange={e => e.target.value && addCat(e.target.value)}><option value="">wählen …</option>{tiles.filter((c: any) => !p.categoryIds.includes(c.id)).map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title} ({MODE_LABEL[c.mode as Mode] ?? '–'}){c.disabled ? ' – deaktiviert' : ''}</option>)}</select></label>
        <div className="form2">
          <label className="field"><span>Überraschungsrunde</span><select value={p.surprise} onChange={e => set('surprise', e.target.value)}><option value="">– wählen –</option>{cats.filter((c: any) => c.kind === 'surprise').map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
          <label className="field"><span>Finale</span><select value={p.final} onChange={e => set('final', e.target.value)}><option value="">– wählen –</option>{cats.filter((c: any) => c.kind === 'final').map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
        </div>
</details> : <>
        <h3>Kategorien <small className="muted">({p.categoryIds.length}, empfohlen 8–9)</small></h3>
        {p.categoryIds.map((id: string, i: number) => { const c: any = byId.get(id); return (
          <div className="row taskrow" key={id}><span className="rankno">{i + 1}</span><span className="ordtext">{c ? `${c.icon} ${c.title}` : id} {c && <small className="muted">· {MODE_LABEL[c.mode as Mode] ?? '–'}{c.football ? ' · ⚽' : ''}{c.disabled ? ' · deaktiviert!' : ''}{c.problems.length ? ' · ⚠' : ''}</small>}</span>
            <button className="btn tiny ghost" aria-label="Nach oben" onClick={() => moveCat(i, -1)}>▲</button><button className="btn tiny ghost" aria-label="Nach unten" onClick={() => moveCat(i, 1)}>▼</button>
            <button className="btn tiny ghost" aria-label="Entfernen" onClick={() => set('categoryIds', p.categoryIds.filter((x: string) => x !== id))}>✕</button></div>); })}
        <label className="field"><span>＋ Kategorie hinzufügen</span>
          <select value="" onChange={e => e.target.value && addCat(e.target.value)}><option value="">wählen …</option>{tiles.filter((c: any) => !p.categoryIds.includes(c.id)).map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title} ({MODE_LABEL[c.mode as Mode] ?? '–'}){c.disabled ? ' – deaktiviert' : ''}</option>)}</select></label>
        <div className="form2">
          <label className="field"><span>Überraschungsrunde</span><select value={p.surprise} onChange={e => set('surprise', e.target.value)}><option value="">– wählen –</option>{cats.filter((c: any) => c.kind === 'surprise').map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
          <label className="field"><span>Finale</span><select value={p.final} onChange={e => set('final', e.target.value)}><option value="">– wählen –</option>{cats.filter((c: any) => c.kind === 'final').map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}</select></label>
        </div>
</>}
        <details className="more"><summary>Einstellungen (Länge, Startpunkte)</summary>
          <label className="field"><span>Beschreibung</span><input value={p.description} maxLength={300} onChange={e => set('description', e.target.value)} /></label>
          <div className="form2">
            <label className="field"><span>Startguthaben</span><input inputMode="numeric" value={p.rules.startCredit} onChange={e => setRule('startCredit', e.target.value)} /></label>
          </div>
          <div className="form2">
            <label className="field"><span>Länge der Show (gewertete Aufgaben je Spielmodus)</span><select value={p.rules.tasksPerMode ?? 4} onChange={e => set('rules', { ...p.rules, tasksPerMode: Number(e.target.value) })}><option value={4}>Kompakte Show – 4 Aufgaben je Spielmodus</option><option value={5}>Längere Show – 5 Aufgaben je Spielmodus</option><option value={6}>Best-of-Show – 6 Aufgaben je Spielmodus (sehr lang, ca. 2,5 Std.)</option></select></label>
          </div>
          <details className="more"><summary>Experten-Einstellungen (meist nicht nötig)</summary>
          <div className="form2">
                        <label className="field"><span>Max. Fußball-Kacheln</span><input inputMode="numeric" value={p.rules.maxFootball} onChange={e => setRule('maxFootball', e.target.value)} /></label>
            <label className="field"><span>Max. Kacheln je Modus</span><input inputMode="numeric" value={p.rules.maxPerMode} onChange={e => setRule('maxPerMode', e.target.value)} /></label>
          </div>
          <div className="form2">
            <label className="field"><span>SORTIER’S! / BLIND RANK – Bedienung</span><select value={p.rules.rankVariant ?? 'task'} onChange={e => set('rules', { ...p.rules, rankVariant: e.target.value })}><option value="task">je Frage festgelegt (Standard: nacheinander)</option><option value="sequence">immer nacheinander (klassisch)</option><option value="sort">immer: SORTIER’S! (fünf Karten auf Plätze ziehen)</option></select></label>
          </div>
          <div className="form2">
            <label className="field"><span>Showtitel (TV-Eröffnung)</span><input value={p.rules.showTitle ?? ''} maxLength={40} placeholder="JANIQUIZITION" onChange={e => set('rules', { ...p.rules, showTitle: e.target.value })} /></label>
            <label className="field"><span>Gewinnerbezeichnung (Siegerehrung)</span><input value={p.rules.winnerTitle ?? ''} maxLength={40} placeholder="JANIQUIZITION-Champion" onChange={e => set('rules', { ...p.rules, winnerTitle: e.target.value })} /></label>
          </div>
          <div className="form2">
            <label className="field"><span>SETZ AUF MICH – (veraltet, wird nicht mehr verwendet: Einsatz = bis 50 % des Punktestands)</span><input value={(p.rules.estimateBets ?? []).join(', ')} placeholder="0, 50, 100" onChange={e => set('rules', { ...p.rules, estimateBets: e.target.value.split(/[ ,;]+/).filter(Boolean).map(Number).filter(n => Number.isFinite(n)) })} /></label>
            <label className="field"><span>EINZIGARTIG: Punkte je einmaliger Antwort (0 = je Frage)</span><input inputMode="numeric" value={p.rules.uniquePoints ?? 0} onChange={e => set('rules', { ...p.rules, uniquePoints: Number(e.target.value) || 0 })} /></label>
            <label className="field"><span>Bonus für die beste Schätzung (Punkte)</span><input inputMode="numeric" value={p.rules.estimateBonus ?? 0} onChange={e => set('rules', { ...p.rules, estimateBonus: Number(e.target.value) || 0 })} /></label>
          </div>
          <div className="card small"><b>Punktebalance SETZ AUF MICH:</b> je Aufgabe Rangpunkte nach Genauigkeit (bis zur Aufgabenpunktzahl, i. d. R. 300) {p.rules.estimateBonus ? <>+ <b>{p.rules.estimateBonus} Bonus</b> für die beste Schätzung (bei Gleichstand für alle Besten)</> : '(kein Bonus)'}; Wetten {(p.rules.estimateBets?.length ? p.rules.estimateBets : [0, 100, 200]).join(' / ')}: Gewinn = Einsatz, Verlust = Einsatz (nie unter 0) – reine Umverteilung. {p.rules.estimateBonus ? `Der Bonus ist größer als der höchste Einsatz (${Math.max(0, ...(p.rules.estimateBets ?? [0]))}) – wer am besten schätzt, gewinnt die Aufgabe, nicht der beste Wetter.` : ''}</div>
          <div className="form2">
            <label className="field"><span>Zeile unter dem Showtitel</span><input value={p.rules.tagline ?? ''} maxLength={80} placeholder="z. B. Dein persönlicher Kickbase-Abend" onChange={e => set('rules', { ...p.rules, tagline: e.target.value })} /></label>
            <label className="field"><span>Zeile unter dem Sieger</span><input value={p.rules.winnerLine ?? ''} maxLength={80} onChange={e => set('rules', { ...p.rules, winnerLine: e.target.value })} /></label>
            <label className="field"><span>Titel der Zwischenstände</span><input value={p.rules.boardTitle ?? ''} maxLength={30} placeholder="Zwischenstand" onChange={e => set('rules', { ...p.rules, boardTitle: e.target.value })} /></label>
          </div>
          </details>
          <p className="muted small">Paketname oben ändern. Änderungen gelten für neue Räume, sobald du das Paket neu veröffentlichst (neue Version); laufende Räume bleiben unverändert.</p>
        </details>
        {ana && <details className="more" id="pk-check" open={ana.errors.length > 0}><summary>{ana.errors.length ? `⚠ ${ana.errors.length} Fehler` : '✓ Prüfung'}{a?.combos ? ` · ca. ${a.combos.minutesExpected.min}–${a.combos.minutesExpected.max} min` : ''}</summary>
          {ana.errors.length > 0 && <div className="warnbox card"><b>Verhindert die Veröffentlichung:</b><ul>{ana.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>}
          {ana.warnings.length > 0 && <div><b>Hinweise:</b><ul>{ana.warnings.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>}
          {a?.combos && <div className="stats">
            <div><b>{a.combos.minutesExpected.min}–{a.combos.minutesExpected.max} min</b><small>erwartete Spieldauer</small></div>
            <div><b>{a.combos.minutesMax.min}–{a.combos.minutesMax.max} min</b><small>maximal (alle Zeitlimits ausgeschöpft)</small></div>
            <div><b>{Math.round(a.combos.footballShare.min * 100)}–{Math.round(a.combos.footballShare.max * 100)} %</b><small>Fußballanteil</small></div>
            <div><b>≤ {a.combos.maxSameModeTiles}</b><small>Kacheln je Modus</small></div>
          </div>}
          {a && <div className="tablescroll"><table className="scoretab"><tbody>{[...a.tiles, ...a.specials].map((t: any) => <tr key={t.id}><td>{t.title}</td><td className="muted">{t.mode ?? t.kind}</td><td>{t.tasks} Fr. · {t.points} P.</td><td>{t.expectedMin}–{t.maxMin} min</td></tr>)}</tbody></table></div>}
        </details>}
        {p.id && vers.length > 0 && <details className="more"><summary>Versionen ({vers.length}) – Entwurf = in Arbeit · Version = für neue Shows wählbar · ältere Versionen bleiben erhalten</summary>
          <div className="tablescroll"><table className="scoretab"><tbody>{vers.map(v => <tr key={v.ref}><td><b>v{v.version}</b> {v.current && <span className="badge ok">aktuell</span>}</td><td>{new Date(v.created).toLocaleString('de-DE')}</td><td className="muted">{v.note}</td><td>{v.categories} Kat. · {v.questions} Fr.</td>
            <td>{!v.current && <button className="btn tiny" onClick={async () => { if (!(await ask({ title: `Version ${v.version} wieder aktivieren?`, text: 'Neue Shows verwenden dann diese Version. Laufende Räume sind nicht betroffen.', confirmLabel: 'Aktivieren' }))) return; const r = await adm('POST', `/packs/${p.id}/rollback`, { version: v.version }); if (r.ok) { setP(r.data); loadVers(); setMsg(`Version ${v.version} ist wieder aktiv ✓`); } else setMsg(errText(r)); }}>↩ Wiederherstellen</button>}</td></tr>)}</tbody></table></div></details>}
        {msg && <div className={`status ${msg.includes('✓') ? 'ok' : 'bad'}`}>{msg}</div>}
        <div className="actionbar" id="pk-publish"><span className="spacer" />
          <button className="btn quiet" onClick={save}>💾 Entwurf speichern</button><button className="btn primary" onClick={doPublish}>🚀 Veröffentlichen</button></div>
        {confirmNode}
      </div>
    </div>
  );
}

