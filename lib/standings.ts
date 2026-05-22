import { GROUP_SCHEDULE } from '@/src/data/schedule'

export interface TeamStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number       // goals for
  ga: number       // goals against
  gd: number       // goal difference
  pts: number
  qualified: boolean     // top 2
  thirdCanQualify: boolean  // could be best 3rd
  eliminated: boolean
}

export interface GroupStandings {
  [group: string]: TeamStanding[]
}

export function computeGroupStandings(
  results: Record<string, { goals_a: number; goals_b: number }>
): GroupStandings {
  const standings: GroupStandings = {}

  // Initialize all teams
  for (const match of GROUP_SCHEDULE) {
    const g = match.group
    if (!g) continue
    if (!standings[g]) standings[g] = []
    const initTeam = (id: string) => {
      if (!standings[g].find((t: TeamStanding) => t.teamId === id)) {
        standings[g].push({ teamId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0, qualified: false, thirdCanQualify: false, eliminated: false })
      }
    }
    initTeam(match.teamAId)
    initTeam(match.teamBId)
  }

  // Apply results
  for (const match of GROUP_SCHEDULE) {
    const r = results[match.id]
    if (!r) continue
    const g = match.group
    if (!g) continue
    const tA = standings[g].find((t: TeamStanding) => t.teamId === match.teamAId)!
    const tB = standings[g].find((t: TeamStanding) => t.teamId === match.teamBId)!
    tA.played++; tB.played++
    tA.gf += r.goals_a; tA.ga += r.goals_b; tA.gd = tA.gf - tA.ga
    tB.gf += r.goals_b; tB.ga += r.goals_a; tB.gd = tB.gf - tB.ga
    if (r.goals_a > r.goals_b) { tA.won++; tA.pts += 3; tB.lost++ }
    else if (r.goals_a < r.goals_b) { tB.won++; tB.pts += 3; tA.lost++ }
    else { tA.drawn++; tB.drawn++; tA.pts++; tB.pts++ }
  }

  // Sort each group using official FIFA tiebreaker order:
  // 1. Points  2. Overall GD  3. Overall GF
  // 4. H2H Points  5. H2H GD  6. H2H GF  7. Lots
  for (const g of Object.keys(standings)) {
    standings[g].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      if (b.gf !== a.gf) return b.gf - a.gf

      // Head-to-head among tied teams
      const aTeam = a.teamId
      const bTeam = b.teamId
      let h2hPtsA = 0, h2hPtsB = 0, h2hGdA = 0, h2hGfA = 0, h2hGfB = 0
      for (const m of GROUP_SCHEDULE) {
        if (m.group !== g) continue
        const r = results[m.id]
        if (!r) continue
        if (m.teamAId === aTeam && m.teamBId === bTeam) {
          if (r.goals_a > r.goals_b) h2hPtsA += 3
          else if (r.goals_a < r.goals_b) h2hPtsB += 3
          else { h2hPtsA++; h2hPtsB++ }
          h2hGdA += r.goals_a - r.goals_b
          h2hGfA += r.goals_a; h2hGfB += r.goals_b
        } else if (m.teamAId === bTeam && m.teamBId === aTeam) {
          if (r.goals_a > r.goals_b) h2hPtsB += 3
          else if (r.goals_a < r.goals_b) h2hPtsA += 3
          else { h2hPtsA++; h2hPtsB++ }
          h2hGdA += r.goals_b - r.goals_a
          h2hGfA += r.goals_b; h2hGfB += r.goals_a
        }
      }
      if (h2hPtsB !== h2hPtsA) return h2hPtsB - h2hPtsA
      if (h2hGdA !== 0) return h2hGdA > 0 ? -1 : 1
      if (h2hGfA !== h2hGfB) return h2hGfB - h2hGfA
      return 0 // drawing of lots — maintain stable order
    })
    // Mark qualified / eliminated (simplified — full logic needs best-3rd comparison)
    const gamesPerGroup = 6 // C(4,2)
    const resultsInGroup = GROUP_SCHEDULE.filter(m => m.group === g && results[m.id]).length
    if (resultsInGroup === gamesPerGroup) {
      // Group complete
      standings[g][0].qualified = true
      standings[g][1].qualified = true
      standings[g][3].eliminated = true
      standings[g][2].thirdCanQualify = true
    }
  }

  return standings
}

export function computePressure(
  teamId: string,
  group: string,
  standings: GroupStandings,
  remainingMatchIds: string[],
  results: Record<string, { goals_a: number; goals_b: number }>
): { mustWin: boolean; canDraw: boolean; alreadyThrough: boolean; alreadyOut: boolean } {
  const groupTable = standings[group] ?? []
  const team = groupTable.find(t => t.teamId === teamId)
  if (!team) return { mustWin: false, canDraw: true, alreadyThrough: false, alreadyOut: false }

  const remainingInGroup = GROUP_SCHEDULE.filter(
    m => m.group === group && !results[m.id] && (m.teamAId === teamId || m.teamBId === teamId)
  ).length

  const maxPossible = team.pts + remainingInGroup * 3

  const alreadyThrough = team.qualified
  const alreadyOut = team.eliminated
  const mustWin = !alreadyThrough && !alreadyOut && maxPossible < (groupTable[1]?.pts ?? 0)
  const canDraw = !mustWin && !alreadyThrough && !alreadyOut

  return { mustWin, canDraw, alreadyThrough, alreadyOut }
}
