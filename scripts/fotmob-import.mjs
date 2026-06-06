/**
 * fotmob-import.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Liest xG / xGA Spielerstatistiken von FotMob und schreibt sie in die
 * Supabase-Datenbank (Tabelle: players, Spalten: xg_per90, xga_per90).
 *
 * ANLEITUNG — einmalige Einrichtung:
 * 1. Öffne https://www.fotmob.com/de im Browser (Chrome oder Firefox).
 * 2. Drücke F12 → Reiter "Network" (Netzwerk).
 * 3. Klicke auf irgendein Land, z.B. Deutschland.
 * 4. Im Network-Tab erscheinen Requests. Klicke auf einen, der mit
 *    "www.fotmob.com/api/" beginnt (z.B. "teams?id=...").
 * 5. Rechtsklick auf den Request → "Copy" → "Copy as cURL".
 * 6. Füge den kopierten Text in einen Texteditor ein.
 * 7. Suche nach: -H 'cookie: ...'   → kopiere den Wert (OHNE Anführungszeichen)
 *    Suche nach: -H 'x-mas: ...'    → kopiere den Wert
 * 8. Trage beide Werte unten bei FOTMOB_COOKIE und FOTMOB_XMAS ein.
 *
 * AUSFÜHREN:
 *   node scripts/fotmob-import.mjs            ← Testlauf (kein DB-Schreiben)
 *   node scripts/fotmob-import.mjs --write    ← schreibt in die Datenbank
 *   node scripts/fotmob-import.mjs --team germany    ← nur ein Team
 */

// ─── KONFIGURATION ────────────────────────────────────────────────────────────

const FOTMOB_COOKIE = 'NEXT_LOCALE=de; u:location=%7B%22countryCode%22%3A%22DE%22%2C%22regionId%22%3Anull%2C%22ip%22%3A%22127.0.0.1%22%2C%22ccode3%22%3A%22DEU%22%2C%22ccode3NoRegion%22%3A%22DEU%22%2C%22timezone%22%3A%22Europe%2FBerlin%22%7D; turnstile_verified=1.1780735209.439907f7d7f4d3d48212d125b0d96a9723d0ee9f0b3d5aa6611bd0549d3047aa; g_state={"i_l":0,"i_ll":1780735846355,"i_b":"RCEmX3GuCchoHSjweggPtnsgYEb3H38tWOcDhbyfJIc","i_e":{"enable_itp_optimization":0},"i_et":1780735117705}'
const FOTMOB_XMAS   = 'eyJib2R5Ijp7InVybCI6Ii9hcGkvZGF0YS9tYXRjaGVzP2RhdGU9MjAyNjA2MDYmdGltZXpvbmU9RXVyb3BlJTJGQmVybGluJmNjb2RlMz1ERVUmaW5jbHVkZU5leHREYXlMYXRlTmlnaHQ9dHJ1ZSIsImNvZGUiOjE3ODA3MzU4OTM4ODQsImZvbyI6InByb2R1Y3Rpb246Y2QxMGQ4ZGVhM2IzYjFmYzMyM2UwMTE5ZDg1MDNjMjBjNjE0MDIzMiJ9LCJzaWduYXR1cmUiOiJBRDFGMjI5MkY3Q0FFNkFBRDdGMUQ3QkVENTdDRTZCMCJ9'

const SUPABASE_URL = 'https://bcwcgwoppuueduvzoyqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjd2Nnd29wcHV1ZWR1dnpveXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQ2NTcsImV4cCI6MjA5NDg0MDY1N30.U-J9aSUopsWyZSy_McLpG7RQQAxRayY7XsHCDUbnWiM'

// Pause zwischen FotMob-Requests (Millisekunden) — nicht zu schnell anfragen
const RATE_LIMIT_MS = 300

// ─── TEAM-MAPPING: FotMob-Teamname → unsere interne team_id ──────────────────

const TEAM_NAME_MAP = {
  'Germany':          'germany',
  'France':           'france',
  'Spain':            'spain',
  'England':          'england',
  'Brazil':           'brazil',
  'Argentina':        'argentina',
  'Portugal':         'portugal',
  'Netherlands':      'netherlands',
  'Belgium':          'belgium',
  'Switzerland':      'switzerland',
  'Croatia':          'croatia',
  'Denmark':          'denmark',
  'Sweden':           'sweden',
  'Norway':           'norway',
  'Austria':          'austria',
  'Czech Republic':   'czechia',
  'Czechia':          'czechia',
  'Turkey':           'turkey',
  'Scotland':         'scotland',
  'Bosnia and Herzegovina': 'bosnia',
  'Bosnia':           'bosnia',
  'Serbia':           'serbia',
  'Uruguay':          'uruguay',
  'Colombia':         'colombia',
  'Ecuador':          'ecuador',
  'Mexico':           'mexico',
  'USA':              'usa',
  'United States':    'usa',
  'Canada':           'canada',
  'Panama':           'panama',
  'Paraguay':         'paraguay',
  'Japan':            'japan',
  'South Korea':      'south_korea',
  'Korea Republic':   'south_korea',
  'Australia':        'australia',
  'Iran':             'iran',
  'Saudi Arabia':     'saudi_arabia',
  'Qatar':            'qatar',
  'Jordan':           'jordan',
  'Uzbekistan':       'uzbekistan',
  'Morocco':          'morocco',
  'Senegal':          'senegal',
  'Egypt':            'egypt',
  'Tunisia':          'tunisia',
  'Algeria':          'algeria',
  'Ghana':            'ghana',
  'South Africa':     'south_africa',
  'Ivory Coast':      'ivory_coast',
  "Côte d'Ivoire":   'ivory_coast',
  'DR Congo':         'congo_dr',
  'Congo DR':         'congo_dr',
  'Cape Verde':       'cape_verde',
  'Haiti':            'haiti',
  'Curaçao':          'curacao',
  'New Zealand':      'new_zealand',
  'Iraq':             'iraq',
}

// ─── HILFSFUNKTIONEN ─────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function normalize(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Akzente entfernen
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function nameSimilarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0
  if (na.includes(nb) || nb.includes(na)) return 0.9
  // Levenshtein-Abstand vereinfacht (Zeichenüberlappung)
  const setA = new Set(na.split(' '))
  const setB = new Set(nb.split(' '))
  const intersection = [...setA].filter(w => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return intersection / union
}

function findBestMatch(fotmobName, dbPlayers) {
  let best = null
  let bestScore = 0
  for (const p of dbPlayers) {
    const score = nameSimilarity(fotmobName, p.name)
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return bestScore >= 0.6 ? { player: best, score: bestScore } : null
}

async function fotmobGet(path) {
  const url = `https://www.fotmob.com/api/${path}`
  const res = await fetch(url, {
    headers: {
      'cookie':           FOTMOB_COOKIE,
      'x-mas':            FOTMOB_XMAS,
      'user-agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36',
      'accept':           'application/json, */*',
      'accept-language':  'de-DE,de;q=0.9,en;q=0.8',
      'referer':          'https://www.fotmob.com/de/',
      'origin':           'https://www.fotmob.com',
    },
  })
  if (!res.ok) throw new Error(`FotMob ${res.status} für ${url}`)
  return res.json()
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase GET ${res.status}`)
  return res.json()
}

async function supabaseUpdate(id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Supabase PATCH ${res.status}: ${txt}`)
  }
}

// ─── FOTMOB-DATEN AUSLESEN ────────────────────────────────────────────────────

async function getWM2026Teams() {
  console.log('📡 Lade WM 2026 Turnier-Daten von FotMob...')
  // Tournament ID 77 = FIFA World Cup (FotMob)
  const data = await fotmobGet('leagues?id=77&ccode3=DEU&type=league&timeZone=Europe%2FBerlin')

  const teams = []

  // FotMob gibt Teams in verschiedenen Strukturen zurück
  // Versuche mehrere bekannte Pfade:
  const sources = [
    data?.table?.[0]?.data?.table,            // Gruppenphase-Tabelle
    data?.stages?.[0]?.teams,                 // Stages
    data?.allAvailableSeasons,                // Saisonliste
  ]

  if (data?.details) {
    console.log(`   → Turnier: "${data.details.name}" (ID ${data.details.id})`)
  }

  // Versuche Teams aus der Tabelle zu extrahieren
  if (data?.table) {
    for (const group of (Array.isArray(data.table) ? data.table : [data.table])) {
      const tableData = group?.data?.table ?? group?.teams ?? []
      for (const entry of tableData) {
        if (entry.id && entry.name) {
          teams.push({ fotmobId: String(entry.id), name: entry.name })
        }
      }
    }
  }

  if (teams.length === 0) {
    console.log('   ⚠ Keine Teams in der Turniertabelle gefunden.')
    console.log('   → Fallback: Nutze vorbereitete FotMob-Team-ID-Tabelle')
    return getFallbackTeams()
  }

  console.log(`   ✓ ${teams.length} Teams gefunden`)
  return teams
}

// Fallback: Bekannte FotMob-IDs für WM 2026 Nationen
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

async function getTeamSquad(fotmobTeamId, teamName) {
  const data = await fotmobGet(`teams?id=${fotmobTeamId}&ccode3=DEU`)
  const players = []

  // FotMob squad structure: data.squads[].members[]
  const squads = data?.squads ?? []
  for (const squad of squads) {
    for (const member of (squad.members ?? [])) {
      if (member.id && member.name) {
        players.push({
          fotmobId: String(member.id),
          name: member.name,
          role: squad.title ?? '',         // z.B. "Goalkeepers", "Defenders" etc.
        })
      }
    }
  }

  // Alternativer Pfad
  if (players.length === 0 && data?.squad) {
    for (const p of (Array.isArray(data.squad) ? data.squad : [])) {
      if (p.id && p.name) {
        players.push({ fotmobId: String(p.id), name: p.name, role: '' })
      }
    }
  }

  return players
}

async function getPlayerStats(fotmobPlayerId, playerName) {
  const data = await fotmobGet(`playerData?id=${fotmobPlayerId}`)

  let xgPer90  = null
  let xgaPer90 = null
  let goals    = null
  let minutes  = null

  // FotMob stat response kann in verschiedenen Strukturen kommen
  // Suche in statSections nach xG-Werten
  const statSections = data?.statSections ?? data?.stats ?? []

  for (const section of (Array.isArray(statSections) ? statSections : [])) {
    const items = section?.items ?? section?.statsSection?.items ?? []
    for (const item of (Array.isArray(items) ? items : [])) {
      const key   = (item.key ?? item.title ?? '').toLowerCase()
      const val   = parseFloat(item.per90Value ?? item.per90 ?? item.value ?? '')

      if (isNaN(val)) continue

      if (key.includes('expected_goals') || key === 'xg' || key.includes('expected goals')) {
        xgPer90 = val
      }
      if (key.includes('expected_goals_against') || key === 'xga' || key.includes('expected goals against')) {
        xgaPer90 = val
      }
      if (key === 'goals' || key === 'tore') {
        goals = parseFloat(item.value ?? '')
      }
      if (key.includes('minut') || key === 'mins') {
        minutes = parseFloat(item.value ?? '')
      }
    }
  }

  // Fallback: durchsuche flach alle Felder
  if (xgPer90 === null) {
    const searchDeep = (obj, depth = 0) => {
      if (depth > 6 || !obj || typeof obj !== 'object') return
      for (const [k, v] of Object.entries(obj)) {
        const key = String(k).toLowerCase()
        if ((key === 'xg' || key.includes('expected_goals')) && !key.includes('against')) {
          const parsed = parseFloat(String(v))
          if (!isNaN(parsed) && parsed >= 0 && parsed < 5) xgPer90 = parsed
        }
        if (key.includes('xga') || key.includes('expected_goals_against')) {
          const parsed = parseFloat(String(v))
          if (!isNaN(parsed) && parsed >= 0 && parsed < 5) xgaPer90 = parsed
        }
        if (typeof v === 'object') searchDeep(v, depth + 1)
      }
    }
    searchDeep(data)
  }

  return { xgPer90, xgaPer90, goals, minutes }
}

// ─── HAUPTPROGRAMM ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const DRY_RUN   = !args.includes('--write')
  const ONLY_TEAM = args.find((a, i) => args[i - 1] === '--team')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║       FotMob → WM2026 DB  –  xG/xGA Import          ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(DRY_RUN ? '⚠  TESTLAUF — kein DB-Schreiben (add --write zum Speichern)' : '✏  SCHREIBMODUS — Daten werden in DB gespeichert')
  console.log()

  // Verbindung zu FotMob testen
  if (FOTMOB_COOKIE === 'HIER_COOKIE_EINFÜGEN') {
    console.error('❌ FOTMOB_COOKIE ist nicht gesetzt!')
    console.error('   Bitte lies die Anleitung am Anfang der Datei.')
    process.exit(1)
  }

  // Spieler aus DB laden
  console.log('📥 Lade Spieler aus Supabase...')
  const dbPlayers = await supabaseGet('players?select=id,name,team_id,position,xg_per90,xga_per90&order=team_id')
  console.log(`   ✓ ${dbPlayers.length} Spieler geladen`)
  console.log()

  // Nach team_id gruppieren
  const byTeam = {}
  for (const p of dbPlayers) {
    if (!byTeam[p.team_id]) byTeam[p.team_id] = []
    byTeam[p.team_id].push(p)
  }

  // WM 2026 Teams von FotMob holen
  let fotmobTeams
  try {
    fotmobTeams = await getWM2026Teams()
    await sleep(RATE_LIMIT_MS)
  } catch (err) {
    console.error(`❌ FotMob-Fehler beim Laden der Teams: ${err.message}`)
    console.error('   → Prüfe FOTMOB_COOKIE und FOTMOB_XMAS.')
    process.exit(1)
  }

  // Filter auf gewünschtes Team (--team flag)
  if (ONLY_TEAM) {
    fotmobTeams = fotmobTeams.filter(t => {
      const internalId = TEAM_NAME_MAP[t.name] ?? normalize(t.name).replace(/\s/g, '_')
      return internalId === ONLY_TEAM || normalize(t.name).includes(ONLY_TEAM)
    })
    if (fotmobTeams.length === 0) {
      console.error(`❌ Team "${ONLY_TEAM}" nicht in der FotMob-Liste gefunden.`)
      process.exit(1)
    }
  }

  // Ergebnis-Tracking
  const results = {
    teamsProcessed: 0,
    playersFound:   0,
    matched:        0,
    updated:        0,
    noMatch:        [],
    errors:         [],
  }

  // ─── Pro Team ─────────────────────────────────────────────────────────────

  for (const fotmobTeam of fotmobTeams) {
    const internalId = TEAM_NAME_MAP[fotmobTeam.name]
    if (!internalId) {
      console.log(`⏭  "${fotmobTeam.name}" → kein Mapping, überspringe`)
      continue
    }

    const dbTeamPlayers = byTeam[internalId] ?? []
    if (dbTeamPlayers.length === 0) {
      console.log(`⏭  ${internalId}: kein Kader in DB, überspringe`)
      continue
    }

    console.log(`\n🏳  ${fotmobTeam.name} (FotMob-ID: ${fotmobTeam.fotmobId}) → ${internalId}`)
    console.log(`   DB: ${dbTeamPlayers.length} Spieler`)

    // Squad von FotMob holen
    let squad
    try {
      squad = await getTeamSquad(fotmobTeam.fotmobId, fotmobTeam.name)
      await sleep(RATE_LIMIT_MS)
    } catch (err) {
      console.log(`   ❌ Squad-Fehler: ${err.message}`)
      results.errors.push(`${internalId}: ${err.message}`)
      continue
    }

    console.log(`   FotMob: ${squad.length} Spieler im Kader`)
    results.teamsProcessed++

    // ─── Pro Spieler ──────────────────────────────────────────────────────

    for (const fotmobPlayer of squad) {
      results.playersFound++

      // Gegen DB-Spieler matchen
      const match = findBestMatch(fotmobPlayer.name, dbTeamPlayers)
      if (!match) {
        results.noMatch.push(`${internalId}: "${fotmobPlayer.name}" (kein DB-Match)`)
        continue
      }

      results.matched++
      const dbPlayer = match.player
      const confidence = match.score >= 0.95 ? '✓' : `~${Math.round(match.score * 100)}%`

      // Stats von FotMob holen
      let stats
      try {
        stats = await getPlayerStats(fotmobPlayer.fotmobId, fotmobPlayer.name)
        await sleep(RATE_LIMIT_MS)
      } catch (err) {
        console.log(`   ⚠  ${fotmobPlayer.name}: Stats-Fehler: ${err.message}`)
        results.errors.push(`${fotmobPlayer.name}: ${err.message}`)
        continue
      }

      const { xgPer90, xgaPer90 } = stats

      // Nur updaten wenn wir tatsächlich Werte haben
      if (xgPer90 === null && xgaPer90 === null) {
        process.stdout.write(`   ─  ${fotmobPlayer.name} [${confidence}] → keine xG-Daten\n`)
        continue
      }

      const update = {}
      if (xgPer90 !== null)  update.xg_per90  = xgPer90
      if (xgaPer90 !== null) update.xga_per90 = xgaPer90

      const line = [
        `   ✎  "${fotmobPlayer.name}" [${confidence}] → "${dbPlayer.name}"`,
        xgPer90  !== null ? `xG/90=${xgPer90.toFixed(3)}`  : '',
        xgaPer90 !== null ? `xGA/90=${xgaPer90.toFixed(3)}` : '',
      ].filter(Boolean).join('  ')
      console.log(line)

      if (!DRY_RUN) {
        try {
          await supabaseUpdate(dbPlayer.id, update)
          results.updated++
        } catch (err) {
          console.log(`      ❌ DB-Fehler: ${err.message}`)
          results.errors.push(`DB update ${dbPlayer.id}: ${err.message}`)
        }
      } else {
        results.updated++ // zählen auch im Testlauf
      }
    }
  }

  // ─── Zusammenfassung ──────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(56))
  console.log('ZUSAMMENFASSUNG')
  console.log('═'.repeat(56))
  console.log(`Teams verarbeitet:    ${results.teamsProcessed}`)
  console.log(`Spieler auf FotMob:   ${results.playersFound}`)
  console.log(`Spieler gematcht:     ${results.matched}`)
  console.log(`Spieler ${DRY_RUN ? 'würden' : 'wurden'} upgedated: ${results.updated}`)

  if (results.noMatch.length > 0) {
    console.log(`\nOhne DB-Match (${results.noMatch.length}):`)
    for (const m of results.noMatch.slice(0, 20)) console.log(`  ${m}`)
    if (results.noMatch.length > 20) console.log(`  ... und ${results.noMatch.length - 20} weitere`)
  }

  if (results.errors.length > 0) {
    console.log(`\nFehler (${results.errors.length}):`)
    for (const e of results.errors.slice(0, 10)) console.log(`  ⚠ ${e}`)
  }

  if (DRY_RUN) {
    console.log('\n💡 Führe mit --write aus um die Daten zu speichern:')
    console.log('   node scripts/fotmob-import.mjs --write')
  }
}

main().catch(err => {
  console.error('❌ Unbehandelter Fehler:', err)
  process.exit(1)
})
