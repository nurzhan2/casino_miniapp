// Регистрация новых игр в роутере и на главной. node scripts/wire-games.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';

let m = readFileSync(P + 'main.tsx', 'utf8');
m = m.replace("import Admin from './pages/Admin';", `import Admin from './pages/Admin';
import Plinko from './pages/Plinko';
import Roulette from './pages/Roulette';
import Cases from './pages/Cases';
import Upgrade from './pages/Upgrade';`);
m = m.replace('leaders: <Leaders />', `plinko: <Plinko />, roulette: <Roulette />, cases: <Cases />, upgrade: <Upgrade />,
    leaders: <Leaders />`);
writeFileSync(P + 'main.tsx', m, 'utf8');

let h = readFileSync(P + 'pages/Home.tsx', 'utf8');
h = h.replace(/const SOLO = \[[\s\S]*?\];/, `const SOLO = [
  { k: 'crash', t: 'Ракета', d: 'Забрать до взрыва', e: 'rocket', a: '#8b5cff', b: '#2c1466', tag: 'ТОП' },
  { k: 'mines', t: 'Мины', d: 'Кристаллы против бомб', e: 'bomb', a: '#1fa2ff', b: '#0a3c69' },
  { k: 'coinflip', t: 'Coinflip', d: 'Орёл, решка или ребро', e: 'coin', a: '#ffb13b', b: '#7d3c0e' },
  { k: 'plinko', t: 'Plinko', d: 'Шарик ищет крупный множитель', e: 'gem', a: '#3bd4b0', b: '#0c5a49' },
  { k: 'roulette', t: 'Рулетка', d: 'До ×50 за один оборот', e: 'wheel', a: '#ff5a5a', b: '#7a1b1b' },
  { k: 'cases', t: 'Кейсы', d: 'Три кейса, редкие дропы', e: 'bag', a: '#c88cff', b: '#4a2470' },
  { k: 'upgrade', t: 'Апгрейд', d: 'Свой множитель и свой риск', e: 'glowstar', a: '#ffd43b', b: '#8a6100' },
];`);
writeFileSync(P + 'pages/Home.tsx', h, 'utf8');
console.log('wired');
