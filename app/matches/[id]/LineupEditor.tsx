'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'

export interface LineupPlayer {
  id: string
  name: string
  position: string | null
  jersey_number: number | null
  market_value_m: number | null
  xg_per90: number | null
  xga_per90: number | null
  age: number | null
  rating: number | null
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

// ── Player strength score 1–99 from available data ──────────────────────────

function computeStrength(p: LineupPlayer): { score: number; lines: string[] } {
  const lines: string[] = []

  // Market value: log-scale → 0–65 pts
  const mv = p.market_value_m ?? 0
  const mvScore = mv > 0
    ? Math.min(65, 10 + Math.log10(mv + 1) * 24)
    : 10
  lines.push(`Marktwert ${mv > 0 ? mv + ' M€' : 'unbekannt'} → ${Math.round(mvScore)} Pkt`)

  // xG component for FWD/MID → 0–20 pts
  let xgScore = 0
  if (p.xg_per90 != null && (p.position === 'FWD' || p.position === 'MID')) {
    xgScore = Math.min(20, p.xg_per90 * 45)
    lines.push(`xG/90 ${p.xg_per90.toFixed(2)} (${p.position}) → +${Math.round(xgScore)} Pkt`)
  }

  // xA component for DEF/GK → 0–10 pts
  let xaScore = 0
  if (p.xga_per90 != null && (p.position === 'DEF' || p.position === 'GK')) {
    xaScore = Math.min(10, p.xga_per90 * 30)
    lines.push(`xA/90 ${p.xga_per90.toFixed(2)} (${p.position}) → +${Math.round(xaScore)} Pkt`)
  }

  // Age: bonus/penalty relative to prime (25–29)
  let agePenalty = 0
  const age = p.age
  if (age != null && age > 0) {
    if (age < 22) agePenalty = -(22 - age) * 2
    else if (age > 32) agePenalty = -(age - 32) * 2
    if (agePenalty !== 0) {
      lines.push(`Alter ${age} → ${agePenalty > 0 ? '+' : ''}${Math.round(agePenalty)} Pkt`)
    }
  }

  const raw = mvScore + xgScore + xaScore + agePenalty
  const score = Math.round(Math.max(1, Math.min(99, raw)))
  return { score, lines }
}

function ratingColor(score: number): string {
  if (score >= 85) return 'bg-amber-500/20 text-amber-300 border-amber-600/40'
  if (score >= 75) return 'bg-blue-500/20 text-blue-300 border-blue-600/40'
  if (score >= 65) return 'bg-gray-600/20 text-gray-400 border-gray-600/40'
  return 'bg-gray-800/20 text-gray-600 border-gray-700/40'
}

// ── Tooltip wrapper (pure CSS, no dependency) ─────────────────────────────────

function RatingBadge({ player }: { player: LineupPlayer }) {
  const { score, lines } = computeStrength(player)
  const color = ratingColor(score)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <span
      className="relative ml-auto flex-shrink-0"
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setShow(true)
      }}
      onMouseLeave={() => {
        timerRef.current = setTimeout(() => setShow(false), 100)
      }}
    >
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono cursor-default ${color}`}>
        {score}
      </span>
      {show && (
        <span className="absolute right-0 bottom-full mb-1.5 z-50 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs p-2.5 pointer-events-none">
          <span className="block font-semibold text-white mb-1.5">Spielerstärke: {score}/99</span>
          {lines.map((l, i) => (
            <span key={i} className="block text-gray-400 leading-snug">{l}</span>
          ))}
          <span className="block text-gray-600 mt-1.5 text-[9px]">
            Basierend auf Marktwert · xG/90 · Alter
          </span>
        </span>
      )}
    </span>
  )
}

// ── Per-team lineup panel ─────────────────────────────────────────────────────

function TeamLineup({
  team,
  onToggle,
  savingId,
}: {
  team: TeamData
  onToggle: (id: string, current: boolean) => void
  savingId: string | null
}) {
  const byPos = POS_ORDER.reduce((acc, pos) => {
    acc[pos] = team.players.filter(p => p.position === pos)
    return acc
  }, {} as Record<string, LineupPlayer[]>)

  const startingCount = team.players.filter(p => p.is_in_starting_xi).length
  const full = startingCount >= 11

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{team.flag}</span>
        <span className="font-semibold text-sm text-white">{team.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded font-mono ml-auto ${
          startingCount === 11
            ? 'bg-emerald-900/40 text-emerald-400'
            : startingCount > 11
            ? 'bg-red-900/40 text-red-400'
            : 'bg-gray-800 text-gray-500'
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
                <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  {POS_LABELS[pos]}
                </div>
                {group.map(p => {
                  const isSelected = !!p.is_in_starting_xi
                  const isSaving = savingId === p.id
                  const blocked = full && !isSelected

                  return (
                    <button
                      key={p.id}
                      onClick={() => !blocked && !isSaving && onToggle(p.id, isSelected)}
                      disabled={blocked || isSaving}
                      title={blocked ? 'Bereits 11 ausgewählt – zuerst einen anderen abwählen' : undefined}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors mb-0.5 text-left group ${
                        isSelected
                          ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                          : blocked
                          ? 'bg-gray-800/20 border border-transparent text-gray-600 cursor-not-allowed opacity-50'
                          : isSaving
                          ? 'bg-gray-800/50 border border-transparent text-gray-500 cursor-wait'
                          : 'bg-gray-800/50 border border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-gray-600'
                      }`}>
                        {isSaving
                          ? <span className="block w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
                          : isSelected && <span className="text-[8px] text-black font-bold">✓</span>
                        }
                      </span>
                      <span className="text-gray-600 font-mono w-4 text-right flex-shrink-0">
                        {p.jersey_number ?? '–'}
                      </span>
                      <span className="truncate flex-1">{p.name}</span>
                      <RatingBadge player={p} />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function LineupEditor({ teamA, teamB }: { teamA: TeamData; teamB: TeamData }) {
  const [playersA, setPlayersA] = useState(teamA.players)
  const [playersB, setPlayersB] = useState(teamB.players)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(true)

  const toggle = useCallback(async (id: string, current: boolean, isTeamA: boolean) => {
    const next = !current
    const applyUpdate = (ps: LineupPlayer[]) =>
      ps.map(p => p.id === id ? { ...p, is_in_starting_xi: next } : p)
    const revert = (ps: LineupPlayer[]) =>
      ps.map(p => p.id === id ? { ...p, is_in_starting_xi: current } : p)

    // Optimistic update
    if (isTeamA) setPlayersA(applyUpdate)
    else setPlayersB(applyUpdate)

    setSavingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_in_starting_xi: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `Fehler ${res.status}`)
      }
      // No router.refresh() — optimistic state IS the truth
    } catch (err) {
      if (isTeamA) setPlayersA(revert)
      else setPlayersB(revert)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingId(null)
    }
  }, [])

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
          <p className="text-xs text-gray-600 mb-3">
            Spieler anklicken = Startelf. Max. 11 pro Team.
            Badge = Spielerstärke 1–99 (Hover für Details).
          </p>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2 py-1.5 mb-3">
              ⚠ Speicherfehler: {error}
            </div>
          )}

          <div className="flex gap-6">
            <TeamLineup
              team={{ ...teamA, players: playersA }}
              onToggle={(id, cur) => toggle(id, cur, true)}
              savingId={savingId}
            />
            <div className="w-px bg-gray-800 flex-shrink-0" />
            <TeamLineup
              team={{ ...teamB, players: playersB }}
              onToggle={(id, cur) => toggle(id, cur, false)}
              savingId={savingId}
            />
          </div>
        </div>
      )}
    </div>
  )
}
