/**
 * Monte-Carlo Turniersimulation für WM 2026
 * Basiert auf ELO-Ratings + analyzeMatch (Dixon-Coles + Poisson)
 * Phase 5: Vollständige Bracket-Simulation mit 12 Gruppen, R32, R16, QF, SF, Finale
 */

import { ALL_TEAMS, TEAM_BY_ID } from '@/src/data/allTeams'
import { GROUP_SCHEDULE } from '@/src/data/schedule'

export interface TeamStageProb {
  teamId: string
  name: string
  flag: string
  group: string
  confederation: string
  probGroupAdvance: number  // Gruppenphase überstanden → R32
  probR32Win: number        // R32 gewonnen → R16
  probR16Win: number        // R16 gewonnen → QF
  probQFWin: number         // QF gewonnen → SF
  probSFWin: number         // SF gewonnen → Finale
  probWinner: number        // Turniersieger
  avgGoalsFor: number
  avgGoalsAgainst: number
}

export interface MatchPrecomputed {
  matchId: string
  teamAId: string
  teamBId: string
  group: string
  winA: number
  draw: number
  winB: number
  xgA: number
  xgB: number
}

interface GroupStanding {
  teamId: string
  group: string
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  played: number
}

// ─── Poisson-Sampling (Knuth algorithm) ──────────────────────────────────────

function poissonSample(lambda: number): number {
  if (lambda <= 0) return 0
  // For very large lambda, use normal approximation to avoid numeric issues
  if (lambda > 100) return Math.round(lambda + Math.sqrt(lambda) * (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3))
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

// ─── Gruppen-Match Simulation ─────────────────────────────────────────────────

function simulateGroupMatch(m: MatchPrecomputed): { goalsA: number; goalsB: number } {
  const r = Math.random()
  let goalsA: number
  let goalsB: number
  let attempts = 0
  const maxAttempts = 50

  if (r < m.winA) {
    // Team A gewinnt: sample bis goalsA > goalsB
    do {
      goalsA = poissonSample(m.xgA)
      goalsB = poissonSample(m.xgB)
      attempts++
    } while (goalsA <= goalsB && attempts < maxAttempts)
    // Fallback: garantiere Sieg
    if (goalsA <= goalsB) { goalsA = goalsB + 1 }
  } else if (r < m.winA + m.draw) {
    // Unentschieden
    do {
      goalsA = poissonSample(m.xgA)
      goalsB = poissonSample(m.xgB)
      attempts++
    } while (goalsA !== goalsB && attempts < maxAttempts)
    // Fallback: setze gleiche Tore
    if (goalsA !== goalsB) { goalsB = goalsA }
  } else {
    // Team B gewinnt
    do {
      goalsA = poissonSample(m.xgA)
      goalsB = poissonSample(m.xgB)
      attempts++
    } while (goalsA >= goalsB && attempts < maxAttempts)
    // Fallback: garantiere Sieg für B
    if (goalsA >= goalsB) { goalsB = goalsA + 1 }
  }

  return { goalsA, goalsB }
}

// ─── Knockout-Match Simulation (ELO-basiert) ──────────────────────────────────

function simulateKnockoutMatch(
  teamAId: string,
  teamBId: string,
  eloRatings: Record<string, number>
): string {
  const teamA = TEAM_BY_ID[teamAId]
  const teamB = TEAM_BY_ID[teamBId]
  if (!teamA) return teamBId
  if (!teamB) return teamAId

  const eloA = eloRatings[teamAId] ?? teamA.eloRating ?? 1500
  const eloB = eloRatings[teamBId] ?? teamB.eloRating ?? 1500

  // ELO-basierte Gewinnwahrscheinlichkeit (inkl. Verlängerung + Elfmeter → kein Unentschieden)
  const eloDiff = eloA - eloB
  const winProb = 1 / (1 + Math.pow(10, -eloDiff / 400))

  return Math.random() < winProb ? teamAId : teamBId
}

// ─── Gruppen-Tabelle berechnen ────────────────────────────────────────────────

function computeGroupStandings(
  groupId: string,
  results: Record<string, { goalsA: number; goalsB: number }>
): GroupStanding[] {
  const standings: Record<string, GroupStanding> = {}

  // Init alle Teams der Gruppe
  const groupMatches = GROUP_SCHEDULE.filter(m => m.group === groupId)
  const teamIds = new Set<string>()
  for (const m of groupMatches) {
    teamIds.add(m.teamAId)
    teamIds.add(m.teamBId)
  }
  for (const id of teamIds) {
    standings[id] = { teamId: id, group: groupId, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, played: 0 }
  }

  // Verarbeite Ergebnisse
  for (const m of groupMatches) {
    const result = results[m.id]
    if (!result) continue

    const { goalsA, goalsB } = result
    const sA = standings[m.teamAId]
    const sB = standings[m.teamBId]
    if (!sA || !sB) continue

    sA.goalsFor += goalsA
    sA.goalsAgainst += goalsB
    sA.goalDiff += goalsA - goalsB
    sA.played++

    sB.goalsFor += goalsB
    sB.goalsAgainst += goalsA
    sB.goalDiff += goalsB - goalsA
    sB.played++

    if (goalsA > goalsB) {
      sA.points += 3
    } else if (goalsA === goalsB) {
      sA.points += 1
      sB.points += 1
    } else {
      sB.points += 3
    }
  }

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    return b.goalsFor - a.goalsFor
  })
}

// ─── WM 2026 Bracket-Definition ──────────────────────────────────────────────

// R32: 12 Gruppensieger, 12 Zweitplatzierten → 12 klassische Duelle
// + 4 Spiele für die 8 besten Drittplatzierten
const R32_SLOTS: { id: string; groupA: string; posA: number; groupB: string; posB: number }[] = [
  { id: 'R32-1',  groupA: 'A', posA: 1, groupB: 'B', posB: 2 },
  { id: 'R32-2',  groupA: 'C', posA: 1, groupB: 'D', posB: 2 },
  { id: 'R32-3',  groupA: 'E', posA: 1, groupB: 'F', posB: 2 },
  { id: 'R32-4',  groupA: 'G', posA: 1, groupB: 'H', posB: 2 },
  { id: 'R32-5',  groupA: 'I', posA: 1, groupB: 'J', posB: 2 },
  { id: 'R32-6',  groupA: 'K', posA: 1, groupB: 'L', posB: 2 },
  { id: 'R32-7',  groupA: 'B', posA: 1, groupB: 'A', posB: 2 },
  { id: 'R32-8',  groupA: 'D', posA: 1, groupB: 'C', posB: 2 },
  { id: 'R32-9',  groupA: 'F', posA: 1, groupB: 'E', posB: 2 },
  { id: 'R32-10', groupA: 'H', posA: 1, groupB: 'G', posB: 2 },
  { id: 'R32-11', groupA: 'J', posA: 1, groupB: 'I', posB: 2 },
  { id: 'R32-12', groupA: 'L', posA: 1, groupB: 'K', posB: 2 },
]

const R16_SLOTS: { id: string; r32A: string; r32B: string }[] = [
  { id: 'R16-1', r32A: 'R32-1',  r32B: 'R32-2' },
  { id: 'R16-2', r32A: 'R32-3',  r32B: 'R32-4' },
  { id: 'R16-3', r32A: 'R32-5',  r32B: 'R32-6' },
  { id: 'R16-4', r32A: 'R32-7',  r32B: 'R32-8' },
  { id: 'R16-5', r32A: 'R32-9',  r32B: 'R32-10' },
  { id: 'R16-6', r32A: 'R32-11', r32B: 'R32-12' },
  { id: 'R16-7', r32A: 'R32-13', r32B: 'R32-14' },
  { id: 'R16-8', r32A: 'R32-15', r32B: 'R32-16' },
]

const QF_SLOTS: { id: string; r16A: string; r16B: string }[] = [
  { id: 'QF-1', r16A: 'R16-1', r16B: 'R16-2' },
  { id: 'QF-2', r16A: 'R16-3', r16B: 'R16-4' },
  { id: 'QF-3', r16A: 'R16-5', r16B: 'R16-6' },
  { id: 'QF-4', r16A: 'R16-7', r16B: 'R16-8' },
]

const SF_SLOTS: { id: string; qfA: string; qfB: string }[] = [
  { id: 'SF-1', qfA: 'QF-1', qfB: 'QF-2' },
  { id: 'SF-2', qfA: 'QF-3', qfB: 'QF-4' },
]

// ─── Haupt-Simulationsfunktion ────────────────────────────────────────────────

export function runSimulation(
  N: number,
  eloRatings: Record<string, number>,
  precomputedMatches: MatchPrecomputed[]
): TeamStageProb[] {
  // Zähler initialisieren
  const counts: Record<string, {
    advance: number
    r32win: number
    r16win: number
    qfwin: number
    sfwin: number
    winner: number
    goalsFor: number
    goalsAgainst: number
  }> = {}

  for (const team of ALL_TEAMS) {
    counts[team.id] = {
      advance: 0, r32win: 0, r16win: 0, qfwin: 0, sfwin: 0, winner: 0,
      goalsFor: 0, goalsAgainst: 0,
    }
  }

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  for (let sim = 0; sim < N; sim++) {
    // ── 1. Gruppenphase simulieren ──────────────────────────────────────────
    const groupResults: Record<string, { goalsA: number; goalsB: number }> = {}

    for (const m of precomputedMatches) {
      const result = simulateGroupMatch(m)
      groupResults[m.matchId] = result
      counts[m.teamAId].goalsFor += result.goalsA
      counts[m.teamAId].goalsAgainst += result.goalsB
      counts[m.teamBId].goalsFor += result.goalsB
      counts[m.teamBId].goalsAgainst += result.goalsA
    }

    // ── 2. Gruppenstandings berechnen ───────────────────────────────────────
    const groupStandings: Record<string, GroupStanding[]> = {}
    for (const g of groups) {
      groupStandings[g] = computeGroupStandings(g, groupResults)
    }

    // ── 3. Qualifizierte Teams bestimmen ────────────────────────────────────
    // Slot-Map: 'A_1', 'A_2', 'B_1', ... '3rd_1'..'3rd_8'
    const slotMap: Record<string, string> = {}
    const thirdPlaced: GroupStanding[] = []

    for (const g of groups) {
      const standings = groupStandings[g]
      if (standings[0]) {
        slotMap[`${g}_1`] = standings[0].teamId
        counts[standings[0].teamId].advance++
      }
      if (standings[1]) {
        slotMap[`${g}_2`] = standings[1].teamId
        counts[standings[1].teamId].advance++
      }
      if (standings[2]) {
        thirdPlaced.push(standings[2])
      }
    }

    // Beste 8 Drittplatzierten
    const best8Third = thirdPlaced
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
        return b.goalsFor - a.goalsFor
      })
      .slice(0, 8)

    for (let i = 0; i < best8Third.length; i++) {
      const t = best8Third[i]
      slotMap[`3rd_${i + 1}`] = t.teamId
      counts[t.teamId].advance++
    }

    // ── 4. R32 simulieren ───────────────────────────────────────────────────
    const r32Winners: Record<string, string> = {}

    for (const slot of R32_SLOTS) {
      const teamA = slotMap[`${slot.groupA}_${slot.posA}`]
      const teamB = slotMap[`${slot.groupB}_${slot.posB}`]
      if (!teamA || !teamB) continue
      const winner = simulateKnockoutMatch(teamA, teamB, eloRatings)
      r32Winners[slot.id] = winner
      counts[winner].r32win++
    }

    // Drittplatzierten-Spiele (R32-13 bis R32-16)
    // Verteile die 8 besten Dritten auf 4 Spiele
    for (let i = 0; i < 4; i++) {
      const slotId = `R32-${13 + i}`
      const teamA = slotMap[`3rd_${i * 2 + 1}`]
      const teamB = slotMap[`3rd_${i * 2 + 2}`]
      if (!teamA || !teamB) {
        // Fallback: bye wenn nur ein Team im Slot
        if (teamA) r32Winners[slotId] = teamA
        else if (teamB) r32Winners[slotId] = teamB
        continue
      }
      const winner = simulateKnockoutMatch(teamA, teamB, eloRatings)
      r32Winners[slotId] = winner
      counts[winner].r32win++
    }

    // ── 5. R16 simulieren ───────────────────────────────────────────────────
    const r16Winners: Record<string, string> = {}

    for (const slot of R16_SLOTS) {
      const teamA = r32Winners[slot.r32A]
      const teamB = r32Winners[slot.r32B]
      if (!teamA || !teamB) continue
      const winner = simulateKnockoutMatch(teamA, teamB, eloRatings)
      r16Winners[slot.id] = winner
      counts[winner].r16win++
    }

    // ── 6. QF simulieren ────────────────────────────────────────────────────
    const qfWinners: Record<string, string> = {}

    for (const slot of QF_SLOTS) {
      const teamA = r16Winners[slot.r16A]
      const teamB = r16Winners[slot.r16B]
      if (!teamA || !teamB) continue
      const winner = simulateKnockoutMatch(teamA, teamB, eloRatings)
      qfWinners[slot.id] = winner
      counts[winner].qfwin++
    }

    // ── 7. SF simulieren ────────────────────────────────────────────────────
    const sfWinners: Record<string, string> = {}

    for (const slot of SF_SLOTS) {
      const teamA = qfWinners[slot.qfA]
      const teamB = qfWinners[slot.qfB]
      if (!teamA || !teamB) continue
      const winner = simulateKnockoutMatch(teamA, teamB, eloRatings)
      sfWinners[slot.id] = winner
      counts[winner].sfwin++
    }

    // ── 8. Finale simulieren ─────────────────────────────────────────────────
    const finalist1 = sfWinners['SF-1']
    const finalist2 = sfWinners['SF-2']
    if (finalist1 && finalist2) {
      const champion = simulateKnockoutMatch(finalist1, finalist2, eloRatings)
      counts[champion].winner++
    }
  }

  // Ergebnisse normalisieren und zurückgeben
  return ALL_TEAMS.map(team => ({
    teamId: team.id,
    name: team.name,
    flag: team.flag,
    group: team.group,
    confederation: team.confederation,
    probGroupAdvance: counts[team.id].advance / N,
    probR32Win: counts[team.id].r32win / N,
    probR16Win: counts[team.id].r16win / N,
    probQFWin: counts[team.id].qfwin / N,
    probSFWin: counts[team.id].sfwin / N,
    probWinner: counts[team.id].winner / N,
    avgGoalsFor: counts[team.id].goalsFor / N,
    avgGoalsAgainst: counts[team.id].goalsAgainst / N,
  })).sort((a, b) => b.probWinner - a.probWinner)
}
