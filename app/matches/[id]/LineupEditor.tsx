'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface LineupPlayer {
  id: string
  name: string
  position: string | null
  jersey_number: number | null
  market_value_m: number | null
  is_in_starting_xi: boolean | null
}

interface TeamData {
  id: string
  name: string
  flag: string
  players: LineupPlayer[]
}

const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD']
const POS_LABELS: Record<string, string> = { GK: 'Tor', DEF: 'Abwehr', MID: 'Mittelfeld', FWD: 'Sturm' }

function TeamLineup({ team, onToggle }: { team: TeamData; onToggle: (id: string, current: boolean) => void }) {
  const byPos = POS_ORDER.reduce((acc, pos) => {
    acc[pos] = team.players.filter(p => p.position === pos)
    return acc
  }, {} as Record<string, LineupPlayer[]>)

  const startingCount = team.players.filter(p => p.is_in_starting_xi).length

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{team.flag}</span>
        <span className="font-semibold text-sm text-white">{team.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded font-mono ml-auto ${
          startingCount === 11 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'
        }`}>
          {startingCount}/11
        </span>
      </div>
      {team.players.length === 0 ? (
        <div className="text-xs text-gray-600 italic">
          Kein Kader eingetragen –{' '}
          <Link href={`/teams/${team.id}`} className="text-gray-500 underline hover:text-gray-300 transition-colors">
            Kader hinzufügen
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {POS_ORDER.map(pos => {
            const group = byPos[pos] ?? []
            if (group.length === 0) return null
            return (
              <div key={pos}>
                <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">{POS_LABELS[pos]}</div>
                {group.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onToggle(p.id, !!p.is_in_starting_xi)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors mb-0.5 text-left ${
                      p.is_in_starting_xi
                        ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                        : 'bg-gray-800/50 border border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                      p.is_in_starting_xi ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'
                    }`}>
                      {p.is_in_starting_xi && <span className="text-[8px] text-black font-bold">✓</span>}
                    </span>
                    <span className="text-gray-600 font-mono w-4 text-right">{p.jersey_number ?? '–'}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LineupEditor({ teamA, teamB }: { teamA: TeamData; teamB: TeamData }) {
  const [playersA, setPlayersA] = useState(teamA.players)
  const [playersB, setPlayersB] = useState(teamB.players)
  const [saving, setSaving] = useState<string | null>(null)
  const [open, setOpen] = useState(true)
  const router = useRouter()

  const toggle = useCallback(async (
    id: string,
    current: boolean,
    isTeamA: boolean
  ) => {
    const next = !current
    // Optimistic update
    if (isTeamA) {
      setPlayersA(ps => ps.map(p => p.id === id ? { ...p, is_in_starting_xi: next } : p))
    } else {
      setPlayersB(ps => ps.map(p => p.id === id ? { ...p, is_in_starting_xi: next } : p))
    }
    setSaving(id)
    try {
      await fetch(`/api/players/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_in_starting_xi: next }),
      })
      router.refresh()
    } catch (_) {
      // revert on error
      if (isTeamA) {
        setPlayersA(ps => ps.map(p => p.id === id ? { ...p, is_in_starting_xi: current } : p))
      } else {
        setPlayersB(ps => ps.map(p => p.id === id ? { ...p, is_in_starting_xi: current } : p))
      }
    }
    setSaving(null)
  }, [router])

  const startA = playersA.filter(p => p.is_in_starting_xi).length
  const startB = playersB.filter(p => p.is_in_starting_xi).length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Erwartete Aufstellung</span>
          <span className="text-xs text-gray-500">
            {teamA.flag} {startA}/11 · {teamB.flag} {startB}/11
          </span>
        </div>
        <span className="text-gray-600 text-xs">{open ? '▲ Einklappen' : '▼ Aufstellung eintragen'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-800 p-4">
          <p className="text-xs text-gray-600 mb-4">
            Spieler anklicken zum Markieren als Startelf (11 pro Team). Wird für alle Spiele des Teams gespeichert bis zur nächsten Änderung.
          </p>
          {saving && (
            <div className="text-xs text-gray-500 mb-2">Speichere...</div>
          )}
          <div className="flex gap-6">
            <TeamLineup
              team={{ ...teamA, players: playersA }}
              onToggle={(id, cur) => toggle(id, cur, true)}
            />
            <div className="w-px bg-gray-800 flex-shrink-0" />
            <TeamLineup
              team={{ ...teamB, players: playersB }}
              onToggle={(id, cur) => toggle(id, cur, false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
