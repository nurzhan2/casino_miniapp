// Эффекты: частицы на canvas, тряска, вспышки, рябь на кнопках, шина событий выигрыша.
let cv: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let parts: P[] = [];
let raf = 0;

type P = { x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; size: number; color: string; rot: number; vr: number; shape: 'rect' | 'circle' | 'star' };

function ensure() {
  if (cv) return;
  cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none';
  document.body.appendChild(cv);
  ctx = cv.getContext('2d');
  const resize = () => {
    const d = Math.min(2, devicePixelRatio || 1);
    cv!.width = innerWidth * d; cv!.height = innerHeight * d;
    cv!.style.width = innerWidth + 'px'; cv!.style.height = innerHeight + 'px';
    ctx!.setTransform(d, 0, 0, d, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
}

function star(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath(); c.fill();
}

function loop() {
  if (!ctx || !cv) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter(p => p.life < p.max);
  for (const p of parts) {
    p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
    const k = 1 - p.life / p.max;
    ctx.save();
    ctx.globalAlpha = Math.max(0, k > 0.25 ? 1 : k * 4);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 7); ctx.fill(); }
    else if (p.shape === 'star') star(ctx, p.size);
    else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
}
const run = () => { if (!raf) raf = requestAnimationFrame(loop); };

const LIME = ['#b6ff3b', '#8fe021', '#ffd43b', '#ffffff', '#3bffb0'];
const RED = ['#ff4d4d', '#ff8a3b', '#7a2020'];

/** Салют из центра экрана (или из точки) */
export function confetti(n = 110, colors = LIME, from?: { x: number; y: number }) {
  ensure();
  const x = from?.x ?? innerWidth / 2, y = from?.y ?? innerHeight * 0.42;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 11;
    parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, g: 0.28,
      life: 0, max: 70 + Math.random() * 50, size: 5 + Math.random() * 8,
      color: colors[(Math.random() * colors.length) | 0], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      shape: Math.random() < 0.25 ? 'star' : Math.random() < 0.5 ? 'circle' : 'rect',
    });
  }
  run();
}

/** Дождь из звёзд сверху — для крупных выигрышей */
export function coinRain(n = 40) {
  ensure();
  for (let i = 0; i < n; i++) {
    parts.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 3, g: 0.12,
      life: 0, max: 150, size: 7 + Math.random() * 7,
      color: '#ffd43b', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25, shape: 'star',
    });
  }
  run();
}

/** Осколки при проигрыше */
export const debris = () => confetti(45, RED);

export function shake(ms = 420, power = 1) {
  const el = document.documentElement;
  el.style.setProperty('--shake-power', String(power));
  el.classList.add('fx-shake');
  setTimeout(() => el.classList.remove('fx-shake'), ms);
}

export function flash(color = '#b6ff3b', ms = 380) {
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;inset:0;z-index:55;pointer-events:none;background:${color};opacity:.28;transition:opacity ${ms}ms ease-out`;
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.opacity = '0'; });
  setTimeout(() => d.remove(), ms + 50);
}

// ---------- шина событий для оверлея выигрыша ----------
export type WinEvent = { kind: 'win' | 'lose'; amount?: number; multiplier?: number; text?: string };
const EV = 'bk-fx';
export const onFx = (h: (e: WinEvent) => void) => {
  const fn = (e: any) => h(e.detail);
  addEventListener(EV, fn);
  return () => removeEventListener(EV, fn);
};

/** Выигрыш: оверлей + салют + вспышка. Крупный выигрыш — ещё и звездопад. */
export function win(amount: number, multiplier?: number, bet?: number) {
  const big = bet ? amount >= bet * 5 : amount >= 1000;
  dispatchEvent(new CustomEvent(EV, { detail: { kind: 'win', amount, multiplier } }));
  confetti(big ? 170 : 90);
  if (big) { coinRain(50); shake(300, 0.6); }
  flash('#b6ff3b', 320);
}

export function lose(text = 'Не повезло') {
  dispatchEvent(new CustomEvent(EV, { detail: { kind: 'lose', text } }));
  debris();
  shake(360, 1);
  flash('#ff4d4d', 300);
}

/** Рябь по нажатию на любую кнопку */
export function initRipples() {
  addEventListener('pointerdown', e => {
    const t = (e.target as HTMLElement)?.closest('button') as HTMLButtonElement | null;
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect();
    const s = document.createElement('span');
    const size = Math.max(r.width, r.height) * 1.4;
    s.className = 'fx-ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${(e as PointerEvent).clientX - r.left - size / 2}px;top:${(e as PointerEvent).clientY - r.top - size / 2}px`;
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
    t.style.overflow = 'hidden';
    t.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }, { passive: true });
}

/** Шлейф из искр под летящей ракетой */
export function trail(x: number, y: number, power = 1) {
  ensure();
  for (let i = 0; i < 2 + power * 2; i++) {
    parts.push({
      x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 1.6 - 0.6, vy: 1 + Math.random() * 2.2, g: 0.04,
      life: 0, max: 26 + Math.random() * 22, size: 3 + Math.random() * 5 * power,
      color: Math.random() < 0.5 ? '#b6ff3b' : Math.random() < 0.6 ? '#ffd43b' : '#ffffff',
      rot: 0, vr: 0.2, shape: 'circle',
    });
  }
  run();
}

/** Наклон карточки за курсором + блик, который следует за указателем. Только для мыши. */
export function initTilt() {
  if (!matchMedia('(hover: hover)').matches) return;
  const reset = (el: HTMLElement) => {
    el.style.transform = '';
    el.style.removeProperty('--mx');
    el.style.removeProperty('--my');
  };
  addEventListener('pointermove', e => {
    const el = (e.target as HTMLElement)?.closest('[data-tilt]') as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const max = Number(el.dataset.tilt) || 8;
    el.style.transform = `perspective(700px) rotateY(${(px - 0.5) * max * 2}deg) rotateX(${(0.5 - py) * max * 2}deg) translateZ(6px) scale(1.02)`;
    el.style.setProperty('--mx', px * 100 + '%');
    el.style.setProperty('--my', py * 100 + '%');
  }, { passive: true });
  addEventListener('pointerout', e => {
    const el = (e.target as HTMLElement)?.closest?.('[data-tilt]') as HTMLElement | null;
    if (el) reset(el);
  }, { passive: true });
  addEventListener('pointerdown', e => {
    const el = (e.target as HTMLElement)?.closest?.('[data-tilt]') as HTMLElement | null;
    if (el) el.style.transform += ' scale(.97)';
  }, { passive: true });
}
