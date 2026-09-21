// Смоук-тест API в DEV-режиме: node scripts/smoke.mjs
const B = process.env.URL ?? 'http://localhost:8787';
const call = async (tok, path, body) => {
  const r = await fetch(B + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path}: ${j.error}`);
  return j;
};
const auth = async (id, username) => (await call('', '/api/auth', { devUser: { id, username, first_name: username } })).token;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (name, v) => console.log('✔', name, typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : v);

const a = await auth(1, 'admin'), b = await auth(2, 'player2');
await call(a, '/api/dev/faucet', {}); await call(b, '/api/dev/faucet', {});
ok('me', await call(a, '/api/me'));

let m = await call(a, '/api/mines/start', { amount: 100, size: 5, mines: 3 });
ok('mines start', m);
try { m = await call(a, '/api/mines/reveal', { cell: 0 }); ok('mines reveal', m); if (m.status === 'open') ok('mines cashout', await call(a, '/api/mines/cashout', {})); }
catch (e) { ok('mines', e.message); }

let net = 0;
for (let i = 0; i < 20; i++) { const r = await call(a, '/api/coinflip', { amount: 10, side: 'heads' }); net += r.payout - 10; }
ok('coinflip x20 net', net);

let st = await call(a, '/api/crash');
while (st.phase !== 'betting') { await sleep(500); st = await call(a, '/api/crash'); }
ok('crash bet', await call(a, '/api/crash/bet', { amount: 50, auto: 1.5 }));
await call(b, '/api/crash/bet', { amount: 70 });
while ((st = await call(a, '/api/crash')).phase !== 'running') await sleep(300);
await sleep(1500);
try { ok('crash cashout b', await call(b, '/api/crash/cashout', {})); } catch (e) { ok('crash b', e.message); }

ok('pvp a', await call(a, '/api/jackpot/pvp/join', { amount: 100 }));
ok('pvp b', await call(b, '/api/jackpot/pvp/join', { amount: 300 }));
ok('pvp state', await call(a, '/api/jackpot/pvp'));
ok('leaders', await call(a, '/api/leaders'));
ok('cashback', (await call(a, '/api/me')).cashback);
ok('claim', await call(a, '/api/cashback/claim', {}));
ok('admin stats', await call(a, '/api/admin/stats'));
try { await call(b, '/api/admin/stats'); console.log('✘ non-admin got admin'); } catch { ok('admin guard', 'ok'); }
