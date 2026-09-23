// Возврат объёмных эмодзи в игровые экраны. node scripts/emoji3d.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const rx = (file, pairs, importLine) => {
  const path = P + file;
  let s = readFileSync(path, 'utf8');
  for (const [re, to] of pairs) { if (!re.test(s)) console.log('MISS', file, String(re).slice(0, 60)); s = s.replace(re, to); }
  if (importLine && !s.includes(importLine)) {
    const l = s.split('\n');
    const last = l.map((x, i) => x.startsWith('import ') ? i : -1).filter(i => i >= 0).pop();
    l.splice(last + 1, 0, importLine);
    s = l.join('\n');
  }
  writeFileSync(path, s, 'utf8');
  console.log('ok', file);
};

// Ракета: сама ракета, взрыв и заставка
rx('pages/Crash.tsx', [
  [/<Rocket size=\{36\}[^/]*\/>/, '<Emo n="rocket" size={54} className="drop-shadow-[0_0_18px_#b6ff3b66]" />'],
  [/<div className="float flex justify-center"><Logo size=\{58\} \/><\/div>/, '<div className="float flex justify-center"><Emo n="kong" size={78} /></div>'],
  [/<div className="w-16 h-16 mx-auto"><Burst \/><\/div>/, '<div className="flex justify-center"><Emo n="boom" size={76} /></div>'],
], "import { Emo } from '../ui/emoji';");

// Мины: бомбы и кристаллы
rx('pages/Mines.tsx', [
  [/<Bomb size=\{cols === 7 \? 18 : cols === 5 \? 26 : 40\} className="text-white" \/>/, '<Emo n="bomb" size={cols === 7 ? 24 : cols === 5 ? 36 : 54} />'],
  [/<Gem size=\{cols === 7 \? 18 : cols === 5 \? 26 : 40\} className="text-lime" \/>/, '<Emo n="gem" size={cols === 7 ? 24 : cols === 5 ? 36 : 54} />'],
], "import { Emo } from '../ui/emoji';");

// Coinflip: грани монеты и кнопки сторон
rx('pages/Coinflip.tsx', [
  [/const SIDES = \[[\s\S]*?\];/, `const SIDES = [
  { k: 'heads', t: 'Орёл', e: 'kong', c: 'from-[#3bc9ff] to-[#0e5f86]' },
  { k: 'edge', t: 'Ребро', e: 'bolt', c: 'from-[#ff5a5a] to-[#7d1c1c]' },
  { k: 'tails', t: 'Решка', e: 'banana', c: 'from-[#8b5cff] to-[#3b1d8a]' },
];`],
  [/<Logo size=\{86\} \/>/, '<Emo n="kong" size={96} />'],
  [/<StarIcon size=\{72\} \/>/, '<Emo n="banana" size={92} />'],
  [/\{\(\(\) => \{ const I = SIDES\.find\(s => s\.k === r\)\?\.Ic; return I \? <I size=\{15\} \/> : null; \}\)\(\)\}/,
   '<Emo n={SIDES.find(s => s.k === r)?.e || \'coin\'} size={20} />'],
  [/<div className="flex justify-center mb-1"><s\.Ic size=\{22\} \/><\/div>/, '<div className="flex justify-center mb-1"><Emo n={s.e} size={34} /></div>'],
], "import { Emo } from '../ui/emoji';");

// PvP и Арена: центр колеса и шар
rx('pages/Jackpot.tsx', [
  [/<Logo size=\{44\} className="mx-auto" \/>/, '<Emo n={kind === \'pvp\' ? \'wheel\' : \'swords\'} size={52} className="mx-auto" />'],
], "import { Emo } from '../ui/emoji';");

// BitKong: герой раздела кэшбэка
rx('pages/BitKong.tsx', [
  [/<div className="float relative flex justify-center"><Logo size=\{96\} \/><\/div>/, '<div className="float relative flex justify-center"><Emo n="kong" size={112} className="drop-shadow-[0_12px_28px_rgba(0,0,0,.55)]" /></div>'],
], "import { Emo } from '../ui/emoji';");

// Лидеры: медали
rx('pages/Leaders.tsx', [
  [/<div className=\{`mx-auto w-8 h-8 rounded-full grid place-items-center font-display text-sm bg-gradient-to-br \$\{MEDAL_STYLE\[place - 1\]\}`\}>\{place\}<\/div>/,
   '<Emo n={`medal${place}`} size={place === 1 ? 40 : 32} className="mx-auto" />'],
], "import { Emo } from '../ui/emoji';");
