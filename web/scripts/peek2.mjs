import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
for (const f of ['main.tsx', 'pages/Crash.tsx']) {
  readFileSync(P + f, 'utf8').split('\n').forEach((l, i) => {
    if (/if \(!me\)|key=\{i\}|Loader/.test(l)) console.log(f, i + 1, l.trim().slice(0, 150));
  });
}
