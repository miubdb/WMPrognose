'use client'

import { useState, useEffect } from 'react'
import type { EvaluationResult, EvalMode } from '@/lib/evaluateModel'

const PHASE_LABELS: Record<string, string> = {
  group: 'Gruppenphase', round16: 'Achtelfinale', quarter: 'Viertelfinale',
  semi: 'Halbfinale', third: 'Platz 3', final: 'Finale',
}
const PHASE_ORDER = ['group', 'round16', 'quarter', 'semi', 'third', 'final']

const MODE_LABELS: Record<EvalMode, string> = {
  eloOnly:        'ELO-only (sauber)',
  historicalFull: 'Historical Full (sauber)',
  currentLeakage: 'Current Data (Leakage)',
}
const MODE_DESCRIPTIONS: Record<EvalMode, string> = {
  eloOnly:        'Nur historisches ELO aus Match-Records. Kein Data Leakage. Untergrenze.',
  historicalFull: 'ELO + historische Marktwerter-Schätzungen. Keine aktuellen Kader. Sauber.',
  currentLeakage: 'Aktuelle WM2026-Daten für historische Matches. DATA LEAKAGE — nur als Vergleich!',
}

const TOURNAMENT_LABELS: Record<string, string> = {
  WM2022: 'WM 2022', WM2018: 'WM 2018', WM2014: 'WM 2014', EURO2024: 'EURO 2024', all: 'Alle',
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

function CalibrationCurve({ bins }: { bins: EvaluationResult['calibrationBins'] }) {
  if (bins.length === 0) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        Reliability Diagram
        <span className="text-xs text-gray-600 font-normal ml-2">nahe Diagonale = gut kalibriert</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-600 border-b border-gray-800">
            <th className="py-1 text-left">Bin</th>
            <th className="py-1 text-right">Ø Prognose</th>
            <th className="py-1 text-right">Tatsächlich</th>
            <th className="py-1 text-right">n</th>
            <th className="py-1 text-right">|Δ|</th>
            <th className="py-1 pl-4">Vis</th>
          </tr></thead>
          <tbody>
            {bins.map((b, i) => {
              const err = Math.abs(b.predicted - b.actual)
              const color = err > 0.10 ? 'text-red-400' : err > 0.05 ? 'text-yellow-400' : 'text-emerald-400'
              return (
                <tr key={i} className="border-b border-gray-800/40">
                  <td className="py-1.5 text-gray-500">{Math.round(b.center * 100)}%</td>
                  <td className="py-1.5 text-right font-mono text-blue-300">{(b.predicted * 100).toFixed(1)}%</td>
                  <td className="py-1.5 text-right font-mono text-emerald-300">{(b.actual * 100).toFixed(1)}%</td>
                  <td className="py-1.5 text-right text-gray-500">{b.count}</td>
                  <td className={`py-1.5 text-right font-mono ${color}`}>{(err * 100).toFixed(1)}%</td>
                  <td className="py-1.5 pl-4">
                    <div className="relative h-4 w-40 bg-gray-800 rounded overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-emerald-600/40" style={{ width: `${Math.round(b.actual * 100)}%` }} />
                      <div className={`absolute top-0 bottom-0 w-0.5 ${b.predicted > b.actual ? 'bg-red-400' : 'bg-blue-400'}`} style={{ left: `${Math.round(b.predicted * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BacktestPage() {
  const [data, setData] = useState<EvaluationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState('all')
  const [tournament, setTournament] = useState('WM2022')
  const [mode, setMode] = useState<EvalMode>('historicalFull')
  const [showEnsemble, setShowEnsemble] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('tournament', tournament)
    params.set('mode', mode)
    if (phase !== 'all') params.set('phase', phase)
    if (showEnsemble) params.set('ensemble', '1')
    fetch(`/api/backtest?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [phase, tournament, mode, showEnsemble])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Backtest — Modell v2.2.0</h1>
        <p className="text-gray-500 text-sm mt-1">Evaluation auf historischen Turnierdaten · {data?.matchCount ?? '…'} Spiele</p>
      </div>

      {/* Mode selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Evaluation-Modus</div>
        <div className="flex gap-2 flex-wrap">
          {(['eloOnly', 'historicalFull', 'currentLeakage'] as EvalMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                mode === m
                  ? m === 'currentLeakage'
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">{MODE_DESCRIPTIONS[mode]}</p>
      </div>

      {/* Leakage warning */}
      {mode === 'currentLeakage' && (
        <div className="bg-amber-950/30 border border-amber-700/60 rounded-xl px-4 py-3 text-sm text-amber-400 flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          <div>
            <strong>Data Leakage aktiv:</strong> Dieser Modus verwendet aktuelle WM2026-Teamdaten
            (Marktwerte 2025, Ratings 2025) für historische Matches. Die Metriken sind zu optimistisch.
            Vergleiche immer mit ELO-only oder Historical Full für ehrliche Einschätzung.
          </div>
        </div>
      )}

      {/* Tournament + Phase filters */}
      <div className="flex gap-1 flex-wrap">
        {(['WM2022', 'WM2018', 'WM2014', 'EURO2024', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTournament(t)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${tournament === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {TOURNAMENT_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {['all', 'group', 'round16', 'quarter', 'semi', 'third', 'final'].map(p => (
          <button key={p} onClick={() => setPhase(p)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${phase === p ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {p === 'all' ? 'Alle Phasen' : PHASE_LABELS[p] ?? p}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-500 text-sm py-12 text-center">Lade…</div>}
      {error && <div className="text-red-400 text-sm py-4 bg-red-900/20 border border-red-800 rounded-xl px-4">{error}</div>}

      {data && !loading && (
        <>
          {/* Core metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Ø RPS" value={data.avgRPS.toFixed(4)} sub={`Baseline: ${data.baselineRPS.toFixed(4)}`} />
            <StatCard label="Ø RPS (ELO-only)" value={data.eloOnlyRPS.toFixed(4)} sub="Nur ELO" color="text-gray-300" />
            <StatCard label="Skill Score" value={`+${(data.skillScore * 100).toFixed(1)}%`} sub="vs. Gleichverteilung" color="text-emerald-400" />
            <StatCard label="Richtige Tendenz" value={`${(data.correctTendency * 100).toFixed(1)}%`} sub="Bestes Outcome korrekt"
              color={data.correctTendency >= 0.5 ? 'text-emerald-400' : 'text-yellow-400'} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="ECE" value={(data.ece * 100).toFixed(1) + '%'} sub="Kalibrierungsfehler (↓ besser)"
              color={data.ece < 0.04 ? 'text-emerald-400' : data.ece < 0.08 ? 'text-yellow-400' : 'text-red-400'} />
            <StatCard label="MCE" value={(data.mce * 100).toFixed(1) + '%'} sub="Max Calib. Error"
              color={data.mce < 0.10 ? 'text-emerald-400' : data.mce < 0.20 ? 'text-yellow-400' : 'text-red-400'} />
            <StatCard label="Draw Rate"
              value={(data.drawRate * 100).toFixed(0) + '%'}
              sub={`Prognose Ø: ${(data.drawPredictionAvg * 100).toFixed(0)}%`}
              color={Math.abs(data.drawRate - data.drawPredictionAvg) < 0.03 ? 'text-emerald-400' : 'text-yellow-400'} />
            <StatCard label="LogLoss" value={data.avgLogLoss.toFixed(4)} sub={`Brier: ${data.avgBrier.toFixed(4)}`} color="text-gray-300" />
          </div>

          {/* ELO gain indicator */}
          {data.eloOnlyRPS > 0 && (
            <div className={`rounded-xl p-3 text-sm border ${data.avgRPS < data.eloOnlyRPS ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' : 'bg-yellow-950/20 border-yellow-800/40 text-yellow-400'}`}>
              {data.avgRPS < data.eloOnlyRPS
                ? `✓ Volles Modell (${data.avgRPS.toFixed(4)}) schlägt ELO-only (${data.eloOnlyRPS.toFixed(4)}) um ${((data.eloOnlyRPS - data.avgRPS) / data.eloOnlyRPS * 100).toFixed(1)}% — Zusatzfeatures bringen Mehrwert.`
                : `⚠ ELO-only (${data.eloOnlyRPS.toFixed(4)}) besser als Modell (${data.avgRPS.toFixed(4)}) — Zusatzfeatures verschlechtern in diesem Sample.`
              }
            </div>
          )}

          {/* Calibration curve */}
          <CalibrationCurve bins={data.calibrationBins} />

          {/* Ensemble comparison */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">Ensemble-Vergleich</h2>
              <button onClick={() => setShowEnsemble(v => !v)}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${showEnsemble ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {showEnsemble ? 'Ausblenden' : 'Berechnen'}
              </button>
            </div>
            {showEnsemble && data.ensembleComparison && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-600 border-b border-gray-800 text-left">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Ensemble</th>
                    <th className="px-4 py-2 text-right">RPS</th>
                    <th className="px-4 py-2 text-right">Skill</th>
                    <th className="px-4 py-2 text-right">LogLoss</th>
                    <th className="px-4 py-2 text-right">ECE</th>
                    <th className="px-4 py-2 text-right">Tendenz</th>
                  </tr></thead>
                  <tbody>
                    {data.ensembleComparison.map((e, i) => (
                      <tr key={i} className={`border-b border-gray-800/40 ${i === 0 ? 'bg-emerald-900/10' : ''}`}>
                        <td className="px-4 py-2 text-gray-500">{i === 0 ? '🥇' : i + 1}</td>
                        <td className="px-4 py-2 text-gray-200">{e.config.label}</td>
                        <td className={`px-4 py-2 text-right font-mono font-semibold ${i === 0 ? 'text-emerald-400' : 'text-gray-300'}`}>{e.rps.toFixed(4)}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-400">+{(e.skillScore * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-500">{e.logLoss.toFixed(4)}</td>
                        <td className={`px-4 py-2 text-right font-mono ${e.ece < 0.04 ? 'text-emerald-400' : e.ece < 0.08 ? 'text-yellow-400' : 'text-red-400'}`}>{(e.ece * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-400">{(e.correctTendency * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showEnsemble && !data.ensembleComparison && (
              <div className="px-4 py-6 text-center text-gray-600 text-sm">Kein Ensemble-Ergebnis verfügbar</div>
            )}
          </div>

          {/* Phase breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300">Auswertung nach Phase</h2>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-600 border-b border-gray-800">
                <th className="px-4 py-2">Phase</th>
                <th className="px-4 py-2 text-right">Spiele</th>
                <th className="px-4 py-2 text-right">Avg RPS</th>
                <th className="px-4 py-2 text-right">Tendenz</th>
              </tr></thead>
              <tbody>
                {PHASE_ORDER.filter(p => data.phaseBreakdown[p]).map(p => {
                  const pd = data.phaseBreakdown[p]
                  return (
                    <tr key={p} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-gray-300">{PHASE_LABELS[p] ?? p}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-400">{pd.matches}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-300">{pd.avgRPS.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        <span className={pd.correctTendency >= 0.6 ? 'text-emerald-400' : pd.correctTendency >= 0.4 ? 'text-yellow-400' : 'text-red-400'}>
                          {(pd.correctTendency * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Per-match table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300">Einzelspiele ({data.perMatch.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-gray-600 border-b border-gray-800">
                  <th className="px-3 py-2">Turnier</th>
                  <th className="px-3 py-2">Phase</th>
                  <th className="px-3 py-2">Heim</th>
                  <th className="px-3 py-2 text-center">Erg.</th>
                  <th className="px-3 py-2">Gast</th>
                  <th className="px-3 py-2 text-right">1</th>
                  <th className="px-3 py-2 text-right">X</th>
                  <th className="px-3 py-2 text-right">2</th>
                  <th className="px-3 py-2 text-center">OK?</th>
                  <th className="px-3 py-2 text-right">RPS</th>
                </tr></thead>
                <tbody>
                  {data.perMatch.map((m, i) => {
                    const rowBg = m.correct ? 'bg-emerald-900/10' : m.predicted === 'X' ? 'bg-yellow-900/10' : 'bg-red-900/10'
                    return (
                      <tr key={i} className={`border-b border-gray-800/40 hover:bg-gray-800/20 ${rowBg}`}>
                        <td className="px-3 py-1.5 text-gray-600 font-mono text-[10px]">{m.tournament}</td>
                        <td className="px-3 py-1.5 text-gray-500">{PHASE_LABELS[m.phase] ?? m.phase}</td>
                        <td className="px-3 py-1.5 text-gray-300">{m.homeTeam}</td>
                        <td className="px-3 py-1.5 text-center font-mono text-white font-bold">{m.homeGoals}:{m.awayGoals}</td>
                        <td className="px-3 py-1.5 text-gray-300">{m.awayTeam}</td>
                        <td className={`px-3 py-1.5 text-right font-mono ${m.outcome === 'W' ? 'text-white font-bold' : 'text-gray-500'}`}>{(m.predWin * 100).toFixed(0)}%</td>
                        <td className={`px-3 py-1.5 text-right font-mono ${m.outcome === 'D' ? 'text-white font-bold' : 'text-gray-500'}`}>{(m.predDraw * 100).toFixed(0)}%</td>
                        <td className={`px-3 py-1.5 text-right font-mono ${m.outcome === 'L' ? 'text-white font-bold' : 'text-gray-500'}`}>{(m.predLoss * 100).toFixed(0)}%</td>
                        <td className="px-3 py-1.5 text-center">
                          {m.correct ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-red-400 font-bold">✗</span>}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono ${m.rps <= 0.1 ? 'text-emerald-400' : m.rps <= 0.2 ? 'text-yellow-400' : 'text-red-400'}`}>
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
