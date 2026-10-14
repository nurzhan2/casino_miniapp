// Пачка UI-фиксов после прохода по интерфейсу. node scripts/ui-fixes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const sub = (f, pairs) => {
  let s = readFileSync(P + f, 'utf8');
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 60)); s = s.split(a).join(b); }
  writeFileSync(P + f, s, 'utf8'); console.log('ok', f);
};

// 1. Админка: поле суммы на всю ширину, кнопки сеткой под ним
sub('pages/Admin.tsx', [
  [`            <div className="flex gap-2 mt-1.5">
              <input value={delta[u.id] ?? ''} onChange={e => setDelta(d => ({ ...d, [u.id]: e.target.value }))} placeholder="±звёзды" className={cell} />`,
   `            <input value={delta[u.id] ?? ''} onChange={e => setDelta(d => ({ ...d, [u.id]: e.target.value }))} placeholder="Сумма, ★ (минус — списать)" className={cell + ' mt-1.5'} inputMode="numeric" />
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">`],
]);
let a = readFileSync(P + 'pages/Admin.tsx', 'utf8');
a = a.replace(/className="btn-ghost px-3 text-xs" onClick=\{\(\) => run\(\(\) => api\('\/api\/admin\/balance'/g, 'className="btn-ghost h-8 text-[11px]" onClick={() => run(() => api(\'/api/admin/balance\'');
a = a.replace(/className="btn-ghost px-3 text-xs" onClick=\{\(\) => confirm/g, 'className="btn-ghost h-8 text-[11px]" onClick={() => confirm');
a = a.replace(/className="btn-ghost px-3 text-xs" onClick=\{\(\) => run\(\(\) => api\('\/api\/admin\/ban'/g, 'className="btn-ghost h-8 text-[11px]" onClick={() => run(() => api(\'/api/admin/ban\'');
writeFileSync(P + 'pages/Admin.tsx', a, 'utf8');

// 2. Названия всех игр (история в профиле, статистика админки, LIVE-лента)
sub('lib/api.ts', [
  ["export const GAME_NAMES: Record<string, string> = {",
   "export const GAME_NAMES: Record<string, string> = { plinko: 'Plinko', roulette: 'Рулетка', case: 'Кейс', upgrade: 'Апгрейд',"],
]);

// 3. BitKong: «до следующего уровня» вместо процента, который может не измениться
sub('pages/BitKong.tsx', [
  ['{lv.next && <div className="text-xs text-white/50">ещё {fmt(lv.next.wagered - me.wagered)}★ до {lv.next.rate}%</div>}',
   '{lv.next && <div className="text-xs text-white/50">ещё {fmt(lv.next.wagered - me.wagered)}★ до {lv.index + 1} ур.</div>}'],
]);

// 4. Рулетка и Plinko: «выигрыш» только если выплата больше ставки
sub('pages/Roulette.tsx', [
  ["if (r.payout > 0) { haptic('success'); fxWin(r.payout, r.multiplier, amount); } else { haptic('error'); fxLose('Мимо'); }",
   "if (r.payout > amount) { haptic('success'); fxWin(r.payout, r.multiplier, amount); } else { haptic('error'); fxLose('Мимо'); }"],
]);
