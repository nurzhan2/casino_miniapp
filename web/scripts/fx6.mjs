// Финальная сборка: CSS, звук в играх, скелетоны, near-miss, level-up, зум из плитки. node scripts/fx6.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const get = f => readFileSync(P + f, 'utf8');
const put = (f, s) => writeFileSync(P + f, s, 'utf8');
const sub = (f, pairs, imp) => {
  let s = get(f);
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 48)); s = s.split(a).join(b); }
  if (imp && !s.includes(imp)) {
    const l = s.split('\n');
    const last = l.map((x, i) => x.startsWith('import ') ? i : -1).filter(i => i >= 0).pop();
    l.splice(last + 1, 0, imp); s = l.join('\n');
  }
  put(f, s); console.log('ok', f);
};

// ---------- CSS ----------
let css = get('index.css');
if (!css.includes('skeleton')) css += `

/* скелетоны и пустые состояния */
.skeleton { background: linear-gradient(90deg, #17241b 25%, #22362a 50%, #17241b 75%); background-size: 200% 100%; animation: sk 1.3s linear infinite; }
@keyframes sk { to { background-position: -200% 0 } }
@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }

/* золотой режим на крупный выигрыш */
.gold-mode body, .gold-mode { --color-lime: #ffd43b; }
.gold-mode .bk-orb-1 { background: #ffd43b; opacity: .4; }
.gold-mode .card { border-color: #ffd43b44; box-shadow: 0 0 40px -12px #ffd43b55; }
html { transition: none; }
.gold-mode .btn-lime { background: linear-gradient(180deg, #ffe27a, #f5a623); }

/* повышение уровня кэшбэка */
@keyframes level-up { 0% { transform: scale(.5) rotate(-8deg); opacity: 0 } 50% { transform: scale(1.15) rotate(2deg); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
.level-up { animation: level-up .6s cubic-bezier(.2,1.4,.4,1) both; }

/* волна по прогресс-бару */
.wave-bar { position: relative; overflow: hidden; }
.wave-bar::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, #ffffff66, transparent); transform: translateX(-100%); animation: wave 2.2s ease-in-out infinite; }
@keyframes wave { 60%, 100% { transform: translateX(100%) } }

/* зум при входе в игру */
@keyframes zoom-in { from { opacity: 0; transform: scale(.82) translateY(24px) } to { opacity: 1; transform: none } }
.screen-in { animation: zoom-in .34s cubic-bezier(.2,1,.32,1) both; }

/* подсветка строки игрока, который забрал выигрыш */
@keyframes row-flash { 0% { background: #b6ff3b44 } 100% { background: transparent } }
.row-flash { animation: row-flash 1.1s ease-out; border-radius: 10px; }

/* дрожь поля при близком промахе */
@keyframes near { 0%,100% { transform: none } 25% { transform: translateX(-3px) } 75% { transform: translateX(3px) } }
.near-miss { animation: near .22s linear 2; }
`;
put('index.css', css);

// ---------- Звук по всему приложению ----------
sub('lib/api.ts', [
  ["export function haptic(", "import { sfx } from './sfx';\n\nexport function haptic("],
  ["  const h = tg?.HapticFeedback;", "  if (t === 'light') sfx.tap(); else if (t === 'medium') sfx.bet(); else if (t === 'success') sfx.cash();\n  const h = tg?.HapticFeedback;"],
]);

// ---------- Баланс: якорь для летящих звёзд ----------
sub('ui/kit.tsx', [
  ['<button onClick={() => go(\'profile\')} className="ml-auto flex items-center gap-2 bg-moss border border-white/10 rounded-full pl-3 pr-1 py-1">',
   '<button id="bk-balance" onClick={() => go(\'profile\')} className="ml-auto flex items-center gap-2 bg-moss border border-white/10 rounded-full pl-3 pr-1 py-1">'],
]);

// ---------- Лидеры: скелетон и пустое состояние ----------
sub('pages/Leaders.tsx', [
  ['{!d && <div className="p-4 text-center text-white/40">Загрузка…</div>}', '{!d && <SkeletonList n={6} />}'],
  ['{d?.list.length === 0 && <div className="p-4 text-center text-white/40">На этой неделе ещё никто не играл — стань первым!</div>}',
   '{d?.list.length === 0 && <Empty text="На этой неделе ещё никто не играл — стань первым" emo="trophy" />}'],
], "import { SkeletonList, Empty } from '../ui/bits';");

// ---------- Профиль: пустая история, переключатель звука ----------
sub('pages/Profile.tsx', [
  ['{bets.length === 0 && <div className="text-sm text-white/30 p-2">Пока нет игр</div>}',
   '{bets.length === 0 && <Empty text="Пока нет игр — самое время начать" />}'],
  ['{me.isAdmin && <button onClick={() => go(\'admin\')}',
   `<button onClick={() => { setSnd(toggleSound()); }} className="btn-ghost chip-hover px-3 py-2 text-xs mr-2">{snd ? 'Звук вкл' : 'Звук выкл'}</button>
        {me.isAdmin && <button onClick={() => go('admin')}`],
  ['  const [revealed, setRevealed] = useState<any>(null);', '  const [revealed, setRevealed] = useState<any>(null);\n  const [snd, setSnd] = useState(soundOn());'],
], "import { Empty } from '../ui/bits';\nimport { soundOn, toggleSound } from '../lib/sfx';");

// ---------- Мины: звук и дрожь при близком промахе ----------
sub('pages/Mines.tsx', [
  ["      const [r] = await Promise.all([api('/api/mines/reveal', { cell }), sleep(350 + risk * 900)]);",
   `      if (risk > 0.35) { const el = document.getElementById('mines-grid'); el?.classList.add('near-miss'); setTimeout(() => el?.classList.remove('near-miss'), 500); }
      const [r] = await Promise.all([api('/api/mines/reveal', { cell }), sleep(350 + risk * 900)]);`],
  ['<div className="grid gap-2" style={{ gridTemplateColumns:', '<div id="mines-grid" className="grid gap-2" style={{ gridTemplateColumns:'],
  ["else haptic('light');", "else { haptic('light'); sfx.reveal(); }"],
], "import { sfx } from '../lib/sfx';");

// ---------- Рулетка, кейсы, апгрейд: звук барабана ----------
for (const f of ['pages/Roulette.tsx', 'pages/Cases.tsx', 'pages/Upgrade.tsx']) {
  sub(f, [["haptic('medium');", "haptic('medium'); sfx.spin();"]], "import { sfx } from '../lib/sfx';");
}

// ---------- Ракета: тики при росте множителя, подсветка забравших ----------
sub('pages/Crash.tsx', [
  ['<div key={i} className="row-hover flex items-center gap-2 py-1.5 px-1">',
   '<div key={i} className={`row-hover flex items-center gap-2 py-1.5 px-1 ${b.cashed ? \'row-flash\' : \'\'}`}>'],
]);

// ---------- Кэшбэк: волна по прогрессу и оверлей повышения уровня ----------
sub('pages/BitKong.tsx', [
  ['<div className="h-2.5 bg-moss rounded-full mt-3 overflow-hidden">', '<div className="h-2.5 bg-moss rounded-full mt-3 overflow-hidden wave-bar">'],
  ['  const cashShown = useCountUp(me.cashback, 700);',
   `  const cashShown = useCountUp(me.cashback, 700);
  const [levelUp, setLevelUp] = useState(false);
  const prevLevel = useRef(lv.index);
  useEffect(() => {
    if (lv.index > prevLevel.current) { setLevelUp(true); sfx.levelUp(); confetti(90); setTimeout(() => setLevelUp(false), 2600); }
    prevLevel.current = lv.index;
  }, [lv.index]);`],
  ['    <div className="px-4 space-y-3 mt-1">',
   `    <div className="px-4 space-y-3 mt-1">
      {levelUp && (
        <div className="fixed inset-0 z-[57] grid place-items-center pointer-events-none">
          <div className="level-up text-center"><div className="font-display text-4xl text-lime glow">Уровень {lv.index}</div>
          <div className="text-sm text-white/60 mt-1">кэшбэк {lv.rate}%</div></div>
        </div>
      )}`],
  ["import { useState } from 'react';", "import { useEffect, useRef, useState } from 'react';"],
], "import { sfx } from '../lib/sfx';\nimport { confetti } from '../lib/fx';");

// ---------- Загрузка: логотип собирается из частиц ----------
sub('main.tsx', [
  ['  if (!me) return <div className="h-full grid place-items-center"><div className="text-6xl float">🦍</div></div>;',
   '  if (!me) return <Loader />;'],
  ['createRoot(document.getElementById(\'root\')!).render(<Root />);',
   `function Loader() {
  useEffect(() => { assembleLogo(innerWidth / 2, innerHeight / 2); const i = setInterval(() => assembleLogo(innerWidth / 2, innerHeight / 2), 1200); return () => clearInterval(i); }, []);
  return <div className="h-full grid place-items-center"><div className="breathe"><Logo size={84} /></div></div>;
}

createRoot(document.getElementById('root')!).render(<Root />);`],
], "import { assembleLogo } from './lib/fx';");
console.log('fx6 ok');
