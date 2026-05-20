import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)
export const supabase = isSupabaseConfigured ? createClient(url!, key!) : null

export interface DBPlayer {
  id: string
  team_id: string
  name: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  jersey_number: number | null
  age: number
  club_team: string | null
  market_value_m: number
  rating: number
  xg_per90: number | null
  xga_per90: number | null
  is_in_starting_xi: boolean
}
