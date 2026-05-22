import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { VENUES } from '@/src/data/venues'
import { analyzeMatch, type MatchFactor, type SquadSummary } from '@/lib/modelAdapter'
import { computeDataQuality } from '@/lib/model/dataQuality'
import { computeGroupStandings, computePressure } from '@/lib/standings'
import { toBerlinTime, fmtDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { LineupEditor } from './LineupEditor'
import type { LineupPlayer } from './LineupEditor'

export const dynamic = 'force-dynamic'

function topScorelines(xgA: number, xgB: number, n = 8): { i: number; j: number; p: number }[] {
  const pmf = (lambda: number, k: number) => {
    if (lambda <= 0) return k === 0 ? 1 : 0
    let logP = k * Math.log(lambda) - lambda
    for (let i = 1; i <= k; i++) logP -= Math.log(i)
    return Math.exp(logP)
  }
  const scores: { i: number; j: number; p: number }[] = []
  for (let i = 0; i <= 7; i++) {
    for (let j = 0; j <= 7; j++) {
      scores.push({ i, j, p: pmf(xgA, i) * pmf(xgB, j) })
    }
  }
  return scores.sort((a, b) => b.p - a.p).slice(0, n)
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
    supabase.from('players').select('id, name, position, jersey_number, market_value_m, xg_per90, xga_per90, is_in_starting_xi, age, rating').eq('team_id', match.teamAId).order('position').order('market_value_m', { ascending: false }),
    supabase.from('players').select('id, name, position, jersey_number, market_value_m, xg_per90, xga_per90, is_in_starting_xi, age, rating').eq('team_id', match.teamBId).order('position').order('market_value_m', { ascending: false }),
    supabase.from('match_results').select('goals_a, goals_b').eq('match_id', match.id).maybeSingle(),
    supabase.from('match_results').select('match_id, goals_a, goals_b'),
    supabase.from('team_elo_ratings').select('team_id, elo_rating'),
  ])

  type PlayerRow = {
    market_value_m: number | null; position: string | null
    xg_per90: number | null; xga_per90: number | null
    is_in_starting_xi: boolean | null
    age: number | null; rating: number | null
  }

  function buildSquadSummary(players: PlayerRow[]): SquadSummary & { usingStartingXI: boolean } {
    const startingXI = players.filter(p => p.is_in_starting_xi === true)
    const effectivePlayers = startingXI.length >= 11 ? startingXI : players
    const usingStartingXI = startingXI.length >= 11

    const summary: SquadSummary & { usingStartingXI: boolean } = {
      count: effectivePlayers.length,
      totalMarketValueM: effectivePlayers.reduce((s, p) => s + (p.market_value_m ?? 0), 0),
      usingStartingXI,
    }

    // xG attack: market-value-weighted average so a star striker counts more
    const attackP = effectivePlayers.filter(p => (p.position === 'FWD' || p.position === 'MID') && (p.xg_per90 ?? 0) > 0)
    if (attackP.length > 0) {
      const totalMv = attackP.reduce((s, p) => s + Math.max(p.market_value_m ?? 1, 1), 0)
      summary.avgXgPer90Attack = attackP.reduce((s, p) => s + (p.xg_per90 ?? 0) * Math.max(p.market_value_m ?? 1, 1), 0) / totalMv
    }

    // xGA defense: market-value-weighted
    const defP = effectivePlayers.filter(p => (p.position === 'DEF' || p.position === 'GK') && (p.xga_per90 ?? 0) > 0)
    if (defP.length > 0) {
      const totalMv = defP.reduce((s, p) => s + Math.max(p.market_value_m ?? 1, 1), 0)
      summary.avgXgaPer90Defense = defP.reduce((s, p) => s + (p.xga_per90 ?? 0) * Math.max(p.market_value_m ?? 1, 1), 0) / totalMv
    }

    // Average player rating (1–100) of effective players
    const ratedP = effectivePlayers.filter(p => (p.rating ?? 0) > 0)
    if (ratedP.length > 0) {
      summary.avgRating = ratedP.reduce((s, p) => s + (p.rating ?? 0), 0) / ratedP.length
    }

    // Average age
    const agedP = effectivePlayers.filter(p => (p.age ?? 0) > 0)
    if (agedP.length > 0) {
      summary.avgAge = agedP.reduce((s, p) => s + (p.age ?? 0), 0) / agedP.length
    }

    return summary
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

  // ELO overrides
  const eloOverrides: Record<string, number> = {}
  for (const r of eloRes.data ?? []) eloOverrides[r.team_id] = r.elo_rating

  // Compute pressure (only for group matches)
  const standings = computeGroupStandings(allResults)
  const matchGroup = match.group ?? ''
  const remainingMatchIds = GROUP_SCHEDULE
    .filter(m => m.group === matchGroup && !allResults[m.id])
    .map(m => m.id)

  const pressureA = computePressure(match.teamAId, matchGroup, standings, remainingMatchIds, allResults)
  const pressureB = computePressure(match.teamBId, matchGroup, standings, remainingMatchIds, allResults)

  const analysis = analyzeMatch(match, squadData, { A: pressureA, B: pressureB }, eloOverrides)
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
          </div>
          <div className={`rounded-xl p-4 text-center ${pD > pA && pD > pB ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-gray-800/50'}`}>
            <div className="text-2xl font-bold text-white">{pD}%</div>
            <div className="text-xs text-gray-400 mt-1">Unentschieden</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${pB > pA && pB > pD ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-gray-800/50'}`}>
            <div className="text-2xl font-bold text-white">{pB}%</div>
            <div className="text-xs text-gray-400 mt-1">{analysis.teamB.flag} Sieg</div>
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
      </div>

      {/* Missing squad data warning */}
      {(!analysis.squadDataA || !analysis.squadDataB) && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-xs text-amber-400">
          <strong>Hinweis:</strong> Für{!analysis.squadDataA && !analysis.squadDataB ? ' beide Teams' : !analysis.squadDataA ? ` ${analysis.teamA.name}` : ` ${analysis.teamB.name}`} sind noch keine Kaderdaten hinterlegt. Der Kader-Marktwert-Faktor wird nicht berechnet.
        </div>
      )}

      {/* Lineup status — shows whether model uses starting XI or full squad */}
      {(analysis.squadDataA || analysis.squadDataB) && (
        <div className="flex items-center gap-3 text-xs">
          {[
            { teamId: match.teamAId, name: analysis.teamA.name, flag: analysis.teamA.flag, hasSquad: analysis.squadDataA },
            { teamId: match.teamBId, name: analysis.teamB.name, flag: analysis.teamB.flag, hasSquad: analysis.squadDataB },
          ].map(({ teamId, name, flag, hasSquad }) => {
            const usingXI = lineupStatus[teamId]
            return (
              <div key={teamId} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                usingXI ? 'border-emerald-700/40 bg-emerald-900/15 text-emerald-400' : hasSquad ? 'border-gray-700 bg-gray-800/40 text-gray-500' : 'border-gray-800 bg-gray-900 text-gray-700'
              }`}>
                <span>{flag}</span>
                <span className="font-medium">{name}</span>
                <span className="opacity-70">·</span>
                <span>{usingXI ? 'Startelf ✓ (fließt ein)' : hasSquad ? 'Gesamtkader (keine Startelf)' : 'Kein Kader'}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Wahrscheinlichste Ergebnisse */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Wahrscheinlichste Ergebnisse</h2>
        <div className="grid grid-cols-4 gap-2">
          {topScorelines(analysis.expectedGoalsA, analysis.expectedGoalsB).map(({ i, j, p }) => {
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
        <p className="text-[10px] text-gray-700 mt-3">Poisson-Modell · Grün = {analysis.teamA.flag} gewinnt · Blau = {analysis.teamB.flag} gewinnt</p>
      </div>

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
