// Проверка новых игр и математики RTP: node scripts/smoke2.mjs
const B = 'http://localhost:8787';
const call = async (t, p, b) => {
  const r = await fetch(B + p, { method: b ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p}: ${j.error}`);
  return j;
};
const tok = (await call('', '/api/auth', { devUser: { id: 1, username: 'admin' } })).token;
for (let i = 0; i < 5; i++) await call(tok, '/api/dev/faucet', {});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const table = await call(tok, '/api/plinko/table?rows=12&risk=mid');
console.log('plinko table', table.map(t => t.m).join(' '), '| EV', table.reduce((s, t) => s + t.p * t.m, 0).toFixed(3));
console.log('plinko', await call(tok, '/api/plinko', { amount: 10, rows: 12, risk: 'mid' }));
const rt = await call(tok, '/api/roulette/table');
console.log('roulette EV', rt.reduce((s, t) => s + t.p * t.m, 0).toFixed(3));
console.log('roulette', (await call(tok, '/api/roulette', { amount: 10 })).label);
const cases = await call(tok, '/api/cases');
console.log('cases EV', cases.map(c => c.id + ':' + c.drops.reduce((s, d) => s + d.p * d.m, 0).toFixed(3)).join(' '));
console.log('case open', await call(tok, '/api/cases/open', { case: 'bronze' }));
console.log('upgrade', await call(tok, '/api/upgrade', { amount: 10, target: 3 }));

// фактический RTP на большой выборке
let bet = 0, back = 0;
for (let i = 0; i < 300; i++) { const r = await call(tok, '/api/plinko', { amount: 10, rows: 12, risk: 'mid' }); bet += 10; back += r.payout; }
console.log('plinko факт RTP', (back / bet).toFixed(3));

// лимит частоты
try { await Promise.all([...Array(40)].map(() => call(tok, '/api/roulette', { amount: 10 }))); console.log('rate limit НЕ сработал'); }
catch (e) { console.log('rate limit ok:', e.message.slice(0, 60)); }
await sleep(100);
