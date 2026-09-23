// Третий заход: частицы в играх и каскады списков. node scripts/fx3.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const get = f => readFileSync(P + f, 'utf8');
const put = (f, s) => writeFileSync(P + f, s, 'utf8');
const sub = (f, pairs) => {
  let s = get(f);
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 50)); s = s.split(a).join(b); }
  put(f, s);
  console.log('ok', f);
};

// 1. Шлейф частиц под ракетой
let fx = get('lib/fx.ts');
if (!fx.includes('export function trail')) fx += `
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
`;
put('lib/fx.ts', fx);

// 2. Ракета: искры из-под сопла, чем выше множитель — тем гуще
sub('pages/Crash.tsx', [
  ["import { win as fxWin, lose as fxLose } from '../lib/fx';",
   "import { win as fxWin, lose as fxLose, trail } from '../lib/fx';"],
  ['  if (!s) return <TopBar title="Ракета" />;',
   `  useEffect(() => {
    if (s?.phase !== 'running') return;
    const el = rocketRef.current;
    const i = setInterval(() => {
      const r = el?.getBoundingClientRect();
      if (r) trail(r.left + r.width / 2, r.bottom - 6, Math.min(2.5, 0.6 + Math.log(Math.max(1, m))));
    }, 45);
    return () => clearInterval(i);
  }, [s?.phase, m]);

  if (!s) return <TopBar title="Ракета" />;`],
]);

// ссылка на ракету для координат
let c = get('pages/Crash.tsx');
if (!c.includes('rocketRef')) {
  c = c.replace('const raf = useRef(0);', 'const raf = useRef(0);\n  const rocketRef = useRef<HTMLDivElement>(null);');
  c = c.replace("{s.phase === 'running' && <div className=\"absolute", "{s.phase === 'running' && <div ref={rocketRef} className=\"absolute");
  put('pages/Crash.tsx', c);
}

// 3. Мины: бомбы вскрываются каскадом
sub('pages/Mines.tsx', [
  ['style={{ opacity: !open && !shown && g ? 0.5 : 1 }}>',
   'style={{ opacity: !open && !shown && g ? 0.5 : 1, animationDelay: `${(bomb ? c % 7 : 0) * 55}ms` }}>'],
]);

// 4. PvP и Арена: колесо медленно крутится в ожидании, отсчёт пульсирует
sub('pages/Jackpot.tsx', [
  ['<div className="card p-4 mt-2 relative">',
   '<div className={`card p-4 mt-2 relative ${s.phase === \'waiting\' ? \'tile-float\' : \'\'}`}>'],
  ['<div className="font-display text-3xl">{Math.ceil(left)}</div>',
   '<div key={Math.ceil(left)} className="font-display text-3xl value-pop">{Math.ceil(left)}</div>'],
  ['<div key={p.id} className="flex items-center gap-2 py-1.5">',
   '<div key={p.id} className="row-in flex items-center gap-2 py-1.5">'],
]);

// 5. Лидеры: строки выезжают каскадом
sub('pages/Leaders.tsx', [
  ['{d?.list.slice(3).map((r: any) => (', '{d?.list.slice(3).map((r: any, i: number) => ('],
  ['<div key={r.id} className={`flex items-center gap-2 px-2 py-2 rounded-xl ${r.id === me.id ? \'bg-lime/10\' : \'\'}`}>',
   '<div key={r.id} style={{ animationDelay: `${i * 35}ms` }} className={`row-in flex items-center gap-2 px-2 py-2 rounded-xl ${r.id === me.id ? \'bg-lime/10\' : \'\'}`}>'],
]);

// 6. История ракеты: новые коэффициенты влетают
sub('pages/Crash.tsx', [
  ['<span key={i} className={`shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full',
   '<span key={i} style={{ animationDelay: `${i * 25}ms` }} className={`row-in shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full'],
]);

// 7. Кэшбэк: число докручивается
let b = get('pages/BitKong.tsx');
if (!b.includes('useCountUp')) {
  b = b.replace("import { api, fmt, haptic, tg } from '../lib/api';",
    "import { api, fmt, haptic, tg } from '../lib/api';\nimport { useCountUp } from '../lib/anim';");
  b = b.replace('  const cur = levels[lv.index - 1];', '  const cur = levels[lv.index - 1];\n  const cashShown = useCountUp(me.cashback, 700);');
  b = b.replace('{me.cashback.toFixed(2)}', '{cashShown.toFixed(2)}');
  put('pages/BitKong.tsx', b);
  console.log('ok pages/BitKong.tsx');
}
