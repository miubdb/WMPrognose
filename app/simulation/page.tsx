'use client'

import { useState } from 'react'

interface TeamStageProb {
  teamId: string
  name: string
  flag: string
  group: string
  confederation: string
  probGroupAdvance: number
  probFirst: number
  probSecond: number
  probThird: number
  probFourth: number
  probR32Win: number
  probR16Win: number
  probQFWin: number
  probSFWin: number
  probWinner: number
  avgGoalsFor: number
  avgGoalsAgainst: number
}

interface TopScorer {
  id: string
  name: string
  teamId: string
  teamName: string
  teamFlag: string
  position: string
  xgPer90: number
  expectedGoals: number
}

const N_OPTIONS = [1000, 5000, 10000, 50000] as const

const CONFEDERATION_COLORS: Record<string, string> = {
  UEFA:     'text-blue-400',
  CONMEBOL: 'text-emerald-400',
  CONCACAF: 'text-orange-400',
  CAF:      'text-yellow-400',
  AFC:      'text-red-400',
  OFC:      'text-purple-400',
}

const CONFEDERATION_BG: Record<string, string> = {
  UEFA:     'bg-blue-950/30',
  CONMEBOL: 'bg-emerald-950/30',
  CONCACAF: 'bg-orange-950/30',
  CAF:      'bg-yellow-950/30',
  AFC:      'bg-red-950/30',
  OFC:      'bg-purple-950/30',
}

function pct(v: number, decimals = 1): string {
  if (v >= 0.995) return '99%'
  if (v < 0.001) return '<0.1%'
  return (v * 100).toFixed(decimals) + '%'
}

function ProbBar({ value, color = 'bg-emerald-500' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 text-right tabular-nums text-sm">{pct(value)}</div>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden min-w-[48px]">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
    </div>
  )
}

// ── Gruppenpositionen ─────────────────────────────────────────────────────────

function GroupPositionCard({ group, teams }: { group: string; teams: TeamStageProb[] }) {
  const sorted = [...teams].sort((a, b) => b.probFirst - a.probFirst)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-gray-800/50 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Gruppe {group}</span>
        <span className="text-[10px] text-gray-600">1. · 2. · 3. · 4.</span>
      </div>
      <div className="divide-y divide-gray-800/60">
        {sorted.map(team => (
          <div key={team.teamId} className="px-3 py-2 flex items-center gap-2">
            <span className="text-base w-6 flex-shrink-0">{team.flag}</span>
            <span className="text-xs text-gray-300 flex-1 truncate min-w-0">{team.name}</span>
            <div className="flex gap-1.5 text-[11px] tabular-nums font-mono flex-shrink-0">
              <span className="w-11 text-right text-emerald-400">{pct(team.probFirst, 0)}</span>
              <span className="w-11 text-right text-blue-400">{pct(team.probSecond, 0)}</span>
              <span className="w-11 text-right text-yellow-600">{pct(team.probThird, 0)}</span>
              <span className="w-11 text-right text-gray-600">{pct(team.probFourth, 0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Torschützenkönig ──────────────────────────────────────────────────────────

function TopScorersSection({ scorers }: { scorers: TopScorer[] }) {
  const max = scorers[0]?.expectedGoals ?? 1
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/80 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left w-8">#</th>
              <th className="px-3 py-3 text-left">Spieler</th>
              <th className="px-3 py-3 text-center w-12">Pos</th>
              <th className="px-3 py-3 text-left">Team</th>
              <th className="px-3 py-3 text-right w-20">xG/90</th>
              <th className="px-3 py-3 text-left min-w-[160px]">Erwartete Tore</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((player, idx) => (
              <tr key={player.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-3 py-2.5 text-gray-500 tabular-nums text-xs">{idx + 1}</td>
                <td className="px-3 py-2.5 font-medium text-white">{player.name}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    player.position === 'FWD'
                      ? 'bg-orange-900/40 text-orange-400'
                      : 'bg-blue-900/40 text-blue-400'
                  }`}>{player.position}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span>{player.teamFlag}</span>
                    <span className="text-gray-400 text-xs">{player.teamName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 text-xs">
                  {player.xgPer90.toFixed(2)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-right tabular-nums text-sm text-amber-300 font-medium">
                      {player.expectedGoals.toFixed(2)}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(100, (player.expectedGoals / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 text-center">
        Erwartete Tore = Team-Turniertore (Simulation) × Anteil xG/90 des Spielers im Kader (FWD + MID)
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const [n, setN] = useState<number>(10000)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TeamStageProb[] | null>(null)
  const [topScorers, setTopScorers] = useState<TopScorer[]>([])
  const [simCount, setSimCount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('Alle')
  const [activeTab, setActiveTab] = useState<'tournament' | 'groups' | 'scorers'>('tournament')

  const CONFEDERATIONS = ['Alle', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC']

  async function runSim() {
    setLoading(true)
    setError(null)
    setResults(null)
    setTopScorers([])

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { ok: boolean; n: number; results: TeamStageProb[]; topScorers: TopScorer[] }
      setResults(data.results)
      setTopScorers(data.topScorers ?? [])
      setSimCount(data.n)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  const filtered = results?.filter(t =>
    filter === 'Alle' || t.confederation === filter
  ) ?? []

  // Gruppen-Map
  const groupMap: Record<string, TeamStageProb[]> = {}
  if (results) {
    for (const team of results) {
      if (!groupMap[team.group]) groupMap[team.group] = []
      groupMap[team.group].push(team)
    }
  }
  const sortedGroups = Object.keys(groupMap).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">WM 2026 Monte-Carlo-Simulation</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Simuliert das gesamte Turnier X-mal mit demselben Modell wie die Spielprognosen (Dixon-Coles + ELO + Marktwert).
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Anzahl Simulationen</label>
          <div className="flex gap-2 flex-wrap">
            {N_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setN(opt)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  n === opt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {opt.toLocaleString('de-DE')}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {n === 1000 ? 'Schnell ~0.3s' : n === 5000 ? 'Gut ~1s' : n === 10000 ? 'Empfohlen ~2s' : 'Sehr genau ~8s'}
          </p>
        </div>

        <button
          onClick={runSim}
          disabled={loading}
          className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {loading
            ? `Simuliere ${n.toLocaleString('de-DE')} Turniere…`
            : 'Simulation starten'}
        </button>

        {error && (
          <div className="text-red-400 text-sm bg-red-950/30 border border-red-800 rounded-lg p-3">
            Fehler: {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
            {([
              { id: 'tournament', label: 'Turnierverlauf' },
              { id: 'groups',     label: 'Gruppenpositionen' },
              { id: 'scorers',    label: `Torschützenkönig${topScorers.length > 0 ? ` (${topScorers.length})` : ''}` },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Turnierverlauf */}
          {activeTab === 'tournament' && (
            <div className="space-y-3">
              {/* Confederation filter */}
              <div className="flex flex-wrap gap-2">
                {CONFEDERATIONS.map(conf => (
                  <button
                    key={conf}
                    onClick={() => setFilter(conf)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === conf
                        ? 'bg-emerald-700 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {conf}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900/80 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-3 py-3 text-left w-8">#</th>
                      <th className="px-3 py-3 text-left">Team</th>
                      <th className="px-3 py-3 text-center">Gr.</th>
                      <th className="px-3 py-3 text-left min-w-[120px]">Gruppe weiter</th>
                      <th className="px-3 py-3 text-left min-w-[120px]">Achtelfinale</th>
                      <th className="px-3 py-3 text-left min-w-[120px]">Viertelfinale</th>
                      <th className="px-3 py-3 text-left min-w-[120px]">Halbfinale</th>
                      <th className="px-3 py-3 text-left min-w-[120px]">Finale</th>
                      <th className="px-3 py-3 text-left min-w-[120px]">Sieger</th>
                      <th className="px-3 py-3 text-right">Tore &Oslash;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(team => {
                      const rank = results.indexOf(team) + 1
                      const confColor = CONFEDERATION_COLORS[team.confederation] ?? 'text-gray-400'
                      const confBg = CONFEDERATION_BG[team.confederation] ?? ''

                      return (
                        <tr
                          key={team.teamId}
                          className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${confBg}`}
                        >
                          <td className="px-3 py-2.5 text-gray-500 tabular-nums text-xs">{rank}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{team.flag}</span>
                              <div>
                                <div className="font-medium text-white leading-tight">{team.name}</div>
                                <div className={`text-xs ${confColor}`}>{team.confederation}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="text-xs font-bold text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                              {team.group}
                            </span>
                          </td>
                          <td className="px-3 py-2.5"><ProbBar value={team.probGroupAdvance} color="bg-gray-500" /></td>
                          <td className="px-3 py-2.5"><ProbBar value={team.probR32Win} color="bg-blue-500" /></td>
                          <td className="px-3 py-2.5"><ProbBar value={team.probR16Win} color="bg-cyan-500" /></td>
                          <td className="px-3 py-2.5"><ProbBar value={team.probQFWin} color="bg-yellow-500" /></td>
                          <td className="px-3 py-2.5"><ProbBar value={team.probSFWin} color="bg-orange-500" /></td>
                          <td className="px-3 py-2.5"><ProbBar value={team.probWinner} color="bg-emerald-500" /></td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-gray-400 text-xs">
                            {team.avgGoalsFor.toFixed(2)}
                            <span className="text-gray-600"> / </span>
                            {team.avgGoalsAgainst.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Gruppenpositionen */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 1. Platz</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 2. Platz</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-600 inline-block" /> 3. Platz</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" /> 4. Platz (Ausscheiden)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedGroups.map(g => (
                  <GroupPositionCard key={g} group={g} teams={groupMap[g]} />
                ))}
              </div>
              <p className="text-xs text-gray-600 text-center">
                Sortiert nach Wahrscheinlichkeit für Gruppenplatz 1 · Basiert auf {simCount.toLocaleString('de-DE')} Simulationen
              </p>
            </div>
          )}

          {/* Tab: Torschützenkönig */}
          {activeTab === 'scorers' && (
            topScorers.length > 0
              ? <TopScorersSection scorers={topScorers} />
              : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Keine Spielerdaten verfügbar – Kader müssen in der Datenbank eingetragen sein.
                </div>
              )
          )}

          {/* Footer */}
          <p className="text-xs text-gray-600 text-center">
            Basiert auf {simCount.toLocaleString('de-DE')} Simulationen
            &nbsp;&middot;&nbsp;Modell: Dixon-Coles + ELO + Marktwert (alle Runden)
            &nbsp;&middot;&nbsp;KO-Runden: corePredictFull mit Poisson-Sampling
          </p>
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="text-center py-16 text-gray-600">
          <div className="text-5xl mb-4">🎲</div>
          <p className="text-lg font-medium text-gray-500">Noch keine Simulation gestartet</p>
          <p className="text-sm mt-1">Wähle die Anzahl Simulationen und klicke auf &quot;Simulation starten&quot;</p>
        </div>
      )}
    </div>
  )
}
