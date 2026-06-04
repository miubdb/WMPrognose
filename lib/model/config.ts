// Alle Gewichte sind log-scale (additive Beiträge zu log(lambda))
// Kalibrierbar gegen historische WM-Daten (Phase 3)
export const MODEL_WEIGHTS = {
  elo: 0.0008,          // pro ELO-Punkt Differenz → log(lambda)-Beitrag
                         // Kalibriert via Grid Search gegen WM 2022 Gruppenphase (RPS-optimal)
                         // 400-Punkte-Diff → +37% xG-Effekt (vorher 0.0006 → +27%)
  marketValueLog: 0.05,  // pro log10(mvA/mvB) Einheit → log(lambda)-Beitrag
                         // Peeters 2018: ein 10x-Marktwertunterschied → ~12% xG
  xgAttack: 3.0,         // pro Einheit avgXgPer90Attack-Differenz → log(lambda)-Beitrag
                         // maximal ±0.12 bei Diff von 0.04 xG/90
  xgDefense: 1.5,        // pro Einheit avgXgaPer90Defense-Differenz
  host: 0.039,           // ln(1.04) ≈ 0.039 für Gastgebervorteil
  diaspora: 0.020,       // ln(1.02) ≈ 0.020 für Diaspora-Support
  // experience removed — was redundant with heritageLogA/B (double-counting fix)
  travel: -0.0000085,    // pro km über 1500km innerhalb NA
  altitude: -0.055,      // pro 1000m über 1500m (für nicht akklimatisierte Teams)
  heat: -0.018,          // pro WBGT-Grad über 28°C (für schlecht adaptierte Teams)
  attackDefense: 0.25,   // pro Differenz-Einheit (attackRating - defenseRating_opponent) / 100
                          // 15-Punkte-Vorteil → ~3.7%, 30 Punkte → ~7.8%, max clamp 0.18
  setPiece: 0.20,        // pro Differenz-Einheit setPieceRating / 100
                          // 20-Punkte-Vorteil → ~4%, Quelle: ~28% aller Tore aus Standards
  pressure: {
    mustWin: 0.049,      // ln(1.05)
    alreadyThrough: -0.030, // ln(0.97)
  },
  restDays: {
    under4: -0.041,      // ln(0.96)
    under5: -0.020,      // ln(0.98)
  },
  avgRating: 0.004,      // STARK reduziert, da aus Marktwert abgeleitet (Doppelzählung!)
                          // nur noch subtiler Differenzierungseffekt, max ±0.10
  avgAge: {
    youngPenaltyPerYear: 0.012, // pro Jahr unter 24
    oldPenaltyPerYear: 0.008,   // pro Jahr über 29
  },
} as const

export const SQUAD_RATING_CONFIG = {
  peakAgeMin: 25,
  peakAgeMax: 29,
  youngPenaltyPerYear: 0.015,   // log-penalty per year below 25
  oldPenaltyPerYear: 0.010,     // log-penalty per year above 29
  maxAgePenalty: 0.08,
  // market-value normalization for GK score: €50M = score 100
  gkNormValueM: 50,
} as const

export const CONTEXT_CONFIG = {
  altitudeThresholdM: 1500,
  altitudePer1000m: -0.055,
  maxAltitudeEffect: 0.12,
  wbgtThreshold: 28,
  wbgtPerDegree: -0.018,
  maxHeatEffect: 0.08,
  travelThresholdKm: 1500,
  travelPerKm: -0.0000085,
  maxTravelEffect: 0.04,
  restUnder4Days: -0.041,
  restUnder5Days: -0.020,
  hostBonus: 0.039,
  diasporaBonus: 0.020,
} as const

export const PENALTY_CONFIG = {
  base: 0.50,
  skillMax: 0.08,          // max ±8% deviation from base due to skill
  clampMin: 0.42,
  clampMax: 0.58,
  gkWeight: 0.40,
  takerWeight: 0.35,
  experienceWeight: 0.25,
} as const

export const COACH_CONFIG = {
  tenureOptimalMin: 2,
  tenureOptimalMax: 4,
  tenurePenaltyNew: -0.010,    // per year below 1 year
  tenurePenaltyStale: -0.005,  // per year above 6 years
  tournamentExpBonus: 0.008,   // per major tournament
  heritageMax: 0.030,
  maxCoachEffect: 0.050,
} as const

export const MODEL_META = {
  version: '2.2.0-calibrated',
  baseGoalRate: 1.50,       // Kalibriert: WM 2022 Grid Search Optimum (vorher 1.40)
  dixonColesRho: 0.04,      // Kalibriert: Grid Search Optimum gegen WM 2022 (vorher 0.12) — RPS 0.2011 vs 0.2014
  maxGoals: 10,             // Score-Matrix 0..10
  logLambdaMin: Math.log(0.3),
  logLambdaMax: Math.log(4.0),
  calibrated: true,
  calibrationDataset: 'WM 2022 Gruppenphase — RPS-optimal (Grid Search 210 Kombinationen, inkl. Motivation/Rotation)',
} as const
