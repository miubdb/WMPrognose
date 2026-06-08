#!/usr/bin/env node
/**
 * Transfermarkt HTML → Supabase Kader-Import
 *
 * Verwendung:
 *   node scripts/import-transfermarkt-html.mjs <pfad-zur-html-datei> [--dry-run]
 *
 * Was es tut:
 *   1. Parst die gespeicherte Transfermarkt-HTML-Kaderseite
 *   2. Erkennt das Team anhand des Seitentitels
 *   3. Liest aktuelle Spieler dieses Teams aus der DB
 *   4. Matcht nach Name (exakt → normalisiert → fuzzy)
 *   5. Überschreibt: market_value_m, age, jersey_number, club_team, position
 *   6. Neue Spieler werden EINGEFÜGT (mit korrekter team_id)
 *   7. --dry-run: nur Ausgabe, kein DB-Schreiben
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load .env.local manually
try {
  const env = readFileSync('.env.local', 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* no .env.local — use existing process.env */ }

// ─── Konfiguration ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const htmlPath = process.argv.find(a => a.endsWith('.html'))
if (!htmlPath) { console.error('Kein HTML-Pfad angegeben.'); process.exit(1) }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) { console.error('Supabase-Umgebungsvariablen fehlen.'); process.exit(1) }

const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Team-Mapping: Transfermarkt-Name → unsere team_id ────────────────────────
const TM_NAME_TO_ID = {
  'Argentinien': 'argentina', 'Australien': 'australia', 'Österreich': 'austria',
  'Belgien': 'belgium', 'Bosnien-Herzegowina': 'bosnia', 'Brasilien': 'brazil',
  'Kanada': 'canada', 'Kap Verde': 'cape_verde', 'Kolumbien': 'colombia',
  'Kongo DR': 'congo_dr', 'Kroatien': 'croatia', 'Curaçao': 'curacao',
  'Tschechien': 'czechia', 'Ecuador': 'ecuador', 'Ägypten': 'egypt',
  'England': 'england', 'Frankreich': 'france', 'Deutschland': 'germany',
  'Ghana': 'ghana', 'Haiti': 'haiti', 'Iran': 'iran',
  'Irak': 'iraq', 'Elfenbeinküste': 'ivory_coast', 'Japan': 'japan',
  'Jordanien': 'jordan', 'Mexiko': 'mexico', 'Marokko': 'morocco',
  'Niederlande': 'netherlands', 'Neuseeland': 'new_zealand', 'Norwegen': 'norway',
  'Panama': 'panama', 'Paraguay': 'paraguay', 'Portugal': 'portugal',
  'Katar': 'qatar', 'Saudi-Arabien': 'saudi_arabia', 'Schottland': 'scotland',
  'Senegal': 'senegal', 'Südafrika': 'south_africa', 'Südkorea': 'south_korea',
  'Spanien': 'spain', 'Schweden': 'sweden', 'Schweiz': 'switzerland',
  'Tunesien': 'tunisia', 'Türkei': 'turkey', 'Uruguay': 'uruguay',
  'USA': 'usa', 'Usbekistan': 'uzbekistan',
}

// ─── Position-Mapping ─────────────────────────────────────────────────────────
const POS_MAP = {
  'bg_Torwart': 'GK',
  'bg_Abwehr': 'DEF',
  'bg_Mittelfeld': 'MID',
  'bg_Sturm': 'FWD',
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function parseMarketValue(text) {
  if (!text || text.trim() === '-') return null
  const t = text.replace(/\s/g, ' ').trim()
  const mioMatch = t.match(/([\d,]+)\s*Mio\./)
  if (mioMatch) return parseFloat(mioMatch[1].replace(',', '.'))
  const tsdMatch = t.match(/([\d.]+)\s*Tsd\./)
  if (tsdMatch) return parseFloat(tsdMatch[1].replace('.', '').replace(',', '.')) / 1000
  const rawMatch = t.match(/([\d.,]+)/)
  if (rawMatch) {
    const v = parseFloat(rawMatch[1].replace('.', '').replace(',', '.'))
    return v > 1000 ? v / 1000000 : v
  }
  return null
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a, b) {
  const na = normalizeName(a), nb = normalizeName(b)
  if (na === nb) return 1
  const wordsA = na.split(' '), wordsB = nb.split(' ')
  const common = wordsA.filter(w => wordsB.includes(w) && w.length > 2).length
  return common / Math.max(wordsA.length, wordsB.length)
}

// ─── HTML parsen ──────────────────────────────────────────────────────────────

function parseHtml(html) {
  // Team-Name aus og:title
  const titleMatch = html.match(/og:title[^>]+content="([^"]+)"/)
  const rawTitle = titleMatch ? titleMatch[1] : ''
  const teamName = rawTitle.replace(/ - Kader im Detail \d+/, '').replace(/ \| Transfermarkt/, '').trim()

  // Strategie: sequentielle Extraktion per Ankermarker.
  // Grund: <tr class="odd"> enthält geschachtelte <tr> (inline-table) →
  // einfache TR-Regex bricht bei erstem inneren </tr> ab.
  //
  // Wir suchen alle Positons-Zellen als Anker:
  //   <td class="zentriert rueckennummer bg_Torwart" title="Torwart">
  // Dann lesen wir den HTML-Block von diesem Anker bis zum nächsten Anker
  // (oder bis zum Ende der Tabelle) und extrahieren daraus alle Felder.

  const players = []
  // Finde alle Positons-Anker und deren Positionen im HTML
  const anchorRegex = /(<td class="zentriert rueckennummer bg_(Torwart|Abwehr|Mittelfeld|Sturm)")/g
  const anchors = []
  let m
  while ((m = anchorRegex.exec(html)) !== null) {
    anchors.push({ index: m.index, pos: POS_MAP[`bg_${m[2]}`] })
  }

  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index
    const end = i + 1 < anchors.length ? anchors[i + 1].index : html.length
    const block = html.slice(start, end)
    const position = anchors[i].pos

    // Trikotnummer
    const jerseyMatch = block.match(/<div class="rn_nummer">(\d+)<\/div>/)
    const jerseyNumber = jerseyMatch ? parseInt(jerseyMatch[1]) : null

    // Name: aus profil/spieler Link
    const nameMatch = block.match(/href="[^"]+\/profil\/spieler\/\d+"[^>]*>\s*([^<\n]+?)\s*<\/a>/)
    if (!nameMatch) continue
    const name = nameMatch[1].trim()

    // Alter: steht nach dem schließenden </table></td> des inline-table
    // Format: </td><td class="zentriert">29</td>
    const ageMatch = block.match(/<\/tbody><\/table>\s*<\/td><td class="zentriert">(\d+)<\/td>/)
    const age = ageMatch ? parseInt(ageMatch[1]) : null

    // Verein: <a title="Vereinsname" href="...startseite/verein/...">
    const clubMatch = block.match(/<a title="([^"]+)" href="[^"]+\/startseite\/verein\/\d+">/)
    const clubTeam = clubMatch ? clubMatch[1].trim() : null

    // Marktwert: <a href="...marktwertverlauf/spieler/...">1,60 Mio. €</a>
    const mvMatch = block.match(/marktwertverlauf\/spieler\/\d+">([^<]+)<\/a>/)
    const marketValueRaw = mvMatch ? mvMatch[1].trim() : null
    const marketValueM = parseMarketValue(marketValueRaw)

    players.push({ name, position, jerseyNumber, age, clubTeam, marketValueM, marketValueRaw })
  }

  return { teamName, players }
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function matchPlayer(tmPlayer, dbPlayers) {
  // 1. Exakter Namensabgleich
  const exact = dbPlayers.find(p => p.name === tmPlayer.name)
  if (exact) return { player: exact, score: 1.0, method: 'exact' }

  // 2. Normalisierter Abgleich
  const normalized = dbPlayers.find(p => normalizeName(p.name) === normalizeName(tmPlayer.name))
  if (normalized) return { player: normalized, score: 0.95, method: 'normalized' }

  // 3. Fuzzy — beste Ähnlichkeit
  let best = null, bestScore = 0
  for (const p of dbPlayers) {
    const s = similarity(p.name, tmPlayer.name)
    if (s > bestScore) { bestScore = s; best = p }
  }
  if (bestScore >= 0.7) return { player: best, score: bestScore, method: 'fuzzy' }

  return null
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────

async function main() {
  const html = readFileSync(htmlPath, 'utf-8')
  const { teamName, players: tmPlayers } = parseHtml(html)

  const teamId = TM_NAME_TO_ID[teamName]
  if (!teamId) {
    console.error(`Unbekannter Team-Name: "${teamName}"`)
    console.error('Verfügbare Namen:', Object.keys(TM_NAME_TO_ID).join(', '))
    process.exit(1)
  }

  console.log(`\n📋 Team: ${teamName} → team_id: ${teamId}`)
  console.log(`📦 ${tmPlayers.length} Spieler aus TM-HTML extrahiert`)
  if (DRY_RUN) console.log('🔍 DRY-RUN — kein DB-Schreiben\n')

  // Aktuelle DB-Spieler dieses Teams laden
  const { data: dbPlayers, error } = await supabase
    .from('players')
    .select('id, name, position, jersey_number, age, market_value_m, club_team')
    .eq('team_id', teamId)

  if (error) { console.error('DB-Fehler:', error.message); process.exit(1) }
  console.log(`💾 ${dbPlayers.length} Spieler aktuell in DB für dieses Team\n`)

  const updates = [], inserts = [], unmatched = []

  for (const tm of tmPlayers) {
    const match = matchPlayer(tm, dbPlayers)

    if (match) {
      const dbP = match.player
      const changed = []
      const update = { id: dbP.id }

      if (tm.marketValueM !== null && Math.abs((tm.marketValueM ?? 0) - (dbP.market_value_m ?? 0)) > 0.001) {
        update.market_value_m = tm.marketValueM
        changed.push(`MV: ${dbP.market_value_m}→${tm.marketValueM}`)
      }
      if (tm.age !== null && tm.age !== dbP.age) {
        update.age = tm.age
        changed.push(`Age: ${dbP.age}→${tm.age}`)
      }
      if (tm.jerseyNumber !== null && tm.jerseyNumber !== dbP.jersey_number) {
        update.jersey_number = tm.jerseyNumber
        changed.push(`#${dbP.jersey_number}→${tm.jerseyNumber}`)
      }
      if (tm.clubTeam && tm.clubTeam !== dbP.club_team) {
        update.club_team = tm.clubTeam
        changed.push(`Club: "${dbP.club_team}"→"${tm.clubTeam}"`)
      }
      if (tm.position && tm.position !== dbP.position) {
        update.position = tm.position
        changed.push(`Pos: ${dbP.position}→${tm.position}`)
      }

      const matchInfo = match.method === 'exact' ? '' : ` (${match.method} ${Math.round(match.score*100)}%)`
      if (changed.length > 0) {
        console.log(`✏️  ${dbP.name}${matchInfo}: ${changed.join(', ')}`)
        updates.push(update)
      } else {
        console.log(`✓  ${dbP.name}${matchInfo}: keine Änderung`)
      }
    } else {
      // Neuer Spieler — einfügen
      unmatched.push(tm)
      console.log(`➕ NEU: ${tm.name} (${tm.position}, #${tm.jerseyNumber}, ${tm.marketValueM}M€, Age ${tm.age}, ${tm.clubTeam})`)
      inserts.push({
        team_id: teamId,
        name: tm.name,
        position: tm.position,
        jersey_number: tm.jerseyNumber,
        age: tm.age ?? 25,
        market_value_m: tm.marketValueM ?? 0.5,
        club_team: tm.clubTeam,
        rating: Math.round((tm.marketValueM ?? 0.5) * 2 + 40), // einfache Schätzung
        is_in_starting_xi: false,
      })
    }
  }

  console.log(`\n📊 Zusammenfassung: ${updates.length} Updates, ${inserts.length} Neuzugänge, ${tmPlayers.length} gesamt`)

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Keine Änderungen geschrieben.')
    return
  }

  // Updates durchführen
  let updateErrors = 0
  for (const u of updates) {
    const { id, ...data } = u
    const { error } = await supabase.from('players').update(data).eq('id', id)
    if (error) { console.error(`Update-Fehler ${id}:`, error.message); updateErrors++ }
  }

  // Inserts durchführen
  let insertErrors = 0
  if (inserts.length > 0) {
    const { error } = await supabase.from('players').insert(inserts)
    if (error) { console.error('Insert-Fehler:', error.message); insertErrors++ }
  }

  console.log(`\n✅ Fertig: ${updates.length - updateErrors} Updates, ${inserts.length - insertErrors} Einfügungen`)
  if (updateErrors + insertErrors > 0) console.warn(`⚠️  ${updateErrors + insertErrors} Fehler aufgetreten`)
}

main().catch(e => { console.error(e); process.exit(1) })
