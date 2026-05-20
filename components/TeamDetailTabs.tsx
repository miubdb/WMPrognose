'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TeamBasic } from '@/src/data/allTeams'
import { Player } from '@/src/data/players'
import { ScheduledMatch } from '@/src/data/schedule'

interface TeamDetailTabsProps {
  team: TeamBasic
  players: Player[]
  groupMatches: ScheduledMatch[]
  opponentMap: Record<string, TeamBasic>
}

type TabKey = 'overview' | 'squad' | 'ratings' | 'matches' | 'dataQuality'
type PosFilter = 'all' | 'GK' | 'DEF' | 'MID' | 'FWD'
type SortKey = 'rating' | 'value' | 'age'

const TOP_CONTENDERS: Record<string, number> = {
  brazil: 18,
  france: 15,
  england: 12,
  germany: 11,
  argentina: 10,
  spain: 9,
  portugal: 7,
  netherlands: 5,
}

const RATINGS = [
  { label: 'Overall',    key: 'overallRating' as const,    color: 'bg-emerald-500' },
  { label: 'Angriff',    key: 'attackRating' as const,     color: 'bg-rose-500'    },
  { label: 'Mittelfeld', key: 'midfieldRating' as const,   color: 'bg-blue-500'    },
  { label: 'Abwehr',     key: 'defenseRating' as const,    color: 'bg-cyan-500'    },
  { label: 'Torwart',    key: 'goalkeeperRating' as const, color: 'bg-yellow-500'  },
  { label: 'Standards',  key: 'setPieceRating' as const,   color: 'bg-purple-500'  },
]

export default function TeamDetailTabs({ team, players, groupMatches, opponentMap }: TeamDetailTabsProps) {
  const [tab, setTab] = useState<TabKey>('overview')

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-800 overflow-x-auto">
        {(
          [
            { key: 'overview', label: 'Übersicht' },
            { key: 'squad',    label: 'Kader'     },
            { key: 'ratings', label: 'Ratings' },
            { key: 'matches', label: 'Spiele' },
            { key: 'dataQuality', label: 'Datenqualität' },
          ] as { key: TabKey; label: string }[]
        ).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab team={team} groupMatches={groupMatches} opponentMap={opponentMap} />
      )}
      {tab === 'squad' && (
        <SquadTab team={team} players={players} />
      )}
      {tab === 'ratings' && (
        <RatingsTab team={team} />
      )}
      {tab === 'matches' && (
        <MatchesTab team={team} groupMatches={groupMatches} opponentMap={opponentMap} />
      )}
      {tab === 'dataQuality' && (
        <DataQualityTab players={players} />
      )}
    </div>
  )
}

// ─── Tab: Übersicht ────────────────────────────────────────────────────────────

function OverviewTab({
  team,
  groupMatches,
  opponentMap,
}: {
  team: TeamBasic
  groupMatches: ScheduledMatch[]
  opponentMap: Record<string, TeamBasic>
}) {
  const championPct = TOP_CONTENDERS[team.id]

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start gap-5">
          <span className="text-6xl">{team.flag}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-400">
              <span>Gruppe {team.group}</span>
              <span className="text-gray-700">·</span>
              <span>{team.confederation}</span>
              <span className="text-gray-700">·</span>
              <span>{team.coach}</span>
            </div>

            {/* WM Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {team.worldCupTitles > 0 && (
                <span className="bg-yellow-900/40 text-yellow-400 border border-yellow-700/50 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {'🏆 '.repeat(team.worldCupTitles).trim()} {team.worldCupTitles}× Weltmeister
                </span>
              )}
              <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-0.5 rounded-full">
                {team.worldCupAppearances}× WM-Teilnahme
              </span>
              {championPct && (
                <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Titelchance ~{championPct}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating bars */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Stärke-Ratings</h2>
        <div className="space-y-3">
          {RATINGS.map(({ label, key, color }) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{label}</span>
                <span className="font-mono text-gray-200">
                  {team[key]}<span className="text-gray-600">/100</span>
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full`}
                  style={{ width: `${team[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group matches */}
      {groupMatches.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">Gruppenspiele</h2>
          <div className="space-y-2">
            {groupMatches.map(m => {
              const isA = m.teamAId === team.id
              const oppId = isA ? m.teamBId : m.teamAId
              const opp = opponentMap[oppId]
              if (!opp) return null
              return (
                <div key={m.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                  <span className="text-xl">{opp.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{opp.name}</div>
                    <div className="text-xs text-gray-500">{m.date} · Spieltag {m.matchday}</div>
                  </div>
                  <Link
                    href={`/matches/${m.id}`}
                    className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Prognose →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Kader ────────────────────────────────────────────────────────────────

function SquadTab({ team, players }: { team: TeamBasic; players: Player[] }) {
  const [posFilter, setPosFilter] = useState<PosFilter>('all')
  const [sort, setSort] = useState<SortKey>('rating')

  const filtered = players
    .filter(p => posFilter === 'all' || p.position === posFilter)
    .sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'value')  return b.marketValueM - a.marketValueM
      return a.age - b.age
    })

  const starters = players.filter(p => p.isInStartingXI)
  const avgAge = starters.length > 0
    ? (starters.reduce((s, p) => s + p.age, 0) / starters.length).toFixed(1)
    : '–'
  const totalValue = players.reduce((s, p) => s + p.marketValueM, 0)
  const peakAgeCount = starters.filter(p => p.age >= 27 && p.age <= 29).length
  const peakAgePct = starters.length > 0 ? Math.round((peakAgeCount / starters.length) * 100) : 0
  const top3 = [...players].sort((a, b) => b.rating - a.rating).slice(0, 3)
  const completeCount = players.filter(p => p.clubTeam && p.age && p.marketValueM > 0).length

  return (
    <div className="space-y-4">
      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-1">
          {(['all', 'GK', 'DEF', 'MID', 'FWD'] as PosFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setPosFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                posFilter === f ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'Alle' : f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([
            { k: 'rating', l: 'Rating ↓' },
            { k: 'value',  l: 'Wert ↓'   },
            { k: 'age',    l: 'Alter ↑'  },
          ] as { k: SortKey; l: string }[]).map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                sort === k ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Player table */}
      {players.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">Keine Spielerdaten für {team.name} vorhanden.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-center">Pos</th>
                  <th className="px-3 py-2 text-center">Alter</th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">Verein</th>
                  <th className="px-3 py-2 text-right">Wert</th>
                  <th className="px-3 py-2 text-right">Rtg</th>
                  <th className="px-3 py-2 text-center">XI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(p => (
                  <tr key={p.id} className={`${p.isInStartingXI ? 'bg-emerald-950/20' : ''} hover:bg-gray-800/40 transition-colors`}>
                    <td className="px-3 py-2 text-gray-600">{p.jerseyNumber ?? '–'}</td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.position === 'GK'  ? 'bg-yellow-900/40 text-yellow-400' :
                        p.position === 'DEF' ? 'bg-emerald-900/40 text-emerald-400' :
                        p.position === 'MID' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-rose-900/40 text-rose-400'
                      }`}>{p.position}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-300">{p.age}</td>
                    <td className="px-3 py-2 text-gray-400 hidden sm:table-cell truncate max-w-[140px]">{p.clubTeam ?? '–'}</td>
                    <td className="px-3 py-2 text-right text-gray-300">€{p.marketValueM}M</td>
                    <td className={`px-3 py-2 text-right font-mono font-medium ${
                      p.rating >= 85 ? 'text-emerald-400' :
                      p.rating >= 75 ? 'text-blue-400' : 'text-gray-400'
                    }`}>{p.rating}</td>
                    <td className="px-3 py-2 text-center">
                      {p.isInStartingXI ? (
                        <span className="text-emerald-500 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-700">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kader-Analyse */}
      {players.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Kader-Analyse</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Ø Alter Startelf</div>
              <div className="font-mono font-bold">{avgAge}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Gesamtmarktwert</div>
              <div className="font-mono font-bold text-emerald-400">€{totalValue}M</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Peak-Age (27-29)</div>
              <div className="font-mono font-bold">{peakAgePct}%</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Datenvollst.</div>
              <div className="font-mono font-bold">{completeCount}/{players.length}</div>
            </div>
          </div>
          {top3.length > 0 && (
            <div>
              <div className="text-gray-500 text-xs mb-1">Top 3 Spieler (Rating)</div>
              <div className="flex flex-wrap gap-2">
                {top3.map((p, i) => (
                  <span key={p.id} className="text-xs bg-gray-800 px-2 py-1 rounded-lg">
                    <span className="text-gray-500 mr-1">#{i + 1}</span>
                    <span>{p.name}</span>
                    <span className="text-emerald-400 ml-1 font-mono">{p.rating}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Spiele ───────────────────────────────────────────────────────────────

function MatchesTab({
  team,
  groupMatches,
  opponentMap,
}: {
  team: TeamBasic
  groupMatches: ScheduledMatch[]
  opponentMap: Record<string, TeamBasic>
}) {
  if (groupMatches.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
        Keine Gruppenspiele gefunden.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groupMatches.map(m => {
        const isA = m.teamAId === team.id
        const oppId = isA ? m.teamBId : m.teamAId
        const opp = opponentMap[oppId]

        return (
          <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{opp?.flag ?? '🏳'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{opp?.name ?? oppId}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {m.date} · {m.kickoffUTC} UTC
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Gruppe {m.group} · Spieltag {m.matchday}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Link
                href={`/matches/${m.id}`}
                className="flex-1 text-center text-xs bg-emerald-700 hover:bg-emerald-600 text-white py-2 rounded-lg transition-colors"
              >
                Prognose →
              </Link>
              <Link
                href={`/matches/${m.id}?tab=lineup`}
                className="flex-1 text-center text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg transition-colors"
              >
                Startelf bearbeiten →
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Ratings ─────────────────────────────────────────────────────────────

function RatingsTab({ team }: { team: TeamBasic }) {
  const rows = [
    { label: 'Overall', value: team.overallRating, color: 'bg-emerald-500' },
    { label: 'Angriff', value: team.attackRating, color: 'bg-rose-500' },
    { label: 'Mittelfeld', value: team.midfieldRating, color: 'bg-blue-500' },
    { label: 'Abwehr', value: team.defenseRating, color: 'bg-cyan-500' },
    { label: 'Torwart', value: team.goalkeeperRating, color: 'bg-yellow-500' },
    { label: 'Standards', value: team.setPieceRating, color: 'bg-purple-500' },
  ]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-sm">Team-Ratings</h3>
      {rows.map(r => (
        <div key={r.label}>
          <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{r.label}</span><span className="font-mono">{r.value}/100</span></div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${r.color}`} style={{ width: `${r.value}%` }} /></div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800 text-xs">
        <div><span className="text-gray-500">ELO</span><div className="font-mono text-emerald-400">{team.eloRating}</div></div>
        <div><span className="text-gray-500">Kaderwert</span><div className="font-mono">€{team.squadMarketValueM}M</div></div>
      </div>
    </div>
  )
}

function DataQualityTab({ players }: { players: Player[] }) {
  const total = players.length
  const withClub = players.filter(p => Boolean(p.clubTeam)).length
  const withXg = players.filter(p => p.xGPer90 != null).length
  const withRating = players.filter(p => p.rating > 0).length

  const quality = total === 0 ? 0 : Math.round(((withClub + withXg + withRating) / (total * 3)) * 100)

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3">Datenqualität für dieses Team</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><div className="text-gray-500 text-xs">Spieler im Pool</div><div className="font-mono font-bold">{total}</div></div>
          <div><div className="text-gray-500 text-xs">Mit Vereinsdaten</div><div className="font-mono font-bold">{withClub}</div></div>
          <div><div className="text-gray-500 text-xs">Mit xG/90</div><div className="font-mono font-bold">{withXg}</div></div>
          <div><div className="text-gray-500 text-xs">Mit Rating</div><div className="font-mono font-bold">{withRating}</div></div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Vollständigkeit</span><span>{quality}%</span></div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${quality}%` }} /></div>
        </div>
      </div>
      <p className="text-xs text-gray-500">Hinweis: Startelf ist in Sprint 1 bewusst nicht Teil der Teamdaten-Ansicht. Die Auswahl erfolgt auf Spiel-Ebene.</p>
    </div>
  )
}
