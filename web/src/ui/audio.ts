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
