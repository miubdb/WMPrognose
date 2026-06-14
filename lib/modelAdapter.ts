/**
 * Model Adapter – verbindet die Next.js-App mit dem TypeScript-Prognosemodell
 * Wrapper für src/model/* Funktionen
 * Phase 1: log-lambda + Dixon-Coles + modular model structure
 */

import { TeamData, TEAMS } from '@/src/data/teams'
import { VENUES } from '@/src/data/venues'
import { ALL_TEAMS, TEAM_BY_ID, TeamBasic } from '@/src/data/allTeams'
import { Player } from '@/src/data/players'
import { MatchContext } from '@/src/data/matches'
import { predictMatch, MatchPredictionResult } from '@/src/model/predictMatch'
import { GROUP_SCHEDULE, ScheduledMatch } from '@/src/data/schedule'
import { computeScorelineMatrix } from '@/src/model/poisson'
import { applyDixonColesCorrection, aggregateOutcomeProbabilities } from '@/src/model/dixonColes'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'
import { clampLogEffect, logEffectToLinear, computeLambda } from '@/lib/model/logLambda'
import type { DataQualityScore } from '@/lib/model/types'
import { computeTournamentHeritage } from '@/lib/model/coachScore'
import { computeSquadRating, type SquadPlayer } from '@/lib/model/squadRating'
import { computePenaltyWinProbability, defaultPenaltySkills } from '@/lib/model/penaltyShootout'
import { MOTIVATION_WEIGHTS } from '@/lib/model/corePredict'
import { computeGroupStandings, computePressure } from '@/lib/standings'

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

  // Convert Player[] → SquadPlayer[] for computeSquadRating
  const squadPlayers: SquadPlayer[] = players.map(p => ({
    position: p.position,
    marketValueM: p.marketValueM,
    xgPer90: p.xGPer90 ?? null,
    xgaPer90: p.xGAPer90 ?? null,
    age: p.age,
    isInStartingXI: p.isInStartingXI,
  }))

  const rating = computeSquadRating(squadPlayers)

  // xG from market-value-weighted attack data; fall back to base estimate if insufficient data
  const xgFor = rating.attackValue !== null
    ? Math.min(3.5, rating.attackValue * 4.5)  // xG/90 → full-match xG scale
    : base.recentXGFor

  const starters = players.filter(p => p.isInStartingXI)
  const avgAge = rating.starterCount >= 8
    ? rating.peakAgeScore.avgAge
    : starters.length > 0
      ? starters.reduce((s, p) => s + p.age, 0) / starters.length
      : base.squadAvgAge

  return {
    ...base,
    squadMarketValueM: rating.totalMarketValueM || base.squadMarketValueM,
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
    teamAIsHostNation: ['usa', 'canada', 'mexico'].includes(input.teamAId),
    teamBIsHostNation: ['usa', 'canada', 'mexico'].includes(input.teamBId),
    teamATravelDistanceKm: travelDistanceInNA(input.teamAId, teamABasic.confederation, input.venueId),
    teamBTravelDistanceKm: travelDistanceInNA(input.teamBId, teamBBasic.confederation, input.venueId),
    teamATimezoneShiftHours: 0,
    teamBTimezoneShiftHours: 0,
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

  // Heimvorteil für Gastgeber — Poisson-basiert für Konsistenz
  const isHostA = ['usa', 'canada', 'mexico'].includes(match.teamAId)
  const isHostB = ['usa', 'canada', 'mexico'].includes(match.teamBId)
  const hostAdj = (isHostA ? 0.04 : 0) - (isHostB ? 0.02 : 0)
  const baseXgA = 1.35 * (1 + eloDiff / 400 * 0.15 + hostAdj)
  const baseXgB = 1.35 * (1 - eloDiff / 400 * 0.15 - hostAdj)
  const { winA, draw, winB } = poissonWinProbs(
    Math.max(0.3, Math.min(4, baseXgA)),
    Math.max(0.3, Math.min(4, baseXgB))
  )

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

// Teams die regelmäßig auf signifikanter Höhe spielen — kein Akklimatisierungs-Nachteil
const HIGH_ALTITUDE_NATIONS = new Set([
  'mexico',     // Mexico City 2240m, Monterrey 540m
  'colombia',   // Bogotá 2600m, Medellín 1495m
  'ecuador',    // Quito 2850m
  'peru',       // Lima 154m aber Auswärtsspiele in Anden
  'bolivia',    // La Paz 3600m
  'chile',      // Santiago 567m, Andespiele
  'venezuela',  // Caracas 900m
  'usa',        // Denver 1609m
])

// ─── Intra-WM Travel (Nordamerika) ────────────────────────────────────────────
// Teams reisen WÄHREND des Turniers zwischen ihrem Trainingscamp in NA und dem Spielort.
// Bekannte Trainingslager: user stellt sie bereit. Confederation-Defaults = typische Camp-Region.

const TEAM_BASE_CAMPS: Record<string, [number, number]> = {
  // Lat, Lng — alle offiziellen Teamquartiere WM 2026 (user-verified)
  'germany':      [36.1,  -80.2],  // Winston-Salem, NC
  'england':      [39.1,  -94.6],  // Kansas City, MO
  'france':       [42.4,  -71.1],  // Boston, MA
  'spain':        [35.0,  -85.3],  // Chattanooga, TN
  'portugal':     [25.9,  -80.2],  // Miami, FL
  'netherlands':  [39.1,  -94.6],  // Kansas City, MO
  'belgium':      [47.6, -122.3],  // Seattle, WA
  'austria':      [34.4, -119.7],  // Santa Barbara, CA
  'croatia':      [38.8,  -77.1],  // Alexandria, VA
  'scotland':     [35.2,  -80.8],  // Charlotte, NC
  'switzerland':  [32.7, -117.2],  // San Diego, CA
  'norway':       [36.1,  -79.8],  // Greensboro, NC
  'sweden':       [33.1,  -96.8],  // Frisco, TX
  'czechia':      [32.6,  -97.1],  // Mansfield, TX
  'bosnia':       [40.8, -111.9],  // Salt Lake City, UT
  'turkey':       [33.4, -111.8],  // Mesa, AZ
  'brazil':       [40.8,  -74.5],  // Morristown, NJ
  'argentina':    [39.1,  -94.6],  // Kansas City, MO
  'colombia':     [20.7, -103.4],  // Guadalajara, MX
  'uruguay':      [20.6,  -87.1],  // Playa del Carmen, MX
  'ecuador':      [39.9,  -82.9],  // Columbus, OH
  'paraguay':     [37.3, -121.9],  // San Jose, CA
  'usa':          [33.7, -117.8],  // Irvine, CA
  'canada':       [49.3, -123.1],  // Vancouver, BC
  'mexico':       [19.4,  -99.2],  // Mexiko-Stadt, MX
  'panama':       [44.1,  -79.8],  // New Tecumseth, ON
  'curacao':      [26.4,  -80.1],  // Boca Raton, FL
  'morocco':      [40.7,  -74.6],  // Bernards Township, NJ
  'senegal':      [40.5,  -74.5],  // New Brunswick, NJ
  'egypt':        [47.7, -117.4],  // Spokane, WA
  'ghana':        [41.8,  -71.4],  // Providence, RI
  'ivory_coast':  [39.9,  -75.2],  // Philadelphia, PA
  'tunisia':      [25.7, -100.3],  // Monterrey, MX
  'algeria':      [38.9,  -95.2],  // Lawrence, KS
  'cape_verde':   [27.9,  -82.5],  // Tampa, FL
  'congo_dr':     [29.7,  -95.4],  // Houston, TX
  'south_africa': [20.1,  -98.7],  // Pachuca, MX
  'south_korea':  [20.7, -103.4],  // Guadalajara, MX
  'japan':        [36.2,  -86.8],  // Nashville, TN
  'australia':    [37.8, -122.3],  // Oakland, CA
  'iran':         [32.2, -110.9],  // Tucson, AZ
  'saudi_arabia': [30.3,  -97.7],  // Austin, TX
  'qatar':        [34.4, -119.7],  // Santa Barbara, CA
  'iraq':         [37.8,  -80.3],  // White Sulphur Springs, WV
  'uzbekistan':   [33.8,  -84.4],  // Atlanta, GA (Atlanta United Training Center)
  'jordan':       [45.5, -122.7],  // Portland, OR
  'new_zealand':  [32.7, -117.2],  // San Diego, CA
  'haiti':        [39.5,  -74.5],  // Galloway, NJ
}

// Konföderation → typische Camp-Region in Nordamerika
const CONF_DEFAULT_CAMP: Record<string, [number, number]> = {
  'UEFA':     [38.5,  -77.0],  // East Coast USA (häufige Wahl EU-Teams)
  'CAF':      [38.5,  -77.0],  // East Coast USA
  'CONMEBOL': [25.5,  -80.0],  // South Florida (Nähe zu Südamerika)
  'CONCACAF': [29.0,  -98.0],  // Texas / Südliche USA
  'AFC':      [37.5, -122.0],  // West Coast USA
  'OFC':      [37.5, -122.0],  // West Coast USA
}

// Venue-Koordinaten (Lat, Lng)
const VENUE_COORDS: Record<string, [number, number]> = {
  dallas:       [32.7,  -97.1],
  miami:        [25.9,  -80.2],
  los_angeles:  [33.9, -118.3],
  houston:      [29.7,  -95.4],
  new_york:     [40.8,  -74.1],
  toronto:      [43.6,  -79.4],
  vancouver:    [49.3, -123.1],
  mexico_city:  [19.4,  -99.2],
  guadalajara:  [20.7, -103.4],
  monterrey:    [25.7, -100.3],
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function travelDistanceInNA(teamId: string, conf: string, venueId: string): number {
  const camp = TEAM_BASE_CAMPS[teamId] ?? CONF_DEFAULT_CAMP[conf] ?? [38.5, -77.0]
  const venue = VENUE_COORDS[venueId]
  if (!venue) return 1000
  return haversineKm(camp[0], camp[1], venue[0], venue[1])
}

// Poisson-basierte Wahrscheinlichkeiten aus Expected Goals
function poissonWinProbs(lambdaA: number, lambdaB: number): { winA: number; draw: number; winB: number } {
  const MAX = 10
  const pmf = (lambda: number, k: number): number => {
    if (lambda <= 0) return k === 0 ? 1 : 0
    let logP = k * Math.log(lambda) - lambda
    for (let i = 1; i <= k; i++) logP -= Math.log(i)
    return Math.exp(logP)
  }
  let winA = 0, draw = 0, winB = 0
  for (let i = 0; i <= MAX; i++) {
    for (let j = 0; j <= MAX; j++) {
      const p = pmf(lambdaA, i) * pmf(lambdaB, j)
      if (i > j) winA += p
      else if (i === j) draw += p
      else winB += p
    }
  }
  const total = winA + draw + winB
  return { winA: winA / total, draw: draw / total, winB: winB / total }
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

// ─── Restdays Helper ──────────────────────────────────────────────────────────

function getLastMatchDate(teamId: string, currentMatchDate: string): string | null {
  return GROUP_SCHEDULE
    .filter(m => m.round === 'group' && m.date < currentMatchDate && (m.teamAId === teamId || m.teamBId === teamId))
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null
}

// ─── Match Analysis (Faktor-Aufschlüsselung) ──────────────────────────────────

export interface MatchFactor {
  category: 'elo' | 'squad' | 'context' | 'experience'
  label: string
  source: string
  valueA: string
  valueB: string
  effectA: number   // linear % effect for UI display (derived from logEffectA)
  effectB: number
  // NEU: Beitrag zu log(lambda) — mathematisch korrekte Darstellung
  logEffectA: number
  logEffectB: number
  // Datenqualität & Kalibrierung
  confidence: number    // 0..1: wie verlässlich sind die Eingabedaten für diesen Faktor?
  isCalibrated: boolean // wurde dieser Koeffizient gegen historische Daten validiert?
  explanation: string
}

export interface SquadSummary {
  count: number
  totalMarketValueM: number
  avgXgPer90Attack?: number     // market-value-weighted xG/90 of FWD+MID
  avgXaPer90Attack?: number     // market-value-weighted xA/90 of FWD+MID (Kreativität)
  avgXgaPer90Defense?: number   // market-value-weighted xGA/90 of DEF+GK
  avgDefenseScore?: number      // composite 0-100: xGA + Tackles + Clearances + GC
  avgRating?: number            // average player rating (1–100) of effective players
  avgMatchRating?: number       // avg Sofascore match rating (0–10) — recent form signal
  tournamentGoals?: number      // WM-2026-Tore der effektiven Spieler — Torschützen-Form
  avgAge?: number               // average age of effective players
  dataQuality?: DataQualityScore
}

export interface TeamPressure {
  mustWin: boolean
  canDraw: boolean
  alreadyThrough: boolean
  alreadyOut: boolean
}

export interface MatchAnalysis {
  matchId: string
  teamA: TeamBasic
  teamB: TeamBasic
  venueId: string
  venueName: string
  venueCity: string
  winProbA: number
  drawProb: number
  winProbB: number
  expectedGoalsA: number
  expectedGoalsB: number
  suggestedTip: '1' | 'X' | '2'
  suggestedScoreA: number
  suggestedScoreB: number
  confidence: 'very_high' | 'high' | 'medium' | 'low'
  factors: MatchFactor[]
  squadDataA: boolean
  squadDataB: boolean
  pressureA?: TeamPressure
  pressureB?: TeamPressure
  // Phase 2: DataQuality + Regression zur Mitte
  dataQualityA: DataQualityScore | null
  dataQualityB: DataQualityScore | null
  regressionWeight: number  // 0..1: 0=keine Regression, 1=volle Regression (33/33/33)
}

export function analyzeMatch(
  match: ScheduledMatch,
  squadData?: Record<string, SquadSummary>,
  pressure?: { A: TeamPressure; B: TeamPressure },
  eloOverrides?: Record<string, number>,
  eloSources?: Record<string, string>
): MatchAnalysis {
  const teamA = TEAM_BY_ID[match.teamAId]
  const teamB = TEAM_BY_ID[match.teamBId]
  const venue = VENUES[match.venueId] ?? VENUES['new_york']

  if (!teamA || !teamB) {
    return {
      matchId: match.id, teamA: teamA ?? { id: match.teamAId, name: match.teamAId, flag: '🏳' } as TeamBasic,
      teamB: teamB ?? { id: match.teamBId, name: match.teamBId, flag: '🏳' } as TeamBasic,
      venueId: match.venueId, venueName: venue.name, venueCity: venue.city,
      winProbA: 0.33, drawProb: 0.34, winProbB: 0.33,
      expectedGoalsA: 1.3, expectedGoalsB: 1.3,
      suggestedTip: 'X', suggestedScoreA: 1, suggestedScoreB: 1, confidence: 'low', factors: [],
      squadDataA: false, squadDataB: false,
      dataQualityA: null, dataQualityB: null, regressionWeight: 1,
    }
  }

  const factors: MatchFactor[] = []

  // Use override ELO if available, otherwise fall back to static
  const eloA = eloOverrides?.[match.teamAId] ?? teamA.eloRating ?? 1500
  const eloB = eloOverrides?.[match.teamBId] ?? teamB.eloRating ?? 1500
  // Real source from DB (passed via eloSources) takes priority over heuristic
  const eloSrcA = eloSources?.[match.teamAId] ?? (eloOverrides?.[match.teamAId] != null ? 'unknown' : null)
  const eloSrcB = eloSources?.[match.teamBId] ?? (eloOverrides?.[match.teamBId] != null ? 'unknown' : null)
  const eloSrc = eloSrcA ?? eloSrcB ?? null
  const eloConfidence = (eloSrc?.startsWith('eloratings.net') || eloSrc?.startsWith('csv-')) ? 0.90
    : eloSrc === 'wikipedia-elo' ? 0.85
    : eloSrc === 'manual-text' ? 0.80
    : eloSrc === 'manual-datenmodell' ? 0.75
    : eloSrc === 'fallback-apr2025' ? 0.55
    : eloSrc === 'unknown' ? 0.60
    : 0.40  // static allTeams default

  // 1. ELO-Rating (Hvattum & Arntzen 2010)
  const eloDiff = eloA - eloB
  const eloLogEffectA = clampLogEffect(MODEL_WEIGHTS.elo * eloDiff, 0.35)
  factors.push({
    category: 'elo',
    label: 'ELO-Rating',
    source: 'Hvattum & Arntzen (2010)',
    valueA: String(eloA),
    valueB: String(eloB),
    logEffectA: eloLogEffectA,
    logEffectB: -eloLogEffectA,
    effectA: logEffectToLinear(eloLogEffectA),
    effectB: logEffectToLinear(-eloLogEffectA),
    confidence: eloConfidence,
    isCalibrated: false,
    explanation: 'Höheres ELO-Rating bedeutet statistisch mehr Expected Goals. Differenz von 400 Punkten entspricht ~15% mehr Torchancen.',
  })

  // 2. Kader-Marktwert (Peeters 2018)
  // Fallback auf allTeams.squadMarketValueM wenn keine DB-Kaderdaten vorhanden
  const hasSquadA = (squadData?.[match.teamAId]?.count ?? 0) > 0
  const hasSquadB = (squadData?.[match.teamBId]?.count ?? 0) > 0
  const mvA = hasSquadA ? squadData![match.teamAId].totalMarketValueM : (teamA.squadMarketValueM ?? 0)
  const mvB = hasSquadB ? squadData![match.teamBId].totalMarketValueM : (teamB.squadMarketValueM ?? 0)
  const mvConfidence = hasSquadA && hasSquadB ? 0.80 : hasSquadA || hasSquadB ? 0.55 : 0.40
  const mvRatio = mvA > 0 && mvB > 0 ? Math.log(mvA / mvB) / Math.log(10) : 0
  const mvLogEffectA = clampLogEffect(MODEL_WEIGHTS.marketValueLog * mvRatio)
  factors.push({
    category: 'squad',
    label: 'Kader-Marktwert',
    source: 'Peeters (2018) – Log-normalisierung',
    valueA: `${Math.round(mvA)}M€${hasSquadA ? '' : ' (Schätzung)'}`,
    valueB: `${Math.round(mvB)}M€${hasSquadB ? '' : ' (Schätzung)'}`,
    logEffectA: mvLogEffectA,
    logEffectB: -mvLogEffectA,
    effectA: logEffectToLinear(mvLogEffectA),
    effectB: logEffectToLinear(-mvLogEffectA),
    confidence: mvConfidence,
    isCalibrated: false,
    explanation: hasSquadA && hasSquadB
      ? 'Log-normalisierter Kader-Marktwert als Proxy für Spielerqualität. Teuerere Kader haben im Schnitt mehr Torchancen.'
      : 'Marktwert-Schätzung aus Verbandsdaten (kein vollständiger Kader eingetragen).',
  })

  // 2b. Kader-Saisonform / xG per 90 (FBref)
  const hasFormA = (squadData?.[match.teamAId]?.avgXgPer90Attack ?? 0) > 0
  const hasFormB = (squadData?.[match.teamBId]?.avgXgPer90Attack ?? 0) > 0

  if (hasFormA || hasFormB) {
    const xgAttackA = squadData?.[match.teamAId]?.avgXgPer90Attack ?? 0
    const xgAttackB = squadData?.[match.teamBId]?.avgXgPer90Attack ?? 0
    const defA = squadData?.[match.teamAId]?.avgXgaPer90Defense ?? 0
    const defB = squadData?.[match.teamBId]?.avgXgaPer90Defense ?? 0

    // Net effect in log-space: own attack quality vs opponent defense quality
    const attackLogDiff = hasFormA && hasFormB ? (xgAttackA - xgAttackB) * MODEL_WEIGHTS.xgAttack : 0
    const defLogDiff = hasFormA && hasFormB ? (defB - defA) * MODEL_WEIGHTS.xgDefense : 0  // lower xGA = better defense
    const formLogEffectA = clampLogEffect(attackLogDiff + defLogDiff, 0.10)

    factors.push({
      category: 'squad',
      label: 'Saisonform xG/90',
      source: 'FotMob – Saison 2025/26 (ligabereinigt)',
      valueA: hasFormA ? `${xgAttackA.toFixed(2)} xG/90 Angriff` : 'Keine Daten',
      valueB: hasFormB ? `${xgAttackB.toFixed(2)} xG/90 Angriff` : 'Keine Daten',
      logEffectA: formLogEffectA,
      logEffectB: -formLogEffectA,
      effectA: logEffectToLinear(formLogEffectA),
      effectB: logEffectToLinear(-formLogEffectA),
      confidence: (hasFormA && hasFormB) ? 0.75 : 0.0,
      isCalibrated: false,
      explanation: 'Ligabereinigte Expected Goals pro 90 min der Angreifer+Mittelfeldspieler (FotMob 2025/26). xGA der Verteidiger als Defensiv-Proxy (niedriger = besser).',
    })
  }

  // 2b-ii. xA/90 Kreativität (Torvorlage-Erwartung, sekundäres Angriffssignal)
  const xaA = squadData?.[match.teamAId]?.avgXaPer90Attack ?? 0
  const xaB = squadData?.[match.teamBId]?.avgXaPer90Attack ?? 0
  if (xaA > 0 || xaB > 0) {
    const xaLogEffectA = clampLogEffect((xaA - xaB) * MODEL_WEIGHTS.xaAttack, 0.06)
    factors.push({
      category: 'squad',
      label: 'Kreativität xA/90',
      source: 'FotMob – Saison 2025/26 (ligabereinigt)',
      valueA: xaA > 0 ? `${xaA.toFixed(2)} xA/90` : 'Keine Daten',
      valueB: xaB > 0 ? `${xaB.toFixed(2)} xA/90` : 'Keine Daten',
      logEffectA: xaLogEffectA,
      logEffectB: -xaLogEffectA,
      effectA: logEffectToLinear(xaLogEffectA),
      effectB: logEffectToLinear(-xaLogEffectA),
      confidence: (xaA > 0 && xaB > 0) ? 0.65 : 0.0,
      isCalibrated: false,
      explanation: 'Expected Assists pro 90 min (FotMob xA). Misst Kreativität und Chance-Kreierung — ergänzt xG um die Qualität der Vorlagen.',
    })
  }

  // 2b-iii. Defensiv-Score (xGA + Tackles + Clearances + GK Goals Conceded, 0–100)
  const defScoreA = squadData?.[match.teamAId]?.avgDefenseScore ?? null
  const defScoreB = squadData?.[match.teamBId]?.avgDefenseScore ?? null
  if (defScoreA !== null || defScoreB !== null) {
    const dA = defScoreA ?? 50
    const dB = defScoreB ?? 50
    const defScoreLogEffectA = clampLogEffect(MODEL_WEIGHTS.defenseScore * (dA - dB) / 100, 0.06)
    factors.push({
      category: 'squad',
      label: 'Defensiv-Score (Spielerdaten)',
      source: 'FotMob – Tackles, Clearances, xGA, GK Goals Conceded 2025/26',
      valueA: defScoreA !== null ? `${dA.toFixed(0)}/100` : 'Keine Daten',
      valueB: defScoreB !== null ? `${dB.toFixed(0)}/100` : 'Keine Daten',
      logEffectA: defScoreLogEffectA,
      logEffectB: -defScoreLogEffectA,
      effectA: logEffectToLinear(defScoreLogEffectA),
      effectB: logEffectToLinear(-defScoreLogEffectA),
      confidence: (defScoreA !== null && defScoreB !== null) ? 0.70 : 0.0,
      isCalibrated: false,
      explanation: 'Composite-Score 0–100 aus: xGA/90 der Verteidiger (50%), Tackles/90 (30%), Clearances/90 (20%) für DEF; GK: Goals Conceded/90 (60%) + xGA (40%). Market-Value gewichtet. Höher = bessere Defensive.',
    })
  }

  // 2c-form. Sofascore Formfaktor — nur wenn mindestens ein Team echte Match-Ratings hat
  const formRatingA = squadData?.[match.teamAId]?.avgMatchRating ?? null
  const formRatingB = squadData?.[match.teamBId]?.avgMatchRating ?? null
  if (formRatingA !== null || formRatingB !== null) {
    const BASELINE = 6.5
    const rA = formRatingA ?? BASELINE
    const rB = formRatingB ?? BASELINE
    const formLogEffectA = clampLogEffect(MODEL_WEIGHTS.matchRating * ((rA - BASELINE) - (rB - BASELINE)), 0.12)
    factors.push({
      category: 'squad',
      label: 'Aktuelle Form (Sofascore)',
      source: 'Sofascore Match-Ratings WM 2026',
      valueA: formRatingA !== null ? `Ø ${rA.toFixed(2)}` : 'Keine Daten',
      valueB: formRatingB !== null ? `Ø ${rB.toFixed(2)}` : 'Keine Daten',
      logEffectA: formLogEffectA,
      logEffectB: -formLogEffectA,
      effectA: logEffectToLinear(formLogEffectA),
      effectB: logEffectToLinear(-formLogEffectA),
      confidence: (formRatingA !== null && formRatingB !== null) ? 0.70 : 0.40,
      isCalibrated: false,
      explanation: 'Durchschnittliche Sofascore-Bewertung der Spieler aus dem letzten WM-Spiel. Baseline 6.5 — Teams über/unter diesem Wert erhalten einen kleinen Form-Bonus/-Malus.',
    })
  }

  // 2c-goals. Torschützen-Form — Turniertore der effektiven Elf (klein, gedeckelt)
  const tGoalsA = squadData?.[match.teamAId]?.tournamentGoals ?? 0
  const tGoalsB = squadData?.[match.teamBId]?.tournamentGoals ?? 0
  if (tGoalsA > 0 || tGoalsB > 0) {
    const goalsLogEffectA = clampLogEffect(MODEL_WEIGHTS.tournamentGoals * (tGoalsA - tGoalsB), 0.08)
    factors.push({
      category: 'squad',
      label: 'Torschützen in Form',
      source: 'WM-2026-Tore der aufgestellten Spieler',
      valueA: `${tGoalsA} Tor(e)`,
      valueB: `${tGoalsB} Tor(e)`,
      logEffectA: goalsLogEffectA,
      logEffectB: -goalsLogEffectA,
      effectA: logEffectToLinear(goalsLogEffectA),
      effectB: logEffectToLinear(-goalsLogEffectA),
      confidence: 0.60,
      isCalibrated: false,
      explanation: 'Spieler, die im Turnier bereits getroffen haben, stehen für Abschlussform. Kleiner Bonus pro Tordifferenz der effektiven Elf, gedeckelt auf ±0.08 Log-Effekt.',
    })
  }

  // 2d. Altersstruktur der Startelf
  const avgAgeA = squadData?.[match.teamAId]?.avgAge
  const avgAgeB = squadData?.[match.teamBId]?.avgAge
  if (avgAgeA && avgAgeB) {
    // Optimal WM age: 25–28. Too young (<24) = less experience; too old (>29) = fatigue
    const ageLogScore = (age: number) =>
      age < 24 ? -(24 - age) * MODEL_WEIGHTS.avgAge.youngPenaltyPerYear
      : age > 29 ? -(age - 29) * MODEL_WEIGHTS.avgAge.oldPenaltyPerYear
      : 0
    const ageLogA = ageLogScore(avgAgeA)
    const ageLogB = ageLogScore(avgAgeB)
    // Net log-effect for team A relative to team B
    const netAgeLogA = clampLogEffect(ageLogA - ageLogB * 0.3, 0.10)
    const netAgeLogB = clampLogEffect(ageLogB - ageLogA * 0.3, 0.10)
    const netEffect = netAgeLogA - netAgeLogB
    if (Math.abs(netEffect) > 0.005 || Math.abs(ageLogA) > 0.005 || Math.abs(ageLogB) > 0.005) {
      factors.push({
        category: 'squad',
        label: 'Altersstruktur Startelf',
        source: 'Empirische Studienlage – WM-Peakformkurve 25–28 J.',
        valueA: `Ø ${avgAgeA.toFixed(1)} Jahre`,
        valueB: `Ø ${avgAgeB.toFixed(1)} Jahre`,
        logEffectA: netAgeLogA,
        logEffectB: netAgeLogB,
        effectA: logEffectToLinear(netAgeLogA),
        effectB: logEffectToLinear(netAgeLogB),
        confidence: 0.65,
        isCalibrated: false,
        explanation: 'Teams mit Startelf-Durchschnittsalter 25–28 Jahre sind bei WM-Turnieren am leistungsfähigsten. Zu jung (<24) = fehlende Großturnier-Erfahrung; zu alt (>30) = erhöhte Verletzungsanfälligkeit.',
      })
    }
  }

  // 3. Heimvorteil (Pollard 1986)
  const isHostA = ['usa', 'canada', 'mexico'].includes(match.teamAId)
  const isHostB = ['usa', 'canada', 'mexico'].includes(match.teamBId)
  if (isHostA || isHostB) {
    const hostLogA = isHostA ? MODEL_WEIGHTS.host : 0
    const hostLogB = isHostB ? MODEL_WEIGHTS.host : 0
    factors.push({
      category: 'context',
      label: 'Gastgeberland-Heimvorteil',
      source: 'Pollard (1986) – Home Advantage',
      valueA: isHostA ? 'Gastgeber ✓' : '–',
      valueB: isHostB ? 'Gastgeber ✓' : '–',
      logEffectA: hostLogA,
      logEffectB: hostLogB,
      effectA: logEffectToLinear(hostLogA),
      effectB: logEffectToLinear(hostLogB),
      confidence: 0.75,
      isCalibrated: false,
      explanation: 'Gastgebernationen (USA, Mexiko, Kanada) profitieren von Heimvorteil durch bekannte Umgebung, Fans und Atmosphäre (+4%).',
    })
  }

  // 4. Spielort-Höhe (McSharry 2007)
  const altitude = venue.altitudeMeters
  const heatAdaptA = inferHeatAdaptation(teamA.confederation)
  const heatAdaptB = inferHeatAdaptation(teamB.confederation)
  // Teams aus Hochlagen-Nationen haben keinen Akklimatisierungs-Nachteil bei Höhenspielen
  const altAccA = HIGH_ALTITUDE_NATIONS.has(match.teamAId) ? 1.0 : 0.0
  const altAccB = HIGH_ALTITUDE_NATIONS.has(match.teamBId) ? 1.0 : 0.0
  const altLogPenaltyBase = altitude > 1500 ? MODEL_WEIGHTS.altitude * (altitude - 1500) / 1000 : 0
  // penalty scaled by: (1 − altitude_acclimatization) * (1 − heat_adaptation * 0.3)
  const altLogA = clampLogEffect(altLogPenaltyBase * (1 - altAccA) * (1 - heatAdaptA * 0.3), 0.12)
  const altLogB = clampLogEffect(altLogPenaltyBase * (1 - altAccB) * (1 - heatAdaptB * 0.3), 0.12)
  const altValueA = altAccA > 0 ? `Heimvorteil Höhe (gewohnt)` : `Gewohnt ~200m`
  const altValueB = altAccB > 0 ? `Heimvorteil Höhe (gewohnt)` : `Gewohnt ~200m`
  factors.push({
    category: 'context',
    label: 'Spielort-Höhe',
    source: 'McSharry (2007) – Altitude & Performance',
    valueA: altValueA,
    valueB: altValueB,
    logEffectA: altLogA,
    logEffectB: altLogB,
    effectA: logEffectToLinear(altLogA),
    effectB: logEffectToLinear(altLogB),
    confidence: 0.70,
    isCalibrated: false,
    explanation: `Höhe ${altitude}m. Ab 1500m sinkt Sauerstoffversorgung für nicht akklimatisierte Teams. Teams aus Hochlagen-Nationen (Mexiko, Kolumbien, Ecuador etc.) haben keinen Nachteil.`,
  })

  // 5. Hitze/WBGT (Mohr et al. 2012)
  const wbgt = venue.estimatedWBGT
  const heatLogBase = wbgt > 28 ? MODEL_WEIGHTS.heat * (wbgt - 28) : 0
  if (Math.abs(heatLogBase) > 0.005) {
    const heatLogA = clampLogEffect(heatLogBase * (1 - heatAdaptA), 0.08)
    const heatLogB = clampLogEffect(heatLogBase * (1 - heatAdaptB), 0.08)
    factors.push({
      category: 'context',
      label: 'Hitze-Belastung (WBGT)',
      source: 'Mohr et al. (2012) – WBGT & Physical Performance',
      valueA: teamA.confederation === 'CAF' || teamA.confederation === 'AFC' ? 'Gut adaptiert' : 'Wenig adaptiert',
      valueB: teamB.confederation === 'CAF' || teamB.confederation === 'AFC' ? 'Gut adaptiert' : 'Wenig adaptiert',
      logEffectA: heatLogA,
      logEffectB: heatLogB,
      effectA: logEffectToLinear(heatLogA),
      effectB: logEffectToLinear(heatLogB),
      confidence: 0.65,
      isCalibrated: false,
      explanation: `WBGT ${wbgt}°C. Hitzebelastung über 28°C reduziert physische Leistung. Teams aus heißen Klimazonen sind besser adaptiert.`,
    })
  }

  // 6. Reisedistanz innerhalb Nordamerikas (Reilly et al. 2007)
  // Teams reisen während des Turniers vom Trainingscamp (in NA) zum Spielort.
  // Fernreise vom Heimatland → bereits vor Turnierstart abgeschlossen.
  const travelA = travelDistanceInNA(match.teamAId, teamA.confederation, match.venueId)
  const travelB = travelDistanceInNA(match.teamBId, teamB.confederation, match.venueId)
  const knownCampA = match.teamAId in TEAM_BASE_CAMPS
  const knownCampB = match.teamBId in TEAM_BASE_CAMPS
  // Signifikante Ermüdung ab 1500 km innerhalb NA (log-scale)
  const travelLogA = travelA > 1500 ? clampLogEffect(MODEL_WEIGHTS.travel * (travelA - 1500), 0.04) : 0
  const travelLogB = travelB > 1500 ? clampLogEffect(MODEL_WEIGHTS.travel * (travelB - 1500), 0.04) : 0
  factors.push({
    category: 'context',
    label: 'Reisedistanz (Camp → Spielort)',
    source: 'Reilly et al. (2007) – Travel Fatigue',
    valueA: `~${Math.round(travelA / 50) * 50} km${knownCampA ? '' : ' (Schätzung)'}`,
    valueB: `~${Math.round(travelB / 50) * 50} km${knownCampB ? '' : ' (Schätzung)'}`,
    logEffectA: travelLogA,
    logEffectB: travelLogB,
    effectA: logEffectToLinear(travelLogA),
    effectB: logEffectToLinear(travelLogB),
    confidence: knownCampA && knownCampB ? 0.70 : 0.40,
    isCalibrated: false,
    explanation: 'Abstand vom Trainingscamp in Nordamerika zum Spielort. Über 1500 km sinkt die Regeneration messbar. ⚠ Trainingscamp-Standorte ohne bekannte Daten sind Schätzwerte — bitte Standorte mitteilen.',
  })

  // 8. Turnier-Erfahrung — consolidated into heritageLogA/B in corePredict (no separate expDiff factor)
  // expLogA was removed to fix double-counting with heritageLogA/B (both functions of titles + appearances)
  factors.push({
    category: 'experience',
    label: 'WM-Erfahrung & Turnier-Mentalität',
    source: 'Konsolidiert in Heritage-Faktor (Doppelzählung entfernt)',
    valueA: `${teamA.worldCupTitles} Titel, ${teamA.worldCupAppearances}× dabei`,
    valueB: `${teamB.worldCupTitles} Titel, ${teamB.worldCupAppearances}× dabei`,
    logEffectA: 0,
    logEffectB: 0,
    effectA: 0,
    effectB: 0,
    confidence: 0.60,
    isCalibrated: true,
    explanation: 'WM-Erfahrung fließt über den Heritage-Faktor ein (heritageLogA/B). Separate expLogA-Komponente wurde entfernt, um Doppelzählung zu vermeiden.',
  })

  // 9. Kader-Qualität: Attack vs Defense (Maher 1982)
  // Nur aktiv wenn KEIN FotMob-Datensatz vorhanden — verhindert Doppelzählung mit xG-Faktor.
  // Wenn beide Teams FotMob-xG-Daten haben, wird dieser Faktor durch xG/90 + Defensiv-Score abgedeckt.
  if (!hasFormA && !hasFormB) {
    const attackDiffA = (teamA.attackRating - teamB.defenseRating) / 100
    const attackDiffB = (teamB.attackRating - teamA.defenseRating) / 100
    const attackLogEffectA = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffA)
    const attackLogEffectB = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffB)
    factors.push({
      category: 'squad',
      label: 'Angriff vs. Abwehr (Ratings)',
      source: 'Maher (1982) – Fallback wenn keine FotMob-Daten',
      valueA: `Angriff ${teamA.attackRating} vs. Abwehr ${teamB.defenseRating}`,
      valueB: `Angriff ${teamB.attackRating} vs. Abwehr ${teamA.defenseRating}`,
      logEffectA: attackLogEffectA,
      logEffectB: attackLogEffectB,
      effectA: logEffectToLinear(attackLogEffectA),
      effectB: logEffectToLinear(attackLogEffectB),
      confidence: 0.45,
      isCalibrated: false,
      explanation: 'Maher-Modell: Angriffsstärke gegen Defensivstärke — nur wenn keine FotMob-Spielerdaten vorhanden (vermeidet Doppelzählung mit xG/90).',
    })
  }

  // 9b. Standards / Set-Pieces (~28% aller WM-Tore)
  {
    const spDiff = (teamA.setPieceRating - teamB.setPieceRating) / 100
    const spLogA = clampLogEffect(MODEL_WEIGHTS.setPiece * spDiff, 0.10)
    const spLogB = clampLogEffect(-MODEL_WEIGHTS.setPiece * spDiff, 0.10)
    if (Math.abs(spDiff) > 0.05) {
      factors.push({
        category: 'squad',
        label: 'Standards & Set-Pieces',
        source: 'Set-Piece-Rating (allTeams)',
        valueA: `Set-Piece-Rating ${teamA.setPieceRating}`,
        valueB: `Set-Piece-Rating ${teamB.setPieceRating}`,
        logEffectA: spLogA,
        logEffectB: spLogB,
        effectA: logEffectToLinear(spLogA),
        effectB: logEffectToLinear(spLogB),
        confidence: 0.55,
        isCalibrated: false,
        explanation: `Ca. 28% aller Tore entstehen aus Standards. Teams mit höherem Set-Piece-Rating (Freistöße, Ecken, Einwürfe) erzielen statistisch mehr Tore aus ruhenden Bällen.`,
      })
    }
  }

  // 10. Diaspora-Support
  const diasA = hasDiasporaSupport(match.teamAId, match.venueId)
  const diasB = hasDiasporaSupport(match.teamBId, match.venueId)
  if (diasA || diasB) {
    const diasLogA = diasA ? MODEL_WEIGHTS.diaspora : 0
    const diasLogB = diasB ? MODEL_WEIGHTS.diaspora : 0
    factors.push({
      category: 'context',
      label: 'Diaspora-Fanunterstützung',
      source: 'Pollard (1986) – Crowd & Diaspora Effects',
      valueA: diasA ? 'Starke Unterstützung ✓' : '–',
      valueB: diasB ? 'Starke Unterstützung ✓' : '–',
      logEffectA: diasLogA,
      logEffectB: diasLogB,
      effectA: logEffectToLinear(diasLogA),
      effectB: logEffectToLinear(diasLogB),
      confidence: 0.60,
      isCalibrated: false,
      explanation: 'Teams mit großer Diaspora am Spielort (z.B. Mexiko in LA) profitieren von lokaler Fanunterstützung.',
    })
  }

  // 11. Ausgangslage / Motivation / Rotation
  if (pressure) {
    // Rotation: already qualified → -10% xG (resting key players)
    // Must win: aggressive play → +5% xG
    // Already out: nothing to lose → +3% xG
    const motivLogA = pressure.A.alreadyThrough ? MOTIVATION_WEIGHTS.alreadyThrough
      : pressure.A.mustWin ? MOTIVATION_WEIGHTS.mustWin
      : pressure.A.alreadyOut ? MOTIVATION_WEIGHTS.alreadyOut
      : 0
    const motivLogB = pressure.B.alreadyThrough ? MOTIVATION_WEIGHTS.alreadyThrough
      : pressure.B.mustWin ? MOTIVATION_WEIGHTS.mustWin
      : pressure.B.alreadyOut ? MOTIVATION_WEIGHTS.alreadyOut
      : 0
    const labelA = pressure.A.alreadyOut ? 'Ausgeschieden'
      : pressure.A.alreadyThrough ? 'Qualifiziert — Rotation wahrscheinlich'
      : pressure.A.mustWin ? 'Muss gewinnen'
      : 'Normaler Druck'
    const labelB = pressure.B.alreadyOut ? 'Ausgeschieden'
      : pressure.B.alreadyThrough ? 'Qualifiziert — Rotation wahrscheinlich'
      : pressure.B.mustWin ? 'Muss gewinnen'
      : 'Normaler Druck'
    factors.push({
      category: 'context',
      label: 'Ausgangslage / Motivation / Rotation',
      source: 'Gruppenstand (live)',
      valueA: labelA,
      valueB: labelB,
      logEffectA: motivLogA,
      logEffectB: motivLogB,
      effectA: logEffectToLinear(motivLogA),
      effectB: logEffectToLinear(motivLogB),
      confidence: 0.70,
      isCalibrated: false,
      explanation: 'Bereits qualifizierte Teams schonen Stammspieler (Rotation: −10% xG). Teams die gewinnen müssen, spielen aggressiver (+5%). Teams ohne Chance spielen offener (+3%).',
    })
  }

  // Spielrhythmus / Ruhetage
  const lastA = getLastMatchDate(match.teamAId, match.date)
  const lastB = getLastMatchDate(match.teamBId, match.date)
  const daysA = lastA ? Math.floor((new Date(match.date).getTime() - new Date(lastA).getTime()) / 86400000) : 10
  const daysB = lastB ? Math.floor((new Date(match.date).getTime() - new Date(lastB).getTime()) / 86400000) : 10
  // Less than 4 days rest → fatigue penalty (log-scale)
  const restLogA = daysA < 4 ? MODEL_WEIGHTS.restDays.under4 : daysA < 5 ? MODEL_WEIGHTS.restDays.under5 : 0
  const restLogB = daysB < 4 ? MODEL_WEIGHTS.restDays.under4 : daysB < 5 ? MODEL_WEIGHTS.restDays.under5 : 0
  if (restLogA < 0 || restLogB < 0) {
    factors.push({
      category: 'context',
      label: 'Spielrhythmus / Erholung',
      source: 'FIFA-Spielplan (eigene Berechnung)',
      valueA: lastA ? `${daysA} Tage Pause` : 'Erstes Spiel',
      valueB: lastB ? `${daysB} Tage Pause` : 'Erstes Spiel',
      logEffectA: restLogA,
      logEffectB: restLogB,
      effectA: logEffectToLinear(restLogA),
      effectB: logEffectToLinear(restLogB),
      confidence: 0.75,
      isCalibrated: false,
      explanation: 'Weniger als 4 Tage Erholung seit dem letzten Gruppenspiel reduziert die körperliche Verfassung messbar (Studienlage: Drust et al. 2007).',
    })
  }

  // Turnier-Erbe: nicht in OOS-Kalibrierung bestätigt → heritageScale=0 in Modellconfig
  // Faktor wird für UI-Transparenz angezeigt, hat aber logEffect=0 (fließt nicht in xG ein)
  {
    const heritageLogA = computeTournamentHeritage(teamA.worldCupTitles, teamA.worldCupAppearances)
    const heritageLogB = computeTournamentHeritage(teamB.worldCupTitles, teamB.worldCupAppearances)
    if (heritageLogA > 0.003 || heritageLogB > 0.003) {
      factors.push({
        category: 'experience',
        label: 'Turnier-Erbe (nicht kalibriert)',
        source: 'Forrest et al. (2005) – Heritage Premium',
        valueA: `${teamA.worldCupTitles}× Weltmeister, ${teamA.worldCupAppearances}× dabei`,
        valueB: `${teamB.worldCupTitles}× Weltmeister, ${teamB.worldCupAppearances}× dabei`,
        logEffectA: 0,  // heritageScale=0 — nicht in OOS bestätigt, kein Einfluss
        logEffectB: 0,
        effectA: 0,
        effectB: 0,
        confidence: 0.30,
        isCalibrated: false,
        explanation: `Turnier-Erfahrung (${teamA.worldCupTitles > 0 ? 'Brasilien/Deutschland etc.' : 'kein Titel'}) — in Walk-Forward OOS nicht signifikant. Kein Einfluss auf die Prognose (heritageScale=0).`,
      })
    }
  }

  // NEU: log-lambda Berechnung (Phase 1 — mathematisch korrekt)
  const logEffectsA = factors.map(f => f.logEffectA)
  const logEffectsB = factors.map(f => f.logEffectB)
  const xgA = computeLambda(MODEL_META.baseGoalRate, logEffectsA)
  const xgB = computeLambda(MODEL_META.baseGoalRate, logEffectsB)

  const rawMatrix = computeScorelineMatrix(xgA, xgB)
  const correctedMatrix = applyDixonColesCorrection(rawMatrix, xgA, xgB)
  const { winA: rawWinA, draw: rawDraw, winB: rawWinB } = aggregateOutcomeProbabilities(correctedMatrix)

  // Phase 2: Regression zur Mitte basierend auf kombinierter Datenqualität
  // ELO ist immer verfügbar (allTeams-Fallback) → floor bei 0.72 verhindert dass fehlende
  // Kaderdaten das ELO-Signal vollständig zunichte machen
  const qualityA = squadData?.[match.teamAId]?.dataQuality?.overall ?? 0.3
  const qualityB = squadData?.[match.teamBId]?.dataQuality?.overall ?? 0.3
  const ELO_QUALITY_FLOOR = 0.72  // ELO allein liefert ~72% Konfidenz; max. Regression = 28%
  const combinedQuality = Math.max(ELO_QUALITY_FLOOR, Math.min(qualityA, qualityB))
  // quality=1.0 → keine Regression; quality=0.72 → 28% Regression (max ohne Kaderdaten)
  const regressionWeight = 1 - combinedQuality
  const uniform = 1 / 3
  const winA = rawWinA * (1 - regressionWeight) + uniform * regressionWeight
  const draw = rawDraw * (1 - regressionWeight) + uniform * regressionWeight
  const winB = rawWinB * (1 - regressionWeight) + uniform * regressionWeight

  // Tipp = wahrscheinlichster AUSGANG (1/X/2).
  // Hintergrund: Bei Poisson-Modellen ist 1-1 oft das häufigste Einzelergebnis (~13%),
  // obwohl der Sieg des Favoriten 50%+ Wahrscheinlichkeit hat (auf viele Scores verteilt).
  const suggestedTip: '1' | 'X' | '2' = winA >= draw && winA >= winB ? '1'
    : winB > draw && winB > winA ? '2'
    : 'X'
  const maxProb = suggestedTip === '1' ? winA : suggestedTip === '2' ? winB : draw

  // Vorgeschlagenes Ergebnis = wahrscheinlichstes Einzelergebnis KONSISTENT mit dem Tipp.
  // So passt "Schweden gewinnt" mit "2:1" zusammen statt widersprüchlich mit "1:1".
  let bestSI = 0, bestSJ = 0, bestSP = 0
  for (const row of correctedMatrix) {
    for (const cell of row) {
      const consistent = suggestedTip === '1' ? cell.goalsA > cell.goalsB
        : suggestedTip === '2' ? cell.goalsB > cell.goalsA
        : cell.goalsA === cell.goalsB
      if (consistent && cell.probability > bestSP) {
        bestSP = cell.probability; bestSI = cell.goalsA; bestSJ = cell.goalsB
      }
    }
  }
  const suggestedScoreA = bestSI
  const suggestedScoreB = bestSJ

  let confidence: 'very_high' | 'high' | 'medium' | 'low'
  if (maxProb >= 0.65) confidence = 'very_high'
  else if (maxProb >= 0.50) confidence = 'high'
  else if (maxProb >= 0.38) confidence = 'medium'
  else confidence = 'low'

  return {
    matchId: match.id, teamA, teamB,
    venueId: match.venueId, venueName: venue.name, venueCity: venue.city,
    winProbA: Math.round(winA * 1000) / 1000,
    drawProb: Math.round(draw * 1000) / 1000,
    winProbB: Math.round(winB * 1000) / 1000,
    expectedGoalsA: Math.round(xgA * 100) / 100,
    expectedGoalsB: Math.round(xgB * 100) / 100,
    suggestedTip, suggestedScoreA, suggestedScoreB, confidence, factors,
    squadDataA: hasSquadA,
    squadDataB: hasSquadB,
    pressureA: pressure?.A,
    pressureB: pressure?.B,
    dataQualityA: squadData?.[match.teamAId]?.dataQuality ?? null,
    dataQualityB: squadData?.[match.teamBId]?.dataQuality ?? null,
    regressionWeight: Math.round(regressionWeight * 100) / 100,
  }
}

export function analyzeAllMatches(
  squadData?: Record<string, SquadSummary>,
  eloOverrides?: Record<string, number>,
  eloSources?: Record<string, string>,
  results?: Record<string, { goals_a: number; goals_b: number }>
): MatchAnalysis[] {
  const standings = results ? computeGroupStandings(results) : {}
  return GROUP_SCHEDULE.map(m => {
    let pressure: { A: TeamPressure; B: TeamPressure } | undefined
    if (results && m.group) {
      const remainingMatchIds = GROUP_SCHEDULE
        .filter(mm => mm.group === m.group && !results[mm.id])
        .map(mm => mm.id)
      const pressureA = computePressure(m.teamAId, m.group, standings, remainingMatchIds, results)
      const pressureB = computePressure(m.teamBId, m.group, standings, remainingMatchIds, results)
      pressure = { A: pressureA, B: pressureB }
    }
    return analyzeMatch(m, squadData, pressure, eloOverrides, eloSources)
  })
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
  const eloDiff = teamA.eloRating - teamB.eloRating
  const eloLogA = clampLogEffect(MODEL_WEIGHTS.elo * eloDiff, 0.25)

  const mvA = Math.max(1, teamA.squadMarketValueM ?? 200)
  const mvB = Math.max(1, teamB.squadMarketValueM ?? 200)
  const mvLogA = clampLogEffect(MODEL_WEIGHTS.marketValueLog * Math.log(mvA / mvB) / Math.log(10))

  const lambdaA = computeLambda(MODEL_META.baseGoalRate, [eloLogA, mvLogA])
  const lambdaB = computeLambda(MODEL_META.baseGoalRate, [-eloLogA, -mvLogA])

  return {
    goalsA: poissonRandom(Math.max(0.2, Math.min(4, lambdaA))),
    goalsB: poissonRandom(Math.max(0.2, Math.min(4, lambdaB))),
  }
}

function simulateKOMatch(teamA: TeamBasic, teamB: TeamBasic): string {
  const { goalsA, goalsB } = simulateMatchScore(teamA, teamB)
  if (goalsA > goalsB) return teamA.id
  if (goalsB > goalsA) return teamB.id
  // Elfmeter: GK-Qualität + Angriff + Turnier-Erfahrung
  const skillsA = defaultPenaltySkills(teamA.goalkeeperRating, teamA.attackRating, teamA.worldCupAppearances)
  const skillsB = defaultPenaltySkills(teamB.goalkeeperRating, teamB.attackRating, teamB.worldCupAppearances)
  const { winProbabilityA } = computePenaltyWinProbability(skillsA, skillsB)
  return Math.random() < winProbabilityA ? teamA.id : teamB.id
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
