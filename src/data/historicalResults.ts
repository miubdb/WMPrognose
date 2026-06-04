export interface HistoricalMatch {
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  penaltyWinner?: 'home' | 'away'
  tournament: 'WM2022' | 'WM2018' | 'WM2014' | 'EURO2024'
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

  // ── WM 2018 (Russland) ──────────────────────────────────────────────────────

  // Gruppe A: Russia, Saudi Arabia, Egypt, Uruguay
  { homeTeam: 'Russia',       awayTeam: 'Saudi Arabia', homeGoals: 5, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'A', homeElo: 1779, awayElo: 1639 },
  { homeTeam: 'Egypt',        awayTeam: 'Uruguay',      homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'A', homeElo: 1705, awayElo: 1918 },
  { homeTeam: 'Russia',       awayTeam: 'Egypt',        homeGoals: 3, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'A', homeElo: 1779, awayElo: 1705 },
  { homeTeam: 'Uruguay',      awayTeam: 'Saudi Arabia', homeGoals: 1, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'A', homeElo: 1918, awayElo: 1639 },
  { homeTeam: 'Uruguay',      awayTeam: 'Russia',       homeGoals: 3, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'A', homeElo: 1918, awayElo: 1779, alreadyThroughHome: true, alreadyThroughAway: true },
  { homeTeam: 'Saudi Arabia', awayTeam: 'Egypt',        homeGoals: 2, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'A', homeElo: 1639, awayElo: 1705 },

  // Gruppe B: Portugal, Spain, Morocco, Iran
  { homeTeam: 'Morocco',      awayTeam: 'Iran',         homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'B', homeElo: 1756, awayElo: 1767 },
  { homeTeam: 'Portugal',     awayTeam: 'Spain',        homeGoals: 3, awayGoals: 3, tournament: 'WM2018', phase: 'group', group: 'B', homeElo: 1966, awayElo: 2015 },
  { homeTeam: 'Portugal',     awayTeam: 'Morocco',      homeGoals: 1, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'B', homeElo: 1966, awayElo: 1756 },
  { homeTeam: 'Iran',         awayTeam: 'Spain',        homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'B', homeElo: 1767, awayElo: 2015 },
  { homeTeam: 'Iran',         awayTeam: 'Portugal',     homeGoals: 1, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'B', homeElo: 1767, awayElo: 1966 },
  { homeTeam: 'Spain',        awayTeam: 'Morocco',      homeGoals: 2, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'B', homeElo: 2015, awayElo: 1756 },

  // Gruppe C: France, Australia, Peru, Denmark
  { homeTeam: 'France',       awayTeam: 'Australia',    homeGoals: 2, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'C', homeElo: 1984, awayElo: 1760 },
  { homeTeam: 'Peru',         awayTeam: 'Denmark',      homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'C', homeElo: 1854, awayElo: 1912 },
  { homeTeam: 'Denmark',      awayTeam: 'Australia',    homeGoals: 1, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'C', homeElo: 1912, awayElo: 1760 },
  { homeTeam: 'France',       awayTeam: 'Peru',         homeGoals: 1, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'C', homeElo: 1984, awayElo: 1854 },
  { homeTeam: 'Denmark',      awayTeam: 'France',       homeGoals: 0, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'C', homeElo: 1912, awayElo: 1984, alreadyThroughAway: true },
  { homeTeam: 'Australia',    awayTeam: 'Peru',         homeGoals: 0, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'C', homeElo: 1760, awayElo: 1854 },

  // Gruppe D: Argentina, Iceland, Croatia, Nigeria
  { homeTeam: 'Argentina',    awayTeam: 'Iceland',      homeGoals: 1, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'D', homeElo: 2028, awayElo: 1844 },
  { homeTeam: 'Croatia',      awayTeam: 'Nigeria',      homeGoals: 2, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'D', homeElo: 1887, awayElo: 1755 },
  { homeTeam: 'Argentina',    awayTeam: 'Croatia',      homeGoals: 0, awayGoals: 3, tournament: 'WM2018', phase: 'group', group: 'D', homeElo: 2028, awayElo: 1887 },
  { homeTeam: 'Nigeria',      awayTeam: 'Iceland',      homeGoals: 2, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'D', homeElo: 1755, awayElo: 1844 },
  { homeTeam: 'Iceland',      awayTeam: 'Croatia',      homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'D', homeElo: 1844, awayElo: 1887 },
  { homeTeam: 'Nigeria',      awayTeam: 'Argentina',    homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'D', homeElo: 1755, awayElo: 2028, mustWinAway: true },

  // Gruppe E: Brazil, Switzerland, Costa Rica, Serbia
  { homeTeam: 'Costa Rica',   awayTeam: 'Serbia',       homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'E', homeElo: 1767, awayElo: 1809 },
  { homeTeam: 'Brazil',       awayTeam: 'Switzerland',  homeGoals: 1, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'E', homeElo: 2131, awayElo: 1885 },
  { homeTeam: 'Brazil',       awayTeam: 'Costa Rica',   homeGoals: 2, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'E', homeElo: 2131, awayElo: 1767 },
  { homeTeam: 'Serbia',       awayTeam: 'Switzerland',  homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'E', homeElo: 1809, awayElo: 1885 },
  { homeTeam: 'Serbia',       awayTeam: 'Brazil',       homeGoals: 0, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'E', homeElo: 1809, awayElo: 2131 },
  { homeTeam: 'Switzerland',  awayTeam: 'Costa Rica',   homeGoals: 2, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'E', homeElo: 1885, awayElo: 1767 },

  // Gruppe F: Germany, Mexico, Sweden, South Korea
  { homeTeam: 'Germany',      awayTeam: 'Mexico',       homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'F', homeElo: 1985, awayElo: 1876 },
  { homeTeam: 'Sweden',       awayTeam: 'South Korea',  homeGoals: 1, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'F', homeElo: 1844, awayElo: 1750 },
  { homeTeam: 'South Korea',  awayTeam: 'Mexico',       homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'F', homeElo: 1750, awayElo: 1876 },
  { homeTeam: 'Germany',      awayTeam: 'Sweden',       homeGoals: 2, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'F', homeElo: 1985, awayElo: 1844, mustWinHome: true },
  { homeTeam: 'South Korea',  awayTeam: 'Germany',      homeGoals: 2, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'F', homeElo: 1750, awayElo: 1985, mustWinAway: true },
  { homeTeam: 'Mexico',       awayTeam: 'Sweden',       homeGoals: 0, awayGoals: 3, tournament: 'WM2018', phase: 'group', group: 'F', homeElo: 1876, awayElo: 1844 },

  // Gruppe G: Belgium, Panama, Tunisia, England
  { homeTeam: 'Belgium',      awayTeam: 'Panama',       homeGoals: 3, awayGoals: 0, tournament: 'WM2018', phase: 'group', group: 'G', homeElo: 1931, awayElo: 1647 },
  { homeTeam: 'Tunisia',      awayTeam: 'England',      homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'G', homeElo: 1774, awayElo: 1942 },
  { homeTeam: 'Belgium',      awayTeam: 'Tunisia',      homeGoals: 5, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'G', homeElo: 1931, awayElo: 1774 },
  { homeTeam: 'England',      awayTeam: 'Panama',       homeGoals: 6, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'G', homeElo: 1942, awayElo: 1647 },
  { homeTeam: 'England',      awayTeam: 'Belgium',      homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'G', homeElo: 1942, awayElo: 1931, alreadyThroughHome: true, alreadyThroughAway: true },
  { homeTeam: 'Panama',       awayTeam: 'Tunisia',      homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'G', homeElo: 1647, awayElo: 1774 },

  // Gruppe H: Poland, Senegal, Colombia, Japan
  { homeTeam: 'Colombia',     awayTeam: 'Japan',        homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'H', homeElo: 1908, awayElo: 1787 },
  { homeTeam: 'Poland',       awayTeam: 'Senegal',      homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'H', homeElo: 1854, awayElo: 1747 },
  { homeTeam: 'Japan',        awayTeam: 'Senegal',      homeGoals: 2, awayGoals: 2, tournament: 'WM2018', phase: 'group', group: 'H', homeElo: 1787, awayElo: 1747 },
  { homeTeam: 'Poland',       awayTeam: 'Colombia',     homeGoals: 0, awayGoals: 3, tournament: 'WM2018', phase: 'group', group: 'H', homeElo: 1854, awayElo: 1908 },
  { homeTeam: 'Japan',        awayTeam: 'Poland',       homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'H', homeElo: 1787, awayElo: 1854, alreadyThroughHome: true },
  { homeTeam: 'Senegal',      awayTeam: 'Colombia',     homeGoals: 0, awayGoals: 1, tournament: 'WM2018', phase: 'group', group: 'H', homeElo: 1747, awayElo: 1908, mustWinHome: true },

  // WM 2018 Achtelfinale
  { homeTeam: 'France',       awayTeam: 'Argentina',    homeGoals: 4, awayGoals: 3, tournament: 'WM2018', phase: 'round16', homeElo: 1984, awayElo: 2028 },
  { homeTeam: 'Uruguay',      awayTeam: 'Portugal',     homeGoals: 2, awayGoals: 1, tournament: 'WM2018', phase: 'round16', homeElo: 1918, awayElo: 1966 },
  { homeTeam: 'Russia',       awayTeam: 'Spain',        homeGoals: 1, awayGoals: 1, penaltyWinner: 'home', tournament: 'WM2018', phase: 'round16', homeElo: 1779, awayElo: 2015 },
  { homeTeam: 'Croatia',      awayTeam: 'Denmark',      homeGoals: 1, awayGoals: 1, penaltyWinner: 'home', tournament: 'WM2018', phase: 'round16', homeElo: 1887, awayElo: 1912 },
  { homeTeam: 'Brazil',       awayTeam: 'Mexico',       homeGoals: 2, awayGoals: 0, tournament: 'WM2018', phase: 'round16', homeElo: 2131, awayElo: 1876 },
  { homeTeam: 'Belgium',      awayTeam: 'Japan',        homeGoals: 3, awayGoals: 2, tournament: 'WM2018', phase: 'round16', homeElo: 1931, awayElo: 1787 },
  { homeTeam: 'Sweden',       awayTeam: 'Switzerland',  homeGoals: 1, awayGoals: 0, tournament: 'WM2018', phase: 'round16', homeElo: 1844, awayElo: 1885 },
  { homeTeam: 'Colombia',     awayTeam: 'England',      homeGoals: 1, awayGoals: 1, penaltyWinner: 'away', tournament: 'WM2018', phase: 'round16', homeElo: 1908, awayElo: 1942 },

  // WM 2018 Viertelfinale
  { homeTeam: 'Uruguay',      awayTeam: 'France',       homeGoals: 0, awayGoals: 2, tournament: 'WM2018', phase: 'quarter', homeElo: 1918, awayElo: 1984 },
  { homeTeam: 'Brazil',       awayTeam: 'Belgium',      homeGoals: 1, awayGoals: 2, tournament: 'WM2018', phase: 'quarter', homeElo: 2131, awayElo: 1931 },
  { homeTeam: 'Russia',       awayTeam: 'Croatia',      homeGoals: 2, awayGoals: 2, penaltyWinner: 'away', tournament: 'WM2018', phase: 'quarter', homeElo: 1779, awayElo: 1887 },
  { homeTeam: 'Sweden',       awayTeam: 'England',      homeGoals: 0, awayGoals: 2, tournament: 'WM2018', phase: 'quarter', homeElo: 1844, awayElo: 1942 },

  // WM 2018 Halbfinale
  { homeTeam: 'France',       awayTeam: 'Belgium',      homeGoals: 1, awayGoals: 0, tournament: 'WM2018', phase: 'semi', homeElo: 1984, awayElo: 1931 },
  { homeTeam: 'Croatia',      awayTeam: 'England',      homeGoals: 2, awayGoals: 1, tournament: 'WM2018', phase: 'semi', homeElo: 1887, awayElo: 1942 },

  // WM 2018 Spiel um Platz 3
  { homeTeam: 'Belgium',      awayTeam: 'England',      homeGoals: 2, awayGoals: 0, tournament: 'WM2018', phase: 'third', homeElo: 1931, awayElo: 1942 },

  // WM 2018 Finale
  { homeTeam: 'France',       awayTeam: 'Croatia',      homeGoals: 4, awayGoals: 2, tournament: 'WM2018', phase: 'final', homeElo: 1984, awayElo: 1887 },

  // ── WM 2014 (Brasilien) ─────────────────────────────────────────────────────

  // Gruppe A: Brazil, Croatia, Mexico, Cameroon
  { homeTeam: 'Brazil',       awayTeam: 'Croatia',      homeGoals: 3, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'A', homeElo: 2107, awayElo: 1823 },
  { homeTeam: 'Mexico',       awayTeam: 'Cameroon',     homeGoals: 1, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'A', homeElo: 1863, awayElo: 1737 },
  { homeTeam: 'Brazil',       awayTeam: 'Mexico',       homeGoals: 0, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'A', homeElo: 2107, awayElo: 1863 },
  { homeTeam: 'Cameroon',     awayTeam: 'Croatia',      homeGoals: 0, awayGoals: 4, tournament: 'WM2014', phase: 'group', group: 'A', homeElo: 1737, awayElo: 1823 },
  { homeTeam: 'Cameroon',     awayTeam: 'Brazil',       homeGoals: 1, awayGoals: 4, tournament: 'WM2014', phase: 'group', group: 'A', homeElo: 1737, awayElo: 2107, alreadyThroughAway: true },
  { homeTeam: 'Croatia',      awayTeam: 'Mexico',       homeGoals: 1, awayGoals: 3, tournament: 'WM2014', phase: 'group', group: 'A', homeElo: 1823, awayElo: 1863 },

  // Gruppe B: Spain, Netherlands, Chile, Australia
  { homeTeam: 'Spain',        awayTeam: 'Netherlands',  homeGoals: 1, awayGoals: 5, tournament: 'WM2014', phase: 'group', group: 'B', homeElo: 2089, awayElo: 1976 },
  { homeTeam: 'Chile',        awayTeam: 'Australia',    homeGoals: 3, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'B', homeElo: 1882, awayElo: 1723 },
  { homeTeam: 'Netherlands',  awayTeam: 'Australia',    homeGoals: 3, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'B', homeElo: 1976, awayElo: 1723 },
  { homeTeam: 'Spain',        awayTeam: 'Chile',        homeGoals: 0, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'B', homeElo: 2089, awayElo: 1882 },
  { homeTeam: 'Netherlands',  awayTeam: 'Chile',        homeGoals: 2, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'B', homeElo: 1976, awayElo: 1882, alreadyThroughHome: true, alreadyThroughAway: true },
  { homeTeam: 'Australia',    awayTeam: 'Spain',        homeGoals: 0, awayGoals: 3, tournament: 'WM2014', phase: 'group', group: 'B', homeElo: 1723, awayElo: 2089 },

  // Gruppe C: Colombia, Greece, Ivory Coast, Japan
  { homeTeam: 'Colombia',     awayTeam: 'Greece',       homeGoals: 3, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'C', homeElo: 1884, awayElo: 1751 },
  { homeTeam: 'Ivory Coast',  awayTeam: 'Japan',        homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'C', homeElo: 1727, awayElo: 1736 },
  { homeTeam: 'Colombia',     awayTeam: 'Ivory Coast',  homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'C', homeElo: 1884, awayElo: 1727 },
  { homeTeam: 'Japan',        awayTeam: 'Greece',       homeGoals: 0, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'C', homeElo: 1736, awayElo: 1751 },
  { homeTeam: 'Japan',        awayTeam: 'Colombia',     homeGoals: 1, awayGoals: 4, tournament: 'WM2014', phase: 'group', group: 'C', homeElo: 1736, awayElo: 1884, alreadyThroughAway: true },
  { homeTeam: 'Greece',       awayTeam: 'Ivory Coast',  homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'C', homeElo: 1751, awayElo: 1727 },

  // Gruppe D: Uruguay, Costa Rica, England, Italy
  { homeTeam: 'Uruguay',      awayTeam: 'Costa Rica',   homeGoals: 1, awayGoals: 3, tournament: 'WM2014', phase: 'group', group: 'D', homeElo: 1939, awayElo: 1745 },
  { homeTeam: 'England',      awayTeam: 'Italy',        homeGoals: 1, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'D', homeElo: 1938, awayElo: 1912 },
  { homeTeam: 'Uruguay',      awayTeam: 'England',      homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'D', homeElo: 1939, awayElo: 1938 },
  { homeTeam: 'Italy',        awayTeam: 'Costa Rica',   homeGoals: 0, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'D', homeElo: 1912, awayElo: 1745 },
  { homeTeam: 'Italy',        awayTeam: 'Uruguay',      homeGoals: 0, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'D', homeElo: 1912, awayElo: 1939 },
  { homeTeam: 'Costa Rica',   awayTeam: 'England',      homeGoals: 0, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'D', homeElo: 1745, awayElo: 1938, alreadyThroughHome: true },

  // Gruppe E: Switzerland, Ecuador, France, Honduras
  { homeTeam: 'Switzerland',  awayTeam: 'Ecuador',      homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'E', homeElo: 1869, awayElo: 1809 },
  { homeTeam: 'France',       awayTeam: 'Honduras',     homeGoals: 3, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'E', homeElo: 1955, awayElo: 1706 },
  { homeTeam: 'Switzerland',  awayTeam: 'France',       homeGoals: 2, awayGoals: 5, tournament: 'WM2014', phase: 'group', group: 'E', homeElo: 1869, awayElo: 1955 },
  { homeTeam: 'Honduras',     awayTeam: 'Ecuador',      homeGoals: 1, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'E', homeElo: 1706, awayElo: 1809 },
  { homeTeam: 'Honduras',     awayTeam: 'Switzerland',  homeGoals: 0, awayGoals: 3, tournament: 'WM2014', phase: 'group', group: 'E', homeElo: 1706, awayElo: 1869 },
  { homeTeam: 'Ecuador',      awayTeam: 'France',       homeGoals: 0, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'E', homeElo: 1809, awayElo: 1955, alreadyThroughAway: true },

  // Gruppe F: Argentina, Bosnia, Iran, Nigeria
  { homeTeam: 'Argentina',    awayTeam: 'Bosnia',       homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'F', homeElo: 2008, awayElo: 1748 },
  { homeTeam: 'Iran',         awayTeam: 'Nigeria',      homeGoals: 0, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'F', homeElo: 1745, awayElo: 1776 },
  { homeTeam: 'Argentina',    awayTeam: 'Iran',         homeGoals: 1, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'F', homeElo: 2008, awayElo: 1745 },
  { homeTeam: 'Nigeria',      awayTeam: 'Bosnia',       homeGoals: 1, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'F', homeElo: 1776, awayElo: 1748 },
  { homeTeam: 'Bosnia',       awayTeam: 'Iran',         homeGoals: 3, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'F', homeElo: 1748, awayElo: 1745 },
  { homeTeam: 'Nigeria',      awayTeam: 'Argentina',    homeGoals: 2, awayGoals: 3, tournament: 'WM2014', phase: 'group', group: 'F', homeElo: 1776, awayElo: 2008, alreadyThroughAway: true },

  // Gruppe G: Germany, Portugal, Ghana, USA
  { homeTeam: 'Germany',      awayTeam: 'Portugal',     homeGoals: 4, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'G', homeElo: 1962, awayElo: 1917 },
  { homeTeam: 'Ghana',        awayTeam: 'USA',          homeGoals: 1, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'G', homeElo: 1812, awayElo: 1812 },
  { homeTeam: 'Germany',      awayTeam: 'Ghana',        homeGoals: 2, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'G', homeElo: 1962, awayElo: 1812 },
  { homeTeam: 'USA',          awayTeam: 'Portugal',     homeGoals: 2, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'G', homeElo: 1812, awayElo: 1917 },
  { homeTeam: 'Ghana',        awayTeam: 'Portugal',     homeGoals: 1, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'G', homeElo: 1812, awayElo: 1917 },
  { homeTeam: 'USA',          awayTeam: 'Germany',      homeGoals: 0, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'G', homeElo: 1812, awayElo: 1962, alreadyThroughAway: true },

  // Gruppe H: Belgium, Algeria, Russia, South Korea
  { homeTeam: 'Belgium',      awayTeam: 'Algeria',      homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'H', homeElo: 1878, awayElo: 1726 },
  { homeTeam: 'Russia',       awayTeam: 'South Korea',  homeGoals: 1, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'H', homeElo: 1884, awayElo: 1742 },
  { homeTeam: 'Belgium',      awayTeam: 'Russia',       homeGoals: 1, awayGoals: 0, tournament: 'WM2014', phase: 'group', group: 'H', homeElo: 1878, awayElo: 1884 },
  { homeTeam: 'Algeria',      awayTeam: 'South Korea',  homeGoals: 4, awayGoals: 2, tournament: 'WM2014', phase: 'group', group: 'H', homeElo: 1726, awayElo: 1742 },
  { homeTeam: 'Algeria',      awayTeam: 'Russia',       homeGoals: 1, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'H', homeElo: 1726, awayElo: 1884 },
  { homeTeam: 'South Korea',  awayTeam: 'Belgium',      homeGoals: 0, awayGoals: 1, tournament: 'WM2014', phase: 'group', group: 'H', homeElo: 1742, awayElo: 1878, alreadyThroughAway: true },

  // WM 2014 Achtelfinale
  { homeTeam: 'Brazil',       awayTeam: 'Chile',        homeGoals: 1, awayGoals: 1, penaltyWinner: 'home', tournament: 'WM2014', phase: 'round16', homeElo: 2107, awayElo: 1882 },
  { homeTeam: 'Colombia',     awayTeam: 'Uruguay',      homeGoals: 2, awayGoals: 0, tournament: 'WM2014', phase: 'round16', homeElo: 1884, awayElo: 1939 },
  { homeTeam: 'Netherlands',  awayTeam: 'Mexico',       homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'round16', homeElo: 1976, awayElo: 1863 },
  { homeTeam: 'Costa Rica',   awayTeam: 'Greece',       homeGoals: 1, awayGoals: 1, penaltyWinner: 'home', tournament: 'WM2014', phase: 'round16', homeElo: 1745, awayElo: 1751 },
  { homeTeam: 'France',       awayTeam: 'Nigeria',      homeGoals: 2, awayGoals: 0, tournament: 'WM2014', phase: 'round16', homeElo: 1955, awayElo: 1776 },
  { homeTeam: 'Germany',      awayTeam: 'Algeria',      homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'round16', homeElo: 1962, awayElo: 1726 },
  { homeTeam: 'Argentina',    awayTeam: 'Switzerland',  homeGoals: 1, awayGoals: 0, tournament: 'WM2014', phase: 'round16', homeElo: 2008, awayElo: 1869 },
  { homeTeam: 'Belgium',      awayTeam: 'USA',          homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'round16', homeElo: 1878, awayElo: 1812 },

  // WM 2014 Viertelfinale
  { homeTeam: 'Brazil',       awayTeam: 'Colombia',     homeGoals: 2, awayGoals: 1, tournament: 'WM2014', phase: 'quarter', homeElo: 2107, awayElo: 1884 },
  { homeTeam: 'France',       awayTeam: 'Germany',      homeGoals: 0, awayGoals: 1, tournament: 'WM2014', phase: 'quarter', homeElo: 1955, awayElo: 1962 },
  { homeTeam: 'Netherlands',  awayTeam: 'Costa Rica',   homeGoals: 0, awayGoals: 0, penaltyWinner: 'home', tournament: 'WM2014', phase: 'quarter', homeElo: 1976, awayElo: 1745 },
  { homeTeam: 'Argentina',    awayTeam: 'Belgium',      homeGoals: 1, awayGoals: 0, tournament: 'WM2014', phase: 'quarter', homeElo: 2008, awayElo: 1878 },

  // WM 2014 Halbfinale
  { homeTeam: 'Brazil',       awayTeam: 'Germany',      homeGoals: 1, awayGoals: 7, tournament: 'WM2014', phase: 'semi', homeElo: 2107, awayElo: 1962 },
  { homeTeam: 'Netherlands',  awayTeam: 'Argentina',    homeGoals: 0, awayGoals: 0, penaltyWinner: 'away', tournament: 'WM2014', phase: 'semi', homeElo: 1976, awayElo: 2008 },

  // WM 2014 Spiel um Platz 3
  { homeTeam: 'Brazil',       awayTeam: 'Netherlands',  homeGoals: 0, awayGoals: 3, tournament: 'WM2014', phase: 'third', homeElo: 2107, awayElo: 1976 },

  // WM 2014 Finale
  { homeTeam: 'Germany',      awayTeam: 'Argentina',    homeGoals: 1, awayGoals: 0, tournament: 'WM2014', phase: 'final', homeElo: 1962, awayElo: 2008 },
]

// Re-export EURO 2024 separately so it can be combined as needed
export { EURO2024_MATCHES } from './historicalResultsEURO2024'

// Combined export including EURO 2024
import { EURO2024_MATCHES as _EURO2024 } from './historicalResultsEURO2024'
export const ALL_HISTORICAL_MATCHES: HistoricalMatch[] = [...HISTORICAL_MATCHES, ..._EURO2024]
