'use client'

import { useState } from 'react'
import { simulateTournament, TeamTournamentStats } from '@/lib/modelAdapter'

const ROUND_LABELS = [
  { key: 'pGroupStage', label: 'Gruppenphase' },
  { key: 'pRound32', label: 'Achtelfinale' },
  { key: 'pRound16', label: 'Runde d. 16' },
  { key: 'pQuarterfinal', label: 'Viertelfinale' },
  { key: 'pSemifinal', label: 'Halbfinale' },
  { key: 'pFinal', label: 'Finale' },
  { key: 'pChampion', label: 'Weltmeister' },
] as const

export default function TournamentPage() {
  const [results, setResults] = useState<TeamTournamentStats[] | null>(null)
  const [simCount, setSimCount] = useState(1000)
  const [isSimulating, setIsSimulating] = useState(false)
  const [view, setView] = useState<'champion' | 'table'>('champion')

  const runSimulation = () => {
    setIsSimulating(true)
    // Simuliere in einem setTimeout um UI zu refreshen
    setTimeout(() => {
      const r = simulateTournament(simCount)
      setResults(r)
      setIsSimulating(false)
    }, 50)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🎰</span> Monte Carlo Simulator
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Simuliert das WM-Turnier tausende Male und berechnet Wahrscheinlichkeiten für alle Phasen
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Anzahl Simulationen</label>
            <select
              value={simCount}
              onChange={e => setSimCount(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              disabled={isSimulating}
            >
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1.000</option>
              <option value={5000}>5.000</option>
              <option value={10000}>10.000</option>
            </select>
          </div>
          <div className="flex-1 sm:flex-none">
            <label className="text-xs text-gray-500 block mb-1 opacity-0">btn</label>
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="w-full sm:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSimulating ? '⟳ Simuliere...' : `${simCount.toLocaleString()} Turniere simulieren`}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isSimulating && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-spin">⚽</div>
          <p className="text-gray-400">Simuliere {simCount.toLocaleString()} Turniere...</p>
          <p className="text-gray-600 text-xs mt-2">Das kann je nach Anzahl einige Sekunden dauern</p>
        </div>
      )}

      {/* Results */}
      {results && !isSimulating && (
        <>
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('champion')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'champion' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Titelchancen
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'table' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Vollständige Tabelle
            </button>
          </div>

          {view === 'champion' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="font-semibold mb-4">
                Titelchancen
                <span className="text-gray-500 text-sm font-normal ml-2">(Top 20)</span>
              </h2>
              <div className="space-y-2">
                {results.slice(0, 20).map((team, i) => (
                  <div key={team.teamId} className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs w-5 text-right">{i + 1}.</span>
                    <span className="text-lg">{team.flag}</span>
                    <span className="text-sm flex-1">{team.name}</span>
                    <span className="text-xs text-gray-500 w-8">Gr.{team.group}</span>
                    <div className="flex items-center gap-2 w-48">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            i === 0 ? 'bg-yellow-500' :
                            i === 1 ? 'bg-gray-400' :
                            i === 2 ? 'bg-amber-700' :
                            'bg-emerald-600'
                          }`}
                          style={{ width: `${team.pChampion * 100 / (results[0]?.pChampion ?? 1) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-emerald-400 w-12 text-right">
                        {(team.pChampion * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'table' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium sticky left-0 bg-gray-900">Team</th>
                      {ROUND_LABELS.map(r => (
                        <th key={r.key} className="text-center px-2 py-2 text-gray-500 font-medium whitespace-nowrap">
                          {r.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((team, i) => (
                      <tr key={team.teamId} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${i < 3 ? 'bg-emerald-950/10' : ''}`}>
                        <td className="px-3 py-2 sticky left-0 bg-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span>{team.flag}</span>
                            <span className="font-medium">{team.name}</span>
                          </div>
                        </td>
                        {ROUND_LABELS.map(r => {
                          const val = team[r.key]
                          return (
                            <td key={r.key} className="text-center px-2 py-2">
                              <span className={`font-mono ${
                                val > 0.7 ? 'text-emerald-400' :
                                val > 0.3 ? 'text-blue-400' :
                                val > 0.1 ? 'text-gray-300' :
                                'text-gray-600'
                              }`}>
                                {(val * 100).toFixed(0)}%
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info */}
          <p className="text-xs text-gray-600 text-center">
            Ergebnisse basieren auf {simCount.toLocaleString()} Monte-Carlo-Simulationen mit ELO-basiertem Poisson-Modell.
            Jede Simulation gibt leicht andere Werte. Klicke erneut für neue Simulation.
          </p>
        </>
      )}

      {/* Initial state */}
      {!results && !isSimulating && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-gray-400 mb-2">Noch keine Simulation durchgeführt</p>
          <p className="text-gray-600 text-sm">Wähle eine Anzahl und starte die Simulation</p>
        </div>
      )}
    </div>
  )
}
