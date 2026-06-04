/**
 * Monte-Carlo Turniersimulation für WM 2026
 * KO-Runden nutzen corePredictFull (gleicher Algorithmus wie UI + Backtest)
 * Gruppenphase: Poisson-Sampling auf vorberechnete xgA/xgB
 * Neu: Gruppenpositions-Zähler (1./2./3./4.) + Tor-Tracking über alle Runden
 */

import { ALL_TEAMS } from '@/src/data/allTeams'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { corePredictFull } from '@/lib/model/corePredict'
import type { CoreTeamData } from '@/lib/model/corePredict'

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface TeamStageProb {
  teamId: string
  name: string
  flag: string
  group: string
  confederation: string
  probGroupAdvance: number
  probFirst: number
  probSecond: number
  probThird: number
  probFourth: number
  probR32Win: number
  probR16Win: number
  probQFWin: number
  probSFWin: number
  probWinner: number
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

// ─── Internal Types ───────────────────────────────────────────────────────────

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
  if (lambda > 100) {
    return Math.round(lambda + Math.sqrt(lambda) * (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3))
  }
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

// ─── Gruppenspiel-Simulation ──────────────────────────────────────────────────

function simulateGroupMatch(m: MatchPrecomputed): { goalsA: number; goalsB: number } {
  const r = Math.random()
  let goalsA: number
  let goalsB: number
  let attempts = 0
  const maxAttempts = 50

  if (r < m.winA) {
    do { goalsA = poissonSample(m.xgA); goalsB = poissonSample(m.xgB); attempts++ }
    while (goalsA <= goalsB && attempts < maxAttempts)
    if (goalsA <= goalsB) goalsA = goalsB + 1
  } else if (r < m.winA + m.draw) {
    do { goalsA = poissonSample(m.xgA); goalsB = poissonSample(m.xgB); attempts++ }
    while (goalsA !== goalsB && attempts < maxAttempts)
    if (goalsA !== goalsB) goalsB = goalsA
  } else {
    do { goalsA = poissonSample(m.xgA); goalsB = poissonSample(m.xgB); attempts++ }
    while (goalsA >= goalsB && attempts < maxAttempts)
    if (goalsA >= goalsB) goalsB = goalsA + 1
  }

  return { goalsA, goalsB }
}

// ─── Gruppen-Tabelle ──────────────────────────────────────────────────────────

function computeGroupStandings(
  groupId: string,
  results: Record<string, { goalsA: number; goalsB: number }>
): GroupStanding[] {
  const standings: Record<string, GroupStanding> = {}
  const groupMatches = GROUP_SCHEDULE.filter(m => m.group === groupId)
  const teamIds = new Set<string>()

  for (const m of groupMatches) { teamIds.add(m.teamAId); teamIds.add(m.teamBId) }
  for (const id of teamIds) {
    standings[id] = { teamId: id, group: groupId, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, played: 0 }
  }

  for (const m of groupMatches) {
    const result = results[m.id]
    if (!result) continue
    const { goalsA, goalsB } = result
    const sA = standings[m.teamAId]
    const sB = standings[m.teamBId]
    if (!sA || !sB) continue

    sA.goalsFor += goalsA; sA.goalsAgainst += goalsB; sA.goalDiff += goalsA - goalsB; sA.played++
    sB.goalsFor += goalsB; sB.goalsAgainst += goalsA; sB.goalDiff += goalsB - goalsA; sB.played++

    if (goalsA > goalsB) sA.points += 3
    else if (goalsA === goalsB) { sA.points += 1; sB.points += 1 }
    else sB.points += 3
  }

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    return b.goalsFor - a.goalsFor
  })
}

// ─── WM 2026 Bracket ─────────────────────────────────────────────────────────

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

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

export function runSimulation(
  N: number,
  teamDataMap: Record<string, CoreTeamData>,
  precomputedMatches: MatchPrecomputed[]
): TeamStageProb[] {
  // Cache für KO-Prognosen (corePredictFull ist deterministisch — einmal pro Paar)
  const koCache = new Map<string, ReturnType<typeof corePredictFull>>()

  function simulateKOMatch(teamAId: string, teamBId: string): { winner: string; goalsA: number; goalsB: number } {
    const key = `${teamAId}:${teamBId}`
    if (!koCache.has(key)) {
      const tA = teamDataMap[teamAId]
      const tB = teamDataMap[teamBId]
      koCache.set(key, (tA && tB) ? corePredictFull(tA, tB) : { probs: [0.5, 0, 0.5], xgA: 1.5, xgB: 1.5 })
    }
    const { probs, xgA, xgB } = koCache.get(key)!
    const [winA, , winB] = probs

    let gA = poissonSample(xgA)
    let gB = poissonSample(xgB)

    // Bei Gleichstand: Verlängerung / Elfmeter → Münzwurf gewichtet nach Modell
    if (gA === gB) {
      const pA = winA + winB > 0 ? winA / (winA + winB) : 0.5
      if (Math.random() < pA) gA++
      else gB++
    }

    return { winner: gA > gB ? teamAId : teamBId, goalsA: gA, goalsB: gB }
  }

  // Zähler initialisieren
  const counts: Record<string, {
    advance: number
    posFirst: number; posSecond: number; posThird: number; posFourth: number
    r32win: number; r16win: number; qfwin: number; sfwin: number; winner: number
    goalsFor: number; goalsAgainst: number
  }> = {}

  for (const team of ALL_TEAMS) {
    counts[team.id] = {
      advance: 0, posFirst: 0, posSecond: 0, posThird: 0, posFourth: 0,
      r32win: 0, r16win: 0, qfwin: 0, sfwin: 0, winner: 0,
      goalsFor: 0, goalsAgainst: 0,
    }
  }

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  for (let sim = 0; sim < N; sim++) {
    // ── 1. Gruppenphase ───────────────────────────────────────────────────────
    const groupResults: Record<string, { goalsA: number; goalsB: number }> = {}

    for (const m of precomputedMatches) {
      const result = simulateGroupMatch(m)
      groupResults[m.matchId] = result
      if (counts[m.teamAId]) {
        counts[m.teamAId].goalsFor += result.goalsA
        counts[m.teamAId].goalsAgainst += result.goalsB
      }
      if (counts[m.teamBId]) {
        counts[m.teamBId].goalsFor += result.goalsB
        counts[m.teamBId].goalsAgainst += result.goalsA
      }
    }

    // ── 2. Gruppenstandings ───────────────────────────────────────────────────
    const groupStandings: Record<string, GroupStanding[]> = {}
    for (const g of groups) groupStandings[g] = computeGroupStandings(g, groupResults)

    // ── 3. Positionen + Quali-Slots ──────────────────────────────────────────
    const slotMap: Record<string, string> = {}
    const thirdPlaced: GroupStanding[] = []

    for (const g of groups) {
      const st = groupStandings[g]
      if (st[0]) { slotMap[`${g}_1`] = st[0].teamId; counts[st[0].teamId].advance++; counts[st[0].teamId].posFirst++ }
      if (st[1]) { slotMap[`${g}_2`] = st[1].teamId; counts[st[1].teamId].advance++; counts[st[1].teamId].posSecond++ }
      if (st[2]) { thirdPlaced.push(st[2]); counts[st[2].teamId].posThird++ }
      if (st[3]) counts[st[3].teamId].posFourth++
    }

    const best8Third = thirdPlaced
      .sort((a, b) => b.points !== a.points ? b.points - a.points : b.goalDiff !== a.goalDiff ? b.goalDiff - a.goalDiff : b.goalsFor - a.goalsFor)
      .slice(0, 8)

    for (let i = 0; i < best8Third.length; i++) {
      const t = best8Third[i]
      slotMap[`3rd_${i + 1}`] = t.teamId
      counts[t.teamId].advance++
    }

    // ── 4. R32 ────────────────────────────────────────────────────────────────
    const r32Winners: Record<string, string> = {}

    for (const slot of R32_SLOTS) {
      const tA = slotMap[`${slot.groupA}_${slot.posA}`]
      const tB = slotMap[`${slot.groupB}_${slot.posB}`]
      if (!tA || !tB) continue
      const { winner, goalsA, goalsB } = simulateKOMatch(tA, tB)
      r32Winners[slot.id] = winner
      counts[winner].r32win++
      if (counts[tA]) { counts[tA].goalsFor += goalsA; counts[tA].goalsAgainst += goalsB }
      if (counts[tB]) { counts[tB].goalsFor += goalsB; counts[tB].goalsAgainst += goalsA }
    }

    for (let i = 0; i < 4; i++) {
      const slotId = `R32-${13 + i}`
      const tA = slotMap[`3rd_${i * 2 + 1}`]
      const tB = slotMap[`3rd_${i * 2 + 2}`]
      if (!tA && !tB) continue
      if (!tA) { r32Winners[slotId] = tB; continue }
      if (!tB) { r32Winners[slotId] = tA; continue }
      const { winner, goalsA, goalsB } = simulateKOMatch(tA, tB)
      r32Winners[slotId] = winner
      counts[winner].r32win++
      if (counts[tA]) { counts[tA].goalsFor += goalsA; counts[tA].goalsAgainst += goalsB }
      if (counts[tB]) { counts[tB].goalsFor += goalsB; counts[tB].goalsAgainst += goalsA }
    }

    // ── 5. R16 ────────────────────────────────────────────────────────────────
    const r16Winners: Record<string, string> = {}

    for (const slot of R16_SLOTS) {
      const tA = r32Winners[slot.r32A]
      const tB = r32Winners[slot.r32B]
      if (!tA || !tB) continue
      const { winner, goalsA, goalsB } = simulateKOMatch(tA, tB)
      r16Winners[slot.id] = winner
      counts[winner].r16win++
      if (counts[tA]) { counts[tA].goalsFor += goalsA; counts[tA].goalsAgainst += goalsB }
      if (counts[tB]) { counts[tB].goalsFor += goalsB; counts[tB].goalsAgainst += goalsA }
    }

    // ── 6. QF ─────────────────────────────────────────────────────────────────
    const qfWinners: Record<string, string> = {}

    for (const slot of QF_SLOTS) {
      const tA = r16Winners[slot.r16A]
      const tB = r16Winners[slot.r16B]
      if (!tA || !tB) continue
      const { winner, goalsA, goalsB } = simulateKOMatch(tA, tB)
      qfWinners[slot.id] = winner
      counts[winner].qfwin++
      if (counts[tA]) { counts[tA].goalsFor += goalsA; counts[tA].goalsAgainst += goalsB }
      if (counts[tB]) { counts[tB].goalsFor += goalsB; counts[tB].goalsAgainst += goalsA }
    }

    // ── 7. SF ─────────────────────────────────────────────────────────────────
    const sfWinners: Record<string, string> = {}

    for (const slot of SF_SLOTS) {
      const tA = qfWinners[slot.qfA]
      const tB = qfWinners[slot.qfB]
      if (!tA || !tB) continue
      const { winner, goalsA, goalsB } = simulateKOMatch(tA, tB)
      sfWinners[slot.id] = winner
      counts[winner].sfwin++
      if (counts[tA]) { counts[tA].goalsFor += goalsA; counts[tA].goalsAgainst += goalsB }
      if (counts[tB]) { counts[tB].goalsFor += goalsB; counts[tB].goalsAgainst += goalsA }
    }

    // ── 8. Finale ─────────────────────────────────────────────────────────────
    const f1 = sfWinners['SF-1']
    const f2 = sfWinners['SF-2']
    if (f1 && f2) {
      const { winner, goalsA, goalsB } = simulateKOMatch(f1, f2)
      counts[winner].winner++
      if (counts[f1]) { counts[f1].goalsFor += goalsA; counts[f1].goalsAgainst += goalsB }
      if (counts[f2]) { counts[f2].goalsFor += goalsB; counts[f2].goalsAgainst += goalsA }
    }
  }

  return ALL_TEAMS.map(team => ({
    teamId: team.id,
    name: team.name,
    flag: team.flag,
    group: team.group,
    confederation: team.confederation,
    probGroupAdvance: counts[team.id].advance / N,
    probFirst:  counts[team.id].posFirst  / N,
    probSecond: counts[team.id].posSecond / N,
    probThird:  counts[team.id].posThird  / N,
    probFourth: counts[team.id].posFourth / N,
    probR32Win: counts[team.id].r32win / N,
    probR16Win: counts[team.id].r16win / N,
    probQFWin:  counts[team.id].qfwin  / N,
    probSFWin:  counts[team.id].sfwin  / N,
    probWinner: counts[team.id].winner / N,
    avgGoalsFor:     counts[team.id].goalsFor     / N,
    avgGoalsAgainst: counts[team.id].goalsAgainst / N,
  })).sort((a, b) => b.probWinner - a.probWinner)
}
