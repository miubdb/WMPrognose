'use client'

import { useState } from 'react'
import type { CalibrationSummary, CalibrationResult, WalkForwardResult, WalkForwardFold } from '@/lib/calibration'

type Tab = 'grid' | 'walkforward'

interface GridApiResponse {
  ok: boolean
  summary?: CalibrationSummary
  error?: string
  meta?: { gridSize: number; matchesEvaluated: number; optimizationMetric: string; dataset: string }
}

interface WfApiResponse {
  ok: boolean
  result?: WalkForwardResult
  error?: string
}

function fmt(n: number, d = 4) { return n.toFixed(d) }
function fmtPct(n: number, d = 1) { return (n * 100).toFixed(d) + '%' }

function OvfitBadge({ overfit }: { overfit: number }) {
  const cls = overfit > 0.02 ? 'bg-red-900/40 text-red-400 border-red-800' :
    overfit > 0.005 ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800' :
    'bg-emerald-900/40 text-emerald-400 border-emerald-800'
  const label = overfit > 0.02 ? 'Overfit' : overfit > 0.005 ? 'Mild' : 'OK'
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${cls}`}>{label} +{fmt(overfit, 4)}</span>
}

function FoldCard({ fold, idx }: { fold: WalkForwardFold; idx: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Fold {idx + 1}</div>
          <div className="text-sm font-semibold text-white mt-0.5">
            Train: {fold.trainTournaments.join(' + ')} → Test: {fold.testTournament}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {fold.trainMatches} Train-Spiele · {fold.testMatches} Test-Spiele
          </div>
        </div>
        <OvfitBadge overfit={fold.overfit} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="bg-gray-800/40 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">In-Sample RPS</div>
          <div className="font-mono text-emerald-300 font-semibold">{fmt(fold.trainRPS)}</div>
          <div className="text-[10px] text-gray-600">Optimiert auf Train-Daten</div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Out-of-Sample RPS</div>
          <div className={`font-mono font-semibold ${fold.overfit > 0.02 ? 'text-red-400' : fold.overfit > 0.005 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {fmt(fold.testRPS)}
          </div>
          <div className="text-[10px] text-gray-600">Skill: +{fold.skillScore.toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
        <div>OOS LogLoss <span className="font-mono text-gray-300">{fmt(fold.testLogLoss)}</span></div>
        <div>OOS Brier <span className="font-mono text-gray-300">{fmt(fold.testBrier)}</span></div>
        <div>Baseline RPS <span className="font-mono text-gray-400">{fmt(fold.baselineRPS)}</span></div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
        Optimale Params (Train): baseGoalRate={fold.bestParams.baseGoalRate.toFixed(2)}, eloWeight={fold.bestParams.eloWeight.toFixed(4)}, rho={fold.bestParams.dixonColesRho.toFixed(2)}
      </div>
    </div>
  )
}

function ResultRow({ result, rank }: { result: CalibrationResult; rank?: number }) {
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors">
      {rank !== undefined && <td className="px-3 py-2 text-center text-gray-500 text-sm">{rank}</td>}
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
  const [tab, setTab] = useState<Tab>('grid')
  const [loading, setLoading] = useState(false)
  const [gridData, setGridData] = useState<GridApiResponse | null>(null)
  const [wfData, setWfData] = useState<WfApiResponse | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  async function run() {
    setLoading(true)
    setElapsed(null)
    const t0 = performance.now()
    try {
      if (tab === 'grid') {
        setGridData(null)
        const res = await fetch('/api/calibrate')
        setGridData(await res.json())
      } else {
        setWfData(null)
        const res = await fetch('/api/calibrate?mode=walkforward')
        setWfData(await res.json())
      }
      setElapsed(performance.now() - t0)
    } catch (err) {
      if (tab === 'grid') setGridData({ ok: false, error: String(err) })
      else setWfData({ ok: false, error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const summary = gridData?.summary
  const wfResult = wfData?.result

  function shouldUpdate() {
    if (!summary) return false
    const rpsDiffPct = summary.current.rps > 0 ? Math.abs(summary.current.rps - summary.best.rps) / summary.current.rps * 100 : 0
    return rpsDiffPct > 10
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Modell-Kalibrierung</h1>
        <p className="mt-1 text-gray-400 text-sm">
          Grid Search + Walk-Forward Validation · RPS-Optimierung
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['grid', 'walkforward'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {t === 'grid' ? 'Grid Search' : 'Walk-Forward'}
          </button>
        ))}
      </div>

      {/* Description */}
      {tab === 'grid' && (
        <p className="text-gray-500 text-xs">
          210 Kombinationen (baseGoalRate × eloWeight × rho) auf WM 2022 Gruppenphase.
          In-Sample — für OOS-Validierung Walk-Forward verwenden.
        </p>
      )}
      {tab === 'walkforward' && (
        <p className="text-gray-500 text-xs">
          Expanding-Window: Fold 1 = Train WM2014 → Test WM2018, Fold 2 = Train WM2014+2018 → Test WM2022.
          OOS RPS &gt; Train RPS = Overfitting-Signal. Basis-Datengüte: historische ELO aus Match-Records.
        </p>
      )}

      {/* Run button */}
      <div className="flex items-center gap-4">
        <button onClick={run} disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors">
          {loading ? (tab === 'walkforward' ? '~30s läuft...' : 'Läuft...') : (tab === 'grid' ? 'Grid Search starten' : 'Walk-Forward starten')}
        </button>
        {loading && tab === 'walkforward' && (
          <span className="text-gray-500 text-sm animate-pulse">2 Folds × 210 Param-Kombos...</span>
        )}
        {elapsed !== null && <span className="text-gray-500 text-sm">Fertig in {(elapsed / 1000).toFixed(2)}s</span>}
      </div>

      {/* Grid Search Results */}
      {tab === 'grid' && summary && gridData?.ok && (
        <>
          {gridData.meta && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-400 flex flex-wrap gap-6">
              <span>Grid: <strong className="text-white">{gridData.meta.gridSize}</strong></span>
              <span>Spiele: <strong className="text-white">{gridData.meta.matchesEvaluated}</strong></span>
              <span>Metrik: <strong className="text-amber-300">{gridData.meta.optimizationMetric}</strong></span>
              <span>Datensatz: <strong className="text-white">{gridData.meta.dataset}</strong></span>
            </div>
          )}

          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-5">
            <div className="text-sm text-gray-400 mb-1">Skill Score (Beste vs. Baseline)</div>
            <div className="text-3xl font-bold text-emerald-400">+{summary.skillScore.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">Baseline RPS = {fmt(summary.baseline.rps)}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Aktuelle Konfiguration</div>
              <dl className="space-y-2 text-sm">
                {(['baseGoalRate', 'eloWeight', 'dixonColesRho'] as const).map(k => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-mono text-gray-200">{k === 'eloWeight' ? summary.current[k].toFixed(4) : summary.current[k].toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                  <span className="text-gray-400">RPS</span>
                  <span className="font-mono text-amber-300 font-semibold">{fmt(summary.current.rps)}</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-400">LogLoss</span><span className="font-mono text-gray-400">{fmt(summary.current.logLoss)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Brier</span><span className="font-mono text-gray-400">{fmt(summary.current.brier)}</span></div>
              </dl>
            </div>

            <div className="bg-gray-900 border border-emerald-700/50 rounded-lg p-5">
              <div className="text-xs text-emerald-500 uppercase tracking-wider mb-3">Optimale Konfiguration</div>
              <dl className="space-y-2 text-sm">
                {(['baseGoalRate', 'eloWeight', 'dixonColesRho'] as const).map(k => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400">{k}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-200">{k === 'eloWeight' ? summary.best[k].toFixed(4) : summary.best[k].toFixed(2)}</span>
                      {summary.best[k] !== summary.current[k] && (
                        <span className="text-xs text-gray-500">{summary.best[k] > summary.current[k] ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                  <span className="text-gray-400">RPS</span>
                  <span className="font-mono text-amber-300 font-semibold">{fmt(summary.best.rps)}</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-400">LogLoss</span><span className="font-mono text-gray-400">{fmt(summary.best.logLoss)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Brier</span><span className="font-mono text-gray-400">{fmt(summary.best.brier)}</span></div>
              </dl>
            </div>
          </div>

          {shouldUpdate() ? (
            <div className="bg-amber-950/40 border border-amber-700/60 rounded-lg p-5">
              <div className="font-semibold text-amber-300 mb-2">Empfehlung: config.ts anpassen</div>
              <pre className="mt-2 bg-gray-950 rounded p-3 text-xs text-gray-300 overflow-x-auto">
{`baseGoalRate: ${summary.best.baseGoalRate.toFixed(2)},  // war: ${summary.current.baseGoalRate.toFixed(2)}
dixonColesRho: ${summary.best.dixonColesRho.toFixed(2)},  // war: ${summary.current.dixonColesRho.toFixed(2)}
elo: ${summary.best.eloWeight.toFixed(4)},  // war: ${summary.current.eloWeight.toFixed(4)}`}
              </pre>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-4 text-sm text-emerald-400">
              Aktuelle Konfiguration gut kalibriert (&lt;10% RPS-Abweichung vom Optimum)
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Top-10 Parameterkombinationen</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-left">
                <thead className="bg-gray-900/80 text-xs text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3">baseGoalRate</th>
                    <th className="px-3 py-3">eloWeight</th>
                    <th className="px-3 py-3">rho</th>
                    <th className="px-3 py-3">RPS <span className="text-gray-600">(↓ besser)</span></th>
                    <th className="px-3 py-3">LogLoss</th>
                    <th className="px-3 py-3">Brier</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.top10.map((r, i) => <ResultRow key={i} result={r} rank={i + 1} />)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Walk-Forward Results */}
      {tab === 'walkforward' && wfResult && wfData?.ok && (
        <>
          {/* Summary */}
          <div className={`border rounded-lg p-5 ${
            wfResult.conclusion === 'overfit' ? 'bg-red-950/30 border-red-800/60' :
            wfResult.conclusion === 'mild_overfit' ? 'bg-yellow-950/30 border-yellow-800/60' :
            'bg-emerald-950/30 border-emerald-800/60'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">
                {wfResult.conclusion === 'overfit' ? '⚠' : wfResult.conclusion === 'mild_overfit' ? '~' : '✓'}
              </span>
              <div>
                <div className={`font-semibold ${wfResult.conclusion === 'overfit' ? 'text-red-400' : wfResult.conclusion === 'mild_overfit' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {wfResult.conclusion === 'overfit' ? 'Overfitting erkannt' : wfResult.conclusion === 'mild_overfit' ? 'Leichtes Overfitting' : 'Kalibrierung generalisiert gut'}
                </div>
                <div className="text-sm text-gray-400">
                  Ø OOS RPS: <span className="font-mono text-white">{fmt(wfResult.avgOosRPS)}</span>
                  {' '}· Ø Train RPS: <span className="font-mono text-white">{fmt(wfResult.avgTrainRPS)}</span>
                  {' '}· Ø OOS Skill: <span className="font-mono text-white">+{wfResult.avgOosSkillScore.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {wfResult.conclusion === 'ok'
                ? 'Die Grid-Search-Parameter übertragen sich gut auf ungesehene Turniere. Das Modell ist nicht auf WM 2022 overfittet.'
                : wfResult.conclusion === 'mild_overfit'
                ? 'Leichter OOS-Performanceabfall. Die kalibrierten Parameter funktionieren, aber mit Einschränkungen. Mehr Trainingsdaten (EM, Copa) würden helfen.'
                : 'Deutlicher Overfitting-Hinweis: die auf WM 2022 kalibrierten Parameter verallgemeinern schlecht. Erwäge mehr Trainingsdaten oder Regularisierung.'}
            </p>
          </div>

          {/* Per-Fold Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Fold-Details</h2>
            {wfResult.folds.map((fold, i) => <FoldCard key={i} fold={fold} idx={i} />)}
          </div>

          {/* Interpretation */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm space-y-3">
            <h3 className="font-semibold text-white">Interpretation</h3>
            <div className="space-y-2 text-gray-400 text-xs">
              <p><span className="text-white font-medium">Train RPS</span> — RPS der besten Parameter auf den Trainingsdaten (in-sample, immer niedriger)</p>
              <p><span className="text-white font-medium">OOS RPS</span> — RPS auf dem gehaltenen Test-Turnier (out-of-sample, der ehrliche Wert)</p>
              <p><span className="text-white font-medium">Overfit-Delta</span> — OOS − Train. &lt;0.005 = OK, 0.005–0.02 = mild, &gt;0.02 = Problem</p>
              <p><span className="text-white font-medium">Caveat</span> — Teams an WM 2026 verwenden aktuelle Squad-Daten (Marktwerte 2025) auch für historische Matches. Nur ELO-Signal ist wirklich historisch valide.</p>
            </div>
          </div>
        </>
      )}

      {/* Errors */}
      {tab === 'grid' && gridData && !gridData.ok && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          <strong>Fehler:</strong> {gridData.error}
        </div>
      )}
      {tab === 'walkforward' && wfData && !wfData.ok && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          <strong>Fehler:</strong> {wfData.error}
        </div>
      )}
    </div>
  )
}
