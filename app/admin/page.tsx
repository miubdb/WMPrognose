'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fbrefLoading, setFbrefLoading] = useState(false)
  const [fbrefStatus, setFbrefStatus] = useState<string | null>(null)

  async function updateElo() {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/elo-update', { method: 'POST' })
      const data = await res.json()
      setStatus(JSON.stringify(data, null, 2))
    } catch (e) {
      setStatus(String(e))
    }
    setLoading(false)
  }

  async function updateFBref() {
    setFbrefLoading(true)
    setFbrefStatus(null)
    try {
      const res = await fetch('/api/fbref-update', { method: 'POST' })
      const data = await res.json()
      setFbrefStatus(JSON.stringify(data, null, 2))
    } catch (e) {
      setFbrefStatus(String(e))
    }
    setFbrefLoading(false)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-gray-200">ELO-Ratings aktualisieren</h2>
        <p className="text-sm text-gray-500">Ruft aktuelle ELO-Ratings von eloratings.net ab und speichert sie in der Datenbank. Wird täglich empfohlen, besonders vor Turnierbeginn.</p>
        <button
          onClick={updateElo}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? 'Aktualisiere...' : 'ELO jetzt aktualisieren'}
        </button>
        {status && (
          <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 overflow-auto max-h-48">{status}</pre>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-gray-200">xG-Stats von FBref aktualisieren</h2>
        <p className="text-sm text-gray-500">
          Ruft Spieler-xG/90-Statistiken der Saison 2024/25 von FBref.com ab (Big 5 + MLS + J-League + Saudi + Argentinien + Brasilien + Liga MX) und aktualisiert die Datenbank.
          Matching erfolgt über Spielernamen. Nicht gematchte Spieler werden übersprungen.
        </p>
        <button onClick={updateFBref} disabled={fbrefLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
          {fbrefLoading ? 'Lädt FBref...' : 'xG-Stats jetzt laden'}
        </button>
        {fbrefStatus && (
          <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 overflow-auto max-h-60">{fbrefStatus}</pre>
        )}
      </div>
    </div>
  )
}
