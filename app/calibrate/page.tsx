'use client'

import { useState } from 'react'
import type { CalibrationSummary, CalibrationResult } from '@/lib/calibration'

interface ApiResponse {
  ok: boolean
  summary?: CalibrationSummary
  error?: string
  meta?: {
    gridSize: number
    matchesEvaluated: number
    optimizationMetric: string
    dataset: string
  }
}

function fmt(n: number, decimals = 4): string {
  return n.toFixed(decimals)
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

function diffBadge(current: number, optimal: number, lowerIsBetter = true): JSX.Element {
  const diff = lowerIsBetter ? current - optimal : optimal - current
  const diffPct = optimal !== 0 ? (diff / Math.abs(optimal)) * 100 : 0
  const isSignificant = Math.abs(diffPct) > 10
  const color = isSignificant ? 'text-red-400' : 'text-gray-400'
  const sign = diff >= 0 ? '+' : ''
  return (
    <span className={color}>
      {sign}{diffPct.toFixed(1)}%
    </span>
  )
}

function ResultRow({ result, rank }: { result: CalibrationResult; rank?: number }) {
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors">
      {rank !== undefined && (
        <td className="px-3 py-2 text-center text-gray-500 text-sm">{rank}</td>
      )}
      <td className="px-3 py-2 font-mono text-emerald-300 text-sm">{result.baseGoalRate.toFixed(2)}</td>
      <td className="px-3 py-2 font-mono text-blue-300 text-sm">{result.eloWeight.toFixed(4)}</td>
      <td className="px-3 py-2 font-mono text-violet-300 text-sm">{result.dixonColesRho.toFixed(2)}</td>
      <td className="px-3 py-2 font-mono text-amber-300 text-sm font-semibold">{fmt(result.rps)}</td>
      <td className="px-3 py-2 font-mono text-gray-400 text-sm">{fmt(result.logLoss)}</td>
      <td className="px-3 py-2 font-mono text-gray-400 text-sm">{fmt(result.brier)}</td>
    </tr>
  )
}

export default function CalibratePage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  async function runCalibration() {
    setLoading(true)
    setData(null)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const res = await fetch('/api/calibrate')
      const json: ApiResponse = await res.json()
      setData(json)
      setElapsed(performance.now() - t0)
    } catch (err) {
      setData({ ok: false, error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const summary = data?.summary

  // Empfehlung: sollte config.ts angepasst werden?
  function shouldUpdate(): boolean {
    if (!summary) return false
    const b = summary.best
    const c = summary.current
    const rpsDiffPct = c.rps > 0 ? Math.abs(c.rps - b.rps) / c.rps * 100 : 0
    return rpsDiffPct > 10
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Modell-Kalibrierung{' '}
          <span className="text-emerald-400">Grid Search</span>
        </h1>
        <p className="mt-2 text-gray-400 text-sm">
          Optimiert <code className="text-emerald-300">baseGoalRate</code>,{' '}
          <code className="text-blue-300">eloWeight</code> und{' '}
          <code className="text-violet-300">dixonColesRho</code> gegen WM 2022 Gruppenspieldaten.
          Optimierungsmetrik: <span className="text-amber-300 font-semibold">RPS minimieren</span>.
        </p>
      </div>

      {/* Start Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={runCalibration}
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Kalibrierung läuft...' : 'Kalibrierung starten'}
        </button>
        {loading && (
          <span className="text-gray-400 text-sm animate-pulse">
            210 Kombinationen × historische Matches...
          </span>
        )}
        {elapsed !== null && (
          <span className="text-gray-500 text-sm">
            Fertig in {(elapsed / 1000).toFixed(2)}s
          </span>
        )}
      </div>

      {/* Fehler */}
      {data && !data.ok && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          <strong>Fehler:</strong> {data.error}
        </div>
      )}

      {/* Ergebnisse */}
      {summary && data?.ok && (
        <>
          {/* Meta-Info */}
          {data.meta && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-400 flex flex-wrap gap-6">
              <span>Grid: <strong className="text-white">{data.meta.gridSize}</strong> Kombinationen</span>
              <span>Spiele: <strong className="text-white">{data.meta.matchesEvaluated}</strong></span>
              <span>Metrik: <strong className="text-amber-300">{data.meta.optimizationMetric}</strong></span>
              <span>Datensatz: <strong className="text-white">{data.meta.dataset}</strong></span>
            </div>
          )}

          {/* Skill Score */}
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-5">
            <div className="text-sm text-gray-400 mb-1">Skill Score (Beste vs. Baseline)</div>
            <div className="text-3xl font-bold text-emerald-400">
              +{summary.skillScore.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Verbesserung gegenüber Random-Prognose (RPS = {fmt(summary.baseline.rps)})
            </div>
          </div>

          {/* Aktuell vs. Optimal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aktuelle Konfiguration */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Aktuelle Konfiguration (config.ts)
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">baseGoalRate</span>
                  <span className="font-mono text-emerald-300">{summary.current.baseGoalRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">eloWeight</span>
                  <span className="font-mono text-blue-300">{summary.current.eloWeight.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">dixonColesRho</span>
                  <span className="font-mono text-violet-300">{summary.current.dixonColesRho.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                  <span className="text-gray-400">RPS</span>
                  <span className="font-mono text-amber-300 font-semibold">{fmt(summary.current.rps)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">LogLoss</span>
                  <span className="font-mono text-gray-400">{fmt(summary.current.logLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Brier</span>
                  <span className="font-mono text-gray-400">{fmt(summary.current.brier)}</span>
                </div>
              </dl>
            </div>

            {/* Optimale Konfiguration */}
            <div className="bg-gray-900 border border-emerald-700/50 rounded-lg p-5">
              <div className="text-xs text-emerald-500 uppercase tracking-wider mb-3">
                Optimale Konfiguration (Grid Search)
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">baseGoalRate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-300">{summary.best.baseGoalRate.toFixed(2)}</span>
                    {summary.best.baseGoalRate !== summary.current.baseGoalRate && (
                      <span className="text-xs text-gray-500">
                        ({summary.best.baseGoalRate > summary.current.baseGoalRate ? '↑' : '↓'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">eloWeight</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-300">{summary.best.eloWeight.toFixed(4)}</span>
                    {summary.best.eloWeight !== summary.current.eloWeight && (
                      <span className="text-xs text-gray-500">
                        ({summary.best.eloWeight > summary.current.eloWeight ? '↑' : '↓'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">dixonColesRho</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-violet-300">{summary.best.dixonColesRho.toFixed(2)}</span>
                    {summary.best.dixonColesRho !== summary.current.dixonColesRho && (
                      <span className="text-xs text-gray-500">
                        ({summary.best.dixonColesRho > summary.current.dixonColesRho ? '↑' : '↓'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                  <span className="text-gray-400">RPS</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-300 font-semibold">{fmt(summary.best.rps)}</span>
                    <span className="text-xs">{diffBadge(summary.current.rps, summary.best.rps, true)}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">LogLoss</span>
                  <span className="font-mono text-gray-400">{fmt(summary.best.logLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Brier</span>
                  <span className="font-mono text-gray-400">{fmt(summary.best.brier)}</span>
                </div>
              </dl>
            </div>
          </div>

          {/* Empfehlung */}
          {shouldUpdate() ? (
            <div className="bg-amber-950/40 border border-amber-700/60 rounded-lg p-5">
              <div className="font-semibold text-amber-300 mb-2">
                Empfehlung: config.ts anpassen
              </div>
              <p className="text-sm text-gray-300">
                Die optimalen Parameter weichen mehr als 10% vom aktuellen RPS ab.
                Erwäge folgende Änderungen in <code className="text-emerald-300">lib/model/config.ts</code>:
              </p>
              <pre className="mt-3 bg-gray-950 rounded p-3 text-xs text-gray-300 overflow-x-auto">
{`// MODEL_META
baseGoalRate: ${summary.best.baseGoalRate.toFixed(2)},    // war: ${summary.current.baseGoalRate.toFixed(2)}
dixonColesRho: ${summary.best.dixonColesRho.toFixed(2)},  // war: ${summary.current.dixonColesRho.toFixed(2)}

// MODEL_WEIGHTS
elo: ${summary.best.eloWeight.toFixed(4)},  // war: ${summary.current.eloWeight.toFixed(4)}`}
              </pre>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-5">
              <div className="font-semibold text-emerald-400 mb-1">
                Aktuelle Konfiguration ist gut kalibriert
              </div>
              <p className="text-sm text-gray-400">
                Der RPS-Unterschied zwischen aktueller und optimaler Konfiguration
                liegt unter 10%. Eine Anpassung von <code className="text-emerald-300">config.ts</code> ist
                optional.
              </p>
            </div>
          )}

          {/* Top-10 Tabelle */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">
              Top-10 Parameterkombinationen
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-left">
                <thead className="bg-gray-900/80 text-xs text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3">baseGoalRate</th>
                    <th className="px-3 py-3">eloWeight</th>
                    <th className="px-3 py-3">rho</th>
                    <th className="px-3 py-3">
                      RPS <span className="text-gray-600">(↓ besser)</span>
                    </th>
                    <th className="px-3 py-3">LogLoss</th>
                    <th className="px-3 py-3">Brier</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.top10.map((r, i) => (
                    <ResultRow key={i} result={r} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Baseline-Vergleich */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Baseline-Referenz</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Baseline RPS</div>
                <div className="font-mono text-gray-300">{fmt(summary.baseline.rps)}</div>
                <div className="text-xs text-gray-600">Gleichverteilung [1/3, 1/3, 1/3]</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Baseline LogLoss</div>
                <div className="font-mono text-gray-300">{fmt(summary.baseline.logLoss)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Baseline Brier</div>
                <div className="font-mono text-gray-300">{fmt(summary.baseline.brier)}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
