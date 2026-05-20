/**
 * Model Adapter – verbindet die Next.js-App mit dem TypeScript-Prognosemodell
 * Wrapper für src/model/* Funktionen
 */

import { TeamData, TEAMS } from '@/src/data/teams'
import { VENUES } from '@/src/data/venues'
import { ALL_TEAMS, TEAM_BY_ID, TeamBasic } from '@/src/data/allTeams'
import { Player } from '@/src/data/players'
import { MatchContext } from '@/src/data/matches'
import { predictMatch, MatchPredictionResult } from '@/src/model/predictMatch'
import { GROUP_SCHEDULE, ScheduledMatch } from '@/src/data/schedule'

// ─── TeamData Builder ──────────────────────────────────────────────────────────

/**
 * Erstellt ein TeamData-Objekt aus einem TeamBasic + optionalem Spieler-Array.
 * Wird für Teams genutzt, die KEINE detaillierten Daten in teams.ts haben.
 */
export function buildTeamDataFromBasic(team: TeamBasic): TeamData {
  // Falls Team bereits in TEAMS vorhanden, nutze echte Daten
  if (TEAMS[team.id]) return TEAMS[team.id]

  // Schätzwerte aus allTeams-Daten ableiten
  const elo = team.eloRating
  const recentXGFor = estimateXGFor(team.overallRating)
  const recentXGAgainst = estimateXGAgainst(team.defenseRating)

  return {
    id: team.id,
    name: team.name,
    confederation: team.confederation,
    eloRating: elo,
    overallRating: team.overallRating,
    attackRating: team.attackRating,
    midfieldRating: team.midfieldRating,
    defenseRating: team.defenseRating,
    goalkeeperRating: team.goalkeeperRating,
    setPieceRating: team.setPieceRating,
    squadMarketValueM: team.squadMarketValueM,
    recentXGFor,
    recentXGAgainst,
    opponentAdjustedXG: recentXGFor * 0.95,
    squadAvgAge: team.squadAvgAge,
    keyPlayersAvgAge: team.squadAvgAge + 0.5,
    worldCupAppearances: team.worldCupAppearances,
    worldCupFinals: Math.floor(team.worldCupTitles * 1.5),
    worldCupTitles: team.worldCupTitles,
    coach: {
      name: team.coach,
      tenureYears: 2.0,
      majorTournamentExperience: 1,
      knockoutExperience: 3,
      tacticalStability: 70,
    },
    homeRegion: inferHomeRegion(team.confederation),
    accustomedAltitudeM: 200,
    heatAdaptation: inferHeatAdaptation(team.confederation),
    penaltyGoalkeeperSkill: team.goalkeeperRating * 0.8,
    penaltyTakerQuality: team.attackRating * 0.75,
    penaltyTournamentExperience: team.worldCupAppearances > 5 ? 75 : 60,
  }
}

/**
 * Erstellt TeamData aus TeamBasic + Spieler-Array (für Squad-basierte Berechnung)
 */
export function buildTeamDataFromSquad(team: TeamBasic, players: Player[]): TeamData {
  const base = buildTeamDataFromBasic(team)

  if (players.length === 0) return base

  // Durchschnittswerte aus Spielern ableiten
  const starters = players.filter(p => p.isInStartingXI)
  const avgAge = starters.length > 0
    ? starters.reduce((s, p) => s + p.age, 0) / starters.length
    : base.squadAvgAge

  const totalValue = players.reduce((s, p) => s + p.marketValueM, 0)

  const fwdPlayers = players.filter(p => p.position === 'FWD')
  const xgFor = fwdPlayers.length > 0
    ? fwdPlayers.reduce((s, p) => s + (p.xGPer90 ?? 0.15), 0) / fwdPlayers.length * 1.5
    : base.recentXGFor

  return {
    ...base,
    squadMarketValueM: totalValue || base.squadMarketValueM,
    squadAvgAge: avgAge,
    keyPlayersAvgAge: avgAge,
    recentXGFor: xgFor,
  }
}

// ─── Match Prediction ──────────────────────────────────────────────────────────

export interface MatchPredictionInput {
  teamAId: string
  teamBId: string
  venueId: string
  matchContext?: Partial<MatchContext>
}

export async function getMatchPrediction(
  input: MatchPredictionInput
): Promise<MatchPredictionResult> {
  const teamABasic = TEAM_BY_ID[input.teamAId]
  const teamBBasic = TEAM_BY_ID[input.teamBId]

  if (!teamABasic || !teamBBasic) {
    throw new Error(`Team nicht gefunden: ${input.teamAId} oder ${input.teamBId}`)
  }

  const teamA = buildTeamDataFromBasic(teamABasic)
  const teamB = buildTeamDataFromBasic(teamBBasic)
  const venue = VENUES[input.venueId] ?? VENUES['new_york']

  const ctx: MatchContext = {
    round: 'group',
    isKnockout: false,
    teamARestDays: 6,
    teamBRestDays: 6,
    teamAIsHostNation: ['usa', 'canada'].includes(input.teamAId),
    teamBIsHostNation: ['usa', 'canada'].includes(input.teamBId),
    teamATravelDistanceKm: estimateTravelDistance(teamABasic.confederation, input.venueId),
    teamBTravelDistanceKm: estimateTravelDistance(teamBBasic.confederation, input.venueId),
    teamATimezoneShiftHours: estimateTimezoneShift(teamABasic.confederation),
    teamBTimezoneShiftHours: estimateTimezoneShift(teamBBasic.confederation),
    teamADiasporaSupport: hasDiasporaSupport(input.teamAId, input.venueId),
    teamBDiasporaSupport: hasDiasporaSupport(input.teamBId, input.venueId),
    ...input.matchContext,
  }

  return predictMatch(teamA, teamB, venue, ctx)
}

// ─── Tipp-Empfehlungen ─────────────────────────────────────────────────────────

export interface TipSuggestion {
  matchId: string
  teamAId: string
  teamBId: string
  teamAName: string
  teamBName: string
  teamAFlag: string
  teamBFlag: string
  suggestedTip: '1' | 'X' | '2'
  confidence: 'very_high' | 'high' | 'medium' | 'low'
  winProbA: number
  drawProb: number
  winProbB: number
  reasoning: string
  isValueBet: boolean
  expectedPoints: number
  group?: string
  date: string
}

export function generateTipSuggestions(matchIds?: string[]): TipSuggestion[] {
  const matches = matchIds
    ? GROUP_SCHEDULE.filter(m => matchIds.includes(m.id))
    : GROUP_SCHEDULE

  return matches.map(match => generateTipForMatch(match))
}

function generateTipForMatch(match: ScheduledMatch): TipSuggestion {
  const teamA = TEAM_BY_ID[match.teamAId]
  const teamB = TEAM_BY_ID[match.teamBId]

  if (!teamA || !teamB) {
    return {
      matchId: match.id,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName: match.teamAId,
      teamBName: match.teamBId,
      teamAFlag: '🏳',
      teamBFlag: '🏳',
      suggestedTip: 'X',
      confidence: 'low',
      winProbA: 0.33,
      drawProb: 0.34,
      winProbB: 0.33,
      reasoning: 'Unbekannte Teams',
      isValueBet: false,
      expectedPoints: 1,
      group: match.group,
      date: match.date,
    }
  }

  // Einfache ELO-basierte Wahrscheinlichkeiten
  const eloDiff = teamA.eloRating - teamB.eloRating
  const baseWinA = eloToWinProb(eloDiff)
  const baseWinB = eloToWinProb(-eloDiff)
  const baseDraw = 1 - baseWinA - baseWinB

  // Heimvorteil für Gastgeber
  const isHostA = ['usa', 'canada'].includes(match.teamAId)
  const isHostB = ['usa', 'canada'].includes(match.teamBId)
  let winA = baseWinA + (isHostA ? 0.04 : 0) - (isHostB ? 0.02 : 0)
  let winB = baseWinB + (isHostB ? 0.04 : 0) - (isHostA ? 0.02 : 0)
  let draw = 1 - winA - winB

  // Normalize
  const total = winA + draw + winB
  winA /= total
  draw /= total
  winB /= total

  // Bestes Ergebnis bestimmen
  let suggestedTip: '1' | 'X' | '2'
  let maxProb: number

  if (winA >= winB && winA >= draw) {
    suggestedTip = '1'
    maxProb = winA
  } else if (winB > winA && winB > draw) {
    suggestedTip = '2'
    maxProb = winB
  } else {
    suggestedTip = 'X'
    maxProb = draw
  }

  // Konfidenz
  let confidence: TipSuggestion['confidence']
  if (maxProb >= 0.65) confidence = 'very_high'
  else if (maxProb >= 0.50) confidence = 'high'
  else if (maxProb >= 0.38) confidence = 'medium'
  else confidence = 'low'

  // Value Bet: Außenseiter hat höhere wahre Chancen als erwartet
  const eloDiffAbs = Math.abs(eloDiff)
  const isValueBet = eloDiffAbs > 300 && confidence === 'low'

  // Erwartete Punkte (Standard-Tippspiel: 3 für richtigen Ausgang, 5 für exaktes Ergebnis)
  const expectedPoints = suggestedTip === '1' ? winA * 3 :
    suggestedTip === '2' ? winB * 3 : draw * 3

  // Begründung
  const reasoning = buildReasoning(teamA, teamB, eloDiff, suggestedTip, isHostA, isHostB)

  return {
    matchId: match.id,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAFlag: teamA.flag,
    teamBFlag: teamB.flag,
    suggestedTip,
    confidence,
    winProbA: Math.round(winA * 100) / 100,
    drawProb: Math.round(draw * 100) / 100,
    winProbB: Math.round(winB * 100) / 100,
    reasoning,
    isValueBet,
    expectedPoints: Math.round(expectedPoints * 10) / 10,
    group: match.group,
    date: match.date,
  }
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function eloToWinProb(eloDiff: number): number {
  // Logistisches Modell: Sieg + anteilig Unentschieden
  const rawWin = 1 / (1 + Math.pow(10, -eloDiff / 400))
  // Unentschieden-Anteil: ~30% in der Gruppenphase
  const drawShare = 0.28
  return rawWin * (1 - drawShare) + drawShare * 0.5
}

function estimateXGFor(overallRating: number): number {
  return 0.6 + (overallRating / 100) * 1.8
}

function estimateXGAgainst(defenseRating: number): number {
  return 1.8 - (defenseRating / 100) * 1.2
}

function inferHomeRegion(conf: string): TeamData['homeRegion'] {
  switch (conf) {
    case 'UEFA': return 'europe'
    case 'CONMEBOL': return 'south_america'
    case 'CONCACAF': return 'north_america'
    case 'CAF': return 'africa'
    case 'AFC': return 'asia'
    case 'OFC': return 'oceania'
    default: return 'europe'
  }
}

function inferHeatAdaptation(conf: string): number {
  switch (conf) {
    case 'CAF': return 0.75
    case 'AFC': return 0.65
    case 'CONCACAF': return 0.60
    case 'CONMEBOL': return 0.55
    case 'OFC': return 0.45
    case 'UEFA': return 0.30
    default: return 0.40
  }
}

function estimateTravelDistance(conf: string, venueId: string): number {
  const isNorthAmerica = ['mexico_city', 'guadalajara', 'monterrey', 'miami', 'houston',
    'dallas', 'new_york', 'los_angeles', 'toronto', 'vancouver'].includes(venueId)

  if (isNorthAmerica) {
    switch (conf) {
      case 'CONCACAF': return 800
      case 'CONMEBOL': return 7500
      case 'UEFA': return 7200
      case 'CAF': return 9500
      case 'AFC': return 11000
      case 'OFC': return 12500
    }
  }
  return 5000
}

function estimateTimezoneShift(conf: string): number {
  switch (conf) {
    case 'UEFA': return -6
    case 'CAF': return -6
    case 'CONMEBOL': return -1
    case 'CONCACAF': return 0
    case 'AFC': return -14
    case 'OFC': return -17
    default: return -5
  }
}

function hasDiasporaSupport(teamId: string, venueId: string): boolean {
  const diasporaMap: Record<string, string[]> = {
    'usa': ['miami', 'houston', 'dallas', 'new_york', 'los_angeles', 'toronto'],
    'mexico': ['los_angeles', 'dallas', 'houston', 'mexico_city', 'guadalajara'],
    'canada': ['toronto', 'vancouver'],
    'brazil': ['miami', 'new_york'],
    'portugal': ['new_york'],
    'italy': ['new_york'],
  }
  return diasporaMap[teamId]?.includes(venueId) ?? false
}

function buildReasoning(
  teamA: TeamBasic,
  teamB: TeamBasic,
  eloDiff: number,
  tip: '1' | 'X' | '2',
  isHostA: boolean,
  isHostB: boolean
): string {
  const parts: string[] = []
  const stronger = eloDiff > 0 ? teamA : teamB
  const weaker = eloDiff > 0 ? teamB : teamA
  const diff = Math.abs(eloDiff)

  if (diff > 400) parts.push(`${stronger.name} ist deutlich stärker (ELO +${diff})`)
  else if (diff > 200) parts.push(`${stronger.name} hat klaren ELO-Vorteil (+${diff})`)
  else if (diff > 100) parts.push(`${stronger.name} leicht favorisiert (+${diff} ELO)`)
  else parts.push(`Ausgeglichenes Duell (ELO-Diff: ${diff})`)

  if (isHostA) parts.push(`${teamA.name} als Gastgeberland mit Heimvorteil`)
  if (isHostB) parts.push(`${teamB.name} als Gastgeberland mit Heimvorteil`)

  if (tip === 'X') parts.push('Unentschieden möglich bei ähnlicher Stärke')

  return parts.join('. ')
}

// ─── Tournament Simulation ─────────────────────────────────────────────────────

export interface TeamTournamentStats {
  teamId: string
  name: string
  flag: string
  group: string
  pGroupStage: number
  pRound32: number
  pRound16: number
  pQuarterfinal: number
  pSemifinal: number
  pFinal: number
  pChampion: number
}

export function simulateTournament(simulations: number = 1000): TeamTournamentStats[] {
  const stats: Record<string, {
    groupStage: number, round32: number, round16: number,
    qf: number, sf: number, final: number, champion: number
  }> = {}

  // Init
  for (const team of ALL_TEAMS) {
    stats[team.id] = { groupStage: 0, round32: 0, round16: 0, qf: 0, sf: 0, final: 0, champion: 0 }
  }

  for (let i = 0; i < simulations; i++) {
    simulateSingleTournament(stats)
  }

  return ALL_TEAMS.map(team => ({
    teamId: team.id,
    name: team.name,
    flag: team.flag,
    group: team.group,
    pGroupStage: stats[team.id].groupStage / simulations,
    pRound32: stats[team.id].round32 / simulations,
    pRound16: stats[team.id].round16 / simulations,
    pQuarterfinal: stats[team.id].qf / simulations,
    pSemifinal: stats[team.id].sf / simulations,
    pFinal: stats[team.id].final / simulations,
    pChampion: stats[team.id].champion / simulations,
  })).sort((a, b) => b.pChampion - a.pChampion)
}

function simulateSingleTournament(stats: Record<string, { groupStage: number, round32: number, round16: number, qf: number, sf: number, final: number, champion: number }>) {
  // Gruppenphase simulieren
  const groupResults: Record<string, { id: string, pts: number, gd: number, gf: number }[]> = {}

  for (const match of GROUP_SCHEDULE) {
    const teamA = TEAM_BY_ID[match.teamAId]
    const teamB = TEAM_BY_ID[match.teamBId]
    if (!teamA || !teamB || !match.group) continue

    if (!groupResults[match.group]) {
      groupResults[match.group] = []
    }

    // Ergebnis simulieren
    const { goalsA, goalsB } = simulateMatchScore(teamA, teamB)

    // Punkte aktualisieren
    const tableA = getOrCreate(groupResults[match.group], match.teamAId)
    const tableB = getOrCreate(groupResults[match.group], match.teamBId)

    tableA.gf += goalsA
    tableA.gd += goalsA - goalsB
    tableB.gf += goalsB
    tableB.gd += goalsB - goalsA

    if (goalsA > goalsB) { tableA.pts += 3 }
    else if (goalsA === goalsB) { tableA.pts += 1; tableB.pts += 1 }
    else { tableB.pts += 3 }
  }

  // Top-2 jeder Gruppe + beste 8 Drittplatzierten qualifizieren sich
  const qualifiedTeams: string[] = []
  const thirdPlaced: { id: string, pts: number, gd: number, gf: number }[] = []

  for (const [, table] of Object.entries(groupResults)) {
    const sorted = table.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    if (sorted[0]) { qualifiedTeams.push(sorted[0].id); stats[sorted[0].id].groupStage++ }
    if (sorted[1]) { qualifiedTeams.push(sorted[1].id); stats[sorted[1].id].groupStage++ }
    if (sorted[2]) thirdPlaced.push(sorted[2])
  }

  // Beste 8 Drittplatzierten
  thirdPlaced.sort((a, b) => b.pts - a.pts || b.gd - a.gd)
  for (let i = 0; i < 8 && i < thirdPlaced.length; i++) {
    qualifiedTeams.push(thirdPlaced[i].id)
    stats[thirdPlaced[i].id].groupStage++
  }

  // KO-Runden simulieren (vereinfacht)
  let roundTeams = [...qualifiedTeams]

  // Round of 32
  const r16teams = simulateKORound(roundTeams, stats, 'round32')
  // Round of 16
  const qfTeams = simulateKORound(r16teams, stats, 'round16')
  // QF
  const sfTeams = simulateKORound(qfTeams, stats, 'qf')
  // SF
  const finalists = simulateKORound(sfTeams, stats, 'sf')
  // Final
  const champion = simulateKORound(finalists, stats, 'final')

  if (champion[0]) stats[champion[0]].champion++
}

function simulateKORound(
  teams: string[],
  stats: Record<string, { groupStage: number, round32: number, round16: number, qf: number, sf: number, final: number, champion: number }>,
  stage: 'round32' | 'round16' | 'qf' | 'sf' | 'final'
): string[] {
  const winners: string[] = []
  for (let i = 0; i < teams.length; i += 2) {
    if (!teams[i + 1]) { winners.push(teams[i]); continue }
    const teamA = TEAM_BY_ID[teams[i]]
    const teamB = TEAM_BY_ID[teams[i + 1]]
    if (!teamA || !teamB) { winners.push(teams[i]); continue }

    const winner = simulateKOMatch(teamA, teamB)
    winners.push(winner)

    // Stats updaten
    const stageMap = { round32: 'round32', round16: 'round16', qf: 'qf', sf: 'sf', final: 'final' }
    const key = stageMap[stage] as keyof typeof stats[string]
    stats[winner][key]++
  }
  return winners
}

function simulateMatchScore(teamA: TeamBasic, teamB: TeamBasic): { goalsA: number, goalsB: number } {
  const eloA = teamA.eloRating
  const eloB = teamB.eloRating
  const lambdaA = 1.15 * (1 + (eloA - eloB) / 2000)
  const lambdaB = 1.15 * (1 + (eloB - eloA) / 2000)

  return {
    goalsA: poissonRandom(Math.max(0.2, Math.min(4, lambdaA))),
    goalsB: poissonRandom(Math.max(0.2, Math.min(4, lambdaB))),
  }
}

function simulateKOMatch(teamA: TeamBasic, teamB: TeamBasic): string {
  const { goalsA, goalsB } = simulateMatchScore(teamA, teamB)
  if (goalsA > goalsB) return teamA.id
  if (goalsB > goalsA) return teamB.id
  // Elfmeter: ELO-basiert
  const probA = 0.5 + (teamA.eloRating - teamB.eloRating) / 4000
  return Math.random() < probA ? teamA.id : teamB.id
}

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda)
  let p = 1
  let k = 0
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

function getOrCreate(
  table: { id: string, pts: number, gd: number, gf: number }[],
  id: string
): { id: string, pts: number, gd: number, gf: number } {
  let entry = table.find(e => e.id === id)
  if (!entry) {
    entry = { id, pts: 0, gd: 0, gf: 0 }
    table.push(entry)
  }
  return entry
}
