// Deterministischer Trainingsplan-Generator (regelbasiert, keine KI).
// Berücksichtigt: Phasen bis zum ersten Freundschaftsspiel / Hauptziel, Verfügbarkeit, Mannschaftstraining,
// Spieltage (Vor-/Nachbelastung), Entlastungswochen und FTP-basierte Wattbereiche.
import { addDays, eachDay, startOfWeek, weekday, type DateStr } from './dates';
import { isDeloadWeek, phaseOf, PHASES, type Milestones, type PhaseKey } from './phases';
import { wattsRange } from './cycling';

export type PlanType = 'rad' | 'kraft' | 'lauf' | 'fussball' | 'torwart' | 'mannschaft' | 'mobilitaet' | 'test' | 'spiel' | 'ruhe';

export const SPECIFIC_TYPES: PlanType[] = ['fussball', 'torwart', 'mannschaft', 'spiel'];

export interface PlannedSession {
  date: DateStr;
  type: PlanType;
  title: string;
  duration_min: number;
  intensity: 1 | 2 | 3;
  description: string;
  details: Record<string, unknown>;
  phase: PhaseKey;
  source: 'generator';
}

export interface AvailabilityDay { weekday: number; available_minutes: number; team_training: boolean; team_training_minutes: number }

export interface PlannerInput {
  milestones: Milestones;
  ftp: number;
  availability: AvailabilityDay[];
  exceptions: { date: DateStr; available_minutes: number }[];
  /** Spieltage (Freundschaftsspiel, Hauptziel, Spiele) */
  matchDates: { date: DateStr; title: string; main?: boolean }[];
  /** bereits belegte Zeit durch Einheiten, die erhalten bleiben (manuell/erledigt) */
  occupied?: { date: DateStr; minutes: number; intensity?: number }[];
  from: DateStr;
  to: DateStr;
}

export interface Unplaced { weekStart: DateStr; title: string; reason: string }
export interface PlannerResult { sessions: PlannedSession[]; unplaced: Unplaced[] }

interface Spec {
  key: string;
  type: PlanType;
  title: string;
  minutes: number;
  minMinutes: number;
  intensity: 1 | 2 | 3;
  core: boolean;
  build: (minutes: number, ftp: number) => { description: string; details: Record<string, unknown> };
}

// ---------- Baustein-Bibliothek ----------
const ex = (description: string, exercises: string[]) => ({ description, details: { exercises } });

function rad(title: string, intensity: 1 | 2 | 3, key: string, minutes: number, min: number, core: boolean, plan: (m: number, ftp: number) => { text: string; blocks: { label: string; minutes: number; pct: [number, number] }[] }): Spec {
  return {
    key, type: 'rad', title, minutes, minMinutes: min, intensity, core,
    build: (m, ftp) => {
      const p = plan(m, ftp);
      const blocks = p.blocks.map((b) => ({ label: b.label, minutes: b.minutes, watts: wattsRange(ftp, b.pct[0], b.pct[1]) }));
      return { description: `${p.text} (FTP ${ftp} W)`, details: { ftp, blocks } };
    },
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

const radZ2 = (key: string, minutes: number, min: number, core: boolean) =>
  rad('Grundlagenausdauer Rad', 1, key, minutes, min, core, (m) => ({
    text: `Locker und gleichmäßig im Z2-Bereich (56–75 % FTP), Kadenz 85–95, Nasenatmung möglich.`,
    blocks: [{ label: 'Z2 durchgehend', minutes: m, pct: [56, 75] }],
  }));

const radSweetspot = rad('Sweetspot-Intervalle Rad', 2, 'rad_ss', 75, 50, true, (m) => {
  const reps = clamp(Math.floor((m - 20) / 17), 2, 4);
  return {
    text: `${reps} × 12 min Sweetspot (88–94 % FTP), dazwischen 5 min locker.`,
    blocks: [
      { label: 'Einfahren', minutes: 10, pct: [50, 70] },
      ...Array.from({ length: reps }, (_, i) => [{ label: `Intervall ${i + 1}`, minutes: 12, pct: [88, 94] as [number, number] }, { label: 'Pause', minutes: 5, pct: [40, 55] as [number, number] }]).flat(),
      { label: 'Ausfahren', minutes: Math.max(5, m - 10 - reps * 17), pct: [40, 60] },
    ],
  };
});

const radThreshold = rad('Schwellen-Intervalle Rad', 3, 'rad_thr', 70, 55, true, (m) => {
  const reps = clamp(Math.floor((m - 20) / 22), 2, 3);
  return {
    text: `${reps} × 15 min Schwelle (95–105 % FTP), dazwischen 7 min locker.`,
    blocks: [
      { label: 'Einfahren', minutes: 12, pct: [50, 70] },
      ...Array.from({ length: reps }, (_, i) => [{ label: `Intervall ${i + 1}`, minutes: 15, pct: [95, 105] as [number, number] }, { label: 'Pause', minutes: 7, pct: [40, 55] as [number, number] }]).flat(),
      { label: 'Ausfahren', minutes: 8, pct: [40, 60] },
    ],
  };
});

const radVo2 = rad('VO2max-Intervalle Rad', 3, 'rad_vo2', 60, 45, true, (m) => {
  const reps = clamp(Math.floor((m - 20) / 6), 4, 6);
  return {
    text: `${reps} × 3 min VO2max (108–120 % FTP), dazwischen 3 min locker – trainiert die Fähigkeit zu wiederholten intensiven Läufen.`,
    blocks: [
      { label: 'Einfahren', minutes: 12, pct: [50, 70] },
      ...Array.from({ length: reps }, (_, i) => [{ label: `Intervall ${i + 1}`, minutes: 3, pct: [108, 120] as [number, number] }, { label: 'Pause', minutes: 3, pct: [40, 55] as [number, number] }]).flat(),
      { label: 'Ausfahren', minutes: 8, pct: [40, 60] },
    ],
  };
});

const radOpener = rad('Rad-Aktivierung', 2, 'rad_open', 45, 30, true, () => ({
  text: '3 × 1 min knackig (110 % FTP), dazwischen 3 min locker – kurzer Aktivierungsreiz vor dem Spiel.',
  blocks: [
    { label: 'Einfahren', minutes: 15, pct: [50, 70] },
    ...Array.from({ length: 3 }, (_, i) => [{ label: `Antritt ${i + 1}`, minutes: 1, pct: [108, 115] as [number, number] }, { label: 'Pause', minutes: 3, pct: [40, 55] as [number, number] }]).flat(),
    { label: 'Ausfahren', minutes: 10, pct: [40, 60] },
  ],
}));

const radRecovery = rad('Lockeres Ausrollen Rad', 1, 'rad_rec', 40, 25, false, (m) => ({
  text: 'Sehr locker (unter 55 % FTP) – fördert die Durchblutung, kein Trainingsreiz.',
  blocks: [{ label: 'Z1 durchgehend', minutes: m, pct: [40, 55] }],
}));

const ftpTest: Spec = {
  key: 'ftp_test', type: 'test', title: 'FTP-Test (20 min)', minutes: 60, minMinutes: 55, intensity: 3, core: true,
  build: (m, ftp) => ({
    description: `20-Minuten-Test: 15 min einfahren, 3 min Z5-Aktivierung, 5 min locker, 5 min Maximalbelastung (nicht eintragen), 10 min locker, dann 20 min so hart wie gleichmäßig möglich. FTP = Mittelwert × 0,95. Aktuelle FTP: ${ftp} W.`,
    details: { ftp, protocol: '20min', formula: 'FTP = 0,95 × Mittelwert der 20 min' },
  }),
};

const kraftGrund: Spec = {
  key: 'kraft_grund', type: 'kraft', title: 'Kraft Ganzkörper (Grundlagen)', minutes: 50, minMinutes: 35, intensity: 2, core: true,
  build: () => ex('3 × 8–12 Wdh. mit kontrollierter Technik, 1–2 Wiederholungen in Reserve. Fokus auf Beine, Rücken, Rumpf und Hüftstabilität.', ['Kniebeuge (Goblet/Front)', 'Rumänisches Kreuzheben', 'Ausfallschritte', 'Rudern', 'Drücken (Bank/Schulter)', 'Plank-Varianten', 'Hüftheben']),
};
const kraftMax: Spec = {
  key: 'kraft_max', type: 'kraft', title: 'Maximalkraft Beine/Rumpf', minutes: 55, minMinutes: 40, intensity: 3, core: true,
  build: () => ex('4–5 Sätze × 3–6 Wdh. bei hohem Gewicht, 2–3 min Pause, saubere Technik vor Last.', ['Kniebeuge', 'Trap-Bar/Kreuzheben', 'Bulgarian Split Squat', 'Klimmzug/Latzug', 'Pallof Press', 'Nordic Curl (Einstieg)']),
};
const kraftPower: Spec = {
  key: 'kraft_power', type: 'kraft', title: 'Explosivkraft & Plyometrie', minutes: 45, minMinutes: 35, intensity: 3, core: true,
  build: () => ex('Wenige, explosive Wiederholungen (3–5), volle Pausen. Landetechnik zuerst, Umfang gering halten.', ['Trap-Bar-Kreuzheben (leicht, schnell)', 'Kettlebell Swing', 'Box Jump / Tiefsprung-Einstieg', 'Medizinball-Würfe', 'Seitliche Sprünge', 'Einbeinige Landungen']),
};
const kraftLight: Spec = {
  key: 'kraft_light', type: 'kraft', title: 'Kraft-Aktivierung (leicht)', minutes: 30, minMinutes: 20, intensity: 1, core: false,
  build: () => ex('2 × 5–8 Wdh. mit leichtem Gewicht, nur aktivieren – keine Ermüdung vor dem Spiel.', ['Kniebeuge leicht', 'Hüftheben', 'Rumpf-Stabilität', 'Sprünge niedrig']),
};

const laufEinstieg: Spec = {
  key: 'lauf_ein', type: 'lauf', title: 'Lauf-Geh-Intervalle (gelenkschonend)', minutes: 30, minMinutes: 20, intensity: 1, core: false,
  build: () => ex('Wechsel aus 2 min locker laufen und 1 min gehen, Umfang über die Wochen steigern. Weiche Untergründe bevorzugen; bei höherem Körpergewicht Belastung langsam aufbauen.', ['Einlaufen 5 min gehen', '6–8 × (2 min laufen / 1 min gehen)', 'Auslaufen 5 min']),
};
const laufTempo: Spec = {
  key: 'lauf_tempo', type: 'lauf', title: 'Tempodauerlauf', minutes: 40, minMinutes: 30, intensity: 2, core: true,
  build: () => ex('3 × 8 min zügig (Gespräch nur in kurzen Sätzen), 3 min Trabpause.', ['Einlaufen 10 min', '3 × 8 min Tempo', 'Auslaufen 5 min']),
};

const fussballBeschl: Spec = {
  key: 'fb_beschl', type: 'fussball', title: 'Beschleunigung & Lauftechnik', minutes: 35, minMinutes: 25, intensity: 2, core: true,
  build: () => ex('Kurze Antritte 10–20 m mit vollständiger Pause, Fokus auf Lauftechnik und Aufrichten.', ['Lauf-ABC 10 min', '6 × 15 m Antritt (60 s Pause)', 'Skipping/Anfersen', 'Kurze Richtungswechsel']),
};
const fussballSprint: Spec = {
  key: 'fb_sprint', type: 'fussball', title: 'Sprint & Antritt', minutes: 45, minMinutes: 30, intensity: 3, core: true,
  build: () => ex('Maximale Sprints mit vollständiger Erholung (Qualität vor Quantität).', ['Aufwärmen mit Lauf-ABC 12 min', '6–8 × 20–30 m Sprint (90 s Pause)', '4 × 10 m Reaktions-Antritt', 'Auslaufen']),
};
const fussballAgility: Spec = {
  key: 'fb_agility', type: 'fussball', title: 'Agilität & Richtungswechsel', minutes: 45, minMinutes: 30, intensity: 2, core: true,
  build: () => ex('Schnelle Fußarbeit und Richtungswechsel, kontrollierte Bremsmechanik.', ['Koordinationsleiter', '5-10-5-Shuttle × 4', 'T-Test × 3', 'Reaktionsstarts auf Signal', 'Seitschritt-Antritte']),
};
const fussballRSA: Spec = {
  key: 'fb_rsa', type: 'fussball', title: 'Wiederholte Sprints (RSA)', minutes: 40, minMinutes: 30, intensity: 3, core: false,
  build: () => ex('2 Serien à 6 × 30 m Sprint mit 20 s aktiver Pause, 4 min Pause zwischen den Serien.', ['Aufwärmen 12 min', '2 × (6 × 30 m / 20 s Pause)', 'Auslaufen 5 min']),
};
const fussballAktivierung: Spec = {
  key: 'fb_akt', type: 'fussball', title: 'Aktivierung & Antritte (kurz)', minutes: 30, minMinutes: 20, intensity: 1, core: false,
  build: () => ex('Kurze Antritte und Fußarbeit bei niedrigem Umfang – spritzig, aber nicht müde.', ['Lauf-ABC', '4 × 10–15 m Antritt', 'Koordination 5 min']),
};

const torwartTechnik: Spec = {
  key: 'tw_technik', type: 'torwart', title: 'Torwart: Technik & Fußarbeit', minutes: 50, minMinutes: 35, intensity: 2, core: true,
  build: () => ex('Grundtechniken sauber wiederholen: Fangen, Fußarbeit, Stellungsspiel, Spieleröffnung. Eigene Übungen aus der Torwart-Bibliothek einplanen.', ['Fußarbeit-Parcours', 'Fangen: Flachschüsse/Halbhohe Bälle', 'Stellungsspiel (Winkel verkürzen)', 'Abwurf/Abschlag-Serien']),
};
const torwartReaktion: Spec = {
  key: 'tw_reaktion', type: 'torwart', title: 'Torwart: Reaktion & Sprungkraft', minutes: 50, minMinutes: 35, intensity: 2, core: true,
  build: () => ex('Reaktionsschnelle Paraden und explosive Seitwärts-/Hechtbewegungen bei sauberer Landung.', ['Reaktionsbälle (Tennisball/Wand)', 'Nahdistanz-Schüsse', 'Hechtsprünge (weicher Untergrund)', 'Aufstehen & Folgeparade']),
};
const torwartFlanken: Spec = {
  key: 'tw_flanken', type: 'torwart', title: 'Torwart: Flanken & 1-gegen-1', minutes: 50, minMinutes: 35, intensity: 2, core: true,
  build: () => ex('Strafraumbeherrschung: Flanken abfangen/fausten, 1-gegen-1-Situationen, Antizipation.', ['Flanken von beiden Seiten', 'Abfangen im Gedränge (Partner/Hindernis)', '1-gegen-1 Ausgangsposition', 'Rückpass & Spieleröffnung']),
};
const torwartAktivierung: Spec = {
  key: 'tw_akt', type: 'torwart', title: 'Torwart: Aktivierung vor dem Spiel', minutes: 40, minMinutes: 25, intensity: 1, core: true,
  build: () => ex('Kurz, schnell, mit hoher Qualität – Hände und Fußarbeit aktivieren, keine neue Belastung.', ['Handling-Serien', 'Fußarbeit kurz', 'Wenige Flanken', 'Abschlag/Abwurf']),
};

const mobilitaet: Spec = {
  key: 'mob', type: 'mobilitaet', title: 'Mobilität & Regeneration', minutes: 25, minMinutes: 15, intensity: 1, core: false,
  build: () => ex('Sanfte Mobilisation von Hüfte, Sprunggelenken, Brustwirbelsäule; Faszienrolle, Atemübungen.', ['Hüftöffner', 'Wadendehnung/Sprunggelenk', 'Thorakale Rotation', 'Faszienrolle Beine']),
};

// ---------- Wochenvorlagen je Phase ----------
function weekSpecs(phase: PhaseKey, weekIdx: number): Spec[] {
  switch (phase) {
    case 'grundlage': {
      const specs: Spec[] = [radZ2('rad_z2_long', 90, 60, true), kraftGrund, radZ2('rad_z2_b', 60, 40, true), { ...kraftGrund, key: 'kraft_grund_b', minutes: 45 }];
      if (weekIdx >= 2) specs.push(torwartTechnik);
      if (weekIdx >= 3) specs.push(laufEinstieg);
      if (weekIdx >= 6) specs.push(fussballBeschl);
      specs.push(mobilitaet);
      return specs;
    }
    case 'aufbau':
      return [radSweetspot, kraftMax, torwartTechnik, laufTempo, fussballBeschl, radZ2('rad_z2_a', 75, 45, true), { ...kraftMax, key: 'kraft_max_b', minutes: 50, intensity: 2, title: 'Maximalkraft (Erhaltung)' }, torwartReaktion, mobilitaet];
    case 'spezifisch':
    case 'hauptphase':
      return [fussballSprint, torwartReaktion, radVo2, kraftPower, fussballAgility, torwartFlanken, fussballRSA, radZ2('rad_z2_s', 60, 40, false), mobilitaet];
    case 'spielwoche':
    case 'finale':
      return [torwartAktivierung, radOpener, kraftLight, fussballAktivierung, mobilitaet];
    default:
      return [];
  }
}

const FTP_TEST_WEEKS = new Set([5, 10]);

// ---------- Planer ----------
export function generatePlan(input: PlannerInput): PlannerResult {
  const { milestones: m } = input;
  const sessions: PlannedSession[] = [];
  const unplaced: Unplaced[] = [];
  const avail = new Map(input.availability.map((a) => [a.weekday, a]));
  const exc = new Map(input.exceptions.map((e) => [e.date, e.available_minutes]));
  const matchSet = new Map(input.matchDates.map((x) => [x.date, x]));
  const occupied = new Map<DateStr, { minutes: number; intensity: number }>();
  for (const o of input.occupied ?? []) {
    const cur = occupied.get(o.date) ?? { minutes: 0, intensity: 0 };
    occupied.set(o.date, { minutes: cur.minutes + o.minutes, intensity: Math.max(cur.intensity, o.intensity ?? 1) });
  }

  const intensityByDate = new Map<DateStr, number>(); // wochenübergreifend (Sonntag → Montag)
  const firstWeek = startOfWeek(input.from);
  const lastWeek = startOfWeek(input.to);
  for (let ws = firstWeek; ws <= lastWeek; ws = addDays(ws, 7)) {
    const days = eachDay(ws, addDays(ws, 6));
    const weekIdx = Math.round((new Date(ws).getTime() - new Date(startOfWeek(m.start)).getTime()) / (7 * 86400_000));
    const inRange = (d: DateStr) => d >= input.from && d <= input.to && d >= m.start && d <= m.mainGoal;
    const phaseFor = (d: DateStr) => phaseOf(d, m);
    const planDays = days.filter(inRange);
    if (planDays.length === 0) continue;
    // Phasen sind wochenweise definiert: Phase des Montags (bzw. des Starttags)
    const weekPhase = phaseFor(ws < m.start ? m.start : ws);
    const deload = isDeloadWeek(planDays[0], m);

    const cap = new Map<DateStr, number>();
    const maxInt = new Map<DateStr, number>();
    const dayInt = intensityByDate;
    const dayCount = new Map<DateStr, number>();
    for (const d of days) {
      const a = avail.get(weekday(d));
      const base = exc.has(d) ? exc.get(d)! : a?.available_minutes ?? 0;
      cap.set(d, Math.max(0, base - (occupied.get(d)?.minutes ?? 0)));
      maxInt.set(d, matchSet.has(d) ? 0 : matchSet.has(addDays(d, 1)) || matchSet.has(addDays(d, -1)) ? 1 : matchSet.has(addDays(d, 2)) ? 2 : 3);
      if (!dayInt.has(d)) dayInt.set(d, occupied.get(d)?.intensity ?? 0);
      dayCount.set(d, occupied.get(d) ? 1 : 0);
    }
    for (const d of days) if (matchSet.has(d)) cap.set(d, 0);
    const emit = (s: Omit<PlannedSession, 'source' | 'phase'> & { phase?: PhaseKey }) => sessions.push({ ...s, phase: s.phase ?? weekPhase, source: 'generator' });

    for (const d of planDays) {
      const match = matchSet.get(d);
      if (match) {
        emit({ date: d, type: 'spiel', title: match.title, duration_min: 90, intensity: 3, description: match.main ? 'Hauptziel der Vorbereitung.' : 'Spiel – Belastung bewusst steuern, Einheiten davor und danach sind angepasst.', details: { fixed: true }, phase: phaseFor(d) });
        dayInt.set(d, 3);
        dayCount.set(d, 1);
        continue;
      }
      const a = avail.get(weekday(d));
      if (a?.team_training && a.team_training_minutes > 0 && !occupied.has(d)) {
        const lim = maxInt.get(d)!;
        if (lim >= 1) {
          const inten = Math.min(2, lim) as 1 | 2;
          emit({ date: d, type: 'mannschaft', title: 'Mannschaftstraining', duration_min: a.team_training_minutes, intensity: inten, description: 'Fester Termin laut Verfügbarkeit.', details: { fixed: true }, phase: phaseFor(d) });
          dayInt.set(d, Math.max(dayInt.get(d)!, inten));
          dayCount.set(d, dayCount.get(d)! + 1);
        }
      }
    }

    // Wochenvorlage
    let specs = weekSpecs(weekPhase, weekIdx).map((s) => ({ ...s }));
    if (FTP_TEST_WEEKS.has(weekIdx) && !deload && ['grundlage', 'aufbau', 'spezifisch'].includes(weekPhase)) {
      const i = specs.findIndex((s) => s.type === 'rad' && s.intensity >= 2);
      if (i >= 0) specs.splice(i, 1, ftpTest);
      else specs.unshift(ftpTest);
    }
    if (deload) {
      specs = specs.filter((s) => s.core).map((s) => ({ ...s, minutes: Math.round(s.minutes * 0.7), minMinutes: Math.min(s.minMinutes, Math.round(s.minutes * 0.7)), intensity: Math.min(s.intensity, 2) as 1 | 2 | 3, title: `${s.title} (Entlastung)` }));
    }
    // Finalwoche/Spielwoche: nach einem Spiel in der Woche zusätzlich lockeres Ausrollen anbieten
    const placed: { date: DateStr; type: PlanType }[] = [];
    for (const spec of specs) {
      let best: { d: DateStr; score: number } | null = null;
      for (const d of planDays) {
        if (matchSet.has(d)) continue;
        const room = cap.get(d)!;
        if (room < spec.minMinutes) continue;
        if (maxInt.get(d)! < spec.intensity) continue;
        const isLight = spec.type === 'mobilitaet';
        if (!isLight && (dayCount.get(d)! >= 2 || (dayInt.get(d)! >= 2 && spec.intensity >= 2))) continue;
        if (!isLight && dayInt.get(d)! >= 3) continue;
        if (spec.intensity === 3 && (dayInt.get(addDays(d, -1)) === 3 || dayInt.get(addDays(d, 1)) === 3 || matchSet.has(addDays(d, -1)) || matchSet.has(addDays(d, 1)))) continue;
        let score = Math.min(room, spec.minutes) / 10;
        const sameDays = placed.filter((p) => p.type === spec.type).map((p) => Math.abs((new Date(p.date).getTime() - new Date(d).getTime()) / 86400_000));
        score += (sameDays.length ? Math.min(...sameDays) : 4) * 10;
        score -= dayCount.get(d)! * 20;
        if (spec.intensity >= 2 && ((dayInt.get(addDays(d, -1)) ?? 0) >= 2 || (dayInt.get(addDays(d, 1)) ?? 0) >= 2)) score -= 8;
        if (!best || score > best.score) best = { d, score };
      }
      if (!best) {
        unplaced.push({ weekStart: ws, title: spec.title, reason: 'Nicht genug Verfügbarkeit bzw. Belastungsregeln (Spieltag/harte Einheiten) lassen keinen Termin zu.' });
        continue;
      }
      const room = cap.get(best.d)!;
      const minutes = Math.min(spec.minutes, room);
      const built = spec.build(minutes, input.ftp);
      emit({ date: best.d, type: spec.type, title: spec.title, duration_min: minutes, intensity: spec.intensity, description: built.description, details: { ...built.details, key: spec.key, phaseLabel: PHASES[weekPhase].label, deload }, phase: phaseFor(best.d) });
      cap.set(best.d, room - minutes);
      dayInt.set(best.d, Math.max(dayInt.get(best.d)!, spec.intensity));
      dayCount.set(best.d, dayCount.get(best.d)! + 1);
      placed.push({ date: best.d, type: spec.type });
    }
    // Zusatz: Tag nach dem Spiel – lockeres Ausrollen, falls Zeit vorhanden und noch frei
    for (const d of planDays) {
      if (!matchSet.has(addDays(d, -1)) || dayCount.get(d)! > 0 || matchSet.has(d)) continue;
      if (cap.get(d)! >= radRecovery.minMinutes) {
        const minutes = Math.min(radRecovery.minutes, cap.get(d)!);
        const b = radRecovery.build(minutes, input.ftp);
        emit({ date: d, type: 'rad', title: 'Regeneration nach dem Spiel (Ausrollen)', duration_min: minutes, intensity: 1, description: b.description, details: { ...b.details, key: radRecovery.key }, phase: phaseFor(d) });
        cap.set(d, cap.get(d)! - minutes);
      }
    }
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
  return { sessions, unplaced };
}

/** Anteil fußballspezifischer Minuten (fussball, torwart, mannschaft, spiel) an den geplanten Minuten – ohne Spieltage. */
export function specificShare(sessions: { type: string; duration_min: number }[]): number {
  const rel = sessions.filter((s) => s.type !== 'spiel');
  const total = rel.reduce((a, s) => a + s.duration_min, 0);
  if (total === 0) return 0;
  const spec = rel.filter((s) => (SPECIFIC_TYPES as string[]).includes(s.type)).reduce((a, s) => a + s.duration_min, 0);
  return Math.round((spec / total) * 1000) / 1000;
}
