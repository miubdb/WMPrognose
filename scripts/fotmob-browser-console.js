/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FotMob → WM2026 DB  —  BROWSER-KONSOLEN-SKRIPT v2     ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  ANLEITUNG:                                             ║
 * ║  1. Öffne https://www.fotmob.com/de im Browser          ║
 * ║  2. Drücke F12 → Reiter "Console"                       ║
 * ║  3. Füge diesen kompletten Code ein                     ║
 * ║  4. Drücke Enter                                        ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const SUPABASE_URL = 'https://bcwcgwoppuueduvzoyqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd2Nnd29wcHV1ZWR1dnpveXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQ2NTcsImV4cCI6MjA5NDg0MDY1N30.U-J9aSUopsWyZSy_McLpG7RQQAxRayY7XsHCDUbnWiM'

const DRY_RUN   = false   // false = wirklich speichern
const ONLY_TEAM = ''      // '' = alle; z.B. 'germany' für nur ein Team
const RATE_LIMIT_MS = 350

// Mapping FotMob-Ländername → interne team_id
const TEAM_NAME_MAP = {
  'Germany': 'germany', 'Deutschland': 'germany',
  'France': 'france', 'Frankreich': 'france',
  'Spain': 'spain', 'Spanien': 'spain',
  'England': 'england',
  'Brazil': 'brazil', 'Brasilien': 'brazil',
  'Argentina': 'argentina', 'Argentinien': 'argentina',
  'Portugal': 'portugal',
  'Netherlands': 'netherlands', 'Niederlande': 'netherlands',
  'Belgium': 'belgium', 'Belgien': 'belgium',
  'Switzerland': 'switzerland', 'Schweiz': 'switzerland',
  'Croatia': 'croatia', 'Kroatien': 'croatia',
  'Denmark': 'denmark', 'Dänemark': 'denmark',
  'Sweden': 'sweden', 'Schweden': 'sweden',
  'Norway': 'norway', 'Norwegen': 'norway',
  'Austria': 'austria', 'Österreich': 'austria',
  'Czech Republic': 'czechia', 'Tschechien': 'czechia', 'Czechia': 'czechia',
  'Turkey': 'turkey', 'Türkei': 'turkey',
  'Scotland': 'scotland', 'Schottland': 'scotland',
  'Bosnia and Herzegovina': 'bosnia', 'Bosnien-Herzegowina': 'bosnia',
  'Serbia': 'serbia', 'Serbien': 'serbia',
  'Uruguay': 'uruguay',
  'Colombia': 'colombia', 'Kolumbien': 'colombia',
  'Ecuador': 'ecuador',
  'Mexico': 'mexico', 'Mexiko': 'mexico',
  'USA': 'usa', 'United States': 'usa',
  'Canada': 'canada', 'Kanada': 'canada',
  'Panama': 'panama',
  'Paraguay': 'paraguay',
  'Japan': 'japan',
  'South Korea': 'south_korea', 'Korea Republic': 'south_korea', 'Südkorea': 'south_korea',
  'Australia': 'australia', 'Australien': 'australia',
  'Iran': 'iran',
  'Saudi Arabia': 'saudi_arabia', 'Saudi-Arabien': 'saudi_arabia',
  'Qatar': 'qatar', 'Katar': 'qatar',
  'Jordan': 'jordan', 'Jordanien': 'jordan',
  'Uzbekistan': 'uzbekistan', 'Usbekistan': 'uzbekistan',
  'Morocco': 'morocco', 'Marokko': 'morocco',
  'Senegal': 'senegal',
  'Egypt': 'egypt', 'Ägypten': 'egypt',
  'Tunisia': 'tunisia', 'Tunesien': 'tunisia',
  'Algeria': 'algeria', 'Algerien': 'algeria',
  'Ghana': 'ghana',
  'South Africa': 'south_africa', 'Südafrika': 'south_africa',
  "Ivory Coast": 'ivory_coast', "Côte d'Ivoire": 'ivory_coast', 'Elfenbeinküste': 'ivory_coast',
  'DR Congo': 'congo_dr', 'Congo DR': 'congo_dr', 'Kongo DR': 'congo_dr',
  'Cape Verde': 'cape_verde', 'Kap Verde': 'cape_verde',
  'Haiti': 'haiti',
  'Curaçao': 'curacao', 'Curacao': 'curacao',
  'New Zealand': 'new_zealand', 'Neuseeland': 'new_zealand',
  'Iraq': 'iraq', 'Irak': 'iraq',
}

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))

function normalize(n) {
  return n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim()
}
function nameSimilarity(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const sa = new Set(na.split(' ')), sb = new Set(nb.split(' '))
  const inter = [...sa].filter(w => sb.has(w)).length
  return inter / new Set([...sa,...sb]).size
}
function findBestMatch(name, players) {
  let best = null, top = 0
  for (const p of players) {
    const s = nameSimilarity(name, p.name)
    if (s > top) { top = s; best = p }
  }
  return top >= 0.6 ? { player: best, score: top } : null
}

async function fotmobGet(path) {
  const r = await fetch(`https://www.fotmob.com/api/${path}`, {
    credentials: 'include',
    headers: { accept: 'application/json', 'accept-language': 'de-DE,de;q=0.9' }
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${path}`)
  return r.json()
}
async function supabaseGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' }
  })
  if (!r.ok) throw new Error(`Supabase ${r.status}`)
  return r.json()
}
async function supabasePatch(id, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error(`Supabase PATCH ${r.status}`)
}

// ─── Team-ID-Erkennung aus Match-Daten ──────────────────────────────────────
// Nutzt den /api/matches Endpoint (war im Network-Tab mit 200 sichtbar)
// Iteriert über WM-Spieltage und sammelt alle Team-IDs

async function discoverTeamIds() {
  console.log('🔍 Erkenne FotMob-Team-IDs aus Spieldaten...')
  const discovered = new Map() // teamName → fotmobId

  // WM 2026 Gruppenphase: ca. 11. Juni – 27. Juni 2026
  // Zusätzlich heute (06.06) falls schon Spiele stattfinden
  const dates = []
  for (let d = 6; d <= 27; d++) {
    dates.push(`202606${String(d).padStart(2,'0')}`)
  }
  for (let d = 1; d <= 10; d++) {
    dates.push(`202607${String(d).padStart(2,'0')}`)
  }

  for (const date of dates) {
    let data
    try {
      data = await fotmobGet(`matches?date=${date}&timezone=Europe%2FBerlin&ccode3=DEU&includeNextDayLateNight=true`)
      await sleep(150)
    } catch(e) {
      continue
    }

    // Durchsuche alle Ligen nach WM (id=77 oder Name enthält "World Cup" / "WM")
    const leagues = data?.leagues ?? []
    for (const league of leagues) {
      const isWM = league.id === 77
        || String(league.primaryId) === '77'
        || String(league.name ?? '').toLowerCase().includes('world cup')
        || String(league.name ?? '').toLowerCase().includes('wm')
      if (!isWM) continue

      for (const match of (league.matches ?? [])) {
        const home = match.home ?? match.homeTeam
        const away = match.away ?? match.awayTeam
        if (home?.id && home?.name) discovered.set(home.name, String(home.id))
        if (away?.id && away?.name) discovered.set(away.name, String(away.id))
      }
    }
  }

  if (discovered.size === 0) {
    // Fallback: versuche nextLeagueMatch?id=77
    try {
      const next = await fotmobGet('nextLeagueMatch?id=77')
      const home = next?.homeTeam ?? next?.home
      const away = next?.awayTeam ?? next?.away
      if (home?.id && home?.name) discovered.set(home.name, String(home.id))
      if (away?.id && away?.name) discovered.set(away.name, String(away.id))
    } catch(e) {}
  }

  console.log(`  → ${discovered.size} Teams aus Spieldaten erkannt:`)
  for (const [name, id] of discovered) {
    const internalId = TEAM_NAME_MAP[name] ?? '?'
    console.log(`     ${name} (FotMob-ID: ${id}) → ${internalId}`)
  }
  return discovered
}

// ─── Squad + Player Stats ────────────────────────────────────────────────────

async function getSquad(fotmobId) {
  // Versuche mehrere Endpoint-Varianten
  const paths = [
    `teams?id=${fotmobId}&ccode3=DEU`,
    `teams?id=${fotmobId}`,
    `team?id=${fotmobId}&ccode3=DEU`,
  ]
  for (const path of paths) {
    try {
      const data = await fotmobGet(path)
      const players = []
      // Struktur 1: data.squads[].members[]
      for (const sq of (data?.squads ?? [])) {
        for (const m of (sq?.members ?? [])) {
          if (m?.id && m?.name) players.push({ fotmobId: String(m.id), name: m.name })
        }
      }
      // Struktur 2: data.squad[]
      for (const p of (data?.squad ?? [])) {
        if (p?.id && p?.name) players.push({ fotmobId: String(p.id), name: p.name })
      }
      // Struktur 3: data.players[]
      for (const p of (data?.players ?? [])) {
        if (p?.id && p?.name) players.push({ fotmobId: String(p.id), name: p.name })
      }
      if (players.length > 0) return players
    } catch(e) { /* nächste Variante */ }
    await sleep(150)
  }
  return []
}

async function getPlayerStats(fotmobId) {
  let data
  try {
    data = await fotmobGet(`playerData?id=${fotmobId}`)
  } catch(e) { return { xgPer90: null, xgaPer90: null } }

  let xgPer90 = null, xgaPer90 = null

  // Rekursiv alle stat-ähnlichen Felder durchsuchen
  const search = (obj, d = 0) => {
    if (d > 8 || !obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      const key = k.toLowerCase()
      if (typeof v === 'number' && v >= 0 && v < 8) {
        if ((key === 'xg' || key === 'expected_goals' || key === 'expectedgoals') && !key.includes('against') && !key.includes('xa')) {
          xgPer90 = Math.round(v * 1000) / 1000
        }
        if (key === 'xga' || key === 'expected_goals_against' || key === 'expectedgoalsagainst') {
          xgaPer90 = Math.round(v * 1000) / 1000
        }
      }
      if (typeof v === 'string') {
        const num = parseFloat(v)
        if (!isNaN(num) && num >= 0 && num < 8) {
          if ((key === 'per90value' || key === 'per90') && xgPer90 === null) {
            // Per90-Werte werden im Kontext ihrer übergeordneten Key verwendet
          }
        }
      }
      if (typeof v === 'object') search(v, d + 1)
    }
    // Auch items-Arrays mit key+value Struktur
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (!item || typeof item !== 'object') continue
        const key = String(item.key ?? item.title ?? item.name ?? '').toLowerCase()
        const per90 = parseFloat(item.per90Value ?? item.per90 ?? '')
        const total  = parseFloat(item.value ?? item.stat?.value ?? '')
        const val = !isNaN(per90) ? per90 : total

        if (isNaN(val) || val < 0 || val >= 8) continue
        if ((key.includes('expected_goals') || key === 'xg') && !key.includes('against')) {
          xgPer90 = Math.round(val * 1000) / 1000
        }
        if (key.includes('expected_goals_against') || key === 'xga') {
          xgaPer90 = Math.round(val * 1000) / 1000
        }
      }
    }
  }
  search(data)

  return { xgPer90, xgaPer90 }
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()
  console.log('%c══════════════════════════════════════════════', 'color:#4ade80')
  console.log('%c  FotMob → WM2026 DB  —  xG/xGA Import v2   ', 'color:#4ade80;font-weight:bold')
  console.log('%c══════════════════════════════════════════════', 'color:#4ade80')
  console.log(DRY_RUN ? '%c⚠  TESTLAUF (kein Speichern)' : '%c✏  SCHREIBMODUS', 'color:orange')

  // 1. DB-Spieler laden
  console.log('\n📥 Lade Spieler aus DB...')
  let dbPlayers
  try {
    dbPlayers = await supabaseGet('players?select=id,name,team_id,position,xg_per90,xga_per90&order=team_id')
  } catch(e) { console.error('❌ DB-Fehler:', e.message); return }
  console.log(`  ✓ ${dbPlayers.length} Spieler`)
  const byTeam = {}
  for (const p of dbPlayers) { (byTeam[p.team_id] ??= []).push(p) }

  // 2. FotMob-Team-IDs aus Spieldaten ermitteln
  const fotmobIdMap = await discoverTeamIds() // name → fotmobId

  if (fotmobIdMap.size === 0) {
    console.error('❌ Keine Team-IDs gefunden.')
    console.error('→ Gehe auf fotmob.com auf die WM-Übersicht und probiere erneut.')
    return
  }

  // 3. Alle erkannten Teams durchgehen
  const stats = { teams:0, players:0, matched:0, updated:0, noMatch:[], errors:[] }

  for (const [fotmobName, fotmobId] of fotmobIdMap) {
    const internalId = TEAM_NAME_MAP[fotmobName]
    if (!internalId) { console.log(`⏭  "${fotmobName}" → kein Mapping`); continue }
    if (ONLY_TEAM && internalId !== ONLY_TEAM) continue

    const dbTeam = byTeam[internalId] ?? []
    if (dbTeam.length === 0) { console.log(`⏭  ${internalId}: kein Kader in DB`); continue }

    console.log(`\n🏳  ${fotmobName} (ID ${fotmobId}) → ${internalId} | DB: ${dbTeam.length} Spieler`)

    const squad = await getSquad(fotmobId)
    await sleep(RATE_LIMIT_MS)

    if (squad.length === 0) {
      console.log(`  ⚠ Kein Kader von FotMob erhalten`)
      stats.errors.push(`${internalId}: Kader leer`)
      continue
    }
    console.log(`  FotMob: ${squad.length} Spieler`)
    stats.teams++

    for (const fp of squad) {
      stats.players++
      const match = findBestMatch(fp.name, dbTeam)
      if (!match) { stats.noMatch.push(`${internalId}: "${fp.name}"`); continue }
      stats.matched++

      const { xgPer90, xgaPer90 } = await getPlayerStats(fp.fotmobId)
      await sleep(RATE_LIMIT_MS)

      if (xgPer90 === null && xgaPer90 === null) continue

      const update = {}
      if (xgPer90  !== null) update.xg_per90  = xgPer90
      if (xgaPer90 !== null) update.xga_per90 = xgaPer90

      const conf = match.score >= 0.95 ? '✓' : `~${Math.round(match.score*100)}%`
      console.log(
        `  ✎ [${conf}] "${fp.name}" → "${match.player.name}"` +
        (xgPer90  !== null ? `  xG=${xgPer90.toFixed(3)}` : '') +
        (xgaPer90 !== null ? `  xGA=${xgaPer90.toFixed(3)}` : '')
      )

      if (!DRY_RUN) {
        try { await supabasePatch(match.player.id, update); stats.updated++ }
        catch(e) { console.log(`    ❌ DB: ${e.message}`); stats.errors.push(e.message) }
      } else { stats.updated++ }
    }
  }

  // Zusammenfassung
  const elapsed = ((Date.now()-t0)/1000).toFixed(0)
  console.log('\n%c══════════════════════════════════════════════', 'color:#4ade80')
  console.log(`Teams:    ${stats.teams}`)
  console.log(`Spieler:  ${stats.players} gesehen | ${stats.matched} gematcht | ${stats.updated} ${DRY_RUN?'würden':'wurden'} gespeichert`)
  console.log(`Laufzeit: ${elapsed}s`)
  if (stats.noMatch.length) { console.log(`\nOhne Match (${stats.noMatch.length}):`); stats.noMatch.slice(0,10).forEach(x=>console.log(' ',x)) }
  if (stats.errors.length)  { console.log(`\nFehler (${stats.errors.length}):`);  stats.errors.slice(0,5).forEach(x=>console.log(' ',x)) }
  if (DRY_RUN) console.log('%c\n💡 Setze DRY_RUN=false um zu speichern', 'color:orange')
  else console.log('%c\n✅ Fertig!', 'color:#4ade80;font-weight:bold')
}

main()
