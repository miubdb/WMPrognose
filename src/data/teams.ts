/**
 * Team-Daten für die FIFA WM 2026
 *
 * DATENQUELLEN (Stand Mai/Juni 2026):
 * - ELO: eloratings.net (World Football Elo Ratings) – Werte von April/Mai 2026
 * - Marktwerte: Transfermarkt via SportsOrca/beIN Sports/PlanetFootball – Dezember 2025 / Mai 2026
 * - Kaderalter: RotoWire (ESPN-Projektionen), Foot Africa – offizielle WM-2026-Kader
 * - Trainer: Offizielle Kaderankündigungen (Mai 2026)
 * - xG: Schätzungen aus WM-Qualifikation & Nations League 2024/25 (footystats.org / fbref.com)
 *
 * ELO-SKALA: eloratings.net (Referenz für WM-Teams: ~1750, Spitze: ~2200)
 * MARKTWERTE: Millionen EUR (Transfermarkt, gerundet, ±5% Schätzfehler möglich)
 */

export interface SquadPlayer {
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  age: number;
  marketValueM: number;
  xGPer90?: number;
  xGAPer90?: number;
}

export interface CoachData {
  name: string;
  tenureYears: number;
  majorTournamentExperience: number;
  knockoutExperience: number;
  tacticalStability: number;
}

export interface TeamData {
  id: string;
  name: string;
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';

  // ─── ELO & Basis-Ratings (Hvattum & Arntzen 2010) ───────────────────────────
  // Quelle: eloratings.net, April/Mai 2026
  eloRating: number;

  // ─── Getrennte Stärke-Ratings (FiveThirtyEight SPI-Logik) ──────────────────
  // Eigene Einschätzung auf Basis von ELO, Marktwert, xG, Form (0-100 Skala)
  overallRating: number;
  attackRating: number;
  midfieldRating: number;
  defenseRating: number;
  goalkeeperRating: number;
  setPieceRating: number;

  // ─── Squad-Wert (Peeters 2018) ──────────────────────────────────────────────
  // Quelle: Transfermarkt via SportsOrca/beIN Sports – Mai 2026 (in Mio. EUR)
  squadMarketValueM: number;

  // ─── xG-Form (Caley / Brechot & Flepp 2020) ─────────────────────────────────
  // Schätzung aus WM-Quali & Nations League 2024/25
  recentXGFor: number;
  recentXGAgainst: number;
  opponentAdjustedXG: number;

  // ─── Kaderalter (Dendir 2016) ────────────────────────────────────────────────
  // Quelle: RotoWire / offizielle WM-2026-Kader (Mai 2026)
  squadAvgAge: number;
  keyPlayersAvgAge: number;

  // ─── Heritage & Turniererfahrung ─────────────────────────────────────────────
  worldCupAppearances: number;
  worldCupFinals: number;
  worldCupTitles: number;

  // ─── Coach-Daten ─────────────────────────────────────────────────────────────
  // Quelle: Offizielle Kaderankündigungen Mai 2026
  coach: CoachData;

  // ─── Kontext ─────────────────────────────────────────────────────────────────
  homeRegion: 'europe' | 'south_america' | 'north_america' | 'africa' | 'asia' | 'oceania';
  accustomedAltitudeM: number;
  heatAdaptation: number;

  // ─── Penalty ─────────────────────────────────────────────────────────────────
  penaltyGoalkeeperSkill: number;
  penaltyTakerQuality: number;
  penaltyTournamentExperience: number;
}

export const TEAMS: Record<string, TeamData> = {

  // ──────────────────────────────────────────────────────────────────────────────
  // DEUTSCHLAND
  // ELO ~1960 (eloratings.net, Apr 2026, ca. Rang 6-8 weltweit)
  // Marktwert: ~€850M (Transfermarkt via SportsOrca, Dez 2025)
  // Kaderalter: 27.9 Jahre (RotoWire)
  // Trainer: Julian Nagelsmann (seit Okt 2023 → ~2.5 Jahre)
  // ──────────────────────────────────────────────────────────────────────────────
  germany: {
    id: 'germany',
    name: 'Deutschland',
    confederation: 'UEFA',
    eloRating: 1960,
    overallRating: 84,
    attackRating: 83,
    midfieldRating: 86,
    defenseRating: 82,
    goalkeeperRating: 84,   // Ter Stegen / Fleckens
    setPieceRating: 76,
    squadMarketValueM: 850,
    recentXGFor: 1.68,
    recentXGAgainst: 0.92,
    opponentAdjustedXG: 1.72,
    squadAvgAge: 27.9,      // RotoWire, offizielle Kader Mai 2026
    keyPlayersAvgAge: 27.5, // Wirtz 22, Musiala 22, Kimmich 29, Havertz 25 → ~26 Stammelf
    worldCupAppearances: 20,
    worldCupFinals: 8,
    worldCupTitles: 4,
    coach: {
      name: 'Julian Nagelsmann',
      tenureYears: 2.5,       // Oktober 2023 → Juni 2026
      majorTournamentExperience: 2, // EM 2024 (Viertelfinale), WM 2026
      knockoutExperience: 5,
      tacticalStability: 74,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 150,
    heatAdaptation: 0.30,
    penaltyGoalkeeperSkill: 78,
    penaltyTakerQuality: 76,
    penaltyTournamentExperience: 82,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // FRANKREICH
  // ELO ~2082 (eloratings.net, Apr 2026, ca. Rang 3 weltweit)
  // Marktwert: ~€1.280M (Transfermarkt via SportsOrca/planetfootball, Dez 2025)
  // Kaderalter: 26.31 Jahre (RotoWire) – jüngster Top-Favorit!
  // Trainer: Didier Deschamps (seit Juli 2012 → ~13.9 Jahre)
  // ──────────────────────────────────────────────────────────────────────────────
  france: {
    id: 'france',
    name: 'Frankreich',
    confederation: 'UEFA',
    eloRating: 2082,
    overallRating: 91,
    attackRating: 93,
    midfieldRating: 89,
    defenseRating: 88,
    goalkeeperRating: 86,   // Maignan
    setPieceRating: 83,
    squadMarketValueM: 1280,
    recentXGFor: 2.08,
    recentXGAgainst: 0.78,
    opponentAdjustedXG: 2.12,
    squadAvgAge: 26.31,     // RotoWire, jüngster Top-Favorit
    keyPlayersAvgAge: 26.8, // Mbappé 27, Camavinga 22, Tchouaméni 24, Upamecano 25
    worldCupAppearances: 16,
    worldCupFinals: 3,
    worldCupTitles: 2,
    coach: {
      name: 'Didier Deschamps',
      tenureYears: 13.9,      // Juli 2012 → Juni 2026: sehr lange Amtszeit!
      majorTournamentExperience: 6,
      knockoutExperience: 20,
      tacticalStability: 88,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 200,
    heatAdaptation: 0.35,
    penaltyGoalkeeperSkill: 83,
    penaltyTakerQuality: 88,
    penaltyTournamentExperience: 90,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // SPANIEN
  // ELO ~2165 (eloratings.net, Apr 2026 – Rang 1 weltweit!)
  // Marktwert: ~€1.200M (>€1.1bn laut mehreren Quellen, Lamine Yamal/Nico Williams)
  // Kaderalter: 26.65 Jahre (RotoWire)
  // Trainer: Luis de la Fuente (seit Dez 2022 → ~3.5 Jahre), EM-2024-Sieger
  // ──────────────────────────────────────────────────────────────────────────────
  spain: {
    id: 'spain',
    name: 'Spanien',
    confederation: 'UEFA',
    eloRating: 2165,
    overallRating: 92,
    attackRating: 90,
    midfieldRating: 94,
    defenseRating: 88,
    goalkeeperRating: 85,   // Unai Simón
    setPieceRating: 80,
    squadMarketValueM: 1200,
    recentXGFor: 1.98,
    recentXGAgainst: 0.70,
    opponentAdjustedXG: 2.03,
    squadAvgAge: 26.65,     // RotoWire
    keyPlayersAvgAge: 26.2, // Yamal 18, Williams 22, Pedri 23, Rodri 28 → ~25-26 Stammelf
    worldCupAppearances: 16,
    worldCupFinals: 1,
    worldCupTitles: 1,
    coach: {
      name: 'Luis de la Fuente',
      tenureYears: 3.5,       // Dez 2022 → Juni 2026; EM 2024 gewonnen
      majorTournamentExperience: 2, // Nations League 2021, EM 2024
      knockoutExperience: 10,
      tacticalStability: 88,  // Sehr klares 4-3-3/4-2-3-1 System
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 650,
    heatAdaptation: 0.55,
    penaltyGoalkeeperSkill: 76,
    penaltyTakerQuality: 84,
    penaltyTournamentExperience: 86,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // ENGLAND
  // ELO ~2020 (eloratings.net, Apr 2026, ca. Rang 4)
  // Marktwert: ~€1.400M (teuerster WM-Kader 2026! $1.87bn laut SportsOrca)
  // Kaderalter: 27.0 Jahre (RotoWire, Rang 18 von 48)
  // Trainer: Thomas Tuchel (seit Jan 2025 → ~1.5 Jahre)
  // ──────────────────────────────────────────────────────────────────────────────
  england: {
    id: 'england',
    name: 'England',
    confederation: 'UEFA',
    eloRating: 2020,
    overallRating: 87,
    attackRating: 89,
    midfieldRating: 85,
    defenseRating: 84,
    goalkeeperRating: 90,   // Jordan Pickford / Dean Henderson
    setPieceRating: 86,     // Starke Standard-Tradition
    squadMarketValueM: 1400, // Teuerster Kader aller WM-Teams! Bellingham, Foden, Saka
    recentXGFor: 1.88,
    recentXGAgainst: 0.88,
    opponentAdjustedXG: 1.92,
    squadAvgAge: 27.0,      // RotoWire (Rang 18 von 48)
    keyPlayersAvgAge: 27.2, // Bellingham 22, Saka 24, Foden 26, Rice 26, Kane 32
    worldCupAppearances: 16,
    worldCupFinals: 1,
    worldCupTitles: 1,
    coach: {
      name: 'Thomas Tuchel',
      tenureYears: 1.5,       // Jan 2025 → Juni 2026
      majorTournamentExperience: 2, // Nations League Halbfinale 2025, WM 2026
      knockoutExperience: 15,  // Sehr erfahren aus Klub-Fußball (UCL-Sieger 2021)
      tacticalStability: 78,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 50,
    heatAdaptation: 0.25,
    penaltyGoalkeeperSkill: 86,
    penaltyTakerQuality: 82,
    penaltyTournamentExperience: 80,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // BRASILIEN
  // ELO ~1984 (eloratings.net, Apr 2026, ca. Rang 5)
  // Marktwert: ~€900M ($900M via SportsOrca, Vinicius Jr., Rodrygo, Endrick)
  // Kaderalter: ~27.5 Jahre (Schätzung; Mix aus jung und veteran, Neymar 34 dabei)
  // Trainer: Carlo Ancelotti (NEU! Offizielle Kader-Ankündigung Mai 2026)
  // ──────────────────────────────────────────────────────────────────────────────
  brazil: {
    id: 'brazil',
    name: 'Brasilien',
    confederation: 'CONMEBOL',
    eloRating: 1984,
    overallRating: 88,
    attackRating: 92,
    midfieldRating: 86,
    defenseRating: 83,
    goalkeeperRating: 81,   // Ederson / Alisson
    setPieceRating: 80,
    squadMarketValueM: 900,
    recentXGFor: 1.92,
    recentXGAgainst: 1.02,
    opponentAdjustedXG: 1.88,
    squadAvgAge: 27.5,      // Schätzung: Neymar 34, Vinicius 25, Endrick 18, Rodrygo 24
    keyPlayersAvgAge: 27.0,
    worldCupAppearances: 22,
    worldCupFinals: 7,
    worldCupTitles: 5,
    coach: {
      name: 'Carlo Ancelotti',  // Offiziell bestätigt! (Wechsel von Real Madrid)
      tenureYears: 1.0,         // Amtsantritt ca. Sommer 2025
      majorTournamentExperience: 1, // WM 2026 (als Nationaltrainer)
      knockoutExperience: 8,    // Enorme Erfahrung aus UCL (4× Sieger)
      tacticalStability: 80,
    },
    homeRegion: 'south_america',
    accustomedAltitudeM: 750,
    heatAdaptation: 0.80,
    penaltyGoalkeeperSkill: 74,
    penaltyTakerQuality: 84,
    penaltyTournamentExperience: 92,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // ARGENTINIEN
  // ELO ~2113 (eloratings.net, Apr 2026, ca. Rang 2 – Titelverteidiger!)
  // Marktwert: ~€600M (geringer wegen Veteranen-Altersstruktur laut SportsOrca)
  // Kaderalter: 28.91 Jahre (RotoWire – 5.-ältester Kader der WM!)
  // Trainer: Lionel Scaloni (seit Sep 2018 → ~7.8 Jahre!)
  // ──────────────────────────────────────────────────────────────────────────────
  argentina: {
    id: 'argentina',
    name: 'Argentinien',
    confederation: 'CONMEBOL',
    eloRating: 2113,
    overallRating: 92,
    attackRating: 94,
    midfieldRating: 88,
    defenseRating: 87,
    goalkeeperRating: 90,   // Emiliano Martínez (Welt-TW!)
    setPieceRating: 79,
    squadMarketValueM: 600,  // Niedrig durch Veteranen (laut SportsOrca)
    recentXGFor: 2.18,
    recentXGAgainst: 0.82,
    opponentAdjustedXG: 2.22,
    squadAvgAge: 28.91,     // RotoWire – reifes Team, 5.-ältestes der WM
    keyPlayersAvgAge: 29.2, // Lautaro 27, MacAllister 26, De Paul 30, Di María 38
    worldCupAppearances: 18,
    worldCupFinals: 6,
    worldCupTitles: 3,
    coach: {
      name: 'Lionel Scaloni',
      tenureYears: 7.8,       // Sep 2018 → Juni 2026: Rekord-Amtszeit für ARG!
      majorTournamentExperience: 4, // Copa America 2021+2024, WM 2022, WM 2026
      knockoutExperience: 18,
      tacticalStability: 93,  // Extrem eingespieltes System
    },
    homeRegion: 'south_america',
    accustomedAltitudeM: 1200,
    heatAdaptation: 0.60,
    penaltyGoalkeeperSkill: 92,  // Emiliano Martínez – WELTBESTER Elfmeter-TW!
    penaltyTakerQuality: 88,
    penaltyTournamentExperience: 96,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // PORTUGAL
  // ELO ~1860 (eloratings.net, Schätzung; ca. Rang 7-8 weltweit)
  // Marktwert: ~€900M (Top-5 laut beIN Sports; Bruno Fernandes, Leão, Vitinha)
  // Kaderalter: ~27.2 Jahre (RotoWire-Daten)
  // Trainer: Roberto Martínez (seit Jan 2023 → ~3.5 Jahre)
  // Notiz: Cristiano Ronaldo im Kader für 6. WM! Symbolischer "Plus One" für Jota
  // ──────────────────────────────────────────────────────────────────────────────
  portugal: {
    id: 'portugal',
    name: 'Portugal',
    confederation: 'UEFA',
    eloRating: 1860,
    overallRating: 85,
    attackRating: 87,
    midfieldRating: 82,
    defenseRating: 83,
    goalkeeperRating: 83,   // Diogo Costa
    setPieceRating: 74,
    squadMarketValueM: 900,  // Top-5 laut beIN Sports, Bruno €80M+, Leão €100M+
    recentXGFor: 1.82,
    recentXGAgainst: 0.90,
    opponentAdjustedXG: 1.85,
    squadAvgAge: 27.2,      // RotoWire
    keyPlayersAvgAge: 27.5, // Leão 25, Bruno Fernandes 31, Vitinha 24, Ronaldo 41
    worldCupAppearances: 9,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Roberto Martínez',
      tenureYears: 3.5,       // Jan 2023 → Juni 2026
      majorTournamentExperience: 3,
      knockoutExperience: 11,
      tacticalStability: 78,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 100,
    heatAdaptation: 0.50,
    penaltyGoalkeeperSkill: 82,
    penaltyTakerQuality: 86,
    penaltyTournamentExperience: 82,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // NIEDERLANDE
  // ELO ~1870 (eloratings.net, Apr 2026, ca. Rang 6 laut April-Daten 1757→ skaliert)
  // Marktwert: ~€720M (Transfermarkt via Suche)
  // Kaderalter: 26.50 Jahre (RotoWire)
  // Trainer: Ronald Koeman (seit Feb 2023 → ~3.3 Jahre)
  // ──────────────────────────────────────────────────────────────────────────────
  netherlands: {
    id: 'netherlands',
    name: 'Niederlande',
    confederation: 'UEFA',
    eloRating: 1870,
    overallRating: 84,
    attackRating: 85,
    midfieldRating: 84,
    defenseRating: 83,
    goalkeeperRating: 82,   // Flekken / Verbruggen
    setPieceRating: 77,
    squadMarketValueM: 720,
    recentXGFor: 1.75,
    recentXGAgainst: 0.95,
    opponentAdjustedXG: 1.78,
    squadAvgAge: 26.50,     // RotoWire
    keyPlayersAvgAge: 27.0, // Van Dijk 34, Gakpo 25, Reijnders 26, Dumfries 28
    worldCupAppearances: 11,
    worldCupFinals: 3,
    worldCupTitles: 0,
    coach: {
      name: 'Ronald Koeman',
      tenureYears: 3.3,       // Feb 2023 → Juni 2026
      majorTournamentExperience: 2,
      knockoutExperience: 9,
      tacticalStability: 80,
    },
    homeRegion: 'europe',
    accustomedAltitudeM: 30,
    heatAdaptation: 0.25,
    penaltyGoalkeeperSkill: 80,
    penaltyTakerQuality: 79,
    penaltyTournamentExperience: 80,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // USA
  // ELO ~1800 (Schätzung, eloratings.net-Skala; ca. Rang 14-17 weltweit)
  // Marktwert: ~€380M (Schätzung; MLS-lastig aber gute Euro-Spieler)
  // Kaderalter: ~26.0 Jahre (RotoWire – 4.-jüngster Kader!)
  // Trainer: Mauricio Pochettino (seit Jul 2024 → ~2 Jahre)
  // ──────────────────────────────────────────────────────────────────────────────
  usa: {
    id: 'usa',
    name: 'USA',
    confederation: 'CONCACAF',
    eloRating: 1800,
    overallRating: 73,
    attackRating: 72,
    midfieldRating: 74,
    defenseRating: 73,
    goalkeeperRating: 79,   // Turner / Horvath
    setPieceRating: 70,
    squadMarketValueM: 380,
    recentXGFor: 1.38,
    recentXGAgainst: 1.18,
    opponentAdjustedXG: 1.32,
    squadAvgAge: 26.0,      // RotoWire – viertjüngster Kader der WM
    keyPlayersAvgAge: 26.2, // Pulisic 27, McKennie 26, Reyna 23, Weah 24
    worldCupAppearances: 11,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Mauricio Pochettino',
      tenureYears: 2.0,       // Jul 2024 → Juni 2026
      majorTournamentExperience: 1, // WM 2026
      knockoutExperience: 5,
      tacticalStability: 74,
    },
    homeRegion: 'north_america',
    accustomedAltitudeM: 200,
    heatAdaptation: 0.55,
    penaltyGoalkeeperSkill: 71,
    penaltyTakerQuality: 67,
    penaltyTournamentExperience: 57,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MEXIKO
  // ELO ~1790 (Schätzung, eloratings.net-Skala; ca. Rang 18-22 weltweit)
  // Marktwert: ~€280M (Schätzung; überwiegend Liga-MX-Spieler)
  // Kaderalter: ~27.2 Jahre (RotoWire)
  // Trainer: Javier Aguirre (seit Okt 2023 → ~2.5 Jahre)
  // Besonderheit: Heimvorteil in Mexico City / Guadalajara (Azteca-Atmosphäre!)
  // ──────────────────────────────────────────────────────────────────────────────
  mexico: {
    id: 'mexico',
    name: 'Mexiko',
    confederation: 'CONCACAF',
    eloRating: 1790,
    overallRating: 74,
    attackRating: 73,
    midfieldRating: 75,
    defenseRating: 74,
    goalkeeperRating: 77,   // Guillermo Ochoa
    setPieceRating: 71,
    squadMarketValueM: 280,
    recentXGFor: 1.30,
    recentXGAgainst: 1.12,
    opponentAdjustedXG: 1.34,
    squadAvgAge: 27.2,      // RotoWire
    keyPlayersAvgAge: 27.5, // Lozano 30, Álvarez 23, Lainez 24, Herrera 34
    worldCupAppearances: 17,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Javier Aguirre',
      tenureYears: 2.5,       // Okt 2023 → Juni 2026
      majorTournamentExperience: 3,
      knockoutExperience: 9,
      tacticalStability: 75,
    },
    homeRegion: 'north_america',
    accustomedAltitudeM: 2200,  // Mexico City: 2240m → gut akklimatisiert!
    heatAdaptation: 0.78,
    penaltyGoalkeeperSkill: 73,
    penaltyTakerQuality: 69,
    penaltyTournamentExperience: 72,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // JAPAN
  // ELO ~1820 (Schätzung, eloratings.net; ca. Rang 12-16; stark gestiegen durch
  //           WM 2022 Gruppenphase gegen Deutschland/Spanien gewonnen)
  // Marktwert: ~€430M (Schätzung; viele Spieler in Top-Ligen Europas)
  // Kaderalter: ~26.0 Jahre (RotoWire – 4.-jüngster Kader, tied mit USA)
  // Trainer: Hajime Moriyasu (seit Aug 2018 → ~7.8 Jahre)
  // ──────────────────────────────────────────────────────────────────────────────
  japan: {
    id: 'japan',
    name: 'Japan',
    confederation: 'AFC',
    eloRating: 1820,
    overallRating: 76,
    attackRating: 76,
    midfieldRating: 80,     // Starke Mittelfeldspieler in Europa
    defenseRating: 75,
    goalkeeperRating: 74,
    setPieceRating: 72,
    squadMarketValueM: 430,
    recentXGFor: 1.45,
    recentXGAgainst: 1.05,
    opponentAdjustedXG: 1.48,
    squadAvgAge: 26.0,      // RotoWire – viertjüngster (tied mit USA)
    keyPlayersAvgAge: 26.5, // Mitoma 27, Endo 31, Kamada 28, Kubo 23
    worldCupAppearances: 7,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Hajime Moriyasu',
      tenureYears: 7.8,       // Aug 2018 → Juni 2026: sehr lange Amtszeit
      majorTournamentExperience: 3, // WM 2022, WM 2026, Asian Cup
      knockoutExperience: 9,
      tacticalStability: 88,  // Sehr klares, eingespieltes 4-2-3-1 / 4-3-3
    },
    homeRegion: 'asia',
    accustomedAltitudeM: 100,
    heatAdaptation: 0.68,    // Japan-Klima: heiße, feuchte Sommer
    penaltyGoalkeeperSkill: 68,
    penaltyTakerQuality: 73,
    penaltyTournamentExperience: 70,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAROKKO
  // ELO ~1840 (Schätzung, eloratings.net; stark gestiegen durch WM 2022 Halbfinale!
  //           April-Daten von int-football.net: 1755 → auf eloratings.net-Skala ca. 1840)
  // Marktwert: ~€480M (Schätzung; Hakimi €80M+, Ziyech, Ounahi)
  // Kaderalter: ~26.5 Jahre (jüngere Kader laut Foot Africa)
  // Trainer: Walid Regragui (seit Sep 2022 → ~3.7 Jahre)
  // Besonderheit: Gruppe C mit Brasilien – schweres Los!
  // ──────────────────────────────────────────────────────────────────────────────
  morocco: {
    id: 'morocco',
    name: 'Marokko',
    confederation: 'CAF',
    eloRating: 1840,
    overallRating: 79,
    attackRating: 77,
    midfieldRating: 79,
    defenseRating: 84,      // Defensiv sehr stark (WM 2022: 5 Spiele fast kein Gegentor)
    goalkeeperRating: 84,   // Yassine Bounou (Bono) – Weltklasse!
    setPieceRating: 81,     // Starke Standards (WM 2022 bekannt dafür)
    squadMarketValueM: 480,
    recentXGFor: 1.28,
    recentXGAgainst: 0.72,  // Extrem defensive Stabilität
    opponentAdjustedXG: 1.32,
    squadAvgAge: 26.5,      // Foot Africa: jüngere Kader
    keyPlayersAvgAge: 27.0, // Hakimi 27, Ziyech 32, Ounahi 24, En-Nesyri 28
    worldCupAppearances: 6,
    worldCupFinals: 0,
    worldCupTitles: 0,
    coach: {
      name: 'Walid Regragui',
      tenureYears: 3.7,       // Sep 2022 → Juni 2026
      majorTournamentExperience: 2, // WM 2022 (Halbfinale!), WM 2026
      knockoutExperience: 9,
      tacticalStability: 92,  // Extrem diszipliniertes Defensivsystem
    },
    homeRegion: 'africa',
    accustomedAltitudeM: 500,
    heatAdaptation: 0.82,    // Nordafrikanisches Klima
    penaltyGoalkeeperSkill: 85,  // Bono – großartig im Elfmeterschießen WM 2022!
    penaltyTakerQuality: 72,
    penaltyTournamentExperience: 76,
  },

};

export type TeamId = keyof typeof TEAMS;
