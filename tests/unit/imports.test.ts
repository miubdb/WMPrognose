import { describe, expect, it } from 'vitest';
import { parseFit } from '@/import/fit';
import { parseTcx } from '@/import/tcx';
import { parseGpx } from '@/import/gpx';
import { parseAppleHealth, AppleHealthParser } from '@/import/appleHealth';
import { extractWeights, parseCsv, parseCsvDate, parseDecimal } from '@/import/csv';
import { buildFit } from '../helpers/fitFixture';
import { normalizedPower } from '@/domain/cycling';

describe('FIT-Import (offizielles Garmin-SDK)', () => {
  const start = new Date('2026-11-03T17:00:00Z');
  const watts = (i: number) => (Math.floor(i / 60) % 2 === 0 ? 150 : 250);
  const bytes = buildFit({ start, seconds: 1200, watts });
  it('liest Dauer, Distanz, Leistung, Puls, Typ', () => {
    const a = parseFit(bytes);
    expect(a.source).toBe('fit');
    expect(a.type).toBe('rad');
    expect(a.durationMin).toBe(20);
    expect(a.distanceKm).toBe(9.6);
    expect(a.avgPowerW).toBe(200);
    expect(a.avgHr).toBe(140);
    expect(a.maxHr).toBe(170);
    expect(a.elevationM).toBe(120);
    expect(a.kcal).toBe(500);
    expect(a.date).toBe('2026-11-03');
    expect(a.externalId).toBe(`fit:${start.toISOString()}:1200`);
  });
  it('berechnet NP aus den Records wie die Referenzformel', () => {
    const a = parseFit(bytes);
    const ref = normalizedPower(Array.from({ length: 1200 }, (_, i) => watts(i)));
    expect(a.normalizedPowerW).toBe(ref);
    expect(a.normalizedPowerW!).toBeGreaterThan(a.avgPowerW!);
  });
  it('lehnt Nicht-FIT und beschädigte Dateien ab', () => {
    expect(() => parseFit(new Uint8Array([1, 2, 3, 4, 5]))).toThrow(/FIT/);
    const broken = bytes.slice();
    broken[broken.length - 3] ^= 0xff;
    expect(() => parseFit(broken)).toThrow(/beschädigt/);
  });
  it('mappt Sportarten', () => {
    expect(parseFit(buildFit({ start, seconds: 60, watts: () => 0, sport: 'running' })).type).toBe('lauf');
    expect(parseFit(buildFit({ start, seconds: 60, watts: () => 0, sport: 'soccer' })).type).toBe('fussball');
  });
});

const tcx = `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Activities><Activity Sport="Biking"><Id>2026-11-04T17:00:00Z</Id>
<Lap StartTime="2026-11-04T17:00:00Z"><TotalTimeSeconds>3600</TotalTimeSeconds><DistanceMeters>30000</DistanceMeters><Calories>600</Calories><AverageHeartRateBpm><Value>138</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>165</Value></MaximumHeartRateBpm><Track>
${Array.from({ length: 60 }, (_, i) => `<Trackpoint><Time>2026-11-04T17:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z</Time><AltitudeMeters>${100 + (i > 30 ? 10 : 0)}</AltitudeMeters><HeartRateBpm><Value>140</Value></HeartRateBpm><Extensions><ns3:TPX><ns3:Watts>180</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`).join('')}
</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;

describe('TCX-Import', () => {
  it('liest Lap- und Trackpoint-Daten', () => {
    const a = parseTcx(tcx);
    expect(a).toMatchObject({ source: 'tcx', type: 'rad', durationMin: 60, distanceKm: 30, kcal: 600, maxHr: 165, avgHr: 140, avgPowerW: 180, normalizedPowerW: 180, elevationM: 10 });
    expect(a.date).toBe('2026-11-04');
  });
  it('lehnt andere XML-Dateien ab', () => expect(() => parseTcx('<foo/>')).toThrow(/TCX/));
});

const gpx = `<?xml version="1.0"?><gpx version="1.1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><type>running</type><trkseg>
${Array.from({ length: 600 }, (_, i) => `<trkpt lat="${50 + i * 0.00005}" lon="8.0"><ele>${100 + (i > 300 ? 8 : 0)}</ele><time>2026-11-05T06:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`).join('')}
</trkseg></trk></gpx>`;

describe('GPX-Import', () => {
  it('berechnet Distanz, Dauer, Puls, Höhenmeter', () => {
    const a = parseGpx(gpx);
    expect(a.type).toBe('lauf');
    expect(a.durationMin).toBeCloseTo(10, 0);
    expect(a.distanceKm).toBeCloseTo(3.33, 1);
    expect(a.avgHr).toBe(150);
    expect(a.elevationM).toBe(8);
    expect(a.avgPowerW).toBeNull();
  });
  it('lehnt Dateien ohne Track ab', () => expect(() => parseGpx('<gpx></gpx>')).toThrow(/Trackpunkte/));
});

const health = `<?xml version="1.0"?><HealthData locale="de_DE">
<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Waage" unit="kg" creationDate="2026-11-02 07:00:00 +0100" startDate="2026-11-02 07:00:00 +0100" endDate="2026-11-02 07:00:00 +0100" value="91.45"/>
<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Waage" unit="kg" startDate="2026-11-02 20:00:00 +0100" endDate="2026-11-02 20:00:00 +0100" value="92.1"/>
<Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" startDate="2026-11-03 07:00:00 +0100" value="200"/>
<Record type="HKQuantityTypeIdentifierBodyFatPercentage" unit="%" startDate="2026-11-03 07:00:00 +0100" value="0.24"/>
<Record type="HKQuantityTypeIdentifierRestingHeartRate" unit="count/min" startDate="2026-11-03 09:00:00 +0100" value="56"/>
<Record type="HKQuantityTypeIdentifierStepCount" unit="count" startDate="2026-11-03 09:00:00 +0100" value="100"/>
<Workout workoutActivityType="HKWorkoutActivityTypeCycling" duration="45.5" durationUnit="min" totalDistance="20" totalDistanceUnit="km" totalEnergyBurned="480" totalEnergyBurnedUnit="kcal" startDate="2026-11-04 17:00:00 +0100" endDate="2026-11-04 17:45:30 +0100"><MetadataEntry key="a" value="b"/></Workout>
</HealthData>`;

describe('Apple-Health-Import', () => {
  it('liest Gewicht (letzter Wert je Tag, lb→kg), Körperfett, Ruhepuls, Workouts', () => {
    const r = parseAppleHealth(health);
    expect(r.weights).toEqual([{ date: '2026-11-02', weight_kg: 92.1, body_fat_pct: null }, { date: '2026-11-03', weight_kg: 90.72, body_fat_pct: 24 }]);
    expect(r.restingHr).toEqual([{ date: '2026-11-03', resting_hr: 56 }]);
    expect(r.workouts).toHaveLength(1);
    expect(r.workouts[0]).toMatchObject({ type: 'rad', durationMin: 45.5, distanceKm: 20, kcal: 480, date: '2026-11-04' });
  });
  it('funktioniert mit beliebigen Chunk-Grenzen (Streaming)', () => {
    const p = new AppleHealthParser();
    for (let i = 0; i < health.length; i += 37) p.push(health.slice(i, i + 37));
    expect(p.finish()).toEqual(parseAppleHealth(health));
  });
});

describe('CSV-Import', () => {
  const csv = 'Datum;Gewicht (kg);Fett %\n02.11.2026;91,45;24,5\n03.11.2026;91,2;\nkaputt;abc;\n2026-11-04 07:00;90.9;23\n';
  it('erkennt Trennzeichen, Dezimalkomma und Datumsformate', () => {
    const p = parseCsv(csv);
    expect(p.delimiter).toBe(';');
    const r = extractWeights(p, 0, 1, 2);
    expect(r.rows).toEqual([
      { date: '2026-11-02', weight_kg: 91.45, body_fat_pct: 24.5 },
      { date: '2026-11-03', weight_kg: 91.2, body_fat_pct: null },
      { date: '2026-11-04', weight_kg: 90.9, body_fat_pct: 23 },
    ]);
    expect(r.skipped).toBe(1);
  });
  it('lehnt ungültige und mehrdeutige Daten ab', () => {
    expect(parseCsvDate('31.02.2026')).toBeNull();
    expect(parseCsvDate('11/02/2026')).toBeNull();
    expect(parseDecimal('91,45 kg')).toBe(91.45);
    expect(parseDecimal('')).toBeNull();
  });
  it('lehnt leere Datei ab', () => expect(() => parseCsv('Datum;Gewicht')).toThrow());
});
