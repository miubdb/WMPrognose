export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import { ALL_TEAMS } from '@/src/data/allTeams'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const teamMap = Object.fromEntries(ALL_TEAMS.map(t => [t.id, { name: t.name, flag: t.flag }]))

const POS_LABEL: Record<string, string> = { GK: 'Tor', DEF: 'Abwehr', MID: 'Mittelfeld', FWD: 'Sturm' }
const POS_ICON:  Record<string, string> = { GK: '🧤', DEF: '🛡️', MID: '⚙️', FWD: '⚡' }
const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'] as const

function ratingBg(r: number): string {
  if (r >= 9.0) return 'bg-emerald-500/20 text-emerald-300 border-emerald-600/40'
  if (r >= 8.0) return 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40'
  if (r >= 7.0) return 'bg-blue-900/30 text-blue-300 border-blue-700/40'
  if (r >= 6.5) return 'bg-gray-800 text-gray-300 border-gray-700'
  if (r >= 6.0) return 'bg-yellow-900/20 text-yellow-400 border-yellow-700/40'
  return 'bg-rose-900/20 text-rose-400 border-rose-700/40'
}

function RatingBadge({ r }: { r: number | null }) {
  if (!r) return <span className="text-gray-600 text-xs">–</span>
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-bold border ${ratingBg(r)}`}>
      {r.toFixed(1)}
    </span>
  )
}

type Player = {
  name: string
  team_id: string
  position: string | null
  jersey_number: number | null
  goals: number
  assists: number
  sofascore_rating: number | null
  is_in_starting_xi: boolean | null
  yellow_cards: number
  red_cards: number
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  // Fetch all players that have any stat data
  const { data: raw } = await supabase
    .from('players')
    .select('name, team_id, position, jersey_number, goals, assists, sofascore_rating, is_in_starting_xi, yellow_cards, red_cards')

  const players: Player[] = (raw ?? []).map(p => ({
    ...p,
    goals: p.goals ?? 0,
    assists: p.assists ?? 0,
    yellow_cards: p.yellow_cards ?? 0,
    red_cards: p.red_cards ?? 0,
    sofascore_rating: p.sofascore_rating != null ? Number(p.sofascore_rating) : null,
  }))

  // ── Top Scorers ────────────────────────────────────────────────────────────
  const topScorers = players
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || (b.sofascore_rating ?? 0) - (a.sofascore_rating ?? 0))
    .slice(0, 20)

  // ── Top Assists ────────────────────────────────────────────────────────────
  const topAssists = players
    .filter(p => p.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || (b.sofascore_rating ?? 0) - (a.sofascore_rating ?? 0))
    .slice(0, 10)

  // ── Per-position ratings (starters only) ──────────────────────────────────
  const starters = players.filter(p => p.is_in_starting_xi && p.sofascore_rating !== null)

  const byPos: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const p of starters) {
    if (p.position && byPos[p.position]) byPos[p.position].push(p)
  }
  for (const pos of POSITIONS) {
    byPos[pos].sort((a, b) => (b.sofascore_rating ?? 0) - (a.sofascore_rating ?? 0))
  }

  // ── Yellow Cards ───────────────────────────────────────────────────────────
  const yellowLeaders = players
    .filter(p => p.yellow_cards > 0)
    .sort((a, b) => b.yellow_cards - a.yellow_cards || (b.sofascore_rating ?? 0) - (a.sofascore_rating ?? 0))
    .slice(0, 10)

  // ── Counts ─────────────────────────────────────────────────────────────────
  const totalGoals  = players.reduce((s, p) => s + p.goals, 0)
  const totalAssists = players.reduce((s, p) => s + p.assists, 0)
  const ratedCount  = players.filter(p => p.sofascore_rating !== null).length
  const matchCount  = new Set(
    players.filter(p => p.sofascore_rating !== null && p.team_id)
      // rough: 2 teams per match → count unique pairings is hard, just count rated teams / 2
  )

  return (
    <div className="space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">WM 2026 Statistiken</h1>
        <p className="text-gray-500 text-sm mt-1">
          Torjäger · Vorlagenassisten · Beste & schlechteste Noten · Karten
        </p>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Tore gesamt', value: totalGoals },
          { label: 'Vorlagen gesamt', value: totalAssists },
          { label: 'Bewertete Spieler', value: ratedCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Torschützenkönig ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          ⚽ Torjäger
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium w-8">#</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Spieler</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium hidden sm:table-cell">Pos.</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">⚽</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">👟</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {topScorers.map((p, i) => {
                const team = teamMap[p.team_id]
                const prevGoals = topScorers[i - 1]?.goals
                const rank = prevGoals === p.goals ? '·' : i + 1
                return (
                  <tr key={`${p.team_id}-${p.name}`} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                    <td className="px-3 py-2 text-gray-600 text-xs font-mono">{rank}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{team?.flag ?? '🏳️'}</span>
                        <span className="font-medium text-white">{p.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 sm:hidden">{p.position ?? '–'}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs hidden sm:table-cell">{p.position ?? '–'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold text-white">{p.goals}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-400">{p.assists || '–'}</td>
                    <td className="px-3 py-2 text-center"><RatingBadge r={p.sofascore_rating} /></td>
                  </tr>
                )
              })}
              {topScorers.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-600 text-sm">Noch keine Torschützen erfasst</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Vorlagenassisten ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          👟 Vorlagenassisten
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium w-8">#</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Spieler</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium hidden sm:table-cell">Pos.</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">👟</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">⚽</th>
                <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {topAssists.map((p, i) => {
                const team = teamMap[p.team_id]
                const prevA = topAssists[i - 1]?.assists
                const rank = prevA === p.assists ? '·' : i + 1
                return (
                  <tr key={`${p.team_id}-${p.name}`} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                    <td className="px-3 py-2 text-gray-600 text-xs font-mono">{rank}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{team?.flag ?? '🏳️'}</span>
                        <span className="font-medium text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs hidden sm:table-cell">{p.position ?? '–'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold text-white">{p.assists}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-400">{p.goals || '–'}</td>
                    <td className="px-3 py-2 text-center"><RatingBadge r={p.sofascore_rating} /></td>
                  </tr>
                )
              })}
              {topAssists.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-600 text-sm">Noch keine Vorlagen erfasst</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Beste Note je Position ────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          🏅 Beste Noten je Position (Startspieler)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {POSITIONS.map(pos => {
            const group = byPos[pos]
            const top = group.slice(0, 5)
            return (
              <div key={pos} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
                  <span>{POS_ICON[pos]}</span>
                  <span className="text-xs font-semibold text-gray-300">{POS_LABEL[pos]}</span>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {top.map((p, i) => {
                    const team = teamMap[p.team_id]
                    const medals = ['🥇', '🥈', '🥉', '4.', '5.']
                    return (
                      <div key={`${p.team_id}-${p.name}`} className="px-3 py-2 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs w-5 shrink-0">{medals[i] ?? `${i+1}.`}</span>
                          <span className="text-xs">{team?.flag ?? ''}</span>
                          <span className="text-xs text-gray-200 truncate">{p.name}</span>
                        </div>
                        <RatingBadge r={p.sofascore_rating} />
                      </div>
                    )
                  })}
                  {top.length === 0 && (
                    <div className="px-3 py-3 text-xs text-gray-600 text-center">Keine Daten</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Schlechteste Note je Position ─────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          📉 Schlechteste Noten je Position (Startspieler)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {POSITIONS.map(pos => {
            const group = [...byPos[pos]].reverse().slice(0, 5)
            return (
              <div key={pos} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
                  <span>{POS_ICON[pos]}</span>
                  <span className="text-xs font-semibold text-gray-300">{POS_LABEL[pos]}</span>
                </div>
                <div className="divide-y divide-gray-800/50">
                  {group.map((p, i) => {
                    const team = teamMap[p.team_id]
                    return (
                      <div key={`${p.team_id}-${p.name}`} className="px-3 py-2 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs w-5 text-gray-600 shrink-0">{i + 1}.</span>
                          <span className="text-xs">{team?.flag ?? ''}</span>
                          <span className="text-xs text-gray-400 truncate">{p.name}</span>
                        </div>
                        <RatingBadge r={p.sofascore_rating} />
                      </div>
                    )
                  })}
                  {group.length === 0 && (
                    <div className="px-3 py-3 text-xs text-gray-600 text-center">Keine Daten</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Gelbe Karten ─────────────────────────────────────────────────── */}
      {yellowLeaders.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            🟨 Gelbe Karten
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Spieler</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium hidden sm:table-cell">Pos.</th>
                  <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">🟨</th>
                  <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">🟥</th>
                </tr>
              </thead>
              <tbody>
                {yellowLeaders.map((p) => {
                  const team = teamMap[p.team_id]
                  return (
                    <tr key={`${p.team_id}-${p.name}`} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span>{team?.flag ?? '🏳️'}</span>
                          <span className="font-medium text-white">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs hidden sm:table-cell">{p.position ?? '–'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-bold ${p.yellow_cards >= 2 ? 'text-yellow-300' : 'text-yellow-500'}`}>
                          {p.yellow_cards}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.red_cards > 0
                          ? <span className="font-bold text-rose-400">{p.red_cards}</span>
                          : <span className="text-gray-700">–</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Footer note */}
      <p className="text-xs text-gray-600 pb-4">
        Noten = zuletzt erfasste Sofascore-Note (letztes Spiel des Spielers). Tore & Vorlagen = Turnier-Gesamtwerte.
        Positionsnoten nur für Startspieler (is_in_starting_xi).
      </p>
    </div>
  )
}
