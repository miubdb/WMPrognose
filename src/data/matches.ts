/**
 * Match-Kontext-Daten
 * Informationen, die nicht zu Teams oder Venues gehören,
 * sondern zum spezifischen Spiel.
 */

export interface MatchContext {
  round: 'group' | 'round_of_32' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final';
  isKnockout: boolean;

  // ─── Reise-Asymmetrie (Reilly et al. 2007) ──────────────────────────────────
  teamARestDays: number;       // Tage seit letztem Spiel
  teamBRestDays: number;

  // ─── Heimvorteil-Typ (Pollard 1986) ─────────────────────────────────────────
  teamAIsHostNation: boolean;
  teamBIsHostNation: boolean;

  // ─── Reisedistanz vom Heimatland zum Venue ───────────────────────────────────
  teamATravelDistanceKm: number;
  teamBTravelDistanceKm: number;

  // ─── Zeitzonendifferenz (Reilly et al. 2007) ────────────────────────────────
  teamATimezoneShiftHours: number;   // Positiv = Osten, Negativ = Westen
  teamBTimezoneShiftHours: number;

  // ─── Diaspora/Crowd-Support (Sors 2020, Bryson 2021) ─────────────────────────
  teamADiasporaSupport: boolean;   // Hat Team A Heimvorteil-ähnlichen Support?
  teamBDiasporaSupport: boolean;
}

// Beispiel-Matches für die Demo

export const EXAMPLE_MATCHES = {

  // Deutschland vs Frankreich in Mexico City (Gruppenphase)
  germany_france_mexico_city: {
    round: 'group' as const,
    isKnockout: false,
    teamARestDays: 6,
    teamBRestDays: 6,
    teamAIsHostNation: false,
    teamBIsHostNation: false,
    teamATravelDistanceKm: 9600,
    teamBTravelDistanceKm: 9800,
    teamATimezoneShiftHours: -7,
    teamBTimezoneShiftHours: -7,
    teamADiasporaSupport: false,
    teamBDiasporaSupport: false,
  },

  // Argentinien vs USA in Miami (Gruppenphase)
  argentina_usa_miami: {
    round: 'group' as const,
    isKnockout: false,
    teamARestDays: 7,
    teamBRestDays: 7,
    teamAIsHostNation: false,
    teamBIsHostNation: true,
    teamATravelDistanceKm: 8900,
    teamBTravelDistanceKm: 2000,
    teamATimezoneShiftHours: -1,
    teamBTimezoneShiftHours: 0,
    teamADiasporaSupport: true,
    teamBDiasporaSupport: true,
  },

  // Marokko vs Mexiko in Guadalajara
  morocco_mexico_guadalajara: {
    round: 'group' as const,
    isKnockout: false,
    teamARestDays: 5,
    teamBRestDays: 7,
    teamAIsHostNation: false,
    teamBIsHostNation: true,
    teamATravelDistanceKm: 10500,
    teamBTravelDistanceKm: 650,
    teamATimezoneShiftHours: -7,
    teamBTimezoneShiftHours: -1,
    teamADiasporaSupport: false,
    teamBDiasporaSupport: true,
  },

  // K.-o.-Beispiel: Spanien vs England in New York
  spain_england_knockout: {
    round: 'quarterfinal' as const,
    isKnockout: true,
    teamARestDays: 5,
    teamBRestDays: 4,
    teamAIsHostNation: false,
    teamBIsHostNation: false,
    teamATravelDistanceKm: 6900,
    teamBTravelDistanceKm: 5600,
    teamATimezoneShiftHours: -5,
    teamBTimezoneShiftHours: -5,
    teamADiasporaSupport: false,
    teamBDiasporaSupport: false,
  },

} satisfies Record<string, MatchContext>;
