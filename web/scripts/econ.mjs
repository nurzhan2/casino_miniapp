// Курс, комиссия PvP, обнуление баланса. node scripts/econ.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const S = 'C:/Users/user/Projects/bitkong/server/src/';
const W = 'C:/Users/user/Projects/bitkong/web/src/';
const sub = (p, f, pairs, imp) => {
  let s = readFileSync(p + f, 'utf8');
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 48)); s = s.split(a).join(b); }
  if (imp && !s.includes(imp)) {
    const l = s.split('\n');
    const last = l.map((x, i) => x.startsWith('import ') ? i : -1).filter(i => i >= 0).pop();
    l.splice(last + 1, 0, imp); s = l.join('\n');
  }
  writeFileSync(p + f, s, 'utf8'); console.log('ok', f);
};

// Курс клиента: 1 звезда = 1.3 ₽, 1 TON = 100 ₽ → 77 звёзд. USDT по ~80 ₽ → 61 звезда.
sub(S, 'config.ts', [
  ['  rate_usdt: 75,             // звёзд за 1 USDT', '  rate_usdt: 61,             // звёзд за 1 USDT (~80 ₽ по курсу 1★ = 1.3 ₽)'],
  ['  rate_ton: 150,             // звёзд за 1 TON', '  rate_ton: 77,              // звёзд за 1 TON (100 ₽ по курсу 1★ = 1.3 ₽)'],
  ['  rate_rub: 0.75,            // звёзд за 1 ₽ (100 ₽ = 75★)', '  rate_rub: 0.77,            // звёзд за 1 ₽ (1★ = 1.3 ₽)'],
  ['  jackpot_countdown: 20,     // секунд после входа второго игрока',
   '  jackpot_countdown: 20,     // секунд после входа второго игрока\n  pvp_rake: 5,               // % комиссии владельца с банка PvP и Арены'],
]);

// Комиссия PvP берётся отдельной настройкой, а не общим RTP
sub(S, 'games/jackpot.ts', [
  ["  const payout = Math.floor(r.total * getSetting('rtp'));",
   "  const payout = Math.floor(r.total * (1 - getSetting('pvp_rake') / 100));   // владелец забирает свой процент с банка"],
]);

// Админ может задать баланс абсолютным числом (в том числе обнулить)
sub(S, 'index.ts', [
  [`app.post('/api/admin/balance', async (req: any) => {
  const id = num(req.body?.userId), delta = num(req.body?.delta);
  if (!Number.isInteger(delta) || delta === 0) throw new HttpError(400, 'Укажите сумму');
  tx(() => move(id, delta, 'admin', String(uid(req))));
  pushBalance(id);
  return { ok: true };
});`,
   `app.post('/api/admin/balance', async (req: any) => {
  const id = num(req.body?.userId);
  const u = db.prepare('SELECT balance FROM users WHERE id=?').get(id) as any;
  if (!u) throw new HttpError(404, 'Игрок не найден');
  // mode: 'set' — выставить баланс ровно (в том числе 0), иначе прибавить/убавить
  const delta = req.body?.mode === 'set' ? num(req.body?.value) - u.balance : num(req.body?.delta);
  if (!Number.isInteger(delta)) throw new HttpError(400, 'Укажите сумму');
  if (delta !== 0) tx(() => move(id, delta, 'admin', String(uid(req))));
  pushBalance(id);
  return { ok: true, balance: u.balance + delta };
});`],
]);

// Поля в админке
sub(W, 'pages/Admin.tsx', [
  ['<Num label="Таймер PvP/Арены, сек" value={cfg.jackpot_countdown} onChange={(v: number) => set(\'jackpot_countdown\', v)} />',
   `<Num label="Таймер PvP/Арены, сек" value={cfg.jackpot_countdown} onChange={(v: number) => set('jackpot_countdown', v)} />
        <Num label="Комиссия с банка PvP, %" value={cfg.pvp_rake} step={1} onChange={(v: number) => set('pvp_rake', v)} />

        <div className="font-display text-sm mt-4 mb-2">Курс пополнений</div>
        <Num label="Звёзд за 1 ₽" value={cfg.rate_rub} step={0.01} onChange={(v: number) => set('rate_rub', v)} />
        <Num label="Звёзд за 1 TON" value={cfg.rate_ton} step={1} onChange={(v: number) => set('rate_ton', v)} />
        <Num label="Звёзд за 1 USDT" value={cfg.rate_usdt} step={1} onChange={(v: number) => set('rate_usdt', v)} />`],
]);
