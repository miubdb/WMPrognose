export interface HistoricalMatch {
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  penaltyWinner?: 'home' | 'away'
  tournament: 'WM2022' | 'WM2018'
  phase: 'group' | 'round16' | 'quarter' | 'semi' | 'final' | 'third'
  group?: string      // 'A'..'H' for group phase
  homeElo?: number    // historical ELO at tournament start
  awayElo?: number
  // Motivation / Rotation context (only set for known cases)
  alreadyThroughHome?: boolean  // home team already qualified → resting key players
  alreadyThroughAway?: boolean  // away team already qualified → resting key players
  mustWinHome?: boolean          // home team must win to advance
  mustWinAway?: boolean          // away team must win to advance
}

export const HISTORICAL_MATCHES: HistoricalMatch[] = [
  // WM 2022 Gruppenphase — alle 48 Spiele
  // Gruppe A: Qatar, Ecuador, Senegal, Netherlands
  { homeTeam: 'Qatar',       awayTeam: 'Ecuador',     homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'A', homeElo: 1649, awayElo: 1826 },
  { homeTeam: 'Senegal',     awayTeam: 'Netherlands', homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'A', homeElo: 1806, awayElo: 1956 },
  { homeTeam: 'Qatar',       awayTeam: 'Senegal',     homeGoals: 1, awayGoals: 3, tournament: 'WM2022', phase: 'group', group: 'A', homeElo: 1649, awayElo: 1806 },
  { homeTeam: 'Netherlands', awayTeam: 'Ecuador',     homeGoals: 1, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'A', homeElo: 1956, awayElo: 1826 },
  { homeTeam: 'Ecuador',     awayTeam: 'Senegal',     homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'A', homeElo: 1826, awayElo: 1806 },
  { homeTeam: 'Netherlands', awayTeam: 'Qatar',       homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'A', homeElo: 1956, awayElo: 1649 },
  // Gruppe B: England, Iran, USA, Wales
  { homeTeam: 'England',     awayTeam: 'Iran',        homeGoals: 6, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'B', homeElo: 1972, awayElo: 1785 },
  { homeTeam: 'USA',         awayTeam: 'Wales',       homeGoals: 1, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'B', homeElo: 1869, awayElo: 1825 },
  { homeTeam: 'Wales',       awayTeam: 'Iran',        homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'B', homeElo: 1825, awayElo: 1785 },
  { homeTeam: 'England',     awayTeam: 'USA',         homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'B', homeElo: 1972, awayElo: 1869 },
  { homeTeam: 'Wales',       awayTeam: 'England',     homeGoals: 0, awayGoals: 3, tournament: 'WM2022', phase: 'group', group: 'B', homeElo: 1825, awayElo: 1972 },
  { homeTeam: 'Iran',        awayTeam: 'USA',         homeGoals: 0, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'B', homeElo: 1785, awayElo: 1869 },
  // Gruppe C: Argentina, Saudi Arabia, Mexico, Poland
  { homeTeam: 'Argentina',   awayTeam: 'Saudi Arabia', homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'C', homeElo: 1973, awayElo: 1638 },
  { homeTeam: 'Mexico',      awayTeam: 'Poland',       homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'C', homeElo: 1861, awayElo: 1833 },
  { homeTeam: 'Poland',      awayTeam: 'Saudi Arabia', homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'C', homeElo: 1833, awayElo: 1638 },
  { homeTeam: 'Argentina',   awayTeam: 'Mexico',      homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'C', homeElo: 1973, awayElo: 1861 },
  { homeTeam: 'Poland',      awayTeam: 'Argentina',   homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'C', homeElo: 1833, awayElo: 1973 },
  { homeTeam: 'Saudi Arabia', awayTeam: 'Mexico',     homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'C', homeElo: 1638, awayElo: 1861 },
  // Gruppe D: Denmark, Tunisia, France, Australia
  { homeTeam: 'Denmark',     awayTeam: 'Tunisia',     homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'D', homeElo: 1943, awayElo: 1815 },
  { homeTeam: 'France',      awayTeam: 'Australia',   homeGoals: 4, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'D', homeElo: 2003, awayElo: 1769 },
  { homeTeam: 'Tunisia',     awayTeam: 'Australia',   homeGoals: 0, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'D', homeElo: 1815, awayElo: 1769 },
  { homeTeam: 'France',      awayTeam: 'Denmark',     homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'D', homeElo: 2003, awayElo: 1943 },
  { homeTeam: 'Australia',   awayTeam: 'Denmark',     homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'D', homeElo: 1769, awayElo: 1943 },
  { homeTeam: 'Tunisia',     awayTeam: 'France',      homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'D', homeElo: 1815, awayElo: 2003, alreadyThroughAway: true },
  // Gruppe E: Spain, Germany, Japan, Costa Rica
  { homeTeam: 'Spain',       awayTeam: 'Costa Rica',  homeGoals: 7, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'E', homeElo: 1964, awayElo: 1712 },
  { homeTeam: 'Germany',     awayTeam: 'Japan',       homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'E', homeElo: 1955, awayElo: 1820 },
  { homeTeam: 'Japan',       awayTeam: 'Costa Rica',  homeGoals: 0, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'E', homeElo: 1820, awayElo: 1712 },
  { homeTeam: 'Spain',       awayTeam: 'Germany',     homeGoals: 1, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'E', homeElo: 1964, awayElo: 1955 },
  { homeTeam: 'Japan',       awayTeam: 'Spain',       homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'E', homeElo: 1820, awayElo: 1964 },
  { homeTeam: 'Costa Rica',  awayTeam: 'Germany',     homeGoals: 2, awayGoals: 4, tournament: 'WM2022', phase: 'group', group: 'E', homeElo: 1712, awayElo: 1955 },
  // Gruppe F: Morocco, Croatia, Belgium, Canada
  { homeTeam: 'Morocco',     awayTeam: 'Croatia',     homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'F', homeElo: 1823, awayElo: 1941 },
  { homeTeam: 'Belgium',     awayTeam: 'Canada',      homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'F', homeElo: 1998, awayElo: 1849 },
  { homeTeam: 'Belgium',     awayTeam: 'Morocco',     homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'F', homeElo: 1998, awayElo: 1823 },
  { homeTeam: 'Croatia',     awayTeam: 'Canada',      homeGoals: 4, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'F', homeElo: 1941, awayElo: 1849 },
  { homeTeam: 'Croatia',     awayTeam: 'Belgium',     homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'F', homeElo: 1941, awayElo: 1998 },
  { homeTeam: 'Canada',      awayTeam: 'Morocco',     homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'F', homeElo: 1849, awayElo: 1823 },
  // Gruppe G: Switzerland, Cameroon, Brazil, Serbia
  { homeTeam: 'Switzerland', awayTeam: 'Cameroon',    homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'G', homeElo: 1895, awayElo: 1700 },
  { homeTeam: 'Brazil',      awayTeam: 'Serbia',      homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'G', homeElo: 2162, awayElo: 1857 },
  { homeTeam: 'Cameroon',    awayTeam: 'Serbia',      homeGoals: 3, awayGoals: 3, tournament: 'WM2022', phase: 'group', group: 'G', homeElo: 1700, awayElo: 1857 },
  { homeTeam: 'Brazil',      awayTeam: 'Switzerland', homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'G', homeElo: 2162, awayElo: 1895 },
  { homeTeam: 'Cameroon',    awayTeam: 'Brazil',      homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'G', homeElo: 1700, awayElo: 2162, alreadyThroughAway: true },
  { homeTeam: 'Serbia',      awayTeam: 'Switzerland', homeGoals: 2, awayGoals: 3, tournament: 'WM2022', phase: 'group', group: 'G', homeElo: 1857, awayElo: 1895 },
  // Gruppe H: Uruguay, South Korea, Portugal, Ghana
  { homeTeam: 'Uruguay',     awayTeam: 'South Korea', homeGoals: 0, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'H', homeElo: 1934, awayElo: 1729 },
  { homeTeam: 'Portugal',    awayTeam: 'Ghana',       homeGoals: 3, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'H', homeElo: 1961, awayElo: 1771 },
  { homeTeam: 'South Korea', awayTeam: 'Ghana',       homeGoals: 2, awayGoals: 3, tournament: 'WM2022', phase: 'group', group: 'H', homeElo: 1729, awayElo: 1771 },
  { homeTeam: 'Portugal',    awayTeam: 'Uruguay',     homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'group', group: 'H', homeElo: 1961, awayElo: 1934 },
  { homeTeam: 'South Korea', awayTeam: 'Portugal',    homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'group', group: 'H', homeElo: 1729, awayElo: 1961 },
  { homeTeam: 'Ghana',       awayTeam: 'Uruguay',     homeGoals: 0, awayGoals: 2, tournament: 'WM2022', phase: 'group', group: 'H', homeElo: 1771, awayElo: 1934 },

  // WM 2022 Achtelfinale (R16)
  { homeTeam: 'Netherlands', awayTeam: 'USA',         homeGoals: 3, awayGoals: 1, tournament: 'WM2022', phase: 'round16', homeElo: 1956, awayElo: 1869 },
  { homeTeam: 'Argentina',   awayTeam: 'Australia',   homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'round16', homeElo: 1973, awayElo: 1769 },
  { homeTeam: 'France',      awayTeam: 'Poland',      homeGoals: 3, awayGoals: 1, tournament: 'WM2022', phase: 'round16', homeElo: 2003, awayElo: 1833 },
  { homeTeam: 'England',     awayTeam: 'Senegal',     homeGoals: 3, awayGoals: 0, tournament: 'WM2022', phase: 'round16', homeElo: 1972, awayElo: 1806 },
  { homeTeam: 'Japan',       awayTeam: 'Croatia',     homeGoals: 1, awayGoals: 1, penaltyWinner: 'away', tournament: 'WM2022', phase: 'round16', homeElo: 1820, awayElo: 1941 },
  { homeTeam: 'Brazil',      awayTeam: 'South Korea', homeGoals: 4, awayGoals: 1, tournament: 'WM2022', phase: 'round16', homeElo: 2162, awayElo: 1729 },
  { homeTeam: 'Morocco',     awayTeam: 'Spain',       homeGoals: 0, awayGoals: 0, penaltyWinner: 'home', tournament: 'WM2022', phase: 'round16', homeElo: 1823, awayElo: 1964 },
  { homeTeam: 'Portugal',    awayTeam: 'Switzerland', homeGoals: 6, awayGoals: 1, tournament: 'WM2022', phase: 'round16', homeElo: 1961, awayElo: 1895 },

  // WM 2022 Viertelfinale (QF)
  { homeTeam: 'Croatia',     awayTeam: 'Brazil',      homeGoals: 1, awayGoals: 1, penaltyWinner: 'home', tournament: 'WM2022', phase: 'quarter', homeElo: 1941, awayElo: 2162 },
  { homeTeam: 'Netherlands', awayTeam: 'Argentina',   homeGoals: 2, awayGoals: 2, penaltyWinner: 'away', tournament: 'WM2022', phase: 'quarter', homeElo: 1956, awayElo: 1973 },
  { homeTeam: 'Morocco',     awayTeam: 'Portugal',    homeGoals: 1, awayGoals: 0, tournament: 'WM2022', phase: 'quarter', homeElo: 1823, awayElo: 1961 },
  { homeTeam: 'England',     awayTeam: 'France',      homeGoals: 1, awayGoals: 2, tournament: 'WM2022', phase: 'quarter', homeElo: 1972, awayElo: 2003 },

  // WM 2022 Halbfinale (SF)
  { homeTeam: 'Argentina',   awayTeam: 'Croatia',     homeGoals: 3, awayGoals: 0, tournament: 'WM2022', phase: 'semi', homeElo: 1973, awayElo: 1941 },
  { homeTeam: 'France',      awayTeam: 'Morocco',     homeGoals: 2, awayGoals: 0, tournament: 'WM2022', phase: 'semi', homeElo: 2003, awayElo: 1823 },

  // WM 2022 Spiel um Platz 3
  { homeTeam: 'Croatia',     awayTeam: 'Morocco',     homeGoals: 2, awayGoals: 1, tournament: 'WM2022', phase: 'third', homeElo: 1941, awayElo: 1823 },

  // WM 2022 Finale
  { homeTeam: 'Argentina',   awayTeam: 'France',      homeGoals: 3, awayGoals: 3, penaltyWinner: 'home', tournament: 'WM2022', phase: 'final', homeElo: 1973, awayElo: 2003 },
]
