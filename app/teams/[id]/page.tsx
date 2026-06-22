import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TEAM_BY_ID } from '@/src/data/allTeams'
import { supabase } from '@/lib/supabase'
import { computeDataQuality } from '@/lib/model/dataQuality'
import { DeleteButton } from './DeleteButton'

export const dynamic = 'force-dynamic'

const POS_LABELS: Record<string, string> = { GK: 'Tor', DEF: 'Abwehr', MID: 'Mittelfeld', FWD: 'Sturm' }
const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD']

const BADGE_STYLE = {
  Hoch:    'bg-emerald-900/40 text-emerald-400 border-emerald-800/60',
  Mittel:  'bg-yellow-900/40 text-yellow-400 border-yellow-800/60',
  Niedrig: 'bg-rose-900/40 text-rose-400 border-rose-800/60',
}

export default async function TeamPage({ params }: { params: { id: string } }) {
  const team = TEAM_BY_ID[params.id]
  if (!team) notFound()

  const [playerRes, eloRes] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, position, jersey_number, age, club_team, market_value_m, rating, xg_per90, xga_per90, is_in_starting_xi, goals, assists, yellow_cards, red_cards, sofascore_rating, suspended')
      .eq('team_id', params.id)
      .order('position')
      .order('market_value_m', { ascending: false }),
    supabase
      .from('team_elo_ratings')
      .select('elo_rating, elo_delta_1y, source')
      .eq('team_id', params.id)
      .maybeSingle(),
  ])

  const players = playerRes.data ?? []
  const eloRow = eloRes.data

  // Fetch appearances for these players (sequential — needs player IDs first)
  const playerIds = players.map(p => p.id)
  const appearancesByPlayer: Record<string, { games: number; totalMinutes: number; ratingSum: number; ratingCount: number }> = {}
  if (playerIds.length > 0) {
    const { data: appRows } = await supabase
      .from('game_appearances')
      .select('player_id, minutes_played, sofascore_rating')
      .in('player_id', playerIds)
    for (const a of appRows ?? []) {
      if (!appearancesByPlayer[a.player_id]) {
        appearancesByPlayer[a.player_id] = { games: 0, totalMinutes: 0, ratingSum: 0, ratingCount: 0 }
      }
      const entry = appearancesByPlayer[a.player_id]
      entry.games++
      entry.totalMinutes += a.minutes_played ?? 0
      if (a.sofascore_rating != null) { entry.ratingSum += Number(a.sofascore_rating); entry.ratingCount++ }
    }
  }
  const eloSource = eloRow?.source ?? null
  const liveElo = eloRow ? eloRow.elo_rating + Math.round((eloRow.elo_delta_1y ?? 0) * 0.2) : null

  const byPos = POS_ORDER.reduce((acc, pos) => {
    acc[pos] = players.filter(p => p.position === pos)
    return acc
  }, {} as Record<string, typeof players>)

  const totalValue = players.reduce((s, p) => s + (p.market_value_m ?? 0), 0)
  const startingCount = players.filter(p => p.is_in_starting_xi).length

  const dq = computeDataQuality(
    players.map(p => ({
      market_value_m: p.market_value_m,
      xg_per90: p.xg_per90,
      is_in_starting_xi: p.is_in_starting_xi,
      age: p.age,
      rating: p.rating,
    })),
    eloSource
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/teams" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Alle Teams
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <span className="text-6xl flex-shrink-0">{team.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{team.name}</h1>
              {/* DataQuality Badge */}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${BADGE_STYLE[dq.badge]}`}>
                {dq.score}/100 · {dq.badge}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-sm text-gray-400 flex-wrap">
              <span>Gruppe {team.group}</span>
              <span>·</span>
              <span>ELO {liveElo ?? team.eloRating}{liveElo ? ' (aktuell)' : ' (Fallback)'}</span>
              <span>·</span>
              <span>{team.confederation}</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">
              Kader-Marktwert: {Math.round(totalValue)}M€ · {players.length} Spieler · Startelf: {startingCount}/11
            </div>
          </div>
        </div>

        {/* DataQuality details */}
        {players.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DQItem
              label="ELO"
              ok={dq.eloFreshness >= 0.7}
              warn={dq.eloFreshness >= 0.5}
              text={dq.eloFreshness >= 0.7 ? 'Aktuell' : dq.eloFreshness >= 0.5 ? 'Fallback' : 'Fehlend'}
            />
            <DQItem
              label="xG-Daten"
              ok={dq.xgCoverage >= 0.5}
              warn={dq.xgCoverage > 0}
              text={dq.xgCoverage >= 0.5 ? `${Math.round(dq.xgCoverage * 100)}% abgedeckt` : dq.xgCoverage > 0 ? `Nur ${Math.round(dq.xgCoverage * 100)}%` : 'Fehlend'}
            />
            <DQItem
              label="Marktwerte"
              ok={dq.completeness >= 0.7}
              warn={dq.completeness >= 0.4}
              text={`${Math.round(dq.completeness * 100)}% vollständig`}
            />
            <DQItem
              label="Startelf"
              ok={dq.lineupSet}
              warn={false}
              text={dq.lineupSet ? `${startingCount}/11 eingetragen` : 'Nicht eingetragen'}
            />
          </div>
        )}

        {dq.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {dq.warnings.map((w, i) => (
              <div key={i} className="text-xs text-yellow-600 flex items-start gap-1.5">
                <span className="flex-shrink-0">⚠</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Too many players warning */}
      {players.length > 26 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-sm text-amber-400">
          ⚠ {players.length} Spieler – der finale Kader hat 26 Plätze. Bitte entfernen bis 26 verbleiben.
        </div>
      )}

      {/* Squad */}
      {players.length > 0 ? (
        <div className="space-y-4">
          {POS_ORDER.map(pos => {
            const group = byPos[pos] ?? []
            if (group.length === 0) return null
            return (
              <div key={pos} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-800/40 border-b border-gray-800">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{POS_LABELS[pos]}</span>
                  <span className="text-xs text-gray-600 ml-2">{group.length} Spieler</span>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {group.map((p) => {
                    const hasTournamentStats = (p.goals ?? 0) > 0 || (p.assists ?? 0) > 0 || (p.yellow_cards ?? 0) > 0 || (p.red_cards ?? 0) > 0
                    const app = appearancesByPlayer[p.id]
                    const avgRating = app && app.ratingCount > 0 ? app.ratingSum / app.ratingCount : null
                    return (
                    <div key={p.id} className={`px-4 py-2.5 ${p.is_in_starting_xi ? 'bg-emerald-950/10' : ''} ${p.suspended ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 font-mono w-5 text-right flex-shrink-0">
                          {p.jersey_number ?? '–'}
                        </span>
                        <span className="flex-1 text-sm text-gray-200 min-w-0 truncate">
                          {p.name}
                          {p.suspended && <span className="ml-1.5 text-[10px] text-red-400 font-bold">GESPERRT</span>}
                        </span>
                        {p.is_in_starting_xi && (
                          <span className="text-[10px] text-emerald-600 font-medium flex-shrink-0">XI</span>
                        )}
                        {app && app.games > 0 && (
                          <span className="text-[10px] text-gray-500 flex-shrink-0" title={`${app.totalMinutes} Minuten gespielt`}>
                            {app.games}Sp {app.totalMinutes > 0 ? `${app.totalMinutes}'` : ''}
                          </span>
                        )}
                        {avgRating != null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            avgRating >= 8 ? 'bg-emerald-900/60 text-emerald-300' :
                            avgRating >= 7 ? 'bg-blue-900/60 text-blue-300' :
                            avgRating >= 6 ? 'bg-gray-800 text-gray-400' :
                            'bg-red-900/40 text-red-400'
                          }`} title="Ø Sofascore Turnier">
                            Ø {avgRating.toFixed(1)}
                          </span>
                        )}
                        {avgRating == null && (p.sofascore_rating ?? 0) > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            (p.sofascore_rating as number) >= 8 ? 'bg-emerald-900/60 text-emerald-300' :
                            (p.sofascore_rating as number) >= 7 ? 'bg-blue-900/60 text-blue-300' :
                            (p.sofascore_rating as number) >= 6 ? 'bg-gray-800 text-gray-400' :
                            'bg-red-900/40 text-red-400'
                          }`} title="Sofascore letztes Spiel">
                            {(p.sofascore_rating as number).toFixed(1)}
                          </span>
                        )}
                        <span className="text-xs text-gray-600 hidden sm:block truncate max-w-[120px] flex-shrink-0">{p.club_team}</span>
                        <DeleteButton playerId={p.id} />
                      </div>
                      {hasTournamentStats && (
                        <div className="flex items-center gap-2 mt-1 ml-8 flex-wrap">
                          {(p.goals ?? 0) > 0 && (
                            <span className="text-[10px] text-white bg-gray-700 px-1.5 py-0.5 rounded font-medium">
                              ⚽ {p.goals}
                            </span>
                          )}
                          {(p.assists ?? 0) > 0 && (
                            <span className="text-[10px] text-blue-300 bg-blue-900/40 px-1.5 py-0.5 rounded font-medium">
                              🅰 {p.assists}
                            </span>
                          )}
                          {(p.yellow_cards ?? 0) > 0 && (
                            <span className="text-[10px] text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded font-medium">
                              🟨 {p.yellow_cards}
                            </span>
                          )}
                          {(p.red_cards ?? 0) > 0 && (
                            <span className="text-[10px] text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded font-medium">
                              🟥 {p.red_cards}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-gray-600 py-16 bg-gray-900 border border-gray-800 rounded-xl text-sm">
          Kein Kader eingetragen.
        </div>
      )}
    </div>
  )
}

function DQItem({ label, ok, warn, text }: { label: string; ok: boolean; warn: boolean; text: string }) {
  const color = ok ? 'text-emerald-400' : warn ? 'text-yellow-500' : 'text-rose-400'
  const icon = ok ? '✓' : warn ? '⚠' : '✗'
  return (
    <div className="text-xs">
      <div className="text-gray-600 mb-0.5">{label}</div>
      <div className={`font-medium ${color}`}>{icon} {text}</div>
    </div>
  )
}
