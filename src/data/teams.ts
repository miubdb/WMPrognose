/**
 * Team-Daten für die FIFA WM 2026
 * DUMMY-DATEN: Plausible Schätzungen basierend auf öffentlichen Quellen (2024/2025).
 * Alle Werte sind anpassbar und sollen durch echte Daten ersetzt werden.
 *
 * Ratings: 0-100 Skala
 * ELO: FIFA/Club-ELO-ähnliche Skala (ca. 1300-2100)
 * Marktwerte: Mio. EUR (Transfermarkt-Größenordnung)
 */

export interface SquadPlayer {
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  age: number;
  marketValueM: number;     // Mio. EUR
  xGPer90?: number;         // Expected Goals per 90min (FWD/MID)
  xGAPer90?: number;        // Expected Goals Assisted per 90min
}

export interface CoachData {
  name: string;
  tenureYears: number;          // Jahre als aktueller Trainer
  majorTournamentExperience: number;  // Anzahl Großturniere als Trainer
  knockoutExperience: number;   // K.-o.-Spiele als Trainer bei Großturnieren
  tacticalStability: number;    // 0-100: Wie stabil/klar das taktische System ist
}

export interface TeamData {
  id: string;
  name: string;
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';

  // ─── ELO & Basis-Ratings (Hvattum & Arntzen 2010) ──────────────────────────
  eloRating: number;

  // ─── Getrennte Stärke-Ratings (FiveThirtyEight SPI-Logik) ─────────────────
  overallRating: number;      // 0-100
  attackRating: number;       // 0-100
  midfieldRating: number;     // 0-100
  defenseRating: number;      // 0-100
  goalkeeperRating: number;   // 0-100
  setPieceRating: number;     // 0-100 (Power et al. / StatsBomb 2018)

  // ─── Squad-Wert (Peeters 2018) ─────────────────────────────────────────────
  squadMarketValueM: number;  // Gesamtmarktwert in Mio. EUR

  // ─── xG-Form (Caley / Brechot & Flepp 2020) ────────────────────────────────
  recentXGFor: number;        // Durchschnitt xG für pro Spiel (letzte 10 Spiele)
  recentXGAgainst: number;    // Durchschnitt xG gegen pro Spiel (letzte 10 Spiele)
  opponentAdjustedXG: number; // Opponent-adjusted xG (Brechot & Flepp 2020)

  // ─── Durchschnittsalter & Peak-Age (Dendir 2016) ────────────────────────────
  squadAvgAge: number;
  keyPlayersAvgAge: number;   // Durchschnittsalter der 11 wichtigsten Spieler

  // ─── Heritage & Turniererfahrung (Forrest et al. 2005) ────────────────────
  worldCupAppearances: number;
  worldCupFinals: number;
  worldCupTitles: number;

  // ─── Coach-Daten (Bridgewater 2010, Audas et al. 2006) ─────────────────────
  coach: CoachData;

  // ─── Kontext (für Reise-Berechnung) ────────────────────────────────────────
  homeRegion: 'europe' | 'south_america' | 'north_america' | 'africa' | 'asia' | 'oceania';
  accustomedAltitudeM: number;   // Heimat-Höhe des Teams (trainingsbedingt)
  heatAdaptation: number;        // 0-1: Wie gut das Team an Hitze angepasst ist

  // ─── Penalty-Fähigkeiten (Csató & Petróczy 2026) ────────────────────────────
  penaltyGoalkeeperSkill: number;  // 0-100
  penaltyTakerQuality: number;     // 0-100
  penaltyTournamentExperience: number; // 0-100
}

// ─── 12 Teams mit Dummy-Daten ────────────────────────────────────────────────

export const TEAMS: Record<string, TeamData> = {

  germany: {
    id: 'germany',
    name: 'Deutschland',
    confederation: 'UEFA',
    eloRating: 1950,
    overallRating: 83,
    attackRating: 82,
    midfieldRating: 85,
    defenseRating: 82,
    goalkeeperRating: 86,
    setPieceRating: 75,
    squadMarketValueM: 680,
    recentXGFor: 1.65,
    recentXGAgainst: 0.95,
    opponentAdjustedXG: 1.70,
    squadAvgAge: 26.8,
    keyPlayersAvgAge: 27.2,
    worldCupAppearances: 20,
    worldCupFinals: 8,
    worldCupTitles: 4,
    coach: {
      name: 'Julian Nagelsmann',
      tenureYears: 2.0,
      majorTournamentExperience: 1,
      knockoutExperience: 4,
      tacticalStability: 72,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 150,
    heatAdaptation: 0.3,
    penaltyGoalkeeperSkill: 78,
    penaltyTakerQuality: 76,
    penaltyTournamentExperience: 82,
  },

  france: {
    id: 'france',
    name: 'Frankreich',
    confederation: 'UEFA',
    eloRating: 2050,
    overallRating: 90,
    attackRating: 93,
    midfieldRating: 88,
    defenseRating: 87,
    goalkeeperRating: 85,
    setPieceRating: 82,
    squadMarketValueM: 1050,
    recentXGFor: 2.10,
    recentXGAgainst: 0.80,
    opponentAdjustedXG: 2.15,
    squadAvgAge: 27.5,
    keyPlayersAvgAge: 28.0,
    worldCupAppearances: 16,
    worldCupFinals: 3,
    worldCupTitles: 2,
    coach: {
      name: 'Didier Deschamps',
      tenureYears: 13.0,
      majorTournamentExperience: 5,
      knockoutExperience: 18,
      tacticalStability: 88,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 200,
    heatAdaptation: 0.35,
    penaltyGoalkeeperSkill: 82,
    penaltyTakerQuality: 88,
    penaltyTournamentExperience: 90,
  },

  spain: {
    id: 'spain',
    name: 'Spanien',
    confederation: 'UEFA',
    eloRating: 2020,
    overallRating: 88,
    attackRating: 87,
    midfieldRating: 92,
    defenseRating: 85,
    goalkeeperRating: 83,
    setPieceRating: 78,
    squadMarketValueM: 850,
    recentXGFor: 1.95,
    recentXGAgainst: 0.72,
    opponentAdjustedXG: 2.00,
    squadAvgAge: 25.2,
    keyPlayersAvgAge: 25.8,
    worldCupAppearances: 16,
    worldCupFinals: 1,
    worldCupTitles: 1,
    coach: {
      name: 'Luis de la Fuente',
      tenureYears: 2.5,
      majorTournamentExperience: 2,
      knockoutExperience: 8,
      tacticalStability: 85,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 650,
    heatAdaptation: 0.55,
    penaltyGoalkeeperSkill: 75,
    penaltyTakerQuality: 82,
    penaltyTournamentExperience: 85,
  },

  england: {
    id: 'england',
    name: 'England',
    confederation: 'UEFA',
    eloRating: 1980,
    overallRating: 85,
    attackRating: 88,
    midfieldRating: 84,
    defenseRating: 82,
    goalkeeperRating: 88,
    setPieceRating: 85,
    squadMarketValueM: 1100,
    recentXGFor: 1.85,
    recentXGAgainst: 0.90,
    opponentAdjustedXG: 1.90,
    squadAvgAge: 27.0,
    keyPlayersAvgAge: 27.5,
    worldCupAppearances: 16,
    worldCupFinals: 1,
    worldCupTitles: 1,
    coach: {
      name: 'Thomas Tuchel',
      tenureYears: 1.0,
      majorTournamentExperience: 2,
      knockoutExperience: 12,
      tacticalStability: 78,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 50,
    heatAdaptation: 0.25,
    penaltyGoalkeeperSkill: 85,
    penaltyTakerQuality: 80,
    penaltyTournamentExperience: 78,
  },

  brazil: {
    id: 'brazil',
    name: 'Brasilien',
    confederation: 'CONMEBOL',
    eloRating: 2020,
    overallRating: 87,
    attackRating: 90,
    midfieldRating: 85,
    defenseRating: 82,
    goalkeeperRating: 80,
    setPieceRating: 80,
    squadMarketValueM: 900,
    recentXGFor: 1.90,
    recentXGAgainst: 1.05,
    opponentAdjustedXG: 1.85,
    squadAvgAge: 26.5,
    keyPlayersAvgAge: 27.0,
    worldCupAppearances: 22,
    worldCupFinals: 7,
    worldCupTitles: 5,
    coach: {
      name: 'Dorival Júnior',
      tenureYears: 1.5,
      majorTournamentExperience: 1,
      knockoutExperience: 5,
      tacticalStability: 68,
    },
    homeRegion: 'south_america',
    accustomedAltitudeM: 750,
    heatAdaptation: 0.80,
    penaltyGoalkeeperSkill: 72,
    penaltyTakerQuality: 82,
    penaltyTournamentExperience: 92,
  },

  argentina: {
    id: 'argentina',
    name: 'Argentinien',
    confederation: 'CONMEBOL',
    eloRating: 2150,
    overallRating: 92,
    attackRating: 95,
    midfieldRating: 88,
    defenseRating: 87,
    goalkeeperRating: 90,
    setPieceRating: 78,
    squadMarketValueM: 950,
    recentXGFor: 2.20,
    recentXGAgainst: 0.85,
    opponentAdjustedXG: 2.25,
    squadAvgAge: 27.8,
    keyPlayersAvgAge: 28.5,
    worldCupAppearances: 18,
    worldCupFinals: 6,
    worldCupTitles: 3,
    coach: {
      name: 'Lionel Scaloni',
      tenureYears: 7.0,
      majorTournamentExperience: 3,
      knockoutExperience: 14,
      tacticalStability: 92,
    },
    homeRegion: 'south_america',
    accustomedAltitudeM: 1200,
    heatAdaptation: 0.60,
    penaltyGoalkeeperSkill: 90,
    penaltyTakerQuality: 88,
    penaltyTournamentExperience: 95,
  },

  portugal: {
    id: 'portugal',
    name: 'Portugal',
    confederation: 'UEFA',
    eloRating: 1970,
    overallRating: 84,
    attackRating: 86,
    midfieldRating: 80,
    defenseRating: 83,
    goalkeeperRating: 82,
    setPieceRating: 72,
    squadMarketValueM: 750,
    recentXGFor: 1.80,
    recentXGAgainst: 0.92,
    opponentAdjustedXG: 1.82,
    squadAvgAge: 28.5,
    keyPlayersAvgAge: 29.2,
    worldCupAppearances: 9,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Roberto Martínez',
      tenureYears: 3.0,
      majorTournamentExperience: 3,
      knockoutExperience: 10,
      tacticalStability: 76,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 100,
    heatAdaptation: 0.50,
    penaltyGoalkeeperSkill: 80,
    penaltyTakerQuality: 85,
    penaltyTournamentExperience: 80,
  },

  netherlands: {
    id: 'netherlands',
    name: 'Niederlande',
    confederation: 'UEFA',
    eloRating: 1940,
    overallRating: 83,
    attackRating: 84,
    midfieldRating: 83,
    defenseRating: 82,
    goalkeeperRating: 80,
    setPieceRating: 76,
    squadMarketValueM: 720,
    recentXGFor: 1.72,
    recentXGAgainst: 0.98,
    opponentAdjustedXG: 1.75,
    squadAvgAge: 27.2,
    keyPlayersAvgAge: 27.8,
    worldCupAppearances: 11,
    worldCupFinals: 3,
    worldCupTitles: 0,
    coach: {
      name: 'Ronald Koeman',
      tenureYears: 2.5,
      majorTournamentExperience: 2,
      knockoutExperience: 8,
      tacticalStability: 80,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 30,
    heatAdaptation: 0.25,
    penaltyGoalkeeperSkill: 80,
    penaltyTakerQuality: 78,
    penaltyTournamentExperience: 80,
  },

  usa: {
    id: 'usa',
    name: 'USA',
    confederation: 'CONCACAF',
    eloRating: 1810,
    overallRating: 72,
    attackRating: 70,
    midfieldRating: 72,
    defenseRating: 73,
    goalkeeperRating: 78,
    setPieceRating: 68,
    squadMarketValueM: 320,
    recentXGFor: 1.35,
    recentXGAgainst: 1.20,
    opponentAdjustedXG: 1.30,
    squadAvgAge: 24.8,
    keyPlayersAvgAge: 25.2,
    worldCupAppearances: 11,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Mauricio Pochettino',
      tenureYears: 1.5,
      majorTournamentExperience: 1,
      knockoutExperience: 3,
      tacticalStability: 72,
    },
    homeRegion: 'north_america',
    accustomedAltitudeM: 200,
    heatAdaptation: 0.55,
    penaltyGoalkeeperSkill: 70,
    penaltyTakerQuality: 65,
    penaltyTournamentExperience: 55,
  },

  mexico: {
    id: 'mexico',
    name: 'Mexiko',
    confederation: 'CONCACAF',
    eloRating: 1820,
    overallRating: 73,
    attackRating: 72,
    midfieldRating: 74,
    defenseRating: 73,
    goalkeeperRating: 76,
    setPieceRating: 70,
    squadMarketValueM: 280,
    recentXGFor: 1.28,
    recentXGAgainst: 1.15,
    opponentAdjustedXG: 1.32,
    squadAvgAge: 27.5,
    keyPlayersAvgAge: 28.0,
    worldCupAppearances: 17,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Javier Aguirre',
      tenureYears: 1.5,
      majorTournamentExperience: 3,
      knockoutExperience: 8,
      tacticalStability: 74,
    },
    homeRegion: 'north_america',
    accustomedAltitudeM: 2200,  // Mexico City: 2240m
    heatAdaptation: 0.75,
    penaltyGoalkeeperSkill: 72,
    penaltyTakerQuality: 68,
    penaltyTournamentExperience: 70,
  },

  japan: {
    id: 'japan',
    name: 'Japan',
    confederation: 'AFC',
    eloRating: 1850,
    overallRating: 75,
    attackRating: 74,
    midfieldRating: 78,
    defenseRating: 74,
    goalkeeperRating: 72,
    setPieceRating: 71,
    squadMarketValueM: 310,
    recentXGFor: 1.42,
    recentXGAgainst: 1.10,
    opponentAdjustedXG: 1.45,
    squadAvgAge: 26.2,
    keyPlayersAvgAge: 26.8,
    worldCupAppearances: 7,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Hajime Moriyasu',
      tenureYears: 7.0,
      majorTournamentExperience: 3,
      knockoutExperience: 8,
      tacticalStability: 86,
    },
    homeRegion: 'asia',
    accustomedAltitudeM: 100,
    heatAdaptation: 0.65,
    penaltyGoalkeeperSkill: 68,
    penaltyTakerQuality: 72,
    penaltyTournamentExperience: 68,
  },

  morocco: {
    id: 'morocco',
    name: 'Marokko',
    confederation: 'CAF',
    eloRating: 1880,
    overallRating: 78,
    attackRating: 76,
    midfieldRating: 78,
    defenseRating: 82,
    goalkeeperRating: 82,
    setPieceRating: 80,
    squadMarketValueM: 390,
    recentXGFor: 1.30,
    recentXGAgainst: 0.75,
    opponentAdjustedXG: 1.35,
    squadAvgAge: 27.0,
    keyPlayersAvgAge: 27.5,
    worldCupAppearances: 6,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Walid Regragui',
      tenureYears: 3.5,
      majorTournamentExperience: 2,
      knockoutExperience: 7,
      tacticalStability: 90,
    },
    homeRegion: 'africa',
    accustomedAltitudeM: 500,
    heatAdaptation: 0.80,
    penaltyGoalkeeperSkill: 82,
    penaltyTakerQuality: 72,
    penaltyTournamentExperience: 72,
  },

};

export type TeamId = keyof typeof TEAMS;
