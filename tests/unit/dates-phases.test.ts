import { describe, expect, it } from 'vitest';
import { addDays, diffDays, formatDe, startOfWeek, weekday, isDateStr, localDateOf } from '@/domain/dates';
import { boundaries, daysUntil, isDeloadWeek, phaseOf, specificity } from '@/domain/phases';

const M = { start: '2026-11-02', firstFriendly: '2027-02-06', mainGoal: '2027-03-07' };

describe('Datum', () => {
  it('Wochentage der Eckdaten', () => {
    expect(weekday('2026-11-02')).toBe(1); // Montag
    expect(weekday('2027-02-06')).toBe(6); // Samstag
    expect(weekday('2027-03-07')).toBe(7); // Sonntag
  });
  it('rechnet Tage und Wochenstart', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(diffDays('2027-02-06', '2026-11-02')).toBe(96);
    expect(diffDays('2027-03-07', '2026-11-02')).toBe(125);
    expect(startOfWeek('2027-02-06')).toBe('2027-02-01');
  });
  it('validiert Daten strikt', () => {
    expect(isDateStr('2027-02-30')).toBe(false);
    expect(isDateStr('2027-02-28')).toBe(true);
    expect(isDateStr('28.02.2027')).toBe(false);
  });
  it('formatiert deutsch', () => expect(formatDe('2027-02-06', true)).toBe('Sa, 06.02.2027'));
  it('lokales Datum nach Europe/Berlin', () => expect(localDateOf('2026-11-02T23:30:00Z')).toBe('2026-11-03'));
});

describe('Phasen', () => {
  it('ordnet Phasen den Meilensteinen zu (wochenweise ab Montag)', () => {
    expect(phaseOf('2026-11-01', M)).toBe('vorher');
    expect(phaseOf('2026-11-02', M)).toBe('grundlage');
    expect(phaseOf('2026-12-06', M)).toBe('grundlage');
    expect(phaseOf('2026-12-07', M)).toBe('aufbau'); // 8 Wochen vor der Spielwoche
    expect(phaseOf('2027-01-03', M)).toBe('aufbau');
    expect(phaseOf('2027-01-04', M)).toBe('spezifisch'); // 4 Wochen vor der Spielwoche
    expect(phaseOf('2027-01-31', M)).toBe('spezifisch');
    expect(phaseOf('2027-02-01', M)).toBe('spielwoche');
    expect(phaseOf('2027-02-06', M)).toBe('spielwoche');
    expect(phaseOf('2027-02-07', M)).toBe('hauptphase');
    expect(phaseOf('2027-02-28', M)).toBe('hauptphase');
    expect(phaseOf('2027-03-01', M)).toBe('finale');
    expect(phaseOf('2027-03-07', M)).toBe('finale');
    expect(phaseOf('2027-03-08', M)).toBe('danach');
  });
  it('Schwerpunkt verschiebt sich rechtzeitig von allgemeiner Fitness zu fußballspezifisch', () => {
    const s0 = specificity('2026-11-02', M);
    const sAufbau = specificity('2026-12-07', M);
    const sSpez = specificity('2027-01-04', M);
    const sWoche = specificity('2027-02-01', M);
    expect(s0).toBeLessThan(sAufbau);
    expect(sAufbau).toBeLessThan(sSpez);
    expect(sSpez).toBeLessThan(sWoche);
    expect(s0).toBeLessThanOrEqual(0.15);
    expect(sWoche).toBeGreaterThanOrEqual(0.8);
    // Der spezifische Schwerpunkt liegt vollständig VOR dem ersten Freundschaftsspiel
    expect(specificity('2027-01-10', M)).toBeGreaterThan(0.45);
    expect(specificity('2027-01-31', M)).toBeLessThanOrEqual(0.8);
  });
  it('Spezifität ist monoton nicht fallend bis zum Spiel', () => {
    let prev = 0;
    for (let d = '2026-11-02'; d <= '2027-02-06'; d = addDays(d, 1)) {
      const s = specificity(d, M);
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = s;
    }
  });
  it('Entlastungswochen jede vierte Woche, nie in Spiel-/Finalwoche', () => {
    expect(isDeloadWeek('2026-11-02', M)).toBe(false);
    expect(isDeloadWeek('2026-11-23', M)).toBe(true); // Woche 4
    expect(isDeloadWeek('2027-01-31', M)).toBe(false);
    expect(isDeloadWeek('2027-03-01', M)).toBe(false);
  });
  it('kurze Vorlaufzeit: Phasen werden auf den Start begrenzt', () => {
    const m = { start: '2027-01-20', firstFriendly: '2027-02-06', mainGoal: '2027-03-07' };
    const b = boundaries(m);
    expect(b.aufbauStart).toBe('2027-01-20');
    expect(b.spezifischStart).toBe('2027-01-20');
    // nur 17 Tage bis zum Spiel: es wird sofort fußballspezifisch trainiert
    expect(phaseOf('2027-01-20', m)).toBe('spezifisch');
  });
  it('Countdown', () => {
    expect(daysUntil('2027-02-06', '2026-11-02')).toBe(96);
    expect(daysUntil('2027-03-07', '2026-11-02')).toBe(125);
  });
});
