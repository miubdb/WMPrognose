'use client'

import { useState } from 'react'
import type { EnsembleResult, TournamentStats } from '@/lib/evaluateModel'
import type { BootstrapResult } from '@/lib/bootstrap'

// ─── Types (API response) ─────────────────────────────────────────────────────

interface ModeMetrics {
  rps: number; logLoss: number; brier: number; ece: number
  skillScore: number; correctTendency: number
  drawRate: number; drawPredAvg: number
  baselineRPS: number; leakageWarning?: boolean
}

interface AblationRow {
  label: string; description: string
  rps: number; deltaRps: number; logLoss: number; brier: number; ece: number
  correctTendency: number; skillScore: number; baselineRPS: number
  perTournamentRps: Record<string, number>
  stabilityFlag: 'stable' | 'unstable' | 'insufficient_data'
  bootstrap: BootstrapResult
  recommendation: 'keep' | 'weak' | 'remove'
}

interface LabApiResponse {
  ok: boolean; error?: string
  tournament: string; matchCount: number; baselineRPS: number
  modes: { eloOnly: ModeMetrics; historicalFull: ModeMetrics; currentLeakage: ModeMetrics }
  ensembles: EnsembleResult[]
  tournamentBreakdown: {
    eloOnly:        Record<string, TournamentStats>
    historicalFull: Record<string, TournamentStats>
    currentLeakage: Record<string, TournamentStats>
  }
  bootstrap: { fullVsElo: BootstrapResult }
  ablation: AblationRow[] | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, d = 4) { return n.toFixed(d) }
function fmtPct(n: number, d = 1) { return (n * 100).toFixed(d) + '%' }
function delta(n: number) {
  const s = (n > 0 ? '+' : '') + fmt(n)
  return <span className={n < 0 ? 'text-emerald-400' : n > 0 ? 'text-red-400' : 'text-gray-400'}>{s}</span>
}

// ─── Components ───────────────────────────────────────────────────────────────

function ModeCard({ label, m, isLeakage }: { label: string; m: ModeMetrics; isLeakage?: boolean }) {
  const skillColor = m.skillScore > 0.05 ? 'text-emerald-400' : m.skillScore > 0 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className={`bg-gray-900 border rounded-xl p-5 ${isLeakage ? 'border-amber-700/60' : 'border-gray-800'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-semibold text-white text-sm">{label}</div>
          {isLeakage && (
            <span className="text-[10px] bg-amber-900/40 text-amber-400 border border-amber-700 px-2 py-0.5 rounded mt-1 inline-block">
              DATA LEAKAGE ⚠
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Skill Score</div>
          <div className={`font-mono font-bold text-lg ${skillColor}`}>{fmtPct(m.skillScore)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['RPS',     fmt(m.rps),     `Baseline: ${fmt(m.baselineRPS)}`],
          ['LogLoss', fmt(m.logLoss), ''],
          ['Brier',   fmt(m.brier),   ''],
          ['ECE',     fmt(m.ece),     'Kalibrierfehler'],
        ].map(([l, v, sub]) => (
          <div key={l} className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-gray-500 mb-0.5">{l}</div>
            <div className="font-mono font-semibold text-gray-200">{v}</div>
            {sub && <div className="text-gray-600 text-[10px]">{sub}</div>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-500 mb-0.5">Correct Tendency</div>
          <span className="font-mono text-gray-200">{fmtPct(m.correctTendency)}</span>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-500 mb-0.5">Draw pred / actual</div>
          <span className="font-mono text-gray-300">{fmtPct(m.drawPredAvg)} / {fmtPct(m.drawRate)}</span>
        </div>
      </div>
    </div>
  )
}

function BootstrapCard({ result }: { result: BootstrapResult }) {
  const cls = result.reliable
    ? 'border-emerald-700/60 bg-emerald-950/20'
    : result.delta < 0
    ? 'border-yellow-700/60 bg-yellow-950/10'
    : 'border-red-700/60 bg-red-950/10'

  return (
    <div className={`border rounded-xl p-5 ${cls}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Bootstrap CI (n=2000)</div>
          <div className="text-sm font-semibold text-white mt-0.5">Historical Full vs ELO-only</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded font-semibold ${
          result.reliable ? 'bg-emerald-900 text-emerald-300' :
          result.delta < 0 ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
        }`}>
          {result.reliable ? 'Signifikant' : result.delta < 0 ? 'Nicht gesichert' : 'Schlechter'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs mb-3">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-500 mb-0.5">ΔRPS</div>
          <div className="font-mono font-semibold">{delta(result.delta)}</div>
          <div className="text-gray-600 text-[10px]">Full − ELO-only</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-500 mb-0.5">95%-KI</div>
          <div className="font-mono text-gray-300 text-[11px]">[{fmt(result.ci95[0])}, {fmt(result.ci95[1])}]</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-500 mb-0.5">P(besser)</div>
          <div className="font-mono text-gray-300">{fmtPct(result.pBetter)}</div>
          <div className="text-gray-600 text-[10px]">{result.nMatches} Spiele</div>
        </div>
      </div>
      <div className="text-xs text-gray-400 italic">{result.interpretation}</div>
    </div>
  )
}

function TournamentBreakdownTable({ breakdown, eloBreakdown }: {
  breakdown: Record<string, TournamentStats>
  eloBreakdown: Record<string, TournamentStats>
}) {
  const tourneys = Object.keys(breakdown).sort()
  if (tourneys.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            {['Turnier', 'N', 'RPS', 'ΔRPS vs ELO', 'LogLoss', 'Brier', 'ECE', 'Correct', 'Draw pred/act', 'Skill'].map(h => (
              <th key={h} className="text-left text-gray-500 pb-2 pr-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tourneys.map(t => {
            const s = breakdown[t]
            const eloRps = eloBreakdown[t]?.avgRPS ?? s.avgRPS
            const d = s.avgRPS - eloRps
            return (
              <tr key={t} className="border-b border-gray-800/40">
                <td className="py-2 pr-3 font-medium text-gray-200">{t}</td>
                <td className="py-2 pr-3 text-gray-400">{s.matches}</td>
                <td className="py-2 pr-3 font-mono text-gray-200">{fmt(s.avgRPS)}</td>
                <td className="py-2 pr-3 font-mono">{delta(d)}</td>
                <td className="py-2 pr-3 font-mono text-gray-400">{fmt(s.avgLogLoss)}</td>
                <td className="py-2 pr-3 font-mono text-gray-400">{fmt(s.avgBrier)}</td>
                <td className="py-2 pr-3 font-mono text-gray-400">{fmt(s.ece)}</td>
                <td className="py-2 pr-3 font-mono text-gray-300">{fmtPct(s.correctTendency)}</td>
                <td className="py-2 pr-3 font-mono text-gray-400">{fmtPct(s.drawPredAvg)}/{fmtPct(s.drawRate)}</td>
                <td className="py-2 font-mono">
                  <span className={s.skillScore > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {fmtPct(s.skillScore)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AblationTable({ rows }: { rows: AblationRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            {['Konfiguration', 'RPS', 'ΔRPS', 'Skill', 'ECE', 'Correct', 'CI95', 'Stabil?', 'Empfehlung'].map(h => (
              <th key={h} className="text-left text-gray-500 pb-2 pr-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const recColor = r.recommendation === 'keep' ? 'text-emerald-400'
              : r.recommendation === 'weak' ? 'text-yellow-400' : 'text-red-400'
            const recLabel = r.recommendation === 'keep' ? 'Behalten ✓'
              : r.recommendation === 'weak' ? 'Schwach ~' : 'Entfernen ✗'
            const stabColor = r.stabilityFlag === 'stable' ? 'text-emerald-400'
              : r.stabilityFlag === 'unstable' ? 'text-red-400' : 'text-gray-500'
            const isBaseline = i === 0
            return (
              <tr key={r.label} className={`border-b border-gray-800/40 ${isBaseline ? 'bg-gray-800/30' : ''}`}>
                <td className="py-2 pr-3">
                  <div className={`font-medium ${isBaseline ? 'text-gray-500' : 'text-gray-200'}`}>{r.label}</div>
                  {!isBaseline && <div className="text-gray-600 text-[10px] mt-0.5">{r.description}</div>}
                </td>
                <td className="py-2 pr-3 font-mono text-gray-200">{fmt(r.rps)}</td>
                <td className="py-2 pr-3 font-mono">{isBaseline ? '—' : delta(r.deltaRps)}</td>
                <td className="py-2 pr-3 font-mono">
                  <span className={r.skillScore > 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtPct(r.skillScore)}</span>
                </td>
                <td className="py-2 pr-3 font-mono text-gray-400">{fmt(r.ece)}</td>
                <td className="py-2 pr-3 font-mono text-gray-300">{fmtPct(r.correctTendency)}</td>
                <td className="py-2 pr-3 font-mono text-gray-400 text-[10px]">
                  {isBaseline ? '—' : `[${fmt(r.bootstrap.ci95[0],4)}, ${fmt(r.bootstrap.ci95[1],4)}]`}
                </td>
                <td className="py-2 pr-3">
                  <span className={stabColor}>{r.stabilityFlag === 'stable' ? 'Ja' : r.stabilityFlag === 'unstable' ? 'Nein' : '?'}</span>
                </td>
                <td className="py-2">
                  {isBaseline ? <span className="text-gray-600">Baseline</span> :
                    <span className={`font-semibold ${recColor}`}>{recLabel}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EnsembleTable({ ensembles, baseline }: { ensembles: EnsembleResult[]; baseline: number }) {
  const best = ensembles[0]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            {['', 'RPS', 'LogLoss', 'Brier', 'ECE', 'Skill', 'Correct', 'Draw pred'].map(h => (
              <th key={h} className="text-left text-gray-500 pb-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ensembles.map(e => {
            const isBest = e.config.label === best.config.label
            return (
              <tr key={e.config.label} className={`border-b border-gray-800/50 ${isBest ? 'bg-emerald-950/30' : ''}`}>
                <td className="py-2 pr-4">
                  <div className={isBest ? 'font-semibold text-emerald-300' : 'text-gray-200'}>
                    {isBest && <span className="text-emerald-500 mr-1">★</span>}
                    {e.config.label}
                  </div>
                  <div className="text-gray-600 mt-0.5">
                    ELO {Math.round(e.config.weights.eloOnly * 100)}% · Full {Math.round(e.config.weights.fullModel * 100)}% · Prior {Math.round(e.config.weights.uniform * 100)}%
                  </div>
                </td>
                <td className="py-2 pr-4"><span className="font-mono font-semibold text-gray-200">{fmt(e.rps)}</span></td>
                <td className="py-2 pr-4"><span className="font-mono text-gray-300">{fmt(e.logLoss)}</span></td>
                <td className="py-2 pr-4"><span className="font-mono text-gray-300">{fmt(e.brier)}</span></td>
                <td className="py-2 pr-4"><span className="font-mono text-gray-300">{fmt(e.ece)}</span></td>
                <td className="py-2 pr-4">
                  <span className={`font-mono font-semibold ${e.skillScore > 0.05 ? 'text-emerald-400' : e.skillScore > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {fmtPct(e.skillScore)}
                  </span>
                </td>
                <td className="py-2 pr-4"><span className="font-mono text-gray-300">{fmtPct(e.correctTendency)}</span></td>
                <td className="py-2"><span className="font-mono text-gray-300">{fmtPct(e.drawPredAvg)}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TOURNAMENTS = [
  { value: 'all', label: 'Alle Turniere' },
  { value: 'WM2022', label: 'WM 2022' },
  { value: 'WM2018', label: 'WM 2018' },
  { value: 'WM2014', label: 'WM 2014' },
  { value: 'EURO2024', label: 'EURO 2024' },
]

export default function ModelLabPage() {
  const [tournament, setTournament]       = useState('all')
  const [loading, setLoading]             = useState(false)
  const [ablLoading, setAblLoading]       = useState(false)
  const [data, setData]                   = useState<LabApiResponse | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [showLeakage, setShowLeakage]     = useState(false)
  const [breakdown, setBreakdown]         = useState<'historicalFull' | 'eloOnly' | 'currentLeakage'>('historicalFull')

  async function runLab() {
    setLoading(true); setError(null); setData(null)
    try {
      const res  = await fetch(`/api/model-lab?tournament=${tournament}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Fehler')
      setData(json)
    } catch (e) { setError(String(e)) }
    finally     { setLoading(false) }
  }

  async function runAblation() {
    if (!data) return
    setAblLoading(true)
    try {
      const res  = await fetch(`/api/model-lab?tournament=${tournament}&ablation=1`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Fehler')
      setData(json)
    } catch (e) { setError(String(e)) }
    finally     { setAblLoading(false) }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Model Lab</h1>
        <p className="text-gray-500 text-sm mt-1">
          Vollständiges Evaluation Audit — Metrikkorrektheit, Turnier-Breakdown, Bootstrap-KI, Feature-Ablation.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Turnier</label>
          <select
            value={tournament} onChange={e => setTournament(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none"
          >
            {TOURNAMENTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={runLab} disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
          {loading ? 'Berechne…' : 'Analyse starten'}
        </button>
        {data && (
          <button onClick={runAblation} disabled={ablLoading}
            className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
            {ablLoading ? 'Ablation läuft…' : 'Ablation starten (langsam)'}
          </button>
        )}
        {data && (
          <div className="text-xs text-gray-500 ml-auto">
            {data.matchCount} Spiele · Baseline RPS: {fmt(data.baselineRPS)}
            <span className="ml-2 text-gray-600">(uniform ∅ auf diesem Datensatz)</span>
          </div>
        )}
      </div>

      {error && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

      {data && (
        <>
          {/* Mode cards */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Evaluierungsmodi</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModeCard label="ELO-only (sauber)"         m={data.modes.eloOnly} />
              <ModeCard label="Historical Full (sauber)"  m={data.modes.historicalFull} />
              {showLeakage
                ? <ModeCard label="Current Data (Leakage)" m={data.modes.currentLeakage} isLeakage />
                : <button onClick={() => setShowLeakage(true)}
                    className="bg-gray-900 border border-amber-800/40 rounded-xl p-5 text-amber-600 text-xs text-center hover:border-amber-700 transition-colors">
                    Current Leakage anzeigen ⚠<br /><span className="text-gray-600">Nur als Vergleich — verfälscht Metriken</span>
                  </button>
              }
            </div>

            {/* Delta summary */}
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Delta vs. ELO-only</div>
              <div className="flex gap-8 text-xs">
                {(['eloOnly', 'historicalFull', 'currentLeakage'] as const).map(k => {
                  const d = data.modes[k].rps - data.modes.eloOnly.rps
                  return (
                    <div key={k}>
                      <div className="text-gray-500 mb-1">{k === 'eloOnly' ? 'ELO-only' : k === 'historicalFull' ? 'Historical Full' : 'Leakage ⚠'}</div>
                      <div className="font-mono font-semibold">{k === 'eloOnly' ? 'Baseline' : delta(d)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Bootstrap CI */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statistische Signifikanz</h2>
            <BootstrapCard result={data.bootstrap.fullVsElo} />
          </section>

          {/* Tournament breakdown */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Turnier-Breakdown</h2>
              <div className="flex gap-2">
                {(['historicalFull', 'eloOnly', 'currentLeakage'] as const).map(k => (
                  <button key={k}
                    onClick={() => setBreakdown(k)}
                    className={`text-xs px-3 py-1 rounded-md transition-colors ${
                      breakdown === k ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}>
                    {k === 'eloOnly' ? 'ELO-only' : k === 'historicalFull' ? 'Historical Full' : 'Leakage'}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <TournamentBreakdownTable
                breakdown={data.tournamentBreakdown[breakdown]}
                eloBreakdown={data.tournamentBreakdown.eloOnly}
              />
            </div>
          </section>

          {/* Ensemble comparison */}
          {data.ensembles.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ensemble-Vergleich</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <EnsembleTable ensembles={data.ensembles} baseline={data.baselineRPS} />
                {data.ensembles[0] && (
                  <div className="mt-4 bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-3">
                    <div className="text-xs text-emerald-400 font-semibold">Beste Konfiguration</div>
                    <div className="text-sm text-emerald-300 font-semibold mt-0.5">{data.ensembles[0].config.label}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      RPS {fmt(data.ensembles[0].rps)} · Skill {fmtPct(data.ensembles[0].skillScore)} · Correct {fmtPct(data.ensembles[0].correctTendency)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Ablation */}
          {data.ablation && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Feature-Ablation</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <AblationTable rows={data.ablation} />
                <div className="mt-4 text-xs text-gray-600">
                  <strong className="text-gray-500">Legende:</strong>{' '}
                  ΔRPS = Differenz zum ELO-only Baseline (negativ = besser). CI95 = 95%-Bootstrap-Konfidenzintervall.
                  Stabil = ΔRPS-Vorzeichen konsistent über alle Turniere. Empfehlung basiert auf Bootstrap-Signifikanz.
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {!data && !loading && (
        <div className="text-center text-gray-600 py-16 text-sm">Turnier auswählen und „Analyse starten" klicken.</div>
      )}
    </div>
  )
}
