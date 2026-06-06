/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FotMob → WM2026 DB  —  BROWSER-KONSOLEN-SKRIPT v4     ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  ANLEITUNG:                                             ║
 * ║  1. Öffne diese Seite:                                  ║
 * ║     fotmob.com/de/leagues/77/overview/world-cup/teams   ║
 * ║  2. Warte bis alle Teams sichtbar sind                  ║
 * ║  3. F12 → Console → Code einfügen → Enter              ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const SUPABASE_URL = 'https://bcwcgwoppuueduvzoyqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd2Nnd29wcHV1ZWR1dnpveXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQ2NTcsImV4cCI6MjA5NDg0MDY1N30.U-J9aSUopsWyZSy_McLpG7RQQAxRayY7XsHCDUbnWiM'

const DRY_RUN   = false  // false = wirklich speichern
const ONLY_TEAM = ''     // '' = alle; 'germany' = nur Deutschland
const RATE_MS   = 300

const NAME_MAP = {
  // Deutsch (FotMob DE)
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
  // Englisch
  'Germany': 'germany', 'France': 'france', 'Spain': 'spain',
  'Brazil': 'brazil', 'Argentina': 'argentina', 'Netherlands': 'netherlands',
  'Belgium': 'belgium', 'Switzerland': 'switzerland', 'Croatia': 'croatia',
  'Denmark': 'denmark', 'Sweden': 'sweden', 'Norway': 'norway', 'Austria': 'austria',
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
  const na = norm(a), nb = norm(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const sa = new Set(na.split(' ')), sb = new Set(nb.split(' '))
  return [...sa].filter(w=>sb.has(w)).length / new Set([...sa,...sb]).size
}
function bestMatch(name, players) {
  let top=null, score=0
  for (const p of players) { const s=similarity(name,p.name); if(s>score){score=s;top=p} }
  return score>=0.6 ? {player:top,score} : null
}

async function dbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' }
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

// ─── Next.js _next/data Fetch ────────────────────────────────────────────────
// FotMob ist eine Next.js App — _next/data ist der interne JSON-Endpoint
// den der Browser beim Client-Navigation nutzt. Viel zuverlässiger als /api/

let BUILD_ID = null
function getBuildId() {
  if (BUILD_ID) return BUILD_ID
  try {
    BUILD_ID = JSON.parse(document.getElementById('__NEXT_DATA__').textContent).buildId
  } catch(e) { throw new Error('Build-ID nicht gefunden. Bist du auf fotmob.com?') }
  return BUILD_ID
}

async function nextFetch(path) {
  const buildId = getBuildId()
  const url = `/_next/data/${buildId}/${path}.json`
  const r = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`_next/data ${r.status}: ${url}`)
  return r.json()
}

// Tiefen-Suche nach xG/xGA in beliebiger JSON-Struktur
function extractXg(obj, depth=0) {
  let xgPer90=null, xgaPer90=null
  if (!obj || typeof obj !== 'object' || depth>10) return {xgPer90, xgaPer90}

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (!item || typeof item !== 'object') continue
      const key = String(item.key??item.title??item.name??item.statKey??'').toLowerCase()
      const per90 = parseFloat(item.per90Value??item.per90??)
      const val   = !isNaN(per90) ? per90 : parseFloat(item.value??item.stat?.value??'')
      if (!isNaN(val) && val>=0 && val<10) {
        if ((key==='expected_goals'||key==='xg') && !key.includes('against') && xgPer90===null) xgPer90=Math.round(val*1000)/1000
        if ((key==='expected_goals_against'||key==='xga') && xgaPer90===null) xgaPer90=Math.round(val*1000)/1000
      }
      const r = extractXg(item, depth+1)
      if (xgPer90===null) xgPer90=r.xgPer90
      if (xgaPer90===null) xgaPer90=r.xgaPer90
    }
    return {xgPer90, xgaPer90}
  }

  for (const [k,v] of Object.entries(obj)) {
    const key = k.toLowerCase()
    if (typeof v==='number' && v>=0 && v<10) {
      if ((key==='xg'||key==='expected_goals') && !key.includes('against') && xgPer90===null) xgPer90=Math.round(v*1000)/1000
      if ((key==='xga'||key==='expected_goals_against') && xgaPer90===null) xgaPer90=Math.round(v*1000)/1000
    }
    if (v && typeof v==='object') {
      const r = extractXg(v, depth+1)
      if (xgPer90===null) xgPer90=r.xgPer90
      if (xgaPer90===null) xgaPer90=r.xgaPer90
    }
  }
  return {xgPer90, xgaPer90}
}

// ─── Team-IDs aus DOM ────────────────────────────────────────────────────────

function extractTeamsFromDOM() {
  const found = new Map()
  for (const link of document.querySelectorAll('a[href*="/teams/"]')) {
    const m = link.href.match(/\/teams\/(\d+)\/(?:overview|squad|kader|mannschaft)\/([^/?#]+)/)
    if (!m || found.has(m[1])) continue
    const nameEl = link.querySelector('[class*="Name"],[class*="name"],span,p')
    let name = nameEl?.textContent?.trim() ?? link.textContent?.trim() ?? ''
    if (!name || name.length<2) name = m[2].split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')
    found.set(m[1], { name: name.trim(), slug: m[2] })
  }
  return found
}

// ─── Squad via _next/data ────────────────────────────────────────────────────

async function getSquad(fotmobId, slug) {
  // Versuch 1: _next/data für squad-Seite
  try {
    const data = await nextFetch(`de/teams/${fotmobId}/squad/${slug}`)
    const props = data?.pageProps ?? data
    const players = []
    // Alle Arrays nach Elementen mit id+name durchsuchen
    const findPlayers = (obj, d=0) => {
      if (!obj||typeof obj!=='object'||d>8) return
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item?.id && item?.name && typeof item.name==='string') {
            players.push({fotmobId:String(item.id), name:item.name, slug: item.pageUrl?.split('/')?.slice(-1)?.[0]??norm(item.name).replace(/\s/g,'-')})
          }
          findPlayers(item, d+1)
        }
      } else {
        for (const v of Object.values(obj)) if(v&&typeof v==='object') findPlayers(v,d+1)
      }
    }
    findPlayers(props)
    // Deduplizieren
    const seen = new Set()
    const unique = players.filter(p=>!seen.has(p.fotmobId)&&seen.add(p.fotmobId))
    if (unique.length>0) { console.log(`  ✓ _next/data: ${unique.length} Spieler`); return unique }
  } catch(e) { console.log(`  ↳ _next/data squad: ${e.message}`) }

  // Versuch 2: squad-Seite als HTML fetchen und Links extrahieren
  try {
    const html = await fetch(`https://www.fotmob.com/de/teams/${fotmobId}/squad/${slug}`, {credentials:'include'}).then(r=>r.text())
    const doc  = new DOMParser().parseFromString(html, 'text/html')
    // __NEXT_DATA__ aus dem HTML-Response lesen (SSR-Payload)
    const nextScript = doc.getElementById('__NEXT_DATA__')
    if (nextScript) {
      const nextData = JSON.parse(nextScript.textContent)
      const players = []
      const findPlayers = (obj, d=0) => {
        if (!obj||typeof obj!=='object'||d>8) return
        if (Array.isArray(obj)) {
          for (const item of obj) {
            if (item?.id && item?.name && typeof item.name==='string') {
              players.push({fotmobId:String(item.id), name:item.name, slug:item.pageUrl?.split('/')?.slice(-1)?.[0]??norm(item.name).replace(/\s/g,'-')})
            }
            findPlayers(item, d+1)
          }
        } else for(const v of Object.values(obj)) if(v&&typeof v==='object') findPlayers(v,d+1)
      }
      findPlayers(nextData?.props?.pageProps)
      const seen=new Set()
      const unique=players.filter(p=>!seen.has(p.fotmobId)&&seen.add(p.fotmobId))
      if (unique.length>0) { console.log(`  ✓ SSR-HTML: ${unique.length} Spieler`); return unique }
    }
    // Fallback: Player-Links aus HTML
    const links = [...doc.querySelectorAll('a[href*="/players/"]')]
    const players = links.map(l=>{
      const m=l.href.match(/\/players\/(\d+)\/([^/?#]+)/)
      if (!m) return null
      const name = l.querySelector('span,p,[class*="name"]')?.textContent?.trim()
        ?? m[2].split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')
      return {fotmobId:m[1], name, slug:m[2]}
    }).filter(Boolean)
    const seen=new Set()
    const unique=players.filter(p=>!seen.has(p.fotmobId)&&seen.add(p.fotmobId))
    if (unique.length>0) { console.log(`  ✓ HTML-Links: ${unique.length} Spieler`); return unique }
  } catch(e) { console.log(`  ↳ HTML-fetch: ${e.message}`) }

  return []
}

// ─── Spieler-Stats via _next/data ────────────────────────────────────────────

async function getPlayerStats(fotmobId, slug) {
  // Versuch 1: _next/data für Spieler-Profilseite
  try {
    const data = await nextFetch(`de/players/${fotmobId}/${slug}`)
    const props = data?.pageProps ?? data
    return extractXg(props)
  } catch(e) { /* weiter */ }

  // Versuch 2: player-overview
  try {
    const data = await nextFetch(`de/players/${fotmobId}/overview/${slug}`)
    return extractXg(data?.pageProps ?? data)
  } catch(e) { /* weiter */ }

  // Versuch 3: playerData API (alter Endpoint, vielleicht noch aktiv)
  try {
    const r = await fetch(`https://www.fotmob.com/api/playerData?id=${fotmobId}`, {credentials:'include',headers:{accept:'application/json'}})
    if (r.ok) return extractXg(await r.json())
  } catch(e) { /* weiter */ }

  return { xgPer90: null, xgaPer90: null }
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log('%c  FotMob xG-Import v4  —  WM 2026 DB     ', 'color:#4ade80;font-weight:bold')
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log(DRY_RUN ? '%c⚠  TESTLAUF' : '%c✏  SCHREIBMODUS', 'color:orange;font-weight:bold')

  // Build-ID prüfen
  try { console.log(`  Build-ID: ${getBuildId()}`) }
  catch(e) { console.error('❌', e.message); return }

  if (!location.href.includes('/leagues/77/')) {
    console.warn('%c⚠  Bitte zuerst diese URL öffnen:', 'color:orange')
    console.warn('   https://www.fotmob.com/de/leagues/77/overview/world-cup/teams')
    return
  }

  // DB laden
  console.log('\n📥 Lade Spieler aus DB...')
  let dbPlayers
  try { dbPlayers = await dbGet('players?select=id,name,team_id,position,xg_per90,xga_per90&order=team_id') }
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
    else console.log(`  ⚠ kein Mapping: "${name}" (ID ${fotmobId})`)
  }
  console.log(`  ✓ ${teams.length}/${domTeams.size} Teams gemappt`)

  const filtered = ONLY_TEAM ? teams.filter(t=>t.internalId===ONLY_TEAM) : teams
  const stats = {teams:0, players:0, matched:0, updated:0, noMatch:[], errors:[]}

  for (const team of filtered) {
    const dbTeam = byTeam[team.internalId]??[]
    if (dbTeam.length===0) { console.log(`\n⏭  ${team.internalId}: kein Kader in DB`); continue }
    console.log(`\n🏳  ${team.name} (${team.fotmobId}) → ${team.internalId} | DB: ${dbTeam.length}`)

    const squad = await getSquad(team.fotmobId, team.slug)
    await sleep(RATE_MS)

    if (squad.length===0) {
      console.log('  ⚠ Kein Kader erhalten')
      stats.errors.push(`${team.internalId}: leer`)
      continue
    }
    stats.teams++

    for (const fp of squad) {
      stats.players++
      const match = bestMatch(fp.name, dbTeam)
      if (!match) { stats.noMatch.push(`${team.internalId}: "${fp.name}"`); continue }
      stats.matched++

      const {xgPer90, xgaPer90} = await getPlayerStats(fp.fotmobId, fp.slug)
      await sleep(RATE_MS)

      if (xgPer90===null && xgaPer90===null) continue
      const update = {}
      if (xgPer90  !==null) update.xg_per90  = xgPer90
      if (xgaPer90 !==null) update.xga_per90 = xgaPer90

      const conf = match.score>=0.95?'✓':`~${Math.round(match.score*100)}%`
      console.log(`  ✎ [${conf}] ${fp.name} → ${match.player.name}${xgPer90!==null?`  xG=${xgPer90.toFixed(3)}`:''}${xgaPer90!==null?`  xGA=${xgaPer90.toFixed(3)}`:''}`)

      if (!DRY_RUN) {
        try { await dbPatch(match.player.id, update); stats.updated++ }
        catch(e) { console.log(`    ❌ ${e.message}`); stats.errors.push(e.message) }
      } else stats.updated++
    }
  }

  const elapsed = ((Date.now()-t0)/1000).toFixed(0)
  console.log('%c\n══════════════════════════════════════════', 'color:#4ade80')
  console.log(`Teams:    ${stats.teams}/${filtered.length}`)
  console.log(`Spieler:  ${stats.players} | ${stats.matched} gematcht | ${stats.updated} ${DRY_RUN?'würden':'wurden'} gespeichert`)
  console.log(`Laufzeit: ${elapsed}s`)
  if (stats.noMatch.length) { console.log(`\n⚠ Kein Match (${stats.noMatch.length}):`); stats.noMatch.slice(0,15).forEach(x=>console.log(' ',x)) }
  if (stats.errors.length)  { console.log(`\n❌ Fehler (${stats.errors.length}):`); stats.errors.slice(0,5).forEach(x=>console.log(' ',x)) }
  console.log(DRY_RUN ? '%c\n💡 DRY_RUN=false zum Speichern' : '%c\n✅ Fertig!', DRY_RUN?'color:orange':'color:#4ade80;font-weight:bold')
}

main()
