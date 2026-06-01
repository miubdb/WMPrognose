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
  experience: 0.0005,    // pro WM-Erfahrungs-Punkte-Differenz (titles×3 + appearances)
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

export const MODEL_META = {
  version: '2.1.0-calibrated',
  baseGoalRate: 1.50,       // Kalibriert: WM 2022 Grid Search Optimum (vorher 1.40)
  dixonColesRho: 0.12,      // Kalibriert: Grid Search Optimum gegen WM 2022 (vorher 0.08)
  maxGoals: 10,             // Score-Matrix 0..10
  logLambdaMin: Math.log(0.3),
  logLambdaMax: Math.log(4.0),
  calibrated: true,
  calibrationDataset: 'WM 2022 Gruppenphase — RPS-optimal (Grid Search 210 Kombinationen)',
} as const
