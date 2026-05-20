/**
 * Zentrale Modell-Konfiguration
 * Alle Koeffizienten, Gewichte und Limits an einem Ort.
 * Annahmen sind kommentiert und wissenschaftlich begründet.
 */

export const MODEL_CONFIG = {

  // ─── Poisson-Modell (Maher 1982) ────────────────────────────────────────────
  poisson: {
    // Durchschnittliche Tore pro Team pro Spiel in WM-Spielen (historisch ~1.15)
    baseExpectedGoals: 1.15,
    // Maximale Scoreline für Matrix (0..maxGoals x 0..maxGoals)
    maxGoals: 7,
  },

  // ─── Dixon-Coles-Korrektur (Dixon & Coles 1997) ─────────────────────────────
  dixonColes: {
    // ρ (rho): Korrelationsparameter für Low-Score-Ergebnisse
    // Typisch kalibriert auf ~0.1 für internationale Spiele
    // ANNAHME: 0.08 für WM (weniger Low-Score-Spiele als Liga)
    rho: 0.08,
  },

  // ─── ELO-Einfluss (Hvattum & Arntzen 2010) ──────────────────────────────────
  elo: {
    // Skalierungsfaktor für ELO-Differenz → erwartete Siegchance
    // Standardwert: 400 (wie Schach-ELO)
    scaleFactor: 400,
    // Maximaler Rating-Multiplikator aus ELO-Differenz
    maxRatingMultiplier: 1.4,
    minRatingMultiplier: 0.6,
    // Referenzwert für eloratings.net-Skala: ~1750 = Durchschnitt WM-48-Teams
    // (Quelle: eloratings.net, Mai 2026; Top-Teams ~1800-2200, schwache ~1200-1600)
    // ANNAHME: 1750 entspricht einem soliden, aber nicht Top-WM-Teilnehmer
    referenceRating: 1750,
  },

  // ─── Squad-Signale (Peeters 2018, Caley xG, Brechot & Flepp 2020) ───────────
  squad: {
    // Log-Normalisierung des Marktwerts: log(value) / log(referenceValue)
    // Referenzwert: ~1400 Mio EUR (England 2026 – teuerster WM-Kader aller Zeiten!)
    // Quelle: SportsOrca / Transfermarkt, Mai 2026
    marketValueReferenceM: 1400,
    // Gewichtung der Positionen für SquadScore
    weights: {
      attack: 0.35,
      midfield: 0.25,
      defense: 0.28,
      goalkeeper: 0.12,
    },
    // Maximaler Einfluss des Squad-Scores auf Expected Goals (±15%)
    maxImpact: 0.15,
    // xG-Form: Wie stark beeinflussen die letzten xG-Werte die Prognose
    xgFormWeight: 0.20,
    // Set-Piece-Threat: Max-Modifier auf Expected Goals (bis +8%)
    setPieceMaxBonus: 0.08,
  },

  // ─── Peak-Age-Score (Dendir 2016) ───────────────────────────────────────────
  peakAge: {
    // Optimales Alter für Fußballer: 27-29
    peakMin: 27,
    peakMax: 29,
    // Penalty pro Jahr entfernt vom Peak (symmetrisch)
    // ANNAHME: -2% pro Jahr, max -20% (Dendir 2016 zeigt klare Peak-Kurve)
    penaltyPerYear: 0.02,
    maxPenalty: 0.20,
  },

  // ─── Kontext-Modifier ───────────────────────────────────────────────────────
  context: {
    altitude: {
      // Ab dieser Höhe beginnt ein spürbarer Effekt (McSharry 2007)
      thresholdMeters: 1500,
      // Vorteil pro 1000m über Schwelle für akklimatisierte Teams
      // ANNAHME: +4% Expected Goals für Heimteams der Region, Literatur zeigt 5-10% Heimvorteil in Altitude
      bonusPerKm: 0.04,
      // Nachteil für nicht-akklimatisierte Teams
      penaltyPerKm: 0.06,
      maxBonus: 0.10,
      maxPenalty: 0.12,
    },
    heat: {
      // WBGT-Schwelle (Mohr et al. 2012): Ab 28°C WBGT spürbar
      wbgtThreshold: 28,
      // Penalty pro Grad WBGT über Schwelle
      // ANNAHME: -1.5% Expected Goals pro Grad (Mohr 2012: 5-7% Gesamtleistungsabfall)
      penaltyPerDegree: 0.015,
      // Teams aus heißem Klima haben Anpassungsvorteil
      heatAdaptationBonus: 0.04,
      maxPenalty: 0.10,
    },
    travel: {
      // Reiseermüdung (Reilly et al. 2007): Effekt ab 3 Stunden Zeitzonendifferenz
      timezoneThreshold: 3,
      // Ost-West ist schlimmer als West-Ost (Reilly 2007)
      eastWestPenalty: 0.015,
      westEastPenalty: 0.008,
      maxPenalty: 0.08,
      // Distanz-Müdigkeit: -1% pro 3000km über 3000km
      distancePenaltyPer3000km: 0.01,
      distanceThresholdKm: 3000,
    },
    rest: {
      // Optimale Erholungszeit (Field et al. 2022): 6-7 Tage
      optimalRestDays: 7,
      // Penalty pro Tag weniger als optimal
      // ANNAHME: -2% pro Tag unter 5 Tagen (Field 2022: signifikanter Effekt bei <5 Tagen)
      penaltyPerDayUnder: 0.02,
      penaltyThreshold: 5,
      maxPenalty: 0.08,
    },
    homeAdvantage: {
      // Pollard (1986): Heimvorteil ~60% Siege für Heimteam
      // Für Gastgeber-Nation WM: +5% Expected Goals (historische WM-Daten)
      hostNationBonus: 0.05,
      // Diaspora-Crowd-Support (Sors 2020, Bryson 2021): ~2% für kulturell nahe Orte
      diasporaBonus: 0.02,
    },
  },

  // ─── Coach-Score (Bridgewater 2010, Audas et al. 2006) ─────────────────────
  coach: {
    // U-Shape Tenure: optimal bei 3-5 Jahren
    tenureOptimalYears: 4,
    // Penalty für sehr kurze Amtszeit (<1 Jahr)
    shortTenurePenalty: 0.05,
    // Schwelle für kurze Amtszeit
    shortTenureThreshold: 1,
    // Sehr lange Amtszeit (>8 Jahre): leichter Rückgang
    longTenureThreshold: 8,
    longTenurePenalty: 0.02,
    // Max Bonus aus Coach-Faktor auf Expected Goals
    maxBonus: 0.06,
    maxPenalty: 0.06,
    // Heritage-Score: Turniergeschichte eines Teams (Forrest et al. 2005)
    // Stark begrenzt, damit große Namen nicht überbewertet werden
    heritageMaxBonus: 0.04,
  },

  // ─── Penalty-Shootout (Csató & Petróczy 2026) ──────────────────────────────
  penalty: {
    // Basis: 50/50
    baseProbability: 0.50,
    // Maximale Abweichung durch Skill-Edge (±8%)
    maxSkillEdge: 0.08,
    // Gewichtung der Skill-Faktoren
    goalkeeperWeight: 0.4,
    takerQualityWeight: 0.35,
    experienceWeight: 0.25,
  },

  // ─── K.-o.-Logik ─────────────────────────────────────────────────────────────
  knockout: {
    // Wahrscheinlichkeit für Verlängerung bei Remis in 90min
    // ~28% aller K.-o.-Spiele gehen in die Verlängerung (historische WM-Daten)
    extraTimeFactor: 0.55,  // Schätzung: 55% Chance dass einer der ET-Favorit gewinnt
    // Penalty-Shootout nach Verlängerung: ~40% der K.-o.-Spiele mit ET gehen zu Elfmetern
    shootoutAfterETProb: 0.40,
  },

  // ─── Normalisierung & Limits ─────────────────────────────────────────────────
  limits: {
    minExpectedGoals: 0.2,
    maxExpectedGoals: 4.0,
    minWinProbability: 0.05,
    maxWinProbability: 0.90,
  },

  // ─── Evaluation (Constantinou & Fenton 2012) ─────────────────────────────────
  evaluation: {
    // RPS-Gewichtung: uniform für 3 Outcomes (1X2)
    outcomes: 3,
  },

} as const;

export type ModelConfig = typeof MODEL_CONFIG;
