import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:/Users/user/Projects/bitkong/web/src/pages/Crash.tsx';
let s = readFileSync(f, 'utf8');
s.split('\n').forEach((l, i) => { if (l.includes('rocket') || l.includes('rocketRef')) console.log(i + 1, l.trim()); });
