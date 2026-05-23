export interface HistoricalMatch {
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  tournament: 'WM2022' | 'WM2018'
  phase: 'group' | 'round16' | 'quarter' | 'semi' | 'final'
}

export const HISTORICAL_MATCHES: HistoricalMatch[] = [
  // WM 2022 Gruppenphase — alle 48 Spiele
  // Gruppe A
  { homeTeam: 'Qatar', awayTeam: 'Ecuador', homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Senegal', awayTeam: 'Netherlands', homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Qatar', awayTeam: 'Senegal', homeGoals: 1, awayGoals: 3, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Netherlands', awayTeam: 'Ecuador', homeGoals: 1, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Ecuador', awayTeam: 'Senegal', homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Netherlands', awayTeam: 'Qatar', homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  // Gruppe B
  { homeTeam: 'England', awayTeam: 'Iran', homeGoals: 6, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'USA', awayTeam: 'Wales', homeGoals: 1, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Wales', awayTeam: 'Iran', homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'England', awayTeam: 'USA', homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Wales', awayTeam: 'England', homeGoals: 0, awayGoals: 3, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Iran', awayTeam: 'USA', homeGoals: 0, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  // Gruppe C
  { homeTeam: 'Argentina', awayTeam: 'Saudi Arabia', homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Mexico', awayTeam: 'Poland', homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Poland', awayTeam: 'Saudi Arabia', homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Argentina', awayTeam: 'Mexico', homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Poland', awayTeam: 'Argentina', homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Saudi Arabia', awayTeam: 'Mexico', homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  // Gruppe D
  { homeTeam: 'Denmark', awayTeam: 'Tunisia', homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'France', awayTeam: 'Australia', homeGoals: 4, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Tunisia', awayTeam: 'Australia', homeGoals: 0, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'France', awayTeam: 'Denmark', homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Australia', awayTeam: 'Denmark', homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Tunisia', awayTeam: 'France', homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  // Gruppe E
  { homeTeam: 'Spain', awayTeam: 'Costa Rica', homeGoals: 7, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Germany', awayTeam: 'Japan', homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Japan', awayTeam: 'Costa Rica', homeGoals: 0, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Spain', awayTeam: 'Germany', homeGoals: 1, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Japan', awayTeam: 'Spain', homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Costa Rica', awayTeam: 'Germany', homeGoals: 2, awayGoals: 4, tournament: 'WM2022', phase: 'group' },
  // Gruppe F
  { homeTeam: 'Morocco', awayTeam: 'Croatia', homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Belgium', awayTeam: 'Canada', homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Belgium', awayTeam: 'Morocco', homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Croatia', awayTeam: 'Canada', homeGoals: 4, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Croatia', awayTeam: 'Belgium', homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Canada', awayTeam: 'Morocco', homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  // Gruppe G
  { homeTeam: 'Switzerland', awayTeam: 'Cameroon', homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Brazil', awayTeam: 'Serbia', homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Cameroon', awayTeam: 'Serbia', homeGoals: 3, awayGoals: 3, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Brazil', awayTeam: 'Switzerland', homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Cameroon', awayTeam: 'Brazil', homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Serbia', awayTeam: 'Switzerland', homeGoals: 2, awayGoals: 3, tournament: 'WM2022', phase: 'group' },
  // Gruppe H
  { homeTeam: 'Uruguay', awayTeam: 'South Korea', homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Portugal', awayTeam: 'Ghana', homeGoals: 3, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'South Korea', awayTeam: 'Ghana', homeGoals: 2, awayGoals: 3, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Portugal', awayTeam: 'Uruguay', homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'South Korea', awayTeam: 'Portugal', homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'group' },
  { homeTeam: 'Ghana', awayTeam: 'Uruguay', homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group' },
]
