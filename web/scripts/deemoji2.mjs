import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const rx = (file, pairs, importLine) => {
  const path = P + file;
  let s = readFileSync(path, 'utf8');
  for (const [re, to] of pairs) {
    if (!re.test(s)) console.log('MISS', file, String(re).slice(0, 60));
    s = s.replace(re, to);
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

// Ракета: заставка фазы ставок
rx('pages/Crash.tsx', [
  [/<div className="text-5xl float">[^<]*<\/div>/, '<div className="float flex justify-center"><Logo size={58} /></div>'],
  [/import \{ Logo, Rocket, Burst \} from '\.\.\/ui\/icons';/, "import { Logo, Rocket, Burst } from '../ui/icons';"],
]);

// Coinflip: стороны монеты
rx('pages/Coinflip.tsx', [
  [/const SIDES = \[[\s\S]*?\];/, `const SIDES = [
  { k: 'heads', t: 'Орёл', Ic: Logo, c: 'from-[#3bc9ff] to-[#0e5f86]' },
  { k: 'edge', t: 'Ребро', Ic: Bolt, c: 'from-[#ff5a5a] to-[#7d1c1c]' },
  { k: 'tails', t: 'Решка', Ic: StarIcon, c: 'from-[#8b5cff] to-[#3b1d8a]' },
];`],
  [/<TopBar title="[^"]*Coinflip" \/>/, '<TopBar title="Coinflip" />'],
  [/text-6xl bg-gradient-to-br from-banana to-\[#c98a00\] border-4 border-\[#ffe98a\] shadow-2xl" style=\{\{ backfaceVisibility: 'hidden' \}\}>[^<]*</,
   `bg-gradient-to-br from-banana to-[#c98a00] border-4 border-[#ffe98a] shadow-2xl" style={{ backfaceVisibility: 'hidden' }}><Logo size={86} /><`],
  [/text-6xl bg-gradient-to-br from-lime to-\[#5e9b10\] border-4 border-\[#e2ffb0\] shadow-2xl" style=\{\{ backfaceVisibility: 'hidden', transform: 'rotateY\(180deg\)' \}\}>[^<]*</,
   `bg-gradient-to-br from-lime to-[#5e9b10] border-4 border-[#e2ffb0] shadow-2xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><StarIcon size={72} /><`],
  [/<span key=\{i\} className="text-lg">\{SIDES\.find\(s => s\.k === r\)\?\.ic\}<\/span>/,
   `<span key={i} className="w-7 h-7 rounded-lg bg-moss grid place-items-center text-white/70">{(() => { const I = SIDES.find(s => s.k === r)?.Ic; return I ? <I size={15} /> : null; })()}</span>`],
  [/className=\{`\$\{s\.c\} rounded-2xl py-3 font-extrabold active:scale-95 transition`\}>\s*<div className="text-2xl">\{s\.ic\}<\/div>/,
   'className={`bg-gradient-to-br ${s.c} rounded-2xl py-3.5 font-extrabold active:scale-95 transition`}>\n              <div className="flex justify-center mb-1"><s.Ic size={22} /></div>'],
], "import { Logo, Bolt, StarIcon } from '../ui/icons';");

// Лидеры: медали → номерные бейджи
rx('pages/Leaders.tsx', [
  [/const MEDAL = \[[^\]]*\];/, `const MEDAL_STYLE = ['from-[#ffd76a] to-[#e0a000] text-[#3a2800]', 'from-[#dfe7ee] to-[#9fb0bf] text-[#1d2630]', 'from-[#e7a86a] to-[#b06a2c] text-[#2e1806]'];`],
  [/<div className="font-display text-xl">[^<]*<\/div>/, '<div className="font-display text-xl flex items-center gap-2"><Trophy size={20} className="text-banana" />Лидеры</div>'],
  [/<div className="text-3xl">\{MEDAL\[place - 1\]\}<\/div>/,
   `<div className={\`mx-auto w-8 h-8 rounded-full grid place-items-center font-display text-sm bg-gradient-to-br \${MEDAL_STYLE[place - 1]}\`}>{place}</div>`],
], "import { Trophy } from '../ui/icons';");

// Админка
rx('pages/Admin.tsx', [
  [/<TopBar title="[^"]*Админка" \/>/, '<TopBar title="Админка" />'],
  [/>\u2715<\/button>|>\u2716<\/button>|>\u2718<\/button>|>\u00D7<\/button>|>\u2573<\/button>|>\u2715\uFE0F<\/button>/g, '><Close size={14} /></button>'],
  [/\u{1F3C6}\s?/gu, ''],
], "import { Close } from '../ui/icons';");
