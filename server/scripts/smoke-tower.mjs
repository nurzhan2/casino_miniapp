// Проверка Tower: node scripts/smoke-tower.mjs
const B = 'http://localhost:8787';
const call = async (t, p, b) => {
  const r = await fetch(B + p, { method: b ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p}: ${j.error}`);
  return j;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tok = (await call('', '/api/auth', { devUser: { id: 77, username: 'towertest' } })).token;
for (let i = 0; i < 10; i++) await call(tok, '/api/dev/faucet', {});

for (const d of ['easy', 'medium', 'hard', 'extreme', 'nightmare']) console.log(d, (await call(tok, `/api/tower/table?diff=${d}`)).join(' '));

// одна игра вручную
let g = await call(tok, '/api/tower/start', { amount: 10, diff: 'easy' });
console.log('start: level', g.level, 'cols', g.cols, 'bad видно', g.bad.length);
g = await call(tok, '/api/tower/step', { col: 0 });
console.log('step:', g.status, 'level', g.level, 'mult', g.multiplier);
if (g.status === 'open') { g = await call(tok, '/api/tower/cashout', {}); console.log('cashout', g.payout); }

// фактический RTP: стратегия «пройти 2 ряда и забрать» на easy
let bet = 0, back = 0;
for (let i = 0; i < 400; i++) {
  await sleep(i % 8 === 0 ? 220 : 0);
  let s = await call(tok, '/api/tower/start', { amount: 10, diff: 'easy' }); bet += 10;
  for (let k = 0; k < 2 && s.status === 'open'; k++) s = await call(tok, '/api/tower/step', { col: Math.floor(Math.random() * 4) });
  if (s.status === 'open') s = await call(tok, '/api/tower/cashout', {});
  back += s.payout || 0;
}
console.log('факт RTP easy×2', (back / bet).toFixed(3));
