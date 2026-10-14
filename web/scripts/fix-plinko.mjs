import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:/Users/user/Projects/bitkong/web/src/pages/Plinko.tsx';
let s = readFileSync(f, 'utf8');
const pairs = [
  // гвоздики на тех же координатах, что слоты и шарик: шаг 1/(rows+1)
  [`          {pegs.map(r => (
            <div key={r} className="absolute flex justify-center gap-[3%] w-full" style={{ top: \`\${(r / rows) * 100}%\` }}>
              {[...Array(r + 3).keys()].map(c => <span key={c} className="w-1.5 h-1.5 rounded-full bg-white/25" />)}
            </div>
          ))}`,
   `          {pegs.map(r => [...Array(r + 3).keys()].map(c => (
            <span key={r + '-' + c} className="absolute w-1.5 h-1.5 rounded-full bg-white/30 -translate-x-1/2 -translate-y-1/2"
              style={{ left: \`\${(0.5 + (c - (r + 2) / 2) / (rows + 1)) * 100}%\`, top: \`\${((r + 0.5) / rows) * 100}%\` }} />
          )))}`],
  // шарик заканчивает ровно в центре своего слота
  ['setBall({ x: Math.min(0.96, Math.max(0.04, 0.5 + offset / rows)), y: p / path.length });',
   'setBall({ x: 0.5 + offset / (rows + 1), y: p / path.length });'],
];
for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', a.slice(0, 60)); s = s.split(a).join(b); }
writeFileSync(f, s, 'utf8');
console.log('plinko ok');
