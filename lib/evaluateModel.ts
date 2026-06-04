import { HISTORICAL_MATCHES, type HistoricalMatch } from '@/src/data/historicalResults'
import { rps, logLoss, brierScore, RANDOM_RPS, computeECE } from '@/lib/model/evaluation'
import { TEAM_BY_ID, type TeamBasic } from '@/src/data/allTeams'
import { computeScorelineMatrix } from '@/src/model/poisson'
import { applyDixonColesCorrection, aggregateOutcomeProbabilities } from '@/src/model/dixonColes'
import { computeLambda, clampLogEffect } from '@/lib/model/logLambda'
import { MODEL_WEIGHTS, MODEL_META } from '@/lib/model/config'
import { corePredict, type CoreTeamData, type MatchMotivation } from '@/lib/model/corePredict'
import { getHistoricalSnapshot, type TournamentId } from '@/src/data/historicalSnapshots'

// ─── Evaluation Mode ─────────────────────────────────────────────────────────

/**
 * eloOnly:          Nur historisches ELO aus Match-Records. Kein MV, keine Ratings.
 *                   → Sauberster Backtest. Ehrliche Untergrenze.
 *
 * historicalFull:   ELO + historische Snapshots (MV-Schätzungen, Turnierhistorie).
 *                   Keine manuellen Ratings (attackRating etc.). Kein Data Leakage.
 *                   → Realistischer sauberer Backtest.
 *
 * currentLeakage:   Aktuelle WM2026-Teamdaten für historische Spiele.
 *                   → Status Quo. Nur als Vergleich, mit Leakage-Warnung!
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

// ─── Name-zu-ID Mapping ───────────────────────────────────────────────────────

// null = nicht bei WM 2026 → Fallback auf historische ELO-Werte
const NAME_TO_ID: Record<string, string | null> = {
  // WM-Teams
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
  // WM 2018 extra
  'Russia': null, 'Egypt': 'egypt', 'Peru': null, 'Iceland': null,
  'Nigeria': 'nigeria', 'Sweden': 'sweden', 'Colombia': 'colombia', 'Panama': 'panama',
  // WM 2014 extra
  'Italy': null, 'Chile': 'chile', 'Greece': null, 'Ivory Coast': 'ivory_coast',
  'Honduras': null, 'Bosnia': 'bosnia', 'Algeria': 'algeria',
  // EURO 2024 extra
  'Austria': 'austria', 'Turkey': 'turkey', 'Georgia': 'georgia',
  'Albania': null, 'Slovakia': null, 'Slovenia': null, 'Romania': null,
  'Ukraine': null, 'Hungary': null, 'Czech Republic': null, 'Scotland': null,
}

// ─── Tournament ID mapping ────────────────────────────────────────────────────

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

/**
 * Resolves a historical team to CoreTeamData based on evaluation mode.
 *
 * eloOnly:         Always uses historical ELO from match record. No squad data.
 * historicalFull:  Uses historical ELO + HistoricalTeamSnapshot (MV, experience).
 *                  Manual ratings (attack/defense/setPiece) are NOT used (set neutral).
 * currentLeakage:  Uses current TEAM_BY_ID data if team is at WM2026 (← data leakage).
 */
function resolveTeamForMode(
  teamName: string,
  historicalElo: number | undefined,
  tournament: HistoricalMatch['tournament'],
  mode: EvalMode
): CoreTeamData | null {
  const snapshotTournament = matchTournamentToSnapshotId(tournament)

  if (mode === 'eloOnly') {
    if (!historicalElo) return null
    return makeEloOnlyTeam(historicalElo)
  }

  if (mode === 'historicalFull') {
    const elo = historicalElo
    if (!elo) return null
    const snap = getHistoricalSnapshot(teamName, snapshotTournament)
    return {
      eloRating: elo,
      squadMarketValueM: snap?.marketValueM ?? 200,
      worldCupTitles: snap?.worldCupTitles ?? 0,
      worldCupAppearances: snap?.worldCupAppearances ?? 5,
      // Manual ratings NOT available historically → neutral values
      attackRating: 70,
      defenseRating: 70,
      setPieceRating: 70,
      confederation: 'UEFA',
    }
  }

  // currentLeakage: existing behavior (uses current WM2026 data → DATA LEAKAGE for historical matches)
  const id = NAME_TO_ID[teamName]
  if (id === undefined) return null
  if (id !== null) {
    const team = TEAM_BY_ID[id]
    if (team) return team
  }
  if (historicalElo) return makeEloOnlyTeam(historicalElo)
  return null
}

// ─── ELO-only prediction (for ensemble baseline) ─────────────────────────────

function predictEloOnly(elo: number): CoreTeamData {
  return makeEloOnlyTeam(elo)
}

// ─── Result Types ─────────────────────────────────────────────────────────────

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
  baselineRPS: number
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
  ensembleComparison?: EnsembleResult[]
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
    tournament: string
  }>
}

// ─── Main Evaluation Function ─────────────────────────────────────────────────

export function evaluateModel(
  matches: HistoricalMatch[] = HISTORICAL_MATCHES,
  mode: EvalMode = 'currentLeakage',
  runEnsemble = false
): EvaluationResult {
  const perMatch: EvaluationResult['perMatch'] = []
  let totalRPS = 0, totalLogLoss = 0, totalBrier = 0, totalEloOnlyRPS = 0
  let correctCount = 0, count = 0

  const allPredictions: [number, number, number][] = []
  const allObserved: [number, number, number][] = []
  let drawCount = 0, drawPredSum = 0

  // For ensemble evaluation: collect per-match ELO-only and full-model predictions
  const matchEloProbs: [number, number, number][] = []
  const matchFullProbs: [number, number, number][] = []
  const matchObserved: [number, number, number][] = []

  const phaseData: Record<string, { totalRPS: number; correct: number; matches: number }> = {}

  for (const m of matches) {
    const teamA = resolveTeamForMode(m.homeTeam, m.homeElo, m.tournament, mode)
    const teamB = resolveTeamForMode(m.awayTeam, m.awayElo, m.tournament, mode)
    if (!teamA || !teamB) continue

    // ELO-only baseline (for comparison and ensemble)
    const eloTeamA = m.homeElo ? makeEloOnlyTeam(m.homeElo) : teamA
    const eloTeamB = m.awayElo ? makeEloOnlyTeam(m.awayElo) : teamB

    const motivation: MatchMotivation = {
      alreadyThroughA: m.alreadyThroughHome ?? false,
      alreadyThroughB: m.alreadyThroughAway ?? false,
      mustWinA: m.mustWinHome ?? false,
      mustWinB: m.mustWinAway ?? false,
    }

    // useManualRatings only in currentLeakage mode
    const useManualRatings = mode === 'currentLeakage'

    const [predWin, predDraw, predLoss] = corePredict(teamA, teamB, motivation, {}, { useManualRatings })
    const [eloWin, eloDraw, eloLoss]   = corePredict(eloTeamA, eloTeamB, {}, {}, { useManualRatings: false })

    const outcome: 'W' | 'D' | 'L' =
      m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const observed: [number, number, number] =
      outcome === 'W' ? [1, 0, 0] : outcome === 'D' ? [0, 1, 0] : [0, 0, 1]
    const predicted: [number, number, number] = [predWin, predDraw, predLoss]
    const eloOnly: [number, number, number]   = [eloWin, eloDraw, eloLoss]

    const matchRPS     = rps(predicted, observed)
    const matchEloRPS  = rps(eloOnly, observed)
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

    allPredictions.push(predicted)
    allObserved.push(observed)
    if (outcome === 'D') drawCount++
    drawPredSum += predDraw

    matchEloProbs.push(eloOnly)
    matchFullProbs.push(predicted)
    matchObserved.push(observed)

    const phase = m.phase
    if (!phaseData[phase]) phaseData[phase] = { totalRPS: 0, correct: 0, matches: 0 }
    phaseData[phase].totalRPS += matchRPS
    phaseData[phase].matches++
    if (correct) phaseData[phase].correct++

    perMatch.push({
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      homeGoals: m.homeGoals, awayGoals: m.awayGoals,
      predWin, predDraw, predLoss,
      rps: matchRPS, outcome, phase: m.phase, group: m.group,
      predicted: predictedOutcome, correct,
      tournament: m.tournament,
    })
  }

  const avgRPS      = count > 0 ? totalRPS / count : 0
  const avgLogLoss  = count > 0 ? totalLogLoss / count : 0
  const avgBrier    = count > 0 ? totalBrier / count : 0
  const eloOnlyRPS  = count > 0 ? totalEloOnlyRPS / count : 0
  const skillScore  = RANDOM_RPS > 0 ? (RANDOM_RPS - avgRPS) / RANDOM_RPS : 0
  const correctTendency = count > 0 ? correctCount / count : 0

  const phaseBreakdown: EvaluationResult['phaseBreakdown'] = {}
  for (const [phase, data] of Object.entries(phaseData)) {
    phaseBreakdown[phase] = {
      matches: data.matches,
      avgRPS: data.matches > 0 ? data.totalRPS / data.matches : 0,
      correctTendency: data.matches > 0 ? data.correct / data.matches : 0,
    }
  }

  const eceResult = count > 0 ? computeECE(allPredictions, allObserved) : { ece: 0, mce: 0, overconfidence: 0, bins: [] }

  const upsetMatches = perMatch.filter(m => m.outcome === 'W' && m.predWin < 0.45)
  const upsetAccuracy = upsetMatches.length > 0 ? upsetMatches.filter(m => m.correct).length / upsetMatches.length : 0

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
        const r = rps(ens, obs)
        ensRPS += r
        ensLL += logLoss(ens, obs)
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
        rps: ensRPS / n,
        logLoss: ensLL / n,
        brier: ensBrier / n,
        ece: ensEce.ece,
        skillScore: RANDOM_RPS > 0 ? (RANDOM_RPS - ensRPS / n) / RANDOM_RPS : 0,
        correctTendency: ensCorrect / n,
        drawRate: drawCount / n,
        drawPredAvg: ensDrawPred / n,
      }
    })
    // Sort by RPS ascending (better = lower)
    ensembleComparison.sort((a, b) => a.rps - b.rps)
  }

  return {
    mode,
    leakageWarning: mode === 'currentLeakage',
    matchCount: count,
    avgRPS, avgLogLoss, avgBrier, baselineRPS: RANDOM_RPS,
    skillScore, correctTendency, eloOnlyRPS,
    ece: eceResult.ece, mce: eceResult.mce, overconfidence: eceResult.overconfidence,
    calibrationBins: eceResult.bins,
    upsetAccuracy,
    drawRate: count > 0 ? drawCount / count : 0,
    drawPredictionAvg: count > 0 ? drawPredSum / count : 0,
    phaseBreakdown,
    ensembleComparison,
    perMatch,
  }
}
