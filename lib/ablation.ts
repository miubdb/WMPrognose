/**
 * Feature Ablation Analysis
 *
 * Systematically tests which model factors contribute measurably to RPS improvement.
 *
 * Step-up:    Start from ELO-only, add factors one by one.
 * Leave-one-out: Start from Historical Full, remove factors one by one.
 *
 * Per-tournament ΔRPS measures stability across datasets.
 */

import { type HistoricalMatch, ALL_HISTORICAL_MATCHES } from '@/src/data/historicalResults'
import { rps, logLoss, brierScore, computeECE, computeDatasetBaselineRPS } from '@/lib/model/evaluation'
import { corePredict, type CoreTeamData, type MatchMotivation } from '@/lib/model/corePredict'
import { getHistoricalSnapshot } from '@/src/data/historicalSnapshots'
import { bootstrapDelta, type BootstrapResult } from '@/lib/bootstrap'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AblationConfig {
  label: string
  description: string
  useElo: boolean          // always true in practice — here for documentation
  useMarketValue: boolean
  useHeritage: boolean
  useDixonColes: boolean   // if false: rho = 0
  note?: string
}

export interface AblationResult {
  config: AblationConfig
  rps: number
  deltaRps: number         // vs ELO-only baseline
  logLoss: number
  brier: number
  ece: number
  correctTendency: number
  baselineRPS: number
  skillScore: number
  perTournamentRps: Record<string, number>   // key = tournament id
  stabilityFlag: 'stable' | 'unstable' | 'insufficient_data'
  bootstrap: BootstrapResult
  recommendation: 'keep' | 'weak' | 'remove'
}

// ─── Ablation Configurations ─────────────────────────────────────────────────

export const ABLATION_CONFIGS: AblationConfig[] = [
  // Step-up
  { label: 'ELO only',
    description: 'Nur ELO, kein Marktwert, keine Heritage, kein Dixon-Coles',
    useElo: true, useMarketValue: false, useHeritage: false, useDixonColes: false },
  { label: 'ELO + Dixon-Coles',
    description: 'ELO + DC-Korrektur für niedrige Scores (ρ=0.04)',
    useElo: true, useMarketValue: false, useHeritage: false, useDixonColes: true },
  { label: 'ELO + MarketValue',
    description: 'ELO + historische Kader-Marktwerte',
    useElo: true, useMarketValue: true, useHeritage: false, useDixonColes: false },
  { label: 'ELO + Heritage',
    description: 'ELO + WM-Turnierhistorie (Heritage Premium)',
    useElo: true, useMarketValue: false, useHeritage: true, useDixonColes: false },
  { label: 'ELO + MV + Heritage',
    description: 'ELO + Marktwert + Heritage (kein DC)',
    useElo: true, useMarketValue: true, useHeritage: true, useDixonColes: false },
  { label: 'Historical Full (MV + Heritage + DC)',
    description: 'Vollständig: ELO + Marktwert + Heritage + Dixon-Coles',
    useElo: true, useMarketValue: true, useHeritage: true, useDixonColes: true },
  // Leave-one-out
  { label: 'Full − MarketValue',
    description: 'Historical Full ohne Marktwert',
    useElo: true, useMarketValue: false, useHeritage: true, useDixonColes: true },
  { label: 'Full − Heritage',
    description: 'Historical Full ohne Turnierhistorie',
    useElo: true, useMarketValue: true, useHeritage: false, useDixonColes: true },
  { label: 'Full − Dixon-Coles',
    description: 'Historical Full ohne DC-Korrektur',
    useElo: true, useMarketValue: true, useHeritage: true, useDixonColes: false },
]

// ─── Name mapping (historical ELO teams only) ─────────────────────────────────

const NAME_TO_SNAPSHOT_TOURNAMENT: Record<string, string> = {
  WM2022: 'WC2022', WM2018: 'WC2018', WM2014: 'WC2014', EURO2024: 'EURO2024',
}

function makeEloTeam(elo: number): CoreTeamData {
  return {
    eloRating: elo, squadMarketValueM: 200, worldCupTitles: 0, worldCupAppearances: 5,
    attackRating: 70, defenseRating: 70, setPieceRating: 70, confederation: 'UEFA',
  }
}

function makeHistoricalTeam(
  teamName: string,
  elo: number,
  tournament: HistoricalMatch['tournament'],
  useMarketValue: boolean,
  useHeritage: boolean
): CoreTeamData {
  const snapId = NAME_TO_SNAPSHOT_TOURNAMENT[tournament] as any
  const snap = (useMarketValue || useHeritage) ? getHistoricalSnapshot(teamName, snapId) : null

  return {
    eloRating: elo,
    squadMarketValueM: useMarketValue ? (snap?.marketValueM ?? 200) : 200,
    worldCupTitles:    useHeritage ? (snap?.worldCupTitles ?? 0) : 0,
    worldCupAppearances: useHeritage ? (snap?.worldCupAppearances ?? 5) : 5,
    attackRating: 70, defenseRating: 70, setPieceRating: 70,
    confederation: 'UEFA',
  }
}

// ─── Single config evaluation ─────────────────────────────────────────────────

interface ConfigEvalResult {
  rps: number; logLoss: number; brier: number; ece: number; correctTendency: number
  baselineRPS: number; skillScore: number
  perTournamentRps: Record<string, number>
  rpsPairs: Array<[number, number]>  // [configRps, eloOnlyRps]
}

function evalConfig(
  matches: HistoricalMatch[],
  cfg: AblationConfig,
  eloOnlyRpsMap: Map<HistoricalMatch, number>
): ConfigEvalResult {
  const params = {
    useManualRatings: false,
    useMarketValue: cfg.useMarketValue,
    useHeritage: cfg.useHeritage,
    rho: cfg.useDixonColes ? 0.04 : 0,
  }

  let totalRPS = 0, totalLL = 0, totalBrier = 0, correct = 0, n = 0
  const allPreds: [number, number, number][] = []
  const allObs:   [number, number, number][] = []
  const tourRPS: Record<string, number[]> = {}
  const rpsPairs: Array<[number, number]> = []

  for (const m of matches) {
    if (!m.homeElo || !m.awayElo) continue

    const teamA = makeHistoricalTeam(m.homeTeam, m.homeElo, m.tournament, cfg.useMarketValue, cfg.useHeritage)
    const teamB = makeHistoricalTeam(m.awayTeam, m.awayElo, m.tournament, cfg.useMarketValue, cfg.useHeritage)

    const [pW, pD, pL] = corePredict(teamA, teamB, {}, {}, params)
    const pred: [number, number, number] = [pW, pD, pL]

    const outcome: 'W' | 'D' | 'L' = m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const obs: [number, number, number] = outcome === 'W' ? [1,0,0] : outcome === 'D' ? [0,1,0] : [0,0,1]

    const r = rps(pred, obs)
    const eloR = eloOnlyRpsMap.get(m) ?? r

    totalRPS   += r
    totalLL    += logLoss(pred, obs)
    totalBrier += brierScore(pred, obs)
    allPreds.push(pred)
    allObs.push(obs)
    n++

    const maxP = Math.max(pW, pD, pL)
    const tip = maxP === pW ? '1' : maxP === pD ? 'X' : '2'
    if ((tip === '1' && outcome === 'W') || (tip === 'X' && outcome === 'D') || (tip === '2' && outcome === 'L')) correct++

    if (!tourRPS[m.tournament]) tourRPS[m.tournament] = []
    tourRPS[m.tournament].push(r)
    rpsPairs.push([r, eloR])
  }

  const avgRPS = n > 0 ? totalRPS / n : 0
  const baseline = computeDatasetBaselineRPS(allObs)
  const ece = n > 0 ? computeECE(allPreds, allObs).ece : 0

  const perTournamentRps: Record<string, number> = {}
  for (const [t, vals] of Object.entries(tourRPS)) {
    perTournamentRps[t] = vals.reduce((s, v) => s + v, 0) / vals.length
  }

  return {
    rps: avgRPS,
    logLoss: n > 0 ? totalLL / n : 0,
    brier: n > 0 ? totalBrier / n : 0,
    ece,
    correctTendency: n > 0 ? correct / n : 0,
    baselineRPS: baseline,
    skillScore: baseline > 0 ? (baseline - avgRPS) / baseline : 0,
    perTournamentRps,
    rpsPairs,
  }
}

// ─── Main ablation runner ─────────────────────────────────────────────────────

export function runAblation(matches: HistoricalMatch[] = ALL_HISTORICAL_MATCHES): AblationResult[] {
  // Pre-compute ELO-only RPS per match for delta calculation
  const eloParams = { useManualRatings: false, useMarketValue: false, useHeritage: false, rho: 0 }
  const eloOnlyRpsMap = new Map<HistoricalMatch, number>()
  let eloTotalRPS = 0, eloCount = 0
  const eloObs: [number, number, number][] = []
  const eloRpsList: number[] = []

  for (const m of matches) {
    if (!m.homeElo || !m.awayElo) continue
    const teamA = makeEloTeam(m.homeElo)
    const teamB = makeEloTeam(m.awayElo)
    const [pW, pD, pL] = corePredict(teamA, teamB, {}, {}, eloParams)
    const outcome: 'W' | 'D' | 'L' = m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L'
    const obs: [number, number, number] = outcome === 'W' ? [1,0,0] : outcome === 'D' ? [0,1,0] : [0,0,1]
    const r = rps([pW, pD, pL], obs)
    eloOnlyRpsMap.set(m, r)
    eloTotalRPS += r
    eloCount++
    eloObs.push(obs)
    eloRpsList.push(r)
  }

  const eloAvgRPS = eloCount > 0 ? eloTotalRPS / eloCount : 0
  const tournaments = [...new Set(matches.map(m => m.tournament))]

  // Per-tournament ELO-only RPS (from the map, correctly aligned)
  const eloRpsPerTournament: Record<string, number[]> = {}
  for (const m of matches) {
    const r = eloOnlyRpsMap.get(m)
    if (r !== undefined) {
      if (!eloRpsPerTournament[m.tournament]) eloRpsPerTournament[m.tournament] = []
      eloRpsPerTournament[m.tournament].push(r)
    }
  }
  const eloAvgRpsPerTournament: Record<string, number> = {}
  for (const [t, vals] of Object.entries(eloRpsPerTournament)) {
    eloAvgRpsPerTournament[t] = vals.reduce((s, v) => s + v, 0) / vals.length
  }

  const results: AblationResult[] = ABLATION_CONFIGS.map(cfg => {
    const ev = evalConfig(matches, cfg, eloOnlyRpsMap)
    const deltaRps = ev.rps - eloAvgRPS

    // Stability: compare ΔRPS sign across tournaments (need ≥ 2 tournaments)
    const tourDeltas = tournaments.map(t => {
      const cfgRps = ev.perTournamentRps[t]
      const eloRps = eloAvgRpsPerTournament[t]
      if (cfgRps === undefined || eloRps === undefined) return null
      return cfgRps - eloRps
    }).filter((v): v is number => v !== null)

    let stabilityFlag: AblationResult['stabilityFlag'] = 'insufficient_data'
    if (tourDeltas.length >= 2) {
      const allNeg = tourDeltas.every(d => d <= 0)
      const allPos = tourDeltas.every(d => d >= 0)
      stabilityFlag = allNeg || allPos ? 'stable' : 'unstable'
    }

    const boot = bootstrapDelta(ev.rpsPairs)

    const recommendation: AblationResult['recommendation'] =
      boot.reliable && deltaRps < 0 ? 'keep' :
      deltaRps < 0 && !boot.reliable ? 'weak' :
      'remove'

    return {
      config: cfg,
      rps: ev.rps,
      deltaRps,
      logLoss: ev.logLoss,
      brier: ev.brier,
      ece: ev.ece,
      correctTendency: ev.correctTendency,
      baselineRPS: ev.baselineRPS,
      skillScore: ev.skillScore,
      perTournamentRps: ev.perTournamentRps,
      stabilityFlag,
      bootstrap: boot,
      recommendation,
    }
  })

  return results
}
