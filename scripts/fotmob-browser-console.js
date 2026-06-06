/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FotMob → WM2026 DB  —  BROWSER-KONSOLEN-SKRIPT v9     ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  1. Öffne: fotmob.com/de/leagues/77/overview/world-cup/teams ║
 * ║  2. Seite vollständig laden                             ║
 * ║  3. F12 → Console → Code einfügen → Enter              ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Speichert pro Spieler (ligabereinigt):
 *  FWD/MID: xg_per90, xa_per90
 *  DEF:     xga_per90, defensive_contributions_per90,
 *           tackles_per90, interceptions_per90, clearances_per90,
 *           aerial_duels_won_pct, goals_conceded_per90
 *  GK:      goals_conceded_per90, clean_sheets_per90, xga_per90
 *  Alle:    minutes_played, league_name
 */

const SUPABASE_URL = 'https://bcwcgwoppuueduvzoyqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd2Nnd29wcHV1ZWR1dnpveXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQ2NTcsImV4cCI6MjA5NDg0MDY1N30.U-J9aSUopsWyZSy_McLpG7RQQAxRayY7XsHCDUbnWiM'

const DRY_RUN   = false
const ONLY_TEAM = ''
const RATE_MS   = 300

// ─── Liga-Qualitäts-Koeffizienten (Premier League = 1.0) ─────────────────────
// Quellen: UEFA-Länderkoeffizienten, Hvattum & Arntzen (2010),
// ClubElo-Ratings, eigene Kalibrierung auf WM-Daten.
// Werte × xG/xA vor dem Speichern = ligabereinigte Qualität.

const LEAGUE_QUALITY = {
  // ── Europa Top 5 ───────────────────────────────────────────────────────────
  'Premier League':               1.00,  // England 1
  'Championship':                 0.78,  // England 2
  'League One':                   0.65,  // England 3
  'Bundesliga':                   0.95,  // Deutschland 1
  '2. Bundesliga':                0.78,  // Deutschland 2
  'La Liga':                      0.93,  // Spanien 1
  'Segunda División':             0.76,  // Spanien 2
  'Serie A':                      0.91,  // Italien 1
  'Serie B':                      0.75,  // Italien 2
  'Ligue 1':                      0.86,  // Frankreich 1
  'Ligue 2':                      0.72,  // Frankreich 2
  // ── Europa Weitere ─────────────────────────────────────────────────────────
  'Primeira Liga':                0.82,  // Portugal
  'Liga Portugal':                0.82,
  'Eredivisie':                   0.80,  // Niederlande
  'Jupiler Pro League':           0.78,  // Belgien
  'Pro League':                   0.78,
  'Süper Lig':                    0.75,  // Türkei
  'Super Lig':                    0.75,
  'Scottish Premiership':         0.72,
  'Scottish Championship':        0.64,
  'Allsvenskan':                  0.72,  // Schweden
  'Eliteserien':                  0.70,  // Norwegen
  'Superliga':                    0.72,  // Dänemark
  'Veikkausliiga':                0.65,  // Finnland
  'Meistriliiga':                 0.58,  // Estland
  'Virsliga':                     0.57,  // Lettland
  'A Lyga':                       0.57,  // Litauen
  'Úrvalsdeild':                  0.60,  // Island
  'Austrian Bundesliga':          0.66,
  'Bundesliga Austria':           0.66,
  'Swiss Super League':           0.73,
  'Super League Switzerland':     0.73,
  'Super League':                 0.73,
  'Ekstraklasa':                  0.70,  // Polen
  'Czech Liga':                   0.68,
  'Fortuna Liga':                 0.68,
  'HNL':                          0.68,  // Kroatien
  'SuperLiga':                    0.67,  // Serbien
  'Serbian SuperLiga':            0.67,
  'Prva Liga':                    0.65,  // Slowenien
  'PrvaLiga':                     0.65,
  'Premier Liga':                 0.70,  // Ukraine/Russland
  'Ukrainian Premier League':     0.68,
  'Russian Premier League':       0.70,
  'Greek Super League':           0.70,
  'Super League Greece':          0.70,
  'Romanian Liga 1':              0.65,
  'Liga 1 Romania':               0.65,
  'Hungarian Liga':               0.63,
  'OTP Bank Liga':                0.63,
  'Bulgarian First League':       0.62,
  'Bosnian Premier League':       0.62,
  'Montenegrin First League':     0.60,
  'Macedonian First League':      0.60,
  'Albanian Superliga':           0.58,
  'Kosovo Superleague':           0.57,
  'Azerbaijani Premier League':   0.60,
  'Georgian Erovnuli Liga':       0.60,
  'Armenian Premier League':      0.58,
  'Israeli Premier League':       0.70,
  'Ligat ha-Al':                  0.70,
  'Cypriot First Division':       0.65,
  'Irish Premier Division':       0.62,
  'League of Ireland':            0.62,
  'Welsh Premier League':         0.58,
  'Northern Irish Premiership':   0.60,
  'Faroese Premier League':       0.55,
  'Maltese Premier League':       0.55,
  'Andorran Primera':             0.50,
  'Belarusian Premier League':    0.62,
  'Slovak Super Liga':            0.65,
  'Superliga Slovakia':           0.65,
  // ── Südamerika ─────────────────────────────────────────────────────────────
  'Brasileirão':                  0.78,
  'Série A':                      0.78,
  'Brazilian Serie A':            0.78,
  'Argentine Primera':            0.75,
  'Liga Profesional':             0.75,
  'Primera División Argentina':   0.75,
  'Chilean Primera División':     0.68,
  'Primera División Chile':       0.68,
  'Colombian Primera A':          0.68,
  'Liga Águila':                  0.68,
  'Liga BetPlay':                 0.68,
  'Ecuadorian Serie A':           0.65,
  'Liga Pro':                     0.65,
  'Bolivian Liga':                0.62,
  'Peruvian Liga 1':              0.63,
  'Paraguayan División':          0.64,
  'División de Honor Paraguay':   0.64,
  'Uruguayan Primera':            0.65,
  'Venezuelan Primera':           0.60,
  'Primera División Venezuela':   0.60,
  // ── CONCACAF ───────────────────────────────────────────────────────────────
  'MLS':                          0.68,
  'Major League Soccer':          0.68,
  'Liga MX':                      0.73,
  'Mexican Liga MX':              0.73,
  'Costa Rican Primera':          0.62,
  'Guatemalan Liga Nacional':     0.58,
  'Honduran Liga Nacional':       0.58,
  'Salvadoran Primera División':  0.56,
  'Panamanian LPF':               0.55,
  'Panama LPF':                   0.55,
  'Haitian League':               0.50,
  'Ligue Haïtienne':              0.50,
  'Dominican Republic':           0.52,
  'Jamaican Premier League':      0.55,
  'Trinidad Premier Football':    0.55,
  'Curaçao Promé Divishon':       0.52,
  'USL Championship':             0.64,  // USA 2. Liga
  'Canadian Premier League':      0.64,
  // ── Asien ──────────────────────────────────────────────────────────────────
  'Saudi Pro League':             0.73,
  'Saudi Professional League':    0.73,
  'Saudi Arabia Pro League':      0.73,
  'Qatar Stars League':           0.65,
  'UAE Pro League':               0.67,
  'Emirati League':               0.67,
  'Kuwait Premier League':        0.60,
  'Bahraini Premier League':      0.60,
  'Omani Professional League':    0.60,
  'Lebanese Premier League':      0.58,
  'Iraqi Stars League':           0.54,
  'Jordan Pro League':            0.55,
  'Syrian Premier League':        0.52,
  'J1 League':                    0.75,
  'J.League':                     0.75,
  'K League 1':                   0.70,
  'K-League':                     0.70,
  'Chinese Super League':         0.68,
  'Thai League 1':                0.65,
  'Vietnamese V.League':          0.60,
  'Malaysian Super League':       0.60,
  'Indonesian Liga 1':            0.62,
  'Philippines Football League':  0.55,
  'Uzbekistan Super League':      0.58,
  'Kazakhstan Premier League':    0.60,
  'Tajikistan League':            0.55,
  'Iranian Pro League':           0.65,
  'Persian Gulf Pro League':      0.65,
  'Azadegan League':              0.60,
  'Indian Super League':          0.62,
  // ── Afrika ─────────────────────────────────────────────────────────────────
  'Egyptian Premier League':      0.60,
  'Egypt Premier League':         0.60,
  'Moroccan Botola Pro':          0.62,
  'Botola Pro':                   0.62,
  'Algerian Ligue Pro':           0.60,
  'Ligue Professionnelle 1':      0.60,
  'Tunisian Ligue 1':             0.58,
  'Senegalese Ligue 1':           0.60,
  'Ligue 1 Sénégal':              0.60,
  'Ivorian Ligue 1':              0.60,
  "Ligue 1 Côte d'Ivoire":        0.60,
  'Ghanaian Premier League':      0.58,
  'Ghana Premier League':         0.58,
  'Nigerian NPFL':                0.62,
  'Nigerian Professional League': 0.62,
  'South African PSL':            0.65,
  'Premiership South Africa':     0.65,
  'Congolese Linafoot':           0.55,
  'Cape Verde Campeonato':        0.52,
  'Libyan Premier League':        0.55,
  'Sudanese Premier League':      0.52,
  'Zimbabwean Premier':           0.52,
  'Zambian Super League':         0.52,
  'Tanzanian Premier League':     0.52,
  'Kenyan Premier League':        0.55,
  'Cameroonian Elite One':        0.55,
  'Malian Première Division':     0.55,
  'Burkina Faso Premier':         0.53,
  // ── Ozeanien ───────────────────────────────────────────────────────────────
  'A-League':                     0.68,
  'Australian A-League':          0.68,
  'New Zealand National League':  0.55,
  // ── WM / Nationalteam ──────────────────────────────────────────────────────
  // WICHTIG: Spezifischere Einträge müssen VOR 'World Cup' stehen,
  // sonst matcht "World Cup Qualification" auf 'World Cup' → falscher Wert!
  //
  // Jugend-Turniere
  'World Cup U17':                0.62,
  'World Cup U20':                0.68,
  'FIFA U17 World Cup':           0.62,
  'FIFA U20 World Cup':           0.68,
  'Under-17 World Cup':           0.62,
  'Under-20 World Cup':           0.68,
  // WM-Qualifikation (national, kompetitiv aber nicht WM-Niveau)
  'World Cup Qualification':      0.87,
  'World Cup Qualifying':         0.87,
  'World Cup Qualifiers':         0.87,
  'WC Qualification':             0.87,
  'Concacaf World Cup':           0.85,  // CONCACAF WC Qualifying
  'CONMEBOL World Cup':           0.86,
  'AFC World Cup':                0.84,
  'CAF World Cup':                0.82,
  'UEFA World Cup':               0.88,
  // Club World Cup (FIFA Klub-Weltmeisterschaft — beste Vereinsklubs weltweit)
  'FIFA Club World Cup':          0.90,
  'FIFA Klub-Weltmeiste':         0.90,
  'Club World Cup':               0.90,
  'Klub-Weltmeiste':              0.90,
  // Kontinental-Pokal Clubs
  'UEFA Champions League':        0.96,
  'UEFA Europa League':           0.85,
  'UEFA Conference League':       0.80,
  'Copa Libertadores':            0.80,
  'Copa Sudamericana':            0.74,
  'AFC Champions League':         0.72,
  'CAF Champions League':         0.70,
  'CONCACAF Champions Cup':       0.72,
  // Eigentliche WM (nach den Qualifiern, damit Qualifier zuerst matchen)
  'World Cup':                    1.05,  // WM-Stats leicht höher werten
  'Weltmeisterschaft':            1.05,
  'UEFA Nations League':          0.90,
  'EURO':                         0.95,
  'European Championship':        0.95,
  'Copa América':                 0.90,
  'Africa Cup of Nations':        0.80,
  'AFCON':                        0.80,
  'Asian Cup':                    0.75,
  'Gold Cup':                     0.72,
  'Nations League':               0.85,
  // Sonstige Turniere / Freundschaftsspiele
  'Super Cup':                    0.70,
  'Supercup':                     0.70,
  'King Cup':                     0.68,
  "King's Cup":                   0.68,
  'Tipsport':                     0.60,
  'Friendly':                     0.55,
  'Friendlies':                   0.55,
  'Testspiel':                    0.55,
  // Fallback
  'default':                      0.72,
}

function leagueQuality(leagueName) {
  if (!leagueName) return LEAGUE_QUALITY.default
  const lower = leagueName.toLowerCase()
  for (const [key, val] of Object.entries(LEAGUE_QUALITY)) {
    if (lower.includes(key.toLowerCase())) return val
  }
  return LEAGUE_QUALITY.default
}

// ─── Team-Mapping ────────────────────────────────────────────────────────────

const NAME_MAP = {
  'Deutschland':'germany','Frankreich':'france','Spanien':'spain',
  'England':'england','Brasilien':'brazil','Argentinien':'argentina',
  'Portugal':'portugal','Niederlande':'netherlands','Belgien':'belgium',
  'Schweiz':'switzerland','Kroatien':'croatia','Dänemark':'denmark',
  'Schweden':'sweden','Norwegen':'norway','Österreich':'austria',
  'Tschechien':'czechia','Türkei':'turkey','Schottland':'scotland',
  'Bosnien-Herzegowina':'bosnia','Bosnien und Herzegowina':'bosnia',
  'Serbien':'serbia','Uruguay':'uruguay','Kolumbien':'colombia',
  'Ecuador':'ecuador','Mexiko':'mexico','USA':'usa','Vereinigte Staaten':'usa',
  'Kanada':'canada','Panama':'panama','Paraguay':'paraguay','Japan':'japan',
  'Südkorea':'south_korea','Australien':'australia','Iran':'iran',
  'Saudi-Arabien':'saudi_arabia','Katar':'qatar','Jordanien':'jordan',
  'Usbekistan':'uzbekistan','Marokko':'morocco','Senegal':'senegal',
  'Ägypten':'egypt','Tunesien':'tunisia','Algerien':'algeria','Ghana':'ghana',
  'Südafrika':'south_africa','Elfenbeinküste':'ivory_coast',
  'DR Kongo':'congo_dr','Kap Verde':'cape_verde','Haiti':'haiti',
  'Curaçao':'curacao','Neuseeland':'new_zealand','Irak':'iraq',
  'Germany':'germany','France':'france','Spain':'spain','Brazil':'brazil',
  'Argentina':'argentina','Netherlands':'netherlands','Belgium':'belgium',
  'Switzerland':'switzerland','Croatia':'croatia','Denmark':'denmark',
  'Sweden':'sweden','Norway':'norway','Austria':'austria',
  'Czech Republic':'czechia','Turkey':'turkey','Scotland':'scotland',
  'Bosnia and Herzegovina':'bosnia','Serbia':'serbia','Colombia':'colombia',
  'Mexico':'mexico','United States':'usa','Canada':'canada',
  'South Korea':'south_korea','Korea Republic':'south_korea',
  'Australia':'australia','Saudi Arabia':'saudi_arabia','Qatar':'qatar',
  'Jordan':'jordan','Uzbekistan':'uzbekistan','Morocco':'morocco',
  'Egypt':'egypt','Tunisia':'tunisia','Algeria':'algeria',
  'South Africa':'south_africa',"Ivory Coast":'ivory_coast',
  "Côte d'Ivoire":'ivory_coast','DR Congo':'congo_dr','Cape Verde':'cape_verde',
  'New Zealand':'new_zealand','Iraq':'iraq',
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))
function norm(n) { return n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim() }
function similarity(a, b) {
  const na=norm(a), nb=norm(b)
  if (na===nb) return 1
  if (na.includes(nb)||nb.includes(na)) return 0.9
  const sa=new Set(na.split(' ')), sb=new Set(nb.split(' '))
  return [...sa].filter(w=>sb.has(w)).length / new Set([...sa,...sb]).size
}
function bestMatch(name, players) {
  let top=null, score=0
  for (const p of players) { const s=similarity(name,p.name); if(s>score){score=s;top=p} }
  return score>=0.6 ? {player:top,score} : null
}
function r3(v) { return Math.round(v*1000)/1000 }
function pct(v) { return Math.round(v*10)/10 }  // Prozent 1 Dezimalstelle

async function dbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json', 'Range-Unit': 'items', Range: '0-999',
    }
  })
  if (!r.ok) throw new Error(`DB GET ${r.status}`)
  return r.json()
}

// Paginiert — lädt alle Spieler aus der DB (>1000 werden in Seiten à 1000 geholt)
async function dbGetAll(path) {
  const all = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json', 'Range-Unit': 'items',
        Range: `${offset}-${offset + PAGE - 1}`,
      }
    })
    if (!r.ok) throw new Error(`DB GET ${r.status}`)
    const page = await r.json()
    all.push(...page)
    if (page.length < PAGE) break
    offset += PAGE
  }
  return all
}
async function dbPatch(id, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error(`DB PATCH ${r.status}`)
}

let BUILD_ID = null
function getBuildId() {
  if (BUILD_ID) return BUILD_ID
  try { BUILD_ID = JSON.parse(document.getElementById('__NEXT_DATA__').textContent).buildId }
  catch(e) { throw new Error('Build-ID nicht gefunden') }
  return BUILD_ID
}
async function nextFetch(path) {
  const r = await fetch(`/_next/data/${getBuildId()}/${path}.json`, { credentials:'include', headers:{accept:'application/json'} })
  if (!r.ok) throw new Error(`_next/data ${r.status}`)
  return r.json()
}

// ─── Beste Liga im JSON finden ───────────────────────────────────────────────
// Scannt ALLE Strings im JSON und nimmt die mit dem höchsten Qualitätskoeff.
// So wird "Bundesliga" einer "Czech Cup" oder "Friendlies" vorgezogen.

function findBestLeague(obj) {
  const candidates = new Set()
  const search = (o, d=0) => {
    if (!o || d > 14) return
    if (typeof o === 'string' && o.length > 3 && o.length < 60 && !/^\d/.test(o.trim())) {
      candidates.add(o.trim())
    } else if (Array.isArray(o)) {
      for (const i of o) search(i, d+1)
    } else if (typeof o === 'object') {
      for (const v of Object.values(o)) search(v, d+1)
    }
  }
  search(obj)
  let best = null, bestQ = -1
  for (const s of candidates) {
    const q = leagueQuality(s)
    if (q > bestQ) { bestQ = q; best = s }
  }
  return { league: best, quality: bestQ }
}

// ─── Stats-Extraktion — alle relevanten Felder ───────────────────────────────

function extractStats(obj) {
  const s = {
    xgPer90:null, xgaPer90:null, xaPer90:null,
    defensiveContribPer90:null, tacklesPer90:null,
    interceptionsPer90:null, clearancesPer90:null,
    aerialDuelsWonPct:null, goalsConcededPer90:null,
    cleanSheetsTotal:null, goalsConcededTotal:null,
    minutesCandidates:[], minutes:null, league:null,
  }

  const scan = (o, depth=0) => {
    if (!o || typeof o !== 'object' || depth > 10) return

    // Liga-Name
    if (!s.league) {
      const n = o.leagueName ?? o.competitionName ?? o.tournamentName
        ?? o.league?.name ?? o.competition?.name ?? o.tournament?.name
      if (typeof n==='string' && n.length>3 && !/^\d/.test(n)) s.league = n
    }

    if (Array.isArray(o)) {
      for (const item of o) {
        if (!item || typeof item !== 'object') { scan(item, depth+1); continue }

        // Key-Label des Stat-Items
        const key = norm(String(item.key ?? item.title ?? item.name ?? item.statKey ?? item.statName ?? ''))
        const per90 = parseFloat(item.per90Value ?? item.per90 ?? '')
        const total  = parseFloat(item.value ?? item.stat?.value ?? '')
        // Bevorzuge per90-Wert; bei Minuten und Prozentwerten den Gesamtwert
        const val = !isNaN(per90) ? per90 : total

        if (!isNaN(val) && val >= 0) {
          // ─ Offensiv ──────────────────────────────────────────────────────
          if (val < 10) {
            if ((key==='expected_goals'||key==='xc'||key==='xg'||key==='expected goals (xc)'||key==='expected goals') && !key.includes('against') && !key.includes('xa') && s.xgPer90===null)
              s.xgPer90 = r3(val)
            if ((key==='expected_assists'||key==='xa'||key==='expected assists (xa)'||key==='expected assists') && s.xaPer90===null)
              s.xaPer90 = r3(val)
          }
          // ─ Defensiv (on pitch) ───────────────────────────────────────────
          if (val < 20) {
            if ((key.includes('xc against')||key.includes('xg against')||key==='xc against while on pitch'||key==='xg against while on pitch'||key==='goals_conceded_xg'||key==='xga') && s.xgaPer90===null)
              s.xgaPer90 = r3(val)
            if ((key==='defensive contributions'||key==='defensive_contributions') && s.defensiveContribPer90===null)
              s.defensiveContribPer90 = r3(val)
            if (key==='tackles' && s.tacklesPer90===null)
              s.tacklesPer90 = r3(val)
            if (key==='interceptions' && s.interceptionsPer90===null)
              s.interceptionsPer90 = r3(val)
            if (key==='clearances' && s.clearancesPer90===null)
              s.clearancesPer90 = r3(val)
            // Goals conceded: per90 wenn < 5, sonst Saisontotal
            if (key==='goals conceded while on pitch'||key==='goals_conceded'||key==='goals conceded') {
              const gcPer90 = !isNaN(per90) ? per90 : (val < 5 ? val : NaN)
              const gcTotal = !isNaN(total) ? total : (val >= 5 ? val : NaN)
              if (!isNaN(gcPer90) && s.goalsConcededPer90===null) s.goalsConcededPer90 = r3(gcPer90)
              else if (!isNaN(gcTotal) && gcTotal < 150 && s.goalsConcededTotal===null) s.goalsConcededTotal = Math.round(gcTotal)
            }
            // Clean sheets: immer als Total (kein sinnvoller per90-Wert)
            if ((key==='clean sheets'||key==='clean_sheets') && s.cleanSheetsTotal===null)
              s.cleanSheetsTotal = Math.round(!isNaN(total) ? total : val)
          }
          // ─ Prozentwerte ──────────────────────────────────────────────────
          if (val >= 0 && val <= 100) {
            if ((key==='aerial duels won %'||key==='aerial_duels_won'||key.includes('aerial duels won')) && s.aerialDuelsWonPct===null)
              s.aerialDuelsWonPct = pct(val)
          }
          // ─ Minuten: alle Kandidaten sammeln, am Ende wird der größte reale Wert gewählt
          if (key==='minutes_played'||key==='minutes'||key==='mins') {
            const m = !isNaN(total) && total > 0 ? Math.round(total) : (!isNaN(val) && val > 0 ? Math.round(val) : 0)
            if (m > 0) s.minutesCandidates.push(m)
          }
        }

        scan(item, depth+1)
      }
      return
    }

    for (const [k, v] of Object.entries(o)) {
      const key = k.toLowerCase()
      if (typeof v === 'number' && v >= 0) {
        if (v < 10) {
          if ((key==='xg'||key==='expected_goals') && !key.includes('against') && s.xgPer90===null) s.xgPer90=r3(v)
          if ((key==='xa'||key==='expected_assists') && s.xaPer90===null) s.xaPer90=r3(v)
          if ((key==='xga'||key==='expected_goals_against') && s.xgaPer90===null) s.xgaPer90=r3(v)
        }
        if (v < 20) {
          if (key==='tackles' && s.tacklesPer90===null) s.tacklesPer90=r3(v)
          if (key==='interceptions' && s.interceptionsPer90===null) s.interceptionsPer90=r3(v)
          if (key==='clearances' && s.clearancesPer90===null) s.clearancesPer90=r3(v)
          if ((key==='defensive_contributions'||key==='defensivecontributions') && s.defensiveContribPer90===null) s.defensiveContribPer90=r3(v)
        }
        if (key==='minutesplayed'||key==='minutes_played') s.minutesCandidates.push(Math.round(v))
      }
      if (v && typeof v==='object') scan(v, depth+1)
    }
  }

  scan(obj)

  // Minuten: Saisontotal = größter Wert ≥ 250 (Spielminuten einer Partie sind ≤ 120)
  // Unter 250 = Einzelspiel oder sehr wenige Einsätze → auf null setzen
  const seasonMins = s.minutesCandidates.filter(m => m >= 250)
  s.minutes = seasonMins.length > 0 ? Math.max(...seasonMins) : null

  // Beste Liga aus dem gesamten JSON holen (schlägt Cups/Friendlies)
  const bestLeague = findBestLeague(obj)
  if (bestLeague.league && bestLeague.quality >= leagueQuality(s.league ?? '')) {
    s.league = bestLeague.league
  }

  return s
}

// ─── Squad + Player Stats ─────────────────────────────────────────────────────

async function getSquad(fotmobId, slug) {
  for (const fetchFn of [
    () => nextFetch(`de/teams/${fotmobId}/squad/${slug}`),
    () => fetch(`https://www.fotmob.com/de/teams/${fotmobId}/squad/${slug}`,{credentials:'include'})
           .then(r=>r.text()).then(html=>{
             const nd=new DOMParser().parseFromString(html,'text/html').getElementById('__NEXT_DATA__')
             return nd ? JSON.parse(nd.textContent) : null
           }),
  ]) {
    try {
      const data = await fetchFn()
      if (!data) continue
      const players=[], seen=new Set()
      const find=(o,d=0)=>{
        if(!o||typeof o!=='object'||d>8)return
        if(Array.isArray(o)){for(const i of o){if(i?.id&&i?.name&&typeof i.name==='string'&&!seen.has(String(i.id))){seen.add(String(i.id));players.push({fotmobId:String(i.id),name:i.name,slug:i.pageUrl?.split('/').pop()??norm(i.name).replace(/\s/g,'-')})}find(i,d+1)}}
        else for(const v of Object.values(o))if(v&&typeof v==='object')find(v,d+1)
      }
      find(data?.pageProps??data?.props?.pageProps??data)
      if(players.length>0){console.log(`  ✓ ${players.length} Spieler`);return players}
    } catch(e){console.log(`  ↳ ${e.message}`)}
  }
  return []
}

async function getPlayerStats(fotmobId, slug) {
  for (const path of [`de/players/${fotmobId}/${slug}`, `de/players/${fotmobId}/overview/${slug}`]) {
    try {
      const data = await nextFetch(path)
      const stats = extractStats(data?.pageProps??data)
      if (Object.values(stats).some(v=>v!==null&&v!==undefined)) return stats
    } catch(e){}
  }
  return extractStats({})
}

// ─── DOM Team-Extraktion ──────────────────────────────────────────────────────

function extractTeamsFromDOM() {
  const found = new Map()
  for (const link of document.querySelectorAll('a[href*="/teams/"]')) {
    const m = link.href.match(/\/teams\/(\d+)\/(?:overview|squad|kader|mannschaft)\/([^/?#]+)/)
    if (!m||found.has(m[1])) continue
    let name = link.querySelector('[class*="Name"],[class*="name"],span,p')?.textContent?.trim()??link.textContent?.trim()??''
    if (!name||name.length<2) name=m[2].split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')
    found.set(m[1],{name:name.trim(),slug:m[2]})
  }
  return found
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log('%c  FotMob xG-Import v9  —  WM 2026 DB     ', 'color:#4ade80;font-weight:bold')
  console.log('%c  xG·xA·xGA·Def·Tackles·Clearances·GK    ', 'color:#4ade80')
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log(DRY_RUN?'%c⚠  TESTLAUF':'%c✏  SCHREIBMODUS','color:orange;font-weight:bold')

  try{console.log(`  Build-ID: ${getBuildId()}`)}
  catch(e){console.error('❌',e.message);return}

  if (!location.href.includes('/leagues/77/')) {
    console.warn('%c⚠  Bitte auf der WM-Teams-Seite ausführen:','color:orange')
    console.warn('   https://www.fotmob.com/de/leagues/77/overview/world-cup/teams')
    return
  }

  console.log('\n📥 Lade Spieler aus DB (paginiert)...')
  let dbPlayers
  try {
    dbPlayers = await dbGetAll('players?select=id,name,team_id,position,xg_per90,xga_per90,xa_per90,minutes_played,league_name&order=team_id')
  } catch(e){console.error('❌',e.message);return}
  console.log(`  ✓ ${dbPlayers.length} Spieler (${[...new Set(dbPlayers.map(p=>p.team_id))].length} Teams)`)
  const byTeam={}
  for(const p of dbPlayers){(byTeam[p.team_id]??=[]).push(p)}

  console.log('\n🔍 Teams aus DOM...')
  const domTeams=extractTeamsFromDOM()
  const teams=[]
  for(const [fotmobId,{name,slug}] of domTeams){
    const id=NAME_MAP[name]
    if(id) teams.push({fotmobId,name,slug,internalId:id})
    else   console.log(`  ⚠ kein Mapping: "${name}"`)
  }
  console.log(`  ✓ ${teams.length}/${domTeams.size} Teams gemappt`)

  const filtered=ONLY_TEAM?teams.filter(t=>t.internalId===ONLY_TEAM):teams
  const st={teams:0,players:0,matched:0,updated:0,noMatch:[],errors:[]}

  for(const team of filtered){
    const dbTeam=byTeam[team.internalId]??[]
    if(dbTeam.length===0){console.log(`\n⏭  ${team.internalId}: kein Kader`);continue}
    console.log(`\n🏳  ${team.name} (${team.fotmobId}) → ${team.internalId} | DB: ${dbTeam.length}`)

    const squad=await getSquad(team.fotmobId,team.slug)
    await sleep(RATE_MS)
    if(squad.length===0){console.log('  ⚠ Kein Kader');st.errors.push(`${team.internalId}: leer`);continue}
    st.teams++

    for(const fp of squad){
      st.players++
      const match=bestMatch(fp.name,dbTeam)
      if(!match){st.noMatch.push(`${team.internalId}: "${fp.name}"`);continue}
      st.matched++

      const raw=await getPlayerStats(fp.fotmobId,fp.slug)
      await sleep(RATE_MS)

      const lq=leagueQuality(raw.league)
      const pos=match.player.position  // 'GK','DEF','MID','FWD'
      const update={}

      // Minuten: nur schreiben wenn Saisontotal gefunden (>= 250); nie null schreiben
      if(raw.minutes !== null)    update.minutes_played = raw.minutes
      if(raw.league !== null)     update.league_name = raw.league

      // Hilfsfunktion: Goals conceded per90 — direkt oder aus Total berechnen
      const gcPer90 = () => {
        if (raw.goalsConcededPer90 !== null && raw.goalsConcededPer90 < 5) return r3(raw.goalsConcededPer90)
        if (raw.goalsConcededTotal !== null && raw.minutes > 0)
          return r3(raw.goalsConcededTotal / (raw.minutes / 90))
        return null
      }

      // Hilfsfunktion: Clean sheets per90 aus Total + Minuten
      const csPer90 = () => {
        if (raw.cleanSheetsTotal === null) return null
        if (raw.minutes > 0) return r3(raw.cleanSheetsTotal / (raw.minutes / 90))
        return null  // ohne Minuten nicht berechenbar
      }

      // ─ Offensiv (FWD, MID — und DEF als Bonus) ───────────────────────────
      if(pos!=='GK'){
        if(raw.xgPer90!==null) update.xg_per90 = r3(raw.xgPer90*lq)
        if(raw.xaPer90!==null) update.xa_per90 = r3(raw.xaPer90*lq)
      }

      // ─ Defensiv (DEF + GK) ───────────────────────────────────────────────
      if(pos==='DEF'||pos==='GK'){
        if(raw.xgaPer90!==null)              update.xga_per90                    = r3(raw.xgaPer90*lq)
        const gc=gcPer90(); if(gc!==null)    update.goals_conceded_per90         = gc
        const cs=csPer90(); if(cs!==null)    update.clean_sheets_per90           = cs
        if(raw.defensiveContribPer90!==null) update.defensive_contributions_per90 = r3(raw.defensiveContribPer90)
        if(raw.tacklesPer90!==null)          update.tackles_per90                = r3(raw.tacklesPer90)
        if(raw.interceptionsPer90!==null)    update.interceptions_per90          = r3(raw.interceptionsPer90)
        if(raw.clearancesPer90!==null)       update.clearances_per90             = r3(raw.clearancesPer90)
        if(raw.aerialDuelsWonPct!==null)     update.aerial_duels_won_pct         = raw.aerialDuelsWonPct
      }

      // ─ MID erhält auch xGA (Pressingindikator) ────────────────────────────
      if(pos==='MID'){
        if(raw.xgaPer90!==null) update.xga_per90 = r3(raw.xgaPer90*lq)
        if(raw.defensiveContribPer90!==null) update.defensive_contributions_per90 = r3(raw.defensiveContribPer90)
        if(raw.tacklesPer90!==null) update.tackles_per90 = r3(raw.tacklesPer90)
        if(raw.interceptionsPer90!==null) update.interceptions_per90 = r3(raw.interceptionsPer90)
      }

      if(Object.keys(update).length===0) continue

      const conf=match.score>=0.95?'✓':`~${Math.round(match.score*100)}%`
      const lqStr=raw.league?` [${raw.league.slice(0,20)} ×${lq}]`:''
      const statStr=[
        update.xg_per90!==undefined?`xG=${update.xg_per90}`:'',
        update.xa_per90!==undefined?`xA=${update.xa_per90}`:'',
        update.xga_per90!==undefined?`xGA=${update.xga_per90}`:'',
        update.defensive_contributions_per90!==undefined?`DC=${update.defensive_contributions_per90}`:'',
        update.tackles_per90!==undefined?`T=${update.tackles_per90}`:'',
        update.clearances_per90!==undefined?`Cl=${update.clearances_per90}`:'',
        update.aerial_duels_won_pct!==undefined?`AD=${update.aerial_duels_won_pct}%`:'',
        update.goals_conceded_per90!==undefined?`GC=${update.goals_conceded_per90}`:'',
        update.clean_sheets_per90!==undefined?`CS/90=${update.clean_sheets_per90}(total:${raw.cleanSheetsTotal})`:'',
        update.minutes_played!=null?`${update.minutes_played}min`:'',
      ].filter(Boolean).join('  ')

      console.log(`  ✎ [${conf}] ${fp.name} → ${match.player.name} [${pos}]${lqStr}\n      ${statStr}`)

      if(!DRY_RUN){
        try{await dbPatch(match.player.id,update);st.updated++}
        catch(e){console.log(`    ❌ ${e.message}`);st.errors.push(e.message)}
      } else st.updated++
    }
  }

  const elapsed=((Date.now()-t0)/1000).toFixed(0)
  console.log('%c\n══════════════════════════════════════════','color:#4ade80')
  console.log(`Teams:    ${st.teams}/${filtered.length}`)
  console.log(`Spieler:  ${st.players} | ${st.matched} gematcht | ${st.updated} ${DRY_RUN?'würden':'wurden'} gespeichert`)
  console.log(`Laufzeit: ${elapsed}s`)
  if(st.noMatch.length){console.log(`\n⚠ Kein Match (${st.noMatch.length}):`);st.noMatch.slice(0,15).forEach(x=>console.log(' ',x))}
  if(st.errors.length) {console.log(`\n❌ Fehler (${st.errors.length}):`); st.errors.slice(0,5).forEach(x=>console.log(' ',x))}
  console.log(DRY_RUN?'%c\n💡 DRY_RUN=false zum Speichern':'%c\n✅ Fertig!',DRY_RUN?'color:orange':'color:#4ade80;font-weight:bold')
}

main()
