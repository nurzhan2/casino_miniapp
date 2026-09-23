import { db, now, getSetting, tx } from './db.ts';
import { newSeed, sha256 } from './fair.ts';
import { toUser, broadcast } from './hub.ts';
import { randomBytes } from 'node:crypto';
import { REF_MIN_WAGERED } from './guard.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type TgUser = { id: number; username?: string; first_name?: string; photo_url?: string };

export function upsertUser(u: TgUser, startParam?: string | null) {
  const exists = db.prepare('SELECT id FROM users WHERE id=?').get(u.id);
  if (exists) {
    db.prepare('UPDATE users SET username=?, first_name=?, photo_url=? WHERE id=?')
      .run(u.username ?? null, u.first_name ?? null, u.photo_url ?? null, u.id);
    return;
  }
  let ref: number | null = null;
  const m = /^ref_(\d+)$/.exec(startParam ?? '');
  if (m && Number(m[1]) !== u.id && db.prepare('SELECT id FROM users WHERE id=?').get(Number(m[1]))) ref = Number(m[1]);
  db.prepare(`INSERT INTO users(id,username,first_name,photo_url,ref_by,server_seed,client_seed,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(u.id, u.username ?? null, u.first_name ?? null, u.photo_url ?? null, ref,
    newSeed(), randomBytes(8).toString('hex'), now());
}

export const displayName = (u: any) => (u?.username ? '@' + u.username : u?.first_name || 'Игрок');

export function getUser(id: number) {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id) as any;
  if (!u) throw new HttpError(401, 'Пользователь не найден');
  return u;
}

export function levelFor(wagered: number) {
  const levels = getSetting('cashback_levels');
  let i = 0;
  for (let k = 0; k < levels.length; k++) if (wagered >= levels[k].wagered) i = k;
  return { index: i + 1, rate: levels[i].rate, next: levels[i + 1] ?? null, levels };
}

/** Движение баланса с записью в журнал. Вызывать внутри tx. */
export function move(userId: number, delta: number, kind: string, ref?: string) {
  if (delta < 0) {
    const r = db.prepare('UPDATE users SET balance=balance+? WHERE id=? AND balance>=?').run(delta, userId, -delta);
    if (Number(r.changes) === 0) throw new HttpError(400, 'Недостаточно звёзд');
  } else if (delta > 0) {
    db.prepare('UPDATE users SET balance=balance+? WHERE id=?').run(delta, userId);
  }
  db.prepare('INSERT INTO ledger(user_id,delta,kind,ref,created_at) VALUES(?,?,?,?,?)')
    .run(userId, delta, kind, ref ?? null, now());
}

/** Ставка: списание + оборот + кэшбэк (выигрыш/проигрыш неважен) + реферальные. Внутри tx. */
export function placeBet(userId: number, game: string, amount: number, meta?: unknown): number {
  const min = getSetting('min_bet'), max = getSetting('max_bet');
  if (!Number.isInteger(amount) || amount < min || amount > max) throw new HttpError(400, `Ставка от ${min} до ${max} ⭐`);
  const u = getUser(userId);
  if (u.banned) throw new HttpError(403, 'Доступ закрыт');
  move(userId, -amount, 'bet', game);
  const { rate } = levelFor(u.wagered);
  const cb = Math.floor(amount * rate * 10); // amount * rate% * 1000 милли
  db.prepare('UPDATE users SET wagered=wagered+?, cashback=cashback+?, cashback_total=cashback_total+? WHERE id=?')
    .run(amount, cb, cb, userId);
  if (u.ref_by && u.wagered + amount >= REF_MIN_WAGERED) {   // защита от накрутки рефералами
    const rr = Math.floor(amount * getSetting('ref_rate') * 10);
    db.prepare('UPDATE users SET cashback=cashback+?, cashback_total=cashback_total+? WHERE id=?').run(rr, rr, u.ref_by);
  }
  const r = db.prepare('INSERT INTO bets(user_id,game,amount,status,meta,created_at) VALUES(?,?,?,?,?,?)')
    .run(userId, game, amount, 'open', meta ? JSON.stringify(meta) : null, now());
  return Number(r.lastInsertRowid);
}

/** Расчёт ставки. Внутри tx. */
export function settleBet(betId: number, payout: number, multiplier: number, meta?: unknown) {
  const b = db.prepare('SELECT user_id, status FROM bets WHERE id=?').get(betId) as any;
  if (!b || b.status !== 'open') throw new HttpError(400, 'Ставка уже рассчитана');
  db.prepare('UPDATE bets SET payout=?, multiplier=?, status=?, meta=COALESCE(?,meta) WHERE id=?')
    .run(payout, multiplier, payout > 0 ? 'won' : 'lost', meta ? JSON.stringify(meta) : null, betId);
  if (payout > 0) move(b.user_id, payout, 'win', String(betId));
}

export function claimCashback(userId: number) {
  return tx(() => {
    const u = getUser(userId);
    const whole = Math.floor(u.cashback / 1000);
    if (whole < 1) throw new HttpError(400, 'Накоплено меньше 1 ⭐');
    db.prepare('UPDATE users SET cashback=cashback-? WHERE id=?').run(whole * 1000, userId);
    move(userId, whole, 'cashback');
    return whole;
  });
}

export function pushBalance(userId: number) {
  const u = db.prepare('SELECT balance, cashback FROM users WHERE id=?').get(userId) as any;
  if (u) toUser(userId, { t: 'balance', balance: u.balance, cashback: u.cashback / 1000 });
}

/** Лента LIVE-выигрышей */
const live: any[] = [];
export function announceWin(userId: number, game: string, amount: number, payout: number, multiplier: number) {
  if (payout <= amount) return;
  const u = db.prepare('SELECT username, first_name, photo_url FROM users WHERE id=?').get(userId) as any;
  const item = { name: displayName(u), photo: u?.photo_url ?? null, game, amount, payout, multiplier, at: now() };
  live.unshift(item);
  live.length = Math.min(live.length, 30);
  broadcast({ t: 'live', item });
}
export const liveFeed = () => live;

export function me(userId: number, isAdmin: boolean, botUsername: string) {
  const u = getUser(userId);
  const lv = levelFor(u.wagered);
  return {
    id: u.id, name: displayName(u), photo: u.photo_url, balance: u.balance,
    cashback: u.cashback / 1000, cashbackTotal: u.cashback_total / 1000, wagered: u.wagered,
    level: { index: lv.index, rate: lv.rate, next: lv.next }, levels: lv.levels,
    refRate: getSetting('ref_rate'),
    refLink: botUsername ? `https://t.me/${botUsername}?startapp=ref_${u.id}` : `ref_${u.id}`,
    referrals: (db.prepare('SELECT COUNT(*) c FROM users WHERE ref_by=?').get(userId) as any).c,
    rtp: getSetting('rtp'), minBet: getSetting('min_bet'), maxBet: getSetting('max_bet'),
    fair: { serverSeedHash: sha256(u.server_seed), clientSeed: u.client_seed, nonce: u.nonce },
    isAdmin,
  };
}
