'use client'

import { useState, useEffect, useCallback } from 'react'
import { Player, parseSquadText } from '@/src/data/players'

interface SquadEditorProps {
  players: Player[]
  teamId: string
}

const POS_ORDER: Record<Player['position'], number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 }
const POS_COLORS: Record<Player['position'], string> = {
  GK: 'bg-yellow-500/20 text-yellow-400 border-yellow-700',
  DEF: 'bg-emerald-500/20 text-emerald-400 border-emerald-700',
  MID: 'bg-blue-500/20 text-blue-400 border-blue-700',
  FWD: 'bg-rose-500/20 text-rose-400 border-rose-700',
}

// Short player name (last name or last 2 parts)
function shortName(name: string): string {
  const parts = name.split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : name
}

// Formation positions on pitch: GK bottom, FWD top (SVG coords)
// Returns { x: 0-100, y: 0-100 } in percent
function getPositionCoords(
  position: Player['position'],
  index: number,
  countInPosition: number
): { x: number; y: number } {
  const yMap: Record<Player['position'], number> = { GK: 85, DEF: 65, MID: 40, FWD: 15 }
  const y = yMap[position]
  const spacing = 100 / (countInPosition + 1)
  const x = spacing * (index + 1)
  return { x, y }
}

// Import modal
function ImportModal({
  players,
  onMatch,
  onClose,
}: {
  players: Player[]
  onMatch: (ids: string[]) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [matched, setMatched] = useState<Player[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])

  const handleChange = (val: string) => {
    setText(val)
    const lines = val.split('\n').map(l => l.trim()).filter(Boolean)
    const found: Player[] = []
    const notFound: string[] = []
    for (const line of lines) {
      const lower = line.toLowerCase()
      const p = players.find(pl => pl.name.toLowerCase().includes(lower) || lower.includes(pl.name.toLowerCase()))
      if (p) found.push(p)
      else notFound.push(line)
    }
    // deduplicate
    const unique = [...new Map(found.map(p => [p.id, p])).values()]
    setMatched(unique)
    setUnmatched(notFound)
  }

  const handleImport = () => {
    onMatch(matched.slice(0, 11).map(p => p.id))
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="font-semibold text-sm">Startelf importieren (Copy-Paste)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">Spielernamen einfügen (ein Name pro Zeile). Fuzzy-Matching gegen den Kader.</p>
          <textarea
            autoFocus
            className="w-full h-36 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-300 focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="Marc-André ter Stegen&#10;Joshua Kimmich&#10;Florian Wirtz&#10;..."
            value={text}
            onChange={e => handleChange(e.target.value)}
          />
          {matched.length > 0 && (
            <div className="text-xs space-y-1">
              <p className="text-emerald-400 font-medium">{matched.length} erkannt{matched.length > 11 ? ' (nur erste 11 werden übernommen)' : ''}:</p>
              <div className="flex flex-wrap gap-1">
                {matched.slice(0, 11).map(p => (
                  <span key={p.id} className="bg-emerald-900/40 text-emerald-300 px-1.5 py-0.5 rounded">
                    {shortName(p.name)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {unmatched.length > 0 && (
            <div className="text-xs">
              <p className="text-rose-400">Nicht erkannt: {unmatched.join(', ')}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-sm transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleImport}
            disabled={matched.length === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {matched.length > 0 ? `${Math.min(matched.length, 11)} Spieler übernehmen` : 'Importieren'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Pitch SVG with positioned player circles
function PitchView({ starters }: { starters: Player[] }) {
  const byPos: Record<Player['position'], Player[]> = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const p of starters) byPos[p.position].push(p)

  const playerCircles: { player: Player; x: number; y: number }[] = []
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Player['position'][]) {
    byPos[pos].forEach((p, i) => {
      const { x, y } = getPositionCoords(pos, i, byPos[pos].length)
      playerCircles.push({ player: p, x, y })
    })
  }

  const posCircleColor: Record<Player['position'], string> = {
    GK: '#eab308',
    DEF: '#10b981',
    MID: '#3b82f6',
    FWD: '#f43f5e',
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: '150%' }}>
      <div className="absolute inset-0">
        <svg viewBox="0 0 100 150" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Pitch background */}
          <rect x="0" y="0" width="100" height="150" fill="#166534" rx="3" />
          {/* Stripes */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={i} x="0" y={i * 25} width="100" height="12.5" fill="#15803d" opacity="0.5" />
          ))}
          {/* Outline */}
          <rect x="3" y="3" width="94" height="144" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" />
          {/* Halfway line */}
          <line x1="3" y1="75" x2="97" y2="75" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Center circle */}
          <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.4)" />
          {/* Penalty areas */}
          <rect x="20" y="3" width="60" height="22" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <rect x="20" y="125" width="60" height="22" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          {/* Goal areas */}
          <rect x="35" y="3" width="30" height="9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" />
          <rect x="35" y="138" width="30" height="9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" />

          {/* Players */}
          {playerCircles.map(({ player, x, y }) => (
            <g key={player.id} transform={`translate(${x}, ${y * 1.5})`}>
              <circle r="5.5" fill={posCircleColor[player.position]} opacity="0.9" />
              <circle r="5.5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
              {player.jerseyNumber && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="3.5"
                  fontWeight="bold"
                  fill="white"
                >
                  {player.jerseyNumber}
                </text>
              )}
              <text
                textAnchor="middle"
                dominantBaseline="hanging"
                y="6.5"
                fontSize="3"
                fill="white"
                style={{ textShadow: '0 0 3px #000' }}
              >
                {shortName(player.name).slice(0, 9)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default function SquadEditor({ players, teamId }: SquadEditorProps) {
  const storageKey = `s11_${teamId}`

  const [startingXI, setStartingXI] = useState<string[]>([])
  const [showImport, setShowImport] = useState(false)
  const [view, setView] = useState<'list' | 'pitch'>('list')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        if (Array.isArray(parsed)) setStartingXI(parsed)
        return
      }
    } catch {
      // ignore
    }
    // Default: use isInStartingXI from data
    setStartingXI(players.filter(p => p.isInStartingXI).map(p => p.id))
  }, [storageKey, players])

  // Persist to localStorage on change
  const updateXI = useCallback((ids: string[]) => {
    setStartingXI(ids)
    try { localStorage.setItem(storageKey, JSON.stringify(ids)) } catch { /* ignore */ }
  }, [storageKey])

  const togglePlayer = (playerId: string) => {
    const isIn = startingXI.includes(playerId)
    if (isIn) {
      updateXI(startingXI.filter(id => id !== playerId))
    } else if (startingXI.length < 11) {
      updateXI([...startingXI, playerId])
    }
  }

  const resetToDefault = () => {
    const defaultXI = players.filter(p => p.isInStartingXI).map(p => p.id)
    updateXI(defaultXI)
  }

  const starters = players
    .filter(p => startingXI.includes(p.id))
    .sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position])

  const bench = players
    .filter(p => !startingXI.includes(p.id))
    .sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position])

  // Startelf stats
  const avgAge = starters.length > 0
    ? (starters.reduce((s, p) => s + p.age, 0) / starters.length).toFixed(1)
    : '–'
  const totalValue = starters.reduce((s, p) => s + p.marketValueM, 0)
  const avgRating = starters.length > 0
    ? (starters.reduce((s, p) => s + p.rating, 0) / starters.length).toFixed(1)
    : '–'

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Startelf-Editor</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              startingXI.length === 11 ? 'bg-emerald-900 text-emerald-400' : 'bg-yellow-900 text-yellow-400'
            }`}>
              {startingXI.length}/11
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Importieren
            </button>
            <button
              onClick={resetToDefault}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 transition-colors"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Startelf Stats */}
        {starters.length > 0 && (
          <div className="px-4 py-2 bg-gray-800/30 flex gap-6 text-xs border-b border-gray-800">
            <div>
              <span className="text-gray-500">Ø Alter </span>
              <span className="font-mono text-white">{avgAge}</span>
            </div>
            <div>
              <span className="text-gray-500">Marktwert </span>
              <span className="font-mono text-emerald-400">€{totalValue}M</span>
            </div>
            <div>
              <span className="text-gray-500">Ø Rating </span>
              <span className="font-mono text-blue-400">{avgRating}</span>
            </div>
          </div>
        )}

        {/* View toggle */}
        <div className="px-4 py-2 flex gap-1 border-b border-gray-800">
          <button
            onClick={() => setView('list')}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${view === 'list' ? 'bg-emerald-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
          >
            Liste
          </button>
          <button
            onClick={() => setView('pitch')}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${view === 'pitch' ? 'bg-emerald-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
          >
            Aufstellung
          </button>
        </div>

        {view === 'pitch' ? (
          <div className="p-4">
            {starters.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Keine Spieler in der Startelf ausgewählt.</p>
            ) : (
              <div className="max-w-xs mx-auto">
                <PitchView starters={starters} />
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Starters */}
            <div>
              <div className="px-4 py-1.5 bg-emerald-900/20">
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                  Startelf ({starters.length}/11) – Klicken zum Entfernen
                </span>
              </div>
              {starters.length === 0 && (
                <p className="text-gray-600 text-xs px-4 py-3">Keine Spieler ausgewählt. Klicke auf Kaderspieler um sie hinzuzufügen.</p>
              )}
              <div className="divide-y divide-gray-800">
                {starters.map(player => (
                  <PlayerRowInteractive
                    key={player.id}
                    player={player}
                    isSelected={true}
                    canAdd={false}
                    onToggle={() => togglePlayer(player.id)}
                  />
                ))}
              </div>
            </div>

            {/* Bench */}
            {bench.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-gray-800/50">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weiterer Kader {startingXI.length < 11 ? '– Klicken zum Hinzufügen' : '(Startelf voll)'}
                  </span>
                </div>
                <div className="divide-y divide-gray-800">
                  {bench.map(player => (
                    <PlayerRowInteractive
                      key={player.id}
                      player={player}
                      isSelected={false}
                      canAdd={startingXI.length < 11}
                      onToggle={() => togglePlayer(player.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showImport && (
        <ImportModal
          players={players}
          onMatch={ids => updateXI(ids)}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

function PlayerRowInteractive({
  player,
  isSelected,
  canAdd,
  onToggle,
}: {
  player: Player
  isSelected: boolean
  canAdd: boolean
  onToggle: () => void
}) {
  const clickable = isSelected || canAdd

  return (
    <button
      onClick={clickable ? onToggle : undefined}
      disabled={!clickable}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
        ${isSelected ? 'hover:bg-rose-900/20 bg-emerald-900/10' : canAdd ? 'hover:bg-emerald-900/20' : 'opacity-40 cursor-not-allowed'}
      `}
    >
      {player.jerseyNumber && (
        <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0">{player.jerseyNumber}</span>
      )}
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium border flex-shrink-0 ${POS_COLORS[player.position]}`}>
        {player.position}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{player.name}</div>
        {player.clubTeam && (
          <div className="text-xs text-gray-500 truncate">{player.clubTeam}</div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-gray-400">{player.age}J</div>
        <div className="text-xs text-gray-600">€{player.marketValueM}M</div>
      </div>
      <div className="w-8 text-right flex-shrink-0">
        <span className={`text-xs font-mono ${player.rating >= 85 ? 'text-emerald-400' : player.rating >= 75 ? 'text-blue-400' : 'text-gray-400'}`}>
          {player.rating}
        </span>
      </div>
      <div className="w-5 flex-shrink-0 text-center">
        {isSelected ? (
          <span className="text-rose-500 text-xs">✕</span>
        ) : canAdd ? (
          <span className="text-emerald-500 text-xs">＋</span>
        ) : null}
      </div>
    </button>
  )
}
