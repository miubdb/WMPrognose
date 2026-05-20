'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TeamBasic } from '@/src/data/allTeams'
import { MatchPredictionResult } from '@/src/model/predictMatch'
import { VenueData } from '@/src/data/venues'

interface MatchDetailTabsProps {
  matchId: string
  teamA: TeamBasic
  teamB: TeamBasic
  prediction: MatchPredictionResult
  venue: VenueData | undefined
  venueName: string
  matchGroup?: string
  matchday?: number
  matchDate: string
  kickoffUTC: string
}

type TabKey = 'prediction' | 'lineup' | 'explanation' | 'scorelines' | 'context'

const FORMATIONS = ['4-3-3', '4-2-3-1', '3-4-3', '4-4-2'] as const
type Formation = (typeof FORMATIONS)[number]

export default function MatchDetailTabs({
  matchId,
  teamA,
  teamB,
  prediction,
  venue,
  venueName,
  matchGroup,
  matchday,
  matchDate,
  kickoffUTC,
}: MatchDetailTabsProps) {
  const [tab, setTab] = useState<TabKey>('prediction')

  const winA = Math.round(prediction.winProbabilityTeamA * 100)
  const draw = Math.round(prediction.drawProbability * 100)
  const winB = Math.round(prediction.winProbabilityTeamB * 100)
  const xgA = prediction.expectedGoalsTeamA
  const xgB = prediction.expectedGoalsTeamB
  const xgTotal = xgA + xgB
  const xgPctA = xgTotal > 0 ? (xgA / xgTotal) * 100 : 50
  const xgPctB = xgTotal > 0 ? (xgB / xgTotal) * 100 : 50
  const ratingDiff = teamA.overallRating - teamB.overallRating
  const favoriteA = ratingDiff > 5
  const favoriteB = ratingDiff < -5

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'prediction',   label: 'Prognose'      },
    { key: 'lineup',       label: 'Startelf'      },
    { key: 'explanation',  label: 'Erklärung'     },
    { key: 'scorelines',   label: 'Scorelines'    },
    { key: 'context',      label: 'Kontext'       },
  ]

  return (
    <div className="space-y-4">
      {/* Match Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/60 text-xs text-gray-400">
          {matchGroup && (
            <span className="font-medium text-emerald-400">
              Gruppe {matchGroup} · Spieltag {matchday}
            </span>
          )}
          <span>{matchDate} · {kickoffUTC} UTC</span>
        </div>
        <div className="flex items-stretch">
          <div className={`flex-1 flex flex-col items-center justify-center py-5 px-4 border-r border-gray-800 ${favoriteA ? 'bg-emerald-950/30' : ''}`}>
            <div className="text-4xl mb-1">{teamA.flag}</div>
            <Link href={`/teams/${teamA.id}`} className="font-bold text-center hover:text-emerald-400 transition-colors text-sm leading-tight">{teamA.name}</Link>
            <div className="mt-1.5 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">ELO {teamA.eloRating}</span>
              {favoriteA && <span className="text-xs bg-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full">Favorit</span>}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center px-4 py-3 text-center min-w-[80px]">
            <div className="text-gray-500 text-lg font-bold">vs</div>
            <div className="text-xs text-gray-600 mt-1 max-w-[100px] leading-tight">{venueName}</div>
          </div>
          <div className={`flex-1 flex flex-col items-center justify-center py-5 px-4 border-l border-gray-800 ${favoriteB ? 'bg-blue-950/30' : ''}`}>
            <div className="text-4xl mb-1">{teamB.flag}</div>
            <Link href={`/teams/${teamB.id}`} className="font-bold text-center hover:text-blue-400 transition-colors text-sm leading-tight">{teamB.name}</Link>
            <div className="mt-1.5 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">ELO {teamB.eloRating}</span>
              {favoriteB && <span className="text-xs bg-blue-800 text-blue-300 px-2 py-0.5 rounded-full">Favorit</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'prediction' && (
        <PredictionTab
          teamA={teamA}
          teamB={teamB}
          winA={winA}
          draw={draw}
          winB={winB}
          xgA={xgA}
          xgB={xgB}
          xgPctA={xgPctA}
          xgPctB={xgPctB}
          prediction={prediction}
        />
      )}
      {tab === 'lineup' && (
        <LineupTab matchId={matchId} teamA={teamA} teamB={teamB} />
      )}
      {tab === 'explanation' && (
        <ExplanationTab teamA={teamA} teamB={teamB} prediction={prediction} venue={venue} />
      )}
      {tab === 'scorelines' && (
        <ScorelineTab teamA={teamA} teamB={teamB} xgA={xgA} xgB={xgB} prediction={prediction} />
      )}
      {tab === 'context' && (
        <ContextTab teamA={teamA} teamB={teamB} venue={venue} prediction={prediction} />
      )}
    </div>
  )
}

// ─── Tab: Prognose ─────────────────────────────────────────────────────────────

function PredictionTab({
  teamA,
  teamB,
  winA,
  draw,
  winB,
  xgA,
  xgB,
  xgPctA,
  xgPctB,
  prediction,
}: {
  teamA: TeamBasic
  teamB: TeamBasic
  winA: number
  draw: number
  winB: number
  xgA: number
  xgB: number
  xgPctA: number
  xgPctB: number
  prediction: MatchPredictionResult
}) {
  return (
    <div className="space-y-4">
      {/* 1X2 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '1', sublabel: teamA.name, prob: winA, color: 'text-emerald-400' },
            { label: 'X', sublabel: 'Unentschieden', prob: draw, color: 'text-gray-300' },
            { label: '2', sublabel: teamB.name, prob: winB, color: 'text-blue-400' },
          ].map(({ label, sublabel, prob, color }) => (
            <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 font-bold mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{prob}%</div>
              <div className="text-xs text-gray-500 mt-1 truncate">{sublabel}</div>
            </div>
          ))}
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden mt-3">
          <div className="bg-emerald-500 h-full" style={{ width: `${winA}%` }} />
          <div className="bg-gray-500 h-full" style={{ width: `${draw}%` }} />
          <div className="bg-blue-500 h-full" style={{ width: `${winB}%` }} />
        </div>
      </div>

      {/* xG */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4 text-sm">Expected Goals (xG)</h2>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-mono font-bold text-emerald-400 min-w-[3rem] text-right">{xgA.toFixed(2)}</span>
          <div className="flex-1 flex h-5 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500 flex items-center justify-end pr-1.5" style={{ width: `${xgPctA}%` }}>
              {xgPctA > 25 && <span className="text-xs text-white font-medium">{teamA.name.slice(0, 3)}</span>}
            </div>
            <div className="bg-blue-500 flex items-center justify-start pl-1.5" style={{ width: `${xgPctB}%` }}>
              {xgPctB > 25 && <span className="text-xs text-white font-medium">{teamB.name.slice(0, 3)}</span>}
            </div>
          </div>
          <span className="text-2xl font-mono font-bold text-blue-400 min-w-[3rem]">{xgB.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />{teamA.name}</span>
          <span className="text-gray-600">xG gesamt: {(xgA + xgB).toFixed(2)}</span>
          <span className="flex items-center gap-1">{teamB.name}<span className="w-2 h-2 bg-blue-500 rounded-full inline-block" /></span>
        </div>
      </div>

      {/* Top 5 Scorelines */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4 text-sm">Top 5 wahrscheinlichste Ergebnisse</h2>
        <div className="grid grid-cols-5 gap-2">
          {prediction.top5Scorelines.map((s, i) => {
            const isWinA = s.goalsA > s.goalsB
            const isWinB = s.goalsB > s.goalsA
            return (
              <div
                key={i}
                className={`rounded-xl p-3 text-center border ${
                  i === 0 ? 'border-emerald-700 bg-emerald-950/40' : 'border-gray-800 bg-gray-800/50'
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">#{i + 1}</div>
                <div className={`text-xl font-mono font-bold ${isWinA ? 'text-emerald-400' : isWinB ? 'text-blue-400' : 'text-gray-300'}`}>
                  {s.goalsA}:{s.goalsB}
                </div>
                <div className={`text-xs font-medium mt-1 ${i === 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {(s.probability * 100).toFixed(1)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Startelf ─────────────────────────────────────────────────────────────

interface LineupSlot {
  name: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  rating?: number
}

function useLocalLineup(matchId: string, teamId: string, defaultLineup: LineupSlot[]) {
  const key = `lineup_${matchId}_${teamId}`
  const [lineup, setLineup] = useState<LineupSlot[]>(defaultLineup)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) setLineup(JSON.parse(saved) as LineupSlot[])
    } catch { /* ignore */ }
  }, [key])

  const save = (l: LineupSlot[]) => {
    setLineup(l)
    try { localStorage.setItem(key, JSON.stringify(l)) } catch { /* ignore */ }
  }

  return [lineup, save] as const
}

function LineupTab({ matchId, teamA, teamB }: { matchId: string; teamA: TeamBasic; teamB: TeamBasic }) {
  const [formA, setFormA] = useState<Formation>('4-3-3')
  const [formB, setFormB] = useState<Formation>('4-3-3')
  const [lineupA, setLineupA] = useLocalLineup(matchId, teamA.id, [])
  const [lineupB, setLineupB] = useLocalLineup(matchId, teamB.id, [])

  const posColors: Record<string, string> = {
    GK:  'bg-yellow-900/40 text-yellow-400',
    DEF: 'bg-emerald-900/40 text-emerald-400',
    MID: 'bg-blue-900/40 text-blue-400',
    FWD: 'bg-rose-900/40 text-rose-400',
  }

  const TeamBox = ({
    team,
    lineup,
    formation,
    setFormation,
    setLineup,
  }: {
    team: TeamBasic
    lineup: LineupSlot[]
    formation: Formation
    setFormation: (f: Formation) => void
    setLineup: (l: LineupSlot[]) => void
  }) => {
    const missingGK  = lineup.filter(p => p.position === 'GK').length  === 0
    const hasNoPlayers = lineup.length === 0

    return (
      <div className="flex-1 min-w-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between gap-2">
          <span className="font-semibold text-sm flex items-center gap-2">
            <span>{team.flag}</span>
            <span className="truncate">{team.name}</span>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            lineup.length === 11 ? 'bg-emerald-900 text-emerald-400' : 'bg-yellow-900 text-yellow-400'
          }`}>{lineup.length}/11</span>
        </div>

        {/* Formation */}
        <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
          <span className="text-xs text-gray-500">Formation:</span>
          <select
            value={formation}
            onChange={e => setFormation(e.target.value as Formation)}
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-emerald-500"
          >
            {FORMATIONS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Warnings */}
        <div className="px-3 py-2 space-y-1">
          {missingGK && lineup.length > 0 && (
            <div className="text-xs text-rose-400 bg-rose-900/20 rounded px-2 py-1">Kein Torwart gewählt</div>
          )}
          {hasNoPlayers && (
            <div className="text-xs text-gray-500 text-center py-4">
              Keine Spielerdaten verfügbar.<br />
              <span className="text-gray-600">Spieler über den Kader-Tab hinzufügen.</span>
            </div>
          )}
        </div>

        {/* Lineup list */}
        {lineup.length > 0 && (
          <div className="divide-y divide-gray-800">
            {lineup.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${posColors[p.position] ?? 'bg-gray-800 text-gray-400'}`}>{p.position}</span>
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <button
                  onClick={() => setLineup(lineup.filter((_, j) => j !== i))}
                  className="text-rose-500 hover:text-rose-400 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-3 py-2 border-t border-gray-800">
          <button
            onClick={() => setLineup([])}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ↺ Zurücksetzen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Startelf-Konfiguration wird per Spielpaar im Browser gespeichert. Spielerdaten aus dem Kader-Tab oder der Teams-Seite verfügbar.
      </p>
      <div className="flex gap-3 flex-col sm:flex-row">
        <TeamBox team={teamA} lineup={lineupA} formation={formA} setFormation={setFormA} setLineup={setLineupA} />
        <TeamBox team={teamB} lineup={lineupB} formation={formB} setFormation={setFormB} setLineup={setLineupB} />
      </div>
      <p className="text-xs text-gray-600 text-center">
        Vorschlag: Nutze die{' '}
        <Link href={`/teams/${teamA.id}?tab=squad`} className="text-emerald-500 hover:text-emerald-400">
          Kader-Seite
        </Link>{' '}
        um Startelf zu setzen, die dann hier erscheint.
      </p>
    </div>
  )
}

// ─── Tab: Erklärung ────────────────────────────────────────────────────────────

function ExplanationTab({
  teamA,
  teamB,
  prediction,
  venue,
}: {
  teamA: TeamBasic
  teamB: TeamBasic
  prediction: MatchPredictionResult
  venue: VenueData | undefined
}) {
  const ctxBreak = prediction.contextBreakdown as Record<string, number> | undefined
  const modA = ctxBreak?.teamAContextModifier ?? 1
  const modB = ctxBreak?.teamBContextModifier ?? 1

  const ratings = [
    { label: 'ELO Rating',      valA: teamA.eloRating,        valB: teamB.eloRating,        fmt: (v: number) => String(v)       },
    { label: 'Marktwert (€M)',  valA: teamA.squadMarketValueM, valB: teamB.squadMarketValueM, fmt: (v: number) => `€${v}M`      },
    { label: 'Angriff',         valA: teamA.attackRating,      valB: teamB.attackRating,      fmt: (v: number) => `${v}/100`    },
    { label: 'Mittelfeld',      valA: teamA.midfieldRating,    valB: teamB.midfieldRating,    fmt: (v: number) => `${v}/100`    },
    { label: 'Abwehr',          valA: teamA.defenseRating,     valB: teamB.defenseRating,     fmt: (v: number) => `${v}/100`    },
    { label: 'Torwart',         valA: teamA.goalkeeperRating,  valB: teamB.goalkeeperRating,  fmt: (v: number) => `${v}/100`    },
    { label: 'Standards',       valA: teamA.setPieceRating,    valB: teamB.setPieceRating,    fmt: (v: number) => `${v}/100`    },
  ]

  const contextFactors = venue ? [
    { icon: '🏔', label: `Höhe (${venue.altitudeMeters}m)`,          modAVal: modA.toFixed(3),  modBVal: modB.toFixed(3)  },
    { icon: '🌡', label: `Hitze (WBGT ${venue.estimatedWBGT}°C)`,    modAVal: modA.toFixed(3),  modBVal: modB.toFixed(3)  },
    { icon: '✈', label: 'Reise',                                      modAVal: '–',              modBVal: '–'              },
    { icon: '😴', label: 'Rest Days (6 Tage)',                         modAVal: '×1.000',         modBVal: '×1.000'         },
    { icon: '🏠', label: 'Heimvorteil',                                modAVal: '–',              modBVal: '–'              },
  ] : []

  const modelRefs = [
    { icon: '📊', label: 'Poisson-Scoreline-Modell (Maher 1982)',          ok: true },
    { icon: '🔧', label: 'Dixon-Coles Low-Score-Korrektur (1997)',          ok: true },
    { icon: '📈', label: 'ELO-Ratings (Hvattum & Arntzen 2010)',            ok: true },
    { icon: '💰', label: 'Log-Marktwert (Peeters 2018)',                    ok: true },
    { icon: '👴', label: 'Peak-Age-Kurve (Dendir 2016)',                    ok: true },
    { icon: '🌡', label: 'Kontext-Modifier (McSharry/Mohr/Reilly)',        ok: true },
  ]

  return (
    <div className="space-y-4">
      {/* Rating Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 text-sm font-semibold">Rating Breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="px-4 py-2 text-left">Faktor</th>
                <th className="px-4 py-2 text-right text-emerald-400">{teamA.flag} {teamA.name}</th>
                <th className="px-4 py-2 text-right text-blue-400">{teamB.flag} {teamB.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {ratings.map(r => (
                <tr key={r.label} className="hover:bg-gray-800/30">
                  <td className="px-4 py-2 text-gray-400">{r.label}</td>
                  <td className={`px-4 py-2 text-right font-mono ${r.valA >= r.valB ? 'text-emerald-400' : 'text-gray-300'}`}>{r.fmt(r.valA)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${r.valB > r.valA ? 'text-blue-400' : 'text-gray-300'}`}>{r.fmt(r.valB)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-700 font-semibold">
                <td className="px-4 py-2 text-gray-300">xG (erwartet)</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-400">{prediction.expectedGoalsTeamA.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono text-blue-400">{prediction.expectedGoalsTeamB.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Kontext-Faktoren */}
      {contextFactors.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 text-sm font-semibold">Kontext-Faktoren</div>
          <div className="divide-y divide-gray-800/50">
            {contextFactors.map(f => (
              <div key={f.label} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <span className="text-base">{f.icon}</span>
                <span className="flex-1 text-gray-400">{f.label}</span>
                <span className={`font-mono w-16 text-right ${
                  f.modAVal.startsWith('×') && parseFloat(f.modAVal.slice(1)) >= 1 ? 'text-emerald-400' :
                  f.modAVal.startsWith('×') ? 'text-rose-400' : 'text-gray-500'
                }`}>{f.modAVal}</span>
                <span className={`font-mono w-16 text-right ${
                  f.modBVal.startsWith('×') && parseFloat(f.modBVal.slice(1)) >= 1 ? 'text-blue-400' :
                  f.modBVal.startsWith('×') ? 'text-rose-400' : 'text-gray-500'
                }`}>{f.modBVal}</span>
              </div>
            ))}
          </div>
          {ctxBreak && (
            <div className="px-4 py-2 border-t border-gray-800 flex gap-6 text-xs">
              <div>
                <span className="text-gray-500">Gesamt {teamA.name}: </span>
                <span className={modA >= 1 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>×{modA.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-500">Gesamt {teamB.name}: </span>
                <span className={modB >= 1 ? 'text-blue-400 font-mono' : 'text-rose-400 font-mono'}>×{modB.toFixed(3)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modell-Infos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-semibold mb-3">Verwendete Modell-Komponenten</div>
        <div className="space-y-2">
          {modelRefs.map(m => (
            <div key={m.label} className="flex items-center gap-2 text-xs">
              <span className="text-base">{m.icon}</span>
              <span className="flex-1 text-gray-400">{m.label}</span>
              <span className="text-emerald-400">✅</span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Link href="/modell" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            Vollständige Modell-Dokumentation →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Scorelines ───────────────────────────────────────────────────────────

function ScorelineTab({
  teamA,
  teamB,
  xgA,
  xgB,
  prediction,
}: {
  teamA: TeamBasic
  teamB: TeamBasic
  xgA: number
  xgB: number
  prediction: MatchPredictionResult
}) {
  function poissonPdf(k: number, lambda: number): number {
    let result = Math.exp(-lambda)
    for (let i = 1; i <= k; i++) result *= lambda / i
    return result
  }

  const grid: { goalsA: number; goalsB: number; prob: number }[] = []
  let maxProb = 0
  for (let a = 0; a <= 4; a++) {
    for (let b = 0; b <= 4; b++) {
      const prob = poissonPdf(a, xgA) * poissonPdf(b, xgB)
      grid.push({ goalsA: a, goalsB: b, prob })
      if (prob > maxProb) maxProb = prob
    }
  }

  return (
    <div className="space-y-4">
      {/* Heatmap */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-2 text-sm">Ergebnis-Heatmap</h2>
        <p className="text-xs text-gray-500 mb-3">Wahrscheinlichkeit für jedes Ergebnis (Poisson-Modell)</p>
        <div className="overflow-x-auto">
          <table className="mx-auto text-xs">
            <thead>
              <tr>
                <th className="w-10 text-gray-600 text-right pr-2"></th>
                {[0, 1, 2, 3, 4].map(b => (
                  <th key={b} className="w-12 text-center text-gray-500 pb-1">
                    {teamB.name.slice(0, 3)} {b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map(a => (
                <tr key={a}>
                  <td className="text-gray-500 text-right pr-2 py-0.5 whitespace-nowrap">{teamA.name.slice(0, 3)} {a}</td>
                  {[0, 1, 2, 3, 4].map(b => {
                    const cell = grid.find(g => g.goalsA === a && g.goalsB === b)
                    const prob = cell?.prob ?? 0
                    const intensity = maxProb > 0 ? prob / maxProb : 0
                    const bgClass =
                      intensity > 0.8 ? 'bg-emerald-500 text-black' :
                      intensity > 0.5 ? 'bg-emerald-700 text-white' :
                      intensity > 0.25 ? 'bg-emerald-900 text-emerald-300' :
                      'bg-gray-800 text-gray-500'
                    return (
                      <td key={b} className={`w-12 h-8 text-center rounded ${bgClass}`}>
                        {(prob * 100).toFixed(1)}%
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Scorelines */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3 text-sm">Top 5 Scorelines</h2>
        <div className="space-y-2">
          {prediction.top5Scorelines.map((s, i) => {
            const isWinA = s.goalsA > s.goalsB
            const isWinB = s.goalsB > s.goalsA
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-6">#{i + 1}</span>
                <span className={`font-mono font-bold text-lg ${isWinA ? 'text-emerald-400' : isWinB ? 'text-blue-400' : 'text-gray-300'}`}>
                  {s.goalsA}:{s.goalsB}
                </span>
                <span className="text-gray-500 flex-1">
                  {isWinA ? `Sieg ${teamA.name}` : isWinB ? `Sieg ${teamB.name}` : 'Unentschieden'}
                </span>
                <span className={`font-mono ${i === 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {(s.probability * 100).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Kontext ──────────────────────────────────────────────────────────────

function ContextTab({
  teamA,
  teamB,
  venue,
  prediction,
}: {
  teamA: TeamBasic
  teamB: TeamBasic
  venue: VenueData | undefined
  prediction: MatchPredictionResult
}) {
  if (!venue) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
        Keine Venue-Daten verfügbar.
      </div>
    )
  }

  const ctxBreak = prediction.contextBreakdown as Record<string, number> | undefined

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3 text-sm">Venue &amp; Umgebung</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-500 text-xs">Stadt</div>
            <div>{venue.city}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Höhe</div>
            <div>{venue.altitudeMeters}m</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Kapazität</div>
            <div>{venue.capacity.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Temperatur (Juni)</div>
            <div>{venue.expectedTemperatureC}°C</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Luftfeuchtigkeit</div>
            <div>{venue.expectedHumidityPercent}%</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">WBGT</div>
            <div className={venue.estimatedWBGT > 28 ? 'text-rose-400' : 'text-emerald-400'}>
              {venue.estimatedWBGT}°C
            </div>
          </div>
        </div>

        {ctxBreak && (
          <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-2 text-xs">
            {[
              { label: `${teamA.name} Kontext-Modifier`, val: ctxBreak.teamAContextModifier },
              { label: `${teamB.name} Kontext-Modifier`, val: ctxBreak.teamBContextModifier },
            ].map(({ label, val }) => (
              <div key={label}>
                <span className="text-gray-500">{label}: </span>
                <span className={val >= 1 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                  ×{typeof val === 'number' ? val.toFixed(3) : '–'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {prediction.modelNotes.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm">Modell-Notizen</h2>
          <div className="space-y-1">
            {prediction.modelNotes.slice(0, 8).map((note, i) => (
              <p key={i} className="text-xs text-gray-500">{note}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
