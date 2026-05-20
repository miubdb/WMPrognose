'use client'

import { useState } from 'react'
import { parseSquadText, Player } from '@/src/data/players'

interface SquadImportModalProps {
  teamId: string
  onImport: (players: Partial<Player>[]) => void
  onClose: () => void
}

export default function SquadImportModal({ teamId, onImport, onClose }: SquadImportModalProps) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<Partial<Player>[]>([])

  const handleTextChange = (value: string) => {
    setText(value)
    if (value.trim()) {
      const parsed = parseSquadText(value, teamId)
      setPreview(parsed)
    } else {
      setPreview([])
    }
  }

  const handleImport = () => {
    if (preview.length > 0) {
      onImport(preview)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="font-semibold">Kader importieren</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Instructions */}
          <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400 space-y-1">
            <p className="font-medium text-gray-300">Unterstützte Formate:</p>
            <p><code className="text-emerald-400">1. Name Position Alter Club 40M</code> (z.B. aus Wikipedia)</p>
            <p><code className="text-emerald-400">Name | Position | Alter | Club | €60M</code></p>
            <p><code className="text-emerald-400">1 Name GK 33</code> (kurzes Format)</p>
            <p className="text-gray-500">Position muss GK, DEF, MID oder FWD sein</p>
          </div>

          {/* Text Input */}
          <textarea
            className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-300 focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="Spieler-Daten hier einfügen..."
            value={text}
            onChange={e => handleTextChange(e.target.value)}
          />

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-gray-300">
                Vorschau ({preview.length} Spieler erkannt)
              </h3>
              <div className="bg-gray-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {preview.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-gray-700 last:border-0 text-xs">
                    {p.jerseyNumber && <span className="text-gray-600 w-4">{p.jerseyNumber}</span>}
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      p.position === 'GK' ? 'bg-yellow-900 text-yellow-400' :
                      p.position === 'DEF' ? 'bg-emerald-900 text-emerald-400' :
                      p.position === 'MID' ? 'bg-blue-900 text-blue-400' :
                      'bg-rose-900 text-rose-400'
                    }`}>{p.position}</span>
                    <span className="flex-1 font-medium">{p.name}</span>
                    {p.age && <span className="text-gray-500">{p.age}J</span>}
                    {p.marketValueM && <span className="text-gray-500">€{p.marketValueM}M</span>}
                    {p.clubTeam && <span className="text-gray-600 truncate max-w-24">{p.clubTeam}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {text && preview.length === 0 && (
            <p className="text-xs text-rose-400">Keine Spieler erkannt. Überprüfe das Format.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-sm transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleImport}
            disabled={preview.length === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {preview.length > 0 ? `${preview.length} Spieler importieren` : 'Importieren'}
          </button>
        </div>
      </div>
    </div>
  )
}
