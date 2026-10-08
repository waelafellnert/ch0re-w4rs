// Tiny WebAudio synth for game sound effects + vibration helpers.
// No audio assets: every effect is synthesized, so it loads instantly.

const SETTINGS_KEY = "choreco:settings";

export interface GameSettings {
  sound: boolean;
  vibration: boolean;
}

function readSettings(): GameSettings {
  if (typeof window === "undefined") return { sound: true, vibration: true };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) return { sound: true, vibration: true, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { sound: true, vibration: true };
}

let settings = readSettings();
const listeners = new Set<() => void>();

export function getSettings(): GameSettings {
  return settings;
}

export function setSettings(next: Partial<GameSettings>) {
  settings = { ...settings, ...next };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function subscribeSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call once from a user gesture so iOS unlocks audio. */
export function unlockAudio() {
  audio();
}

interface Tone {
  freq: number;
  time: number; // start offset (s)
  dur: number; // length (s)
  type?: OscillatorType;
  gain?: number;
  slide?: number; // target frequency to glide to
}

function play(tones: Tone[]) {
  if (!settings.sound) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of tones) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = t.type ?? "square";
    osc.frequency.setValueAtTime(t.freq, now + t.time);
    if (t.slide) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(t.slide, 1),
        now + t.time + t.dur,
      );
    }
    const peak = t.gain ?? 0.08;
    g.gain.setValueAtTime(0.0001, now + t.time);
    g.gain.exponentialRampToValueAtTime(peak, now + t.time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(now + t.time);
    osc.stop(now + t.time + t.dur + 0.05);
  }
}

function playNoise(dur: number, gain = 0.12) {
  if (!settings.sound) return;
  const ac = audio();
  if (!ac) return;
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(90, ac.currentTime + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start();
}

export function vibrate(pattern: number | number[]) {
  if (!settings.vibration) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

export const sfx = {
  tap() {
    play([{ freq: 520, time: 0, dur: 0.06, type: "square", gain: 0.05 }]);
  },
  taskDone() {
    play([
      { freq: 523, time: 0, dur: 0.09, type: "square" },
      { freq: 659, time: 0.08, dur: 0.09, type: "square" },
      { freq: 784, time: 0.16, dur: 0.16, type: "square", gain: 0.1 },
    ]);
    vibrate([30, 40, 60]);
  },
  teammate() {
    play([
      { freq: 440, time: 0, dur: 0.07, type: "triangle", gain: 0.06 },
      { freq: 587, time: 0.07, dur: 0.1, type: "triangle", gain: 0.06 },
    ]);
  },
  unlock() {
    play([
      { freq: 392, time: 0, dur: 0.08, type: "sawtooth", gain: 0.05 },
      { freq: 523, time: 0.09, dur: 0.08, type: "sawtooth", gain: 0.05 },
      { freq: 698, time: 0.18, dur: 0.14, type: "sawtooth", gain: 0.06 },
    ]);
    vibrate(40);
  },
  systemOnline() {
    play([
      { freq: 330, time: 0, dur: 0.12, type: "square" },
      { freq: 440, time: 0.11, dur: 0.12, type: "square" },
      { freq: 554, time: 0.22, dur: 0.12, type: "square" },
      { freq: 659, time: 0.33, dur: 0.28, type: "square", gain: 0.1 },
    ]);
    vibrate([40, 30, 40, 30, 80]);
  },
  allSystems() {
    play([
      { freq: 262, time: 0, dur: 0.14, type: "square" },
      { freq: 330, time: 0.12, dur: 0.14, type: "square" },
      { freq: 392, time: 0.24, dur: 0.14, type: "square" },
      { freq: 523, time: 0.36, dur: 0.3, type: "square", gain: 0.11 },
      { freq: 659, time: 0.5, dur: 0.42, type: "square", gain: 0.11 },
    ]);
    vibrate([60, 40, 60, 40, 150]);
  },
  countBeep(final = false) {
    play([
      {
        freq: final ? 880 : 440,
        time: 0,
        dur: final ? 0.5 : 0.18,
        type: "square",
        gain: 0.1,
      },
    ]);
    vibrate(final ? 250 : 80);
  },
  launch() {
    playNoise(2.6, 0.2);
    play([
      { freq: 70, time: 0, dur: 2.4, type: "sawtooth", gain: 0.12, slide: 240 },
      { freq: 523, time: 0.4, dur: 0.14, type: "square", gain: 0.06 },
      { freq: 659, time: 0.56, dur: 0.14, type: "square", gain: 0.06 },
      { freq: 784, time: 0.72, dur: 0.2, type: "square", gain: 0.07 },
      { freq: 1047, time: 0.92, dur: 0.5, type: "square", gain: 0.07 },
    ]);
    vibrate([80, 60, 80, 60, 300, 100, 400]);
  },
  fanfare() {
    play([
      { freq: 523, time: 0, dur: 0.12, type: "square" },
      { freq: 659, time: 0.12, dur: 0.12, type: "square" },
      { freq: 784, time: 0.24, dur: 0.12, type: "square" },
      { freq: 1047, time: 0.36, dur: 0.4, type: "square", gain: 0.11 },
      { freq: 784, time: 0.62, dur: 0.12, type: "square" },
      { freq: 1047, time: 0.74, dur: 0.6, type: "square", gain: 0.11 },
    ]);
    vibrate([50, 40, 50, 40, 200]);
  },
};
