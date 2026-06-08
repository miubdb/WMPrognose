import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { VENUES } from '@/src/data/venues'
import { analyzeMatch, type MatchFactor, type SquadSummary } from '@/lib/modelAdapter'
import { computeDataQuality } from '@/lib/model/dataQuality'
import { computeGroupStandings, computePressure } from '@/lib/standings'
import { toBerlinTime, fmtDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { MODEL_META } from '@/lib/model/config'
import { computeSquadSummary } from '@/lib/model/squadComputation'
import { LineupEditor } from './LineupEditor'
import type { LineupPlayer } from './LineupEditor'

export const dynamic = 'force-dynamic'

function topScorelines(xgA: number, xgB: number, rho: number, n = 8): { i: number; j: number; p: number }[] {
  const pmf = (lambda: number, k: number) => {
    if (lambda <= 0) return k === 0 ? 1 : 0
    let logP = k * Math.log(lambda) - lambda
    for (let i = 1; i <= k; i++) logP -= Math.log(i)
    return Math.exp(logP)
  }
  const dcFactor = (i: number, j: number) => {
    if (i === 0 && j === 0) return 1 - rho * xgA * xgB
    if (i === 0 && j === 1) return 1 + rho * xgA
    if (i === 1 && j === 0) return 1 + rho * xgB
    if (i === 1 && j === 1) return 1 - rho
    return 1
  }
  const scores: { i: number; j: number; p: number }[] = []
  for (let i = 0; i <= 7; i++) {
    for (let j = 0; j <= 7; j++) {
      scores.push({ i, j, p: pmf(xgA, i) * pmf(xgB, j) * dcFactor(i, j) })
    }
  }
  return scores
    .sort((a, b) => b.p - a.p)
    .slice(0, n)
}

function fmtEffect(e: number): string {
  if (Math.abs(e) < 0.002) return '±0%'
  const pct = Math.round(e * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function EffectChip({ value }: { value: number }) {
  const abs = Math.abs(value)
  if (abs < 0.002) return <span className="text-gray-600 text-xs font-mono">±0%</span>
  const pct = Math.round(value * 100)
  const color = value > 0 ? 'text-emerald-400' : 'text-rose-400'
  return <span className={`text-xs font-mono font-bold ${color}`}>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
}

function FactorRow({ factor }: { factor: MatchFactor }) {
  const catColor = {
    elo: 'bg-violet-900/40 text-violet-400',
    squad: 'bg-blue-900/40 text-blue-400',
    context: 'bg-amber-900/40 text-amber-400',
    experience: 'bg-emerald-900/40 text-emerald-400',
  }[factor.category]

  const lowConfidence = factor.confidence != null && factor.confidence < 0.6

  return (
    <div className="border-b border-gray-800/60 last:border-0">
      {/* Factor header */}
      <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${catColor}`}>
              {factor.category.toUpperCase()}
            </span>
            <span className="text-sm font-medium text-gray-200">{factor.label}</span>
            {lowConfidence && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-500 font-medium" title="Geringe Datenqualität für diesen Faktor">
                ~{Math.round((factor.confidence ?? 0) * 100)}% Konfidenz
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-600 font-mono">{factor.source}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">{factor.valueA}</div>
          <div className="text-[10px] text-gray-600">Team A</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">{factor.valueB}</div>
          <div className="text-[10px] text-gray-600">Team B</div>
        </div>
        <div className="text-right grid grid-cols-2 gap-3 min-w-[80px]">
          <EffectChip value={factor.effectA} />
          <EffectChip value={factor.effectB} />
        </div>
      </div>
      {/* Explanation */}
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-500 leading-relaxed">{factor.explanation}</p>
      </div>
    </div>
  )
}

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const match = GROUP_SCHEDULE.find(m => m.id === params.id)
  if (!match) notFound()

  // Fetch all data in parallel
  const [squadA, squadB, resultRes, allResultsRes, eloRes] = await Promise.all([
    supabase.from('players').select('id, name, position, jersey_number, market_value_m, xg_per90, xa_per90, xga_per90, tackles_per90, clearances_per90, goals_conceded_per90, is_in_starting_xi, age, rating').eq('team_id', match.teamAId).order('position').order('market_value_m', { ascending: false }),
    supabase.from('players').select('id, name, position, jersey_number, market_value_m, xg_per90, xa_per90, xga_per90, tackles_per90, clearances_per90, goals_conceded_per90, is_in_starting_xi, age, rating').eq('team_id', match.teamBId).order('position').order('market_value_m', { ascending: false }),
    supabase.from('match_results').select('goals_a, goals_b').eq('match_id', match.id).maybeSingle(),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
    supabase.from('team_elo_ratings').select('team_id, elo_rating, elo_delta_1y, source'),
  ])

  type PlayerRow = {
    market_value_m: number | null; position: string | null
    xg_per90: number | null; xa_per90: number | null; xga_per90: number | null
    tackles_per90: number | null; clearances_per90: number | null; goals_conceded_per90: number | null
    is_in_starting_xi: boolean | null
    age: number | null; rating: number | null
  }

  // Determine elo source for data quality scoring
  // Use the actual source field from the DB if available; fall back to 'fallback-apr2025' when ELO exists but no source is set
  const eloRows = eloRes.data ?? []
  const firstEloSource = eloRows.length > 0 ? (eloRows[0] as { team_id: string; elo_rating: number; source?: string | null }).source ?? 'fallback-apr2025' : null
  const eloSourceForQuality: string | null = eloRows.length > 0 ? firstEloSource : null

  function buildSquadSummary(players: PlayerRow[]): SquadSummary & { usingStartingXI: boolean } {
    const startingXI = players.filter(p => p.is_in_starting_xi === true)
    const effectivePlayers = startingXI.length >= 11 ? startingXI : players
    const usingStartingXI = startingXI.length >= 11

    // Zentrale Berechnung — identische Logik wie match-context und simulate
    const base = computeSquadSummary(effectivePlayers)

    return {
      ...base,
      usingStartingXI,
      dataQuality: computeDataQuality(players, eloSourceForQuality),
    }
  }

  const squadData: Record<string, SquadSummary> = {}
  const lineupStatus: Record<string, boolean> = {}
  if ((squadA.data?.length ?? 0) > 0) {
    const s = buildSquadSummary(squadA.data as PlayerRow[])
    lineupStatus[match.teamAId] = s.usingStartingXI
    squadData[match.teamAId] = s
  }
  if ((squadB.data?.length ?? 0) > 0) {
    const s = buildSquadSummary(squadB.data as PlayerRow[])
    lineupStatus[match.teamBId] = s.usingStartingXI
    squadData[match.teamBId] = s
  }

  // Build results map for standings
  const allResults: Record<string, { goals_a: number; goals_b: number }> = {}
  for (const r of allResultsRes.data ?? []) allResults[r.match_id] = { goals_a: r.goals_a, goals_b: r.goals_b }

  // ELO overrides + sources
  const eloOverrides: Record<string, number> = {}
  const eloSources: Record<string, string> = {}
  for (const r of eloRes.data ?? []) {
    const delta = (r as { elo_delta_1y?: number | null }).elo_delta_1y ?? 0
    eloOverrides[r.team_id] = r.elo_rating + Math.round(delta * 0.2)
    if ((r as { source?: string | null }).source) {
      eloSources[r.team_id] = (r as { source?: string | null }).source!
    }
  }

  // Compute pressure (only for group matches)
  const standings = computeGroupStandings(allResults)
  const matchGroup = match.group ?? ''
  const remainingMatchIds = GROUP_SCHEDULE
    .filter(m => m.group === matchGroup && !allResults[m.id])
    .map(m => m.id)

  const pressureA = computePressure(match.teamAId, matchGroup, standings, remainingMatchIds, allResults)
  const pressureB = computePressure(match.teamBId, matchGroup, standings, remainingMatchIds, allResults)

  const analysis = analyzeMatch(match, squadData, { A: pressureA, B: pressureB }, eloOverrides, eloSources)
  const venue = VENUES[match.venueId]
  const berlinTime = toBerlinTime(match.kickoffUTC)

  const result = resultRes.data

  const pA = Math.round(analysis.winProbA * 100)
  const pD = Math.round(analysis.drawProb * 100)
  const pB = Math.round(analysis.winProbB * 100)

  const confConfig = {
    very_high: { label: 'Sehr sichere Prognose', color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
    high: { label: 'Sichere Prognose', color: 'text-blue-400', bg: 'bg-blue-900/30' },
    medium: { label: 'Offenes Spiel', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    low: { label: 'Sehr offenes Spiel', color: 'text-gray-400', bg: 'bg-gray-800/50' },
  }[analysis.confidence]

  const catOrder: MatchFactor['category'][] = ['elo', 'squad', 'context', 'experience']
  const sortedFactors = [...analysis.factors].sort(
    (a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category)
  )

  // Top-3 Faktoren: sortiert nach absolutem Gesamt-Log-Effekt
  const topFactors = [...analysis.factors]
    .filter(f => Math.abs(f.logEffectA) + Math.abs(f.logEffectB) > 0.003)
    .sort((a, b) => (Math.abs(b.logEffectA) + Math.abs(b.logEffectB)) - (Math.abs(a.logEffectA) + Math.abs(a.logEffectB)))
    .slice(0, 3)

  // Konfidenz-Bandbreite (basierend auf Datenqualität + Matchenge)
  const confRange = { very_high: 3, high: 5, medium: 9, low: 13 }[analysis.confidence]

  const tipLabel = analysis.suggestedTip === '1'
    ? `${analysis.teamA.flag} ${analysis.teamA.name} gewinnt`
    : analysis.suggestedTip === '2'
    ? `${analysis.teamB.flag} ${analysis.teamB.name} gewinnt`
    : 'Unentschieden'

  const resultWinner =
    result && result.goals_a > result.goals_b
      ? analysis.teamA
      : result && result.goals_b > result.goals_a
      ? analysis.teamB
      : null

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Alle Spiele
      </Link>

      {/* Actual result banner */}
      {result && (
        <div className="bg-gray-900 border border-emerald-800/50 rounded-2xl p-5 text-center">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Endstand</div>
          <div className="flex items-center justify-center gap-6">
            <div className="text-right">
              <div className="text-3xl mb-1">{analysis.teamA.flag}</div>
              <div className={`font-bold ${resultWinner?.id === analysis.teamA.id ? 'text-white' : 'text-gray-500'}`}>
                {analysis.teamA.name}
              </div>
            </div>
            <div className="text-4xl font-bold font-mono text-white">
              {result.goals_a} : {result.goals_b}
            </div>
            <div className="text-left">
              <div className="text-3xl mb-1">{analysis.teamB.flag}</div>
              <div className={`font-bold ${resultWinner?.id === analysis.teamB.id ? 'text-white' : 'text-gray-500'}`}>
                {analysis.teamB.name}
              </div>
            </div>
          </div>
          {resultWinner && (
            <div className="mt-3 text-sm text-emerald-400 font-medium">{resultWinner.name} gewinnt</div>
          )}
          {!resultWinner && result && (
            <div className="mt-3 text-sm text-gray-500">Unentschieden</div>
          )}
        </div>
      )}

      {/* Match Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="text-center mb-1">
          <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
            Gruppe {match.group} · Spieltag {match.matchday}
          </span>
        </div>
        <div className="text-center text-xs text-gray-500 mb-6">
          {fmtDate(match.date)} · {berlinTime} Uhr · {venue?.city ?? match.venueId}
        </div>

        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <div className="text-right">
            <div className="text-5xl mb-2">{analysis.teamA.flag}</div>
            <div className="font-bold text-white">{analysis.teamA.name}</div>
            <div className="text-xs text-gray-500 mt-1">{analysis.teamA.confederation}</div>
            <div className="text-xs text-gray-600">ELO {eloOverrides[match.teamAId] ?? analysis.teamA.eloRating}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl text-gray-600 font-light">vs</div>
            <div className="mt-3 text-center">
              <div className="text-xs text-gray-600">xG</div>
              <div className="text-lg font-mono font-bold text-gray-300">
                {analysis.expectedGoalsA.toFixed(1)} : {analysis.expectedGoalsB.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-5xl mb-2">{analysis.teamB.flag}</div>
            <div className="font-bold text-white">{analysis.teamB.name}</div>
            <div className="text-xs text-gray-500 mt-1">{analysis.teamB.confederation}</div>
            <div className="text-xs text-gray-600">ELO {eloOverrides[match.teamBId] ?? analysis.teamB.eloRating}</div>
          </div>
        </div>
      </div>

      {/* Probabilities */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Ausgangsprognose</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className={`rounded-xl p-4 text-center ${pA > pD && pA > pB ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-gray-800/50'}`}>
            <div className="text-2xl font-bold text-white">{pA}%</div>
            <div className="text-xs text-gray-400 mt-1">{analysis.teamA.flag} Sieg</div>
            <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{Math.max(0, pA - confRange)}–{Math.min(100, pA + confRange)}%</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${pD > pA && pD > pB ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-gray-800/50'}`}>
            <div className="text-2xl font-bold text-white">{pD}%</div>
            <div className="text-xs text-gray-400 mt-1">Unentschieden</div>
            <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{Math.max(0, pD - confRange)}–{Math.min(100, pD + confRange)}%</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${pB > pA && pB > pD ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-gray-800/50'}`}>
            <div className="text-2xl font-bold text-white">{pB}%</div>
            <div className="text-xs text-gray-400 mt-1">{analysis.teamB.flag} Sieg</div>
            <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{Math.max(0, pB - confRange)}–{Math.min(100, pB + confRange)}%</div>
          </div>
        </div>

        {/* Bar */}
        <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
          <div className="bg-emerald-500" style={{ width: `${pA}%` }} />
          <div className="bg-gray-600" style={{ width: `${pD}%` }} />
          <div className="bg-blue-500" style={{ width: `${pB}%` }} />
        </div>

        {/* Recommendation */}
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${confConfig.bg}`}>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Empfehlung</div>
            <div className="text-sm font-bold text-white">{tipLabel}</div>
          </div>
          <span className={`text-xs font-medium ${confConfig.color}`}>{confConfig.label}</span>
        </div>

        {/* Data quality / S11 indicator */}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-600 flex-wrap">
          <span className={lineupStatus[match.teamAId] ? 'text-emerald-500' : 'text-gray-600'}>
            {analysis.teamA.flag} {lineupStatus[match.teamAId] ? '✓ S11 aktiv' : '○ Kaderdurchschnitt'}
          </span>
          <span className="text-gray-700">·</span>
          <span className={lineupStatus[match.teamBId] ? 'text-emerald-500' : 'text-gray-600'}>
            {analysis.teamB.flag} {lineupStatus[match.teamBId] ? '✓ S11 aktiv' : '○ Kaderdurchschnitt'}
          </span>
          <span className="text-gray-700">·</span>
          <span>Datenqualität: {Math.round((analysis.regressionWeight) * 100)}% Regression zur Mitte</span>
        </div>
      </div>

      {/* Top-Einflussfaktoren */}
      {topFactors.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Top-Einflussfaktoren
          </h2>
          <div className="space-y-2">
            {topFactors.map(f => {
              const aEffect = Math.round(f.effectA * 100)
              const bEffect = Math.round(f.effectB * 100)
              const aColor = aEffect > 0 ? 'text-emerald-400' : aEffect < 0 ? 'text-rose-400' : 'text-gray-600'
              const bColor = bEffect > 0 ? 'text-emerald-400' : bEffect < 0 ? 'text-rose-400' : 'text-gray-600'
              return (
                <div key={f.label} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-200 font-medium">{f.label}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-sm font-mono">
                    <span className="flex items-center gap-1">
                      <span className="text-gray-600">{analysis.teamA.flag}</span>
                      <span className={`font-bold ${aColor}`}>{aEffect > 0 ? '+' : ''}{aEffect}%</span>
                    </span>
                    <span className="text-gray-700">·</span>
                    <span className="flex items-center gap-1">
                      <span className="text-gray-600">{analysis.teamB.flag}</span>
                      <span className={`font-bold ${bColor}`}>{bEffect > 0 ? '+' : ''}{bEffect}%</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-700 mt-3">
            Prozent = Beitrag zum xG-Wert. Positiv = mehr erwartete Tore. Sortiert nach Gesamteinfluss.
          </p>
        </div>
      )}

      {/* Missing squad data warning */}
      {(!analysis.squadDataA || !analysis.squadDataB) && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-xs text-amber-400">
          <strong>Hinweis:</strong> Für{!analysis.squadDataA && !analysis.squadDataB ? ' beide Teams' : !analysis.squadDataA ? ` ${analysis.teamA.name}` : ` ${analysis.teamB.name}`} sind noch keine Kaderdaten hinterlegt. Der Kader-Marktwert-Faktor wird nicht berechnet.
        </div>
      )}

      {/* Lineup status — shows whether model uses starting XI or full squad */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {[
          { teamId: match.teamAId, name: analysis.teamA.name, flag: analysis.teamA.flag, hasSquad: analysis.squadDataA },
          { teamId: match.teamBId, name: analysis.teamB.name, flag: analysis.teamB.flag, hasSquad: analysis.squadDataB },
        ].map(({ teamId, name, flag, hasSquad }) => {
          const usingXI = lineupStatus[teamId]
          return (
            <div key={teamId} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
              usingXI ? 'border-emerald-700/40 bg-emerald-900/15 text-emerald-400'
              : hasSquad ? 'border-gray-700 bg-gray-800/40 text-gray-500'
              : 'border-amber-900/40 bg-amber-900/10 text-amber-600'
            }`}>
              <span>{flag}</span>
              <span className="font-medium">{name}</span>
              <span className="opacity-70">·</span>
              {usingXI ? (
                <span>Startelf ✓ (fließt ein)</span>
              ) : hasSquad ? (
                <span>Gesamtkader (keine Startelf eingetragen)</span>
              ) : (
                <Link href={`/teams/${teamId}`} className="underline hover:text-amber-400 transition-colors">
                  Kein Kader → hier hinzufügen
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* DataQuality Score Bars */}
      {(analysis.dataQualityA || analysis.dataQualityB) && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datenqualität</h2>
          {[
            { team: analysis.teamA, dq: analysis.dataQualityA },
            { team: analysis.teamB, dq: analysis.dataQualityB },
          ].map(({ team, dq }) => {
            if (!dq) return null
            const badgeStyle = {
              Hoch:    'bg-emerald-900/40 text-emerald-400 border-emerald-800/50',
              Mittel:  'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
              Niedrig: 'bg-rose-900/40 text-rose-400 border-rose-800/50',
            }[dq.badge ?? (dq.overall >= 0.7 ? 'Hoch' : dq.overall >= 0.45 ? 'Mittel' : 'Niedrig')]
            const score = dq.score ?? Math.round(dq.overall * 100)
            const badge = dq.badge ?? (score >= 70 ? 'Hoch' : score >= 45 ? 'Mittel' : 'Niedrig')
            return (
              <div key={team.id} className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base">{team.flag}</span>
                  <span className="text-sm font-medium text-gray-200">{team.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${badgeStyle}`}>
                    {score}/100 · {badge}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] pl-6">
                  <span className={dq.lineupSet ? 'text-emerald-400' : 'text-yellow-500'}>
                    {dq.lineupSet ? '✓ Startelf' : '⚠ Keine Startelf'}
                  </span>
                  <span className={dq.eloFreshness >= 0.7 ? 'text-emerald-400' : dq.eloFreshness >= 0.5 ? 'text-yellow-500' : 'text-rose-400'}>
                    {dq.eloFreshness >= 0.7 ? '✓ ELO aktuell' : dq.eloFreshness >= 0.5 ? '⚠ ELO Fallback' : '✗ Kein ELO'}
                  </span>
                  <span className={dq.xgCoverage >= 0.5 ? 'text-emerald-400' : dq.xgCoverage >= 0.2 ? 'text-yellow-500' : 'text-rose-400'}>
                    {dq.xgCoverage >= 0.5 ? `✓ xG ${Math.round(dq.xgCoverage * 100)}%` : dq.xgCoverage > 0 ? `⚠ xG nur ${Math.round(dq.xgCoverage * 100)}%` : '✗ Kein xG'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Regression warning */}
          {analysis.regressionWeight > 0.2 && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2 text-xs text-amber-400 flex items-start gap-2 mt-2">
              <span className="shrink-0">⚠</span>
              <span>
                Wahrscheinlichkeiten zur Mitte geglättet (Datenqualität: {Math.round((1 - analysis.regressionWeight) * 100)}%) — Ergebnis unsicher
              </span>
            </div>
          )}
        </div>
      )}

      {/* DataQuality Warnings */}
      {[match.teamAId, match.teamBId].some(id => (squadData[id]?.dataQuality?.warnings?.length ?? 0) > 0) && (
        <div className="space-y-1.5">
          {[
            { teamId: match.teamAId, flag: analysis.teamA.flag, name: analysis.teamA.name },
            { teamId: match.teamBId, flag: analysis.teamB.flag, name: analysis.teamB.name },
          ].flatMap(({ teamId, flag, name }) =>
            (squadData[teamId]?.dataQuality?.warnings ?? []).map((w, i) => (
              <div key={`${teamId}-${i}`} className="bg-yellow-900/10 border border-yellow-800/30 rounded-lg px-3 py-2 text-xs text-yellow-600 flex items-start gap-2">
                <span className="shrink-0">{flag}</span>
                <span><strong>{name}:</strong> {w}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Wahrscheinlichste Ergebnisse */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Wahrscheinlichste Ergebnisse</h2>
        <div className="grid grid-cols-4 gap-2">
          {topScorelines(analysis.expectedGoalsA, analysis.expectedGoalsB, MODEL_META.dixonColesRho).map(({ i, j, p }) => {
            const winner = i > j ? 'A' : j > i ? 'B' : 'X'
            const color = winner === 'A' ? 'border-emerald-800/60 bg-emerald-900/10' : winner === 'B' ? 'border-blue-800/60 bg-blue-900/10' : 'border-gray-700 bg-gray-800/30'
            return (
              <div key={`${i}-${j}`} className={`rounded-lg border ${color} p-2 text-center`}>
                <div className="text-sm font-bold font-mono text-white">{i}:{j}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{Math.round(p * 100)}%</div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-700 mt-3">Dixon-Coles-Modell · Grün = {analysis.teamA.flag} gewinnt · Blau = {analysis.teamB.flag} gewinnt · Sortiert nach Wahrscheinlichkeit</p>
      </div>

      {/* Modell-Erklärung */}
      <details className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <summary className="px-5 py-3 cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors list-none flex items-center justify-between">
          <span>Wie wird die Prognose berechnet?</span>
          <span className="text-gray-700">▼</span>
        </summary>
        <div className="px-5 pb-5 pt-2 space-y-4 text-xs text-gray-400">
          <div className="space-y-2">
            <div className="font-semibold text-gray-300">1. Basis-xG (Expected Goals)</div>
            <div className="bg-gray-800 rounded-lg p-3 font-mono text-gray-400 text-[11px]">
              Basis-xG = {MODEL_META.baseGoalRate} Tore/Spiel (kalibriert gegen WM 2022)
            </div>
            <p className="text-gray-500">Jedes Team startet mit dem gleichen Wert. Alle Faktoren (ELO, Marktwert, Aufstellung etc.) multiplizieren diesen Wert in Log-Skala.</p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-300">2. Faktoren in Log-Skala</div>
            <div className="bg-gray-800 rounded-lg p-3 font-mono text-[11px] space-y-1">
              <div className="text-gray-500">log(xG_A) = log({MODEL_META.baseGoalRate})</div>
              {analysis.factors.filter(f => Math.abs(f.logEffectA) > 0.001).map((f, i) => (
                <div key={i} className={f.logEffectA > 0 ? 'text-emerald-400' : f.logEffectA < 0 ? 'text-rose-400' : 'text-gray-600'}>
                  {f.logEffectA >= 0 ? '+' : ''}{f.logEffectA.toFixed(3)} ({f.label})
                </div>
              ))}
              <div className="border-t border-gray-700 pt-1 text-white">
                = log({analysis.expectedGoalsA.toFixed(2)}) → <span className="text-emerald-400">{analysis.expectedGoalsA.toFixed(2)} xG für {analysis.teamA.flag}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-300">3. Poisson-Verteilung + Dixon-Coles-Korrektur</div>
            <p className="text-gray-500">
              Aus den xG-Werten ({analysis.expectedGoalsA.toFixed(2)} für {analysis.teamA.flag}, {analysis.expectedGoalsB.toFixed(2)} für {analysis.teamB.flag}) wird jedes mögliche Ergebnis 0:0 bis 10:10 per Poisson-Formel berechnet.
              Dixon-Coles (ρ={MODEL_META.dixonColesRho}) korrigiert Niedrig-Ergebnisse: erhöht P(0:0) und P(1:1), senkt P(0:1) und P(1:0) leicht — mathematisch realistischer als reines Poisson.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-gray-300">4. Outcome-Wahrscheinlichkeiten</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-emerald-400 font-bold">{Math.round(analysis.winProbA * 100)}%</div>
                <div className="text-gray-600 text-[10px]">{analysis.teamA.flag} Sieg</div>
                <div className="text-gray-700 text-[10px]">= Σ P(i&gt;j)</div>
              </div>
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-gray-300 font-bold">{Math.round(analysis.drawProb * 100)}%</div>
                <div className="text-gray-600 text-[10px]">Unentschieden</div>
                <div className="text-gray-700 text-[10px]">= Σ P(i=j)</div>
              </div>
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-blue-400 font-bold">{Math.round(analysis.winProbB * 100)}%</div>
                <div className="text-gray-600 text-[10px]">{analysis.teamB.flag} Sieg</div>
                <div className="text-gray-700 text-[10px]">= Σ P(i&lt;j)</div>
              </div>
            </div>
            {analysis.regressionWeight > 0.05 && (
              <p className="text-amber-600 text-[11px]">
                ⚠ Regression zur Mitte: {Math.round(analysis.regressionWeight * 100)}% werden zur 33/33/33-Gleichverteilung gemischt (Datenqualität {Math.round((1 - analysis.regressionWeight) * 100)}%).
                Mehr Spielerdaten eintragen → stärkeres Signal.
              </p>
            )}
          </div>

          <div className="text-[11px] text-gray-600 border-t border-gray-800 pt-3">
            Modell v{MODEL_META.version} · Kalibriert gegen WM 2022 Gruppenphase (Grid Search, 210 Kombinationen) · RPS-Skill-Score ~27%
          </div>
        </div>
      </details>

      {/* Lineup Editor */}
      <LineupEditor
        teamA={{ id: match.teamAId, name: analysis.teamA.name, flag: analysis.teamA.flag, players: (squadA.data ?? []) as LineupPlayer[] }}
        teamB={{ id: match.teamBId, name: analysis.teamB.name, flag: analysis.teamB.flag, players: (squadB.data ?? []) as LineupPlayer[] }}
      />

      {/* Factor Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/40 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Faktor-Aufschlüsselung</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-400 font-medium border border-violet-800/40">
              Tor-Modell: Dixon-Coles · Low-Score-Korrektur aktiv
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Effekt auf xG:</span>
            <div className="flex items-center gap-3">
              <span className="text-gray-300">{analysis.teamA.flag} Team A</span>
              <span className="text-gray-300">{analysis.teamB.flag} Team B</span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-800/60">
          {sortedFactors.map((f, i) => (
            <FactorRow key={i} factor={f} />
          ))}
        </div>

        {/* Total */}
        <div className="px-4 py-4 border-t border-gray-700 bg-gray-800/40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Gesamt-Modifikator</div>
              <div className="text-xs text-gray-500 mt-0.5">Multiplikativ auf Base-xG (1.35 Tore)</div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <div className="text-xs text-gray-500 mb-1">{analysis.teamA.flag} xG</div>
                <div className="text-lg font-bold font-mono text-emerald-400">{analysis.expectedGoalsA.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">{analysis.teamB.flag} xG</div>
                <div className="text-lg font-bold font-mono text-blue-400">{analysis.expectedGoalsB.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Venue info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Spielort</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs mb-1">Stadt</div>
            <div className="text-white font-medium">{venue?.city}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">Höhe</div>
            <div className="text-white font-medium">{venue?.altitudeMeters}m</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">WBGT (Hitze)</div>
            <div className="text-white font-medium">{venue?.estimatedWBGT}°C</div>
          </div>
        </div>
      </div>

      {/* Model note */}
      <p className="text-xs text-gray-700 text-center pb-4">
        Poisson + Dixon-Coles + ELO + Kontext-Modifier · Alle Faktoren basieren auf wissenschaftlichen Quellen · Nur Wahrscheinlichkeiten
      </p>
    </div>
  )
}
