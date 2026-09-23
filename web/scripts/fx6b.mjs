import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';

// Лоадер с частицами
let m = readFileSync(P + 'main.tsx', 'utf8');
m = m.replace('  if (!me) return <div className="h-full grid place-items-center"><div className="float"><Logo size={72} /></div></div>;',
  '  if (!me) return <Loader />;');
writeFileSync(P + 'main.tsx', m, 'utf8');

// Подсветка строки игрока, который забрал выигрыш
let c = readFileSync(P + 'pages/Crash.tsx', 'utf8');
c = c.replace('<div key={i} className="flex items-center gap-2 py-1.5">',
  '<div key={i} className={`row-hover flex items-center gap-2 py-1.5 ${b.cashed ? \'row-flash\' : \'\'}`}>');
writeFileSync(P + 'pages/Crash.tsx', c, 'utf8');

console.log('loader:', m.includes('return <Loader />'), 'row-flash:', c.includes('row-flash'));
