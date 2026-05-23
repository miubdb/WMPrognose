'use client'

import { useState, useMemo, useEffect } from 'react'
import { GROUP_SCHEDULE } from '@/src/data/schedule'
import { TEAM_BY_ID, ALL_TEAMS } from '@/src/data/allTeams'
import { computeGroupStandings, type TeamStanding } from '@/lib/standings'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimResult {
  goalsA: number
  goalsB: number
}

interface KnockoutMatch {
  id: string
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  label: string
  teamAId: string | null
  teamBId: string | null
  teamALabel: string
  teamBLabel: string
  winnerId: string | null
  /** which KO match slot feeds this match's teamA / teamB */
  feedsFromA?: string
  feedsFromB?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

// Round of 32 slots: 1A vs 2B pattern
// Pairs of groups whose winner/runner-up meet each other
const R32_SLOTS: Array<{ id: string; grpA: string; posA: number; grpB: string; posB: number }> = [
  { id: 'R32_1',  grpA: 'A', posA: 1, grpB: 'B', posB: 2 },
  { id: 'R32_2',  grpA: 'C', posA: 1, grpB: 'D', posB: 2 },
  { id: 'R32_3',  grpA: 'E', posA: 1, grpB: 'F', posB: 2 },
  { id: 'R32_4',  grpA: 'G', posA: 1, grpB: 'H', posB: 2 },
  { id: 'R32_5',  grpA: 'I', posA: 1, grpB: 'J', posB: 2 },
  { id: 'R32_6',  grpA: 'K', posA: 1, grpB: 'L', posB: 2 },
  { id: 'R32_7',  grpA: 'B', posA: 1, grpB: 'A', posB: 2 },
  { id: 'R32_8',  grpA: 'D', posA: 1, grpB: 'C', posB: 2 },
  { id: 'R32_9',  grpA: 'F', posA: 1, grpB: 'E', posB: 2 },
  { id: 'R32_10', grpA: 'H', posA: 1, grpB: 'G', posB: 2 },
  { id: 'R32_11', grpA: 'J', posA: 1, grpB: 'I', posB: 2 },
  { id: 'R32_12', grpA: 'L', posA: 1, grpB: 'K', posB: 2 },
  // 4 slots for the 8 best third-placed teams (user assigns manually)
  { id: 'R32_13', grpA: '3rd', posA: 1, grpB: '3rd', posB: 2 },
  { id: 'R32_14', grpA: '3rd', posA: 3, grpB: '3rd', posB: 4 },
  { id: 'R32_15', grpA: '3rd', posA: 5, grpB: '3rd', posB: 6 },
  { id: 'R32_16', grpA: '3rd', posA: 7, grpB: '3rd', posB: 8 },
]

// Round of 16: winners of R32
const R16_PAIRS: Array<{ id: string; fromA: string; fromB: string }> = [
  { id: 'R16_1', fromA: 'R32_1',  fromB: 'R32_2' },
  { id: 'R16_2', fromA: 'R32_3',  fromB: 'R32_4' },
  { id: 'R16_3', fromA: 'R32_5',  fromB: 'R32_6' },
  { id: 'R16_4', fromA: 'R32_7',  fromB: 'R32_8' },
  { id: 'R16_5', fromA: 'R32_9',  fromB: 'R32_10' },
  { id: 'R16_6', fromA: 'R32_11', fromB: 'R32_12' },
  { id: 'R16_7', fromA: 'R32_13', fromB: 'R32_14' },
  { id: 'R16_8', fromA: 'R32_15', fromB: 'R32_16' },
]

const QF_PAIRS: Array<{ id: string; fromA: string; fromB: string }> = [
  { id: 'QF1', fromA: 'R16_1', fromB: 'R16_2' },
  { id: 'QF2', fromA: 'R16_3', fromB: 'R16_4' },
  { id: 'QF3', fromA: 'R16_5', fromB: 'R16_6' },
  { id: 'QF4', fromA: 'R16_7', fromB: 'R16_8' },
]

const SF_PAIRS: Array<{ id: string; fromA: string; fromB: string }> = [
  { id: 'SF1', fromA: 'QF1', fromB: 'QF2' },
  { id: 'SF2', fromA: 'QF3', fromB: 'QF4' },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function teamName(id: string | null): string {
  if (!id) return '?'
  return TEAM_BY_ID[id]?.name ?? id
}
function teamFlag(id: string | null): string {
  if (!id) return '🏳️'
  return TEAM_BY_ID[id]?.flag ?? '🏳️'
}

// Tiebreak score for 3rd-placed teams (pts, gd, gf)
function thirdScore(t: TeamStanding): number {
  return t.pts * 10000 + t.gd * 100 + t.gf
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoalInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="number"
      min="0"
      max="99"
      value={value}
      placeholder={placeholder ?? ''}
      onChange={e => onChange(e.target.value)}
      className="w-10 bg-gray-800 border border-gray-700 rounded text-center text-sm text-white focus:border-emerald-600 focus:outline-none"
    />
  )
}

// ─── Group Panel ──────────────────────────────────────────────────────────────

function GroupPanel({
  group,
  standings,
  simResults,
  onSimulate,
}: {
  group: string
  standings: TeamStanding[]
  simResults: Record<string, SimResult>
  onSimulate: (matchId: string, r: SimResult | null) => void
}) {
  const matches = GROUP_SCHEDULE.filter(m => m.group === group)
  const [inputs, setInputs] = useState<Record<string, { a: string; b: string }>>({})

  function setInput(matchId: string, side: 'a' | 'b', val: string) {
    setInputs(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], a: prev[matchId]?.a ?? '', b: prev[matchId]?.b ?? '', [side]: val },
    }))
  }

  function handleApply(matchId: string) {
    const inp = inputs[matchId]
    if (!inp) return
    const gA = parseInt(inp.a)
    const gB = parseInt(inp.b)
    if (isNaN(gA) || isNaN(gB) || gA < 0 || gB < 0) return
    onSimulate(matchId, { goalsA: gA, goalsB: gB })
  }

  function handleClear(matchId: string) {
    onSimulate(matchId, null)
    setInputs(prev => {
      const next = { ...prev }
      delete next[matchId]
      return next
    })
  }

  return (
    <div className="space-y-3">
      {/* Standings table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-[10px] border-b border-gray-800">
            <th className="py-1.5 text-left font-normal w-5">#</th>
            <th className="py-1.5 text-left font-normal">Team</th>
            <th className="py-1.5 text-center font-normal w-8">Sp</th>
            <th className="py-1.5 text-center font-normal w-7">S</th>
            <th className="py-1.5 text-center font-normal w-7">U</th>
            <th className="py-1.5 text-center font-normal w-7">N</th>
            <th className="py-1.5 text-center font-normal w-12">Tore</th>
            <th className="py-1.5 text-center font-normal w-8">TD</th>
            <th className="py-1.5 text-center font-normal w-8 text-emerald-400">Pkt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/30">
          {standings.map((t, i) => {
            const team = TEAM_BY_ID[t.teamId]
            const rowClass =
              i < 2
                ? 'bg-emerald-900/10'
                : i === 2
                ? 'bg-yellow-900/10'
                : 'bg-red-900/5 opacity-70'
            return (
              <tr key={t.teamId} className={rowClass}>
                <td className="py-1.5 text-gray-500 pl-1">{i + 1}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span>{team?.flag}</span>
                    <span className="text-gray-200 font-medium">{team?.name}</span>
                    {i < 2 && <span className="text-[9px] text-emerald-500 font-bold">✓</span>}
                    {i === 2 && <span className="text-[9px] text-yellow-500 font-bold">3.</span>}
                  </div>
                </td>
                <td className="py-1.5 text-center text-gray-500">{t.played}</td>
                <td className="py-1.5 text-center text-gray-400">{t.won}</td>
                <td className="py-1.5 text-center text-gray-400">{t.drawn}</td>
                <td className="py-1.5 text-center text-gray-400">{t.lost}</td>
                <td className="py-1.5 text-center text-gray-500">{t.gf}:{t.ga}</td>
                <td className={`py-1.5 text-center text-xs ${t.gd > 0 ? 'text-emerald-400' : t.gd < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {t.gd > 0 ? '+' : ''}{t.gd}
                </td>
                <td className="py-1.5 text-center font-bold text-white">{t.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Match list */}
      <div className="space-y-1">
        {matches.map(m => {
          const teamA = TEAM_BY_ID[m.teamAId]
          const teamB = TEAM_BY_ID[m.teamBId]
          const sim = simResults[m.id]
          const inp = inputs[m.id] ?? { a: '', b: '' }

          return (
            <div key={m.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-800/30 last:border-0">
              <span className="text-gray-600 font-mono text-[10px] w-5 shrink-0">ST{m.matchday}</span>
              <div className="flex items-center gap-1 flex-1 justify-end">
                <span className="text-gray-300">{teamA?.name}</span>
                <span>{teamA?.flag}</span>
              </div>

              {sim ? (
                /* Simulated result display */
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-bold text-white font-mono w-4 text-center">{sim.goalsA}</span>
                  <span className="text-gray-600">:</span>
                  <span className="font-bold text-white font-mono w-4 text-center">{sim.goalsB}</span>
                  <button
                    onClick={() => handleClear(m.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors ml-1 text-[10px]"
                    title="Simulation entfernen"
                  >✕</button>
                </div>
              ) : (
                /* Input fields */
                <div className="flex items-center gap-1 shrink-0">
                  <GoalInput
                    value={inp.a}
                    onChange={v => setInput(m.id, 'a', v)}
                    placeholder="–"
                  />
                  <span className="text-gray-600">:</span>
                  <GoalInput
                    value={inp.b}
                    onChange={v => setInput(m.id, 'b', v)}
                    placeholder="–"
                  />
                  <button
                    onClick={() => handleApply(m.id)}
                    disabled={!inp.a || !inp.b}
                    className="ml-1 px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-[10px] transition-colors"
                  >
                    OK
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 flex-1">
                <span>{teamB?.flag}</span>
                <span className="text-gray-300">{teamB?.name}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Knockout Match Card ───────────────────────────────────────────────────────

function KOMatchCard({
  match,
  onWinner,
}: {
  match: KnockoutMatch
  onWinner: (matchId: string, winnerId: string | null) => void
}) {
  const hasTeams = match.teamAId !== null && match.teamBId !== null
  const isUnknown = !match.teamAId && !match.teamBId

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 min-w-[200px]">
      <div className="text-[10px] text-emerald-500 font-bold mb-2">{match.label}</div>
      {/* Team A */}
      <button
        disabled={!hasTeams}
        onClick={() => onWinner(match.id, match.teamAId)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-1 text-left
          ${match.winnerId === match.teamAId
            ? 'bg-emerald-700/40 border border-emerald-600/50 text-white'
            : hasTeams
            ? 'hover:bg-gray-800 text-gray-300 border border-transparent'
            : 'text-gray-600 cursor-default border border-transparent'
          }`}
      >
        <span className="text-base">{teamFlag(match.teamAId)}</span>
        <span className="truncate font-medium">
          {match.teamAId ? teamName(match.teamAId) : match.teamALabel}
        </span>
        {match.winnerId === match.teamAId && (
          <span className="ml-auto text-emerald-400 text-xs">W</span>
        )}
      </button>

      <div className="text-center text-gray-700 text-[10px] font-mono my-0.5">vs</div>

      {/* Team B */}
      <button
        disabled={!hasTeams}
        onClick={() => onWinner(match.id, match.teamBId)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left
          ${match.winnerId === match.teamBId
            ? 'bg-emerald-700/40 border border-emerald-600/50 text-white'
            : hasTeams
            ? 'hover:bg-gray-800 text-gray-300 border border-transparent'
            : 'text-gray-600 cursor-default border border-transparent'
          }`}
      >
        <span className="text-base">{teamFlag(match.teamBId)}</span>
        <span className="truncate font-medium">
          {match.teamBId ? teamName(match.teamBId) : match.teamBLabel}
        </span>
        {match.winnerId === match.teamBId && (
          <span className="ml-auto text-emerald-400 text-xs">W</span>
        )}
      </button>
    </div>
  )
}

// ─── Third-placed assignment UI ───────────────────────────────────────────────

function ThirdPlacedSection({
  thirds,
  thirdAssignments,
  onAssign,
}: {
  thirds: Array<{ teamId: string; group: string; pts: number; gd: number; gf: number }>
  thirdAssignments: Record<string, string | null>
  onAssign: (slot: string, teamId: string | null) => void
}) {
  const slots = ['R32_13_A', 'R32_13_B', 'R32_14_A', 'R32_14_B', 'R32_15_A', 'R32_15_B', 'R32_16_A', 'R32_16_B']
  const usedTeams = new Set(Object.values(thirdAssignments).filter(Boolean) as string[])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-yellow-400">8 beste Drittplatzierte</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Die 8 besten Drittplatzierten (nach Pkt / TD / Tore) kommen weiter.
          Weise sie den 4 Achtelfinal-Slots (AF13–AF16) zu.
        </p>
      </div>

      {/* Ranking of thirds */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {thirds.slice(0, 12).map((t, i) => {
          const team = TEAM_BY_ID[t.teamId]
          const qualified = i < 8
          const alreadyAssigned = usedTeams.has(t.teamId)
          return (
            <div
              key={t.teamId}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border
                ${qualified ? 'border-yellow-700/40 bg-yellow-900/10' : 'border-gray-800 opacity-40'}
                ${alreadyAssigned ? 'opacity-50' : ''}
              `}
            >
              <span className="text-gray-500 w-4">{i + 1}.</span>
              <span>{team?.flag}</span>
              <span className="text-gray-200 truncate">{team?.name}</span>
              <span className="ml-auto text-gray-500 font-mono">{t.pts}P</span>
            </div>
          )
        })}
      </div>

      {/* Manual assignment dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {['R32_13', 'R32_14', 'R32_15', 'R32_16'].map(matchId => {
          const slotA = `${matchId}_A`
          const slotB = `${matchId}_B`
          const afNum = { R32_13: 13, R32_14: 14, R32_15: 15, R32_16: 16 }[matchId]
          return (
            <div key={matchId} className="space-y-1">
              <div className="text-[10px] text-gray-500 font-bold">AF{afNum}</div>
              <select
                value={thirdAssignments[slotA] ?? ''}
                onChange={e => onAssign(slotA, e.target.value || null)}
                className="w-full bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded px-1 py-1 focus:outline-none focus:border-emerald-600"
              >
                <option value="">Team A wählen…</option>
                {thirds.slice(0, 8).map(t => {
                  const team = TEAM_BY_ID[t.teamId]
                  const disabled = usedTeams.has(t.teamId) && thirdAssignments[slotA] !== t.teamId
                  return (
                    <option key={t.teamId} value={t.teamId} disabled={disabled}>
                      {team?.flag} {team?.name} (Gr.{t.group})
                    </option>
                  )
                })}
              </select>
              <select
                value={thirdAssignments[slotB] ?? ''}
                onChange={e => onAssign(slotB, e.target.value || null)}
                className="w-full bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded px-1 py-1 focus:outline-none focus:border-emerald-600"
              >
                <option value="">Team B wählen…</option>
                {thirds.slice(0, 8).map(t => {
                  const team = TEAM_BY_ID[t.teamId]
                  const disabled = usedTeams.has(t.teamId) && thirdAssignments[slotB] !== t.teamId
                  return (
                    <option key={t.teamId} value={t.teamId} disabled={disabled}>
                      {team?.flag} {team?.name} (Gr.{t.group})
                    </option>
                  )
                })}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentPage() {
  const [activeGroup, setActiveGroup] = useState<string>('A')
  const [dbResults, setDbResults] = useState<Record<string, { goals_a: number; goals_b: number }>>({})
  const [simResults, setSimResults] = useState<Record<string, SimResult>>({})
  const [koWinners, setKoWinners] = useState<Record<string, string | null>>({})
  const [thirdAssignments, setThirdAssignments] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)

  // Load real results from Supabase
  useEffect(() => {
    supabase
      .from('match_results')
      .select('match_id, goals_a, goals_b')
      .then(({ data, error }) => {
        if (!error) {
          const r: Record<string, { goals_a: number; goals_b: number }> = {}
          for (const row of data ?? []) r[row.match_id] = { goals_a: row.goals_a, goals_b: row.goals_b }
          setDbResults(r)
        }
        setLoading(false)
      })
  }, [])

  // Merge DB results + simulated results for standings calculation
  const mergedResults = useMemo(() => {
    const merged: Record<string, { goals_a: number; goals_b: number }> = { ...dbResults }
    for (const [matchId, sim] of Object.entries(simResults)) {
      merged[matchId] = { goals_a: sim.goalsA, goals_b: sim.goalsB }
    }
    return merged
  }, [dbResults, simResults])

  const standings = useMemo(() => computeGroupStandings(mergedResults), [mergedResults])

  // All 3rd-placed teams sorted by pts/gd/gf
  const allThirds = useMemo(() => {
    const thirds: Array<{ teamId: string; group: string; pts: number; gd: number; gf: number }> = []
    for (const group of GROUPS) {
      const table = standings[group]
      if (table && table[2]) {
        const t = table[2]
        thirds.push({ teamId: t.teamId, group, pts: t.pts, gd: t.gd, gf: t.gf })
      }
    }
    thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    return thirds
  }, [standings])

  // Build R32 matches with auto-filled teams from standings
  const r32Matches = useMemo((): KnockoutMatch[] => {
    return R32_SLOTS.map(slot => {
      let teamAId: string | null = null
      let teamBId: string | null = null
      let teamALabel = ''
      let teamBLabel = ''

      if (slot.grpA === '3rd') {
        const thirdIdx = slot.posA - 1
        const slotKey = `${slot.id}_A`
        teamAId = thirdAssignments[slotKey] ?? null
        teamALabel = `${thirdIdx + 1}. Drittplatzierter`
      } else {
        const table = standings[slot.grpA]
        teamAId = table?.[slot.posA - 1]?.teamId ?? null
        teamALabel = `${slot.posA}. Gruppe ${slot.grpA}`
      }

      if (slot.grpB === '3rd') {
        const thirdIdx = slot.posB - 1
        const slotKey = `${slot.id}_B`
        teamBId = thirdAssignments[slotKey] ?? null
        teamBLabel = `${thirdIdx + 1}. Drittplatzierter`
      } else {
        const table = standings[slot.grpB]
        teamBId = table?.[slot.posB - 1]?.teamId ?? null
        teamBLabel = `${slot.posB}. Gruppe ${slot.grpB}`
      }

      // Determine winner from koWinners state
      const winnerId = koWinners[slot.id] ?? null

      const afNum = parseInt(slot.id.replace('R32_', ''))
      return {
        id: slot.id,
        round: 'r32',
        label: `AF${afNum}`,
        teamAId,
        teamBId,
        teamALabel,
        teamBLabel,
        winnerId,
      }
    })
  }, [standings, koWinners, thirdAssignments])

  // Helper: get winner of a match
  function getWinner(matchId: string, allMatches: KnockoutMatch[]): string | null {
    const m = allMatches.find(x => x.id === matchId)
    return m?.winnerId ?? null
  }

  // Build R16, QF, SF, Final from winners
  const r16Matches = useMemo((): KnockoutMatch[] => {
    return R16_PAIRS.map((p, i) => {
      const teamAId = getWinner(p.fromA, r32Matches)
      const teamBId = getWinner(p.fromB, r32Matches)
      const winnerId = koWinners[p.id] ?? null
      return {
        id: p.id,
        round: 'r16',
        label: `AF${i + 1} (VF Runde)`,
        teamAId,
        teamBId,
        teamALabel: `Sieger ${p.fromA}`,
        teamBLabel: `Sieger ${p.fromB}`,
        winnerId,
        feedsFromA: p.fromA,
        feedsFromB: p.fromB,
      }
    })
  }, [r32Matches, koWinners])

  const qfMatches = useMemo((): KnockoutMatch[] => {
    return QF_PAIRS.map((p, i) => {
      const teamAId = getWinner(p.fromA, r16Matches)
      const teamBId = getWinner(p.fromB, r16Matches)
      const winnerId = koWinners[p.id] ?? null
      return {
        id: p.id,
        round: 'qf',
        label: `VF${i + 1}`,
        teamAId,
        teamBId,
        teamALabel: `Sieger ${p.fromA}`,
        teamBLabel: `Sieger ${p.fromB}`,
        winnerId,
        feedsFromA: p.fromA,
        feedsFromB: p.fromB,
      }
    })
  }, [r16Matches, koWinners])

  const sfMatches = useMemo((): KnockoutMatch[] => {
    return SF_PAIRS.map((p, i) => {
      const teamAId = getWinner(p.fromA, qfMatches)
      const teamBId = getWinner(p.fromB, qfMatches)
      const winnerId = koWinners[p.id] ?? null
      return {
        id: p.id,
        round: 'sf',
        label: `HF${i + 1}`,
        teamAId,
        teamBId,
        teamALabel: `Sieger ${p.fromA}`,
        teamBLabel: `Sieger ${p.fromB}`,
        winnerId,
        feedsFromA: p.fromA,
        feedsFromB: p.fromB,
      }
    })
  }, [qfMatches, koWinners])

  const finalMatch = useMemo((): KnockoutMatch => {
    const teamAId = getWinner('SF1', sfMatches)
    const teamBId = getWinner('SF2', sfMatches)
    const winnerId = koWinners['FINAL'] ?? null
    return {
      id: 'FINAL',
      round: 'final',
      label: 'FINALE',
      teamAId,
      teamBId,
      teamALabel: 'Sieger HF1',
      teamBLabel: 'Sieger HF2',
      winnerId,
      feedsFromA: 'SF1',
      feedsFromB: 'SF2',
    }
  }, [sfMatches, koWinners])

  // Handler: simulate group match
  function handleSimulate(matchId: string, result: SimResult | null) {
    if (result === null) {
      setSimResults(prev => {
        const next = { ...prev }
        delete next[matchId]
        return next
      })
    } else {
      setSimResults(prev => ({ ...prev, [matchId]: result }))
      // Clear downstream KO picks when group results change
      setKoWinners({})
    }
  }

  // Handler: set KO winner
  function handleKoWinner(matchId: string, winnerId: string | null) {
    setKoWinners(prev => {
      const next = { ...prev, [matchId]: winnerId }
      // Clear downstream matches that depended on this one
      clearDownstream(matchId, next)
      return next
    })
  }

  function clearDownstream(changedId: string, state: Record<string, string | null>) {
    const dependents: Record<string, string[]> = {
      R32_1: ['R16_1'], R32_2: ['R16_1'],
      R32_3: ['R16_2'], R32_4: ['R16_2'],
      R32_5: ['R16_3'], R32_6: ['R16_3'],
      R32_7: ['R16_4'], R32_8: ['R16_4'],
      R32_9: ['R16_5'], R32_10: ['R16_5'],
      R32_11: ['R16_6'], R32_12: ['R16_6'],
      R32_13: ['R16_7'], R32_14: ['R16_7'],
      R32_15: ['R16_8'], R32_16: ['R16_8'],
      R16_1: ['QF1'], R16_2: ['QF1'],
      R16_3: ['QF2'], R16_4: ['QF2'],
      R16_5: ['QF3'], R16_6: ['QF3'],
      R16_7: ['QF4'], R16_8: ['QF4'],
      QF1: ['SF1'], QF2: ['SF1'],
      QF3: ['SF2'], QF4: ['SF2'],
      SF1: ['FINAL'], SF2: ['FINAL'],
    }
    const toReset = dependents[changedId] ?? []
    for (const d of toReset) {
      if (state[d] !== undefined) {
        delete state[d]
        clearDownstream(d, state)
      }
    }
  }

  function handleThirdAssign(slot: string, teamId: string | null) {
    setThirdAssignments(prev => ({ ...prev, [slot]: teamId }))
    // Clear KO picks for 3rd-place slots
    setKoWinners(prev => {
      const next = { ...prev }
      delete next['R32_13']
      delete next['R32_14']
      delete next['R32_15']
      delete next['R32_16']
      return next
    })
  }

  function handleReset() {
    setSimResults({})
    setKoWinners({})
    setThirdAssignments({})
  }

  const simulatedCount = Object.keys(simResults).length

  // Champion display
  const champion = finalMatch.winnerId ? TEAM_BY_ID[finalMatch.winnerId] : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Turnierrechner</h1>
          <p className="text-gray-500 text-sm mt-1">
            Simuliere Ergebnisse und berechne das Knockout-Tableau
          </p>
        </div>
        <div className="flex items-center gap-3">
          {simulatedCount > 0 && (
            <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
              {simulatedCount} simuliert
            </span>
          )}
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 border border-gray-800 rounded-lg"
          >
            Alles zurücksetzen
          </button>
        </div>
      </div>

      {/* Champion banner */}
      {champion && (
        <div className="bg-gradient-to-r from-yellow-900/40 to-yellow-700/20 border border-yellow-600/40 rounded-xl p-4 flex items-center gap-4">
          <span className="text-4xl">{champion.flag}</span>
          <div>
            <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider">Simulierter Weltmeister</div>
            <div className="text-2xl font-bold text-white">{champion.name}</div>
          </div>
          <span className="text-3xl ml-auto">🏆</span>
        </div>
      )}

      {/* ── Gruppenphase ── */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-emerald-400">1.</span> Gruppenphase
          {loading && <span className="text-xs text-gray-500 font-normal animate-pulse">Lade Ergebnisse…</span>}
        </h2>

        {/* Group tabs */}
        <div className="flex gap-1 flex-wrap mb-4">
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeGroup === g
                  ? 'bg-emerald-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Gr. {g}
            </button>
          ))}
        </div>

        {/* Active group panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-bold text-emerald-400 mb-3">Gruppe {activeGroup}</div>
          <GroupPanel
            key={activeGroup}
            group={activeGroup}
            standings={standings[activeGroup] ?? []}
            simResults={simResults}
            onSimulate={handleSimulate}
          />
        </div>
      </section>

      {/* ── Drittplatzierte ── */}
      <section>
        <h2 className="text-lg font-bold mb-4">
          <span className="text-emerald-400">2.</span> Drittplatzierte zuordnen
        </h2>
        <ThirdPlacedSection
          thirds={allThirds}
          thirdAssignments={thirdAssignments}
          onAssign={handleThirdAssign}
        />
      </section>

      {/* ── Knockout Tableau ── */}
      <section>
        <h2 className="text-lg font-bold mb-4">
          <span className="text-emerald-400">3.</span> Knockout-Tableau
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Klicke auf ein Team, um es als Sieger zu markieren. Das nächste Spiel wird automatisch befüllt.
        </p>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6" style={{ minWidth: '900px' }}>
            {/* Round of 32 */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">
                Achtelfinale (R32)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {r32Matches.map(m => (
                  <KOMatchCard key={m.id} match={m} onWinner={handleKoWinner} />
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center text-gray-700 text-2xl shrink-0 self-center">›</div>

            {/* Round of 16 */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">
                Runde 16 (Achtelf.)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {r16Matches.map(m => (
                  <KOMatchCard key={m.id} match={m} onWinner={handleKoWinner} />
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center text-gray-700 text-2xl shrink-0 self-center">›</div>

            {/* Quarterfinal */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">
                Viertelfinale
              </div>
              <div className="flex flex-col gap-2">
                {qfMatches.map(m => (
                  <KOMatchCard key={m.id} match={m} onWinner={handleKoWinner} />
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center text-gray-700 text-2xl shrink-0 self-center">›</div>

            {/* Semifinal */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">
                Halbfinale
              </div>
              <div className="flex flex-col gap-2 justify-center h-full">
                {sfMatches.map(m => (
                  <KOMatchCard key={m.id} match={m} onWinner={handleKoWinner} />
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center text-gray-700 text-2xl shrink-0 self-center">›</div>

            {/* Final */}
            <div className="flex flex-col gap-2 shrink-0 justify-center">
              <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1 text-center">
                🏆 Finale
              </div>
              <KOMatchCard match={finalMatch} onWinner={handleKoWinner} />
              {finalMatch.winnerId && (
                <div className="text-center">
                  <span className="text-xl">{teamFlag(finalMatch.winnerId)}</span>
                  <div className="text-xs text-yellow-400 font-bold mt-1">{teamName(finalMatch.winnerId)}</div>
                  <div className="text-[10px] text-gray-500">Weltmeister 2026</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
