import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

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
  xa_per90: number | null
  xga_per90: number | null
  tackles_per90: number | null
  clearances_per90: number | null
  goals_conceded_per90: number | null
  clean_sheets_per90: number | null
  is_in_starting_xi: boolean
}
