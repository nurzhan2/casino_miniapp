// Проверка админки через API: node scripts/smoke-admin.mjs
const B = 'http://localhost:8787';
const call = async (t, p, b) => {
  const r = await fetch(B + p, { method: b ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${p}: ${j.error}`);
  return j;
};
const adm = (await call('', '/api/auth', { devUser: { id: 1 } })).token;
const pl = (await call('', '/api/auth', { devUser: { id: 2, username: 'player2' } })).token;
const bal = async () => (await call(pl, '/api/me')).balance;

console.log('stats', Object.keys(await call(adm, '/api/admin/stats')).join(','));
console.log('до', await bal());
console.log('+500 →', (await call(adm, '/api/admin/balance', { userId: 2, delta: 500 })).balance, '| факт', await bal());
console.log('обнулить →', (await call(adm, '/api/admin/balance', { userId: 2, mode: 'set', value: 0 })).balance, '| факт', await bal());
console.log('выставить 10000 →', (await call(adm, '/api/admin/balance', { userId: 2, mode: 'set', value: 10000 })).balance);
await call(adm, '/api/admin/ban', { userId: 2, banned: true });
try { await call(pl, '/api/me'); console.log('БАН НЕ РАБОТАЕТ'); } catch (e) { console.log('бан ок:', e.message); }
await call(adm, '/api/admin/ban', { userId: 2, banned: false });
console.log('разбан ок, баланс', await bal());

const s = await call(adm, '/api/admin/settings');
console.log('настройки: ranks', s.ranks.length, 'free_cases', s.free_cases.length, 'rtp', s.rtp);
s.free_cases[0].drops[0].stars = 2;
const saved = await call(adm, '/api/admin/settings', s);
console.log('сохранение: Тигрёнок первый приз =', saved.free_cases[0].drops[0].stars);
s.free_cases[0].drops[0].stars = 1;
await call(adm, '/api/admin/settings', s);
try { await call(pl, '/api/admin/stats'); console.log('ДОСТУП НЕ ЗАКРЫТ'); } catch { console.log('не-админ не пускается: ок'); }
console.log('выводы', (await call(adm, '/api/admin/withdrawals')).length, '| игроки', (await call(adm, '/api/admin/users')).length);
