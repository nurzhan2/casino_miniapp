// Проверка званий: node scripts/smoke-ranks.mjs
const B = 'http://localhost:8787';
const call = async (t, p, b) => {
  const r = await fetch(B + p, { method: b ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p}: ${j.error}`);
  return j;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const id = 900000 + Math.floor(Math.random() * 9999), friendId = id + 50000;
const a = (await call('', '/api/auth', { devUser: { id, username: 'rank' + id } })).token;
const f = (await call('', '/api/auth', { devUser: { id: friendId, username: 'fr' + id, startParam: 'ref_' + id } })).token;
for (let i = 0; i < 4; i++) { await call(a, '/api/dev/faucet', {}); await call(f, '/api/dev/faucet', {}); }

let r = await call(a, '/api/ranks');
console.log('старт:', r.rank, 'ур', r.level, 'кэшбэк', r.rate + '%', '| кейсы:', r.cases.map(c => `${c.title}:${c.available ? 'доступен' : c.locked ? 'закрыт' : 'ждёт'}`).join(', '));
console.log('уровни 2-6:', r.levels.slice(1, 6).map(l => `${l.level}:${l.wagered}★→+${l.stars}${l.gift ? '+' + l.giftTitle : ''}`).join(' '));

// оборот 3000 через coinflip → уровни 2-3
const bal0 = (await call(a, '/api/me')).balance;
for (let i = 0; i < 6; i++) { await call(a, '/api/coinflip', { amount: 500, side: 'heads' }); await sleep(120); }
r = await call(a, '/api/ranks');
console.log('после 3000★ оборота: ур', r.level, r.rank, '| ключи:', r.cases.filter(c => c.keys).map(c => c.title + '×' + c.keys).join(', ') || 'нет');

// ежедневный кейс: первый раз ок, второй — перезарядка
const o1 = await call(a, '/api/ranks/open', { case: 'cub' });
console.log('Тигрёнок:', o1.stars + '★ via', o1.via);
try { await call(a, '/api/ranks/open', { case: 'cub' }); console.log('Тигрёнок 2: ОТКРЫЛСЯ (ключ с 3 ур)'); } catch (e) { console.log('Тигрёнок 2:', e.message); }
try { await call(a, '/api/ranks/open', { case: 'tiger' }); } catch (e) { console.log('Тигр:', e.message); }

// реферал наигрывает 1000 → пригласившему ключ «Кейс друга»
for (let i = 0; i < 3; i++) { await call(f, '/api/coinflip', { amount: 400, side: 'tails' }); await sleep(120); }
r = await call(a, '/api/ranks');
const fr = r.cases.find(c => c.id === 'friend');
console.log('Кейс друга: ключей', fr.keys, 'доступен', fr.available);
if (fr.available) { const o = await call(a, '/api/ranks/open', { case: 'friend' }); console.log('открыл Кейс друга:', o.stars + '★'); }

// EV кейсов
for (const c of r.cases) console.log(c.title, 'EV', c.drops.reduce((s, d) => s + d.p * d.stars, 0).toFixed(2) + '★');
