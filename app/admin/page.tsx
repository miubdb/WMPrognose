'use client'

import { useState } from 'react'
import type { EvaluationResult } from '@/lib/evaluateModel'

export default function AdminPage() {
  const [eloManualText, setEloManualText] = useState('')
  const [eloManualStatus, setEloManualStatus] = useState<string | null>(null)
  const [eloManualLoading, setEloManualLoading] = useState(false)

  const [xgStatus, setXgStatus] = useState<string | null>(null)
  const [xgLoading, setXgLoading] = useState(false)

  const [evalLoading, setEvalLoading] = useState(false)
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)

  async function loadFallbackElo() {
    setEloManualLoading(true); setEloManualStatus(null)
    try {
      const res = await fetch('/api/elo-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'fallback' }),
      })
      setEloManualStatus(JSON.stringify(await res.json(), null, 2))
    } catch (e) { setEloManualStatus(String(e)) }
    setEloManualLoading(false)
  }

  async function saveManualElo() {
    if (!eloManualText.trim()) return
    setEloManualLoading(true); setEloManualStatus(null)
    try {
      const res = await fetch('/api/elo-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'text', text: eloManualText }),
      })
      setEloManualStatus(JSON.stringify(await res.json(), null, 2))
    } catch (e) { setEloManualStatus(String(e)) }
    setEloManualLoading(false)
  }

  async function updateXg() {
    setXgLoading(true); setXgStatus(null)
    try {
      const res = await fetch('/api/fbref-update', { method: 'POST' })
      setXgStatus(JSON.stringify(await res.json(), null, 2))
    } catch (e) { setXgStatus(String(e)) }
    setXgLoading(false)
  }

  async function runEvaluation() {
    setEvalLoading(true); setEvalResult(null); setEvalError(null)
    try {
      const res = await fetch('/api/evaluate')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEvalResult(await res.json())
    } catch (e) { setEvalError(String(e)) }
    setEvalLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Admin</h1>

      {/* ELO */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-200">ELO-Ratings</h2>
          <p className="text-xs text-gray-500 mt-1">
            Täglich aktualisieren (z.B. jeden Morgen um 9 Uhr). Einfach die aktuellen ELO-Werte
            als Text einfügen — ein Team pro Zeile, Format: <code className="bg-gray-800 px-1 rounded">Land 1234</code>
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Akzeptierte Formate (auch CSV-Komma oder Tabulator):</div>
            <div className="font-mono bg-gray-800 rounded p-2 text-gray-400 space-y-0.5">
              <div>Deutschland 1944</div>
              <div>France,2025</div>
              <div>ARG	2057</div>
            </div>
            <div className="text-gray-600">Deutsche und englische Ländernamen sowie Kürzel (GER, FRA, ARG …) werden erkannt.</div>
          </div>

          <textarea
            value={eloManualText}
            onChange={e => setEloManualText(e.target.value)}
            placeholder={'Deutschland 1944\nFrankreich 2025\nArgentinien 2057\n...'}
            rows={10}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono placeholder-gray-700 focus:outline-none focus:border-gray-500"
          />

          <div className="flex gap-2">
            <button onClick={saveManualElo} disabled={eloManualLoading || !eloManualText.trim()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
              {eloManualLoading ? 'Speichere...' : 'ELO-Werte speichern'}
            </button>
            <button onClick={loadFallbackElo} disabled={eloManualLoading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
              {eloManualLoading ? '...' : 'Offline-Werte (Apr 2025)'}
            </button>
          </div>

          {eloManualStatus && (
            <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 overflow-auto max-h-40">{eloManualStatus}</pre>
          )}
        </div>
      </div>

      {/* xG */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-200">xG-Statistiken aktualisieren</h2>
          <p className="text-xs text-gray-500 mt-1">
            Ruft xG/90-Statistiken der Saison 2024/25 von understat.com ab (Premier League, La Liga, Bundesliga, Serie A, Ligue 1).
            Matched Spieler werden automatisch in der Datenbank aktualisiert.
            Spieler aus anderen Ligen behalten ihre bisherigen Werte.
          </p>
        </div>
        <button onClick={updateXg} disabled={xgLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
          {xgLoading ? 'Lädt Statistiken… (dauert ~1 Min.)' : 'xG-Stats von understat.com laden'}
        </button>
        {xgStatus && (
          <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 overflow-auto max-h-60">{xgStatus}</pre>
        )}
      </div>

      {/* Evaluation */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-200">Modell-Evaluation</h2>
          <p className="text-xs text-gray-500 mt-1">
            Testet das Modell gegen historische WM-Spiele (2014, 2018, 2022) und berechnet RPS, Log Loss und Brier Score.
          </p>
        </div>
        <button onClick={runEvaluation} disabled={evalLoading}
          className="px-4 py-2 bg-violet-700 hover:bg-violet-600 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
          {evalLoading ? 'Berechne...' : 'Modell gegen WM 2014–2022 testen'}
        </button>
        {evalError && (
          <div className="text-xs text-red-400 bg-gray-800 rounded p-3">{evalError}</div>
        )}
        {evalResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-lg p-3 space-y-1">
                <div className="text-xs text-gray-500">RPS</div>
                <div className="text-lg font-mono text-gray-100">{evalResult.avgRPS.toFixed(3)}</div>
                <div className="text-xs text-gray-600">Baseline: {evalResult.baselineRPS.toFixed(3)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 space-y-1">
                <div className="text-xs text-gray-500">Log Loss</div>
                <div className="text-lg font-mono text-gray-100">{evalResult.avgLogLoss.toFixed(3)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 space-y-1">
                <div className="text-xs text-gray-500">Brier Score</div>
                <div className="text-lg font-mono text-gray-100">{evalResult.avgBrier.toFixed(3)}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Spiele ausgewertet: <span className="text-gray-300">{evalResult.matchCount}</span></span>
              <span className={`font-medium ${evalResult.skillScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Skill Score: {evalResult.skillScore >= 0 ? '+' : ''}{(evalResult.skillScore * 100).toFixed(1)}%
              </span>
              <span className="text-gray-500">ELO-only: <span className="text-gray-400">{evalResult.eloOnlyRPS.toFixed(3)}</span></span>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Schlechteste 5 Vorhersagen</div>
              <div className="overflow-auto">
                <table className="w-full text-xs text-gray-400">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-1 pr-3 text-gray-600">Spiel</th>
                      <th className="text-center py-1 pr-3 text-gray-600">Ergebnis</th>
                      <th className="text-center py-1 pr-3 text-gray-600">Prognose W/D/L</th>
                      <th className="text-right py-1 text-gray-600">RPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...evalResult.perMatch]
                      .sort((a, b) => b.rps - a.rps)
                      .slice(0, 5)
                      .map((m, i) => (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-1.5 pr-3 text-gray-300">{m.homeTeam} – {m.awayTeam}</td>
                          <td className="py-1.5 pr-3 text-center">
                            {m.homeGoals}:{m.awayGoals}
                            <span className={`ml-1.5 font-medium ${m.outcome === 'W' ? 'text-emerald-400' : m.outcome === 'D' ? 'text-amber-400' : 'text-red-400'}`}>
                              ({m.outcome})
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-center font-mono">
                            {(m.predWin * 100).toFixed(0)}% / {(m.predDraw * 100).toFixed(0)}% / {(m.predLoss * 100).toFixed(0)}%
                          </td>
                          <td className="py-1.5 text-right font-mono text-orange-400">{m.rps.toFixed(3)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-600 space-y-1">
        <div className="font-medium text-gray-500">Hinweis: Datenquellen</div>
        <div>• ELO-Ratings: Täglich manuell eintragen (z.B. eloratings.net CSV)</div>
        <div>• xG-Statistiken: understat.com (Big 5 europäische Ligen, Saison 2024/25)</div>
        <div>• Kaderdaten &amp; Marktwerte: Manuell über die Team-Seiten eingeben</div>
      </div>
    </div>
  )
}
