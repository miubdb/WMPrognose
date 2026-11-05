// Validierung und Normalisierung von Aufgaben/Kategorien (Server UND Admin-Oberfläche verwenden dieselben Regeln).
import type { TaskDef, Mode, GeoTask, RankTask, EstimateTask, GlitchTask, CodeTask, UniqueTask } from './types';

export const MODES: Mode[] = ['geo', 'rank', 'estimate', 'glitch', 'codebreak', 'unique'];
export const MODE_LABEL: Record<Mode, string> = { geo: 'WO ZUR HÖLLE?', rank: 'BLIND RANK', estimate: 'SETZ AUF MICH', glitch: 'GLITCH', codebreak: 'CODEBREAK', unique: 'EINZIGARTIG' };

export function taskMax(t: TaskDef): number {
  switch (t.mode) {
    case 'estimate': return t.points + Math.max(0, ...t.bets);
    case 'unique': return t.pointsUnique;
    default: return t.points;
  }
}

const num = (v: unknown, d = NaN) => { const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v); return Number.isFinite(n) ? n : d; };
const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
const strList = (v: unknown, max: number, len = 80) => (Array.isArray(v) ? v.map(x => str(x, len)).filter(Boolean).slice(0, max) : []);

/** Wandelt beliebige (ggf. aus der Oberfläche/Import stammende) Daten in ein sauberes TaskDef-Objekt um. */
export function normalizeTask(raw: any): TaskDef {
  const r = raw ?? {};
  switch (r.mode as Mode) {
    case 'geo': return { mode: 'geo', prompt: str(r.prompt, 300), map: r.map, answer: { lat: num(r.answer?.lat), lon: num(r.answer?.lon), label: str(r.answer?.label, 80) }, seconds: num(r.seconds), points: num(r.points), explain: str(r.explain, 500) } as GeoTask;
    case 'rank': return { mode: 'rank', prompt: str(r.prompt, 200), topLabel: str(r.topLabel, 40), bottomLabel: str(r.bottomLabel, 40),
      items: (Array.isArray(r.items) ? r.items : []).slice(0, 5).map((i: any) => ({ text: str(i?.text, 60), ...(str(i?.value, 30) ? { value: str(i?.value, 30) } : {}) })),
      order: Array.isArray(r.order) ? r.order.map((x: unknown) => num(x)) : [], secondsPerItem: num(r.secondsPerItem), points: num(r.points), explain: str(r.explain, 500) } as RankTask;
    case 'estimate': return { mode: 'estimate', prompt: str(r.prompt, 300), unit: str(r.unit, 30), answer: num(r.answer), seconds: num(r.seconds), betSeconds: num(r.betSeconds), points: num(r.points),
      bets: Array.isArray(r.bets) ? r.bets.map((b: unknown) => num(b)) : [], explain: str(r.explain, 500) } as EstimateTask;
    case 'glitch': return { mode: 'glitch', prompt: str(r.prompt, 200), viewPrompt: str(r.viewPrompt, 120), scene: str(r.scene, 60), viewSeconds: num(r.viewSeconds), seconds: num(r.seconds), points: num(r.points), explain: str(r.explain, 500),
      ...(Array.isArray(r.zones) && r.zones.length ? { zones: r.zones.map((z: any) => ({ x: num(z?.x), y: num(z?.y), r: num(z?.r) })) } : {}) } as GlitchTask;
    case 'codebreak': return { mode: 'codebreak', prompt: str(r.prompt, 400), ...(str(r.display, 400) ? { display: str(r.display, 400) } : {}), input: r.input === 'text' ? 'text' : 'number',
      answers: strList(r.answers, 8), hints: strList(r.hints, 3, 200), seconds: num(r.seconds), points: num(r.points), explain: str(r.explain, 500) } as CodeTask;
    case 'unique': return { mode: 'unique', prompt: str(r.prompt, 300), placeholder: str(r.placeholder, 40), seconds: num(r.seconds), pointsUnique: num(r.pointsUnique), pointsShared: num(r.pointsShared), explain: str(r.explain, 500),
      valid: (Array.isArray(r.valid) ? r.valid : []).slice(0, 60).map((v: any) => ({ name: str(v?.name, 60), variants: strList(v?.variants, 12, 60) })) } as UniqueTask;
    default: return r;
  }
}

const inRange = (v: number, a: number, b: number) => Number.isFinite(v) && v >= a && v <= b;

/** Liefert verständliche Fehlertexte (leer = gültig). Erwartet ein normalisiertes Objekt. */
export function validateTask(t: TaskDef, sceneExists: (id: string) => boolean = () => true): string[] {
  const e: string[] = [];
  if (!t || !MODES.includes(t.mode)) return ['Unbekannter Spielmodus'];
  if (!t.prompt) e.push('Fragetext fehlt');
  if (!inRange(t.mode === 'unique' ? 1 : (t as any).points, 1, 1000) && t.mode !== 'unique') e.push('Punkte müssen zwischen 1 und 1000 liegen');
  if (!t.explain) e.push('Eine Lösungserklärung (für die TV-Auflösung) fehlt');
  switch (t.mode) {
    case 'geo':
      if (!['world', 'europe', 'germany'].includes(t.map)) e.push('Karte wählen (Welt, Europa oder Deutschland)');
      if (!inRange(t.answer.lat, -90, 90) || !inRange(t.answer.lon, -180, 180)) e.push('Richtige Position: Pin auf der Karte setzen');
      if (!t.answer.label) e.push('Ortsbezeichnung für die Auflösung fehlt');
      if (!inRange(t.seconds, 10, 180)) e.push('Zeitlimit 10–180 Sekunden');
      break;
    case 'rank':
      if (t.items.length !== 5 || t.items.some(i => !i.text)) e.push('Genau fünf Begriffe eintragen');
      else if (new Set(t.items.map(i => i.text.toLowerCase())).size !== 5) e.push('Begriffe müssen sich unterscheiden');
      if (!(t.order.length === 5 && [...t.order].sort().join() === '0,1,2,3,4')) e.push('Enthüllungsreihenfolge muss jeden Begriff genau einmal enthalten');
      else if (t.order.every((v, i) => v === i)) e.push('Die Enthüllungsreihenfolge darf nicht der richtigen Reihenfolge entsprechen');
      if (!t.topLabel || !t.bottomLabel) e.push('Beschriftung oben/unten fehlt (z. B. „meiste Tore“ / „wenigste Tore“)');
      if (!inRange(t.secondsPerItem, 5, 60)) e.push('Zeit pro Begriff 5–60 Sekunden');
      break;
    case 'estimate':
      if (!(Number.isFinite(t.answer) && t.answer > 0)) e.push('Richtige Zahl muss größer als 0 sein');
      if (!t.unit) e.push('Einheit fehlt (z. B. km, Jahre)');
      if (!inRange(t.seconds, 10, 180) || !inRange(t.betSeconds, 10, 120)) e.push('Zeitlimits: Schätzen 10–180 s, Einsatz 10–120 s');
      if (!(t.bets.length >= 1 && t.bets.length <= 4 && t.bets[0] === 0 && t.bets.every((b, i) => Number.isInteger(b) && b >= 0 && b <= 1000 && (i === 0 || b > t.bets[i - 1])))) e.push('Einsätze: aufsteigend, beginnen mit 0, höchstens 4 Werte (ganze Zahlen ≤ 1000)');
      break;
    case 'glitch':
      if (!sceneExists(t.scene)) e.push('Szene wählen');
      if (!t.viewPrompt) e.push('Hinweistext für die Betrachtungsphase fehlt');
      if (!inRange(t.viewSeconds, 3, 60) || !inRange(t.seconds, 10, 120)) e.push('Zeitlimits: Betrachten 3–60 s, Suchen 10–120 s');
      break;
    case 'codebreak':
      if (!t.answers.length) e.push('Mindestens eine richtige Antwort eintragen');
      if (!inRange(t.seconds, 20, 300)) e.push('Zeitlimit 20–300 Sekunden');
      break;
    case 'unique':
      if (t.valid.length < 3 || t.valid.some(v => !v.name)) e.push('Mindestens drei gültige Antworten eintragen');
      if (!inRange(t.pointsUnique, 1, 1000) || !inRange(t.pointsShared, 0, 1000)) e.push('Punkte: einzigartig 1–1000, mehrfach 0–1000');
      else if (t.pointsShared > t.pointsUnique) e.push('Mehrfach genannte Antworten dürfen nicht mehr Punkte geben als einzigartige');
      if (!inRange(t.seconds, 10, 180)) e.push('Zeitlimit 10–180 Sekunden');
      if (!t.placeholder) e.push('Platzhaltertext für das Eingabefeld fehlt');
      break;
  }
  return e;
}

export const CATEGORY_KINDS = ['tile', 'surprise', 'final'] as const;
export type CategoryKind = typeof CATEGORY_KINDS[number];
export interface CategoryData { title: string; topic: string; icon: string; color: string; kind: CategoryKind; football: boolean; blurb: string; taskIds: string[]; disabled?: boolean }
export const BUDGET: Record<CategoryKind, number> = { tile: 1000, surprise: 1000, final: 2000 };

export function normalizeCategory(raw: any): CategoryData {
  const r = raw ?? {};
  return { title: str(r.title, 40), topic: str(r.topic, 80), icon: str(r.icon, 8) || '❓', color: /^#[0-9a-fA-F]{6}$/.test(r.color ?? '') ? r.color : '#8b5cf6',
    kind: CATEGORY_KINDS.includes(r.kind) ? r.kind : 'tile', football: !!r.football, blurb: str(r.blurb, 300), taskIds: Array.isArray(r.taskIds) ? r.taskIds.map((x: unknown) => str(x, 80)).filter(Boolean).slice(0, 12) : [], disabled: !!r.disabled };
}
export function validateCategory(c: CategoryData): string[] {
  const e: string[] = [];
  if (!c.title) e.push('Titel fehlt');
  if (!c.topic) e.push('Beschreibung (Themengebiet) fehlt');
  if (!c.blurb) e.push('Regeltext für die TV-Regelkarte fehlt');
  return e;
}
