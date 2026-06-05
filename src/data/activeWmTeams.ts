import { GROUP_SCHEDULE } from './schedule'

/** Exactly the 48 team IDs derived from the group stage schedule — source of truth. */
export const ACTIVE_WM_TEAM_IDS: string[] = [
  ...new Set(GROUP_SCHEDULE.flatMap(m => [m.teamAId, m.teamBId])),
].sort()
