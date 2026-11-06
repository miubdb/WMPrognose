// Einfache Soundverwaltung (WebAudio, synthetisch – keine Dateien nötig). Initialisierung nur nach Nutzerinteraktion.
type Name = 'start' | 'tick' | 'open' | 'correct' | 'wrong' | 'points' | 'final' | 'win' | 'lock' | 'pick';

let ctx: AudioContext | null = null;
let enabled = true;
let master: GainNode | null = null;

export function initAudio(): boolean {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  } catch { return false; }
}
export const setSoundEnabled = (on: boolean) => { enabled = on; };

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.5, slideTo?: number) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

export function play(name: Name) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  switch (name) {
    case 'start': [261, 329, 392, 523].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle', 0.5)); tone(523, 0.5, 0.9, 'sawtooth', 0.25); break;
    case 'tick': tone(880, 0, 0.08, 'square', 0.18); break;
    case 'open': tone(330, 0, 0.12, 'triangle', 0.5); tone(660, 0.1, 0.25, 'triangle', 0.5); break;
    case 'pick': tone(520, 0, 0.1, 'sine', 0.4); tone(780, 0.08, 0.14, 'sine', 0.4); break;
    case 'lock': tone(180, 0, 0.18, 'square', 0.3); tone(120, 0.12, 0.25, 'square', 0.3); break;
    case 'correct': tone(523, 0, 0.12, 'triangle', 0.5); tone(659, 0.1, 0.12, 'triangle', 0.5); tone(784, 0.2, 0.3, 'triangle', 0.5); break;
    case 'wrong': tone(220, 0, 0.25, 'sawtooth', 0.35, 110); break;
    case 'points': for (let i = 0; i < 5; i++) tone(600 + i * 120, i * 0.07, 0.12, 'sine', 0.35); break;
    case 'final': [196, 196, 196, 156].forEach((f, i) => tone(f, i * 0.28, 0.4, 'sawtooth', 0.35)); tone(392, 1.2, 1.2, 'triangle', 0.4); break;
    case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.14, 0.4, 'triangle', 0.55)); tone(262, 0, 1.6, 'sawtooth', 0.2); break;
  }
}

// ---------------------------------------------------------------- Hintergrundmusik
// Eigenständig erzeugt (WebAudio, keine Dateien, keine fremde Musik): ein ruhiger, langsamer Klangteppich aus weichen Sinus-/Dreieckstönen
// über einer wiederkehrenden Akkordfolge (Am – F – C – G, je 8 s). Läuft komplett offline. Nur eine Instanz; setMusic ist idempotent.
let mus: { gain: GainNode; oscs: OscillatorNode[]; timer: number } | null = null;
const CHORDS = [[110, 220, 261.63, 329.63], [87.31, 174.61, 220, 261.63], [130.81, 196, 261.63, 329.63], [98, 196, 246.94, 293.66]];
/** Diagnose für Tests/Fehlersuche: läuft gerade ein Musik-Klangteppich? */
if (typeof window !== 'undefined') (window as any).__outplayMusic = () => !!mus;
export function setMusic(on: boolean, vol: number) {
  try {
    const target = on && enabled && ctx && ctx.state === 'running' ? Math.max(0, Math.min(100, vol)) / 100 * 0.07 : 0;   // sehr leise: max. ≈ −23 dB
    if (target > 0 && !mus && ctx) {
      const gain = ctx.createGain(); gain.gain.value = 0.0001; gain.connect(ctx.destination);
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.08; lfoG.gain.value = 0.25; lfo.connect(lfoG); lfoG.connect(gain.gain); lfo.start();
      const oscs: OscillatorNode[] = [lfo];
      CHORDS[0].forEach((f, i) => { const o = ctx!.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; const g = ctx!.createGain(); g.gain.value = 0.22; o.connect(g); g.connect(gain); o.start(); oscs.push(o); });
      let n = 0;
      const timer = window.setInterval(() => { if (!ctx) return; n = (n + 1) % CHORDS.length; oscs.slice(1).forEach((o, i) => o.frequency.setTargetAtTime(CHORDS[n][i], ctx!.currentTime, 1.6)); }, 8000);
      mus = { gain, oscs, timer };
    }
    if (mus && ctx) {
      mus.gain.gain.cancelScheduledValues(ctx.currentTime);
      mus.gain.gain.setTargetAtTime(Math.max(0.0001, target), ctx.currentTime, 0.6);
      if (target === 0) {   // sauber beenden, damit nichts weiterläuft oder später doppelt startet
        const m = mus; mus = null; window.clearInterval(m.timer);
        window.setTimeout(() => { m.oscs.forEach(o => { try { o.stop(); } catch { /* */ } }); try { m.gain.disconnect(); } catch { /* */ } }, 2500);
      }
    }
  } catch { /* Audio darf die Show nie gefährden */ }
}
