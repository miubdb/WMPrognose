'use client';
import { useEffect, useRef, useState } from 'react';
import { api, ApiClientError, MEAL_LABEL, num, useFetch } from '@/lib/client';
import { scaleFood } from '@/domain/nutrition';
import { Badge, Button, Empty, Field, FormFields, Modal, Notice, Spinner, Tabs, toPayload, type FieldDef } from './ui';

export const ENTRY_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Datum', type: 'date', required: true },
  { name: 'meal', label: 'Mahlzeit', type: 'select', required: true, options: Object.entries(MEAL_LABEL).map(([value, label]) => ({ value, label })) },
  { name: 'name', label: 'Bezeichnung', type: 'text', required: true },
  { name: 'amount_g', label: 'Menge', type: 'number', unit: 'g' },
  { name: 'kcal', label: 'Kalorien', type: 'number', unit: 'kcal', required: true },
  { name: 'protein_g', label: 'Eiweiß', type: 'number', unit: 'g' },
  { name: 'carbs_g', label: 'Kohlenhydrate', type: 'number', unit: 'g' },
  { name: 'fat_g', label: 'Fett', type: 'number', unit: 'g' },
  { name: 'is_estimate', label: 'Schätzung', type: 'checkbox', help: 'Als Schätzung markiert (Häkchen entfernen, wenn die Werte geprüft sind)' },
];

export const FOOD_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'kcal_100g', label: 'Kalorien pro 100 g', type: 'number', unit: 'kcal', required: true },
  { name: 'protein_100g', label: 'Eiweiß pro 100 g', type: 'number', unit: 'g' },
  { name: 'carbs_100g', label: 'Kohlenhydrate pro 100 g', type: 'number', unit: 'g' },
  { name: 'fat_100g', label: 'Fett pro 100 g', type: 'number', unit: 'g' },
  { name: 'serving_g', label: 'Übliche Portion', type: 'number', unit: 'g' },
  { name: 'barcode', label: 'Barcode (optional)', type: 'text' },
];

export function AddFoodModal({ open, onClose, date, meal, onSaved }: { open: boolean; onClose: () => void; date: string; meal: string; onSaved: () => void }) {
  const [tab, setTab] = useState('manual');
  return (
    <Modal open={open} onClose={onClose} title={`Hinzufügen – ${MEAL_LABEL[meal]}`}>
      <Tabs tabs={[{ id: 'manual', label: 'Manuell' }, { id: 'food', label: 'Meine Lebensmittel' }, { id: 'barcode', label: 'Barcode' }, { id: 'photo', label: 'Foto (KI)' }]} value={tab} onChange={setTab} />
      {tab === 'manual' && <ManualTab date={date} meal={meal} onSaved={onSaved} />}
      {tab === 'food' && <FoodTab date={date} meal={meal} onSaved={onSaved} />}
      {tab === 'barcode' && <BarcodeTab date={date} meal={meal} onSaved={onSaved} />}
      {tab === 'photo' && <PhotoTab date={date} meal={meal} onSaved={onSaved} />}
    </Modal>
  );
}

function ManualTab({ date, meal, onSaved }: { date: string; meal: string; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, any>>({ date, meal, name: '', amount_g: '', kcal: '', protein_g: '', carbs_g: '', fat_g: '' });
  const [err, setErr] = useState<ApiClientError | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    try { await api('/api/r/food-entries', { method: 'POST', body: { ...toPayload(ENTRY_FIELDS.filter((f) => f.name !== 'is_estimate'), v, 'create'), source: 'manual', is_estimate: false } }); onSaved(); }
    catch (e) { setErr(e as ApiClientError); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-3">
      {err && <Notice kind="error">{err.message}</Notice>}
      <FormFields defs={ENTRY_FIELDS.filter((f) => !['date', 'meal', 'is_estimate'].includes(f.name))} values={v} setValues={setV} errors={err?.fields} />
      <Button type="submit" busy={busy} data-testid="save-entry">Hinzufügen</Button>
    </form>
  );
}

function FoodTab({ date, meal, onSaved }: { date: string; meal: string; onSaved: () => void }) {
  const foods = useFetch<{ rows: any[] }>('/api/r/foods');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any | null>(null);
  const [grams, setGrams] = useState('100');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!foods.data) return <Spinner />;
  const list = foods.data.rows.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
  if (!sel) {
    return (
      <div className="space-y-3">
        {foods.data.rows.length === 0 ? <Empty>Noch keine eigenen Lebensmittel. Lege sie im Reiter „Lebensmittel“ an oder nutze den Barcode.</Empty> : (
          <>
            <Field def={{ name: 'q', label: 'Suchen', type: 'text' }} value={q} onChange={setQ} />
            <ul className="space-y-2">{list.map((f) => <li key={f.id}><button className="w-full rounded-xl bg-slate-50 p-3 text-left" onClick={() => { setSel(f); setGrams(String(f.serving_g ?? 100)); }}>{f.name} <span className="text-sm text-slate-500">· {num(f.kcal_100g, 0)} kcal/100 g</span></button></li>)}</ul>
          </>
        )}
      </div>
    );
  }
  const g = Number(grams.replace(',', '.'));
  const scaled = g > 0 ? scaleFood(sel, g) : null;
  async function save() {
    if (!scaled) return;
    setBusy(true); setErr(null);
    try { await api('/api/r/food-entries', { method: 'POST', body: { date, meal, name: sel.name, ...scaled, food_id: sel.id, source: 'food', is_estimate: false } }); onSaved(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <p className="font-semibold">{sel.name}</p>
      {err && <Notice kind="error">{err}</Notice>}
      <Field def={{ name: 'g', label: 'Menge', type: 'number', unit: 'g', required: true }} value={grams} onChange={setGrams} />
      {scaled && <p className="text-sm text-slate-700">{scaled.kcal} kcal · E {scaled.protein_g} g · KH {scaled.carbs_g} g · F {scaled.fat_g} g</p>}
      <div className="flex gap-2"><Button busy={busy} disabled={!scaled} onClick={save} data-testid="save-food-entry">Hinzufügen</Button><Button variant="secondary" onClick={() => setSel(null)}>Zurück</Button></div>
    </div>
  );
}

function BarcodeTab({ date, meal, onSaved }: { date: string; meal: string; onSaved: () => void }) {
  const [code, setCode] = useState('');
  const [p, setP] = useState<any | null>(null);
  const [grams, setGrams] = useState('100');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  async function lookup() {
    setBusy(true); setErr(null); setP(null);
    try { const r = await api<{ product: any }>(`/api/nutrition/barcode?code=${encodeURIComponent(code.trim())}`); setP(r.product); setGrams(String(r.product.serving_g ?? 100)); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const g = Number(grams.replace(',', '.'));
  const scaled = p && g > 0 ? scaleFood(p, g) : null;
  async function addEntry() {
    if (!scaled) return;
    setBusy(true); setErr(null);
    try { await api('/api/r/food-entries', { method: 'POST', body: { date, meal, name: p.name, ...scaled, source: 'manual', is_estimate: false } }); onSaved(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function saveFood() {
    setBusy(true); setErr(null);
    try { await api('/api/r/foods', { method: 'POST', body: { name: p.name, kcal_100g: p.kcal_100g, protein_100g: p.protein_100g, carbs_100g: p.carbs_100g, fat_100g: p.fat_100g, serving_g: p.serving_g, barcode: p.barcode } }); setInfo('In „Meine Lebensmittel“ gespeichert.'); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Barcode (EAN) eingeben – Nährwerte kommen von <a className="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a> (Community-Daten, ohne Gewähr).</p>
      {err && <Notice kind="error">{err}</Notice>}
      {info && <Notice kind="success">{info}</Notice>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void lookup(); }}>
        <input aria-label="Barcode" inputMode="numeric" className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-3" value={code} onChange={(e) => setCode(e.target.value)} placeholder="z. B. 3017620422003" />
        <Button type="submit" busy={busy} disabled={code.trim().length < 8}>Suchen</Button>
      </form>
      {p && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3">
          <p className="font-semibold">{p.name}{p.brand ? ` – ${p.brand}` : ''}</p>
          <p className="text-sm text-slate-600">pro 100 g: {p.kcal_100g} kcal · E {p.protein_100g} · KH {p.carbs_100g} · F {p.fat_100g} g</p>
          <Field def={{ name: 'g', label: 'Menge', type: 'number', unit: 'g', required: true }} value={grams} onChange={setGrams} />
          {scaled && <p className="text-sm">{scaled.kcal} kcal · E {scaled.protein_g} · KH {scaled.carbs_g} · F {scaled.fat_g} g</p>}
          <div className="flex flex-wrap gap-2"><Button onClick={addEntry} disabled={!scaled} busy={busy}>Zum Tag hinzufügen</Button><Button variant="secondary" onClick={saveFood} disabled={busy}>In meine Lebensmittel</Button></div>
        </div>
      )}
    </div>
  );
}

async function downscale(file: File, max = 1280): Promise<{ base64: string; media: 'image/jpeg' }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Bild konnte nicht verarbeitet werden.'))), 'image/jpeg', 0.82));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { base64: btoa(s), media: 'image/jpeg' };
}

interface AiItem { name: string; grams: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number; confidence: string; plausible: boolean }

function PhotoTab({ date, meal, onSaved }: { date: string; meal: string; onSaved: () => void }) {
  const status = useFetch<{ configured: boolean }>('/api/ai/status');
  const fileRef = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<AiItem[] | null>(null);
  const [notes, setNotes] = useState('');
  useEffect(() => { setErr(null); }, [items]);
  if (!status.data) return <Spinner />;
  if (!status.data.configured) return <Notice kind="warn">Die KI-Erkennung ist auf dieser Installation nicht eingerichtet (ANTHROPIC_API_KEY fehlt). Bitte stattdessen manuell oder per Barcode eintragen.</Notice>;

  async function analyze(file: File) {
    setBusy(true); setErr(null); setItems(null);
    try {
      const img = await downscale(file);
      const r = await api<{ items: AiItem[]; notes: string }>('/api/ai/food', { method: 'POST', body: { image_base64: img.base64, media_type: img.media, hint: hint || undefined } });
      setItems(r.items); setNotes(r.notes);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const upd = (i: number, k: keyof AiItem, v: string) => setItems(items!.map((it, j) => (j === i ? { ...it, [k]: k === 'name' ? v : Number(v.replace(',', '.')) } : it)));
  async function saveAll() {
    setBusy(true); setErr(null);
    try {
      for (const it of items!) await api('/api/r/food-entries', { method: 'POST', body: { date, meal, name: it.name, amount_g: it.grams, kcal: it.kcal, protein_g: it.protein_g, carbs_g: it.carbs_g, fat_g: it.fat_g, source: 'ai_estimate', is_estimate: true } });
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <Notice kind="info">Die KI schätzt Portionen und Nährwerte aus dem Foto. Das sind <strong>Schätzungen</strong> – bitte prüfen und korrigieren, bevor du speicherst. Das Foto wird nicht gespeichert.</Notice>
      {err && <Notice kind="error">{err}</Notice>}
      {!items && (
        <>
          <Field def={{ name: 'hint', label: 'Hinweis (optional)', type: 'text', placeholder: 'z. B. „ca. 200 g gekochter Reis“' }} value={hint} onChange={setHint} />
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" data-testid="photo-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ''; }} />
          <Button busy={busy} onClick={() => fileRef.current?.click()}>Foto aufnehmen / auswählen</Button>
        </>
      )}
      {items && (
        <div className="space-y-3">
          {notes && <p className="text-sm text-slate-600">Hinweis der KI: {notes}</p>}
          {items.length === 0 && <Empty>Es wurde kein Essen erkannt. Bitte ein anderes Foto wählen oder manuell eintragen.</Empty>}
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2"><Badge tone="amber">Schätzung</Badge><Badge tone={it.confidence === 'high' ? 'green' : it.confidence === 'medium' ? 'amber' : 'red'}>Sicherheit: {it.confidence === 'high' ? 'hoch' : it.confidence === 'medium' ? 'mittel' : 'niedrig'}</Badge>{!it.plausible && <Badge tone="red">Werte passen nicht zusammen</Badge>}</div>
              <input aria-label="Bezeichnung" className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3" value={it.name} onChange={(e) => upd(i, 'name', e.target.value)} />
              <div className="grid grid-cols-5 gap-1 text-xs">
                {([['grams', 'g'], ['kcal', 'kcal'], ['protein_g', 'E'], ['carbs_g', 'KH'], ['fat_g', 'F']] as const).map(([k, l]) => (
                  <label key={k} className="block">{l}<input aria-label={`${it.name} ${l}`} inputMode="decimal" className="min-h-[44px] w-full rounded-lg border border-slate-300 px-1 text-center text-base" value={it[k]} onChange={(e) => upd(i, k, e.target.value)} /></label>
                ))}
              </div>
              <button className="text-sm text-red-700" onClick={() => setItems(items.filter((_, j) => j !== i))}>Entfernen</button>
            </div>
          ))}
          <div className="flex gap-2"><Button busy={busy} disabled={items.length === 0} onClick={saveAll} data-testid="save-ai">Als Schätzung speichern</Button><Button variant="secondary" onClick={() => setItems(null)}>Neues Foto</Button></div>
        </div>
      )}
    </div>
  );
}
