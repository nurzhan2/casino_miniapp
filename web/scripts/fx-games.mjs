// Вызов эффектов выигрыша/проигрыша во всех играх. node scripts/fx-games.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/pages/';
const edit = (file, pairs, imp = "import { win as fxWin, lose as fxLose } from '../lib/fx';") => {
  let s = readFileSync(P + file, 'utf8');
  for (const [re, to] of pairs) { if (!re.test(s)) console.log('MISS', file, String(re).slice(0, 55)); s = s.replace(re, to); }
  if (imp && !s.includes(imp)) {
    const l = s.split('\n');
    const last = l.map((x, i) => x.startsWith('import ') ? i : -1).filter(i => i >= 0).pop();
    l.splice(last + 1, 0, imp);
    s = l.join('\n');
  }
  writeFileSync(P + file, s, 'utf8');
  console.log('ok', file);
};

// Ракета: забрал выигрыш / сгорела ставка
edit('Crash.tsx', [
  [/haptic\('success'\); toast\(`\+\$\{fmt\(r\.payout\)\}★ на ×\$\{r\.multiplier\}`\);/,
   "haptic('success'); fxWin(r.payout, r.multiplier, mine?.amount);"],
]);

// Мины
edit('Mines.tsx', [
  [/if \(r\.status === 'lost'\) haptic\('error'\);/, "if (r.status === 'lost') { haptic('error'); fxLose('Взрыв!'); }"],
  [/else if \(r\.status === 'won'\) \{ haptic\('success'\); toast\(`Все бананы собраны! \+\$\{fmt\(r\.payout\)\}★`\); refresh\(\); \}/,
   "else if (r.status === 'won') { haptic('success'); fxWin(r.payout, r.multiplier, r.amount); refresh(); }"],
  [/haptic\('success'\); toast\(`\+\$\{fmt\(r\.payout\)\}★ на ×\$\{r\.multiplier\}`\); refresh\(\);/,
   "haptic('success'); fxWin(r.payout, r.multiplier, r.amount); refresh();"],
]);

// Coinflip
edit('Coinflip.tsx', [
  [/if \(r\.payout > 0\) \{ haptic\('success'\); toast\(`\+\$\{fmt\(r\.payout\)\}★`\); \} else haptic\('error'\);/,
   "if (r.payout > 0) { haptic('success'); fxWin(r.payout, r.multiplier, amount); } else { haptic('error'); fxLose('Мимо'); }"],
]);

// Plinko
edit('Plinko.tsx', [
  [/if \(r\.payout > amount\) \{ haptic\('success'\); toast\(`\+\$\{fmt\(r\.payout\)\}★ на ×\$\{r\.multiplier\}`\); \}\s*\n\s*else haptic\('warning'\);/,
   "if (r.payout > amount) { haptic('success'); fxWin(r.payout, r.multiplier, amount); }\n      else haptic('warning');"],
]);

// Рулетка
edit('Roulette.tsx', [
  [/if \(r\.payout > 0\) \{ haptic\('success'\); toast\(`\+\$\{fmt\(r\.payout\)\}★`\); \} else haptic\('error'\);/,
   "if (r.payout > 0) { haptic('success'); fxWin(r.payout, r.multiplier, amount); } else { haptic('error'); fxLose('Мимо'); }"],
]);

// Кейсы
edit('Cases.tsx', [
  [/if \(r\.payout > c\.price\) \{ haptic\('success'\); toast\(`\+\$\{fmt\(r\.payout\)\}★ на ×\$\{r\.multiplier\}`\); \} else haptic\('warning'\);/,
   "if (r.payout > c.price) { haptic('success'); fxWin(r.payout, r.multiplier, c.price); } else haptic('warning');"],
]);

// Апгрейд
edit('Upgrade.tsx', [
  [/if \(r\.win\) \{ haptic\('success'\); toast\(`\+\$\{fmt\(r\.payout\)\}★`\); \} else haptic\('error'\);/,
   "if (r.win) { haptic('success'); fxWin(r.payout, r.target, amount); } else { haptic('error'); fxLose('Апгрейд не прошёл'); }"],
]);

// PvP и Арена: результат розыгрыша
edit('Jackpot.tsx', [
  [/const t = setTimeout\(\(\) => \{ setShowResult\(true\); haptic\(s\.winner === me\.id \? 'success' : 'warning'\); refresh\(\); \}, s\.spinMs\);/,
   `const t = setTimeout(() => {
      setShowResult(true);
      if (s.winner === me.id) { haptic('success'); fxWin(s.payout, undefined, my?.amount); }
      else { haptic('warning'); fxLose('Банк ушёл сопернику'); }
      refresh();
    }, s.spinMs);`],
]);
