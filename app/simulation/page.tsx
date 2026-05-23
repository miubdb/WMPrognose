'use client'

import { useState } from 'react'

interface TeamStageProb {
  teamId: string
  name: string
  flag: string
  group: string
  confederation: string
  probGroupAdvance: number
  probR32Win: number
  probR16Win: number
  probQFWin: number
  probSFWin: number
  probWinner: number
  avgGoalsFor: number
  avgGoalsAgainst: number
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

function pct(v: number): string {
  if (v >= 0.995) return '99%'
  if (v < 0.001) return '<0.1%'
  return (v * 100).toFixed(v >= 0.1 ? 1 : 1) + '%'
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

export default function SimulationPage() {
  const [n, setN] = useState<number>(10000)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TeamStageProb[] | null>(null)
  const [simCount, setSimCount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('Alle')

  const CONFEDERATIONS = ['Alle', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC']

  async function runSimulation() {
    setLoading(true)
    setError(null)
    setResults(null)

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

      const data = await res.json() as { ok: boolean; n: number; results: TeamStageProb[] }
      setResults(data.results)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">WM 2026 Monte-Carlo-Simulation</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Simuliert das gesamte Turnier X-mal und berechnet Wahrscheinlichkeiten für jede Runde.
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
          onClick={runSimulation}
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
          {/* Filter */}
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

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-3 py-3 text-left w-8">#</th>
                  <th className="px-3 py-3 text-left">Team</th>
                  <th className="px-3 py-3 text-center">Gr.</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Gruppe ✓</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">R32 ✓</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Viertelfinale</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Halbfinale</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Finale</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Sieger</th>
                  <th className="px-3 py-3 text-right">Tore &Oslash;</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((team, idx) => {
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
                      <td className="px-3 py-2.5">
                        <ProbBar value={team.probGroupAdvance} color="bg-gray-500" />
                      </td>
                      <td className="px-3 py-2.5">
                        <ProbBar value={team.probR32Win} color="bg-blue-500" />
                      </td>
                      <td className="px-3 py-2.5">
                        <ProbBar value={team.probR16Win} color="bg-cyan-500" />
                      </td>
                      <td className="px-3 py-2.5">
                        <ProbBar value={team.probQFWin} color="bg-yellow-500" />
                      </td>
                      <td className="px-3 py-2.5">
                        <ProbBar value={team.probSFWin} color="bg-orange-500" />
                      </td>
                      <td className="px-3 py-2.5">
                        <ProbBar value={team.probWinner} color="bg-emerald-500" />
                      </td>
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

          {/* Footer */}
          <p className="text-xs text-gray-600 text-center">
            Basiert auf {simCount.toLocaleString('de-DE')} Simulationen
            &nbsp;&middot;&nbsp;Modell: Dixon-Coles + ELO + Marktwert
            &nbsp;&middot;&nbsp;Kein Kader-/Form-Datensatz in KO-Runden-Simulation
          </p>
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="text-center py-16 text-gray-600">
          <div className="text-5xl mb-4">🎲</div>
          <p className="text-lg font-medium text-gray-500">Noch keine Simulation gestartet</p>
          <p className="text-sm mt-1">Wähle die Anzahl Simulationen und klicke auf "Simulation starten"</p>
        </div>
      )}
    </div>
  )
}
