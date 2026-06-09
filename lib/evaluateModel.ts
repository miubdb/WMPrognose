import { HISTORICAL_MATCHES, ALL_HISTORICAL_MATCHES, type HistoricalMatch } from '@/src/data/historicalResults'
import {
  rps, logLoss, brierScore, RANDOM_RPS, computeECE, computeDatasetBaselineRPS,
} from '@/lib/model/evaluation'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { corePredict, corePredictFull, type CoreTeamData, type MatchMotivation } from '@/lib/model/corePredict'
import { MODEL_META } from '@/lib/model/config'
import { getHistoricalSnapshot, type TournamentId } from '@/src/data/historicalSnapshots'

// ─── Evaluation Mode ─────────────────────────────────────────────────────────

/**
 * eloOnly:
 *   Only historical ELO from match records. No MV, no heritage, no motivation.
 *   Cleanest possible baseline — what ELO alone can explain.
 *
 * historicalFull:
 *   ELO + historical snapshots (MV estimates, WC heritage). No manual ratings.
 *   No motivation (could bias eloOnly comparison if applied inconsistently).
 *   Clean backtest without data leakage.
 *
 * currentLeakage:
 *   Current WM2026 team data for historical matches. Full model including
 *   manual ratings and motivation. STATUS QUO — for comparison only, with warning.
 */
export type EvalMode = 'eloOnly' | 'historicalFull' | 'currentLeakage'

export const EVAL_MODE_LABELS: Record<EvalMode, string> = {
  eloOnly:        'ELO-only (sauber)',
  historicalFull: 'Historical Full (sauber)',
  currentLeakage: 'Current Data (Leakage ⚠)',
}

// ─── Ensemble Config ──────────────────────────────────────────────────────────

export interface EnsembleConfig {
  label: string
  weights: { eloOnly: number; fullModel: number; uniform: number }
}

export const PRESET_ENSEMBLES: EnsembleConfig[] = [
  { label: 'Ensemble A (ELO-dominant)',     weights: { eloOnly: 0.70, fullModel: 0.30, uniform: 0.00 } },
  { label: 'Ensemble B (balanced+prior)',   weights: { eloOnly: 0.50, fullModel: 0.35, uniform: 0.15 } },
  { label: 'Ensemble C (MV-weighted)',      weights: { eloOnly: 0.60, fullModel: 0.25, uniform: 0.15 } },
  { label: 'ELO-only baseline',             weights: { eloOnly: 1.00, fullModel: 0.00, uniform: 0.00 } },
  { label: 'Full Model only',               weights: { eloOnly: 0.00, fullModel: 1.00, uniform: 0.00 } },
]

// ─── Scoreline Helper ─────────────────────────────────────────────────────────

function topScorelinesFromXG(
  xgA: number,
  xgB: number,
  n = 3
): { goalsA: number; goalsB: number; p: number }[] {
  const pmf = (lambda: number, k: number): number => {
    if (lambda <= 0) return k === 0 ? 1 : 0
    let logP = k * Math.log(lambda) - lambda
    for (let i = 1; i <= k; i++) logP -= Math.log(i)
    return Math.exp(logP)
  }
  const rho = MODEL_META.dixonColesRho
  const dc = (a: number, b: number): number => {
    if (a === 0 && b === 0) return 1 - rho * xgA * xgB
    if (a === 0 && b === 1) return 1 + rho * xgA
    if (a === 1 && b === 0) return 1 + rho * xgB
    if (a === 1 && b === 1) return 1 - rho
    return 1
  }
  const scores: { goalsA: number; goalsB: number; p: number }[] = []
  for (let a = 0; a <= 7; a++)
    for (let b = 0; b <= 7; b++)
      scores.push({ goalsA: a, goalsB: b, p: pmf(xgA, a) * pmf(xgB, b) * dc(a, b) })
  return scores.sort((a, b) => b.p - a.p).slice(0, n)
}

// ─── Name-zu-ID Mapping ───────────────────────────────────────────────────────

const NAME_TO_ID: Record<string, string | null> = {
  'Germany': 'germany', 'France': 'france', 'Spain': 'spain', 'Brazil': 'brazil',
  'Argentina': 'argentina', 'England': 'england', 'Portugal': 'portugal',
  'Netherlands': 'netherlands', 'Belgium': 'belgium', 'Croatia': 'croatia',
  'Denmark': null, 'Switzerland': 'switzerland', 'Uruguay': 'uruguay',
  'Mexico': 'mexico', 'USA': 'usa', 'Japan': 'japan', 'South Korea': 'south_korea',
  'Australia': 'australia', 'Canada': 'canada', 'Morocco': 'morocco',
  'Senegal': 'senegal', 'Ghana': 'ghana', 'Cameroon': null,
  'Tunisia': 'tunisia', 'Ecuador': 'ecuador', 'Poland': null, 'Serbia': null,
  'Iran': 'iran', 'Qatar': 'qatar', 'Saudi Arabia': 'saudi_arabia',
  'Costa Rica': null, 'Wales': null,
  'Russia': null, 'Egypt': 'egypt', 'Peru': null, 'Iceland': null,
  'Nigeria': 'nigeria', 'Sweden': 'sweden', 'Colombia': 'colombia', 'Panama': 'panama',
  'Italy': null, 'Chile': 'chile', 'Greece': null, 'Ivory Coast': 'ivory_coast',
  'Honduras': null, 'Bosnia': 'bosnia', 'Algeria': 'algeria',
  'Austria': 'austria', 'Turkey': 'turkey', 'Georgia': 'georgia',
  'Albania': null, 'Slovakia': null, 'Slovenia': null, 'Romania': null,
  'Ukraine': null, 'Hungary': null, 'Czech Republic': null, 'Scotland': null,
}

function matchTournamentToSnapshotId(tournament: HistoricalMatch['tournament']): TournamentId {
  switch (tournament) {
    case 'WM2022': return 'WC2022'
    case 'WM2018': return 'WC2018'
    case 'WM2014': return 'WC2014'
    case 'EURO2024': return 'EURO2024'
  }
}

// ─── Team Resolution ──────────────────────────────────────────────────────────

function makeEloOnlyTeam(elo: number): CoreTeamData {
  return {
    eloRating: elo, squadMarketValueM: 200, worldCupTitles: 0, worldCupAppearances: 5,
    attackRating: 70, defenseRating: 70, setPieceRating: 70, confederation: 'UEFA',
  }
}

function resolveTeamForMode(
  teamName: string,
  historicalElo: number | undefined,
  tournament: HistoricalMatch['tournament'],
  mode: EvalMode
): CoreTeamData | null {
  if (mode === 'eloOnly') {
    if (!historicalElo) return null
    return makeEloOnlyTeam(historicalElo)
  }

  if (mode === 'historicalFull') {
    if (!historicalElo) return null
    const snap = getHistoricalSnapshot(teamName, matchTournamentToSnapshotId(tournament))
    return {
      eloRating: historicalElo,
      squadMarketValueM: snap?.marketValueM ?? 200,
      worldCupTitles:    snap?.worldCupTitles ?? 0,
      worldCupAppearances: snap?.worldCupAppearances ?? 5,
      attackRating: 70, defenseRating: 70, setPieceRating: 70,
      confederation: 'UEFA',
    }
  }

  // currentLeakage: use current WM2026 data where available
  const id = NAME_TO_ID[teamName]
  if (id === undefined) return null
  if (id !== null) {
    const team = TEAM_BY_ID[id]
    if (team) return team
  }
  if (historicalElo) return makeEloOnlyTeam(historicalElo)
  return null
}

// ─── Params per mode ─────────────────────────────────────────────────────────

function paramsForMode(mode: EvalMode) {
  if (mode === 'eloOnly')        return { useManualRatings: false, useMarketValue: false, useHeritage: false }
  if (mode === 'historicalFull') return { useManualRatings: false, useMarketValue: true,  useHeritage: true  }
  return { useManualRatings: true,  useMarketValue: true,  useHeritage: true  }
}

// ─── Result Types ─────────────────────────────────────────────────────────────

export interface TournamentStats {
  matches: number
  avgRPS: number
  avgLogLoss: number
  avgBrier: number
  ece: number
  correctTendency: number
  drawRate: number
  drawPredAvg: number
  skillScore: number    // vs this tournament's own uniform baseline
  baselineRPS: number
}

export interface EnsembleResult {
  config: EnsembleConfig
  rps: number
  logLoss: number
  brier: number
  ece: number
  skillScore: number
  correctTendency: number
  drawRate: number
  drawPredAvg: number
}

export interface EvaluationResult {
  mode: EvalMode
  leakageWarning: boolean
  matchCount: number
  avgRPS: number
  avgLogLoss: number
  avgBrier: number
  baselineRPS: number    // true dataset-specific uniform predictor baseline
  skillScore: number
  correctTendency: number
  eloOnlyRPS: number
  ece: number
  mce: number
  overconfidence: number
  calibrationBins: Array<{ center: number; predicted: number; actual: number; count: number }>
  upsetAccuracy: number
  drawRate: number
  drawPredictionAvg: number
  phaseBreakdown: Record<string, { matches: number; avgRPS: number; correctTendency: number }>
  tournamentBreakdown: Record<string, TournamentStats>
  // Per-match RPS pairs for bootstrap: [modelRps, eloOnlyRps]
  rpsPairs: Array<[number, number]>
  ensembleComparison?: EnsembleResult[]
  // Exact scoreline prediction accuracy
  exactScoreHits: number
  exactScoreAccuracy: number
  top3ScoreHits: number
  top3ScoreAccuracy: number
  perMatch: Array<{
    homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number
    predWin: number; predDraw: number; predLoss: number
    rps: number; outcome: 'W' | 'D' | 'L'; phase: string; group?: string
    predicted: '1' | 'X' | '2'; correct: boolean; tournament: string
    predictedScoreA: number; predictedScoreB: number
    exactScoreHit: boolean; top3ScoreHit: boolean
  }>
}

// ─── Main Evaluation Function ─────────────────────────────────────────────────

export function evaluateModel(
  matches: HistoricalMatch[] = HISTORICAL_MATCHES,
  mode: EvalMode = 'currentLeakage',
  runEnsemble = false
): EvaluationResult {
  const modeParams = paramsForMode(mode)
  // eloOnly params: pure ELO signal — no motivation, no MV, no heritage
  const eloParams  = { useManualRatings: false, useMarketValue: false, useHeritage: false }

  const perMatch: EvaluationResult['perMatch'] = []
  let totalRPS = 0, totalLogLoss = 0, totalBrier = 0, totalEloOnlyRPS = 0
  let correctCount = 0, count = 0
  let exactScoreHits = 0, top3ScoreHits = 0

  const allPredictions: [number, number, number][] = []
  const allObserved:   [number, number, number][] = []
  let drawCount = 0, drawPredSum = 0

  const matchEloProbs:  [number, number, number][] = []
  const matchFullProbs: [number, number, number][] = []
  const matchObserved:  [number, number, number][] = []
  const rpsPairs: Array<[number, number]> = []

  const phaseData: Record<string, { totalRPS: number; correct: number; matches: number }> = {}

  // Per-tournament accumulators
  type TournamentAcc = {
    totalRPS: number; totalLL: number; totalBrier: number
    correct: number; matches: number; drawCount: number; drawPredSum: number
    preds: [number, number, number][]; obs: [number, number, number][]
  }
  const tournamentData: Record<string, TournamentAcc> = {}

  for (const m of matches) {
    const teamA = resolveTeamForMode(m.homeTeam, m.homeElo, m.tournament, mode)
    const teamB = resolveTeamForMode(m.awayTeam, m.awayElo, m.tournament, mode)
    if (!teamA || !teamB) continue

    // ELO-only baseline team (always uses historical ELO, no motivation)
    const eloTeamA = m.homeElo ? makeEloOnlyTeam(m.homeElo) : teamA
    const eloTeamB = m.awayElo ? makeEloOnlyTeam(m.awayElo) : teamB

    // Motivation only in currentLeakage mode (historical modes are mode-consistent)
    const motivation: MatchMotivation = mode === 'currentLeakage' ? {
      alreadyThroughA: m.alreadyThroughHome ?? false,
      alreadyThroughB: m.alreadyThroughAway ?? false,
      mustWinA: m.mustWinHome ?? false,
      mustWinB: m.mustWinAway ?? false,
    } : {}

    const { probs: [predWin, predDraw, predLoss], xgA, xgB } = corePredictFull(teamA, teamB, motivation, {}, modeParams)
    // ELO-only baseline: no motivation, no MV, no heritage — pure ELO signal
    const [eloWin, eloDraw, eloLoss]   = corePredict(eloTeamA, eloTeamB, {}, {}, eloParams)

    const outcome: 'W' | 'D' | 'L' =
      m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const observed: [number, number, number] =
      outcome === 'W' ? [1, 0, 0] : outcome === 'D' ? [0, 1, 0] : [0, 0, 1]
    const predicted: [number, number, number] = [predWin, predDraw, predLoss]
    const eloOnly:   [number, number, number] = [eloWin, eloDraw, eloLoss]

    const matchRPS     = rps(predicted, observed)
    const matchEloRPS  = rps(eloOnly,   observed)
    const matchLogLoss = logLoss(predicted, observed)
    const matchBrier   = brierScore(predicted, observed)

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

    // Exact scoreline accuracy
    const top3 = topScorelinesFromXG(xgA, xgB, 3)
    const predictedScoreA = top3[0]?.goalsA ?? 0
    const predictedScoreB = top3[0]?.goalsB ?? 0
    const exactScoreHit = predictedScoreA === m.homeGoals && predictedScoreB === m.awayGoals
    const top3ScoreHit = top3.some(s => s.goalsA === m.homeGoals && s.goalsB === m.awayGoals)
    if (exactScoreHit) exactScoreHits++
    if (top3ScoreHit) top3ScoreHits++

    allPredictions.push(predicted)
    allObserved.push(observed)
    if (outcome === 'D') drawCount++
    drawPredSum += predDraw

    matchEloProbs.push(eloOnly)
    matchFullProbs.push(predicted)
    matchObserved.push(observed)
    rpsPairs.push([matchRPS, matchEloRPS])

    // Phase breakdown
    const phase = m.phase
    if (!phaseData[phase]) phaseData[phase] = { totalRPS: 0, correct: 0, matches: 0 }
    phaseData[phase].totalRPS += matchRPS
    phaseData[phase].matches++
    if (correct) phaseData[phase].correct++

    // Tournament breakdown
    const tourn = m.tournament
    if (!tournamentData[tourn]) tournamentData[tourn] = {
      totalRPS: 0, totalLL: 0, totalBrier: 0, correct: 0, matches: 0,
      drawCount: 0, drawPredSum: 0, preds: [], obs: [],
    }
    tournamentData[tourn].totalRPS   += matchRPS
    tournamentData[tourn].totalLL    += matchLogLoss
    tournamentData[tourn].totalBrier += matchBrier
    tournamentData[tourn].matches++
    if (correct) tournamentData[tourn].correct++
    if (outcome === 'D') tournamentData[tourn].drawCount++
    tournamentData[tourn].drawPredSum += predDraw
    tournamentData[tourn].preds.push(predicted)
    tournamentData[tourn].obs.push(observed)

    perMatch.push({
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      homeGoals: m.homeGoals, awayGoals: m.awayGoals,
      predWin, predDraw, predLoss,
      rps: matchRPS, outcome, phase: m.phase, group: m.group,
      predicted: predictedOutcome, correct,
      tournament: m.tournament,
      predictedScoreA, predictedScoreB, exactScoreHit, top3ScoreHit,
    })
  }

  const avgRPS      = count > 0 ? totalRPS / count : 0
  const avgLogLoss  = count > 0 ? totalLogLoss / count : 0
  const avgBrier    = count > 0 ? totalBrier / count : 0
  const eloOnlyRPS  = count > 0 ? totalEloOnlyRPS / count : 0

  // Dynamic baseline: uniform predictor on this specific dataset
  const baselineRPS = computeDatasetBaselineRPS(allObserved)
  const skillScore  = baselineRPS > 0 ? (baselineRPS - avgRPS) / baselineRPS : 0
  const correctTendency = count > 0 ? correctCount / count : 0

  const phaseBreakdown: EvaluationResult['phaseBreakdown'] = {}
  for (const [phase, data] of Object.entries(phaseData)) {
    phaseBreakdown[phase] = {
      matches: data.matches,
      avgRPS: data.matches > 0 ? data.totalRPS / data.matches : 0,
      correctTendency: data.matches > 0 ? data.correct / data.matches : 0,
    }
  }

  const tournamentBreakdown: EvaluationResult['tournamentBreakdown'] = {}
  for (const [tourn, data] of Object.entries(tournamentData)) {
    const n = data.matches
    const tBaseline = computeDatasetBaselineRPS(data.obs)
    const tRPS = n > 0 ? data.totalRPS / n : 0
    const tEce = n > 0 ? computeECE(data.preds, data.obs) : { ece: 0 }
    tournamentBreakdown[tourn] = {
      matches:          n,
      avgRPS:           tRPS,
      avgLogLoss:       n > 0 ? data.totalLL    / n : 0,
      avgBrier:         n > 0 ? data.totalBrier / n : 0,
      ece:              tEce.ece,
      correctTendency:  n > 0 ? data.correct    / n : 0,
      drawRate:         n > 0 ? data.drawCount  / n : 0,
      drawPredAvg:      n > 0 ? data.drawPredSum/ n : 0,
      skillScore:       tBaseline > 0 ? (tBaseline - tRPS) / tBaseline : 0,
      baselineRPS:      tBaseline,
    }
  }

  const eceResult = count > 0
    ? computeECE(allPredictions, allObserved)
    : { ece: 0, mce: 0, overconfidence: 0, bins: [] }

  const upsetMatches = perMatch.filter(m => m.outcome !== 'W' && m.predWin >= 0.55)
  const upsetCorrect = upsetMatches.filter(m => m.correct).length
  const upsetAccuracy = upsetMatches.length > 0 ? upsetCorrect / upsetMatches.length : 0

  // ─── Ensemble Comparison ──────────────────────────────────────────────────

  let ensembleComparison: EnsembleResult[] | undefined
  if (runEnsemble && count > 0) {
    ensembleComparison = PRESET_ENSEMBLES.map(cfg => {
      const { eloOnly: wElo, fullModel: wFull, uniform: wUniform } = cfg.weights
      let ensRPS = 0, ensLL = 0, ensBrier = 0, ensCorrect = 0, ensDrawPred = 0
      const ensPreds: [number, number, number][] = []

      for (let i = 0; i < matchEloProbs.length; i++) {
        const [eW, eD, eL] = matchEloProbs[i]
        const [fW, fD, fL] = matchFullProbs[i]
        const ensW = wElo * eW + wFull * fW + wUniform / 3
        const ensD = wElo * eD + wFull * fD + wUniform / 3
        const ensL = wElo * eL + wFull * fL + wUniform / 3
        const ens: [number, number, number] = [ensW, ensD, ensL]
        const obs = matchObserved[i]
        ensRPS   += rps(ens, obs)
        ensLL    += logLoss(ens, obs)
        ensBrier += brierScore(ens, obs)
        ensDrawPred += ensD
        const maxP = Math.max(ensW, ensD, ensL)
        const tip = maxP === ensW ? '1' : maxP === ensD ? 'X' : '2'
        const outIdx = obs[0] === 1 ? 'W' : obs[1] === 1 ? 'D' : 'L'
        if ((tip === '1' && outIdx === 'W') || (tip === 'X' && outIdx === 'D') || (tip === '2' && outIdx === 'L')) ensCorrect++
        ensPreds.push(ens)
      }

      const n = matchEloProbs.length
      const ensEce = computeECE(ensPreds, matchObserved)
      return {
        config: cfg,
        rps:            ensRPS / n,
        logLoss:        ensLL  / n,
        brier:          ensBrier / n,
        ece:            ensEce.ece,
        skillScore:     baselineRPS > 0 ? (baselineRPS - ensRPS / n) / baselineRPS : 0,
        correctTendency: ensCorrect / n,
        drawRate:        drawCount  / n,
        drawPredAvg:     ensDrawPred / n,
      }
    })
    ensembleComparison.sort((a, b) => a.rps - b.rps)
  }

  return {
    mode,
    leakageWarning: mode === 'currentLeakage',
    matchCount: count,
    avgRPS, avgLogLoss, avgBrier,
    baselineRPS,
    skillScore, correctTendency, eloOnlyRPS,
    ece: eceResult.ece, mce: eceResult.mce, overconfidence: eceResult.overconfidence,
    calibrationBins: eceResult.bins,
    upsetAccuracy,
    drawRate:          count > 0 ? drawCount / count : 0,
    drawPredictionAvg: count > 0 ? drawPredSum / count : 0,
    phaseBreakdown,
    tournamentBreakdown,
    rpsPairs,
    ensembleComparison,
    exactScoreHits,
    exactScoreAccuracy: count > 0 ? exactScoreHits / count : 0,
    top3ScoreHits,
    top3ScoreAccuracy: count > 0 ? top3ScoreHits / count : 0,
    perMatch,
  }
}
