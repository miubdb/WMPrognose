/**
 * Venue-Daten für die FIFA WM 2026
 * Quellen: McSharry (2007) für Altitude, Mohr et al. (2012) für WBGT,
 *          Pollard (1986) für Heimvorteil-Kontext.
 * DUMMY-DATEN: Klimadaten sind Schätzungen für Juni/Juli 2026.
 */

export interface VenueData {
  id: string;
  name: string;
  city: string;
  country: 'USA' | 'Mexico' | 'Canada';
  stadium: string;
  capacity: number;

  // ─── Geografie (McSharry 2007) ──────────────────────────────────────────────
  altitudeMeters: number;
  latitude: number;

  // ─── Klimadaten für Juni/Juli (DUMMY - historische Mittelwerte) ─────────────
  expectedTemperatureC: number;
  expectedHumidityPercent: number;
  // WBGT: Wet Bulb Globe Temperature – Hitzebelastungsindex
  // Formel WBGT ≈ 0.567*T + 0.393*e + 3.94 (Mohr et al. 2012)
  // ANNAHME: Vereinfacht geschätzt aus Temp + Luftfeuchtigkeit
  estimatedWBGT: number;

  // ─── Zeitzone (für Reisefatigueberechnung, Reilly et al. 2007) ─────────────
  timezoneUTCOffset: number;  // Stunden von UTC

  // ─── Heimvorteil-Kontext (Pollard 1986, Sors 2020) ─────────────────────────
  // Welche Teams haben hier kulturelle/Diaspora-Nähe?
  culturallyCloseTeams: string[];  // Team-IDs
}

export const VENUES: Record<string, VenueData> = {

  mexico_city: {
    id: 'mexico_city',
    name: 'Mexico City',
    city: 'Mexico City',
    country: 'Mexico',
    stadium: 'Estadio Azteca',
    capacity: 87000,
    altitudeMeters: 2240,    // Kritische Höhe für nicht-akklimatisierte Teams (McSharry 2007)
    latitude: 19.4,
    expectedTemperatureC: 20,
    expectedHumidityPercent: 55,
    estimatedWBGT: 18.5,     // Moderat durch Höhe
    timezoneUTCOffset: -6,
    culturallyCloseTeams: ['mexico', 'usa'],
  },

  guadalajara: {
    id: 'guadalajara',
    name: 'Guadalajara',
    city: 'Guadalajara',
    country: 'Mexico',
    stadium: 'Estadio Akron',
    capacity: 49850,
    altitudeMeters: 1566,
    latitude: 20.7,
    expectedTemperatureC: 24,
    expectedHumidityPercent: 50,
    estimatedWBGT: 21.0,
    timezoneUTCOffset: -6,
    culturallyCloseTeams: ['mexico', 'usa'],
  },

  monterrey: {
    id: 'monterrey',
    name: 'Monterrey',
    city: 'Monterrey',
    country: 'Mexico',
    stadium: 'Estadio BBVA',
    capacity: 53500,
    altitudeMeters: 538,
    latitude: 25.7,
    expectedTemperatureC: 34,
    expectedHumidityPercent: 62,
    estimatedWBGT: 30.5,    // KRITISCH: Über WBGT-Schwelle (Mohr 2012)
    timezoneUTCOffset: -6,
    culturallyCloseTeams: ['mexico', 'usa'],
  },

  miami: {
    id: 'miami',
    name: 'Miami',
    city: 'Miami, Florida',
    country: 'USA',
    stadium: 'Hard Rock Stadium',
    capacity: 65326,
    altitudeMeters: 2,
    latitude: 25.9,
    expectedTemperatureC: 31,
    expectedHumidityPercent: 78,
    estimatedWBGT: 29.8,    // HOCH: Subtropisch im Sommer
    timezoneUTCOffset: -4,
    culturallyCloseTeams: ['usa', 'brazil', 'argentina'],
  },

  houston: {
    id: 'houston',
    name: 'Houston',
    city: 'Houston, Texas',
    country: 'USA',
    stadium: 'NRG Stadium',
    capacity: 72220,
    altitudeMeters: 15,
    latitude: 29.7,
    expectedTemperatureC: 33,
    expectedHumidityPercent: 75,
    estimatedWBGT: 31.2,    // SEHR HOCH: Texas im Sommer
    timezoneUTCOffset: -5,
    culturallyCloseTeams: ['usa', 'mexico'],
  },

  dallas: {
    id: 'dallas',
    name: 'Dallas',
    city: 'Dallas, Texas',
    country: 'USA',
    stadium: 'AT&T Stadium',
    capacity: 80000,
    altitudeMeters: 139,
    latitude: 32.7,
    expectedTemperatureC: 32,
    expectedHumidityPercent: 60,
    estimatedWBGT: 28.5,    // An der WBGT-Grenze
    timezoneUTCOffset: -5,
    culturallyCloseTeams: ['usa', 'mexico'],
  },

  new_york: {
    id: 'new_york',
    name: 'New York/New Jersey',
    city: 'East Rutherford, New Jersey',
    country: 'USA',
    stadium: 'MetLife Stadium',
    capacity: 82500,
    altitudeMeters: 10,
    latitude: 40.8,
    expectedTemperatureC: 26,
    expectedHumidityPercent: 65,
    estimatedWBGT: 24.0,    // Angenehm für Sommer-WM
    timezoneUTCOffset: -4,
    culturallyCloseTeams: ['usa', 'portugal', 'brazil'],
  },

  los_angeles: {
    id: 'los_angeles',
    name: 'Los Angeles',
    city: 'Inglewood, California',
    country: 'USA',
    stadium: 'SoFi Stadium',
    capacity: 70240,
    altitudeMeters: 30,
    latitude: 33.9,
    expectedTemperatureC: 27,
    expectedHumidityPercent: 60,
    estimatedWBGT: 24.5,
    timezoneUTCOffset: -7,
    culturallyCloseTeams: ['usa', 'mexico'],
  },

  toronto: {
    id: 'toronto',
    name: 'Toronto',
    city: 'Toronto, Ontario',
    country: 'Canada',
    stadium: 'BMO Field',
    capacity: 30000,
    altitudeMeters: 76,
    latitude: 43.6,
    expectedTemperatureC: 23,
    expectedHumidityPercent: 68,
    estimatedWBGT: 21.5,    // Angenehm
    timezoneUTCOffset: -4,
    culturallyCloseTeams: ['usa'],
  },

  vancouver: {
    id: 'vancouver',
    name: 'Vancouver',
    city: 'Vancouver, British Columbia',
    country: 'Canada',
    stadium: 'BC Place',
    capacity: 54500,
    altitudeMeters: 15,
    latitude: 49.3,
    expectedTemperatureC: 19,
    expectedHumidityPercent: 72,
    estimatedWBGT: 18.0,    // Kühl und angenehm
    timezoneUTCOffset: -7,
    culturallyCloseTeams: ['usa'],
  },

};

export type VenueId = keyof typeof VENUES;
