/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FotMob → WM2026 DB  —  BROWSER-KONSOLEN-SKRIPT        ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  ANLEITUNG:                                             ║
 * ║  1. Öffne https://www.fotmob.com/de im Browser          ║
 * ║  2. Drücke F12 → Reiter "Console"                       ║
 * ║  3. Füge diesen kompletten Code ein                     ║
 * ║  4. Drücke Enter                                        ║
 * ║  → Läuft automatisch, kein Node.js nötig               ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ─── KONFIGURATION ────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://bcwcgwoppuueduvzoyqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd2Nnd29wcHV1ZWR1dnpveXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQ2NTcsImV4cCI6MjA5NDg0MDY1N30.U-J9aSUopsWyZSy_McLpG7RQQAxRayY7XsHCDUbnWiM'

// true  = nur anzeigen, NICHT in DB schreiben (zum Testen)
// false = wirklich in DB schreiben
const DRY_RUN = false

// Nur dieses Team importieren ('' = alle 48 Teams)
const ONLY_TEAM = ''   // z.B. 'germany' oder ''

const RATE_LIMIT_MS = 400   // Pause zwischen Requests

// ─── TEAM-MAPPING: FotMob-ID → unsere interne team_id ────────────────────────

// FotMob-IDs werden automatisch aus dem WM-Turnier geladen.
// Diese Tabelle ist der Fallback falls die API-Struktur sich geändert hat.
const TEAM_NAME_MAP = {
  'Germany':                    'germany',
  'France':                     'france',
  'Spain':                      'spain',
  'England':                    'england',
  'Brazil':                     'brazil',
  'Argentina':                  'argentina',
  'Portugal':                   'portugal',
  'Netherlands':                'netherlands',
  'Belgium':                    'belgium',
  'Switzerland':                'switzerland',
  'Croatia':                    'croatia',
  'Denmark':                    'denmark',
  'Sweden':                     'sweden',
  'Norway':                     'norway',
  'Austria':                    'austria',
  'Czech Republic':             'czechia',
  'Czechia':                    'czechia',
  'Turkey':                     'turkey',
  'Scotland':                   'scotland',
  'Bosnia and Herzegovina':     'bosnia',
  'Serbia':                     'serbia',
  'Uruguay':                    'uruguay',
  'Colombia':                   'colombia',
  'Ecuador':                    'ecuador',
  'Mexico':                     'mexico',
  'USA':                        'usa',
  'United States':              'usa',
  'Canada':                     'canada',
  'Panama':                     'panama',
  'Paraguay':                   'paraguay',
  'Japan':                      'japan',
  'South Korea':                'south_korea',
  'Korea Republic':             'south_korea',
  'Australia':                  'australia',
  'Iran':                       'iran',
  'Saudi Arabia':               'saudi_arabia',
  'Qatar':                      'qatar',
  'Jordan':                     'jordan',
  'Uzbekistan':                 'uzbekistan',
  'Morocco':                    'morocco',
  'Senegal':                    'senegal',
  'Egypt':                      'egypt',
  'Tunisia':                    'tunisia',
  'Algeria':                    'algeria',
  'Ghana':                      'ghana',
  'South Africa':               'south_africa',
  'Ivory Coast':                'ivory_coast',
  "Côte d'Ivoire":             'ivory_coast',
  'DR Congo':                   'congo_dr',
  'Congo DR':                   'congo_dr',
  'Cape Verde':                 'cape_verde',
  'Haiti':                      'haiti',
  'Curaçao':                    'curacao',
  'New Zealand':                'new_zealand',
  'Iraq':                       'iraq',
}

// ─── HILFSFUNKTIONEN ─────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))

function normalize(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function nameSimilarity(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return 1.0
  // Teilstring-Match
  if (na.includes(nb) || nb.includes(na)) return 0.9
  // Wort-Overlap
  const setA = new Set(na.split(' '))
  const setB = new Set(nb.split(' '))
  const inter = [...setA].filter(w => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return inter / union
}

function findBestMatch(fotmobName, dbPlayers) {
  let best = null, bestScore = 0
  for (const p of dbPlayers) {
    const score = nameSimilarity(fotmobName, p.name)
    if (score > bestScore) { bestScore = score; best = p }
  }
  return bestScore >= 0.6 ? { player: best, score: bestScore } : null
}

// FotMob-Fetch (nutzt Browser-Cookies automatisch, kein Cookie nötig!)
async function fotmobGet(path) {
  const res = await fetch(`https://www.fotmob.com/api/${path}`, {
    credentials: 'include',   // Browser-Cookies automatisch mitschicken
    headers: { 'accept': 'application/json' }
  })
  if (!res.ok) throw new Error(`FotMob HTTP ${res.status} — ${path}`)
  return res.json()
}

// Supabase
async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' }
  })
  if (!res.ok) throw new Error(`Supabase GET ${res.status}`)
  return res.json()
}

async function supabaseUpdate(id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}`)
}

// ─── FOTMOB-DATEN ────────────────────────────────────────────────────────────

async function getWM2026Teams() {
  console.log('📡 Lade WM 2026 von FotMob...')
  let data
  try {
    // Tournament ID 77 = FIFA World Cup auf FotMob
    data = await fotmobGet('leagues?id=77&ccode3=DEU&type=league&timeZone=Europe%2FBerlin')
  } catch(e) {
    console.warn('  ⚠ Turnier-API fehlgeschlagen:', e.message, '— nutze Fallback-Teams')
    return getFallbackTeams()
  }

  const teams = []
  // Turniertabelle durchsuchen
  const tableData = data?.table ?? []
  for (const group of (Array.isArray(tableData) ? tableData : [tableData])) {
    const rows = group?.data?.table ?? group?.teams ?? []
    for (const row of rows) {
      if (row.id && row.name) teams.push({ fotmobId: String(row.id), name: row.name })
    }
  }
  // Auch "participants" oder "clubs" prüfen
  if (teams.length === 0) {
    const parts = data?.participants ?? data?.clubs ?? data?.teams ?? []
    for (const t of parts) {
      if (t.id && t.name) teams.push({ fotmobId: String(t.id), name: t.name })
    }
  }

  if (teams.length === 0) {
    console.warn('  ⚠ Keine Teams im Turnier gefunden — nutze Fallback-Liste')
    return getFallbackTeams()
  }

  console.log(`  ✓ ${teams.length} Teams aus WM 2026 Turnier geladen`)
  return teams
}

function getFallbackTeams() {
  return [
    { fotmobId: '231833', name: 'Germany' },
    { fotmobId: '231736', name: 'France' },
    { fotmobId: '231490', name: 'Spain' },
    { fotmobId: '231516', name: 'England' },
    { fotmobId: '231461', name: 'Brazil' },
    { fotmobId: '231462', name: 'Argentina' },
    { fotmobId: '231526', name: 'Portugal' },
    { fotmobId: '231514', name: 'Netherlands' },
    { fotmobId: '231471', name: 'Belgium' },
    { fotmobId: '231541', name: 'Switzerland' },
    { fotmobId: '231497', name: 'Croatia' },
    { fotmobId: '231506', name: 'Denmark' },
    { fotmobId: '231542', name: 'Sweden' },
    { fotmobId: '231520', name: 'Norway' },
    { fotmobId: '231468', name: 'Austria' },
    { fotmobId: '231498', name: 'Czech Republic' },
    { fotmobId: '231548', name: 'Turkey' },
    { fotmobId: '231535', name: 'Scotland' },
    { fotmobId: '231473', name: 'Bosnia and Herzegovina' },
    { fotmobId: '231465', name: 'Uruguay' },
    { fotmobId: '231493', name: 'Colombia' },
    { fotmobId: '231504', name: 'Ecuador' },
    { fotmobId: '231511', name: 'Mexico' },
    { fotmobId: '231549', name: 'USA' },
    { fotmobId: '231477', name: 'Canada' },
    { fotmobId: '231521', name: 'Panama' },
    { fotmobId: '231522', name: 'Paraguay' },
    { fotmobId: '231557', name: 'Japan' },
    { fotmobId: '231562', name: 'South Korea' },
    { fotmobId: '231553', name: 'Australia' },
    { fotmobId: '231558', name: 'Iran' },
    { fotmobId: '231561', name: 'Saudi Arabia' },
    { fotmobId: '231563', name: 'Qatar' },
    { fotmobId: '231559', name: 'Jordan' },
    { fotmobId: '231564', name: 'Uzbekistan' },
    { fotmobId: '231576', name: 'Morocco' },
    { fotmobId: '231578', name: 'Senegal' },
    { fotmobId: '231573', name: 'Egypt' },
    { fotmobId: '231583', name: 'Tunisia' },
    { fotmobId: '231570', name: 'Algeria' },
    { fotmobId: '231574', name: 'Ghana' },
    { fotmobId: '231580', name: 'South Africa' },
    { fotmobId: '231572', name: 'Ivory Coast' },
    { fotmobId: '231571', name: 'DR Congo' },
    { fotmobId: '231569', name: 'Cape Verde' },
    { fotmobId: '231484', name: 'Haiti' },
    { fotmobId: '231482', name: 'Curaçao' },
    { fotmobId: '231603', name: 'New Zealand' },
    { fotmobId: '231560', name: 'Iraq' },
  ]
}

async function getTeamSquad(fotmobTeamId) {
  const data = await fotmobGet(`teams?id=${fotmobTeamId}&ccode3=DEU`)
  const players = []
  const squads = data?.squads ?? data?.squad ?? []
  for (const squad of (Array.isArray(squads) ? squads : [squads])) {
    for (const member of (squad?.members ?? [])) {
      if (member?.id && member?.name) {
        players.push({ fotmobId: String(member.id), name: member.name })
      }
    }
  }
  return players
}

async function getPlayerStats(fotmobPlayerId) {
  const data = await fotmobGet(`playerData?id=${fotmobPlayerId}`)

  let xgPer90 = null, xgaPer90 = null

  // Alle stat-Sektionen durchsuchen
  const sections = data?.statSections ?? data?.stats ?? data?.statsSection ?? []
  for (const section of (Array.isArray(sections) ? sections : [sections])) {
    const items = section?.items ?? []
    for (const item of (Array.isArray(items) ? items : [])) {
      const key = String(item?.key ?? item?.title ?? '').toLowerCase()
      // Per90-Wert bevorzugen, sonst Gesamtwert
      const per90 = parseFloat(item?.per90Value ?? item?.per90 ?? '')
      const total = parseFloat(item?.value ?? '')
      const val = !isNaN(per90) ? per90 : (!isNaN(total) ? total : NaN)

      if (isNaN(val) || val < 0 || val > 10) continue

      if (key === 'expected_goals' || key === 'xg' || (key.includes('expected') && key.includes('goal') && !key.includes('against'))) {
        xgPer90 = Math.round(val * 1000) / 1000
      }
      if (key === 'expected_goals_against' || key === 'xga' || (key.includes('expected') && key.includes('goal') && key.includes('against'))) {
        xgaPer90 = Math.round(val * 1000) / 1000
      }
    }
  }

  // Deep-Search-Fallback
  if (xgPer90 === null && xgaPer90 === null) {
    const search = (obj, depth = 0) => {
      if (depth > 7 || !obj || typeof obj !== 'object') return
      for (const [k, v] of Object.entries(obj)) {
        const key = k.toLowerCase()
        if (typeof v === 'number' && v >= 0 && v < 5) {
          if ((key === 'xg' || key === 'expected_goals') && !key.includes('against')) xgPer90 = v
          if ((key === 'xga' || key === 'expected_goals_against')) xgaPer90 = v
        }
        if (typeof v === 'object') search(v, depth + 1)
      }
    }
    search(data)
  }

  return { xgPer90, xgaPer90 }
}

// ─── HAUPTPROGRAMM ────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()
  console.log('%c╔══════════════════════════════════════════════╗', 'color:#4ade80;font-weight:bold')
  console.log('%c║   FotMob → WM2026 DB  —  xG/xGA Import     ║', 'color:#4ade80;font-weight:bold')
  console.log('%c╚══════════════════════════════════════════════╝', 'color:#4ade80;font-weight:bold')
  console.log(DRY_RUN ? '%c⚠  TESTLAUF — kein Schreiben' : '%c✏  SCHREIBMODUS — Daten werden gespeichert', 'color:orange')
  console.log()

  // DB-Spieler laden
  console.log('📥 Lade Spieler aus Datenbank...')
  let dbPlayers
  try {
    dbPlayers = await supabaseGet('players?select=id,name,team_id,position,xg_per90,xga_per90&order=team_id')
  } catch(e) {
    console.error('❌ Supabase-Verbindung fehlgeschlagen:', e.message)
    return
  }
  console.log(`  ✓ ${dbPlayers.length} Spieler geladen`)

  // Nach Team gruppieren
  const byTeam = {}
  for (const p of dbPlayers) {
    if (!byTeam[p.team_id]) byTeam[p.team_id] = []
    byTeam[p.team_id].push(p)
  }

  // WM Teams laden
  let teams = await getWM2026Teams()
  await sleep(RATE_LIMIT_MS)

  // Filter
  if (ONLY_TEAM) {
    teams = teams.filter(t => {
      const id = TEAM_NAME_MAP[t.name] ?? normalize(t.name).replace(/\s/g,'_')
      return id === ONLY_TEAM
    })
    if (teams.length === 0) { console.error(`❌ Team "${ONLY_TEAM}" nicht gefunden`); return }
  }

  // Tracking
  const stats = { teams: 0, players: 0, matched: 0, updated: 0, noMatch: [], errors: [] }

  // ─── Pro Team ─────────────────────────────────────────────────────────────

  for (const team of teams) {
    const internalId = TEAM_NAME_MAP[team.name]
    if (!internalId) { console.log(`⏭  ${team.name} → kein Mapping`); continue }

    const dbTeam = byTeam[internalId] ?? []
    if (dbTeam.length === 0) { console.log(`⏭  ${internalId}: kein Kader in DB`); continue }

    console.log(`\n🏳  ${team.name} → ${internalId} (${dbTeam.length} Spieler in DB)`)

    let squad
    try {
      squad = await getTeamSquad(team.fotmobId)
      await sleep(RATE_LIMIT_MS)
    } catch(e) {
      console.log(`  ❌ Kader-Fehler: ${e.message}`)
      // Falls FotMob-ID falsch ist, URL für Debugging ausgeben
      console.log(`  → Prüfe: https://www.fotmob.com/de/teams/${team.fotmobId}/kader`)
      stats.errors.push(`${internalId}: ${e.message}`)
      continue
    }

    console.log(`  FotMob: ${squad.length} Spieler`)
    if (squad.length === 0) {
      console.log(`  ⚠ Kader leer — FotMob-ID ${team.fotmobId} evtl. falsch`)
      console.log(`  → Gehe auf fotmob.com, suche ${team.name}, schau auf die URL und notiere die ID`)
      continue
    }

    stats.teams++

    // Pro Spieler
    for (const fp of squad) {
      stats.players++

      const match = findBestMatch(fp.name, dbTeam)
      if (!match) {
        stats.noMatch.push(`${internalId}: "${fp.name}"`)
        continue
      }
      stats.matched++
      const dbP = match.player
      const conf = match.score >= 0.95 ? '✓' : `~${Math.round(match.score*100)}%`

      let xgStats
      try {
        xgStats = await getPlayerStats(fp.fotmobId)
        await sleep(RATE_LIMIT_MS)
      } catch(e) {
        stats.errors.push(`${fp.name}: ${e.message}`)
        continue
      }

      const { xgPer90, xgaPer90 } = xgStats
      if (xgPer90 === null && xgaPer90 === null) continue

      const update = {}
      if (xgPer90  !== null) update.xg_per90  = xgPer90
      if (xgaPer90 !== null) update.xga_per90 = xgaPer90

      console.log(
        `  ✎ [${conf}] "${fp.name}" → "${dbP.name}"` +
        (xgPer90  !== null ? `  xG/90=${xgPer90.toFixed(3)}` : '') +
        (xgaPer90 !== null ? `  xGA/90=${xgaPer90.toFixed(3)}` : '')
      )

      if (!DRY_RUN) {
        try {
          await supabaseUpdate(dbP.id, update)
          stats.updated++
        } catch(e) {
          console.log(`    ❌ DB: ${e.message}`)
          stats.errors.push(`DB ${dbP.id}: ${e.message}`)
        }
      } else {
        stats.updated++
      }
    }
  }

  // ─── Zusammenfassung ──────────────────────────────────────────────────────

  const mins = Math.floor((Date.now() - startTime) / 60000)
  const secs = Math.floor(((Date.now() - startTime) % 60000) / 1000)

  console.log('\n' + '═'.repeat(50))
  console.log('%cZUSAMMENFASSUNG', 'color:#4ade80;font-weight:bold')
  console.log('═'.repeat(50))
  console.log(`Teams verarbeitet:      ${stats.teams}`)
  console.log(`Spieler auf FotMob:     ${stats.players}`)
  console.log(`Spieler gematcht:       ${stats.matched}`)
  console.log(`xG-Werte ${DRY_RUN ? 'gefunden' : 'gespeichert'}: ${stats.updated}`)
  console.log(`Laufzeit:               ${mins}m ${secs}s`)

  if (stats.noMatch.length > 0) {
    console.log(`\n⚠ Kein DB-Match (${stats.noMatch.length}):`)
    stats.noMatch.slice(0, 15).forEach(m => console.log('  ', m))
  }
  if (stats.errors.length > 0) {
    console.log(`\n❌ Fehler (${stats.errors.length}):`)
    stats.errors.slice(0, 10).forEach(e => console.log('  ', e))
  }

  if (DRY_RUN) {
    console.log('\n%c💡 Setze DRY_RUN = false und führe das Skript erneut aus um zu speichern.', 'color:orange')
  } else {
    console.log('\n%c✅ Import abgeschlossen!', 'color:#4ade80;font-weight:bold')
  }
}

// Starten!
main()
