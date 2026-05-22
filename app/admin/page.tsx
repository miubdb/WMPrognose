'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    </div>
  )
}
