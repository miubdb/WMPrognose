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
// Eigenständig erzeugt (WebAudio, keine Dateien, keine fremde Musik, komplett offline). Dezenter, leicht rhythmischer Gameshow-Groove statt Dauer-Akkord:
// 96 BPM, 4-Takt-Schleife Cmaj7 – Am7 – Fmaj7 – G6; weiche E-Piano-Akkordstöße (leicht synkopiert), kurzer Bass-Zupfer, sanfter Puls, kaum hörbare Hi-Hats,
// kurzes Echo. Sehr leise (Regler 0–100 → max. ≈ −22 dB), Kompressor gegen Spitzen. Nur eine Instanz; setMusic ist idempotent; Stopp mit Ausblenden.
const BPM = 96, STEP_S = 60 / BPM / 4;                                       // 16tel
const CH_STAB = [[164.81, 196.0, 246.94, 293.66], [164.81, 196.0, 220.0, 261.63], [174.61, 220.0, 261.63, 329.63], [146.83, 196.0, 246.94, 329.63]];
const CH_BASS = [130.81, 110.0, 87.31, 98.0];
let mus: { master: GainNode; timer: number; nextTime: number; step: number; noise: AudioBuffer } | null = null;

function noiseBuffer(c: BaseAudioContext): AudioBuffer { const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate); const d = b.getChannelData(0); let seed = 12345; for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1; } return b; }
function env(g: GainNode, t: number, peak: number, attack: number, dur: number) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
/** Plant einen 16tel-Schritt (step 0–63) auf den Ausgang `out`; `fx` = Echo-Eingang. */
export function scheduleMusicStep(c: BaseAudioContext, out: AudioNode, fx: AudioNode, t: number, step: number, noise: AudioBuffer) {
  const bar = Math.floor(step / 16) % 4, s = step % 16;
  const voice = (f: number, peak: number, dur: number, type: OscillatorType, cutoff: number, send = 0) => {
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.4;
    env(g, t, peak, 0.006, dur); o.connect(lp); lp.connect(g); g.connect(out); if (send) { const sg = c.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(fx); } o.start(t); o.stop(t + dur + 0.05);
  };
  const stab = (peak: number, dur: number) => CH_STAB[bar].forEach((f, i) => { voice(f, peak * (i === 0 ? 1 : 0.8), dur, 'sine', 2400, 0.35); voice(f * 2, peak * 0.22, dur * 0.6, 'sine', 3000); voice(f * 1.003, peak * 0.4, dur, 'triangle', 1800); });
  if (s === 0 || s === 6 || s === 10) stab(s === 0 ? 0.055 : 0.036, s === 0 ? 0.95 : 0.45);            // E-Piano-Akkord (synkopiert)
  if (s === 0 || s === 10) voice(CH_BASS[bar], 0.2, 0.4, 'triangle', 420);                              // Bass-Zupfer
  if (s === 0 || s === 8) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12); env(g, t, 0.16, 0.004, 0.16); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2); }   // sanfter Puls
  if (s % 4 === 2) { const n = c.createBufferSource(), g = c.createGain(), hp = c.createBiquadFilter(); n.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 7500; env(g, t, s % 8 === 2 ? 0.05 : 0.03, 0.002, 0.05); n.connect(hp); hp.connect(g); g.connect(out); n.start(t); }   // Hi-Hat
}
function buildChain(c: BaseAudioContext, dest: AudioNode, gain: number) {
  const master = c.createGain(); master.gain.value = gain; const comp = c.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 4; master.connect(comp); comp.connect(dest);
  const fx = c.createGain(); const dl = c.createDelay(1); dl.delayTime.value = (60 / BPM) * 0.75; const fb = c.createGain(); fb.gain.value = 0.28; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  fx.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
  return { master, fx };
}
/** Diagnose (Tests): rendert die Musik offline und liefert Pegel – Spitze, Effektivwert, Gleichanteil, Anteil hörbarer Abschnitte. */
export async function renderMusicDiagnostic(seconds = 20) {
  const sr = 22050, oc = new OfflineAudioContext(1, sr * seconds, sr); const { master, fx } = buildChain(oc, oc.destination, 1); const nb = noiseBuffer(oc);
  for (let st = 0; st * STEP_S < seconds - 0.5; st++) scheduleMusicStep(oc, master, fx, st * STEP_S, st % 64, nb);
  const buf = await oc.startRendering(); const d = buf.getChannelData(0); let peak = 0, sum = 0, dc = 0, bad = 0; const win = sr / 4; let loud = 0, wins = 0;
  for (let i = 0; i < d.length; i++) { const v = d[i]; if (!Number.isFinite(v)) bad++; peak = Math.max(peak, Math.abs(v)); sum += v * v; dc += v; }
  for (let w = 0; w + win <= d.length; w += win) { let r = 0; for (let i = w; i < w + win; i++) r += d[i] * d[i]; wins++; if (Math.sqrt(r / win) > 0.002) loud++; }
  return { peak, rms: Math.sqrt(sum / d.length), dc: dc / d.length, bad, audibleShare: loud / wins, bpm: BPM };
}
if (typeof window !== 'undefined') { (window as any).__outplayMusic = () => !!mus; (window as any).__outplayMusicRender = renderMusicDiagnostic; }

export function setMusic(on: boolean, vol: number) {
  try {
    const target = on && enabled && ctx && ctx.state === 'running' ? Math.max(0, Math.min(100, vol)) / 100 * 0.35 : 0;   // Endpegel sehr leise
    if (target > 0 && !mus && ctx) {
      const { master, fx } = buildChain(ctx, ctx.destination, 0.0001); const noise = noiseBuffer(ctx);
      const m = { master, timer: 0, nextTime: ctx.currentTime + 0.15, step: 0, noise };
      m.timer = window.setInterval(() => { if (!ctx || mus !== m) return; while (m.nextTime < ctx.currentTime + 0.3) { scheduleMusicStep(ctx, master, fx, m.nextTime, m.step, noise); m.step = (m.step + 1) % 64; m.nextTime += STEP_S; } }, 60);
      mus = m;
    }
    if (mus && ctx) {
      mus.master.gain.cancelScheduledValues(ctx.currentTime);
      mus.master.gain.setTargetAtTime(Math.max(0.0001, target), ctx.currentTime, 0.5);
      if (target === 0) {   // sauber beenden: Scheduler sofort stoppen, ausblenden, nichts läuft weiter oder startet doppelt
        const m = mus; mus = null; window.clearInterval(m.timer);
        window.setTimeout(() => { try { m.master.disconnect(); } catch { /* */ } }, 2500);
      }
    }
  } catch { /* Audio darf die Show nie gefährden */ }
}
