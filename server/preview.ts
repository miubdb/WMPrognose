// Vorschau: spielt eine einzelne Aufgabe mit der ECHTEN Engine in einem flüchtigen Raum (nie gespeichert, nie mit echten Räumen verbunden).
import type { Avatar, TaskDef, TileDef, View } from '../shared/types';
import { clueSecs } from '../shared/scoring';
import { normalizeTask, validateTask } from '../shared/validate';
import type { Scene } from '../shared/scenes';
import { Engine } from './engine';
import { glitchZones } from './modes';

const av = (i: number): Avatar => ({ face: i % 8, skin: (i * 2) % 6, hair: (i * 3) % 9, hairColor: (i * 5) % 8, hat: i === 1 ? 4 : 0, shirt: i % 5, shirtColor: (i * 3) % 10, acc: i === 2 ? 2 : 0, bg: (i * 2) % 8 });
export const SAMPLE_NAMES = ['Anna', 'Ben', 'Cem', 'Dana'];

export const FORMULAS: Record<string, string> = {
  geo: 'Punkte nach tatsächlicher Entfernung (Großkreis, km): Maximalpunkte × e^(−(km − Treffertoleranz)/Skala); Skala Deutschland 50 km, Europa 180 km, Welt 600 km (z. B. Europa 250 Punkte: 9 km ≈ 245, 113 km ≈ 137). Gleiche Entfernung = gleiche Punkte, unabhängig von den Mitspielern. Keine Abgabe = 0.',
  rank: 'Nacheinander-Variante: Budget × richtig angeordnete Paare ÷ 10 (10 Paarvergleiche bei 5 Begriffen). Sortier-Variante (alle fünf sichtbar): Budget ÷ 5 für jeden Begriff auf der exakt richtigen Position (bei 250 Punkten: 50 je Begriff).',
  estimate: 'Beste Schätzung = volles Budget, danach nach Platz abgestuft (100/75/55/40/28/18/10 %); Rangfolge nach |ln(Tipp/Lösung)|. Einsatz: +Einsatz bei Treffer auf den besten Tipp, sonst −Einsatz (höchstens so viel, wie man besitzt).',
  glitch: 'Nur zwei Ergebnisse: Treffer (innerhalb der Objektbox plus Fingertoleranz) = volle Punkte, sonst oder keine Abgabe = 0. Keine Trostpunkte.',
  codebreak: 'Ohne Hinweis 100 %, mit 1/2/3 Hinweisen 75/50/25 %. Falsch = 0. Geschwindigkeit zählt nicht.',
  match: '50 Punkte je richtig verbundenem Paar, höchstens 300. Keine Minuspunkte, kein Zeitbonus – nur die Richtigkeit zählt. Die Zuordnung zählt, wie sie bei Ablauf der Zeit (oder bei der endgültigen Abgabe) steht.',
  link: 'Eine endgültige Antwort. Richtig nach Hinweis 1/2/3/4 = 300/225/150/75 Punkte, falsch oder keine Antwort = 0. Die Hinweisstufe bestimmt der Server beim Eingang der Antwort.',
  vote: 'KICKBASE-KONSENS: Jeder wählt geheim einen Mitspieler. Die Wahl(en) mit den meisten Stimmen erhalten Punkte – bei Gleichstand alle häufigsten Wahlen. Man darf auch sich selbst wählen.',
  unique: 'Nur eine gültige, einmalige Antwort bringt Punkte. Mehrfach genannte gültige Antworten und ungültige Antworten = 0. Bei „vollständiger Antwortliste“ wird Unbekanntes automatisch ungültig, sonst prüft der Showmaster.',
};

export interface PreviewMeta { title?: string; topic?: string; icon?: string; color?: string; blurb?: string; kind?: 'tile' | 'surprise' | 'final' }
export interface PreviewFrame { label: string; tv: View; player: View; host: View }

export function buildPreview(rawTask: unknown, scenes: Record<string, Scene>, meta: PreviewMeta = {}) {
  const task = normalizeTask(rawTask);
  const problems = validateTask(task, id => !!scenes[id]);
  if (problems.length) return { ok: false as const, problems, frames: [], scores: [], formula: FORMULAS[task.mode] ?? '' };
  const kind = meta.kind ?? 'tile';
  const tile: TileDef = { id: 'preview', title: meta.title || 'Vorschau-Kategorie', topic: meta.topic || 'Vorschau', icon: meta.icon || '👀', color: meta.color || '#8b5cf6', mode: task.mode, kind: 'tile', football: false,
    blurb: meta.blurb || 'Vorschau der Regelkarte', tasks: [task] };
  const eng = new Engine({ tiles: [tile], scenes, rules: { startCredit: 200 } });
  let now = 1_900_000_000_000;
  const { room } = eng.newRoom('PREV', now);
  const ids: string[] = [];
  SAMPLE_NAMES.forEach((n, i) => { const r = eng.join(room, n, av(i + 1), now); if (r.ok) ids.push(r.player.id); });
  const H = (a: any) => eng.act(room, { role: 'host' }, '', a, now);
  const P = (i: number, a: any) => eng.act(room, { role: 'player', pid: ids[i] }, '', a, now);
  H({ k: 'h.startShow' }); H({ k: 'h.introDone' }); H({ k: 'h.pick', tileId: 'preview' });
  const frames: PreviewFrame[] = [];
  const snap = (label: string) => {
    const mk = (role: 'tv' | 'player' | 'host') => JSON.parse(JSON.stringify(eng.buildView(room, { role, pid: ids[0] }, now))) as View;
    const f = { label, tv: mk('tv'), player: mk('player'), host: mk('host') };
    for (const v of [f.tv, f.player, f.host]) { if (v.round) v.round.kind = kind; v.room.act = kind === 'final' ? 'Akt 4 – FINAL LOCK' : kind === 'surprise' ? 'Akt 2 – Überraschungsrunde' : 'Vorschau'; }
    frames.push(f);
  };
  snap('Regelkarte');
  H({ k: 'h.begin' });
  const t = task as TaskDef;
  switch (t.mode) {
    case 'geo': {
      snap('Aufgabe läuft');
      const a = t.answer; const off = [[0.4, -0.5], [6, 5], [-25, 30]];
      off.forEach(([dla, dlo], i) => P(i, { k: 'submit', payload: { lat: Math.max(-80, Math.min(80, a.lat + dla)), lon: Math.max(-175, Math.min(175, a.lon + dlo)) } }));
      snap('Antworten abgegeben'); H({ k: 'h.lock' }); snap('Alle Tipps auf der Karte'); break;
    }
    case 'rank': {
      snap('Erster Begriff');
      const step = (fn: (i: number, item: number, k: number) => number | null) => {
        for (let k = 0; k < 5; k++) {
          const item = t.order[k];
          for (let i = 0; i < 3; i++) { const slot = fn(i, item, k); if (slot !== null) { const pm: any = room.round!.pm[ids[i]]; const free = pm ? pm.slots.map((s: number, idx: number) => (s === -1 ? idx : -1)).filter((x: number) => x >= 0) : [0, 1, 2, 3, 4]; const use = free.includes(slot) ? slot : free[0]; P(i, { k: 'submit', payload: { step: k, slot: use } }); } }
          if (k === 2) snap('Dritter Begriff');
          H({ k: 'h.lock' });
        }
      };
      // Anna perfekt (Begriff n -> Platz n), Ben vertauscht die ersten beiden, Cem umgekehrt
      step((i, item) => (i === 0 ? item : i === 1 ? (item === 0 ? 1 : item === 1 ? 0 : item) : 4 - item));
      break;
    }
    case 'estimate': {
      snap('Schätzen');
      [1.02, 0.6, 3].forEach((f, i) => P(i, { k: 'submit', payload: { value: Math.max(1, Math.round(t.answer * f * 100) / 100) } }));
      H({ k: 'h.lock' }); snap('Alle Tipps sichtbar – Einsätze');
      const bet = t.bets[1] ?? 0;
      P(0, { k: 'submit', payload: { amount: 0, target: null } }); P(1, { k: 'submit', payload: bet ? { amount: bet, target: ids[0] } : { amount: 0, target: null } }); P(2, { k: 'submit', payload: bet ? { amount: bet, target: ids[2] } : { amount: 0, target: null } });
      H({ k: 'h.lock' }); snap('Einsätze gesperrt'); break;
    }
    case 'glitch': {
      snap('Betrachtungsphase (TV zeigt Bild A)');
      H({ k: 'h.lock' }); snap('Suchphase (Bild B)');
      const z = glitchZones(t, scenes)[0];
      P(0, { k: 'submit', payload: { x: z.x, y: z.y } }); P(1, { k: 'submit', payload: { x: Math.min(990, z.x + Math.round(z.r * 1.5)), y: z.y } }); P(2, { k: 'submit', payload: { x: Math.max(10, 1000 - z.x), y: Math.max(10, 600 - z.y) } });
      H({ k: 'h.lock' }); snap('Markierungen auf dem TV'); break;
    }
    case 'codebreak': {
      snap('Aufgabe läuft');
      P(0, { k: 'submit', payload: { answer: t.answers[0] } });
      if (t.hints.length) { P(1, { k: 'hint' }); P(1, { k: 'submit', payload: { answer: t.answers[0] } }); }
      for (let i = 0; i < 3; i++) P(2, { k: 'submit', payload: { answer: 'x' + i } });
      H({ k: 'h.lock' }); snap('Gesperrt'); break;
    }
    case 'match': {
      snap('Aufgabe läuft');
      const posOf = (i: number) => t.order.indexOf(i);
      P(0, { k: 'submit', payload: { pairs: [0, 1, 2, 3, 4, 5].map(posOf), final: true } });
      P(1, { k: 'submit', payload: { pairs: [0, 1, 2, 3, 4, 5].map((i, k) => (k < 3 ? posOf(i) : posOf((i + 1) % 6))), final: true } });
      P(2, { k: 'submit', payload: { pairs: [posOf(1), posOf(0), -1, -1, -1, -1], final: false } });
      snap('Antworten abgegeben'); H({ k: 'h.lock' }); snap('Gesperrt'); break;
    }
    case 'vote': {
      snap('Aufgabe läuft');
      P(0, { k: 'submit', payload: { target: ids[1] } }); P(1, { k: 'submit', payload: { target: ids[2] } }); P(2, { k: 'submit', payload: { target: ids[1] } }); P(3, { k: 'submit', payload: { target: ids[1] } });
      snap('Stimmen abgegeben'); H({ k: 'h.lock' }); snap('Gesperrt'); break;
    }
    case 'link': {
      snap('Hinweis 1');
      P(0, { k: 'submit', payload: { answer: t.answer } });
      now += (clueSecs(t) + 1) * 1000; eng.tick(room, now); snap('Hinweis 2');
      now += (clueSecs(t) + 1) * 1000; eng.tick(room, now); snap('Hinweis 3');
      P(1, { k: 'submit', payload: { answer: t.accept[0] ?? t.answer } }); P(2, { k: 'submit', payload: { answer: 'Phantasiewort' } });
      now += (clueSecs(t) + 1) * 1000; eng.tick(room, now); snap('Hinweis 4');
      H({ k: 'h.lock' }); snap('Prüfung (Host)'); break;
    }
    case 'unique': {
      snap('Aufgabe läuft');
      const n = t.valid.map(v => v.name);
      P(0, { k: 'submit', payload: { answer: n[0] } }); P(1, { k: 'submit', payload: { answer: n[0] } }); P(2, { k: 'submit', payload: { answer: n[1] ?? n[0] } }); P(3, { k: 'submit', payload: { answer: 'Phantasiewort' } });
      H({ k: 'h.lock' }); snap('Antworten prüfen (Host)');
      for (const gr of (eng.buildView(room, { role: 'host' }, now).round?.data.groups ?? [])) if (gr.state === 'unknown') H({ k: 'h.review', groupKey: gr.key, decision: 'invalid' });   // Vorschau: Unbekanntes als ungültig werten
      break;
    }
  }
  H({ k: 'h.reveal' });
  snap('Auflösung');
  const result = room.round!.result!;
  const scores = SAMPLE_NAMES.map((name, i) => {
    const es = result.entries.filter(e => e.pid === ids[i]);
    return { name, points: es.reduce((a, e) => a + e.delta, 0), label: es.map(e => e.label).join(' + ') || 'keine Abgabe' };
  });
  return { ok: true as const, problems: [], frames, scores, formula: FORMULAS[task.mode], sampleNames: SAMPLE_NAMES };
}
