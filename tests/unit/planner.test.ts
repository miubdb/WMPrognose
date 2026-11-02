import { describe, expect, it } from 'vitest';
import { generatePlan, specificShare, type PlannerInput } from '@/domain/planner';
import { addDays, eachDay, weekday } from '@/domain/dates';

const M = { start: '2026-11-02', firstFriendly: '2027-02-06', mainGoal: '2027-03-07' };
const avail = [1, 2, 3, 4, 5, 6, 7].map((w) => ({ weekday: w, available_minutes: [60, 75, 0, 90, 45, 120, 90][w - 1], team_training: w === 3, team_training_minutes: w === 3 ? 90 : 0 }));

const base = (over: Partial<PlannerInput> = {}): PlannerInput => ({
  milestones: M, ftp: 236, availability: avail, exceptions: [],
  matchDates: [{ date: M.firstFriendly, title: 'Erstes Freundschaftsspiel' }, { date: M.mainGoal, title: 'Hauptziel', main: true }],
  from: M.start, to: M.mainGoal, ...over,
});

describe('Planer', () => {
  const { sessions, unplaced } = generatePlan(base());
  const weekShare = (from: string, to: string) => specificShare(sessions.filter((s) => s.date >= from && s.date <= to));

  it('erzeugt Einheiten nur innerhalb des Zeitraums', () => {
    expect(sessions.length).toBeGreaterThan(60);
    expect(sessions[0].date >= M.start).toBe(true);
    expect(sessions.every((s) => s.date <= M.mainGoal)).toBe(true);
  });

  it('plant beide Spieltage fest ein', () => {
    expect(sessions.filter((s) => s.type === 'spiel').map((s) => s.date)).toEqual([M.firstFriendly, M.mainGoal]);
  });

  it('überschreitet nie die verfügbaren Minuten (ohne Mannschaftstraining/Spiele)', () => {
    for (const d of eachDay(M.start, M.mainGoal)) {
      const own = sessions.filter((s) => s.date === d && s.type !== 'mannschaft' && s.type !== 'spiel');
      const cap = avail[weekday(d) - 1].available_minutes;
      expect(own.reduce((a, s) => a + s.duration_min, 0)).toBeLessThanOrEqual(cap);
    }
  });

  it('plant nichts an Tagen ohne Verfügbarkeit (außer Mannschaftstraining/Spiel)', () => {
    const wed = sessions.filter((s) => weekday(s.date) === 3 && s.type !== 'mannschaft' && s.type !== 'spiel');
    expect(wed).toEqual([]);
  });

  it('Mannschaftstraining wird an markierten Tagen eingeplant', () => {
    const team = sessions.filter((s) => s.type === 'mannschaft');
    expect(team.length).toBeGreaterThan(10);
    expect(team.every((s) => weekday(s.date) === 3 && s.duration_min === 90)).toBe(true);
  });

  it('keine harten Einheiten am Tag vor/nach einem Spiel und höchstens Intensität 2 zwei Tage vorher', () => {
    for (const match of [M.firstFriendly, M.mainGoal]) {
      for (const [off, max] of [[-1, 1], [-2, 2], [1, 1]] as const) {
        const d = addDays(match, off);
        for (const s of sessions.filter((x) => x.date === d)) expect(s.intensity, `${d} ${s.title}`).toBeLessThanOrEqual(max);
      }
    }
  });

  it('keine zwei Intensität-3-Einheiten an aufeinanderfolgenden Tagen', () => {
    const hard = new Set(sessions.filter((s) => s.intensity === 3 && s.type !== 'spiel').map((s) => s.date));
    for (const d of hard) expect(hard.has(addDays(d, 1))).toBe(false);
  });

  it('Schwerpunkt verschiebt sich: spezifischer Anteil steigt Phase für Phase', () => {
    const grund = weekShare('2026-11-02', '2026-12-06');
    const aufbau = weekShare('2026-12-07', '2027-01-03');
    const spez = weekShare('2027-01-04', '2027-01-31');
    expect(grund).toBeLessThan(aufbau);
    expect(aufbau).toBeLessThan(spez);
    expect(spez).toBeGreaterThan(0.5);
    expect(grund).toBeLessThan(0.35);
  });

  it('Rad-Wattbereiche basieren auf der FTP', () => {
    const z2 = sessions.find((s) => s.type === 'rad' && s.details.key === 'rad_z2_long')!;
    const blocks = z2.details.blocks as { watts: [number, number] }[];
    expect(blocks[0].watts).toEqual([132, 177]);
    const higher = generatePlan(base({ ftp: 300 })).sessions.find((s) => s.details.key === 'rad_z2_long')!;
    expect((higher.details.blocks as { watts: [number, number] }[])[0].watts).toEqual([168, 225]);
  });

  it('FTP-Tests sind in Woche 6 und 11 eingeplant', () => {
    const tests = sessions.filter((s) => s.type === 'test').map((s) => s.date);
    expect(tests.length).toBe(2);
    expect(tests[0] >= '2026-12-07' && tests[0] <= '2026-12-13').toBe(true);
    expect(tests[1] >= '2027-01-11' && tests[1] <= '2027-01-17').toBe(true);
  });

  it('Entlastungswoche hat weniger Minuten', () => {
    const wk = (from: string) => sessions.filter((s) => s.date >= from && s.date <= addDays(from, 6) && s.type !== 'mannschaft').reduce((a, s) => a + s.duration_min, 0);
    expect(wk('2026-11-23')).toBeLessThan(wk('2026-11-16'));
  });

  it('Spielwoche: reduzierter Umfang gegenüber der Vorwoche', () => {
    const wk = (from: string) => sessions.filter((s) => s.date >= from && s.date <= addDays(from, 6) && s.type !== 'spiel').reduce((a, s) => a + s.duration_min, 0);
    expect(wk('2027-02-01')).toBeLessThan(wk('2027-01-25'));
  });

  it('meldet nicht platzierbare Einheiten statt sie zu verschweigen', () => {
    const r = generatePlan(base({ availability: avail.map((a) => ({ ...a, available_minutes: a.weekday === 6 ? 40 : 0 })) }));
    expect(r.unplaced.length).toBeGreaterThan(0);
    expect(r.unplaced[0].reason).toMatch(/Verfügbarkeit/);
  });

  it('Ausnahmen (z. B. Urlaub) setzen die Verfügbarkeit des Tages', () => {
    const r = generatePlan(base({ exceptions: [{ date: '2026-11-07', available_minutes: 0 }] }));
    expect(r.sessions.filter((s) => s.date === '2026-11-07' && s.type !== 'mannschaft')).toEqual([]);
  });

  it('berücksichtigt belegte Zeit erhaltener Einheiten', () => {
    const r = generatePlan(base({ occupied: [{ date: '2026-11-07', minutes: 120 }], from: '2026-11-02', to: '2026-11-08' }));
    expect(r.sessions.filter((s) => s.date === '2026-11-07' && s.type !== 'mannschaft')).toEqual([]);
  });

  it('ist deterministisch', () => {
    expect(generatePlan(base()).sessions).toEqual(sessions);
  });

  it('Teilzeitraum ab heute plant nicht in der Vergangenheit', () => {
    const r = generatePlan(base({ from: '2026-11-04', to: '2026-11-15' }));
    expect(r.sessions.every((s) => s.date >= '2026-11-04' && s.date <= '2026-11-15')).toBe(true);
  });
  void unplaced;
});
