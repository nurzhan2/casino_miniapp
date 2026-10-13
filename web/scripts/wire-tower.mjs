// Подключение Tower: роутер, плитка на главной (первой, как хит), имя игры. node scripts/wire-tower.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const sub = (f, pairs) => {
  let s = readFileSync(P + f, 'utf8');
  for (const [a, b] of pairs) { if (s.includes(b.split('\n')[0]) && !a) continue; if (!s.includes(a)) console.log('MISS', f, a.slice(0, 50)); s = s.split(a).join(b); }
  writeFileSync(P + f, s, 'utf8'); console.log('ok', f);
};

sub('main.tsx', [
  ["import Plinko from './pages/Plinko';", "import Plinko from './pages/Plinko';\nimport Tower from './pages/Tower';"],
  ['plinko: <Plinko />,', 'tower: <Tower />, plinko: <Plinko />,'],
]);

sub('pages/Home.tsx', [
  ["  { k: 'crash', t: 'Ракета', d: 'Забрать до взрыва', e: 'rocket', a: '#8b5cff', b: '#2c1466', tag: 'ТОП' },",
   "  { k: 'tower', t: 'Tower', d: 'Лезь на вершину башни — до ×6000', e: 'kong', a: '#7ed321', b: '#1f4d0c', tag: 'ХИТ' },\n  { k: 'crash', t: 'Ракета', d: 'Забрать до взрыва', e: 'rocket', a: '#8b5cff', b: '#2c1466', tag: 'ТОП' },"],
]);

sub('lib/api.ts', [
  ["crash: 'Ракета',", "tower: 'Tower', crash: 'Ракета',"],
]);
