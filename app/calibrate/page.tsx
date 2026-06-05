'use client'

import { useState } from 'react'
import type { CalibrationSummary, CalibrationResult, WalkForwardResult, WalkForwardFold } from '@/lib/calibration'
import type { ParamEvalResult, WalkForwardParamResult, CalibratedConfig } from '@/lib/calibrateParams'

type Tab = 'grid' | 'walkforward' | 'parametersuche'
type SweepMode = 'sweep-mv' | 'sweep-heritage' | 'sweep-rho' | 'grid' | 'recommend'

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

// ─── Parametersuche interfaces ────────────────────────────────────────────────

interface SweepApiResponse {
  ok: boolean
  error?: string
  mode?: string
  matchCount?: number
  grid?: ParamEvalResult[]
  best?: ParamEvalResult
  baseline?: ParamEvalResult
}

interface GridApiResponse2 {
  ok: boolean
  error?: string
  mode?: string
  matchCount?: number
  gridSize?: number
  topByRPS?: Array<ParamEvalResult & { deltaRps: number; deltaEce: number }>
  topByECE?: Array<ParamEvalResult & { deltaRps: number; deltaEce: number }>
  current?: ParamEvalResult
  walkForward?: WalkForwardParamResult[]
}

interface RecommendApiResponse {
  ok: boolean
  error?: string
  recommendation?: CalibratedConfig
  current?: ParamEvalResult
  top5Bootstrap?: Array<{ marketValueWeight: number; heritageScale: number; rho: number; rps: number; bootstrap: { delta: number; ci95: [number,number]; pBetter: number; reliable: boolean } }>
  configSnippet?: string
}

function fmt4(n: number) { return n.toFixed(4) }
function fmtSign(n: number, d = 4) { return (n >= 0 ? '+' : '') + n.toFixed(d) }
function deltaColor(d: number) { return d < -0.0001 ? 'text-emerald-400' : d > 0.0001 ? 'text-red-400' : 'text-gray-400' }

function ParamRow({ r, rank, highlightBest }: {
  r: ParamEvalResult & { deltaRps?: number }
  rank?: number
  highlightBest?: boolean
}) {
  return (
    <tr className={`border-t border-gray-800 hover:bg-gray-800/30 transition-colors ${highlightBest ? 'bg-emerald-950/20' : ''}`}>
      {rank !== undefined && <td className="px-2 py-2 text-center text-gray-500 text-xs">{rank}</td>}
      <td className="px-2 py-2 font-mono text-violet-300 text-xs">{r.marketValueWeight.toFixed(2)}</td>
      <td className="px-2 py-2 font-mono text-blue-300 text-xs">{r.heritageScale.toFixed(2)}</td>
      <td className="px-2 py-2 font-mono text-cyan-300 text-xs">{r.rho.toFixed(2)}</td>
      <td className="px-2 py-2 font-mono text-amber-300 text-xs font-semibold">{fmt4(r.rps)}</td>
      {r.deltaRps !== undefined && (
        <td className={`px-2 py-2 font-mono text-xs ${deltaColor(r.deltaRps)}`}>{fmtSign(r.deltaRps)}</td>
      )}
      <td className="px-2 py-2 font-mono text-gray-400 text-xs">{fmt4(r.ece)}</td>
      <td className="px-2 py-2 font-mono text-gray-400 text-xs">{(r.skillScore * 100).toFixed(2)}%</td>
    </tr>
  )
}

function WalkForwardCard({ wf, idx }: { wf: WalkForwardParamResult; idx: number }) {
  const c = wf.conclusion === 'overfit' ? 'text-red-400 border-red-800 bg-red-950/20'
    : wf.conclusion === 'mild_overfit' ? 'text-yellow-400 border-yellow-800 bg-yellow-950/20'
    : 'text-emerald-400 border-emerald-800 bg-emerald-950/20'
  return (
    <div className={`border rounded-lg p-4 text-xs ${c}`}>
      <div className="flex justify-between mb-2">
        <span className="font-semibold">Config #{idx + 1}: mv={wf.marketValueWeight.toFixed(2)} h={wf.heritageScale.toFixed(2)} ρ={wf.rho.toFixed(2)}</span>
        <span>{wf.conclusion === 'overfit' ? 'OVERFIT' : wf.conclusion === 'mild_overfit' ? 'Mild Overfit' : 'OK'}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-gray-400">
        {wf.folds.map((f, fi) => (
          <div key={fi} className="bg-gray-900/50 rounded p-2">
            <div className="text-gray-500 mb-1">Fold {fi + 1}: {f.testTournament}</div>
            <div>Train <span className="font-mono text-gray-300">{fmt4(f.trainRPS)}</span></div>
            <div>Test <span className={`font-mono ${f.overfit > 0.01 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt4(f.testRPS)}</span></div>
            <div>Δ <span className="font-mono">{fmtSign(f.overfit)}</span></div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-gray-400">
        Ø OOS RPS: <span className="font-mono text-white">{fmt4(wf.avgTestRPS)}</span>
        {' '}· Ø Overfit: <span className="font-mono">{fmtSign(wf.avgOverfit)}</span>
      </div>
    </div>
  )
}

function ParametersucheTab() {
  const [sweepMode, setSweepMode] = useState<SweepMode>('sweep-mv')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [sweepData, setSweepData] = useState<SweepApiResponse | null>(null)
  const [gridData2, setGridData2] = useState<GridApiResponse2 | null>(null)
  const [recommendData, setRecommendData] = useState<RecommendApiResponse | null>(null)

  async function runSweep() {
    setLoading(true)
    setElapsed(null)
    setSweepData(null)
    setGridData2(null)
    setRecommendData(null)
    const t0 = performance.now()
    try {
      const res = await fetch(`/api/calibrate-params?mode=${sweepMode}`)
      const data = await res.json()
      if (sweepMode === 'grid') setGridData2(data)
      else if (sweepMode === 'recommend') setRecommendData(data)
      else setSweepData(data)
      setElapsed(performance.now() - t0)
    } catch (err) {
      setSweepData({ ok: false, error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const sweepLabels: Record<SweepMode, string> = {
    'sweep-mv':      'Sweep MV-Gewicht',
    'sweep-heritage':'Sweep Heritage-Scale',
    'sweep-rho':     'Sweep ρ (Dixon-Coles)',
    'grid':          'Kombiniertes Grid',
    'recommend':     'Empfehlung + Bootstrap',
  }
  const sweepDescs: Record<SweepMode, string> = {
    'sweep-mv':      'marketValueWeight [0.00..0.10] — Heritage=0, ρ=aktuell. Ca. 2s.',
    'sweep-heritage':'heritageScale [0.0..1.0] — MV=aktuell, ρ=aktuell. Ca. 1s.',
    'sweep-rho':     'rho [0.00..0.10] — MV=aktuell, Heritage=0. Ca. 2s.',
    'grid':          '450 Kombinationen (MV×Heritage×ρ) + Walk-Forward Top-5. Ca. 15–30s.',
    'recommend':     'Grid → Walk-Forward → Bootstrap → robuste Empfehlung. Ca. 60s.',
  }

  return (
    <div className="space-y-5">
      <p className="text-gray-500 text-xs">
        Fine-tuning: marketValueWeight, heritageScale, Dixon-Coles ρ. Walk-Forward + Bootstrap.
        Nur historisch validierbare Faktoren (ELO, Marktwert, Heritage). Keine manuellen Ratings.
      </p>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(sweepLabels) as SweepMode[]).map(m => (
          <button key={m} onClick={() => setSweepMode(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sweepMode === m ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {sweepLabels[m]}
          </button>
        ))}
      </div>

      <p className="text-gray-600 text-xs">{sweepDescs[sweepMode]}</p>

      <div className="flex items-center gap-4">
        <button onClick={runSweep} disabled={loading}
          className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg text-sm transition-colors">
          {loading ? 'Läuft...' : sweepLabels[sweepMode] + ' starten'}
        </button>
        {elapsed !== null && <span className="text-gray-500 text-sm">Fertig in {(elapsed / 1000).toFixed(2)}s</span>}
      </div>

      {/* Error */}
      {sweepData && !sweepData.ok && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          <strong>Fehler:</strong> {sweepData.error}
        </div>
      )}

      {/* Sweep results (1-D) */}
      {sweepData?.ok && sweepData.grid && (
        <div>
          <div className="text-xs text-gray-500 mb-2">{sweepData.matchCount} Spiele evaluiert</div>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left">
              <thead className="bg-gray-900/80 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">mvW</th>
                  <th className="px-2 py-2">hScale</th>
                  <th className="px-2 py-2">ρ</th>
                  <th className="px-2 py-2">RPS ↓</th>
                  <th className="px-2 py-2">ECE</th>
                  <th className="px-2 py-2">Skill</th>
                </tr>
              </thead>
              <tbody>
                {sweepData.grid.map((r, i) => (
                  <ParamRow key={i} r={r} rank={i + 1} highlightBest={i === 0} />
                ))}
              </tbody>
            </table>
          </div>
          {sweepData.best && (
            <div className="mt-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3 text-xs">
              <span className="text-emerald-400 font-semibold">Bestes Ergebnis: </span>
              <span className="text-gray-300 font-mono">
                mv={sweepData.best.marketValueWeight.toFixed(2)}, h={sweepData.best.heritageScale.toFixed(2)}, ρ={sweepData.best.rho.toFixed(2)}
                {' '}→ RPS={fmt4(sweepData.best.rps)}, Skill={( sweepData.best.skillScore * 100).toFixed(2)}%
              </span>
              {sweepData.baseline && (
                <span className="text-gray-500 ml-2">
                  (Baseline: RPS={fmt4(sweepData.baseline.rps)}, Δ={fmtSign(sweepData.best.rps - sweepData.baseline.rps)})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Combined grid results */}
      {gridData2?.ok && gridData2.topByRPS && (
        <div className="space-y-5">
          <div className="text-xs text-gray-500">{gridData2.matchCount} Spiele · {gridData2.gridSize} Kombinationen</div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Top 10 nach RPS</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-left">
                  <thead className="bg-gray-900/80 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">mvW</th>
                      <th className="px-2 py-2">hScale</th>
                      <th className="px-2 py-2">ρ</th>
                      <th className="px-2 py-2">RPS</th>
                      <th className="px-2 py-2">ΔRPS</th>
                      <th className="px-2 py-2">ECE</th>
                      <th className="px-2 py-2">Skill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridData2.topByRPS.map((r, i) => <ParamRow key={i} r={r} rank={i + 1} highlightBest={i === 0} />)}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Top 10 nach ECE</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-left">
                  <thead className="bg-gray-900/80 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">mvW</th>
                      <th className="px-2 py-2">hScale</th>
                      <th className="px-2 py-2">ρ</th>
                      <th className="px-2 py-2">RPS</th>
                      <th className="px-2 py-2">ΔRPS</th>
                      <th className="px-2 py-2">ECE</th>
                      <th className="px-2 py-2">Skill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridData2.topByECE?.map((r, i) => <ParamRow key={i} r={r} rank={i + 1} highlightBest={i === 0} />)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Current config comparison */}
          {gridData2.current && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs">
              <div className="text-gray-500 uppercase tracking-wider mb-2">Aktuelle Konfiguration</div>
              <span className="font-mono text-gray-300">
                mv={gridData2.current.marketValueWeight.toFixed(2)}, h={gridData2.current.heritageScale.toFixed(2)}, ρ={gridData2.current.rho.toFixed(2)}
                {' '}→ RPS={fmt4(gridData2.current.rps)}, ECE={fmt4(gridData2.current.ece)}, Skill={( gridData2.current.skillScore * 100).toFixed(2)}%
              </span>
            </div>
          )}

          {/* Walk-forward results */}
          {gridData2.walkForward && gridData2.walkForward.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Walk-Forward Top-5</h3>
              <div className="space-y-2">
                {gridData2.walkForward.map((wf, i) => <WalkForwardCard key={i} wf={wf} idx={i} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {recommendData?.ok && recommendData.recommendation && (
        <div className="space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-5">
            <div className="text-emerald-400 font-semibold mb-3">Empfohlene Konfiguration ({recommendData.recommendation.version})</div>
            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">marketValueWeight</div>
                <div className="font-mono text-violet-300 font-bold text-lg">{recommendData.recommendation.marketValueWeight.toFixed(2)}</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">heritageScale</div>
                <div className="font-mono text-blue-300 font-bold text-lg">{recommendData.recommendation.heritageScale.toFixed(2)}</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Dixon-Coles ρ</div>
                <div className="font-mono text-cyan-300 font-bold text-lg">{recommendData.recommendation.rho.toFixed(2)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-3">
              <div>In-Sample RPS: <span className="font-mono text-amber-300">{fmt4(recommendData.recommendation.inSampleRPS)}</span></div>
              <div>OOS RPS: <span className="font-mono text-amber-300">{fmt4(recommendData.recommendation.oosRPS)}</span></div>
              <div>Bootstrap pBetter: <span className={`font-mono ${recommendData.recommendation.bootstrap.pBetter > 0.9 ? 'text-emerald-400' : 'text-yellow-400'}`}>{(recommendData.recommendation.bootstrap.pBetter * 100).toFixed(1)}%</span></div>
              <div>CI95: <span className="font-mono text-gray-300">[{recommendData.recommendation.bootstrap.ci95[0].toFixed(4)}, {recommendData.recommendation.bootstrap.ci95[1].toFixed(4)}]</span></div>
            </div>
            <p className="text-xs text-gray-400">{recommendData.recommendation.recommendation}</p>
          </div>

          {recommendData.configSnippet && (
            <div>
              <div className="text-xs text-gray-500 mb-2">In config.ts übernehmen:</div>
              <pre className="bg-gray-950 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto border border-gray-800">
                {recommendData.configSnippet}
              </pre>
            </div>
          )}

          {recommendData.top5Bootstrap && recommendData.top5Bootstrap.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Bootstrap Top-5 vs ELO-Only</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-left">
                  <thead className="bg-gray-900/80 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-2 py-2">mvW</th>
                      <th className="px-2 py-2">hScale</th>
                      <th className="px-2 py-2">ρ</th>
                      <th className="px-2 py-2">RPS</th>
                      <th className="px-2 py-2">Δ vs ELO</th>
                      <th className="px-2 py-2">CI95</th>
                      <th className="px-2 py-2">p(besser)</th>
                      <th className="px-2 py-2">Reliabel?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendData.top5Bootstrap.map((b, i) => (
                      <tr key={i} className="border-t border-gray-800 text-xs hover:bg-gray-800/30">
                        <td className="px-2 py-2 font-mono text-violet-300">{b.marketValueWeight.toFixed(2)}</td>
                        <td className="px-2 py-2 font-mono text-blue-300">{b.heritageScale.toFixed(2)}</td>
                        <td className="px-2 py-2 font-mono text-cyan-300">{b.rho.toFixed(2)}</td>
                        <td className="px-2 py-2 font-mono text-amber-300">{fmt4(b.rps)}</td>
                        <td className={`px-2 py-2 font-mono ${deltaColor(b.bootstrap.delta)}`}>{fmtSign(b.bootstrap.delta)}</td>
                        <td className="px-2 py-2 font-mono text-gray-400">[{b.bootstrap.ci95[0].toFixed(4)}, {b.bootstrap.ci95[1].toFixed(4)}]</td>
                        <td className={`px-2 py-2 font-mono ${b.bootstrap.pBetter > 0.9 ? 'text-emerald-400' : 'text-yellow-400'}`}>{(b.bootstrap.pBetter * 100).toFixed(1)}%</td>
                        <td className="px-2 py-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${b.bootstrap.reliable ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800' : 'bg-gray-900/40 text-gray-500 border border-gray-700'}`}>
                            {b.bootstrap.reliable ? 'JA' : 'NEIN'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
      <div className="flex gap-1 flex-wrap">
        {(['grid', 'walkforward', 'parametersuche'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? t === 'parametersuche' ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {t === 'grid' ? 'Grid Search' : t === 'walkforward' ? 'Walk-Forward' : 'Parametersuche'}
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

      {/* Run button — only for grid/walkforward tabs */}
      {tab !== 'parametersuche' && (
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
      )}

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

      {/* Parametersuche Tab */}
      {tab === 'parametersuche' && <ParametersucheTab />}

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
