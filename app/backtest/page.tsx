'use client'

import { useState, useEffect } from 'react'
import type { EvaluationResult } from '@/lib/evaluateModel'

const PHASE_LABELS: Record<string, string> = {
  group: 'Gruppenphase',
  round16: 'Achtelfinale',
  quarter: 'Viertelfinale',
  semi: 'Halbfinale',
  third: 'Platz 3',
  final: 'Finale',
}

const PHASE_ORDER = ['group', 'round16', 'quarter', 'semi', 'third', 'final']

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

export default function BacktestPage() {
  const [data, setData] = useState<EvaluationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState('all')
  const [tournament] = useState('WM2022')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('tournament', tournament)
    if (phase !== 'all') params.set('phase', phase)
    fetch(`/api/backtest?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [phase, tournament])

  const skillScorePct = data ? (data.skillScore * 100).toFixed(1) : '—'
  const correctTendencyPct = data ? (data.correctTendency * 100).toFixed(1) : '—'
  const avgRPS = data ? data.avgRPS.toFixed(4) : '—'
  const eloOnlyRPS = data ? data.eloOnlyRPS.toFixed(4) : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WM 2022 Backtest — Modell v2.1.0</h1>
        <p className="text-gray-500 text-sm mt-1">
          Evaluation auf historischen WM-2022-Daten · {data?.matchCount ?? '…'} Spiele ausgewertet
        </p>
      </div>

      {/* Phase filter */}
      <div className="flex gap-1 flex-wrap">
        {['all', 'group', 'round16', 'quarter', 'semi', 'third', 'final'].map(p => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              phase === p
                ? 'bg-emerald-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {p === 'all' ? 'Alle Phasen' : PHASE_LABELS[p] ?? p}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-gray-500 text-sm py-12 text-center">Lade Backtest-Daten…</div>
      )}
      {error && (
        <div className="text-red-400 text-sm py-4 bg-red-900/20 border border-red-800 rounded-xl px-4">{error}</div>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Unser RPS"
              value={avgRPS}
              sub={`Baseline: ${data.baselineRPS.toFixed(4)}`}
            />
            <StatCard
              label="ELO-only RPS"
              value={eloOnlyRPS}
              sub="Nur ELO, ohne MV/Ratings"
            />
            <StatCard
              label="Skill Score"
              value={`${skillScorePct}%`}
              sub="vs. Gleichverteilung"
            />
            <StatCard
              label="Richtige Tendenz"
              value={`${correctTendencyPct}%`}
              sub="Bestes Outcome korrekt"
            />
          </div>

          {/* Phase breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300">Auswertung nach Phase</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-600 border-b border-gray-800">
                    <th className="px-4 py-2 font-medium">Phase</th>
                    <th className="px-4 py-2 font-medium text-right">Spiele</th>
                    <th className="px-4 py-2 font-medium text-right">Avg RPS</th>
                    <th className="px-4 py-2 font-medium text-right">Richtige Tendenz</th>
                  </tr>
                </thead>
                <tbody>
                  {PHASE_ORDER
                    .filter(p => data.phaseBreakdown[p])
                    .map(p => {
                      const pd = data.phaseBreakdown[p]
                      return (
                        <tr key={p} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-4 py-2 text-gray-300">{PHASE_LABELS[p] ?? p}</td>
                          <td className="px-4 py-2 text-right font-mono text-gray-400">{pd.matches}</td>
                          <td className="px-4 py-2 text-right font-mono text-gray-300">{pd.avgRPS.toFixed(4)}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={
                              pd.correctTendency >= 0.6
                                ? 'text-emerald-400'
                                : pd.correctTendency >= 0.4
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }>
                              {(pd.correctTendency * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-match table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300">
                Einzelspiele ({data.perMatch.length})
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="text-emerald-500">Grün</span> = korrekte Tendenz ·{' '}
                <span className="text-red-400">Rot</span> = falsche Tendenz ·{' '}
                <span className="text-yellow-400">Gelb</span> = Unentschieden-Tipp
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-gray-800">
                    <th className="px-3 py-2 font-medium">Phase</th>
                    <th className="px-3 py-2 font-medium">Gr.</th>
                    <th className="px-3 py-2 font-medium">Heim</th>
                    <th className="px-3 py-2 font-medium text-center">Erg.</th>
                    <th className="px-3 py-2 font-medium">Gast</th>
                    <th className="px-3 py-2 font-medium text-right">1</th>
                    <th className="px-3 py-2 font-medium text-right">X</th>
                    <th className="px-3 py-2 font-medium text-right">2</th>
                    <th className="px-3 py-2 font-medium text-center">Tipp</th>
                    <th className="px-3 py-2 font-medium text-center">OK?</th>
                    <th className="px-3 py-2 font-medium text-right">RPS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perMatch.map((m, i) => {
                    const rowBg = m.correct
                      ? 'bg-emerald-900/10 hover:bg-emerald-900/20'
                      : m.predicted === 'X'
                      ? 'bg-yellow-900/10 hover:bg-yellow-900/20'
                      : 'bg-red-900/10 hover:bg-red-900/20'
                    return (
                      <tr key={i} className={`border-b border-gray-800/40 ${rowBg}`}>
                        <td className="px-3 py-1.5 text-gray-500">{PHASE_LABELS[m.phase] ?? m.phase}</td>
                        <td className="px-3 py-1.5 text-emerald-600 font-mono">{m.group ?? '—'}</td>
                        <td className="px-3 py-1.5 text-gray-300">{m.homeTeam}</td>
                        <td className="px-3 py-1.5 text-center font-mono text-white font-bold">
                          {m.homeGoals}:{m.awayGoals}
                        </td>
                        <td className="px-3 py-1.5 text-gray-300">{m.awayTeam}</td>
                        <td className={`px-3 py-1.5 text-right font-mono ${m.outcome === 'W' ? 'text-white font-bold' : 'text-gray-500'}`}>
                          {(m.predWin * 100).toFixed(0)}%
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono ${m.outcome === 'D' ? 'text-white font-bold' : 'text-gray-500'}`}>
                          {(m.predDraw * 100).toFixed(0)}%
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono ${m.outcome === 'L' ? 'text-white font-bold' : 'text-gray-500'}`}>
                          {(m.predLoss * 100).toFixed(0)}%
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`font-bold px-1 py-0.5 rounded text-[11px] ${
                            m.predicted === '1' ? 'bg-emerald-900/40 text-emerald-400'
                            : m.predicted === '2' ? 'bg-blue-900/40 text-blue-400'
                            : 'bg-gray-700 text-gray-300'
                          }`}>
                            {m.predicted}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {m.correct
                            ? <span className="text-emerald-400 font-bold">✓</span>
                            : <span className="text-red-400 font-bold">✗</span>
                          }
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono ${
                          m.rps <= 0.1 ? 'text-emerald-400' : m.rps <= 0.2 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {m.rps.toFixed(4)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
