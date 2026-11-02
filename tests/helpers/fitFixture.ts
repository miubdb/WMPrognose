// Erzeugt FIT-Dateien mit dem OFFIZIELLEN Garmin-Encoder (unabhängig von unserem Parser).
import { Encoder, Profile } from '@garmin/fitsdk';

export function buildFit(opts: { start: Date; seconds: number; watts: (i: number) => number; hr?: (i: number) => number; sport?: string; subSport?: string; ascent?: number }): Uint8Array {
  const enc = new Encoder();
  const { MesgNum } = Profile;
  enc.onMesg(MesgNum.FILE_ID, { type: 'activity', manufacturer: 'development', product: 1, timeCreated: opts.start, serialNumber: 1234 });
  let distance = 0;
  for (let i = 0; i < opts.seconds; i++) {
    distance += 8; // 8 m/s
    enc.onMesg(MesgNum.RECORD, {
      timestamp: new Date(opts.start.getTime() + i * 1000),
      power: opts.watts(i),
      heartRate: opts.hr ? opts.hr(i) : 140,
      distance,
      altitude: 100,
    });
  }
  const watts = Array.from({ length: opts.seconds }, (_, i) => opts.watts(i));
  enc.onMesg(MesgNum.SESSION, {
    timestamp: new Date(opts.start.getTime() + opts.seconds * 1000),
    startTime: opts.start,
    totalElapsedTime: opts.seconds,
    totalTimerTime: opts.seconds,
    totalDistance: distance,
    sport: opts.sport ?? 'cycling',
    subSport: opts.subSport ?? 'generic',
    avgPower: Math.round(watts.reduce((a, b) => a + b, 0) / watts.length),
    avgHeartRate: 140,
    maxHeartRate: 170,
    totalAscent: opts.ascent ?? 120,
    totalCalories: 500,
  });
  return enc.close();
}
