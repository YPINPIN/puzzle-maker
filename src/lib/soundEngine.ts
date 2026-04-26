let ctx: AudioContext | null = null;
let _muted: boolean = localStorage.getItem('puzzle-sound-muted') === 'true';

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function tone(
  freq: number,
  type: OscillatorType,
  gainPeak: number,
  attackMs: number,
  decayMs: number,
  startTime: number,
): void {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attackMs / 1000);
  gain.gain.linearRampToValueAtTime(0, startTime + (attackMs + decayMs) / 1000);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(startTime);
  osc.stop(startTime + (attackMs + decayMs) / 1000);
}

export function playPickup(): void {
  if (_muted) return;
  const t = getCtx().currentTime;
  tone(350, 'triangle', 0.08, 5, 80, t);
}

export function playMerge(): void {
  if (_muted) return;
  const t = getCtx().currentTime;
  tone(440, 'triangle', 0.15, 5, 120, t);
  tone(880, 'sine', 0.07, 5, 100, t);
}

export function playSnap(): void {
  if (_muted) return;
  const t = getCtx().currentTime;
  tone(523, 'sine', 0.20, 5, 180, t);
  tone(784, 'sine', 0.10, 5, 150, t);
}

export function playComplete(): void {
  if (_muted) return;
  const t = getCtx().currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    tone(freq, 'sine', 0.20, 10, 200, t + i * 0.12);
  });
}

export function setMuted(muted: boolean): void {
  _muted = muted;
  localStorage.setItem('puzzle-sound-muted', String(muted));
}

export function isMuted(): boolean {
  return _muted;
}

// ─── Background Music ────────────────────────────────────────────────────────

// C 大調、150 BPM（Q=400ms）、~25.6 秒循環樂句（4 段）
// 段 A：E5 上行至 A5；段 B：C5 拱形降至 G4；段 C：A 段倒裝變奏；段 D：借用 F 音色後回到主題
const Q = 400, E = 200, H = 800, DQ = 600;
const MELODY: [number, number][] = [
  // 段 A（C5-G5 範圍，起音較柔和）
  [523.25, Q], [587.33, Q], [659.25, Q], [783.99, Q],
  [783.99, H], [659.25, Q], [523.25, Q],
  [587.33, Q], [659.25, Q], [783.99, Q], [659.25, Q],
  [659.25, DQ], [523.25, E], [587.33, Q], [0, Q],
  // 段 B
  [523.25, Q], [659.25, Q], [783.99, Q], [659.25, Q],
  [523.25, Q], [587.33, Q], [659.25, E], [587.33, E], [523.25, Q],
  [392.00, Q], [440.00, Q], [493.88, Q], [523.25, Q],
  [392.00, H], [0, H],
  // 段 C（高音區變奏）
  [783.99, Q], [659.25, Q], [587.33, Q], [523.25, Q],
  [587.33, H], [659.25, Q], [783.99, Q],
  [880.00, Q], [783.99, Q], [659.25, Q], [587.33, Q],
  [523.25, DQ], [587.33, E], [659.25, Q], [0, Q],
  // 段 D（F 音色點綴，結尾下行收 C5 接回段 A）
  [523.25, Q], [587.33, Q], [698.46, Q], [659.25, Q],
  [587.33, Q], [523.25, Q], [493.88, E], [523.25, E], [587.33, Q],
  [659.25, Q], [587.33, Q], [523.25, Q], [587.33, Q],
  [523.25, H], [0, H],
];

let pianoMasterGain: GainNode | null = null;
let melodyIdx = 0;
let melodyTimeoutId: ReturnType<typeof setTimeout> | null = null;
let _musicActive = false;

function pianoNote(freq: number, durationMs: number, masterGain: GainNode): void {
  if (freq === 0) return;
  const ac = getCtx();
  const t = ac.currentTime;
  // 鋼琴包絡：快速起音 → 短衰減 → 長尾音
  const decay = Math.min((durationMs / 1000) * 1.6, 2.0);

  const env = ac.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.15, t + 0.012); // 12ms 起音
  env.gain.exponentialRampToValueAtTime(0.06, t + 0.08); // 初始衰減
  env.gain.exponentialRampToValueAtTime(0.001, t + decay); // 長尾
  env.connect(masterGain);

  const stopTime = t + decay + 0.05;
  // 基音 + 三個泛音模擬鋼琴音色
  const harmonics: [number, number][] = [[1, 1.0], [2, 0.4], [3, 0.15], [4, 0.05]];
  for (const [ratio, gain] of harmonics) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(env);
    osc.start(t);
    osc.stop(stopTime);
  }
}

function playMelodyStep(): void {
  if (!_musicActive) return;
  const [freq, durationMs] = MELODY[melodyIdx % MELODY.length];
  if (pianoMasterGain) pianoNote(freq, durationMs, pianoMasterGain);
  melodyIdx = (melodyIdx + 1) % MELODY.length;
  melodyTimeoutId = setTimeout(playMelodyStep, durationMs);
}

function _buildMusic(): void {
  const ac = getCtx();
  pianoMasterGain = ac.createGain();
  pianoMasterGain.gain.setValueAtTime(0, ac.currentTime);
  pianoMasterGain.gain.linearRampToValueAtTime(0.5, ac.currentTime + 2.0);
  pianoMasterGain.connect(ac.destination);
  melodyIdx = 0;
  _musicActive = true;
  melodyTimeoutId = setTimeout(playMelodyStep, 100);
}

export function startMusic(): void {
  if (_muted) return;
  if (_musicActive) return;
  const ac = getCtx();
  if (ac.state === 'suspended') {
    document.addEventListener('pointerdown', () => {
      ac.resume().then(() => { if (!_muted && !_musicActive) _buildMusic(); });
    }, { once: true });
    return;
  }
  _buildMusic();
}

export function stopMusic(): void {
  if (!_musicActive) return;
  if (melodyTimeoutId !== null) { clearTimeout(melodyTimeoutId); melodyTimeoutId = null; }
  const FADE = 0.8;
  const ac = getCtx();
  const now = ac.currentTime;
  if (pianoMasterGain) {
    pianoMasterGain.gain.cancelScheduledValues(now);
    pianoMasterGain.gain.setValueAtTime(pianoMasterGain.gain.value, now);
    pianoMasterGain.gain.linearRampToValueAtTime(0, now + FADE);
    const m = pianoMasterGain;
    setTimeout(() => { try { m.disconnect(); } catch { /* ignore */ } }, FADE * 1000 + 100);
  }
  pianoMasterGain = null;
  melodyIdx = 0;
  _musicActive = false;
}
