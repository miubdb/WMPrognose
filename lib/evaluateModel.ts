import { HISTORICAL_MATCHES, HistoricalMatch } from '@/src/data/historicalResults'
import { rps, logLoss, brierScore, RANDOM_RPS } from '@/lib/model/evaluation'
import { TEAM_BY_ID, TeamBasic } from '@/src/data/allTeams'
import { computeScorelineMatrix } from '@/src/model/poisson'
import { applyDixonColesCorrection, aggregateOutcomeProbabilities } from '@/src/model/dixonColes'
import { computeLambda, clampLogEffect } from '@/lib/model/logLambda'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'
import { computeTournamentHeritage } from '@/lib/model/coachScore'

// Name-zu-ID Mapping für historische Daten
// null = nicht bei WM 2026 → Fallback auf historische ELO-Werte aus Match-Record
const NAME_TO_ID: Record<string, string | null> = {
  'Germany': 'germany',
  'France': 'france',
  'Spain': 'spain',
  'Brazil': 'brazil',
  'Argentina': 'argentina',
  'England': 'england',
  'Portugal': 'portugal',
  'Netherlands': 'netherlands',
  'Belgium': 'belgium',
  'Croatia': 'croatia',
  'Denmark': null,         // nicht bei WM 2026
  'Switzerland': 'switzerland',
  'Uruguay': 'uruguay',
  'Mexico': 'mexico',
  'USA': 'usa',
  'Japan': 'japan',
  'South Korea': 'south_korea',
  'Australia': 'australia',
  'Canada': 'canada',
  'Morocco': 'morocco',
  'Senegal': 'senegal',
  'Ghana': 'ghana',
  'Cameroon': null,        // nicht bei WM 2026
  'Tunisia': 'tunisia',
  'Ecuador': 'ecuador',
  'Poland': null,          // nicht bei WM 2026
  'Serbia': null,          // nicht bei WM 2026
  'Iran': 'iran',
  'Qatar': 'qatar',
  'Saudi Arabia': 'saudi_arabia',
  'Costa Rica': null,      // nicht bei WM 2026
  'Wales': null,           // nicht bei WM 2026
}

/**
 * Erzeugt ein minimales TeamBasic-Objekt für Teams ohne WM-2026-Daten,
 * basierend ausschließlich auf dem historischen ELO-Wert.
 */
function makeMinimalTeam(elo: number): TeamBasic {
  return {
    id: `_historical_${elo}`,
    name: `Historical(${elo})`,
    flag: '',
    group: '',
    confederation: 'UEFA',
    eloRating: elo,
    overallRating: 70,
    attackRating: 70,
    defenseRating: 70,
    midfieldRating: 70,
    goalkeeperRating: 70,
    setPieceRating: 70,
    squadMarketValueM: 200,
    squadAvgAge: 27,
    coach: '',
    worldCupTitles: 0,
    worldCupAppearances: 5,
    hasDetailedData: false,
  }
}

/**
 * Löst ein Team auf: zuerst aus TEAM_BY_ID, bei null oder nicht vorhanden
 * aus dem historischen ELO-Wert im Match-Record.
 */
function resolveTeam(
  teamName: string,
  historicalElo: number | undefined
): TeamBasic | null {
  const id = NAME_TO_ID[teamName]
  if (id === undefined) return null      // unbekannter Teamname
  if (id !== null) {
    const team = TEAM_BY_ID[id]
    if (team) return team
  }
  // id === null oder TEAM_BY_ID lookup failed → Fallback auf historische ELO
  if (historicalElo !== undefined) return makeMinimalTeam(historicalElo)
  return null
}

/**
 * Berechnet [winA, draw, winB] für ein historisches Match
 * wahlweise mit vollem Modell oder als reines ELO-Baseline.
 */
function predictForTeams(
  teamA: TeamBasic,
  teamB: TeamBasic,
  eloOnlyMode = false
): [number, number, number] {
  const eloA = teamA.eloRating ?? 1500
  const eloB = teamB.eloRating ?? 1500
  const eloDiff = eloA - eloB
  const eloLogA = clampLogEffect(MODEL_WEIGHTS.elo * eloDiff, 0.25)

  let xgA: number
  let xgB: number

  if (eloOnlyMode) {
    // Nur ELO-Signal, keine weiteren Features
    xgA = computeLambda(MODEL_META.baseGoalRate, [eloLogA])
    xgB = computeLambda(MODEL_META.baseGoalRate, [-eloLogA])
  } else {
    const mvA = teamA.squadMarketValueM ?? 200
    const mvB = teamB.squadMarketValueM ?? 200
    const mvRatio = mvA > 0 && mvB > 0 ? Math.log(mvA / mvB) / Math.log(10) : 0
    const mvLogA = clampLogEffect(MODEL_WEIGHTS.marketValueLog * mvRatio)

    const expA = teamA.worldCupTitles * 3 + teamA.worldCupAppearances
    const expB = teamB.worldCupTitles * 3 + teamB.worldCupAppearances
    const expLogA = clampLogEffect(MODEL_WEIGHTS.experience * (expA - expB))

    // Absolute heritage bonus per team (independent of opponent)
    const heritageLogA = computeTournamentHeritage(teamA.worldCupTitles, teamA.worldCupAppearances)
    const heritageLogB = computeTournamentHeritage(teamB.worldCupTitles, teamB.worldCupAppearances)

    const attackDiffA = (teamA.attackRating - teamB.defenseRating) / 100
    const attackDiffB = (teamB.attackRating - teamA.defenseRating) / 100
    const attackLogA = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffA)
    const attackLogB = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffB)

    xgA = computeLambda(MODEL_META.baseGoalRate, [eloLogA, mvLogA, expLogA, heritageLogA, attackLogA])
    xgB = computeLambda(MODEL_META.baseGoalRate, [-eloLogA, -mvLogA, -expLogA, heritageLogB, attackLogB])
  }

  const rawMatrix = computeScorelineMatrix(xgA, xgB)
  const dcMatrix = applyDixonColesCorrection(rawMatrix, xgA, xgB)
  const { winA, draw, winB } = aggregateOutcomeProbabilities(dcMatrix)

  return [winA, draw, winB]
}

export interface EvaluationResult {
  matchCount: number
  avgRPS: number
  avgLogLoss: number
  avgBrier: number
  baselineRPS: number
  skillScore: number
  correctTendency: number    // % where top predicted outcome matched actual
  eloOnlyRPS: number         // ELO-only baseline (no MV, no attack/defense ratings)
  phaseBreakdown: Record<string, { matches: number; avgRPS: number; correctTendency: number }>
  perMatch: Array<{
    homeTeam: string
    awayTeam: string
    homeGoals: number
    awayGoals: number
    predWin: number
    predDraw: number
    predLoss: number
    rps: number
    outcome: 'W' | 'D' | 'L'
    phase: string
    group?: string
    predicted: '1' | 'X' | '2'
    correct: boolean
  }>
}

export function evaluateModel(matches: HistoricalMatch[] = HISTORICAL_MATCHES): EvaluationResult {
  const perMatch: EvaluationResult['perMatch'] = []
  let totalRPS = 0
  let totalLogLoss = 0
  let totalBrier = 0
  let totalEloOnlyRPS = 0
  let correctCount = 0
  let count = 0

  const phaseData: Record<string, { totalRPS: number; correct: number; matches: number }> = {}

  for (const m of matches) {
    const teamA = resolveTeam(m.homeTeam, m.homeElo)
    const teamB = resolveTeam(m.awayTeam, m.awayElo)
    if (!teamA || !teamB) continue

    // Full model prediction
    const [predWin, predDraw, predLoss] = predictForTeams(teamA, teamB, false)
    // ELO-only baseline
    const [eloWin, eloDraw, eloLoss] = predictForTeams(teamA, teamB, true)

    // For KO matches with penalties: if it went to penalties, treat as draw for 90-min outcome
    const effectiveHomeGoals = m.homeGoals
    const effectiveAwayGoals = m.awayGoals
    const outcome: 'W' | 'D' | 'L' =
      effectiveHomeGoals > effectiveAwayGoals ? 'W'
      : effectiveHomeGoals === effectiveAwayGoals ? 'D'
      : 'L'

    const observed: [number, number, number] =
      outcome === 'W' ? [1, 0, 0] : outcome === 'D' ? [0, 1, 0] : [0, 0, 1]
    const predicted: [number, number, number] = [predWin, predDraw, predLoss]
    const eloOnly: [number, number, number] = [eloWin, eloDraw, eloLoss]

    const matchRPS = rps(predicted, observed)
    const matchEloRPS = rps(eloOnly, observed)
    const matchLogLoss = logLoss(predicted, observed)
    const matchBrier = brierScore(predicted, observed)

    // Determine top predicted outcome
    const maxProb = Math.max(predWin, predDraw, predLoss)
    const predictedOutcome: '1' | 'X' | '2' =
      maxProb === predWin ? '1' : maxProb === predDraw ? 'X' : '2'
    const correct =
      (predictedOutcome === '1' && outcome === 'W') ||
      (predictedOutcome === 'X' && outcome === 'D') ||
      (predictedOutcome === '2' && outcome === 'L')

    totalRPS += matchRPS
    totalEloOnlyRPS += matchEloRPS
    totalLogLoss += matchLogLoss
    totalBrier += matchBrier
    if (correct) correctCount++
    count++

    // Phase breakdown
    const phase = m.phase
    if (!phaseData[phase]) phaseData[phase] = { totalRPS: 0, correct: 0, matches: 0 }
    phaseData[phase].totalRPS += matchRPS
    phaseData[phase].matches++
    if (correct) phaseData[phase].correct++

    perMatch.push({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      predWin,
      predDraw,
      predLoss,
      rps: matchRPS,
      outcome,
      phase: m.phase,
      group: m.group,
      predicted: predictedOutcome,
      correct,
    })
  }

  const avgRPS = count > 0 ? totalRPS / count : 0
  const avgLogLoss = count > 0 ? totalLogLoss / count : 0
  const avgBrier = count > 0 ? totalBrier / count : 0
  const eloOnlyRPS = count > 0 ? totalEloOnlyRPS / count : 0
  const skillScore = RANDOM_RPS > 0 ? (RANDOM_RPS - avgRPS) / RANDOM_RPS : 0
  const correctTendency = count > 0 ? correctCount / count : 0

  const phaseBreakdown: EvaluationResult['phaseBreakdown'] = {}
  for (const [phase, data] of Object.entries(phaseData)) {
    phaseBreakdown[phase] = {
      matches: data.matches,
      avgRPS: data.matches > 0 ? data.totalRPS / data.matches : 0,
      correctTendency: data.matches > 0 ? data.correct / data.matches : 0,
    }
  }

  return {
    matchCount: count,
    avgRPS,
    avgLogLoss,
    avgBrier,
    baselineRPS: RANDOM_RPS,
    skillScore,
    correctTendency,
    eloOnlyRPS,
    phaseBreakdown,
    perMatch,
  }
}
