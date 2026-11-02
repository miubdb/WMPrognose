export interface MatchStatsRow {
  date: string; goals_for: number; goals_against: number; minutes_played: number; shots_faced: number; saves: number;
  crosses_claimed: number; crosses_faced: number; passes_completed: number; passes_attempted: number; errors_leading_to_goal: number; rating: number | null;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const r2 = (x: number) => Math.round(x * 100) / 100;

export function matchTotals(rows: MatchStatsRow[]) {
  const sum = (k: keyof MatchStatsRow) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const minutes = sum('minutes_played');
  const rated = rows.filter((r) => r.rating != null);
  return {
    matches: rows.length,
    minutes,
    goalsAgainst: sum('goals_against'),
    goalsAgainstPer90: minutes > 0 ? r2((sum('goals_against') / minutes) * 90) : null,
    cleanSheets: rows.filter((r) => r.goals_against === 0 && r.minutes_played >= 45).length,
    savePct: pct(sum('saves'), sum('shots_faced')),
    crossClaimPct: pct(sum('crosses_claimed'), sum('crosses_faced')),
    passPct: pct(sum('passes_completed'), sum('passes_attempted')),
    errorsLeadingToGoal: sum('errors_leading_to_goal'),
    avgRating: rated.length ? r2(rated.reduce((a, r) => a + (r.rating as number), 0) / rated.length) : null,
    wins: rows.filter((r) => r.goals_for > r.goals_against).length,
    draws: rows.filter((r) => r.goals_for === r.goals_against).length,
    losses: rows.filter((r) => r.goals_for < r.goals_against).length,
  };
}
