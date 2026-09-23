// Разовая замена эмодзи на SVG-иконки. node scripts/deemoji.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const edit = (file, pairs, importLine) => {
  const path = P + file;
  let s = readFileSync(path, 'utf8');
  for (const [from, to] of pairs) {
    if (!s.includes(from)) { console.log('MISS', file, JSON.stringify(from).slice(0, 70)); continue; }
    s = s.split(from).join(to);
  }
  if (importLine && !s.includes(importLine)) {
    const lines = s.split('\n');
    const last = lines.map((l, i) => l.startsWith('import ') ? i : -1).filter(i => i >= 0).pop();
    lines.splice(last + 1, 0, importLine);
    s = lines.join('\n');
  }
  writeFileSync(path, s, 'utf8');
  console.log('ok', file);
};

edit('main.tsx', [
  ['<div className="text-5xl mb-3">\u{1F98D}</div>', '<div className="flex justify-center mb-4"><Logo size={64} /></div>'],
  ['<div className="text-6xl float">\u{1F98D}</div>', '<div className="float"><Logo size={72} /></div>'],
], "import { Logo } from './ui/icons';");

edit('pages/Crash.tsx', [
  ['title="\u{1F680} \u0420\u0430\u043A\u0435\u0442\u0430"', 'title="Ракета"'],
  ['>\u{1F680}</div>', '><Rocket size={36} className="text-lime drop-shadow-[0_0_12px_#b6ff3b]" /></div>'],
  ['<div className="text-5xl float">\u{1F98D}</div>', '<div className="float flex justify-center"><Logo size={58} /></div>'],
  ['<div className="text-6xl">\u{1F4A5}</div>', '<div className="w-16 h-16 mx-auto"><Burst /></div>'],
]);

edit('pages/Mines.tsx', [
  ['title="\u{1F4A3} \u041C\u0438\u043D\u044B"', 'title="Мины"'],
  ["{shown ? (bomb ? '\u{1F4A3}' : '\u{1F34C}') : pending === c ? '\u2754' : ''}",
   '{shown ? (bomb ? <Bomb size={cols === 7 ? 18 : cols === 5 ? 26 : 40} className="text-white" /> : <Gem size={cols === 7 ? 18 : cols === 5 ? 26 : 40} className="text-lime" />) : pending === c ? <span className="w-2 h-2 rounded-full bg-banana animate-ping" /> : null}'],
], "import { Bomb, Gem } from '../ui/icons';");

edit('pages/Jackpot.tsx', [
  ["title={kind === 'pvp' ? '\u{1F3A1} PvP' : '\u{1F4AA} \u0410\u0440\u0435\u043D\u0430'}", "title={kind === 'pvp' ? 'PvP' : 'Арена'}"],
  ['<div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 text-2xl drop-shadow">\u25BC</div>',
   '<div className="absolute left-1/2 -top-1.5 -translate-x-1/2 z-10 w-0 h-0 border-x-[9px] border-x-transparent border-t-[16px] border-t-lime drop-shadow-[0_2px_6px_#b6ff3b80]" />'],
  ['<div className="text-3xl">\u{1F98D}</div>', '<Logo size={44} className="mx-auto" />'],
], "import { Logo } from '../ui/icons';");

edit('pages/BitKong.tsx', [
  ['<div className="text-7xl float relative">\u{1F98D}</div>', '<div className="float relative flex justify-center"><Logo size={96} /></div>'],
  ['BitKong \u{1F98D} \u2014 ', 'BitKong — '],
  ['\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0430\u0439 \u0434\u0440\u0443\u0437\u0435\u0439 \u{1F34C}', 'Приглашай друзей'],
], "import { Logo } from '../ui/icons';");

edit('pages/Profile.tsx', [
  ['\u2699\uFE0F \u0410\u0434\u043C\u0438\u043D\u043A\u0430', '<Settings size={14} className="inline-block align-[-2px] mr-1" />Админка'],
  ['\u{1F9EA} \u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0435 5000\u2605 (dev)', 'Тестовые 5000★ (dev)'],
  ['\u{1F510} \u0427\u0435\u0441\u0442\u043D\u0430\u044F \u0438\u0433\u0440\u0430', '<Shield size={15} className="inline-block align-[-3px] mr-1.5 text-lime" />Честная игра'],
], "import { Settings, Shield } from '../ui/icons';");
