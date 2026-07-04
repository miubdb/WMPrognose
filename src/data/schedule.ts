/**
 * WM 2026 Spielplan – alle 72 Gruppenspiele + KO-Runde
 * Alle Zeiten in UTC (MESZ = UTC+2)
 */

export interface ScheduledMatch {
  id: string
  group?: string
  round: 'group' | 'round_of_32' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final'
  matchday?: 1 | 2 | 3
  teamAId: string
  teamBId: string
  venueId: string
  date: string
  kickoffUTC: string
  teamALabel?: string
  teamBLabel?: string
}

export const GROUP_SCHEDULE: ScheduledMatch[] = [
  // ─── GRUPPE A: Mexico, South Africa, South Korea, Czechia ─────────────────
  // MD1: 11.06 21:00 MESZ / 12.06 04:00 MESZ
  { id: 'A1', group: 'A', round: 'group', matchday: 1, teamAId: 'mexico',      teamBId: 'south_africa', venueId: 'dallas',      date: '2026-06-11', kickoffUTC: '19:00' },
  { id: 'A2', group: 'A', round: 'group', matchday: 1, teamAId: 'south_korea', teamBId: 'czechia',      venueId: 'los_angeles', date: '2026-06-12', kickoffUTC: '02:00' },
  // MD2: 19.06 03:00 MESZ / 18.06 18:00 MESZ
  { id: 'A3', group: 'A', round: 'group', matchday: 2, teamAId: 'mexico',      teamBId: 'south_korea',  venueId: 'houston',     date: '2026-06-19', kickoffUTC: '01:00' },
  { id: 'A4', group: 'A', round: 'group', matchday: 2, teamAId: 'south_africa',teamBId: 'czechia',      venueId: 'dallas',      date: '2026-06-18', kickoffUTC: '16:00' },
  // MD3: 25.06 03:00 MESZ (both simultaneous)
  { id: 'A5', group: 'A', round: 'group', matchday: 3, teamAId: 'mexico',      teamBId: 'czechia',      venueId: 'guadalajara', date: '2026-06-25', kickoffUTC: '01:00' },
  { id: 'A6', group: 'A', round: 'group', matchday: 3, teamAId: 'south_africa',teamBId: 'south_korea',  venueId: 'guadalajara', date: '2026-06-25', kickoffUTC: '01:00' },

  // ─── GRUPPE B: Canada, Bosnia, Qatar, Switzerland ────────────────────────
  // MD1: 12.06 21:00 MESZ / 13.06 21:00 MESZ
  { id: 'B1', group: 'B', round: 'group', matchday: 1, teamAId: 'canada',      teamBId: 'bosnia',       venueId: 'toronto',     date: '2026-06-12', kickoffUTC: '19:00' },
  { id: 'B2', group: 'B', round: 'group', matchday: 1, teamAId: 'qatar',       teamBId: 'switzerland',  venueId: 'los_angeles', date: '2026-06-13', kickoffUTC: '19:00' },
  // MD2: 19.06 00:00 MESZ / 18.06 21:00 MESZ
  { id: 'B3', group: 'B', round: 'group', matchday: 2, teamAId: 'canada',      teamBId: 'qatar',        venueId: 'toronto',     date: '2026-06-18', kickoffUTC: '22:00' },
  { id: 'B4', group: 'B', round: 'group', matchday: 2, teamAId: 'bosnia',      teamBId: 'switzerland',  venueId: 'new_york',    date: '2026-06-18', kickoffUTC: '19:00' },
  // MD3: 24.06 21:00 MESZ (both simultaneous)
  { id: 'B5', group: 'B', round: 'group', matchday: 3, teamAId: 'canada',      teamBId: 'switzerland',  venueId: 'toronto',     date: '2026-06-24', kickoffUTC: '19:00' },
  { id: 'B6', group: 'B', round: 'group', matchday: 3, teamAId: 'bosnia',      teamBId: 'qatar',        venueId: 'toronto',     date: '2026-06-24', kickoffUTC: '19:00' },

  // ─── GRUPPE C: Brazil, Morocco, Haiti, Scotland ──────────────────────────
  // MD1: 14.06 00:00 MESZ / 14.06 03:00 MESZ
  { id: 'C1', group: 'C', round: 'group', matchday: 1, teamAId: 'brazil',      teamBId: 'morocco',      venueId: 'los_angeles', date: '2026-06-13', kickoffUTC: '22:00' },
  { id: 'C2', group: 'C', round: 'group', matchday: 1, teamAId: 'haiti',       teamBId: 'scotland',     venueId: 'miami',       date: '2026-06-14', kickoffUTC: '01:00' },
  // MD2: 20.06 03:00 MESZ / 20.06 00:00 MESZ
  { id: 'C3', group: 'C', round: 'group', matchday: 2, teamAId: 'brazil',      teamBId: 'haiti',        venueId: 'houston',     date: '2026-06-20', kickoffUTC: '01:00' },
  { id: 'C4', group: 'C', round: 'group', matchday: 2, teamAId: 'morocco',     teamBId: 'scotland',     venueId: 'miami',       date: '2026-06-19', kickoffUTC: '22:00' },
  // MD3: 25.06 00:00 MESZ (both simultaneous)
  { id: 'C5', group: 'C', round: 'group', matchday: 3, teamAId: 'brazil',      teamBId: 'scotland',     venueId: 'miami',       date: '2026-06-24', kickoffUTC: '22:00' },
  { id: 'C6', group: 'C', round: 'group', matchday: 3, teamAId: 'morocco',     teamBId: 'haiti',        venueId: 'miami',       date: '2026-06-24', kickoffUTC: '22:00' },

  // ─── GRUPPE D: USA, Paraguay, Australia, Turkey ──────────────────────────
  // MD1: 13.06 03:00 MESZ / 14.06 06:00 MESZ
  { id: 'D1', group: 'D', round: 'group', matchday: 1, teamAId: 'usa',         teamBId: 'paraguay',     venueId: 'dallas',      date: '2026-06-13', kickoffUTC: '01:00' },
  { id: 'D2', group: 'D', round: 'group', matchday: 1, teamAId: 'australia',   teamBId: 'turkey',       venueId: 'houston',     date: '2026-06-14', kickoffUTC: '04:00' },
  // MD2: 19.06 21:00 MESZ / 20.06 05:00 MESZ
  { id: 'D3', group: 'D', round: 'group', matchday: 2, teamAId: 'usa',         teamBId: 'australia',    venueId: 'dallas',      date: '2026-06-19', kickoffUTC: '19:00' },
  { id: 'D4', group: 'D', round: 'group', matchday: 2, teamAId: 'paraguay',    teamBId: 'turkey',       venueId: 'houston',     date: '2026-06-20', kickoffUTC: '03:00' },
  // MD3: 26.06 04:00 MESZ (both simultaneous)
  { id: 'D5', group: 'D', round: 'group', matchday: 3, teamAId: 'usa',         teamBId: 'turkey',       venueId: 'dallas',      date: '2026-06-26', kickoffUTC: '02:00' },
  { id: 'D6', group: 'D', round: 'group', matchday: 3, teamAId: 'australia',   teamBId: 'paraguay',     venueId: 'houston',     date: '2026-06-26', kickoffUTC: '02:00' },

  // ─── GRUPPE E: Germany, Curaçao, Ivory Coast, Ecuador ───────────────────
  // MD1: 14.06 19:00 MESZ / 15.06 01:00 MESZ
  { id: 'E1', group: 'E', round: 'group', matchday: 1, teamAId: 'germany',     teamBId: 'curacao',      venueId: 'new_york',    date: '2026-06-14', kickoffUTC: '17:00' },
  { id: 'E2', group: 'E', round: 'group', matchday: 1, teamAId: 'ivory_coast', teamBId: 'ecuador',      venueId: 'miami',       date: '2026-06-14', kickoffUTC: '23:00' },
  // MD2: 20.06 22:00 MESZ / 21.06 02:00 MESZ
  { id: 'E3', group: 'E', round: 'group', matchday: 2, teamAId: 'germany',     teamBId: 'ivory_coast',  venueId: 'new_york',    date: '2026-06-20', kickoffUTC: '20:00' },
  { id: 'E4', group: 'E', round: 'group', matchday: 2, teamAId: 'curacao',     teamBId: 'ecuador',      venueId: 'miami',       date: '2026-06-21', kickoffUTC: '00:00' },
  // MD3: 25.06 22:00 MESZ (both simultaneous)
  { id: 'E5', group: 'E', round: 'group', matchday: 3, teamAId: 'germany',     teamBId: 'ecuador',      venueId: 'new_york',    date: '2026-06-25', kickoffUTC: '20:00' },
  { id: 'E6', group: 'E', round: 'group', matchday: 3, teamAId: 'curacao',     teamBId: 'ivory_coast',  venueId: 'miami',       date: '2026-06-25', kickoffUTC: '20:00' },

  // ─── GRUPPE F: Netherlands, Japan, Sweden, Tunisia ───────────────────────
  // MD1: 14.06 22:00 MESZ / 15.06 04:00 MESZ
  { id: 'F1', group: 'F', round: 'group', matchday: 1, teamAId: 'netherlands', teamBId: 'japan',        venueId: 'los_angeles', date: '2026-06-14', kickoffUTC: '20:00' },
  { id: 'F2', group: 'F', round: 'group', matchday: 1, teamAId: 'sweden',      teamBId: 'tunisia',      venueId: 'los_angeles', date: '2026-06-15', kickoffUTC: '02:00' },
  // MD2: 20.06 19:00 MESZ / 21.06 06:00 MESZ
  { id: 'F3', group: 'F', round: 'group', matchday: 2, teamAId: 'netherlands', teamBId: 'sweden',       venueId: 'los_angeles', date: '2026-06-20', kickoffUTC: '17:00' },
  { id: 'F4', group: 'F', round: 'group', matchday: 2, teamAId: 'japan',       teamBId: 'tunisia',      venueId: 'los_angeles', date: '2026-06-21', kickoffUTC: '04:00' },
  // MD3: 26.06 01:00 MESZ (both simultaneous)
  { id: 'F5', group: 'F', round: 'group', matchday: 3, teamAId: 'netherlands', teamBId: 'tunisia',      venueId: 'los_angeles', date: '2026-06-25', kickoffUTC: '23:00' },
  { id: 'F6', group: 'F', round: 'group', matchday: 3, teamAId: 'japan',       teamBId: 'sweden',       venueId: 'los_angeles', date: '2026-06-25', kickoffUTC: '23:00' },

  // ─── GRUPPE G: Belgium, Egypt, Iran, New Zealand ─────────────────────────
  // MD1: 15.06 21:00 MESZ / 16.06 03:00 MESZ
  { id: 'G1', group: 'G', round: 'group', matchday: 1, teamAId: 'belgium',     teamBId: 'egypt',        venueId: 'miami',       date: '2026-06-15', kickoffUTC: '19:00' },
  { id: 'G2', group: 'G', round: 'group', matchday: 1, teamAId: 'iran',        teamBId: 'new_zealand',  venueId: 'vancouver',   date: '2026-06-16', kickoffUTC: '01:00' },
  // MD2: 21.06 21:00 MESZ / 22.06 03:00 MESZ
  { id: 'G3', group: 'G', round: 'group', matchday: 2, teamAId: 'belgium',     teamBId: 'iran',         venueId: 'miami',       date: '2026-06-21', kickoffUTC: '19:00' },
  { id: 'G4', group: 'G', round: 'group', matchday: 2, teamAId: 'egypt',       teamBId: 'new_zealand',  venueId: 'miami',       date: '2026-06-22', kickoffUTC: '01:00' },
  // MD3: 27.06 05:00 MESZ (both simultaneous)
  { id: 'G5', group: 'G', round: 'group', matchday: 3, teamAId: 'belgium',     teamBId: 'new_zealand',  venueId: 'miami',       date: '2026-06-27', kickoffUTC: '03:00' },
  { id: 'G6', group: 'G', round: 'group', matchday: 3, teamAId: 'egypt',       teamBId: 'iran',         venueId: 'miami',       date: '2026-06-27', kickoffUTC: '03:00' },

  // ─── GRUPPE H: Spain, Cape Verde, Saudi Arabia, Uruguay ──────────────────
  // MD1: 15.06 18:00 MESZ / 16.06 00:00 MESZ
  { id: 'H1', group: 'H', round: 'group', matchday: 1, teamAId: 'spain',       teamBId: 'cape_verde',   venueId: 'houston',     date: '2026-06-15', kickoffUTC: '16:00' },
  { id: 'H2', group: 'H', round: 'group', matchday: 1, teamAId: 'saudi_arabia',teamBId: 'uruguay',      venueId: 'houston',     date: '2026-06-15', kickoffUTC: '22:00' },
  // MD2: 21.06 18:00 MESZ / 22.06 00:00 MESZ
  { id: 'H3', group: 'H', round: 'group', matchday: 2, teamAId: 'spain',       teamBId: 'saudi_arabia', venueId: 'dallas',      date: '2026-06-21', kickoffUTC: '16:00' },
  { id: 'H4', group: 'H', round: 'group', matchday: 2, teamAId: 'cape_verde',  teamBId: 'uruguay',      venueId: 'houston',     date: '2026-06-21', kickoffUTC: '22:00' },
  // MD3: 27.06 02:00 MESZ (both simultaneous)
  { id: 'H5', group: 'H', round: 'group', matchday: 3, teamAId: 'spain',       teamBId: 'uruguay',      venueId: 'dallas',      date: '2026-06-27', kickoffUTC: '00:00' },
  { id: 'H6', group: 'H', round: 'group', matchday: 3, teamAId: 'cape_verde',  teamBId: 'saudi_arabia', venueId: 'houston',     date: '2026-06-27', kickoffUTC: '00:00' },

  // ─── GRUPPE I: France, Senegal, Iraq, Norway ──────────────────────────────
  // MD1: 16.06 21:00 MESZ / 17.06 00:00 MESZ
  { id: 'I1', group: 'I', round: 'group', matchday: 1, teamAId: 'france',      teamBId: 'senegal',      venueId: 'new_york',    date: '2026-06-16', kickoffUTC: '19:00' },
  { id: 'I2', group: 'I', round: 'group', matchday: 1, teamAId: 'iraq',        teamBId: 'norway',       venueId: 'new_york',    date: '2026-06-16', kickoffUTC: '22:00' },
  // MD2: 22.06 23:00 MESZ / 23.06 02:00 MESZ
  { id: 'I3', group: 'I', round: 'group', matchday: 2, teamAId: 'france',      teamBId: 'iraq',         venueId: 'new_york',    date: '2026-06-22', kickoffUTC: '21:00' },
  { id: 'I4', group: 'I', round: 'group', matchday: 2, teamAId: 'senegal',     teamBId: 'norway',       venueId: 'new_york',    date: '2026-06-23', kickoffUTC: '00:00' },
  // MD3: 26.06 21:00 MESZ (both simultaneous)
  { id: 'I5', group: 'I', round: 'group', matchday: 3, teamAId: 'france',      teamBId: 'norway',       venueId: 'new_york',    date: '2026-06-26', kickoffUTC: '19:00' },
  { id: 'I6', group: 'I', round: 'group', matchday: 3, teamAId: 'senegal',     teamBId: 'iraq',         venueId: 'new_york',    date: '2026-06-26', kickoffUTC: '19:00' },

  // ─── GRUPPE J: Argentina, Algeria, Austria, Jordan ───────────────────────
  // MD1: 17.06 03:00 MESZ / 17.06 06:00 MESZ
  { id: 'J1', group: 'J', round: 'group', matchday: 1, teamAId: 'argentina',   teamBId: 'algeria',      venueId: 'dallas',      date: '2026-06-17', kickoffUTC: '01:00' },
  { id: 'J2', group: 'J', round: 'group', matchday: 1, teamAId: 'austria',     teamBId: 'jordan',       venueId: 'dallas',      date: '2026-06-17', kickoffUTC: '04:00' },
  // MD2: 22.06 19:00 MESZ / 23.06 05:00 MESZ
  { id: 'J3', group: 'J', round: 'group', matchday: 2, teamAId: 'argentina',   teamBId: 'austria',      venueId: 'miami',       date: '2026-06-22', kickoffUTC: '17:00' },
  { id: 'J4', group: 'J', round: 'group', matchday: 2, teamAId: 'algeria',     teamBId: 'jordan',       venueId: 'dallas',      date: '2026-06-23', kickoffUTC: '03:00' },
  // MD3: 28.06 04:00 MESZ (both simultaneous)
  { id: 'J5', group: 'J', round: 'group', matchday: 3, teamAId: 'argentina',   teamBId: 'jordan',       venueId: 'miami',       date: '2026-06-28', kickoffUTC: '02:00' },
  { id: 'J6', group: 'J', round: 'group', matchday: 3, teamAId: 'algeria',     teamBId: 'austria',      venueId: 'dallas',      date: '2026-06-28', kickoffUTC: '02:00' },

  // ─── GRUPPE K: Portugal, Congo DR, Uzbekistan, Colombia ──────────────────
  // MD1: 17.06 19:00 MESZ / 18.06 04:00 MESZ
  { id: 'K1', group: 'K', round: 'group', matchday: 1, teamAId: 'portugal',    teamBId: 'congo_dr',     venueId: 'los_angeles', date: '2026-06-17', kickoffUTC: '17:00' },
  { id: 'K2', group: 'K', round: 'group', matchday: 1, teamAId: 'uzbekistan',  teamBId: 'colombia',     venueId: 'vancouver',   date: '2026-06-18', kickoffUTC: '02:00' },
  // MD2: 23.06 19:00 MESZ / 24.06 04:00 MESZ
  { id: 'K3', group: 'K', round: 'group', matchday: 2, teamAId: 'portugal',    teamBId: 'uzbekistan',   venueId: 'los_angeles', date: '2026-06-23', kickoffUTC: '17:00' },
  { id: 'K4', group: 'K', round: 'group', matchday: 2, teamAId: 'congo_dr',    teamBId: 'colombia',     venueId: 'los_angeles', date: '2026-06-24', kickoffUTC: '02:00' },
  // MD3: 28.06 01:30 MESZ (both simultaneous)
  { id: 'K5', group: 'K', round: 'group', matchday: 3, teamAId: 'portugal',    teamBId: 'colombia',     venueId: 'los_angeles', date: '2026-06-27', kickoffUTC: '23:30' },
  { id: 'K6', group: 'K', round: 'group', matchday: 3, teamAId: 'uzbekistan',  teamBId: 'congo_dr',     venueId: 'vancouver',   date: '2026-06-27', kickoffUTC: '23:30' },

  // ─── GRUPPE L: England, Croatia, Ghana, Panama ────────────────────────────
  // MD1: 17.06 22:00 MESZ / 18.06 01:00 MESZ
  { id: 'L1', group: 'L', round: 'group', matchday: 1, teamAId: 'england',     teamBId: 'croatia',      venueId: 'new_york',    date: '2026-06-17', kickoffUTC: '20:00' },
  { id: 'L2', group: 'L', round: 'group', matchday: 1, teamAId: 'ghana',       teamBId: 'panama',       venueId: 'new_york',    date: '2026-06-17', kickoffUTC: '23:00' },
  // MD2: 23.06 22:00 MESZ / 24.06 01:00 MESZ
  { id: 'L3', group: 'L', round: 'group', matchday: 2, teamAId: 'england',     teamBId: 'ghana',        venueId: 'new_york',    date: '2026-06-23', kickoffUTC: '20:00' },
  { id: 'L4', group: 'L', round: 'group', matchday: 2, teamAId: 'croatia',     teamBId: 'panama',       venueId: 'new_york',    date: '2026-06-23', kickoffUTC: '23:00' },
  // MD3: 27.06 23:00 MESZ (both simultaneous)
  { id: 'L5', group: 'L', round: 'group', matchday: 3, teamAId: 'england',     teamBId: 'panama',       venueId: 'new_york',    date: '2026-06-27', kickoffUTC: '21:00' },
  { id: 'L6', group: 'L', round: 'group', matchday: 3, teamAId: 'croatia',     teamBId: 'ghana',        venueId: 'new_york',    date: '2026-06-27', kickoffUTC: '21:00' },
]

// KO-Runde Platzhalter
export const KO_SCHEDULE: ScheduledMatch[] = [
  // Round of 32 (16 Spiele)
  { id: 'R32_1',  round: 'round_of_32', teamAId: 'south_africa', teamBId: 'canada',      venueId: 'dallas',      date: '2026-06-28', kickoffUTC: '19:00', teamALabel: '1A', teamBLabel: '3B' },
  { id: 'R32_2',  round: 'round_of_32', teamAId: 'brazil',       teamBId: 'japan',        venueId: 'miami',       date: '2026-06-29', kickoffUTC: '17:00', teamALabel: '1C', teamBLabel: '2F' },
  { id: 'R32_3',  round: 'round_of_32', teamAId: 'germany',      teamBId: 'paraguay',     venueId: 'los_angeles', date: '2026-06-29', kickoffUTC: '20:30', teamALabel: '3E', teamBLabel: '2D' },
  { id: 'R32_4',  round: 'round_of_32', teamAId: 'netherlands',  teamBId: 'morocco',      venueId: 'houston',     date: '2026-06-30', kickoffUTC: '01:00', teamALabel: '1F', teamBLabel: '2C' },
  { id: 'R32_5',  round: 'round_of_32', teamAId: 'ivory_coast',  teamBId: 'norway',       venueId: 'new_york',    date: '2026-06-30', kickoffUTC: '17:00', teamALabel: '1E', teamBLabel: '2I' },
  { id: 'R32_6',  round: 'round_of_32', teamAId: 'france',       teamBId: 'sweden',       venueId: 'dallas',      date: '2026-06-30', kickoffUTC: '21:00', teamALabel: '1I', teamBLabel: '2F→3rd' },
  { id: 'R32_7',  round: 'round_of_32', teamAId: 'mexico',       teamBId: 'ecuador',      venueId: 'miami',       date: '2026-07-01', kickoffUTC: '01:00', teamALabel: '1A→2', teamBLabel: '3E→2nd' },
  { id: 'R32_8',  round: 'round_of_32', teamAId: 'england',      teamBId: 'congo_dr',     venueId: 'los_angeles', date: '2026-07-01', kickoffUTC: '16:00', teamALabel: '1L', teamBLabel: '2K' },
  { id: 'R32_9',  round: 'round_of_32', teamAId: 'belgium',      teamBId: 'senegal',      venueId: 'houston',     date: '2026-07-01', kickoffUTC: '20:00', teamALabel: '1G', teamBLabel: '2H→3rd' },
  { id: 'R32_10', round: 'round_of_32', teamAId: 'usa',          teamBId: 'bosnia',       venueId: 'new_york',    date: '2026-07-02', kickoffUTC: '00:00', teamALabel: '3D', teamBLabel: '2B' },
  { id: 'R32_11', round: 'round_of_32', teamAId: 'spain',        teamBId: 'austria',      venueId: 'dallas',      date: '2026-07-02', kickoffUTC: '19:00', teamALabel: '1H', teamBLabel: '2J' },
  { id: 'R32_12', round: 'round_of_32', teamAId: 'portugal',     teamBId: 'croatia',      venueId: 'miami',       date: '2026-07-02', kickoffUTC: '23:00', teamALabel: '1K', teamBLabel: '2L' },
  { id: 'R32_13', round: 'round_of_32', teamAId: 'switzerland',  teamBId: 'algeria',      venueId: 'los_angeles', date: '2026-07-03', kickoffUTC: '03:00', teamALabel: '2B→3rd', teamBLabel: '3J' },
  { id: 'R32_14', round: 'round_of_32', teamAId: 'australia',    teamBId: 'egypt',        venueId: 'houston',     date: '2026-07-03', kickoffUTC: '18:00', teamALabel: '3D→2nd', teamBLabel: '2G' },
  { id: 'R32_15', round: 'round_of_32', teamAId: 'argentina',    teamBId: 'cape_verde',   venueId: 'new_york',    date: '2026-07-03', kickoffUTC: '22:00', teamALabel: '1J', teamBLabel: '3H' },
  { id: 'R32_16', round: 'round_of_32', teamAId: 'colombia',     teamBId: 'ghana',        venueId: 'dallas',      date: '2026-07-04', kickoffUTC: '01:30', teamALabel: '1K→2nd', teamBLabel: '3L' },

  // Round of 16 (8 Spiele) — echte FIFA-Bracket-Paarungen (nicht 1↔2, 3↔4 etc.)
  { id: 'R16_1', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'houston',      date: '2026-07-04', kickoffUTC: '17:00', teamALabel: 'W R32_1',  teamBLabel: 'W R32_4' },
  { id: 'R16_2', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'philadelphia', date: '2026-07-04', kickoffUTC: '21:00', teamALabel: 'W R32_3',  teamBLabel: 'W R32_6' },
  { id: 'R16_3', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york',     date: '2026-07-05', kickoffUTC: '20:00', teamALabel: 'W R32_2',  teamBLabel: 'W R32_5' },
  { id: 'R16_4', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'mexico_city',  date: '2026-07-06', kickoffUTC: '00:00', teamALabel: 'W R32_7',  teamBLabel: 'W R32_8' },
  { id: 'R16_5', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas',       date: '2026-07-06', kickoffUTC: '19:00', teamALabel: 'W R32_12', teamBLabel: 'W R32_11' },
  { id: 'R16_6', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'seattle',      date: '2026-07-07', kickoffUTC: '00:00', teamALabel: 'W R32_10', teamBLabel: 'W R32_9' },
  { id: 'R16_7', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'atlanta',      date: '2026-07-07', kickoffUTC: '16:00', teamALabel: 'W R32_15', teamBLabel: 'W R32_14' },
  { id: 'R16_8', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'vancouver',    date: '2026-07-07', kickoffUTC: '20:00', teamALabel: 'W R32_13', teamBLabel: 'W R32_16' },

  // Quarterfinals (4 Spiele)
  { id: 'QF1', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york',    date: '2026-07-14', kickoffUTC: '22:00', teamALabel: 'W R16_1', teamBLabel: 'W R16_2' },
  { id: 'QF2', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas',      date: '2026-07-14', kickoffUTC: '19:00', teamALabel: 'W R16_3', teamBLabel: 'W R16_4' },
  { id: 'QF3', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-15', kickoffUTC: '22:00', teamALabel: 'W R16_5', teamBLabel: 'W R16_6' },
  { id: 'QF4', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'miami',       date: '2026-07-15', kickoffUTC: '19:00', teamALabel: 'W R16_7', teamBLabel: 'W R16_8' },

  // Semifinals (2 Spiele)
  { id: 'SF1', round: 'semifinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas',      date: '2026-07-17', kickoffUTC: '22:00', teamALabel: 'W QF1', teamBLabel: 'W QF2' },
  { id: 'SF2', round: 'semifinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-18', kickoffUTC: '22:00', teamALabel: 'W QF3', teamBLabel: 'W QF4' },

  // Final
  { id: 'FINAL', round: 'final', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york', date: '2026-07-19', kickoffUTC: '22:00', teamALabel: 'W SF1', teamBLabel: 'W SF2' },
]

export const ALL_MATCHES: ScheduledMatch[] = [...GROUP_SCHEDULE, ...KO_SCHEDULE]

export const MATCH_BY_ID: Record<string, ScheduledMatch> = Object.fromEntries(
  ALL_MATCHES.map(m => [m.id, m])
)

export interface MatchResultRow {
  goals_a: number
  goals_b: number
  penalty_a?: number | null
  penalty_b?: number | null
}

const KO_ROUND_ORDER: ScheduledMatch['round'][] = [
  'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final',
]

function matchWinnerSide(r: MatchResultRow): 'A' | 'B' | null {
  if (r.goals_a > r.goals_b) return 'A'
  if (r.goals_b > r.goals_a) return 'B'
  if (r.penalty_a != null && r.penalty_b != null) {
    if (r.penalty_a > r.penalty_b) return 'A'
    if (r.penalty_b > r.penalty_a) return 'B'
  }
  return null
}

/**
 * Propagiert KO-Sieger rundenweise ("W R32_1" → konkrete teamId) anhand der
 * tatsächlichen Ergebnisse (inkl. Elfmeterschießen). Gibt eine neue Kopie von
 * ALL_MATCHES zurück, in der teamAId/teamBId für bereits entschiedene
 * KO-Spiele aufgelöst sind; unentschiedene/zukünftige Spiele bleiben 'tbd'.
 */
export function resolveBracket(results: Record<string, MatchResultRow>): ScheduledMatch[] {
  const resolved: ScheduledMatch[] = ALL_MATCHES.map(m => ({ ...m }))
  const winnerTeamId: Record<string, string> = {}

  for (const round of KO_ROUND_ORDER) {
    for (const m of resolved) {
      if (m.round !== round) continue

      if (m.teamAId === 'tbd' && m.teamALabel?.startsWith('W ')) {
        const srcId = m.teamALabel.slice(2)
        if (winnerTeamId[srcId]) m.teamAId = winnerTeamId[srcId]
      }
      if (m.teamBId === 'tbd' && m.teamBLabel?.startsWith('W ')) {
        const srcId = m.teamBLabel.slice(2)
        if (winnerTeamId[srcId]) m.teamBId = winnerTeamId[srcId]
      }

      const r = results[m.id]
      if (r && m.teamAId !== 'tbd' && m.teamBId !== 'tbd') {
        const side = matchWinnerSide(r)
        if (side === 'A') winnerTeamId[m.id] = m.teamAId
        else if (side === 'B') winnerTeamId[m.id] = m.teamBId
      }
    }
  }

  return resolved
}
