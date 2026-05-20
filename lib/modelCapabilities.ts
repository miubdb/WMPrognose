export interface ModelCapability {
  bereich: string
  quelle: string
  beschreibung: string
  status: 'implemented' | 'partial' | 'missing' | 'prepared'
  benoetigteDaten: string
  prioritaet: 'hoch' | 'mittel' | 'niedrig'
}

export const MODEL_CAPABILITIES: ModelCapability[] = [
  // Tor-Modell
  { bereich: 'Tor-Modell', quelle: 'Maher (1982)', beschreibung: 'Poisson-Prozess mit Attack/Defense-Stärken', status: 'implemented', benoetigteDaten: 'Team-Ratings', prioritaet: 'hoch' },
  { bereich: 'Tor-Modell', quelle: 'Dixon & Coles (1997)', beschreibung: 'Low-Score-Korrektur (0:0, 1:0, 0:1, 1:1)', status: 'implemented', benoetigteDaten: '–', prioritaet: 'hoch' },
  { bereich: 'Tor-Modell', quelle: 'Karlis & Ntzoufras (2003)', beschreibung: 'Bivariate Poisson / Goal-Korrelation', status: 'prepared', benoetigteDaten: '–', prioritaet: 'mittel' },
  { bereich: 'Tor-Modell', quelle: 'Hvattum & Arntzen (2010)', beschreibung: 'ELO als Basis-Predictor', status: 'implemented', benoetigteDaten: 'ELO-Ratings', prioritaet: 'hoch' },
  { bereich: 'Tor-Modell', quelle: 'Constantinou & Fenton (2012)', beschreibung: 'RPS Evaluationsmetrik', status: 'implemented', benoetigteDaten: '–', prioritaet: 'mittel' },
  // Squad-Signale
  { bereich: 'Squad-Signale', quelle: 'Peeters (2018)', beschreibung: 'Log-normalisierter Marktwert', status: 'implemented', benoetigteDaten: 'Marktwerte je Spieler', prioritaet: 'hoch' },
  { bereich: 'Squad-Signale', quelle: 'Dendir (2016)', beschreibung: 'Peak-Age-Kurve 27–29', status: 'implemented', benoetigteDaten: 'Alter je Spieler', prioritaet: 'mittel' },
  { bereich: 'Squad-Signale', quelle: 'Brechot & Flepp (2020)', beschreibung: 'Opponent-adjusted xG', status: 'partial', benoetigteDaten: 'xG for/against je Spieler', prioritaet: 'hoch' },
  { bereich: 'Squad-Signale', quelle: 'Power et al. (2018)', beschreibung: 'Set-piece Threat', status: 'implemented', benoetigteDaten: 'Set-piece Rating', prioritaet: 'mittel' },
  { bereich: 'Squad-Signale', quelle: 'McHale & Holmes (2023)', beschreibung: 'Positionsabhängige Spielerbewertung', status: 'partial', benoetigteDaten: 'xG/xGA je Position', prioritaet: 'mittel' },
  // Kontext
  { bereich: 'Kontext', quelle: 'McSharry (2007)', beschreibung: 'Höhenmodifier', status: 'implemented', benoetigteDaten: 'Venue-Höhe', prioritaet: 'hoch' },
  { bereich: 'Kontext', quelle: 'Mohr et al. (2012)', beschreibung: 'WBGT/Hitze-Modifier', status: 'implemented', benoetigteDaten: 'Temperatur/Luftfeuchtigkeit', prioritaet: 'hoch' },
  { bereich: 'Kontext', quelle: 'Reilly et al. (2007)', beschreibung: 'Reise/Jetlag-Modifier', status: 'implemented', benoetigteDaten: 'Reisedistanz, Zeitzonen', prioritaet: 'mittel' },
  { bereich: 'Kontext', quelle: 'Field et al. (2022)', beschreibung: 'Rest-Days-Modifier', status: 'implemented', benoetigteDaten: 'Spielplan', prioritaet: 'mittel' },
  { bereich: 'Kontext', quelle: 'Pollard (1986)', beschreibung: 'Home Advantage', status: 'implemented', benoetigteDaten: 'Host Nation', prioritaet: 'hoch' },
  // Penalty/KO
  { bereich: 'Penalty/KO', quelle: 'Csató & Petróczy (2026)', beschreibung: 'Shootout Skill-Edge [42–58%]', status: 'implemented', benoetigteDaten: 'GK-Rating, Penalty-Qualität', prioritaet: 'mittel' },
  // Coach
  { bereich: 'Coach', quelle: 'Audas et al. (2006)', beschreibung: 'U-Shape Tenure-Effekt', status: 'implemented', benoetigteDaten: 'Trainer-Amtszeit', prioritaet: 'mittel' },
  { bereich: 'Coach', quelle: 'Forrest et al. (2005)', beschreibung: 'Heritage-Premium (stark begrenzt)', status: 'implemented', benoetigteDaten: 'WM-Titel, Turnierhistorie', prioritaet: 'niedrig' },
  // Fehlend
  { bereich: 'Squad-Signale', quelle: '–', beschreibung: 'Spielerverfügbarkeit / Sperren', status: 'missing', benoetigteDaten: 'Injury/Suspension Status', prioritaet: 'hoch' },
  { bereich: 'Squad-Signale', quelle: '–', beschreibung: 'Letzte 10 Spiele / Form', status: 'missing', benoetigteDaten: 'Ergebnisse letzte Spiele', prioritaet: 'hoch' },
  { bereich: 'Kontext', quelle: '–', beschreibung: 'Diaspora/Crowd-Support', status: 'partial', benoetigteDaten: 'Crowd-Zusammensetzung', prioritaet: 'niedrig' },
]
