// Подключение званий на сервере. node scripts/ranks-server.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const S = 'C:/Users/user/Projects/bitkong/server/src/';
const sub = (f, pairs) => {
  let s = readFileSync(S + f, 'utf8');
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 55)); s = s.split(a).join(b); }
  writeFileSync(S + f, s, 'utf8'); console.log('ok', f);
};

sub('wallet.ts', [
  ["import { REF_MIN_WAGERED } from './guard.ts';", "import { REF_MIN_WAGERED } from './guard.ts';\nimport { onWager, rankName } from './ranks.ts';"],
  ["  const levels = getSetting('cashback_levels');", "  const levels = getSetting('ranks') as any[];"],
  // награды за уровни и ключ рефереру — до обновления оборота, пока u.wagered старый
  ["  move(userId, -amount, 'bet', game);\n  const { rate } = levelFor(u.wagered);",
   "  move(userId, -amount, 'bet', game);\n  onWager(u, amount);\n  const { rate } = levelFor(u.wagered);"],
  ["    level: { index: lv.index, rate: lv.rate, next: lv.next }, levels: lv.levels,",
   "    level: { index: lv.index, rate: lv.rate, next: lv.next, name: rankName(lv.index), from: lv.levels[lv.index - 1]?.wagered ?? 0 },"],
]);

sub('index.ts', [
  ["import { towerState, towerTable, towerStart, towerStep, towerCashout } from './games/tower.ts';",
   "import { towerState, towerTable, towerStart, towerStep, towerCashout } from './games/tower.ts';\nimport { ranksState, openFreeCase } from './ranks.ts';"],
  ["// ---------- Tower ----------",
   `// ---------- Звания и бесплатные кейсы ----------
app.get('/api/ranks', async req => ranksState(uid(req)));
app.post('/api/ranks/open', async (req: any) => { const r = openFreeCase(uid(req), String(req.body?.case)); pushBalance(uid(req)); return r; });

// ---------- Tower ----------`],
]);
