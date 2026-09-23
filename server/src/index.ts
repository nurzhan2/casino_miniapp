import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fstatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { cfg, SETTING_KEYS } from './config.ts';
import { db, tx, now, setSetting, allSettings } from './db.ts';
import { verifyInitData, issueToken, readToken } from './auth.ts';
import { HttpError, upsertUser, me, claimCashback, move, pushBalance, liveFeed, displayName } from './wallet.ts';
import { rotateSeed } from './fair.ts';
import { addSocket, online } from './hub.ts';
import { minesStart, minesReveal, minesCashout, minesState } from './games/mines.ts';
import { coinflip, coinflipOdds } from './games/coinflip.ts';
import { crashBet, crashCashout, crashState, startCrash } from './games/crash.ts';
import { jackpotJoin, jackpotState, startJackpots, KINDS } from './games/jackpot.ts';
import type { Kind } from './games/jackpot.ts';
import { leaders, awardLeaders } from './leaders.ts';
import { createInvoice, handleUpdate, startBot } from './bot.ts';
import { createDeposit, methods, cryptoBotVerify, cryptoBotWebhook, sbpWebhook, startPayments } from './payments.ts';

const app = Fastify({ logger: { level: 'warn' } });
// сырое тело нужно для проверки подписи вебхука CryptoBot
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req: any, body: string, done) => {
  req.rawBody = body;
  try { done(null, body ? JSON.parse(body) : {}); } catch (e) { done(e as Error); }
});
await app.register(cors, { origin: true });
await app.register(websocket);

const webhookSecret = createHash('sha256').update('wh' + cfg.botToken).digest('hex').slice(0, 32);
const isAdmin = (id: number) => cfg.admins.includes(id);
const uid = (req: any): number => req.userId;
const num = (v: any) => Number(v);

app.setErrorHandler((err: any, _req, reply) => {
  const status = err instanceof HttpError ? err.status : err.statusCode ?? 500;
  if (status >= 500) console.error(err);
  reply.status(status).send({ error: status >= 500 ? 'Ошибка сервера' : err.message });
});

// Авторизация: всё под /api, кроме /api/auth и /api/public
app.addHook('preHandler', async (req: any) => {
  if (!req.url.startsWith('/api/') || req.url.startsWith('/api/auth') || req.url.startsWith('/api/public')) return;
  const id = readToken(String(req.headers.authorization ?? '').replace(/^Bearer /, ''));
  if (!id) throw new HttpError(401, 'Нужна авторизация');
  const u = db.prepare('SELECT banned FROM users WHERE id=?').get(id) as any;
  if (!u) throw new HttpError(401, 'Нужна авторизация');
  if (u.banned) throw new HttpError(403, 'Доступ закрыт');
  req.userId = id;
  if (req.url.startsWith('/api/admin') && !isAdmin(id)) throw new HttpError(403, 'Только для админа');
});

app.post('/api/auth', async (req: any) => {
  const { initData, devUser } = req.body ?? {};
  let user: any = null, startParam: string | null = null;
  const v = initData ? verifyInitData(initData) : null;
  if (v) ({ user, startParam } = v);
  else if (cfg.dev && devUser?.id) { user = devUser; startParam = devUser.startParam ?? null; }
  if (!user) throw new HttpError(401, 'Откройте приложение из Telegram');
  upsertUser(user, startParam);
  return { token: issueToken(user.id), me: me(user.id, isAdmin(user.id), cfg.botUsername) };
});

app.get('/api/public/config', async () => ({ dev: cfg.dev, bot: cfg.botUsername }));

// ---------- профиль / кошелёк ----------
app.get('/api/me', async req => me(uid(req), isAdmin(uid(req)), cfg.botUsername));
app.get('/api/history', async req => db.prepare('SELECT delta, kind, ref, created_at FROM ledger WHERE user_id=? ORDER BY id DESC LIMIT 50').all(uid(req)));
app.get('/api/bets', async req => db.prepare("SELECT id, game, amount, payout, multiplier, status, created_at FROM bets WHERE user_id=? AND status!='open' ORDER BY id DESC LIMIT 30").all(uid(req)));
app.get('/api/live', async () => ({ items: liveFeed(), online: online() }));
app.post('/api/cashback/claim', async req => { const s = claimCashback(uid(req)); pushBalance(uid(req)); return { claimed: s }; });
app.post('/api/fair/rotate', async (req: any) => rotateSeed(uid(req), req.body?.clientSeed));

app.post('/api/deposit', async (req: any) => {
  const amount = num(req.body?.amount);
  return createDeposit(uid(req), amount, String(req.body?.method ?? 'stars'), req.body?.asset);
});
app.get('/api/deposit/methods', async () => methods().filter(m => m.enabled));

// вебхуки платёжек
app.post('/pay/cryptobot', async (req: any, reply) => {
  if (!cryptoBotVerify(req.rawBody ?? '', req.headers['crypto-pay-api-signature'])) return reply.status(403).send({ error: 'bad signature' });
  cryptoBotWebhook(req.body);
  return { ok: true };
});
app.post('/pay/sbp', async (req: any) => {
  sbpWebhook(req.body, String(req.headers['x-webhook-secret'] ?? ''));
  return { ok: true };
});

app.post('/api/withdraw', async (req: any) => {
  const amount = num(req.body?.amount);
  if (!Number.isInteger(amount) || amount < 100) throw new HttpError(400, 'Вывод от 100 ⭐');
  tx(() => {
    move(uid(req), -amount, 'withdraw_hold');
    db.prepare('INSERT INTO withdrawals(user_id,amount,created_at) VALUES(?,?,?)').run(uid(req), amount, now());
  });
  pushBalance(uid(req));
  return { ok: true };
});

// ---------- игры ----------
app.get('/api/mines', async req => minesState(uid(req)));
app.post('/api/mines/start', async (req: any) => minesStart(uid(req), num(req.body?.amount), num(req.body?.size), num(req.body?.mines)));
app.post('/api/mines/reveal', async (req: any) => minesReveal(uid(req), num(req.body?.cell)));
app.post('/api/mines/cashout', async req => minesCashout(uid(req)));

app.get('/api/coinflip/odds', async () => coinflipOdds());
app.post('/api/coinflip', async (req: any) => coinflip(uid(req), num(req.body?.amount), req.body?.side));

app.get('/api/crash', async () => crashState());
app.post('/api/crash/bet', async (req: any) => crashBet(uid(req), num(req.body?.amount), req.body?.auto ? num(req.body.auto) : null));
app.post('/api/crash/cashout', async req => crashCashout(uid(req)));

const kind = (k: string): Kind => { if (!KINDS.includes(k as Kind)) throw new HttpError(404, 'Нет такой игры'); return k as Kind; };
app.get('/api/jackpot/:kind', async (req: any) => jackpotState(kind(req.params.kind)));
app.post('/api/jackpot/:kind/join', async (req: any) => jackpotJoin(kind(req.params.kind), uid(req), num(req.body?.amount)));

app.get('/api/leaders', async (req: any) => leaders(uid(req), req.query?.period === 'previous' ? 'previous' : 'current'));

// ---------- админка ----------
app.get('/api/admin/stats', async () => {
  const d = (sql: string) => (db.prepare(sql).get() as any);
  const since = now() - 86400_000;
  return {
    users: d('SELECT COUNT(*) c FROM users').c,
    online: online(),
    balances: d('SELECT COALESCE(SUM(balance),0) s FROM users').s,
    deposits: d('SELECT COALESCE(SUM(amount),0) s FROM payments').s,
    day: db.prepare("SELECT COALESCE(SUM(amount),0) wagered, COALESCE(SUM(payout),0) paid, COUNT(*) bets FROM bets WHERE created_at>=? AND status!='open'").get(since),
    total: d("SELECT COALESCE(SUM(amount),0) wagered, COALESCE(SUM(payout),0) paid FROM bets WHERE status!='open'"),
    byGame: db.prepare("SELECT game, COUNT(*) bets, SUM(amount) wagered, SUM(payout) paid FROM bets WHERE status!='open' GROUP BY game").all(),
    pendingWithdrawals: d("SELECT COUNT(*) c FROM withdrawals WHERE status='pending'").c,
  };
});
app.get('/api/admin/settings', async () => allSettings());
app.post('/api/admin/settings', async (req: any) => {
  for (const [k, v] of Object.entries(req.body ?? {})) {
    if (!SETTING_KEYS.includes(k as any)) throw new HttpError(400, `Неизвестная настройка ${k}`);
    if (k === 'rtp' && (typeof v !== 'number' || v < 0.5 || v > 0.99)) throw new HttpError(400, 'RTP от 0.5 до 0.99');
    setSetting(k as any, v);
  }
  return allSettings();
});
app.get('/api/admin/users', async (req: any) => {
  const q = String(req.query?.q ?? '').replace(/^@/, '');
  return db.prepare(`SELECT id, username, first_name, balance, wagered, cashback, banned, created_at FROM users
    WHERE ?='' OR username LIKE ? OR CAST(id AS TEXT)=? ORDER BY wagered DESC LIMIT 50`).all(q, `%${q}%`, q);
});
app.post('/api/admin/balance', async (req: any) => {
  const id = num(req.body?.userId), delta = num(req.body?.delta);
  if (!Number.isInteger(delta) || delta === 0) throw new HttpError(400, 'Укажите сумму');
  tx(() => move(id, delta, 'admin', String(uid(req))));
  pushBalance(id);
  return { ok: true };
});
app.post('/api/admin/ban', async (req: any) => {
  db.prepare('UPDATE users SET banned=? WHERE id=?').run(req.body?.banned ? 1 : 0, num(req.body?.userId));
  return { ok: true };
});
app.post('/api/admin/leaders/award', async (req: any) => awardLeaders(!!req.body?.current));
app.get('/api/admin/withdrawals', async () => db.prepare(`SELECT w.*, u.username, u.first_name FROM withdrawals w
  JOIN users u ON u.id=w.user_id ORDER BY w.status='pending' DESC, w.id DESC LIMIT 100`).all());
app.post('/api/admin/withdrawals/:id', async (req: any) => {
  const w = db.prepare('SELECT * FROM withdrawals WHERE id=?').get(num(req.params.id)) as any;
  if (!w || w.status !== 'pending') throw new HttpError(400, 'Заявка уже обработана');
  const approve = !!req.body?.approve;
  tx(() => {
    db.prepare('UPDATE withdrawals SET status=? WHERE id=?').run(approve ? 'paid' : 'rejected', w.id);
    if (!approve) move(w.user_id, w.amount, 'withdraw_return', String(w.id));
  });
  pushBalance(w.user_id);
  return { ok: true };
});

// ---------- dev ----------
if (cfg.dev) app.post('/api/dev/faucet', async req => { tx(() => move(uid(req), 5000, 'dev_faucet')); pushBalance(uid(req)); return { ok: true }; });

// ---------- WebSocket ----------
app.get('/ws', { websocket: true }, (socket: any, req: any) => {
  const id = readToken(req.query?.token);
  if (!id) { socket.close(4001, 'auth'); return; }
  addSocket(socket, id);
  socket.send(JSON.stringify({ t: 'crash', state: crashState() }));
  for (const k of KINDS) socket.send(JSON.stringify({ t: 'jackpot', state: jackpotState(k) }));
  socket.on('message', (m: any) => { if (String(m) === 'ping') socket.send('{"t":"pong"}'); });
});

// ---------- Telegram webhook ----------
app.post(`/tg/${webhookSecret}`, async (req: any) => { await handleUpdate(req.body).catch(e => console.error('[bot]', e.message)); return { ok: true }; });

// ---------- фронт (собранный web/dist) ----------
const dist = resolve(import.meta.dirname, '../../web/dist');
if (existsSync(dist)) {
  await app.register(fstatic, { root: dist });
  app.setNotFoundHandler((req, reply) => req.url.startsWith('/api') ? reply.status(404).send({ error: 'Not found' }) : reply.sendFile('index.html'));
}

startCrash();
startJackpots();
startPayments();
await app.listen({ port: cfg.port, host: '0.0.0.0' });
console.log(`BitKong server :${cfg.port}${cfg.dev ? ' [DEV]' : ''}`);
startBot(webhookSecret).catch(e => console.error('[bot]', e.message));
void displayName;
