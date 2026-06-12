'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  sofascore_rating: number | null
  is_in_starting_xi: boolean | null
  suspended: boolean | null
  suspended_until_date: string | null
  goals: number | null
  yellow_cards: number | null
  red_cards: number | null
}

interface TeamData {
  id: string
  name: string
  flag: string
  players: LineupPlayer[]
}

const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD']
const POS_LABELS: Record<string, string> = { GK: 'Tor', DEF: 'Abwehr', MID: 'Mittelfeld', FWD: 'Sturm' }

function isSuspendedForMatch(p: LineupPlayer, matchDate: string): boolean {
  return !!p.suspended && !!p.suspended_until_date && p.suspended_until_date >= matchDate
}

// ── Marktwert-Badge ───────────────────────────────────────────────────────────

function MarketValueBadge({ mv }: { mv: number | null }) {
  if (!mv || mv <= 0) return null
  const label = mv >= 100 ? `${Math.round(mv)}M` : mv >= 10 ? `${mv.toFixed(0)}M` : mv >= 1 ? `${mv.toFixed(1)}M` : `${Math.round(mv * 1000)}T`
  const color = mv >= 80
    ? 'text-amber-300'
    : mv >= 30
    ? 'text-blue-300'
    : mv >= 10
    ? 'text-gray-300'
    : 'text-gray-500'
  return (
    <span className={`flex-shrink-0 text-[10px] font-mono tabular-nums ${color}`}>
      {label}
    </span>
  )
}

// ── Sofascore Rating Badge ────────────────────────────────────────────────────

function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating || rating <= 0) return null
  const color = rating >= 8.0 ? 'text-amber-300'
    : rating >= 7.0 ? 'text-emerald-400'
    : rating >= 6.5 ? 'text-blue-400'
    : rating >= 6.0 ? 'text-gray-400'
    : 'text-red-400'
  return (
    <span className={`flex-shrink-0 text-[10px] font-mono tabular-nums font-semibold ${color}`}>
      {rating.toFixed(1)}
    </span>
  )
}

// ── Turnier-Stats: Tore + Karten ──────────────────────────────────────────────

function TournamentStatsBadge({ p }: { p: LineupPlayer }) {
  const goals = p.goals ?? 0
  const yellows = p.yellow_cards ?? 0
  const reds = p.red_cards ?? 0
  if (goals === 0 && yellows === 0 && reds === 0) return null
  return (
    <span className="flex-shrink-0 flex items-center gap-0.5 text-[9px]">
      {goals > 0 && <span title={`${goals} Tor(e) im Turnier`}>⚽{goals > 1 ? `×${goals}` : ''}</span>}
      {yellows > 0 && (
        <span
          className={yellows >= 2 ? 'text-red-400 font-bold' : 'text-yellow-400'}
          title={yellows >= 2 ? 'Gelbsperre! 2. Gelbe Karte → nächstes Spiel gesperrt' : `${yellows}. Gelbe Karte — bei der 2. droht Gelbsperre`}
        >
          🟨{yellows > 1 ? `×${yellows}` : ''}
        </span>
      )}
      {reds > 0 && <span title="Rote Karte im Turnier">🟥</span>}
    </span>
  )
}

// ── xG/xGA Stat-Indikator ─────────────────────────────────────────────────────

function StatBadge({ position, xg, xga }: { position: string | null; xg: number | null; xga: number | null }) {
  const pos = position ?? ''

  if ((pos === 'FWD' || pos === 'MID') && (xg ?? 0) > 0) {
    const v = xg!
    const color = v >= 0.25 ? 'text-emerald-400' : v >= 0.12 ? 'text-blue-400' : 'text-gray-500'
    return (
      <span className={`flex-shrink-0 text-[9px] font-mono tabular-nums ${color}`} title="xG/90">
        {v.toFixed(2)} xG
      </span>
    )
  }

  if ((pos === 'DEF' || pos === 'GK') && (xga ?? 0) > 0) {
    const v = xga!
    // lower xGA = better = greener
    const color = v <= 0.8 ? 'text-emerald-400' : v <= 1.3 ? 'text-blue-400' : 'text-gray-500'
    return (
      <span className={`flex-shrink-0 text-[9px] font-mono tabular-nums ${color}`} title="xGA/90">
        {v.toFixed(2)} xGA
      </span>
    )
  }

  return null
}

// ── Per-team lineup panel ─────────────────────────────────────────────────────

function TeamLineup({
  team,
  onToggle,
  savingIds,
  matchDate,
}: {
  team: TeamData
  onToggle: (id: string, current: boolean) => void
  savingIds: Set<string>
  matchDate: string
}) {
  const byPos = POS_ORDER.reduce((acc, pos) => {
    acc[pos] = team.players.filter(p => p.position === pos)
    return acc
  }, {} as Record<string, LineupPlayer[]>)

  const startingCount = team.players.filter(p => p.is_in_starting_xi && !isSuspendedForMatch(p, matchDate)).length
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
                  const suspended = isSuspendedForMatch(p, matchDate)
                  const isSelected = !!p.is_in_starting_xi && !suspended
                  const isSaving = savingIds.has(p.id)
                  const blocked = (full && !isSelected) || suspended

                  return (
                    <button
                      key={p.id}
                      onClick={() => !blocked && !isSaving && onToggle(p.id, isSelected)}
                      disabled={blocked || isSaving}
                      title={suspended ? `Gesperrt bis ${p.suspended_until_date}` : blocked ? 'Bereits 11 ausgewählt – zuerst einen anderen abwählen' : undefined}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors mb-0.5 text-left group ${
                        suspended
                          ? 'bg-red-900/20 border border-red-800/40 text-red-400/60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                          : blocked
                          ? 'bg-gray-800/20 border border-transparent text-gray-600 cursor-not-allowed opacity-50'
                          : isSaving
                          ? 'bg-gray-800/50 border border-transparent text-gray-500 cursor-wait'
                          : 'bg-gray-800/50 border border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                        suspended
                          ? 'border-red-700 bg-red-900/40'
                          : isSelected
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-gray-600'
                      }`}>
                        {suspended
                          ? <span className="text-[8px] text-red-400 font-bold">✕</span>
                          : isSaving
                          ? <span className="block w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
                          : isSelected && <span className="text-[8px] text-black font-bold">✓</span>
                        }
                      </span>
                      <span className="text-gray-600 font-mono w-4 text-right flex-shrink-0">
                        {p.jersey_number ?? '–'}
                      </span>
                      <span className="truncate flex-1">{p.name}</span>
                      <TournamentStatsBadge p={p} />
                      {suspended && <span className="text-[9px] text-red-500 font-semibold flex-shrink-0">GESPERRT</span>}
                      {!suspended && (p.sofascore_rating ? <RatingBadge rating={p.sofascore_rating} /> : <MarketValueBadge mv={p.market_value_m} />)}
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

export function LineupEditor({
  matchId,
  matchDate,
  teamA,
  teamB,
  xgA,
  xgB,
}: {
  matchId: string
  matchDate: string
  teamA: TeamData
  teamB: TeamData
  xgA?: number
  xgB?: number
}) {
  const router = useRouter()
  const [playersA, setPlayersA] = useState(teamA.players)
  const [playersB, setPlayersB] = useState(teamB.players)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(true)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const pendingSaves = useRef(0)
  const pendingRefresh = useRef(false)

  // Restore selections from sessionStorage on mount (survives same-tab navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem(`lineup-${matchId}`)
    if (!stored) return
    const { selected } = JSON.parse(stored) as { selected: string[] }
    setPlayersA(ps => ps.map(p => ({ ...p, is_in_starting_xi: selected.includes(p.id) })))
    setPlayersB(ps => ps.map(p => ({ ...p, is_in_starting_xi: selected.includes(p.id) })))
  }, [matchId])

  // Persist selected player IDs to sessionStorage
  const persistToSession = useCallback((newA: LineupPlayer[], newB: LineupPlayer[]) => {
    if (typeof window === 'undefined') return
    const selected = [
      ...newA.filter(p => p.is_in_starting_xi).map(p => p.id),
      ...newB.filter(p => p.is_in_starting_xi).map(p => p.id),
    ]
    sessionStorage.setItem(`lineup-${matchId}`, JSON.stringify({ selected }))
  }, [matchId])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => { setRefreshing(false); setNeedsRefresh(false) }, 1000)
  }, [router])

  const toggle = useCallback(async (id: string, current: boolean, isTeamA: boolean) => {
    const next = !current

    const applyUpdate = (ps: LineupPlayer[]) =>
      ps.map(p => p.id === id ? { ...p, is_in_starting_xi: next } : p)
    const revert = (ps: LineupPlayer[]) =>
      ps.map(p => p.id === id ? { ...p, is_in_starting_xi: current } : p)

    // Optimistic update + persist to sessionStorage immediately
    let nextA = playersA
    let nextB = playersB
    if (isTeamA) {
      nextA = applyUpdate(playersA)
      setPlayersA(nextA)
    } else {
      nextB = applyUpdate(playersB)
      setPlayersB(nextB)
    }
    persistToSession(nextA, nextB)

    setSavingIds(prev => new Set(prev).add(id))
    setError(null)
    pendingSaves.current++

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
      setNeedsRefresh(true)
      pendingRefresh.current = true
    } catch (err) {
      if (isTeamA) setPlayersA(revert)
      else setPlayersB(revert)
      persistToSession(
        isTeamA ? revert(playersA) : playersA,
        isTeamA ? playersB : revert(playersB),
      )
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(id); return s })
      pendingSaves.current = Math.max(0, pendingSaves.current - 1)
      // Auto-refresh once all saves are done so the S11 indicator updates immediately
      if (pendingSaves.current === 0 && pendingRefresh.current) {
        pendingRefresh.current = false
        setNeedsRefresh(false)
        setRefreshing(true)
        router.refresh()
        setTimeout(() => setRefreshing(false), 1200)
      }
    }
  }, [playersA, playersB, persistToSession, router])

  const startA = playersA.filter(p => p.is_in_starting_xi).length
  const startB = playersB.filter(p => p.is_in_starting_xi).length
  const lineupComplete = startA === 11 && startB === 11

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold">Erwartete Aufstellung</span>
          <span className="text-xs text-gray-500">
            {teamA.flag} {startA}/11 · {teamB.flag} {startB}/11
          </span>
          {xgA !== undefined && xgB !== undefined && lineupComplete && (
            <span className="text-xs text-gray-600 font-mono">
              Prognose: <span className="text-gray-300">{xgA.toFixed(1)} – {xgB.toFixed(1)} xG</span>
            </span>
          )}
        </div>
        <span className="text-gray-600 text-xs">{open ? '▲ Einklappen' : '▼ Aufstellung eintragen'}</span>
      </button>

      {needsRefresh && pendingSaves.current === 0 && (
        <div className="border-t border-emerald-800/30 bg-emerald-900/10 px-4 py-2 flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-400">
            Aufstellung gespeichert — Prognose oben neu berechnen?
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs px-3 py-1 rounded bg-emerald-800/50 text-emerald-300 hover:bg-emerald-700/50 transition-colors disabled:opacity-50"
          >
            {refreshing ? 'Wird geladen…' : '⟳ Prognose aktualisieren'}
          </button>
        </div>
      )}

      {!lineupComplete && (startA > 0 || startB > 0) && (
        <div className="border-t border-amber-800/30 bg-amber-900/10 px-4 py-2 text-xs text-amber-400 flex items-center gap-2">
          <span>⚠</span>
          <span>
            Startelf unvollständig — Prognose basiert auf Kaderwerten
            {startA !== 11 && ` (${teamA.name}: ${startA}/11)`}
            {startB !== 11 && ` (${teamB.name}: ${startB}/11)`}
          </span>
        </div>
      )}

      {open && (
        <div className="border-t border-gray-800 p-4">
          <p className="text-xs text-gray-600 mb-1">
            Spieler anklicken = Startelf. Max. 11 pro Team.
          </p>
          <p className="text-xs text-gray-700 mb-3">
            Stat-Farben: <span className="text-emerald-400">stark</span> · <span className="text-blue-400">gut</span> · <span className="text-gray-500">schwach</span> — xG/90 für Angriff &amp; Mittelfeld, xGA/90 für Abwehr &amp; Tor (niedriger = besser)
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
              savingIds={savingIds}
              matchDate={matchDate}
            />
            <div className="w-px bg-gray-800 flex-shrink-0" />
            <TeamLineup
              team={{ ...teamB, players: playersB }}
              onToggle={(id, cur) => toggle(id, cur, false)}
              savingIds={savingIds}
              matchDate={matchDate}
            />
          </div>
        </div>
      )}
    </div>
  )
}
