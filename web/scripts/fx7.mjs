import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const get = f => readFileSync(P + f, 'utf8');
const put = (f, s) => writeFileSync(P + f, s, 'utf8');
const sub = (f, pairs, imp) => {
  let s = get(f);
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 50)); s = s.split(a).join(b); }
  if (imp && !s.includes(imp)) {
    const l = s.split('\n');
    const last = l.map((x, i) => x.startsWith('import ') ? i : -1).filter(i => i >= 0).pop();
    l.splice(last + 1, 0, imp); s = l.join('\n');
  }
  put(f, s); console.log('ok', f);
};

// Плавные числа: банк PvP и множитель мин
sub('pages/Jackpot.tsx', [
  ['<div className="bg-moss rounded-full px-4 py-1.5 font-extrabold">Банк <Star /> {fmt(s.total)}</div>',
   '<div className="bg-moss rounded-full px-4 py-1.5 font-extrabold">Банк <Star /> <Num v={s.total} /></div>'],
], "import { Num, ConfirmSlide } from '../ui/bits';");

sub('pages/Mines.tsx', [
  ['right={g && <span className="text-sm font-extrabold text-lime">×{g.multiplier}</span>}',
   'right={g && <span className="text-sm font-extrabold text-lime">×<Num v={g.multiplier} fixed={2} /></span>}'],
], "import { Num } from '../ui/bits';");

// Крупная ставка подтверждается протягиванием
sub('pages/Jackpot.tsx', [
  [`        <button disabled={busy || spinning} onClick={join} className="btn-lime w-full h-14 text-lg">
          {spinning ? 'Розыгрыш…' : my ? \`Добавить \${fmt(amount)}★ (шанс \${Math.round(my.chance * 100)}%)\` : \`Сделать ставку \${fmt(amount)}★\`}
        </button>`,
   `        {amount >= 5000 && !spinning
          ? <ConfirmSlide label={\`Протяните, чтобы поставить \${fmt(amount)}★\`} onConfirm={join} />
          : <button disabled={busy || spinning} onClick={join} className="btn-lime w-full h-14 text-lg">
              {spinning ? 'Розыгрыш…' : my ? \`Добавить \${fmt(amount)}★ (шанс \${Math.round(my.chance * 100)}%)\` : \`Сделать ставку \${fmt(amount)}★\`}
            </button>}`],
]);

sub('pages/Crash.tsx', [
  [`          <button onClick={bet} disabled={s.phase !== 'betting' || busy} className="btn-lime w-full h-14 text-lg">`,
   `          amount >= 5000 && s.phase === 'betting'
          ? <ConfirmSlide label={\`Протяните, чтобы поставить \${fmt(amount)}★\`} onConfirm={bet} />
          : <button onClick={bet} disabled={s.phase !== 'betting' || busy} className="btn-lime w-full h-14 text-lg">`],
], "import { ConfirmSlide } from '../ui/bits';");
