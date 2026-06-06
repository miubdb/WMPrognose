/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FotMob → WM2026 DB  —  BROWSER-KONSOLEN-SKRIPT v5     ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  ANLEITUNG:                                             ║
 * ║  1. Öffne: fotmob.com/de/leagues/77/overview/world-cup/teams ║
 * ║  2. Warte bis alle Teams sichtbar sind                  ║
 * ║  3. F12 → Console → Code einfügen → Enter              ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Was dieses Skript speichert:
 *   xg_per90   — Expected Goals pro 90 Min (ligabereinigt)
 *   xga_per90  — xG against while on pitch pro 90 Min
 *   xa_per90   — Expected Assists pro 90 Min (ligabereinigt)
 *   minutes_played — gespielte Minuten (Datenbasis)
 *   league_name    — Liga aus der die Stats stammen
 */

const SUPABASE_URL = 'https://bcwcgwoppuueduvzoyqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd2Nnd29wcHV1ZWR1dnpveXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQ2NTcsImV4cCI6MjA5NDg0MDY1N30.U-J9aSUopsWyZSy_McLpG7RQQAxRayY7XsHCDUbnWiM'

const DRY_RUN   = false
const ONLY_TEAM = ''
const RATE_MS   = 300

// ─── Liga-Qualitäts-Koeffizienten ───────────────────────────────────────────
// Premier League = 1.0 (Referenz). Werte basieren auf UEFA-Länderkoeffizienten
// und Expected-Goals-Kalibrierungen aus der Literatur (Hvattum & Arntzen 2010).
// Zweck: xG/xA aus schwächeren Ligen nach oben/unten skalieren damit
// 0.3 xG/90 in der MLS ≠ 0.3 xG/90 in der Premier League.

const LEAGUE_QUALITY = {
  // Top 5
  'Premier League':          1.00,
  'Bundesliga':              0.95,
  'La Liga':                 0.93,
  'Serie A':                 0.91,
  'Ligue 1':                 0.86,
  // Weitere UEFA
  'Primeira Liga':           0.82,
  'Eredivisie':              0.80,
  'Pro League':              0.78,  // Belgien
  'Jupiler Pro League':      0.78,
  'Super League':            0.75,  // Schweiz / Griechenland
  'Süper Lig':               0.75,
  'Scottish Premiership':    0.72,
  'Ekstraklasa':             0.70,  // Polen
  'Czech Liga':              0.68,
  'Austrian Bundesliga':     0.66,
  'Bundesliga Austria':      0.66,
  'Fortuna Liga':            0.66,
  'Allsvenskan':             0.72,  // Schweden
  'Eliteserien':             0.70,  // Norwegen
  'Superliga':               0.72,  // Dänemark
  'Premiership':             0.72,  // Schottland alias
  // Außereuropa
  'Saudi Pro League':        0.73,
  'MLS':                     0.68,
  'Liga MX':                 0.73,
  'Brasileirão':             0.78,
  'Serie A Brasil':          0.78,
  'Primera División':        0.75,  // Argentinien
  'Liga Profesional':        0.75,
  'Serie A Uruguay':         0.65,
  'Primera División Uruguay':0.65,
  'Primera División Colombia':0.68,
  'Liga Águila':             0.68,
  'Liga Pro':                0.65,  // Ecuador
  'Liga MX Mexico':          0.73,
  'J1 League':               0.75,
  'K League 1':              0.70,
  'A-League':                0.68,
  'Persian Gulf Pro League': 0.68,
  'Botola Pro':              0.62,  // Marokko
  'Ligue Professionnelle 1': 0.62,  // Algerien/Tunesien
  'Premier League Egypt':    0.60,
  'Saudi Professional League':0.73,
  'Qatar Stars League':      0.65,
  'UAE Pro League':          0.67,
  'Uzbekistan Super League': 0.58,
  'Jordan Pro League':       0.55,
  'Iraqi Premier League':    0.54,
  // Fallback
  'default':                 0.75,
}

function leagueQuality(leagueName) {
  if (!leagueName) return LEAGUE_QUALITY.default
  for (const [key, val] of Object.entries(LEAGUE_QUALITY)) {
    if (leagueName.toLowerCase().includes(key.toLowerCase())) return val
  }
  return LEAGUE_QUALITY.default
}

// ─── Team-Mapping ────────────────────────────────────────────────────────────

const NAME_MAP = {
  'Deutschland': 'germany', 'Frankreich': 'france', 'Spanien': 'spain',
  'England': 'england', 'Brasilien': 'brazil', 'Argentinien': 'argentina',
  'Portugal': 'portugal', 'Niederlande': 'netherlands', 'Belgien': 'belgium',
  'Schweiz': 'switzerland', 'Kroatien': 'croatia', 'Dänemark': 'denmark',
  'Schweden': 'sweden', 'Norwegen': 'norway', 'Österreich': 'austria',
  'Tschechien': 'czechia', 'Türkei': 'turkey', 'Schottland': 'scotland',
  'Bosnien-Herzegowina': 'bosnia', 'Bosnien und Herzegowina': 'bosnia',
  'Serbien': 'serbia', 'Uruguay': 'uruguay', 'Kolumbien': 'colombia',
  'Ecuador': 'ecuador', 'Mexiko': 'mexico',
  'USA': 'usa', 'Vereinigte Staaten': 'usa',
  'Kanada': 'canada', 'Panama': 'panama', 'Paraguay': 'paraguay',
  'Japan': 'japan', 'Südkorea': 'south_korea', 'Australien': 'australia',
  'Iran': 'iran', 'Saudi-Arabien': 'saudi_arabia', 'Katar': 'qatar',
  'Jordanien': 'jordan', 'Usbekistan': 'uzbekistan', 'Marokko': 'morocco',
  'Senegal': 'senegal', 'Ägypten': 'egypt', 'Tunesien': 'tunisia',
  'Algerien': 'algeria', 'Ghana': 'ghana', 'Südafrika': 'south_africa',
  'Elfenbeinküste': 'ivory_coast', 'DR Kongo': 'congo_dr', 'Kap Verde': 'cape_verde',
  'Haiti': 'haiti', 'Curaçao': 'curacao', 'Neuseeland': 'new_zealand', 'Irak': 'iraq',
  'Germany': 'germany', 'France': 'france', 'Spain': 'spain', 'Brazil': 'brazil',
  'Argentina': 'argentina', 'Netherlands': 'netherlands', 'Belgium': 'belgium',
  'Switzerland': 'switzerland', 'Croatia': 'croatia', 'Denmark': 'denmark',
  'Sweden': 'sweden', 'Norway': 'norway', 'Austria': 'austria',
  'Czech Republic': 'czechia', 'Turkey': 'turkey', 'Scotland': 'scotland',
  'Bosnia and Herzegovina': 'bosnia', 'Serbia': 'serbia', 'Colombia': 'colombia',
  'Mexico': 'mexico', 'United States': 'usa', 'Canada': 'canada',
  'South Korea': 'south_korea', 'Korea Republic': 'south_korea',
  'Australia': 'australia', 'Saudi Arabia': 'saudi_arabia', 'Qatar': 'qatar',
  'Jordan': 'jordan', 'Uzbekistan': 'uzbekistan', 'Morocco': 'morocco',
  'Egypt': 'egypt', 'Tunisia': 'tunisia', 'Algeria': 'algeria',
  'South Africa': 'south_africa', "Ivory Coast": 'ivory_coast',
  "Côte d'Ivoire": 'ivory_coast', 'DR Congo': 'congo_dr', 'Cape Verde': 'cape_verde',
  'New Zealand': 'new_zealand', 'Iraq': 'iraq',
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

async function dbGet(path) {
  // FIX: limit=2000 statt default 1000 — sonst fehlen Schweden, Tunesien etc.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
      'Range-Unit': 'items',
      'Range': '0-1999',   // Supabase: bis zu 2000 Zeilen
    }
  })
  if (!r.ok) throw new Error(`DB GET ${r.status}`)
  return r.json()
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
  catch(e) { throw new Error('Build-ID nicht gefunden. Bist du auf fotmob.com?') }
  return BUILD_ID
}
async function nextFetch(path) {
  const url = `/_next/data/${getBuildId()}/${path}.json`
  const r = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`_next/data ${r.status}: ${url}`)
  return r.json()
}

// ─── Stats-Extraktion ────────────────────────────────────────────────────────
// Liest xG, xGA, xA, Minutes, League aus der FotMob-Spielerseite

function extractStats(obj) {
  let xgPer90=null, xgaPer90=null, xaPer90=null, minutes=null, league=null

  const scan = (o, depth=0) => {
    if (!o || typeof o !== 'object' || depth > 10) return

    // Liga-Name aus competition/league Feldern
    if (!league) {
      const name = o.leagueName ?? o.competitionName ?? o.tournamentName ?? o.league?.name ?? o.competition?.name
      if (name && typeof name==='string' && name.length>3 && !name.match(/^\d/)) league = name
    }

    if (Array.isArray(o)) {
      for (const item of o) {
        if (!item || typeof item !== 'object') continue

        const key = String(item.key ?? item.title ?? item.name ?? item.statKey ?? item.statName ?? '').toLowerCase()
        const per90 = parseFloat(item.per90Value ?? item.per90 ?? '')
        const total = parseFloat(item.value ?? item.stat?.value ?? '')
        const val   = !isNaN(per90) ? per90 : total

        if (!isNaN(val) && val >= 0 && val < 15) {
          // xG (Expected Goals) — nur Schuss-xG, nicht Gesamtbilanz
          if ((key === 'expected_goals' || key === 'xg' || key === 'xc') && !key.includes('against') && !key.includes('xa') && xgPer90===null)
            xgPer90 = Math.round(val * 1000) / 1000

          // xGA (xG against while on pitch) — Defensivindikator
          if ((key === 'expected_goals_against' || key === 'xga' || key === 'xg_against_while_on_pitch' || key.includes('against while on pitch')) && xgaPer90===null)
            xgaPer90 = Math.round(val * 1000) / 1000

          // xA (Expected Assists)
          if ((key === 'expected_assists' || key === 'xa') && xaPer90===null)
            xaPer90 = Math.round(val * 1000) / 1000

          // Minutes played (nur Total-Wert, kein Per90)
          if ((key === 'minutes_played' || key === 'minutes' || key === 'mins') && isNaN(per90) && minutes===null)
            minutes = Math.round(total)
        }

        scan(item, depth+1)
      }
      return
    }

    for (const [k, v] of Object.entries(o)) {
      const key = k.toLowerCase()
      if (typeof v === 'number' && v >= 0 && v < 15) {
        if ((key==='xg'||key==='expected_goals') && !key.includes('against') && xgPer90===null) xgPer90=Math.round(v*1000)/1000
        if ((key==='xga'||key==='expected_goals_against') && xgaPer90===null) xgaPer90=Math.round(v*1000)/1000
        if ((key==='xa'||key==='expected_assists') && xaPer90===null) xaPer90=Math.round(v*1000)/1000
        if ((key==='minutesplayed'||key==='minutes_played') && minutes===null) minutes=Math.round(v)
      }
      if (v && typeof v==='object') scan(v, depth+1)
    }
  }
  scan(obj)

  return { xgPer90, xgaPer90, xaPer90, minutes, league }
}

// ─── Squad + Player ───────────────────────────────────────────────────────────

async function getSquad(fotmobId, slug) {
  // Versuch 1: _next/data squad
  try {
    const data = await nextFetch(`de/teams/${fotmobId}/squad/${slug}`)
    const players = [], seen = new Set()
    const find = (o, d=0) => {
      if (!o||typeof o!=='object'||d>8) return
      if (Array.isArray(o)) {
        for (const item of o) {
          if (item?.id && item?.name && typeof item.name==='string' && !seen.has(String(item.id))) {
            seen.add(String(item.id))
            players.push({ fotmobId: String(item.id), name: item.name, slug: item.pageUrl?.split('/').pop() ?? norm(item.name).replace(/\s/g,'-') })
          }
          find(item, d+1)
        }
      } else for (const v of Object.values(o)) if(v&&typeof v==='object') find(v,d+1)
    }
    find(data?.pageProps ?? data)
    if (players.length > 0) { console.log(`  ✓ _next/data: ${players.length} Spieler`); return players }
  } catch(e) { console.log(`  ↳ squad _next/data: ${e.message}`) }

  // Versuch 2: HTML fetch → __NEXT_DATA__
  try {
    const html = await fetch(`https://www.fotmob.com/de/teams/${fotmobId}/squad/${slug}`, { credentials:'include' }).then(r=>r.text())
    const doc  = new DOMParser().parseFromString(html, 'text/html')
    const nd   = doc.getElementById('__NEXT_DATA__')
    if (nd) {
      const players=[], seen=new Set()
      const find = (o,d=0) => {
        if(!o||typeof o!=='object'||d>8)return
        if(Array.isArray(o)){for(const item of o){if(item?.id&&item?.name&&!seen.has(String(item.id))){seen.add(String(item.id));players.push({fotmobId:String(item.id),name:item.name,slug:item.pageUrl?.split('/').pop()??norm(item.name).replace(/\s/g,'-')})}find(item,d+1)}}
        else for(const v of Object.values(o))if(v&&typeof v==='object')find(v,d+1)
      }
      find(JSON.parse(nd.textContent)?.props?.pageProps)
      if (players.length>0){console.log(`  ✓ HTML SSR: ${players.length}`);return players}
    }
  } catch(e) { console.log(`  ↳ squad HTML: ${e.message}`) }
  return []
}

async function getPlayerStats(fotmobId, slug) {
  // Versuch 1: _next/data player
  for (const path of [`de/players/${fotmobId}/${slug}`, `de/players/${fotmobId}/overview/${slug}`]) {
    try {
      const data = await nextFetch(path)
      const stats = extractStats(data?.pageProps ?? data)
      if (stats.xgPer90!==null||stats.xaPer90!==null||stats.xgaPer90!==null) return stats
    } catch(e) { /* weiter */ }
  }
  // Versuch 2: playerData API (Legacy)
  try {
    const r = await fetch(`https://www.fotmob.com/api/playerData?id=${fotmobId}`, { credentials:'include', headers:{accept:'application/json'} })
    if (r.ok) return extractStats(await r.json())
  } catch(e) { /* weiter */ }
  return { xgPer90:null, xgaPer90:null, xaPer90:null, minutes:null, league:null }
}

// ─── DOM Team-Extraktion ──────────────────────────────────────────────────────

function extractTeamsFromDOM() {
  const found = new Map()
  for (const link of document.querySelectorAll('a[href*="/teams/"]')) {
    const m = link.href.match(/\/teams\/(\d+)\/(?:overview|squad|kader|mannschaft)\/([^/?#]+)/)
    if (!m || found.has(m[1])) continue
    const nameEl = link.querySelector('[class*="Name"],[class*="name"],span,p')
    let name = nameEl?.textContent?.trim() ?? link.textContent?.trim() ?? ''
    if (!name||name.length<2) name = m[2].split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')
    found.set(m[1], { name: name.trim(), slug: m[2] })
  }
  return found
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log('%c  FotMob xG-Import v5  —  WM 2026 DB     ', 'color:#4ade80;font-weight:bold')
  console.log('%c  xG · xGA · xA · Liga-Normierung        ', 'color:#4ade80')
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log(DRY_RUN ? '%c⚠  TESTLAUF' : '%c✏  SCHREIBMODUS', 'color:orange;font-weight:bold')

  try { console.log(`  Build-ID: ${getBuildId()}`) }
  catch(e) { console.error('❌', e.message); return }

  if (!location.href.includes('/leagues/77/')) {
    console.warn('%c⚠  Bitte auf der WM-Teams-Seite ausführen:', 'color:orange')
    console.warn('   https://www.fotmob.com/de/leagues/77/overview/world-cup/teams')
    return
  }

  // DB laden — Range-Header holt bis zu 2000 Zeilen (Fix für Sweden/Tunisia Bug)
  console.log('\n📥 Lade Spieler aus DB (bis 2000)...')
  let dbPlayers
  try { dbPlayers = await dbGet('players?select=id,name,team_id,position,xg_per90,xga_per90,xa_per90,minutes_played,league_name&order=team_id') }
  catch(e) { console.error('❌ DB-Fehler:', e.message); return }
  console.log(`  ✓ ${dbPlayers.length} Spieler`)
  const byTeam = {}
  for (const p of dbPlayers) { (byTeam[p.team_id]??=[]).push(p) }

  // Teams aus DOM
  console.log('\n🔍 Teams aus DOM...')
  const domTeams = extractTeamsFromDOM()
  const teams = []
  for (const [fotmobId, {name, slug}] of domTeams) {
    const internalId = NAME_MAP[name]
    if (internalId) teams.push({fotmobId, name, slug, internalId})
    else console.log(`  ⚠ kein Mapping: "${name}"`)
  }
  console.log(`  ✓ ${teams.length}/${domTeams.size} Teams gemappt`)

  const filtered = ONLY_TEAM ? teams.filter(t=>t.internalId===ONLY_TEAM) : teams
  const st = {teams:0, players:0, matched:0, updated:0, noMatch:[], errors:[]}

  for (const team of filtered) {
    const dbTeam = byTeam[team.internalId]??[]
    if (dbTeam.length===0) { console.log(`\n⏭  ${team.internalId}: kein Kader in DB`); continue }
    console.log(`\n🏳  ${team.name} (${team.fotmobId}) → ${team.internalId} | DB: ${dbTeam.length}`)

    const squad = await getSquad(team.fotmobId, team.slug)
    await sleep(RATE_MS)

    if (squad.length===0) {
      console.log('  ⚠ Kein Kader')
      st.errors.push(`${team.internalId}: leer`)
      continue
    }
    st.teams++

    for (const fp of squad) {
      st.players++
      const match = bestMatch(fp.name, dbTeam)
      if (!match) { st.noMatch.push(`${team.internalId}: "${fp.name}"`); continue }
      st.matched++

      const raw = await getPlayerStats(fp.fotmobId, fp.slug)
      await sleep(RATE_MS)

      // Liga-Qualitäts-Normierung
      const lq = leagueQuality(raw.league)
      const update = {}
      if (raw.xgPer90  !== null) update.xg_per90       = Math.round(raw.xgPer90 * lq * 1000) / 1000
      if (raw.xgaPer90 !== null) update.xga_per90      = Math.round(raw.xgaPer90 * lq * 1000) / 1000
      if (raw.xaPer90  !== null) update.xa_per90        = Math.round(raw.xaPer90 * lq * 1000) / 1000
      if (raw.minutes  !== null) update.minutes_played  = raw.minutes
      if (raw.league   !== null) update.league_name     = raw.league

      if (Object.keys(update).length === 0) continue

      const conf = match.score>=0.95?'✓':`~${Math.round(match.score*100)}%`
      const lqLabel = raw.league ? ` [${raw.league} ×${lq}]` : ''
      console.log(
        `  ✎ [${conf}] ${fp.name} → ${match.player.name}${lqLabel}` +
        (update.xg_per90  !==undefined ? `  xG=${update.xg_per90.toFixed(3)}`  : '') +
        (update.xa_per90  !==undefined ? `  xA=${update.xa_per90.toFixed(3)}`  : '') +
        (update.xga_per90 !==undefined ? `  xGA=${update.xga_per90.toFixed(3)}` : '') +
        (update.minutes_played!==undefined ? `  ${update.minutes_played}min` : '')
      )

      if (!DRY_RUN) {
        try { await dbPatch(match.player.id, update); st.updated++ }
        catch(e) { console.log(`    ❌ ${e.message}`); st.errors.push(e.message) }
      } else st.updated++
    }
  }

  const elapsed = ((Date.now()-t0)/1000).toFixed(0)
  console.log('%c\n══════════════════════════════════════════', 'color:#4ade80')
  console.log(`Teams:    ${st.teams}/${filtered.length}`)
  console.log(`Spieler:  ${st.players} | ${st.matched} gematcht | ${st.updated} ${DRY_RUN?'würden':'wurden'} gespeichert`)
  console.log(`Laufzeit: ${elapsed}s`)
  if (st.noMatch.length) { console.log(`\n⚠ Kein Match (${st.noMatch.length}):`); st.noMatch.slice(0,15).forEach(x=>console.log(' ',x)) }
  if (st.errors.length)  { console.log(`\n❌ Fehler (${st.errors.length}):`);  st.errors.slice(0,5).forEach(x=>console.log(' ',x)) }
  console.log(DRY_RUN ? '%c\n💡 DRY_RUN=false zum Speichern' : '%c\n✅ Fertig!', DRY_RUN?'color:orange':'color:#4ade80;font-weight:bold')
}

main()
