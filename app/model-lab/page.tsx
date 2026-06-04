'use client'

import { useState } from 'react'
import type { EnsembleResult } from '@/lib/evaluateModel'

interface ModeMetrics {
  rps: number; logLoss: number; brier: number
  ece: number; skillScore: number; correctTendency: number
  drawRate: number; drawPredAvg: number
  leakageWarning?: boolean
}

interface LabApiResponse {
  ok: boolean
  error?: string
  tournament: string
  matchCount: number
  modes: {
    eloOnly: ModeMetrics
    historicalFull: ModeMetrics
    currentLeakage: ModeMetrics & { leakageWarning: true }
  }
  ensembles: EnsembleResult[]
  baselineRPS: number
}

function fmt(n: number, d = 4) { return n.toFixed(d) }
function fmtPct(n: number, d = 1) { return (n * 100).toFixed(d) + '%' }

function MetricBadge({ value, baseline, lowerIsBetter = true }: {
  value: number; baseline: number; lowerIsBetter?: boolean
}) {
  const better = lowerIsBetter ? value < baseline : value > baseline
  const cls = better
    ? 'text-emerald-400'
    : value === baseline ? 'text-gray-400' : 'text-red-400'
  return <span className={`font-mono font-semibold ${cls}`}>{fmt(value)}</span>
}

function ModeCard({ label, m, baseline, isLeakage }: {
  label: string; m: ModeMetrics; baseline: number; isLeakage?: boolean
}) {
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
          { label: 'RPS', value: m.rps, base: baseline, lowerIsBetter: true },
          { label: 'LogLoss', value: m.logLoss, base: 1.0, lowerIsBetter: true },
          { label: 'Brier', value: m.brier, base: 0.5, lowerIsBetter: true },
          { label: 'ECE', value: m.ece, base: 0.1, lowerIsBetter: true },
        ].map(({ label: l, value, base, lowerIsBetter }) => (
          <div key={l} className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-gray-500 mb-0.5">{l}</div>
            <MetricBadge value={value} baseline={base} lowerIsBetter={lowerIsBetter} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-500 mb-0.5">Correct Tendency</div>
          <span className="font-mono font-semibold text-gray-200">{fmtPct(m.correctTendency)}</span>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-500 mb-0.5">Draw pred / actual</div>
          <span className="font-mono text-gray-300">{fmtPct(m.drawPredAvg)} / {fmtPct(m.drawRate)}</span>
        </div>
      </div>
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
          {ensembles.map((e, i) => {
            const isBest = e.config.label === best.config.label
            return (
              <tr key={e.config.label} className={`border-b border-gray-800/50 ${isBest ? 'bg-emerald-950/30' : ''}`}>
                <td className="py-2 pr-4">
                  <div className={`text-gray-200 ${isBest ? 'font-semibold text-emerald-300' : ''}`}>
                    {isBest && <span className="text-emerald-500 mr-1">★</span>}
                    {e.config.label}
                  </div>
                  <div className="text-gray-600 mt-0.5">
                    ELO {Math.round(e.config.weights.eloOnly * 100)}% · Full {Math.round(e.config.weights.fullModel * 100)}% · Prior {Math.round(e.config.weights.uniform * 100)}%
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <MetricBadge value={e.rps} baseline={baseline} lowerIsBetter />
                </td>
                <td className="py-2 pr-4">
                  <span className="font-mono text-gray-300">{fmt(e.logLoss)}</span>
                </td>
                <td className="py-2 pr-4">
                  <span className="font-mono text-gray-300">{fmt(e.brier)}</span>
                </td>
                <td className="py-2 pr-4">
                  <span className="font-mono text-gray-300">{fmt(e.ece)}</span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`font-mono font-semibold ${e.skillScore > 0.05 ? 'text-emerald-400' : e.skillScore > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {fmtPct(e.skillScore)}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className="font-mono text-gray-300">{fmtPct(e.correctTendency)}</span>
                </td>
                <td className="py-2">
                  <span className="font-mono text-gray-300">{fmtPct(e.drawPredAvg)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const TOURNAMENTS = [
  { value: 'all', label: 'Alle Turniere' },
  { value: 'WM2022', label: 'WM 2022' },
  { value: 'WM2018', label: 'WM 2018' },
  { value: 'WM2014', label: 'WM 2014' },
  { value: 'EURO2024', label: 'EURO 2024' },
]

export default function ModelLabPage() {
  const [tournament, setTournament] = useState('all')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<LabApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runLab() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/model-lab?tournament=${tournament}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Fehler')
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Model Lab</h1>
        <p className="text-gray-500 text-sm mt-1">
          Vergleich der drei Evaluierungsmodi + Ensemble-Analyse. Kein UI-Gimmick — Qualitätskontrolle für den Algorithmus.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Turnier</label>
          <select
            value={tournament}
            onChange={e => setTournament(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {TOURNAMENTS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={runLab}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Berechne…' : 'Analyse starten'}
        </button>
        {data && (
          <div className="text-xs text-gray-500 ml-auto">
            {data.matchCount} Spiele · Turnier: {data.tournament} · Baseline RPS: {fmt(data.baselineRPS)}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {data && (
        <>
          {/* Mode comparison */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Evaluierungsmodi im Vergleich
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModeCard
                label="ELO-only (sauber)"
                m={data.modes.eloOnly}
                baseline={data.baselineRPS}
              />
              <ModeCard
                label="Historical Full (sauber)"
                m={data.modes.historicalFull}
                baseline={data.baselineRPS}
              />
              <ModeCard
                label="Current Data (Leakage)"
                m={data.modes.currentLeakage}
                baseline={data.baselineRPS}
                isLeakage
              />
            </div>

            {/* Delta table */}
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
                Delta vs. ELO-only Baseline
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                {(['eloOnly', 'historicalFull', 'currentLeakage'] as const).map(key => {
                  const m = data.modes[key]
                  const eloRps = data.modes.eloOnly.rps
                  const delta = m.rps - eloRps
                  const isLeakage = key === 'currentLeakage'
                  return (
                    <div key={key} className="space-y-1">
                      <div className="text-gray-500 font-medium">
                        {key === 'eloOnly' ? 'ELO-only' : key === 'historicalFull' ? 'Historical Full' : 'Current Leakage'}
                        {isLeakage && <span className="ml-1 text-amber-500">⚠</span>}
                      </div>
                      <div className={`font-mono font-semibold ${delta < 0 ? 'text-emerald-400' : delta === 0 ? 'text-gray-400' : 'text-red-400'}`}>
                        ΔRPS: {delta === 0 ? '±0' : (delta > 0 ? '+' : '') + fmt(delta)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Ensemble comparison */}
          {data.ensembles && data.ensembles.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Ensemble-Vergleich (sortiert nach RPS)
              </h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <EnsembleTable ensembles={data.ensembles} baseline={data.baselineRPS} />

                {/* Best config highlight */}
                {data.ensembles[0] && (
                  <div className="mt-4 bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-3">
                    <div className="text-xs text-emerald-400 font-semibold mb-1">Beste Konfiguration</div>
                    <div className="text-sm text-emerald-300 font-semibold">{data.ensembles[0].config.label}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      RPS {fmt(data.ensembles[0].rps)} · Skill {fmtPct(data.ensembles[0].skillScore)} ·
                      ECE {fmt(data.ensembles[0].ece)} · Correct {fmtPct(data.ensembles[0].correctTendency)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Model assumptions summary */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Modellannahmen
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-xs space-y-2 text-gray-400">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {[
                  ['ELO (historisch)', 'Aktiv in allen Modi aus Match-Records'],
                  ['Marktwert', 'Aktiv: historical snapshots (WC2022/WC2018/EURO2024); ELO-only: neutral'],
                  ['Turnierhistorie', 'Aktiv in historicalFull + currentLeakage (heritageLog)'],
                  ['Attack/Defense/SetPiece Ratings', 'Nur currentLeakage; historicalFull + eloOnly: neutral (70)'],
                  ['Dixon-Coles Korrektur', 'Aktiv in allen Modi (ρ=0.04)'],
                  ['Kontext (Altitude/Heat/Travel)', 'Nicht in historicalFull/eloOnly (keine hist. Daten)'],
                  ['Doppelzählung Heritage', 'Behoben: expLogA entfernt, nur noch heritageLogA/B'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="text-gray-500">{label}: </span>
                    <span className="text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {!data && !loading && (
        <div className="text-center text-gray-600 py-16 text-sm">
          Turnier auswählen und „Analyse starten" klicken.
        </div>
      )}
    </div>
  )
}
