import { HISTORICAL_MATCHES, HistoricalMatch } from '@/src/data/historicalResults'
import { rps, logLoss, brierScore, RANDOM_RPS } from '@/lib/model/evaluation'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { computeScorelineMatrix } from '@/src/model/poisson'
import { applyDixonColesCorrection, aggregateOutcomeProbabilities } from '@/src/model/dixonColes'
import { computeLambda, clampLogEffect } from '@/lib/model/logLambda'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'

// Name-zu-ID Mapping für historische Daten
const NAME_TO_ID: Record<string, string> = {
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
  'Denmark': 'denmark',
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
  'Cameroon': 'cameroon',
  'Tunisia': 'tunisia',
  'Ecuador': 'ecuador',
  'Poland': 'poland',
  'Serbia': 'serbia',
  'Iran': 'iran',
  'Qatar': 'qatar',
  'Saudi Arabia': 'saudi_arabia',
  'Costa Rica': 'costa_rica',
  'Wales': 'wales',
}

export interface EvaluationResult {
  matchCount: number
  avgRPS: number
  avgLogLoss: number
  avgBrier: number
  baselineRPS: number
  skillScore: number
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
  }>
}

function predictForHistorical(homeId: string, awayId: string): [number, number, number] | null {
  const teamA = TEAM_BY_ID[homeId]
  const teamB = TEAM_BY_ID[awayId]
  if (!teamA || !teamB) return null

  const eloA = teamA.eloRating ?? 1500
  const eloB = teamB.eloRating ?? 1500
  const eloDiff = eloA - eloB
  const eloLogA = clampLogEffect(MODEL_WEIGHTS.elo * eloDiff, 0.25)

  const mvA = teamA.squadMarketValueM ?? 200
  const mvB = teamB.squadMarketValueM ?? 200
  const mvRatio = mvA > 0 && mvB > 0 ? Math.log(mvA / mvB) / Math.log(10) : 0
  const mvLogA = clampLogEffect(MODEL_WEIGHTS.marketValueLog * mvRatio)

  const expA = teamA.worldCupTitles * 3 + teamA.worldCupAppearances
  const expB = teamB.worldCupTitles * 3 + teamB.worldCupAppearances
  const expLogA = clampLogEffect(MODEL_WEIGHTS.experience * (expA - expB))

  const attackDiffA = (teamA.attackRating - teamB.defenseRating) / 100
  const attackDiffB = (teamB.attackRating - teamA.defenseRating) / 100
  const attackLogA = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffA)
  const attackLogB = clampLogEffect(MODEL_WEIGHTS.attackDefense * attackDiffB)

  const xgA = computeLambda(MODEL_META.baseGoalRate, [eloLogA, mvLogA, expLogA, attackLogA])
  const xgB = computeLambda(MODEL_META.baseGoalRate, [-eloLogA, -mvLogA, -expLogA, attackLogB])

  const rawMatrix = computeScorelineMatrix(xgA, xgB)
  const dcMatrix = applyDixonColesCorrection(rawMatrix, xgA, xgB)
  const { winA, draw, winB } = aggregateOutcomeProbabilities(dcMatrix)

  return [winA, draw, winB]
}

export function evaluateModel(matches: HistoricalMatch[] = HISTORICAL_MATCHES): EvaluationResult {
  const perMatch: EvaluationResult['perMatch'] = []
  let totalRPS = 0
  let totalLogLoss = 0
  let totalBrier = 0
  let count = 0

  for (const m of matches) {
    const homeId = NAME_TO_ID[m.homeTeam]
    const awayId = NAME_TO_ID[m.awayTeam]
    if (!homeId || !awayId) continue

    const pred = predictForHistorical(homeId, awayId)
    if (!pred) continue

    const [predWin, predDraw, predLoss] = pred
    const outcome: 'W' | 'D' | 'L' =
      m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const observed: [number, number, number] =
      outcome === 'W' ? [1, 0, 0] : outcome === 'D' ? [0, 1, 0] : [0, 0, 1]
    const predicted: [number, number, number] = [predWin, predDraw, predLoss]

    const matchRPS = rps(predicted, observed)
    const matchLogLoss = logLoss(predicted, observed)
    const matchBrier = brierScore(predicted, observed)

    totalRPS += matchRPS
    totalLogLoss += matchLogLoss
    totalBrier += matchBrier
    count++

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
    })
  }

  const avgRPS = count > 0 ? totalRPS / count : 0
  const avgLogLoss = count > 0 ? totalLogLoss / count : 0
  const avgBrier = count > 0 ? totalBrier / count : 0
  const skillScore = RANDOM_RPS > 0 ? (RANDOM_RPS - avgRPS) / RANDOM_RPS : 0

  return {
    matchCount: count,
    avgRPS,
    avgLogLoss,
    avgBrier,
    baselineRPS: RANDOM_RPS,
    skillScore,
    perMatch,
  }
}
