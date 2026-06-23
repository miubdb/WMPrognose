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
    // Compute max achievable points per team (current pts + remaining games × 3)
    const maxPtsFor: Record<string, number> = {}
    for (const t of standings[g]) {
      const remaining = GROUP_SCHEDULE.filter(
        m => m.group === g && !results[m.id] && (m.teamAId === t.teamId || m.teamBId === t.teamId)
      ).length
      maxPtsFor[t.teamId] = t.pts + remaining * 3
    }

    // Determine mathematical qualification / elimination mid-tournament
    for (const team of standings[g]) {
      const others = standings[g].filter(t => t.teamId !== team.teamId)

      // ELIMINATED: 3 other teams have current pts >= team's maximum possible.
      // At WM 2026 the best 8 third-place teams also advance, so a team is only
      // truly eliminated if it cannot even finish 3rd in its own group.
      const definitelyAbove = others.filter(o => o.pts >= maxPtsFor[team.teamId]).length
      if (definitelyAbove >= 3) {
        team.eliminated = true
        continue
      }

      // QUALIFIED top-2: at most 1 other team can possibly finish strictly above team's current pts
      // (worst case for team: they earn 0 more pts → final = team.pts)
      const canFinishAbove = others.filter(o => maxPtsFor[o.teamId] > team.pts).length
      if (canFinishAbove <= 1) {
        team.qualified = true
      }
    }

    // Mark thirdCanQualify for teams not yet decided
    const gamesPerGroup = 6
    const resultsInGroup = GROUP_SCHEDULE.filter(m => m.group === g && results[m.id]).length
    if (resultsInGroup === gamesPerGroup) {
      // Group complete: 3rd-place team (index 2 after sort) can still advance as best 3rd
      if (!standings[g][2].eliminated) {
        standings[g][2].thirdCanQualify = true
      }
    } else {
      // Ongoing: any undecided team could still end up as best 3rd
      for (const t of standings[g]) {
        if (!t.qualified && !t.eliminated) {
          t.thirdCanQualify = true
        }
      }
    }
  }

  return standings
}

/**
 * Returns the stats of the 8th-best current third-place team across all groups.
 * Used to determine what a team needs to qualify as one of the best thirds.
 * Only counts groups that have played at least one game.
 */
export function computeBestThirdThreshold(
  allStandings: GroupStandings
): { pts: number; gd: number; gf: number } | null {
  const thirds: { pts: number; gd: number; gf: number }[] = []
  for (const table of Object.values(allStandings)) {
    const third = table[2]
    if (third && third.played > 0) {
      thirds.push({ pts: third.pts, gd: third.gd, gf: third.gf })
    }
  }
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  return thirds[7] ?? null  // index 7 = 8th best
}

export interface TeamPressureResult {
  mustWin: boolean
  canDraw: boolean
  alreadyThrough: boolean
  alreadyOut: boolean
  drawSuffices: boolean
  /** Minimum goal margin needed to enter top-8 thirds; null if not relevant or not computable */
  neededMarginForThird: number | null
}

export function computePressure(
  teamId: string,
  group: string,
  standings: GroupStandings,
  remainingMatchIds: string[],
  results: Record<string, { goals_a: number; goals_b: number }>,
  allStandings?: GroupStandings
): TeamPressureResult {
  const groupTable = standings[group] ?? []
  const team = groupTable.find(t => t.teamId === teamId)
  if (!team) return { mustWin: false, canDraw: true, alreadyThrough: false, alreadyOut: false, drawSuffices: false, neededMarginForThird: null }

  const remainingInGroup = GROUP_SCHEDULE.filter(
    m => m.group === group && !results[m.id] && (m.teamAId === teamId || m.teamBId === teamId)
  ).length

  const maxPossible = team.pts + remainingInGroup * 3

  const alreadyThrough = team.qualified
  const alreadyOut = team.eliminated
  const mustWin = !alreadyThrough && !alreadyOut && maxPossible < (groupTable[1]?.pts ?? 0)
  const canDraw = !mustWin && !alreadyThrough && !alreadyOut

  // drawSuffices: even with a draw the team is mathematically in top 2
  const ptsAfterDraw = team.pts + 1
  const canSurpassAfterDraw = groupTable
    .filter(t => t.teamId !== teamId)
    .filter(t => {
      const rem = GROUP_SCHEDULE.filter(
        m => m.group === group && !results[m.id] && (m.teamAId === t.teamId || m.teamBId === t.teamId)
      ).length
      return t.pts + rem * 3 > ptsAfterDraw
    }).length
  const drawSuffices = !alreadyThrough && !alreadyOut && canSurpassAfterDraw <= 1

  // neededMarginForThird: minimum win margin for team to enter best-8 thirds.
  // Only relevant in MD3 (remainingInGroup === 1) for teams not already in top 2.
  let neededMarginForThird: number | null = null
  if (
    allStandings &&
    remainingInGroup === 1 &&
    !alreadyThrough &&
    !alreadyOut &&
    team.thirdCanQualify
  ) {
    const threshold = computeBestThirdThreshold(allStandings)
    if (threshold !== null) {
      const groupRank = groupTable.findIndex(t => t.teamId === teamId)  // 0-indexed
      // Only apply if team is realistically aiming for best-third (rank 2 or 3 = 3rd/4th place)
      if (groupRank >= 2) {
        const ptsAfterWin = team.pts + 3
        if (ptsAfterWin > threshold.pts) {
          neededMarginForThird = 1  // winning by any margin is enough on points
        } else if (ptsAfterWin === threshold.pts) {
          // Need to beat threshold on GD
          const marginNeeded = threshold.gd - team.gd + 1
          neededMarginForThird = Math.max(1, marginNeeded)
        }
        // ptsAfterWin < threshold.pts → even a win isn't enough (left as null)
      }
    }
  }

  return { mustWin, canDraw, alreadyThrough, alreadyOut, drawSuffices, neededMarginForThird }
}
