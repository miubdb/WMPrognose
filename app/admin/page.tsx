'use client'

import { useState } from 'react'

export default function AdminPage() {
  // ELO auto-scrape
  const [eloStatus, setEloStatus] = useState<string | null>(null)
  const [eloLoading, setEloLoading] = useState(false)

  // ELO manual
  const [eloManualText, setEloManualText] = useState('')
  const [eloManualStatus, setEloManualStatus] = useState<string | null>(null)
  const [eloManualLoading, setEloManualLoading] = useState(false)

  // xG scrape
  const [xgStatus, setXgStatus] = useState<string | null>(null)
  const [xgLoading, setXgLoading] = useState(false)

  async function updateElo() {
    setEloLoading(true); setEloStatus(null)
    try {
      const res = await fetch('/api/elo-update', { method: 'POST' })
      setEloStatus(JSON.stringify(await res.json(), null, 2))
    } catch (e) { setEloStatus(String(e)) }
    setEloLoading(false)
  }

  async function loadFallbackElo() {
    setEloManualLoading(true); setEloManualStatus(null)
    try {
      const res = await fetch('/api/elo-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'fallback' }),
      })
      const data = await res.json()
      setEloManualStatus(JSON.stringify(data, null, 2))
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

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Admin</h1>

      {/* ELO */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-200">ELO-Ratings</h2>
          <p className="text-xs text-gray-500 mt-1">
            ELO-Ratings bestimmen die Ausgangsstärke jedes Teams im Modell (Hvattum &amp; Arntzen 2010).
          </p>
        </div>

        {/* Auto-scrape */}
        <div className="space-y-2 border border-gray-800 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Automatisch (Wikipedia)</div>
          <p className="text-xs text-gray-600">Versucht, aktuelle ELO-Ratings von Wikipedia abzurufen. Kann fehlschlagen wenn die Seite blockiert.</p>
          <button onClick={updateElo} disabled={eloLoading}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
            {eloLoading ? 'Lade...' : 'ELO von Wikipedia laden'}
          </button>
          {eloStatus && <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 overflow-auto max-h-40">{eloStatus}</pre>}
        </div>

        {/* Manual / fallback */}
        <div className="space-y-2 border border-gray-700 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-300 uppercase tracking-wider">Manuell / Offline-Fallback</div>

          <button onClick={loadFallbackElo} disabled={eloManualLoading}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
            {eloManualLoading ? 'Speichere...' : '📥 Offline-Werte laden (April 2025)'}
          </button>
          <p className="text-xs text-gray-600">
            Lädt vorberechnete ELO-Werte für alle 48 WM-Teams direkt in die Datenbank — kein Internet nötig.
            Werte basieren auf eloratings.net, Stand April 2025.
          </p>

          <div className="pt-2 border-t border-gray-800 space-y-2">
            <div className="text-xs text-gray-500">Oder eigene Werte einfügen — ein Team pro Zeile, Format: <code className="bg-gray-800 px-1 rounded">Land 1234</code></div>
            <textarea
              value={eloManualText}
              onChange={e => setEloManualText(e.target.value)}
              placeholder={'Deutschland 1944\nFrankreich 2025\nArgentinien 2057\n...'}
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono placeholder-gray-700 focus:outline-none focus:border-gray-500"
            />
            <button onClick={saveManualElo} disabled={eloManualLoading || !eloManualText.trim()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
              {eloManualLoading ? 'Speichere...' : 'Manuell gespeicherte ELO-Werte übernehmen'}
            </button>
          </div>

          {eloManualStatus && <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 overflow-auto max-h-40">{eloManualStatus}</pre>}
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

      {/* Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-600 space-y-1">
        <div className="font-medium text-gray-500">Hinweis: Datenquellen</div>
        <div>• ELO-Ratings: Wikipedia (automatisch) oder manuell (Offline-Werte / eigene Eingabe)</div>
        <div>• xG-Statistiken: understat.com (Big 5 europäische Ligen, Saison 2024/25)</div>
        <div>• Kaderdaten &amp; Marktwerte: Manuell über die Team-Seiten eingeben</div>
      </div>
    </div>
  )
}
