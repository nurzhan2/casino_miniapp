// Второй заход по анимациям: фон, переходы экранов, живые элементы. node scripts/fx2.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const put = (f, s) => writeFileSync(P + f, s, 'utf8');
const get = f => readFileSync(P + f, 'utf8');

// ---------- 1. CSS ----------
let css = get('index.css');
if (!css.includes('bk-orb')) css += `

/* ---------- живой фон ---------- */
.bk-bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
.bk-orb { position: absolute; border-radius: 9999px; filter: blur(60px); opacity: .22; will-change: transform; }
@keyframes orb-a { 0%,100% { transform: translate(0,0) scale(1) } 33% { transform: translate(18vw,10vh) scale(1.25) } 66% { transform: translate(-12vw,16vh) scale(.85) } }
@keyframes orb-b { 0%,100% { transform: translate(0,0) scale(1.1) } 50% { transform: translate(-20vw,-14vh) scale(.8) } }
.bk-orb-1 { width: 55vw; height: 55vw; left: -10vw; top: -8vh; background: #b6ff3b; animation: orb-a 26s ease-in-out infinite; }
.bk-orb-2 { width: 45vw; height: 45vw; right: -12vw; top: 30vh; background: #ff3bd4; animation: orb-b 32s ease-in-out infinite; opacity: .14; }
.bk-orb-3 { width: 40vw; height: 40vw; left: 20vw; bottom: -10vh; background: #3bc9ff; animation: orb-a 38s ease-in-out infinite reverse; opacity: .12; }
.bk-grid { position: absolute; inset: 0; background-image: linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px); background-size: 42px 42px; animation: grid-move 24s linear infinite; }
@keyframes grid-move { to { background-position: 42px 42px, 42px 42px } }

/* ---------- переход между экранами ---------- */
@keyframes screen-in { from { opacity: 0; transform: translateY(16px) scale(.985) } to { opacity: 1; transform: none } }
.screen-in { animation: screen-in .32s cubic-bezier(.22,1,.36,1) both; }

/* ---------- мелкая жизнь ---------- */
@keyframes breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
.breathe { animation: breathe 2.6s ease-in-out infinite; }
@keyframes spin-slow { to { transform: rotate(360deg) } }
.spin-slow { animation: spin-slow 22s linear infinite; }
@keyframes bob { 0%,100% { transform: translateY(0) rotate(-3deg) } 50% { transform: translateY(-7px) rotate(3deg) } }
.bob { animation: bob 3.4s ease-in-out infinite; }
@keyframes glow-pulse { 0%,100% { filter: drop-shadow(0 0 6px #b6ff3b55) } 50% { filter: drop-shadow(0 0 18px #b6ff3baa) } }
.glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
@keyframes value-pop { 0% { transform: scale(1) } 35% { transform: scale(1.22); color: #b6ff3b } 100% { transform: scale(1) } }
.value-pop { animation: value-pop .55s cubic-bezier(.2,1.5,.4,1); }
@keyframes row-in { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: none } }
.row-in { animation: row-in .3s ease-out both; }
@keyframes dot-pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.6); opacity: .45 } }
.dot-pulse { animation: dot-pulse 1.1s ease-in-out infinite; }
@keyframes nav-pop { 0% { transform: translateY(0) } 45% { transform: translateY(-5px) scale(1.18) } 100% { transform: translateY(0) } }
.nav-pop { animation: nav-pop .4s cubic-bezier(.2,1.5,.4,1); }
@keyframes border-run { to { background-position: 200% 0 } }
.neon-border { background: linear-gradient(90deg, #b6ff3b, #3bc9ff, #ff3bd4, #b6ff3b); background-size: 200% 100%; animation: border-run 4s linear infinite; }
@keyframes tile-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
.tile-float { animation: tile-float 5s ease-in-out infinite; }
`;
put('index.css', css);

// ---------- 2. Фон и переход экранов ----------
let m = get('main.tsx');
if (!m.includes('bk-bg')) {
  m = m.replace('    <div className="max-w-md mx-auto pb-28">',
    `    <div className="max-w-md mx-auto pb-28">
      <div className="bk-bg"><div className="bk-grid" /><div className="bk-orb bk-orb-1" /><div className="bk-orb bk-orb-2" /><div className="bk-orb bk-orb-3" /></div>`);
  m = m.replace('<div key={screen}>{page[screen] ?? <Home />}</div>', '<div key={screen} className="screen-in">{page[screen] ?? <Home />}</div>');
}
put('main.tsx', m);

// ---------- 3. Шапка, лента, меню ----------
let k = get('ui/kit.tsx');
if (!k.includes('useCountUp')) {
  k = k.replace("import { StarIcon, Games, Trophy, Logo, User } from './icons';",
    `import { StarIcon, Games, Trophy, Logo, User } from './icons';
import { useCountUp, useFlash } from '../lib/anim';`);
  // живой баланс в шапке
  k = k.replace(`export function Header() {
  const { me, go } = useApp();`, `export function Header() {
  const { me, go } = useApp();
  const shown = useCountUp(me.balance);
  const bump = useFlash(me.balance);`);
  k = k.replace('<Star /> <span className="font-extrabold tabular-nums">{fmt(me.balance)}</span>',
    '<Star /> <span className={`font-extrabold tabular-nums ${bump ? \'value-pop\' : \'\'}`}>{fmt(shown)}</span>');
  k = k.replace('<Avatar src={me.photo} name={me.name} size={36} />', '<Avatar src={me.photo} name={me.name} size={36} className="glow-pulse" />');
  // пульсирующая точка LIVE
  k = k.replace('<span className="w-2 h-2 rounded-full bg-lime pulse-lime" />', '<span className="w-2 h-2 rounded-full bg-lime dot-pulse" />');
  // строки ленты выезжают
  k = k.replace('className="slide-in shrink-0', 'className="row-in shrink-0');
  // иконка активной вкладки подпрыгивает
  k = k.replace('<Icon size={k === \'bitkong\' ? 21 : 20} />', `<span className={screen === k ? 'nav-pop' : ''} key={screen === k ? 'on' : 'off'}><Icon size={k === 'bitkong' ? 21 : 20} /></span>`);
}
// Avatar должен принимать className
k = k.replace('export function Avatar({ src, name, size = 32 }: { src?: string | null; name?: string; size?: number }) {',
  'export function Avatar({ src, name, size = 32, className = \'\' }: { src?: string | null; name?: string; size?: number; className?: string }) {');
k = k.replace('return <img src={src} style={s} className="rounded-full object-cover shrink-0" />;',
  'return <img src={src} style={s} className={`rounded-full object-cover shrink-0 ${className}`} />;');
k = k.replace('<div style={s} className="rounded-full bg-vine grid place-items-center text-xs font-extrabold text-lime shrink-0">',
  '<div style={s} className={`rounded-full bg-vine grid place-items-center text-xs font-extrabold text-lime shrink-0 ${className}`}>');
put('ui/kit.tsx', k);

// ---------- 4. Простои в играх ----------
const idle = [
  ['pages/Home.tsx', [['<Emo n="kong" size={52} className="relative shrink-0', '<Emo n="kong" size={52} className="relative shrink-0 bob']]],
  ['pages/Crash.tsx', [['<div className="float flex justify-center"><Emo n="kong" size={78} /></div>', '<div className="float flex justify-center"><Emo n="kong" size={78} className="breathe" /></div>']]],
  ['pages/Roulette.tsx', [['<Emo n="wheel" size={38} />', '<Emo n="wheel" size={38} className="spin-slow" />']]],
  ['pages/Upgrade.tsx', [['<Emo n="glowstar" size={40} className="mx-auto" />', '<Emo n="glowstar" size={40} className="mx-auto breathe" />']]],
  ['pages/BitKong.tsx', [['<Emo n="kong" size={112}', '<Emo n="kong" size={112} data-idle="1"']]],
  ['pages/Cases.tsx', [['<Emo n={ICON[d % ICON.length]} size={40} />', '<Emo n={ICON[d % ICON.length]} size={40} className={spin ? \'\' : \'tile-float\'} />']]],
];
for (const [f, pairs] of idle) {
  let s = get(f);
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 40)); s = s.split(a).join(b); }
  put(f, s);
}
console.log('fx2 ok');
