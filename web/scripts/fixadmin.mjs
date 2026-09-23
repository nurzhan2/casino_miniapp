import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:/Users/user/Projects/bitkong/web/src/pages/Admin.tsx';
let s = readFileSync(f, 'utf8');
const ls = s.split('\n');
ls.forEach((l, i) => { if (l.includes('TopBar')) console.log(i + 1, JSON.stringify(l)); });
s = ls.map(l => l.includes('<TopBar') ? '      <TopBar title="Админка" />' : l).join('\n');
writeFileSync(f, s, 'utf8');
console.log('done');
