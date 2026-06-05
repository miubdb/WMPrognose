/**
 * Central team data builder — single source of truth for all live prediction pages.
 *
 * Priority order:
 *   1. team_elo_ratings (Supabase)  — ELO rating
 *   2. players (Supabase)           — squad market value, player counts
 *   3. TEAM_BY_ID (allTeams.ts)     — static fallback for names, confederation, ratings
 */

import { supabase } from '@/lib/supabase'
import { TEAM_BY_ID } from '@/src/data/allTeams'

export interface CurrentTeamData {
  teamId: string
  name: string
  flag: string
  confederation: string
  // ELO from DB (preferred) or static fallback
  eloRating: number
  eloSource: 'db' | 'static-fallback'
  // Squad data from DB players table
  playerCount: number
  playersWithMarketValue: number
  squadMarketValueM: number
  starterCount: number
  startingXiMarketValueM: number
  // Completeness flags
  hasCompleteSquad: boolean     // >= 23 players in DB
  hasCompleteStartingXi: boolean // exactly 11 starters
  // Quality assessment
  squadQualityStatus: 'complete' | 'partial' | 'empty'
  // Raw squad stats for corePredict
  attackRating: number
  defenseRating: number
  setPieceRating: number
  worldCupTitles: number
  worldCupAppearances: number
}

/** Fetch live team data from Supabase for a single team. */
export async function buildCurrentTeamData(teamId: string): Promise<CurrentTeamData> {
  const staticTeam = TEAM_BY_ID[teamId]

  // 1. Fetch ELO from DB
  const { data: eloRow } = await supabase
    .from('team_elo_ratings')
    .select('elo_rating')
    .eq('team_id', teamId)
    .maybeSingle()

  const eloRating = eloRow?.elo_rating ?? staticTeam?.eloRating ?? 1500
  const eloSource: CurrentTeamData['eloSource'] = eloRow?.elo_rating != null ? 'db' : 'static-fallback'

  // 2. Fetch players from DB
  const { data: players } = await supabase
    .from('players')
    .select('market_value_m, is_in_starting_xi')
    .eq('team_id', teamId)

  const allPlayers = players ?? []
  const playerCount = allPlayers.length
  const playersWithMarketValue = allPlayers.filter(p => (p.market_value_m ?? 0) > 0).length
  const squadMarketValueM = allPlayers.reduce((s, p) => s + (p.market_value_m ?? 0), 0)
  const starters = allPlayers.filter(p => p.is_in_starting_xi)
  const starterCount = starters.length
  const startingXiMarketValueM = starters.reduce((s, p) => s + (p.market_value_m ?? 0), 0)

  const hasCompleteSquad = playerCount >= 23
  const hasCompleteStartingXi = starterCount === 11
  const squadQualityStatus: CurrentTeamData['squadQualityStatus'] =
    playerCount === 0 ? 'empty' : hasCompleteSquad ? 'complete' : 'partial'

  return {
    teamId,
    name: staticTeam?.name ?? teamId,
    flag: staticTeam?.flag ?? '🏳',
    confederation: staticTeam?.confederation ?? 'UEFA',
    eloRating,
    eloSource,
    playerCount,
    playersWithMarketValue,
    squadMarketValueM:
      squadMarketValueM > 0 ? squadMarketValueM : (staticTeam?.squadMarketValueM ?? 0),
    starterCount,
    startingXiMarketValueM,
    hasCompleteSquad,
    hasCompleteStartingXi,
    squadQualityStatus,
    attackRating:       staticTeam?.attackRating       ?? 70,
    defenseRating:      staticTeam?.defenseRating      ?? 70,
    setPieceRating:     staticTeam?.setPieceRating      ?? 70,
    worldCupTitles:     staticTeam?.worldCupTitles      ?? 0,
    worldCupAppearances: staticTeam?.worldCupAppearances ?? 5,
  }
}

/** Fetch live team data for multiple teams in parallel. */
export async function buildCurrentTeamDataBatch(
  teamIds: string[]
): Promise<Record<string, CurrentTeamData>> {
  const results = await Promise.all(teamIds.map(id => buildCurrentTeamData(id)))
  return Object.fromEntries(results.map(r => [r.teamId, r]))
}
