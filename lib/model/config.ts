// Alle Gewichte sind log-scale (additive Beiträge zu log(lambda))
// Kalibrierbar gegen historische WM-Daten (Phase 3)
export const MODEL_WEIGHTS = {
  elo: 0.0004,          // pro ELO-Punkt Differenz → log(lambda)-Beitrag
                         // Hvattum & Arntzen 2010: 400-Punkte = ~15% xG → ln(1.15)/400 ≈ 0.00035
  marketValueLog: 0.05,  // pro log10(mvA/mvB) Einheit → log(lambda)-Beitrag
                         // Peeters 2018: ein 10x-Marktwertunterschied → ~12% xG
  xgAttack: 3.0,         // pro Einheit avgXgPer90Attack-Differenz → log(lambda)-Beitrag
                         // maximal ±0.12 bei Diff von 0.04 xG/90
  xgDefense: 1.5,        // pro Einheit avgXgaPer90Defense-Differenz
  host: 0.039,           // ln(1.04) ≈ 0.039 für Gastgebervorteil
  diaspora: 0.020,       // ln(1.02) ≈ 0.020 für Diaspora-Support
  experience: 0.0005,    // pro WM-Erfahrungs-Punkte-Differenz (titles×3 + appearances)
  travel: -0.0000085,    // pro km über 1500km innerhalb NA
  altitude: -0.055,      // pro 1000m über 1500m (für nicht akklimatisierte Teams)
  heat: -0.018,          // pro WBGT-Grad über 28°C (für schlecht adaptierte Teams)
  attackDefense: 0.03,   // pro Differenz-Einheit (attackRating - defenseRating_opponent) / 100
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

export const MODEL_META = {
  version: '2.0.0-phase1',
  baseGoalRate: 1.35,       // WM-Durchschnitt: leicht höher als Liga (mehr Angriff)
  dixonColesRho: 0.08,      // kalibriert: 0.08 für internationale Spiele (weniger Low-Score als Liga)
  maxGoals: 10,             // Score-Matrix 0..10
  logLambdaMin: Math.log(0.3),
  logLambdaMax: Math.log(4.0),
  calibrated: false,        // true = gegen historische Daten kalibriert
  calibrationDataset: 'keine — manuelle Schätzung',
} as const
