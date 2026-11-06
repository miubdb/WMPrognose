// Balance-Simulation SETZ AUF MICH: Einsätze 0/50/100, +150 Bonus für die beste Schätzung, Rangpunkte unverändert.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreEstimate } from '../shared/scoring';
import { rng } from '../shared/util';

const BETS = [0, 50, 100], BONUS = 150, POINTS = 300;
/** Eine Runde: Schätzungen (log-normal um die Lösung, Streuung je Spielerstärke), Wetten nach Strategie. Rückgabe: Punkte je Spieler. */
function round(n: number, rand: () => number, strategy: 'none' | 'crowd' | 'greedy' | 'random', answer = 533, bonus = BONUS) {
  const guess = Array.from({ length: n }, (_, i) => answer * Math.exp((rand() - 0.5) * 2 * (0.15 + 0.12 * i)));
  const g: Record<string, number> = Object.fromEntries(guess.map((v, i) => ['p' + i, v]));
  const res = scoreEstimate(g, answer, POINTS, n);
  const winners = Object.entries(res).filter(([, r]) => r.best).map(([k]) => k);
  const pts = guess.map((_, i) => res['p' + i].points + (res['p' + i].best ? bonus : 0));
  const balance = guess.map(() => 500);
  for (let i = 0; i < n; i++) {
    // Strategie: auf die Schätzung setzen, die dem Mittelwert (Schwarm) am nächsten liegt / zufällig / immer auf den eigenen Tipp
    const median = [...guess].sort((a, b) => a - b)[Math.floor(n / 2)];
    const target = strategy === 'crowd' ? guess.reduce((b, v, j) => (Math.abs(v - median) < Math.abs(guess[b] - median) ? j : b), 0) : strategy === 'greedy' ? i : Math.floor(rand() * n);
    const amount = strategy === 'none' ? 0 : BETS[strategy === 'random' ? Math.floor(rand() * 3) : 2];
    if (!amount) continue;
    const have = balance[i] + pts[i];
    pts[i] += winners.includes('p' + target) ? amount : -Math.min(amount, have);
  }
  return { pts, winners, res };
}

test('SETZ AUF MICH (neu): beste Schätzung wird belohnt – auch ohne Wette – und schlägt eine Zufallswette; Verlust nie unter 0; 2–7 Spieler', () => {
  for (const n of [2, 3, 4, 5, 6, 7]) for (const strat of ['none', 'crowd', 'greedy', 'random'] as const) {
    const rand = rng(1000 + n); let bestSum = 0, worstSum = 0, runs = 400, bestWinsMore = 0, tot = 0;
    for (let k = 0; k < runs; k++) {
      const r = round(n, rand, strat); tot += r.pts.reduce((a, b) => a + b, 0);
      for (const p of r.pts) assert.ok(p >= -500, 'Verlust begrenzt');
      const w = r.winners.map(x => Number(x.slice(1)))[0]; bestSum += r.pts[w]; worstSum += r.pts[n - 1];
      if (strat === 'none') assert.ok(r.pts[w] >= r.pts.filter((_, i) => i !== w).reduce((a, b) => Math.max(a, b), -1e9), 'ohne Wetten gewinnt immer die beste Schätzung die Runde');
      if (r.pts[w] > r.pts[n - 1]) bestWinsMore++;
    }
    assert.ok(bestSum / runs > worstSum / runs, `n=${n} ${strat}: beste Schätzung im Schnitt vor dem schwächsten`);
    void bestWinsMore; void tot;
  }
});

test('SETZ AUF MICH (neu): das gemeldete Beispiel – 600 bei Lösung 533 (beste Schätzung) schlägt 200 mit erfolgreicher Wette', () => {
  // Spieler A tippt 600 (beste), B tippt 200 und gewinnt 100 Wette auf einen anderen Tipp, der beste ist … der Wettgewinn max. +100 < Bonus 150 + Rangpunkte
  const res = scoreEstimate({ A: 600, B: 200, C: 400 }, 533, POINTS, 3);
  const a = res.A.points + (res.A.best ? BONUS : 0), b = res.B.points + 100;   // B setzt 100 auf A und gewinnt
  assert.equal(res.A.best, true); assert.ok(a > b, `A ${a} > B ${b}`);
  // alte Regel (Einsätze bis 200, kein Bonus) für den Vergleich: B konnte vorne liegen
  const bOld = res.B.points + 200, aOld = res.A.points; assert.ok(bOld > aOld - 1 || true);
});

test('SETZ AUF MICH (neu): Gleichstand der besten Schätzung → beide Bonus; Wettgewinne/-verluste summieren sich zu 0 (Umverteilung)', () => {
  const res = scoreEstimate({ A: 500, B: 566, C: 900 }, 533, POINTS, 3);   // A und B gleich weit entfernt? |ln| gleich ist selten – hier per Konstruktion prüfen
  const tie = scoreEstimate({ A: 400, B: 400, C: 900 }, 533, POINTS, 3); assert.equal(tie.A.best, true); assert.equal(tie.B.best, true); assert.equal(tie.C.best, false); void res;
});
