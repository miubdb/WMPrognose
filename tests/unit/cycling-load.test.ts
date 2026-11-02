import { describe, expect, it } from 'vitest';
import { ftpFromTest, ftpOn, normalizedPower, powerZones, tss, wattsPerKg } from '@/domain/cycling';
import { dailyTss, exerciseKcal, pmc, tssFromRpe, weeklySummary } from '@/domain/load';

describe('Radsport', () => {
  it('Zonen bei FTP 236 W', () => {
    const z = powerZones(236);
    expect(z[0]).toMatchObject({ low: 0, high: 130 });
    expect(z[1]).toMatchObject({ low: 132, high: 177 });
    expect(z[3]).toMatchObject({ low: 215, high: 248 });
    expect(z[6].high).toBeNull();
  });
  it('NP bei konstanter Leistung = Durchschnitt', () => {
    expect(normalizedPower(Array(600).fill(200))).toBe(200);
  });
  it('NP ist bei variabler Leistung höher als der Durchschnitt', () => {
    const w = Array.from({ length: 1200 }, (_, i) => (Math.floor(i / 60) % 2 === 0 ? 100 : 300));
    const avg = w.reduce((a, b) => a + b, 0) / w.length;
    expect(normalizedPower(w)!).toBeGreaterThan(avg);
  });
  it('NP liefert null bei < 30 s', () => expect(normalizedPower(Array(20).fill(200))).toBeNull());
  it('TSS: 1 h bei FTP = 100', () => expect(tss(3600, 236, 236)).toBe(100));
  it('TSS: 2 h bei 70 % FTP ≈ 98', () => expect(tss(7200, 165.2, 236)).toBeCloseTo(98, 0));
  it('FTP aus Test', () => {
    expect(ftpFromTest('20min', 250)).toBe(238);
    expect(ftpFromTest('ramp', 320)).toBe(240);
  });
  it('FTP zum Datum', () => {
    const tests = [{ date: '2026-11-02', ftp_w: 236 }, { date: '2026-12-14', ftp_w: 248 }];
    expect(ftpOn('2026-11-30', tests, 200)).toBe(236);
    expect(ftpOn('2026-12-14', tests, 200)).toBe(248);
    expect(ftpOn('2026-10-01', tests, 200)).toBe(200);
  });
  it('W/kg', () => expect(wattsPerKg(236, 91.45)).toBe(2.58));
});

describe('Belastung', () => {
  it('TSS aus RPE ist monoton und plausibel', () => {
    expect(tssFromRpe(60, 5)).toBeCloseTo(56.3, 1);
    expect(tssFromRpe(60, 8)).toBeGreaterThan(tssFromRpe(60, 5));
    expect(() => tssFromRpe(60, 0)).toThrow();
  });
  it('PMC: konstanter Tages-TSS konvergiert, CTL träger als ATL', () => {
    const m = new Map<string, number>();
    for (let i = 0; i < 120; i++) m.set(`2027-01-${String((i % 28) + 1).padStart(2, '0')}`, 0);
    const daily = new Map<string, number>();
    const days: string[] = [];
    for (let d = new Date('2026-11-02T00:00:00Z'); d <= new Date('2027-02-28T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      const s = d.toISOString().slice(0, 10); days.push(s); daily.set(s, 60);
    }
    const out = pmc(daily, days[0], days[days.length - 1]);
    const last = out[out.length - 1];
    expect(last.atl).toBeCloseTo(60, 0);
    expect(last.ctl).toBeGreaterThan(55);
    expect(out[10].ctl).toBeLessThan(out[10].atl); // CTL steigt langsamer
    expect(out[0].tsb).toBeLessThan(0);
  });
  it('PMC: Erholung erhöht TSB', () => {
    const daily = new Map([['2027-01-01', 100], ['2027-01-02', 100], ['2027-01-03', 100]]);
    const p = pmc(daily, '2027-01-01', '2027-01-14');
    expect(p[13].tsb).toBeGreaterThan(p[2].tsb);
  });
  it('dailyTss ignoriert Einheiten ohne TSS und summiert', () => {
    const m = dailyTss([{ date: 'a', tss: 50 }, { date: 'a', tss: 20 }, { date: 'b', tss: null }]);
    expect(m.get('a')).toBe(70);
    expect(m.has('b')).toBe(false);
  });
  it('Wochenübersicht', () => {
    const s = weeklySummary([{ date: '2026-11-02', duration_min: 60, tss: 50 }, { date: '2026-11-09', duration_min: 30, tss: null }], ['2026-11-02', '2026-11-09']);
    expect(s).toEqual([{ weekStart: '2026-11-02', sessions: 1, minutes: 60, tss: 50 }, { weekStart: '2026-11-09', sessions: 1, minutes: 30, tss: 0 }]);
  });
  it('Trainingskalorien: gemessen > Leistung > MET', () => {
    expect(exerciseKcal({ type: 'rad', duration_min: 60, kcal: 700 }, 90)).toBe(700);
    expect(exerciseKcal({ type: 'rad', duration_min: 60, avg_power_w: 200 }, 90)).toBe(720);
    expect(exerciseKcal({ type: 'lauf', duration_min: 30 }, 90)).toBe(Math.round(8.8 * 90 * 0.5));
  });
});
