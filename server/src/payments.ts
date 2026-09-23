// Пополнения: Telegram Stars, CryptoBot, TON-кошелёк, СБП.
// Ключей нет — способ выключен и не показывается игроку. Курсы меняются в админке.
import { createHash, createHmac } from 'node:crypto';
import { cfg } from './config.ts';
import { db, tx, now, getSetting } from './db.ts';
import { move, pushBalance, HttpError } from './wallet.ts';
import { createInvoice as starsInvoice } from './bot.ts';

export const pay = {
  cryptoBotToken: process.env.CRYPTOBOT_TOKEN ?? '',
  cryptoBotAssets: (process.env.CRYPTOBOT_ASSETS ?? 'USDT,TON').split(',').map(s => s.trim()).filter(Boolean),
  tonWallet: process.env.TON_WALLET ?? '',
  toncenterKey: process.env.TONCENTER_API_KEY ?? '',
  sbpUrl: process.env.SBP_API_URL ?? '',
  sbpKey: process.env.SBP_API_KEY ?? '',
  sbpSecret: process.env.SBP_WEBHOOK_SECRET ?? '',
};

export type Method = { id: string; title: string; note: string; enabled: boolean; rate: number; unit: string };
export function methods(): Method[] {
  return [
    { id: 'stars', title: 'Telegram Stars', note: 'Оплата прямо в Telegram', enabled: !!cfg.botToken, rate: 1, unit: '★' },
    { id: 'cryptobot', title: 'CryptoBot', note: pay.cryptoBotAssets.join(' · '), enabled: !!pay.cryptoBotToken, rate: getSetting('rate_usdt'), unit: 'USDT' },
    { id: 'ton', title: 'TON-кошелёк', note: 'Перевод из Telegram Wallet', enabled: !!pay.tonWallet, rate: getSetting('rate_ton'), unit: 'TON' },
    { id: 'sbp', title: 'СБП', note: 'Перевод по QR или ссылке', enabled: !!(pay.sbpUrl && pay.sbpKey), rate: getSetting('rate_rub'), unit: '₽' },
  ];
}

/** Идемпотентное зачисление: повторный вебхук с тем же id ничего не сделает. */
export function credit(userId: number, stars: number, chargeId: string, kind = 'deposit') {
  if (!Number.isInteger(stars) || stars <= 0) return false;
  const done = tx(() => {
    const r = db.prepare('INSERT OR IGNORE INTO payments(charge_id,user_id,amount,created_at) VALUES(?,?,?,?)')
      .run(chargeId, userId, stars, now());
    if (Number(r.changes) === 0) return false;
    move(userId, stars, kind, chargeId);
    return true;
  });
  if (done) pushBalance(userId);
  return done;
}

// ---------- CryptoBot (Crypto Pay API) ----------
async function cbApi(method: string, body: object = {}) {
  const r = await fetch(`https://pay.crypt.bot/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Crypto-Pay-API-Token': pay.cryptoBotToken },
    body: JSON.stringify(body),
  });
  const j: any = await r.json();
  if (!j.ok) throw new HttpError(502, `CryptoBot: ${j.error?.name ?? 'ошибка'}`);
  return j.result;
}

/** amount — в звёздах; пересчитываем в актив по курсу из админки. */
export async function cryptoBotInvoice(userId: number, stars: number, asset = 'USDT') {
  if (!pay.cryptoBotToken) throw new HttpError(400, 'CryptoBot не подключён');
  if (!pay.cryptoBotAssets.includes(asset)) throw new HttpError(400, 'Монета недоступна');
  const rate = asset === 'TON' ? getSetting('rate_ton') : getSetting('rate_usdt');
  const amount = (stars / rate).toFixed(asset === 'TON' ? 4 : 2);
  const inv = await cbApi('createInvoice', {
    asset, amount, description: `${stars} звёзд на баланс BitKong`,
    payload: JSON.stringify({ u: userId, s: stars }), allow_comments: false, expires_in: 1800,
  });
  return { link: inv.bot_invoice_url ?? inv.pay_url, amount, asset, stars };
}

/** Подпись вебхука: HMAC-SHA256(SHA256(token)) от тела запроса. */
export function cryptoBotVerify(raw: string, signature?: string) {
  if (!signature) return false;
  const secret = createHash('sha256').update(pay.cryptoBotToken).digest();
  return createHmac('sha256', secret).update(raw).digest('hex') === signature;
}

export function cryptoBotWebhook(update: any) {
  if (update?.update_type !== 'invoice_paid') return;
  const inv = update.payload;
  const p = JSON.parse(inv.payload || '{}');
  if (!p.u || !p.s) return;
  credit(Number(p.u), Number(p.s), `cb:${inv.invoice_id}`);
}

// ---------- TON: перевод на кошелёк с комментарием ----------
export function tonDeposit(userId: number, stars: number) {
  if (!pay.tonWallet) throw new HttpError(400, 'TON-кошелёк не подключён');
  const rate = getSetting('rate_ton');
  const amount = (stars / rate).toFixed(4);
  const comment = `bk${userId}`;
  return {
    address: pay.tonWallet, amount, comment, stars,
    link: `ton://transfer/${pay.tonWallet}?amount=${Math.round(Number(amount) * 1e9)}&text=${comment}`,
  };
}

/** Опрос входящих переводов (toncenter). Комментарий bk<userId> определяет игрока. */
async function tonPoll() {
  try {
    const url = `https://toncenter.com/api/v2/getTransactions?address=${pay.tonWallet}&limit=30`
      + (pay.toncenterKey ? `&api_key=${pay.toncenterKey}` : '');
    const j: any = await (await fetch(url)).json();
    if (!j.ok) return;
    const rate = getSetting('rate_ton');
    for (const t of j.result) {
      const inMsg = t.in_msg;
      if (!inMsg?.value || Number(inMsg.value) <= 0) continue;
      const comment = String(inMsg.message ?? '').trim();
      const m = /^bk(\d+)$/.exec(comment);
      if (!m) continue;
      const stars = Math.floor((Number(inMsg.value) / 1e9) * rate);
      credit(Number(m[1]), stars, `ton:${t.transaction_id.hash}`);
    }
  } catch (e: any) { console.error('[ton]', e.message); }
}

// ---------- СБП: адаптер под эквайринг ----------
/** Создаёт платёж у провайдера. Формат запроса и ответа правим под конкретного эквайера. */
export async function sbpPayment(userId: number, stars: number) {
  if (!pay.sbpUrl || !pay.sbpKey) throw new HttpError(400, 'СБП не подключён');
  const rate = getSetting('rate_rub');
  const rub = (stars / rate).toFixed(2);
  const orderId = `bk-${userId}-${Date.now()}`;
  const r = await fetch(pay.sbpUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${pay.sbpKey}` },
    body: JSON.stringify({ order_id: orderId, amount: rub, currency: 'RUB', description: `${stars} звёзд BitKong`, metadata: { user_id: userId, stars } }),
  });
  const j: any = await r.json().catch(() => ({}));
  const link = j.payment_url ?? j.url ?? j.confirmation?.confirmation_url;
  if (!r.ok || !link) throw new HttpError(502, 'Эквайринг не вернул ссылку на оплату');
  return { link, rub, orderId, stars };
}

/** Вебхук провайдера. Секрет сверяем по заголовку, поля метаданных правим под провайдера. */
export function sbpWebhook(body: any, secretHeader?: string) {
  if (pay.sbpSecret && secretHeader !== pay.sbpSecret) throw new HttpError(403, 'Неверная подпись');
  const status = body?.status ?? body?.event;
  if (!['succeeded', 'success', 'paid', 'payment.succeeded'].includes(String(status))) return;
  const meta = body.metadata ?? body.object?.metadata ?? {};
  const userId = Number(meta.user_id), stars = Number(meta.stars);
  const id = body.id ?? body.object?.id ?? body.order_id;
  if (userId && stars && id) credit(userId, stars, `sbp:${id}`);
}

// ---------- общая точка входа ----------
export async function createDeposit(userId: number, stars: number, method: string, asset?: string) {
  const min = 1, max = 1_000_000;
  if (!Number.isInteger(stars) || stars < min || stars > max) throw new HttpError(400, 'Некорректная сумма');
  switch (method) {
    case 'stars': return { type: 'invoice', link: await starsInvoice(userId, stars) };
    case 'cryptobot': return { type: 'link', ...(await cryptoBotInvoice(userId, stars, asset || pay.cryptoBotAssets[0])) };
    case 'ton': return { type: 'ton', ...tonDeposit(userId, stars) };
    case 'sbp': return { type: 'link', ...(await sbpPayment(userId, stars)) };
    default: throw new HttpError(400, 'Неизвестный способ оплаты');
  }
}

export function startPayments() {
  if (pay.tonWallet) { tonPoll(); setInterval(tonPoll, 30000); console.log('[pay] TON включён'); }
  if (pay.cryptoBotToken) console.log('[pay] CryptoBot включён');
  if (pay.sbpUrl && pay.sbpKey) console.log('[pay] СБП включён');
}
