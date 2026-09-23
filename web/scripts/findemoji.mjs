import { readFileSync, readdirSync, statSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const walk = d => readdirSync(d).flatMap(f => statSync(d + f).isDirectory() ? walk(d + f + '/') : [d + f]);
const re = /[\u{1F300}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/u;
for (const f of walk(P)) {
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (re.test(l)) console.log(f.replace(P, '') + ':' + (i + 1) + ' | ' + l.trim()); });
}
