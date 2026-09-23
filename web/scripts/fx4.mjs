// Ховер-анимации и 3D-наклон за курсором. node scripts/fx4.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const get = f => readFileSync(P + f, 'utf8');
const put = (f, s) => writeFileSync(P + f, s, 'utf8');

// ---------- 1. Наклон за курсором + магнитные кнопки ----------
let fx = get('lib/fx.ts');
if (!fx.includes('initTilt')) fx += `
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
    el.style.transform = \`perspective(700px) rotateY(\${(px - 0.5) * max * 2}deg) rotateX(\${(0.5 - py) * max * 2}deg) translateZ(6px) scale(1.02)\`;
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
`;
put('lib/fx.ts', fx);

// ---------- 2. CSS ховеров ----------
let css = get('index.css');
if (!css.includes('hover: hover')) css += `

/* ---------- ховер: только для мыши, на телефоне не мешает ---------- */
[data-tilt] { transition: transform .35s cubic-bezier(.2,1,.3,1), box-shadow .3s; will-change: transform; }
[data-tilt]::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity .3s; pointer-events: none;
  background: radial-gradient(260px circle at var(--mx,50%) var(--my,50%), #ffffff30, transparent 60%); }
[data-tilt]:hover::before { opacity: 1; }

@media (hover: hover) {
  .card { transition: transform .3s cubic-bezier(.2,1,.3,1), box-shadow .3s, border-color .3s; }
  .card:hover { transform: translateY(-3px); box-shadow: 0 1px 0 #ffffff12 inset, 0 24px 44px -26px #000, 0 0 0 1px #b6ff3b22; }

  .btn-lime:hover { filter: brightness(1.06) saturate(1.08); box-shadow: 0 12px 34px -10px #b6ff3baa; transform: translateY(-1px); }
  .btn-lime:hover::after { animation-duration: 1.1s; }
  .btn-ghost:hover { background: #ffffff18; border-color: #b6ff3b55; transform: translateY(-1px); }

  button:hover .hover-spin { animation: spin-slow 3s linear infinite; }
  button:hover .hover-pop { transform: scale(1.12) rotate(-4deg); }
  .hover-pop { transition: transform .3s cubic-bezier(.2,1.6,.4,1); }

  .row-hover { transition: background .2s, transform .2s, padding-left .2s; border-radius: 12px; }
  .row-hover:hover { background: #ffffff0c; transform: translateX(3px); padding-left: 6px; }

  .chip-hover { transition: transform .2s, background .2s; }
  .chip-hover:hover { transform: translateY(-2px) scale(1.06); }

  .avatar-hover { transition: transform .3s cubic-bezier(.2,1.5,.4,1), filter .3s; }
  .avatar-hover:hover { transform: scale(1.12) rotate(3deg); filter: drop-shadow(0 0 12px #b6ff3b88); }

  input:hover { border-color: #ffffff26; }
  a:hover, .link-hover:hover { color: #b6ff3b; }
}
input:focus { outline: none; border-color: #b6ff3b88 !important; box-shadow: 0 0 0 3px #b6ff3b22; transition: box-shadow .2s, border-color .2s; }
input[type=range] { transition: filter .2s; }
input[type=range]:hover { filter: brightness(1.2) drop-shadow(0 0 6px #b6ff3b66); }
`;
put('index.css', css);

// ---------- 3. Подключение ----------
let m = get('main.tsx');
if (!m.includes('initTilt')) {
  m = m.replace("import { initRipples } from './lib/fx';", "import { initRipples, initTilt } from './lib/fx';");
  m = m.replace('initRipples(); login()', 'initRipples(); initTilt(); login()');
}
put('main.tsx', m);

// плитки игр и карточка кэшбэка наклоняются
let h = get('pages/Home.tsx');
h = h.replace('className={`tile-in relative overflow-hidden text-left rounded-[22px] p-4 w-full active:scale-[.96] transition ${tall ? \'h-40\' : \'h-[112px]\'}`}',
  'data-tilt="7" className={`tile-in relative overflow-hidden text-left rounded-[22px] p-4 w-full ${tall ? \'h-40\' : \'h-[112px]\'}`}');
h = h.replace('className="w-full card p-4 flex items-center gap-3.5 text-left relative overflow-hidden"',
  'data-tilt="5" className="w-full card p-4 flex items-center gap-3.5 text-left relative overflow-hidden"');
h = h.replace('<Emo n={g.e} size={tall ? 132 : 118}\n        className={`absolute drop-shadow-[0_10px_24px_rgba(0,0,0,.45)]',
  '<Emo n={g.e} size={tall ? 132 : 118}\n        className={`hover-pop absolute drop-shadow-[0_10px_24px_rgba(0,0,0,.45)]');
put('pages/Home.tsx', h);

// строки списков и аватары
const rows = [
  ['pages/Leaders.tsx', [['className={`row-in flex items-center gap-2 px-2 py-2 rounded-xl', 'className={`row-in row-hover flex items-center gap-2 px-2 py-2 rounded-xl']]],
  ['pages/Jackpot.tsx', [['className="row-in flex items-center gap-2 py-1.5"', 'className="row-in row-hover flex items-center gap-2 py-1.5"']]],
  ['pages/Crash.tsx', [['<div key={i} className="flex items-center gap-2 py-1.5 px-1">', '<div key={i} className="row-hover flex items-center gap-2 py-1.5 px-1">']]],
  ['pages/Profile.tsx', [['className="flex items-center gap-2 px-1 py-1.5 text-sm"', 'className="row-hover flex items-center gap-2 px-1 py-1.5 text-sm"']]],
  ['ui/kit.tsx', [['className="btn-ghost h-9 text-sm"', 'className="btn-ghost chip-hover h-9 text-sm"']]],
  ['pages/Cases.tsx', [['className={`card py-3 px-2 text-center', 'data-tilt="6" className={`card py-3 px-2 text-center']]],
];
for (const [f, pairs] of rows) {
  let s = get(f);
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 45)); s = s.split(a).join(b); }
  put(f, s);
}
console.log('fx4 ok');
