/**
 * WM 2026 Spielplan – alle 72 Gruppenspiele + KO-Runde (Platzhalter)
 * Matchday 1: 11–14 Juni 2026
 * Matchday 2: 15–18 Juni 2026
 * Matchday 3: 22–26 Juni 2026
 * KO-Runde: ab 29. Juni 2026
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

// Gruppenspiele: Reihenfolge pro Gruppe:
// MD1: 1vs2 (idx 0vs1), 3vs4 (idx 2vs3)
// MD2: 1vs3 (idx 0vs2), 2vs4 (idx 1vs3)
// MD3: 1vs4 (idx 0vs3), 2vs3 (idx 1vs2)

export const GROUP_SCHEDULE: ScheduledMatch[] = [
  // ─── GRUPPE A: Mexico, South Africa, South Korea, Czechia ─────────────────
  { id: 'A1', group: 'A', round: 'group', matchday: 1, teamAId: 'mexico', teamBId: 'south_africa', venueId: 'dallas', date: '2026-06-11', kickoffUTC: '22:00' },
  { id: 'A2', group: 'A', round: 'group', matchday: 1, teamAId: 'south_korea', teamBId: 'czechia', venueId: 'los_angeles', date: '2026-06-12', kickoffUTC: '02:00' },
  { id: 'A3', group: 'A', round: 'group', matchday: 2, teamAId: 'mexico', teamBId: 'south_korea', venueId: 'houston', date: '2026-06-16', kickoffUTC: '22:00' },
  { id: 'A4', group: 'A', round: 'group', matchday: 2, teamAId: 'south_africa', teamBId: 'czechia', venueId: 'dallas', date: '2026-06-17', kickoffUTC: '19:00' },
  { id: 'A5', group: 'A', round: 'group', matchday: 3, teamAId: 'mexico', teamBId: 'czechia', venueId: 'guadalajara', date: '2026-06-23', kickoffUTC: '22:00' },
  { id: 'A6', group: 'A', round: 'group', matchday: 3, teamAId: 'south_africa', teamBId: 'south_korea', venueId: 'guadalajara', date: '2026-06-23', kickoffUTC: '22:00' },

  // ─── GRUPPE B: Canada, Bosnia, Qatar, Switzerland ────────────────────────
  { id: 'B1', group: 'B', round: 'group', matchday: 1, teamAId: 'canada', teamBId: 'bosnia', venueId: 'toronto', date: '2026-06-12', kickoffUTC: '18:00' },
  { id: 'B2', group: 'B', round: 'group', matchday: 1, teamAId: 'qatar', teamBId: 'switzerland', venueId: 'los_angeles', date: '2026-06-12', kickoffUTC: '22:00' },
  { id: 'B3', group: 'B', round: 'group', matchday: 2, teamAId: 'canada', teamBId: 'qatar', venueId: 'toronto', date: '2026-06-17', kickoffUTC: '19:00' },
  { id: 'B4', group: 'B', round: 'group', matchday: 2, teamAId: 'bosnia', teamBId: 'switzerland', venueId: 'new_york', date: '2026-06-17', kickoffUTC: '22:00' },
  { id: 'B5', group: 'B', round: 'group', matchday: 3, teamAId: 'canada', teamBId: 'switzerland', venueId: 'toronto', date: '2026-06-24', kickoffUTC: '22:00' },
  { id: 'B6', group: 'B', round: 'group', matchday: 3, teamAId: 'bosnia', teamBId: 'qatar', venueId: 'toronto', date: '2026-06-24', kickoffUTC: '22:00' },

  // ─── GRUPPE C: Brazil, Morocco, Haiti, Scotland ──────────────────────────
  { id: 'C1', group: 'C', round: 'group', matchday: 1, teamAId: 'brazil', teamBId: 'morocco', venueId: 'los_angeles', date: '2026-06-13', kickoffUTC: '01:00' },
  { id: 'C2', group: 'C', round: 'group', matchday: 1, teamAId: 'haiti', teamBId: 'scotland', venueId: 'miami', date: '2026-06-13', kickoffUTC: '20:00' },
  { id: 'C3', group: 'C', round: 'group', matchday: 2, teamAId: 'brazil', teamBId: 'haiti', venueId: 'houston', date: '2026-06-18', kickoffUTC: '22:00' },
  { id: 'C4', group: 'C', round: 'group', matchday: 2, teamAId: 'morocco', teamBId: 'scotland', venueId: 'miami', date: '2026-06-18', kickoffUTC: '19:00' },
  { id: 'C5', group: 'C', round: 'group', matchday: 3, teamAId: 'brazil', teamBId: 'scotland', venueId: 'miami', date: '2026-06-24', kickoffUTC: '22:00' },
  { id: 'C6', group: 'C', round: 'group', matchday: 3, teamAId: 'morocco', teamBId: 'haiti', venueId: 'miami', date: '2026-06-24', kickoffUTC: '22:00' },

  // ─── GRUPPE D: USA, Paraguay, Australia, Turkey ──────────────────────────
  { id: 'D1', group: 'D', round: 'group', matchday: 1, teamAId: 'usa', teamBId: 'paraguay', venueId: 'dallas', date: '2026-06-13', kickoffUTC: '23:00' },
  { id: 'D2', group: 'D', round: 'group', matchday: 1, teamAId: 'australia', teamBId: 'turkey', venueId: 'houston', date: '2026-06-14', kickoffUTC: '19:00' },
  { id: 'D3', group: 'D', round: 'group', matchday: 2, teamAId: 'usa', teamBId: 'australia', venueId: 'dallas', date: '2026-06-18', kickoffUTC: '22:00' },
  { id: 'D4', group: 'D', round: 'group', matchday: 2, teamAId: 'paraguay', teamBId: 'turkey', venueId: 'houston', date: '2026-06-18', kickoffUTC: '19:00' },
  { id: 'D5', group: 'D', round: 'group', matchday: 3, teamAId: 'usa', teamBId: 'turkey', venueId: 'dallas', date: '2026-06-25', kickoffUTC: '22:00' },
  { id: 'D6', group: 'D', round: 'group', matchday: 3, teamAId: 'australia', teamBId: 'paraguay', venueId: 'houston', date: '2026-06-25', kickoffUTC: '22:00' },

  // ─── GRUPPE E: Germany, Curaçao, Ivory Coast, Ecuador ───────────────────
  { id: 'E1', group: 'E', round: 'group', matchday: 1, teamAId: 'germany', teamBId: 'curacao', venueId: 'new_york', date: '2026-06-14', kickoffUTC: '22:00' },
  { id: 'E2', group: 'E', round: 'group', matchday: 1, teamAId: 'ivory_coast', teamBId: 'ecuador', venueId: 'miami', date: '2026-06-14', kickoffUTC: '19:00' },
  { id: 'E3', group: 'E', round: 'group', matchday: 2, teamAId: 'germany', teamBId: 'ivory_coast', venueId: 'new_york', date: '2026-06-19', kickoffUTC: '22:00' },
  { id: 'E4', group: 'E', round: 'group', matchday: 2, teamAId: 'curacao', teamBId: 'ecuador', venueId: 'miami', date: '2026-06-19', kickoffUTC: '19:00' },
  { id: 'E5', group: 'E', round: 'group', matchday: 3, teamAId: 'germany', teamBId: 'ecuador', venueId: 'new_york', date: '2026-06-25', kickoffUTC: '22:00' },
  { id: 'E6', group: 'E', round: 'group', matchday: 3, teamAId: 'curacao', teamBId: 'ivory_coast', venueId: 'miami', date: '2026-06-25', kickoffUTC: '22:00' },

  // ─── GRUPPE F: Netherlands, Japan, Sweden, Tunisia ───────────────────────
  { id: 'F1', group: 'F', round: 'group', matchday: 1, teamAId: 'netherlands', teamBId: 'japan', venueId: 'los_angeles', date: '2026-06-14', kickoffUTC: '22:00' },
  { id: 'F2', group: 'F', round: 'group', matchday: 1, teamAId: 'sweden', teamBId: 'tunisia', venueId: 'los_angeles', date: '2026-06-15', kickoffUTC: '02:00' },
  { id: 'F3', group: 'F', round: 'group', matchday: 2, teamAId: 'netherlands', teamBId: 'sweden', venueId: 'los_angeles', date: '2026-06-19', kickoffUTC: '22:00' },
  { id: 'F4', group: 'F', round: 'group', matchday: 2, teamAId: 'japan', teamBId: 'tunisia', venueId: 'los_angeles', date: '2026-06-20', kickoffUTC: '02:00' },
  { id: 'F5', group: 'F', round: 'group', matchday: 3, teamAId: 'netherlands', teamBId: 'tunisia', venueId: 'los_angeles', date: '2026-06-26', kickoffUTC: '22:00' },
  { id: 'F6', group: 'F', round: 'group', matchday: 3, teamAId: 'japan', teamBId: 'sweden', venueId: 'los_angeles', date: '2026-06-26', kickoffUTC: '22:00' },

  // ─── GRUPPE G: Belgium, Egypt, Iran, New Zealand ─────────────────────────
  { id: 'G1', group: 'G', round: 'group', matchday: 1, teamAId: 'belgium', teamBId: 'egypt', venueId: 'miami', date: '2026-06-15', kickoffUTC: '19:00' },
  { id: 'G2', group: 'G', round: 'group', matchday: 1, teamAId: 'iran', teamBId: 'new_zealand', venueId: 'vancouver', date: '2026-06-15', kickoffUTC: '22:00' },
  { id: 'G3', group: 'G', round: 'group', matchday: 2, teamAId: 'belgium', teamBId: 'iran', venueId: 'miami', date: '2026-06-20', kickoffUTC: '19:00' },
  { id: 'G4', group: 'G', round: 'group', matchday: 2, teamAId: 'egypt', teamBId: 'new_zealand', venueId: 'miami', date: '2026-06-20', kickoffUTC: '22:00' },
  { id: 'G5', group: 'G', round: 'group', matchday: 3, teamAId: 'belgium', teamBId: 'new_zealand', venueId: 'miami', date: '2026-06-26', kickoffUTC: '22:00' },
  { id: 'G6', group: 'G', round: 'group', matchday: 3, teamAId: 'egypt', teamBId: 'iran', venueId: 'miami', date: '2026-06-26', kickoffUTC: '22:00' },

  // ─── GRUPPE H: Spain, Cape Verde, Saudi Arabia, Uruguay ──────────────────
  { id: 'H1', group: 'H', round: 'group', matchday: 1, teamAId: 'spain', teamBId: 'cape_verde', venueId: 'houston', date: '2026-06-15', kickoffUTC: '22:00' },
  { id: 'H2', group: 'H', round: 'group', matchday: 1, teamAId: 'saudi_arabia', teamBId: 'uruguay', venueId: 'houston', date: '2026-06-16', kickoffUTC: '02:00' },
  { id: 'H3', group: 'H', round: 'group', matchday: 2, teamAId: 'spain', teamBId: 'saudi_arabia', venueId: 'dallas', date: '2026-06-20', kickoffUTC: '22:00' },
  { id: 'H4', group: 'H', round: 'group', matchday: 2, teamAId: 'cape_verde', teamBId: 'uruguay', venueId: 'houston', date: '2026-06-21', kickoffUTC: '02:00' },
  { id: 'H5', group: 'H', round: 'group', matchday: 3, teamAId: 'spain', teamBId: 'uruguay', venueId: 'dallas', date: '2026-06-26', kickoffUTC: '22:00' },
  { id: 'H6', group: 'H', round: 'group', matchday: 3, teamAId: 'cape_verde', teamBId: 'saudi_arabia', venueId: 'houston', date: '2026-06-26', kickoffUTC: '22:00' },

  // ─── GRUPPE I: France, Senegal, Iraq, Norway ──────────────────────────────
  { id: 'I1', group: 'I', round: 'group', matchday: 1, teamAId: 'france', teamBId: 'senegal', venueId: 'new_york', date: '2026-06-16', kickoffUTC: '19:00' },
  { id: 'I2', group: 'I', round: 'group', matchday: 1, teamAId: 'iraq', teamBId: 'norway', venueId: 'new_york', date: '2026-06-16', kickoffUTC: '22:00' },
  { id: 'I3', group: 'I', round: 'group', matchday: 2, teamAId: 'france', teamBId: 'iraq', venueId: 'new_york', date: '2026-06-21', kickoffUTC: '19:00' },
  { id: 'I4', group: 'I', round: 'group', matchday: 2, teamAId: 'senegal', teamBId: 'norway', venueId: 'new_york', date: '2026-06-21', kickoffUTC: '22:00' },
  { id: 'I5', group: 'I', round: 'group', matchday: 3, teamAId: 'france', teamBId: 'norway', venueId: 'new_york', date: '2026-06-26', kickoffUTC: '22:00' },
  { id: 'I6', group: 'I', round: 'group', matchday: 3, teamAId: 'senegal', teamBId: 'iraq', venueId: 'new_york', date: '2026-06-26', kickoffUTC: '22:00' },

  // ─── GRUPPE J: Argentina, Algeria, Austria, Jordan ───────────────────────
  { id: 'J1', group: 'J', round: 'group', matchday: 1, teamAId: 'argentina', teamBId: 'algeria', venueId: 'dallas', date: '2026-06-16', kickoffUTC: '22:00' },
  { id: 'J2', group: 'J', round: 'group', matchday: 1, teamAId: 'austria', teamBId: 'jordan', venueId: 'dallas', date: '2026-06-17', kickoffUTC: '02:00' },
  { id: 'J3', group: 'J', round: 'group', matchday: 2, teamAId: 'argentina', teamBId: 'austria', venueId: 'miami', date: '2026-06-21', kickoffUTC: '22:00' },
  { id: 'J4', group: 'J', round: 'group', matchday: 2, teamAId: 'algeria', teamBId: 'jordan', venueId: 'dallas', date: '2026-06-22', kickoffUTC: '02:00' },
  { id: 'J5', group: 'J', round: 'group', matchday: 3, teamAId: 'argentina', teamBId: 'jordan', venueId: 'miami', date: '2026-06-26', kickoffUTC: '22:00' },
  { id: 'J6', group: 'J', round: 'group', matchday: 3, teamAId: 'algeria', teamBId: 'austria', venueId: 'dallas', date: '2026-06-26', kickoffUTC: '22:00' },

  // ─── GRUPPE K: Portugal, Congo DR, Uzbekistan, Colombia ──────────────────
  { id: 'K1', group: 'K', round: 'group', matchday: 1, teamAId: 'portugal', teamBId: 'congo_dr', venueId: 'los_angeles', date: '2026-06-17', kickoffUTC: '22:00' },
  { id: 'K2', group: 'K', round: 'group', matchday: 1, teamAId: 'uzbekistan', teamBId: 'colombia', venueId: 'vancouver', date: '2026-06-18', kickoffUTC: '02:00' },
  { id: 'K3', group: 'K', round: 'group', matchday: 2, teamAId: 'portugal', teamBId: 'uzbekistan', venueId: 'los_angeles', date: '2026-06-22', kickoffUTC: '19:00' },
  { id: 'K4', group: 'K', round: 'group', matchday: 2, teamAId: 'congo_dr', teamBId: 'colombia', venueId: 'los_angeles', date: '2026-06-22', kickoffUTC: '22:00' },
  { id: 'K5', group: 'K', round: 'group', matchday: 3, teamAId: 'portugal', teamBId: 'colombia', venueId: 'los_angeles', date: '2026-06-27', kickoffUTC: '22:00' },
  { id: 'K6', group: 'K', round: 'group', matchday: 3, teamAId: 'uzbekistan', teamBId: 'congo_dr', venueId: 'vancouver', date: '2026-06-27', kickoffUTC: '22:00' },

  // ─── GRUPPE L: England, Croatia, Ghana, Panama ────────────────────────────
  { id: 'L1', group: 'L', round: 'group', matchday: 1, teamAId: 'england', teamBId: 'croatia', venueId: 'new_york', date: '2026-06-17', kickoffUTC: '19:00' },
  { id: 'L2', group: 'L', round: 'group', matchday: 1, teamAId: 'ghana', teamBId: 'panama', venueId: 'new_york', date: '2026-06-17', kickoffUTC: '22:00' },
  { id: 'L3', group: 'L', round: 'group', matchday: 2, teamAId: 'england', teamBId: 'ghana', venueId: 'new_york', date: '2026-06-22', kickoffUTC: '22:00' },
  { id: 'L4', group: 'L', round: 'group', matchday: 2, teamAId: 'croatia', teamBId: 'panama', venueId: 'new_york', date: '2026-06-22', kickoffUTC: '19:00' },
  { id: 'L5', group: 'L', round: 'group', matchday: 3, teamAId: 'england', teamBId: 'panama', venueId: 'new_york', date: '2026-06-27', kickoffUTC: '22:00' },
  { id: 'L6', group: 'L', round: 'group', matchday: 3, teamAId: 'croatia', teamBId: 'ghana', venueId: 'new_york', date: '2026-06-27', kickoffUTC: '22:00' },
]

// KO-Runde Platzhalter
export const KO_SCHEDULE: ScheduledMatch[] = [
  // Round of 32 (16 Spiele)
  { id: 'R32_1', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas', date: '2026-06-29', kickoffUTC: '22:00', teamALabel: '1A', teamBLabel: '2B' },
  { id: 'R32_2', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'miami', date: '2026-06-29', kickoffUTC: '19:00', teamALabel: '1B', teamBLabel: '2A' },
  { id: 'R32_3', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-06-30', kickoffUTC: '22:00', teamALabel: '1C', teamBLabel: '2D' },
  { id: 'R32_4', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'houston', date: '2026-06-30', kickoffUTC: '19:00', teamALabel: '1D', teamBLabel: '2C' },
  { id: 'R32_5', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york', date: '2026-07-01', kickoffUTC: '22:00', teamALabel: '1E', teamBLabel: '2F' },
  { id: 'R32_6', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas', date: '2026-07-01', kickoffUTC: '19:00', teamALabel: '1F', teamBLabel: '2E' },
  { id: 'R32_7', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'miami', date: '2026-07-02', kickoffUTC: '22:00', teamALabel: '1G', teamBLabel: '2H' },
  { id: 'R32_8', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-02', kickoffUTC: '19:00', teamALabel: '1H', teamBLabel: '2G' },
  { id: 'R32_9', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'houston', date: '2026-07-03', kickoffUTC: '22:00', teamALabel: '1I', teamBLabel: '2J' },
  { id: 'R32_10', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york', date: '2026-07-03', kickoffUTC: '19:00', teamALabel: '1J', teamBLabel: '2I' },
  { id: 'R32_11', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas', date: '2026-07-04', kickoffUTC: '22:00', teamALabel: '1K', teamBLabel: '2L' },
  { id: 'R32_12', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'miami', date: '2026-07-04', kickoffUTC: '19:00', teamALabel: '1L', teamBLabel: '2K' },
  { id: 'R32_13', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-05', kickoffUTC: '22:00', teamALabel: '3A/B/C/D', teamBLabel: '3E/F/G/H' },
  { id: 'R32_14', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'houston', date: '2026-07-05', kickoffUTC: '19:00', teamALabel: '3I/J/K/L', teamBLabel: 'Best 3rd' },
  { id: 'R32_15', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york', date: '2026-07-06', kickoffUTC: '22:00', teamALabel: 'Best 3rd', teamBLabel: 'Best 3rd' },
  { id: 'R32_16', round: 'round_of_32', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas', date: '2026-07-06', kickoffUTC: '19:00', teamALabel: 'Best 3rd', teamBLabel: 'Best 3rd' },

  // Round of 16 (8 Spiele)
  { id: 'R16_1', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'miami', date: '2026-07-08', kickoffUTC: '22:00', teamALabel: 'W R32_1', teamBLabel: 'W R32_2' },
  { id: 'R16_2', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-08', kickoffUTC: '19:00', teamALabel: 'W R32_3', teamBLabel: 'W R32_4' },
  { id: 'R16_3', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'houston', date: '2026-07-09', kickoffUTC: '22:00', teamALabel: 'W R32_5', teamBLabel: 'W R32_6' },
  { id: 'R16_4', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york', date: '2026-07-09', kickoffUTC: '19:00', teamALabel: 'W R32_7', teamBLabel: 'W R32_8' },
  { id: 'R16_5', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas', date: '2026-07-10', kickoffUTC: '22:00', teamALabel: 'W R32_9', teamBLabel: 'W R32_10' },
  { id: 'R16_6', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'miami', date: '2026-07-10', kickoffUTC: '19:00', teamALabel: 'W R32_11', teamBLabel: 'W R32_12' },
  { id: 'R16_7', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-11', kickoffUTC: '22:00', teamALabel: 'W R32_13', teamBLabel: 'W R32_14' },
  { id: 'R16_8', round: 'round_of_16', teamAId: 'tbd', teamBId: 'tbd', venueId: 'houston', date: '2026-07-11', kickoffUTC: '19:00', teamALabel: 'W R32_15', teamBLabel: 'W R32_16' },

  // Quarterfinals (4 Spiele)
  { id: 'QF1', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york', date: '2026-07-14', kickoffUTC: '22:00', teamALabel: 'W R16_1', teamBLabel: 'W R16_2' },
  { id: 'QF2', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas', date: '2026-07-14', kickoffUTC: '19:00', teamALabel: 'W R16_3', teamBLabel: 'W R16_4' },
  { id: 'QF3', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-15', kickoffUTC: '22:00', teamALabel: 'W R16_5', teamBLabel: 'W R16_6' },
  { id: 'QF4', round: 'quarterfinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'miami', date: '2026-07-15', kickoffUTC: '19:00', teamALabel: 'W R16_7', teamBLabel: 'W R16_8' },

  // Semifinals (2 Spiele)
  { id: 'SF1', round: 'semifinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'dallas', date: '2026-07-17', kickoffUTC: '22:00', teamALabel: 'W QF1', teamBLabel: 'W QF2' },
  { id: 'SF2', round: 'semifinal', teamAId: 'tbd', teamBId: 'tbd', venueId: 'los_angeles', date: '2026-07-18', kickoffUTC: '22:00', teamALabel: 'W QF3', teamBLabel: 'W QF4' },

  // Final
  { id: 'FINAL', round: 'final', teamAId: 'tbd', teamBId: 'tbd', venueId: 'new_york', date: '2026-07-19', kickoffUTC: '22:00', teamALabel: 'W SF1', teamBLabel: 'W SF2' },
]

export const ALL_MATCHES: ScheduledMatch[] = [...GROUP_SCHEDULE, ...KO_SCHEDULE]

export const MATCH_BY_ID: Record<string, ScheduledMatch> = Object.fromEntries(
  ALL_MATCHES.map(m => [m.id, m])
)
