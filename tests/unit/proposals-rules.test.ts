import { describe, expect, it } from 'vitest';
import { proposalSchema, validateChanges, type PlanChange, type SessionRow } from '@/domain/proposals';
import { suggestDeload } from '@/domain/rules';

const id1 = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
const sessions: SessionRow[] = [
  { id: id1, date: '2026-11-10', type: 'rad', title: 'VO2max', duration_min: 60, intensity: 3, status: 'planned' },
  { id: id2, date: '2026-11-05', type: 'kraft', title: 'Kraft', duration_min: 50, intensity: 2, status: 'done' },
];
const ctx = { today: '2026-11-08', mainGoal: '2027-03-07', sessions };

describe('Plan-Änderungsvorschläge', () => {
  it('Schema akzeptiert gültige Änderungen', () => {
    const p = proposalSchema.parse({ summary: 'x', changes: [{ op: 'update', id: id1, patch: { intensity: 1 }, reason: 'müde' }] });
    expect(p.changes).toHaveLength(1);
  });
  it('Schema lehnt leere Patches, schlechte IDs und Fantasie-Typen ab', () => {
    expect(() => proposalSchema.parse({ summary: 'x', changes: [{ op: 'update', id: id1, patch: {}, reason: 'r' }] })).toThrow();
    expect(() => proposalSchema.parse({ summary: 'x', changes: [{ op: 'delete', id: 'abc', reason: 'r' }] })).toThrow();
    expect(() => proposalSchema.parse({ summary: 'x', changes: [{ op: 'add', session: { date: '2026-11-12', type: 'yoga', title: 't', duration_min: 30, intensity: 1 }, reason: 'r' }] })).toThrow();
    expect(() => proposalSchema.parse({ summary: 'x', changes: [] })).toThrow();
  });
  it('lehnt Änderungen an erledigten Einheiten, Vergangenheit und unbekannten IDs ab', () => {
    const changes: PlanChange[] = [
      { op: 'update', id: id2, patch: { intensity: 1 }, reason: 'r' },
      { op: 'delete', id: '33333333-3333-4333-8333-333333333333', reason: 'r' },
      { op: 'add', session: { date: '2026-11-01', type: 'rad', title: 't', duration_min: 30, intensity: 1 }, reason: 'r' },
      { op: 'add', session: { date: '2027-04-01', type: 'rad', title: 't', duration_min: 30, intensity: 1 }, reason: 'r' },
    ];
    expect(validateChanges(changes, ctx)).toHaveLength(5);
  });
  it('akzeptiert gültige Änderungen', () => {
    expect(validateChanges([{ op: 'update', id: id1, patch: { date: '2026-11-12' }, reason: 'r' }], ctx)).toEqual([]);
  });
  it('verbietet doppelte Änderung derselben Einheit', () => {
    const c: PlanChange = { op: 'update', id: id1, patch: { intensity: 1 }, reason: 'r' };
    expect(validateChanges([c, c], ctx).join()).toMatch(/mehrfach/);
  });
});

describe('Regelvorschlag Entlastung', () => {
  const low = (d: string) => ({ date: d, result: { score: 30, level: 'rot' as const, usedFactors: [], missing: [] } });
  it('schlägt bei zwei schlechten Check-ins Herabstufung der nächsten harten Einheit vor', () => {
    const p = suggestDeload({ today: '2026-11-08', recentReadiness: [low('2026-11-06'), low('2026-11-07')], tsb: 0, upcoming: [{ ...sessions[0], date: '2026-11-09' }] });
    expect(p?.changes[0]).toMatchObject({ op: 'update', id: id1 });
    expect(p?.rationale).toMatch(/Tagesform/);
  });
  it('kein Vorschlag bei guter Form', () => {
    const good = { date: '2026-11-07', result: { score: 80, level: 'gruen' as const, usedFactors: [], missing: [] } };
    expect(suggestDeload({ today: '2026-11-08', recentReadiness: [good, good], tsb: 5, upcoming: [{ ...sessions[0], date: '2026-11-09' }] })).toBeNull();
  });
  it('TSB < −30 löst Vorschlag aus', () => {
    expect(suggestDeload({ today: '2026-11-08', recentReadiness: [], tsb: -35, upcoming: [{ ...sessions[0], date: '2026-11-09' }] })).not.toBeNull();
  });
  it('kein Vorschlag, wenn keine harte Einheit ansteht', () => {
    expect(suggestDeload({ today: '2026-11-08', recentReadiness: [], tsb: -35, upcoming: [{ ...sessions[0], date: '2026-11-20' }] })).toBeNull();
  });
});
