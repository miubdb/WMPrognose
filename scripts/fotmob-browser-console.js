/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FotMob → WM2026 DB  —  BROWSER-KONSOLEN-SKRIPT v3     ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  ANLEITUNG:                                             ║
 * ║  1. Öffne diese Seite in Chrome/Firefox:               ║
 * ║     fotmob.com/de/leagues/77/overview/world-cup/teams   ║
 * ║  2. Warte bis die Seite komplett geladen ist            ║
 * ║  3. Drücke F12 → Reiter "Console"                       ║
 * ║  4. Füge diesen kompletten Code ein + Enter             ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Das Skript liest die echten Team-IDs direkt aus der Seite
 * (Links zu /teams/8570/... usw.) und holt dann für jeden
 * Spieler xG/xGA aus dem Spielerprofil.
 */

// ─── Konfiguration ────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://bcwcgwoppuueduvzoyqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd2Nnd29wcHV1ZWR1dnpveXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQ2NTcsImV4cCI6MjA5NDg0MDY1N30.U-J9aSUopsWyZSy_McLpG7RQQAxRayY7XsHCDUbnWiM'

const DRY_RUN    = false  // false = wirklich speichern
const ONLY_TEAM  = ''     // '' = alle Teams; 'germany' = nur Deutschland
const RATE_MS    = 400    // ms Pause zwischen Requests (nicht zu schnell)

// ─── Mapping: FotMob-Ländername → interne team_id ────────────────────────────
// Enthält Deutsch + Englisch (FotMob zeigt je nach Einstellung verschiedene Namen)

const NAME_MAP = {
  // Deutsch
  'Deutschland': 'germany', 'Frankreich': 'france', 'Spanien': 'spain',
  'England': 'england', 'Brasilien': 'brazil', 'Argentinien': 'argentina',
  'Portugal': 'portugal', 'Niederlande': 'netherlands', 'Belgien': 'belgium',
  'Schweiz': 'switzerland', 'Kroatien': 'croatia', 'Dänemark': 'denmark',
  'Schweden': 'sweden', 'Norwegen': 'norway', 'Österreich': 'austria',
  'Tschechien': 'czechia', 'Türkei': 'turkey', 'Schottland': 'scotland',
  'Bosnien-Herzegowina': 'bosnia', 'Serbien': 'serbia', 'Uruguay': 'uruguay',
  'Kolumbien': 'colombia', 'Ecuador': 'ecuador', 'Mexiko': 'mexico',
  'USA': 'usa', 'Kanada': 'canada', 'Panama': 'panama', 'Paraguay': 'paraguay',
  'Japan': 'japan', 'Südkorea': 'south_korea', 'Australien': 'australia',
  'Iran': 'iran', 'Saudi-Arabien': 'saudi_arabia', 'Katar': 'qatar',
  'Jordanien': 'jordan', 'Usbekistan': 'uzbekistan', 'Marokko': 'morocco',
  'Senegal': 'senegal', 'Ägypten': 'egypt', 'Tunesien': 'tunisia',
  'Algerien': 'algeria', 'Ghana': 'ghana', 'Südafrika': 'south_africa',
  'Elfenbeinküste': 'ivory_coast', 'Kongo DR': 'congo_dr', 'Kap Verde': 'cape_verde',
  'Haiti': 'haiti', 'Curaçao': 'curacao', 'Neuseeland': 'new_zealand', 'Irak': 'iraq',
  // Englisch
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

function norm(n) {
  return n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim()
}
function similarity(a, b) {
  const na = norm(a), nb = norm(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const sa = new Set(na.split(' ')), sb = new Set(nb.split(' '))
  const inter = [...sa].filter(w => sb.has(w)).length
  return inter / new Set([...sa,...sb]).size
}
function bestMatch(name, players) {
  let top = null, score = 0
  for (const p of players) {
    const s = similarity(name, p.name)
    if (s > score) { score = s; top = p }
  }
  return score >= 0.6 ? { player: top, score } : null
}

async function fotmob(path) {
  const r = await fetch(`https://www.fotmob.com/api/${path}`, {
    credentials: 'include',
    headers: { accept: 'application/json', 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' }
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}: /api/${path}`)
  return r.json()
}
async function dbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' }
  })
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`)
  return r.json()
}
async function dbPatch(id, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error(`Supabase PATCH ${r.status}`)
}

// ─── Schritt 1: Team-IDs aus DOM extrahieren ──────────────────────────────────
// Liest alle Links der Form /teams/8570/... von der aktuellen Seite

function extractTeamsFromDOM() {
  const found = new Map() // fotmobId → { name, slug }
  const links = document.querySelectorAll('a[href*="/teams/"]')

  for (const link of links) {
    // URL-Pattern: /de/teams/8570/overview/germany oder /de/teams/8570/squad/germany
    const m = link.href.match(/\/teams\/(\d+)\/(?:overview|squad|kader|mannschaft)\/([^/?#]+)/)
    if (!m) continue
    const fotmobId = m[1]
    const slug = m[2]
    if (found.has(fotmobId)) continue

    // Teamname aus Link-Inhalt holen
    let name = ''
    // Versuche verschiedene Selektoren die FotMob für Teamnamen nutzt
    const nameEl = link.querySelector('[class*="Name"],[class*="name"],[class*="Title"],[class*="title"],span,p')
    name = nameEl?.textContent?.trim() ?? link.textContent?.trim() ?? slug

    // Slug als Fallback (z.B. "germany" → "Germany")
    if (!name || name.length < 2) {
      name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }

    found.set(fotmobId, { name: name.trim(), slug })
  }

  return found
}

// ─── Schritt 2: Squad eines Teams holen ──────────────────────────────────────

async function getSquad(fotmobId, slug) {
  // Primär: API-Endpoint mit echter ID
  try {
    const data = await fotmob(`teams?id=${fotmobId}&ccode3=DEU`)
    const players = []

    // Struktur: data.squads[{ title, members[{ id, name }] }]
    for (const sq of (data?.squads ?? [])) {
      for (const m of (sq?.members ?? [])) {
        if (m?.id && m?.name) players.push({ fotmobId: String(m.id), name: m.name })
      }
    }
    // Alternativ: data.squad[] oder data.players[]
    for (const p of (data?.squad ?? data?.players ?? [])) {
      if (p?.id && p?.name) players.push({ fotmobId: String(p.id), name: p.name })
    }
    if (players.length > 0) return players
  } catch(e) {
    console.log(`  ⚠ API-Fehler: ${e.message}`)
  }

  // Fallback: Spieler-IDs aus DOM der Squad-Seite holen
  // (Funktioniert wenn der User gerade auf einer Team-Seite ist)
  const players = []
  const playerLinks = document.querySelectorAll(`a[href*="/players/"]`)
  for (const link of playerLinks) {
    const m = link.href.match(/\/players\/(\d+)\/([^/?#]+)/)
    if (!m) continue
    const pId = m[1]
    const pSlug = m[2]
    const name = link.querySelector('span,p,[class*="name"]')?.textContent?.trim()
      ?? pSlug.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
    players.push({ fotmobId: pId, name: name.trim() })
  }
  return players
}

// ─── Schritt 3: Spieler-Stats ─────────────────────────────────────────────────
// Holt xG und xGA per 90 aus dem Spielerprofil
// Seite z.B.: fotmob.com/de/players/460632/joshua-kimmich

async function getPlayerStats(fotmobId) {
  let data
  try {
    data = await fotmob(`playerData?id=${fotmobId}`)
  } catch(e) { return { xgPer90: null, xgaPer90: null } }

  let xgPer90 = null, xgaPer90 = null

  // Rekursiv alle Felder durchsuchen
  const scan = (obj, depth = 0) => {
    if (depth > 9 || !obj || typeof obj !== 'object') return

    // Array-Items mit key + value/per90Value Struktur (FotMob stat items)
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (!item || typeof item !== 'object') continue
        const key = String(item.key ?? item.title ?? item.name ?? item.statName ?? '').toLowerCase()
        const per90 = parseFloat(item.per90Value ?? item.per90 ?? '')
        const val   = !isNaN(per90) ? per90 : parseFloat(item.value ?? item.stat?.value ?? '')
        if (isNaN(val) || val < 0 || val > 10) { scan(item, depth+1); continue }

        const isXG  = (key === 'expected_goals' || key === 'xg') && !key.includes('against') && !key.includes('xa')
        const isXGA = key === 'expected_goals_against' || key === 'xga'
        if (isXG  && xgPer90  === null) xgPer90  = Math.round(val*1000)/1000
        if (isXGA && xgaPer90 === null) xgaPer90 = Math.round(val*1000)/1000
        scan(item, depth+1)
      }
      return
    }

    // Objekt-Felder
    for (const [k, v] of Object.entries(obj)) {
      const key = k.toLowerCase()
      if (typeof v === 'number' && v >= 0 && v < 10) {
        if ((key === 'xg' || key === 'expected_goals') && !key.includes('against') && xgPer90 === null)  xgPer90  = Math.round(v*1000)/1000
        if ((key === 'xga' || key === 'expected_goals_against') && xgaPer90 === null) xgaPer90 = Math.round(v*1000)/1000
      }
      if (v && typeof v === 'object') scan(v, depth+1)
    }
  }
  scan(data)

  return { xgPer90, xgaPer90 }
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log('%c  FotMob xG-Import v3  —  WM 2026 DB     ', 'color:#4ade80;font-weight:bold')
  console.log('%c══════════════════════════════════════════', 'color:#4ade80;font-weight:bold')
  console.log(DRY_RUN ? '%c⚠  TESTLAUF — kein Speichern' : '%c✏  SCHREIBMODUS', 'color:orange;font-weight:bold')

  // Prüfe ob wir auf der richtigen Seite sind
  const onTeamsPage = location.href.includes('/leagues/77/')
  if (!onTeamsPage) {
    console.warn('%c⚠  Nicht auf der WM-Teams-Seite!', 'color:orange')
    console.warn('   Bitte zuerst diese URL öffnen:')
    console.warn('   https://www.fotmob.com/de/leagues/77/overview/world-cup/teams')
    console.warn('   Dann F12 → Console und Skript erneut einfügen.')
    return
  }

  // 1. DB-Spieler laden
  console.log('\n📥 Lade Spieler aus Datenbank...')
  let dbPlayers
  try { dbPlayers = await dbGet('players?select=id,name,team_id,position,xg_per90,xga_per90&order=team_id') }
  catch(e) { console.error('❌ DB-Verbindung fehlgeschlagen:', e.message); return }
  console.log(`  ✓ ${dbPlayers.length} Spieler geladen`)
  const byTeam = {}
  for (const p of dbPlayers) { (byTeam[p.team_id] ??= []).push(p) }

  // 2. Team-IDs aus DOM extrahieren
  console.log('\n🔍 Lese Team-IDs aus der Seite...')
  const domTeams = extractTeamsFromDOM()
  console.log(`  ${domTeams.size} Teams im DOM gefunden:`)

  const teams = []
  for (const [fotmobId, { name, slug }] of domTeams) {
    const internalId = NAME_MAP[name]
      ?? NAME_MAP[name.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')]
    const display = internalId ? `→ ${internalId}` : '→ ⚠ kein Mapping'
    console.log(`    ID ${fotmobId}  "${name}"  ${display}`)
    if (internalId) teams.push({ fotmobId, name, slug, internalId })
  }

  if (teams.length === 0) {
    console.error('❌ Keine Teams erkannt. Warte bis die Seite vollständig geladen ist und versuche es erneut.')
    return
  }

  // Filter auf ein einzelnes Team
  const filtered = ONLY_TEAM ? teams.filter(t => t.internalId === ONLY_TEAM) : teams
  console.log(`\n▶  Verarbeite ${filtered.length} Teams${ONLY_TEAM ? ` (nur: ${ONLY_TEAM})` : ''}...`)

  // Tracking
  const stats = { teams:0, players:0, matched:0, updated:0, noMatch:[], errors:[] }

  for (const team of filtered) {
    const dbTeam = byTeam[team.internalId] ?? []
    if (dbTeam.length === 0) { console.log(`\n⏭  ${team.internalId}: kein Kader in DB`); continue }

    console.log(`\n🏳  ${team.name} (ID ${team.fotmobId}) → ${team.internalId} | DB: ${dbTeam.length} Spieler`)

    // Squad holen
    const squad = await getSquad(team.fotmobId, team.slug)
    await sleep(RATE_MS)

    if (squad.length === 0) {
      console.log(`  ⚠ Kein Kader von FotMob — überspringe`)
      stats.errors.push(`${team.internalId}: Kader leer`)
      continue
    }
    console.log(`  FotMob: ${squad.length} Spieler im Kader`)
    stats.teams++

    // Pro Spieler
    for (const fp of squad) {
      stats.players++
      const match = bestMatch(fp.name, dbTeam)
      if (!match) { stats.noMatch.push(`${team.internalId}: "${fp.name}"`); continue }
      stats.matched++

      const { xgPer90, xgaPer90 } = await getPlayerStats(fp.fotmobId)
      await sleep(RATE_MS)

      if (xgPer90 === null && xgaPer90 === null) continue

      const update = {}
      if (xgPer90  !== null) update.xg_per90  = xgPer90
      if (xgaPer90 !== null) update.xga_per90 = xgaPer90

      const conf = match.score >= 0.95 ? '✓' : `~${Math.round(match.score*100)}%`
      console.log(
        `  ✎ [${conf}] ${fp.name} → ${match.player.name}` +
        (xgPer90  !== null ? `  xG/90=${xgPer90.toFixed(3)}`  : '') +
        (xgaPer90 !== null ? `  xGA/90=${xgaPer90.toFixed(3)}` : '')
      )

      if (!DRY_RUN) {
        try { await dbPatch(match.player.id, update); stats.updated++ }
        catch(e) { console.log(`    ❌ ${e.message}`); stats.errors.push(e.message) }
      } else { stats.updated++ }
    }
  }

  // Zusammenfassung
  const s = ((Date.now()-t0)/1000).toFixed(0)
  console.log('%c\n══════════════════════════════════════════', 'color:#4ade80')
  console.log(`Teams:    ${stats.teams} von ${filtered.length}`)
  console.log(`Spieler:  ${stats.players} gesehen  |  ${stats.matched} gematcht  |  ${stats.updated} ${DRY_RUN?'würden':'wurden'} gespeichert`)
  console.log(`Laufzeit: ${s}s`)
  if (stats.noMatch.length) {
    console.log(`\n⚠ Ohne DB-Match (${stats.noMatch.length}):`)
    stats.noMatch.slice(0,15).forEach(x => console.log('  ', x))
  }
  if (stats.errors.length) {
    console.log(`\n❌ Fehler (${stats.errors.length}):`)
    stats.errors.slice(0,5).forEach(x => console.log('  ', x))
  }
  if (DRY_RUN) console.log('%c\n💡 Setze DRY_RUN=false zum Speichern', 'color:orange')
  else         console.log('%c\n✅ Import abgeschlossen!', 'color:#4ade80;font-weight:bold')
}

main()
