/**
 * Venue-Daten für die FIFA WM 2026 – alle 16 Spielorte
 * Quellen: McSharry (2007) für Altitude, Mohr et al. (2012) für WBGT,
 *          Pollard (1986) für Heimvorteil-Kontext.
 * DUMMY-DATEN: Klimadaten sind Schätzungen für Juni/Juli 2026.
 */

export interface VenueData {
  id: string
  name: string            // FIFA-Bezeichnung / Stadtname
  city: string            // Stadt
  country: 'USA' | 'Mexico' | 'Canada'
  stadium: string         // Offizieller Stadionname
  fifaName: string        // FIFA-Stadionbezeichnung
  capacity: number

  // ─── Geografie (McSharry 2007) ──────────────────────────────────────────────
  altitudeMeters: number
  latitude: number

  // ─── Klimadaten für Juni/Juli (historische Mittelwerte) ─────────────────────
  expectedTemperatureC: number
  expectedHumidityPercent: number
  estimatedWBGT: number   // Wet Bulb Globe Temperature (Mohr et al. 2012)

  // ─── Zeitzone ────────────────────────────────────────────────────────────────
  timezoneUTCOffset: number  // Stunden von UTC (Sommerzeit)
  timezone: string

  // ─── Heimvorteil-Kontext (Pollard 1986) ─────────────────────────────────────
  culturallyCloseTeams: string[]

  // ─── Spiele ──────────────────────────────────────────────────────────────────
  groupGames: number
  koGames: number
}

export const VENUES: Record<string, VenueData> = {

  // ─── KANADA ──────────────────────────────────────────────────────────────────

  toronto: {
    id: 'toronto',
    name: 'Toronto',
    city: 'Toronto',
    country: 'Canada',
    stadium: 'BMO Field',
    fifaName: 'Toronto-Stadion',
    capacity: 45000,
    altitudeMeters: 76,
    latitude: 43.6,
    expectedTemperatureC: 23,
    expectedHumidityPercent: 68,
    estimatedWBGT: 21.5,
    timezoneUTCOffset: -4,
    timezone: 'EDT (UTC−4)',
    culturallyCloseTeams: ['canada', 'usa'],
    groupGames: 6,
    koGames: 0,
  },

  vancouver: {
    id: 'vancouver',
    name: 'Vancouver',
    city: 'Vancouver',
    country: 'Canada',
    stadium: 'BC Place',
    fifaName: 'Vancouver-Stadion',
    capacity: 54000,
    altitudeMeters: 15,
    latitude: 49.3,
    expectedTemperatureC: 19,
    expectedHumidityPercent: 72,
    estimatedWBGT: 18.0,
    timezoneUTCOffset: -7,
    timezone: 'PDT (UTC−7)',
    culturallyCloseTeams: ['canada', 'usa'],
    groupGames: 3,
    koGames: 0,
  },

  // ─── USA ─────────────────────────────────────────────────────────────────────

  dallas: {
    id: 'dallas',
    name: 'Dallas/Arlington',
    city: 'Arlington, Texas',
    country: 'USA',
    stadium: 'AT&T Stadium',
    fifaName: 'Dallas-Stadion',
    capacity: 94000,
    altitudeMeters: 139,
    latitude: 32.7,
    expectedTemperatureC: 32,
    expectedHumidityPercent: 60,
    estimatedWBGT: 28.5,
    timezoneUTCOffset: -5,
    timezone: 'CDT (UTC−5)',
    culturallyCloseTeams: ['usa', 'mexico'],
    groupGames: 8,
    koGames: 4,
  },

  atlanta: {
    id: 'atlanta',
    name: 'Atlanta',
    city: 'Atlanta, Georgia',
    country: 'USA',
    stadium: 'Mercedes-Benz Stadium',
    fifaName: 'Atlanta-Stadion',
    capacity: 75000,
    altitudeMeters: 300,
    latitude: 33.8,
    expectedTemperatureC: 30,
    expectedHumidityPercent: 70,
    estimatedWBGT: 28.0,
    timezoneUTCOffset: -4,
    timezone: 'EDT (UTC−4)',
    culturallyCloseTeams: ['usa'],
    groupGames: 0,
    koGames: 0,
  },

  new_york: {
    id: 'new_york',
    name: 'New York/New Jersey',
    city: 'East Rutherford, New Jersey',
    country: 'USA',
    stadium: 'MetLife Stadium',
    fifaName: 'New-York-New-Jersey-Stadion',
    capacity: 82500,
    altitudeMeters: 10,
    latitude: 40.8,
    expectedTemperatureC: 26,
    expectedHumidityPercent: 65,
    estimatedWBGT: 24.0,
    timezoneUTCOffset: -4,
    timezone: 'EDT (UTC−4)',
    culturallyCloseTeams: ['usa', 'portugal', 'brazil'],
    groupGames: 9,
    koGames: 3,
  },

  boston: {
    id: 'boston',
    name: 'Boston/Foxborough',
    city: 'Foxborough, Massachusetts',
    country: 'USA',
    stadium: 'Gillette Stadium',
    fifaName: 'Boston-Stadion',
    capacity: 65000,
    altitudeMeters: 18,
    latitude: 42.1,
    expectedTemperatureC: 24,
    expectedHumidityPercent: 68,
    estimatedWBGT: 22.5,
    timezoneUTCOffset: -4,
    timezone: 'EDT (UTC−4)',
    culturallyCloseTeams: ['usa'],
    groupGames: 0,
    koGames: 0,
  },

  houston: {
    id: 'houston',
    name: 'Houston',
    city: 'Houston, Texas',
    country: 'USA',
    stadium: 'NRG Stadium',
    fifaName: 'Houston-Stadion',
    capacity: 72000,
    altitudeMeters: 15,
    latitude: 29.7,
    expectedTemperatureC: 33,
    expectedHumidityPercent: 75,
    estimatedWBGT: 31.2,
    timezoneUTCOffset: -5,
    timezone: 'CDT (UTC−5)',
    culturallyCloseTeams: ['usa', 'mexico'],
    groupGames: 8,
    koGames: 2,
  },

  los_angeles: {
    id: 'los_angeles',
    name: 'Los Angeles/Inglewood',
    city: 'Inglewood, California',
    country: 'USA',
    stadium: 'SoFi Stadium',
    fifaName: 'Los-Angeles-Stadion',
    capacity: 70000,
    altitudeMeters: 30,
    latitude: 33.9,
    expectedTemperatureC: 27,
    expectedHumidityPercent: 60,
    estimatedWBGT: 24.5,
    timezoneUTCOffset: -7,
    timezone: 'PDT (UTC−7)',
    culturallyCloseTeams: ['usa', 'mexico'],
    groupGames: 9,
    koGames: 4,
  },

  kansas_city: {
    id: 'kansas_city',
    name: 'Kansas City',
    city: 'Kansas City, Missouri',
    country: 'USA',
    stadium: 'Arrowhead Stadium',
    fifaName: 'Kansas-City-Stadion',
    capacity: 73000,
    altitudeMeters: 271,
    latitude: 39.0,
    expectedTemperatureC: 30,
    expectedHumidityPercent: 65,
    estimatedWBGT: 27.5,
    timezoneUTCOffset: -5,
    timezone: 'CDT (UTC−5)',
    culturallyCloseTeams: ['usa'],
    groupGames: 0,
    koGames: 0,
  },

  miami: {
    id: 'miami',
    name: 'Miami',
    city: 'Miami Gardens, Florida',
    country: 'USA',
    stadium: 'Hard Rock Stadium',
    fifaName: 'Miami-Stadion',
    capacity: 65000,
    altitudeMeters: 2,
    latitude: 25.9,
    expectedTemperatureC: 31,
    expectedHumidityPercent: 78,
    estimatedWBGT: 29.8,
    timezoneUTCOffset: -4,
    timezone: 'EDT (UTC−4)',
    culturallyCloseTeams: ['usa', 'brazil', 'argentina'],
    groupGames: 10,
    koGames: 3,
  },

  philadelphia: {
    id: 'philadelphia',
    name: 'Philadelphia',
    city: 'Philadelphia, Pennsylvania',
    country: 'USA',
    stadium: 'Lincoln Financial Field',
    fifaName: 'Philadelphia-Stadion',
    capacity: 69000,
    altitudeMeters: 7,
    latitude: 39.9,
    expectedTemperatureC: 27,
    expectedHumidityPercent: 65,
    estimatedWBGT: 25.0,
    timezoneUTCOffset: -4,
    timezone: 'EDT (UTC−4)',
    culturallyCloseTeams: ['usa'],
    groupGames: 0,
    koGames: 0,
  },

  san_francisco: {
    id: 'san_francisco',
    name: 'San Francisco Bay Area/Santa Clara',
    city: 'Santa Clara, California',
    country: 'USA',
    stadium: "Levi's Stadium",
    fifaName: 'San-Francisco-Bay-Area-Stadion',
    capacity: 71000,
    altitudeMeters: 16,
    latitude: 37.4,
    expectedTemperatureC: 21,
    expectedHumidityPercent: 65,
    estimatedWBGT: 19.5,
    timezoneUTCOffset: -7,
    timezone: 'PDT (UTC−7)',
    culturallyCloseTeams: ['usa'],
    groupGames: 0,
    koGames: 0,
  },

  seattle: {
    id: 'seattle',
    name: 'Seattle',
    city: 'Seattle, Washington',
    country: 'USA',
    stadium: 'Lumen Field',
    fifaName: 'Seattle-Stadion',
    capacity: 69000,
    altitudeMeters: 15,
    latitude: 47.6,
    expectedTemperatureC: 19,
    expectedHumidityPercent: 65,
    estimatedWBGT: 18.5,
    timezoneUTCOffset: -7,
    timezone: 'PDT (UTC−7)',
    culturallyCloseTeams: ['usa'],
    groupGames: 0,
    koGames: 0,
  },

  // ─── MEXIKO ───────────────────────────────────────────────────────────────────

  monterrey: {
    id: 'monterrey',
    name: 'Monterrey/Guadalupe',
    city: 'Guadalupe, Nuevo León',
    country: 'Mexico',
    stadium: 'Estadio BBVA',
    fifaName: 'Monterrey-Stadion',
    capacity: 53500,
    altitudeMeters: 538,
    latitude: 25.7,
    expectedTemperatureC: 34,
    expectedHumidityPercent: 62,
    estimatedWBGT: 30.5,
    timezoneUTCOffset: -6,
    timezone: 'CST (UTC−6)',
    culturallyCloseTeams: ['mexico', 'usa'],
    groupGames: 3,
    koGames: 0,
  },

  mexico_city: {
    id: 'mexico_city',
    name: 'Mexiko-Stadt',
    city: 'Mexiko-Stadt',
    country: 'Mexico',
    stadium: 'Estadio Azteca',
    fifaName: 'Mexiko-Stadt-Stadion',
    capacity: 83000,
    altitudeMeters: 2240,
    latitude: 19.4,
    expectedTemperatureC: 20,
    expectedHumidityPercent: 55,
    estimatedWBGT: 18.5,
    timezoneUTCOffset: -6,
    timezone: 'CST (UTC−6)',
    culturallyCloseTeams: ['mexico', 'usa'],
    groupGames: 3,
    koGames: 0,
  },

  guadalajara: {
    id: 'guadalajara',
    name: 'Guadalajara/Zapopan',
    city: 'Zapopan, Jalisco',
    country: 'Mexico',
    stadium: 'Estadio Akron',
    fifaName: 'Guadalajara-Stadion',
    capacity: 48000,
    altitudeMeters: 1566,
    latitude: 20.7,
    expectedTemperatureC: 24,
    expectedHumidityPercent: 50,
    estimatedWBGT: 21.0,
    timezoneUTCOffset: -6,
    timezone: 'CST (UTC−6)',
    culturallyCloseTeams: ['mexico', 'usa'],
    groupGames: 2,
    koGames: 0,
  },
}

export type VenueId = keyof typeof VENUES

export const ALL_VENUES = Object.values(VENUES)
