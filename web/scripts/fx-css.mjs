import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';

// 1. CSS эффектов
let css = readFileSync(P + 'index.css', 'utf8');
if (!css.includes('fx-ripple')) css += `

/* ---------- эффекты ---------- */
.fx-ripple { position: absolute; border-radius: 9999px; background: #ffffff55; transform: scale(0); opacity: .8; animation: ripple .55s ease-out forwards; pointer-events: none; }
@keyframes ripple { to { transform: scale(1); opacity: 0 } }

@keyframes fx-shake-k {
  0%,100% { transform: translate(0,0) }
  15% { transform: translate(calc(-7px * var(--shake-power,1)), calc(3px * var(--shake-power,1))) rotate(-.4deg) }
  30% { transform: translate(calc(6px * var(--shake-power,1)), calc(-4px * var(--shake-power,1))) rotate(.4deg) }
  45% { transform: translate(calc(-5px * var(--shake-power,1)), calc(2px * var(--shake-power,1))) }
  60% { transform: translate(calc(4px * var(--shake-power,1)), calc(-2px * var(--shake-power,1))) }
  80% { transform: translate(calc(-2px * var(--shake-power,1)), 0) }
}
.fx-shake { animation: fx-shake-k .42s cubic-bezier(.36,.07,.19,.97); }

@keyframes fx-win-in {
  0% { transform: scale(.4) rotate(-6deg); opacity: 0; filter: blur(8px) }
  55% { transform: scale(1.12) rotate(1.5deg); opacity: 1; filter: blur(0) }
  70% { transform: scale(.97) rotate(-.5deg) }
  100% { transform: scale(1) rotate(0); opacity: 1 }
}
@keyframes fx-fade-out { to { opacity: 0; transform: translateY(-18px) scale(.94) } }
.fx-win { animation: fx-win-in .5s cubic-bezier(.2,1.3,.4,1) both, fx-fade-out .45s ease-in 1.6s both; }
.fx-lose { animation: fx-win-in .35s ease-out both, fx-fade-out .4s ease-in 1.05s both; }
@keyframes fx-mult-in { 0% { transform: translateY(14px) scale(.6); opacity: 0 } 100% { transform: none; opacity: 1 } }
.fx-mult { animation: fx-mult-in .4s .12s cubic-bezier(.2,1.4,.4,1) both; }

/* бегущий блик по крупному числу */
.fx-shine { background: linear-gradient(100deg, #b6ff3b 20%, #ffffff 45%, #b6ff3b 70%); -webkit-background-clip: text; background-clip: text; color: transparent; background-size: 250% 100%; animation: shine 1.4s linear infinite; filter: drop-shadow(0 0 26px #b6ff3b66); }
@keyframes shine { to { background-position: -250% 0 } }

/* кнопки: блик, нажатие, свечение */
.btn-lime { position: relative; overflow: hidden; }
.btn-lime::after { content: ''; position: absolute; top: 0; bottom: 0; width: 45%; left: -60%; background: linear-gradient(90deg, transparent, #ffffff66, transparent); transform: skewX(-18deg); animation: btn-sweep 3.4s ease-in-out infinite; }
@keyframes btn-sweep { 0%, 60% { left: -60% } 85%, 100% { left: 130% } }
.btn-lime:active { transform: scale(.965) translateY(1px); box-shadow: 0 3px 12px -6px #b6ff3b80; }
.btn-ghost:active { transform: scale(.97); }
button { transition: transform .12s cubic-bezier(.2,1.4,.4,1), box-shadow .2s, background .2s; }

@keyframes tile-in { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }
.tile-in { animation: tile-in .38s cubic-bezier(.2,1.1,.4,1) both; }
`;
writeFileSync(P + 'index.css', css, 'utf8');

// 2. Подключение оверлея и ряби
let m = readFileSync(P + 'main.tsx', 'utf8');
if (!m.includes('FxOverlay')) {
  m = m.replace("import { Header, LiveStrip, BottomNav } from './ui/kit';",
    `import { Header, LiveStrip, BottomNav } from './ui/kit';
import { FxOverlay } from './ui/Fx';
import { initRipples } from './lib/fx';`);
  m = m.replace('      {tabs.includes(screen) && <BottomNav />}', `      {tabs.includes(screen) && <BottomNav />}
      <FxOverlay />`);
  m = m.replace('  useEffect(() => { login()', '  useEffect(() => { initRipples(); login()');
}
writeFileSync(P + 'main.tsx', m, 'utf8');
console.log(m.includes('FxOverlay') && m.includes('initRipples()') ? 'wired' : 'MISS');
