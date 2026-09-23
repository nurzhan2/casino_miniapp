// Звук без файлов: короткие тоны через WebAudio. Выключается кнопкой в профиле.
let ac: AudioContext | null = null;
let enabled = localStorage.getItem('bk-sound') !== '0';

export const soundOn = () => enabled;
export function toggleSound(v?: boolean) {
  enabled = v ?? !enabled;
  localStorage.setItem('bk-sound', enabled ? '1' : '0');
  if (enabled) blip(660, 0.06, 'sine', 0.05);
  return enabled;
}

function ctx() {
  if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

/** Один тон с затуханием */
function blip(freq: number, dur = 0.08, type: OscillatorType = 'triangle', gain = 0.09, slideTo?: number) {
  if (!enabled) return;
  try {
    const c = ctx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch { /* звук не критичен */ }
}

const seq = (notes: [number, number][], step = 0.09, type: OscillatorType = 'triangle') =>
  notes.forEach(([f, d], i) => setTimeout(() => blip(f, d, type, 0.1), i * step * 1000));

export const sfx = {
  tap: () => blip(420, 0.045, 'square', 0.05),
  bet: () => blip(320, 0.09, 'triangle', 0.09, 520),
  tick: (k = 1) => blip(500 + k * 120, 0.03, 'square', 0.035),
  reveal: () => blip(700, 0.06, 'sine', 0.07, 900),
  spin: () => blip(180, 0.5, 'sawtooth', 0.04, 90),
  win: () => seq([[523, 0.1], [659, 0.1], [784, 0.12], [1046, 0.22]]),
  bigWin: () => seq([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.1], [1318, 0.28]], 0.08),
  lose: () => seq([[300, 0.12], [220, 0.2]], 0.11, 'sawtooth'),
  levelUp: () => seq([[659, 0.09], [880, 0.09], [1174, 0.25]], 0.1, 'sine'),
  cash: () => blip(900, 0.07, 'sine', 0.06, 1400),
};
