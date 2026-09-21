// Telegram Bot API: пополнение звёздами (XTR), /start с кнопкой Mini App, webhook или long polling
import { cfg } from './config.ts';
import { db, tx, now } from './db.ts';
import { move, pushBalance } from './wallet.ts';

export async function tg(method: string, body: object = {}) {
  const r = await fetch(`https://api.telegram.org/bot${cfg.botToken}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const j: any = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}

export const createInvoice = (userId: number, amount: number) => tg('createInvoiceLink', {
  title: `${amount} ⭐ на баланс BitKong`,
  description: 'Пополнение игрового баланса',
  payload: `dep:${userId}`,
  currency: 'XTR',
  prices: [{ label: 'Stars', amount }],
});

export async function handleUpdate(u: any) {
  if (u.pre_checkout_query) {
    await tg('answerPreCheckoutQuery', { pre_checkout_query_id: u.pre_checkout_query.id, ok: true });
    return;
  }
  const m = u.message;
  if (!m) return;
  if (m.successful_payment) {
    const sp = m.successful_payment;
    const userId = Number(String(sp.invoice_payload).split(':')[1]);
    const credited = tx(() => {
      const r = db.prepare('INSERT OR IGNORE INTO payments(charge_id,user_id,amount,created_at) VALUES(?,?,?,?)')
        .run(sp.telegram_payment_charge_id, userId, sp.total_amount, now());
      if (Number(r.changes) === 0) return false; // повтор — уже зачислено
      move(userId, sp.total_amount, 'deposit', sp.telegram_payment_charge_id);
      return true;
    });
    if (credited) pushBalance(userId);
    return;
  }
  if (typeof m.text === 'string' && m.text.startsWith('/start') && cfg.publicUrl) {
    await tg('sendMessage', {
      chat_id: m.chat.id,
      text: '🦍 BitKong — игры на звёзды: Ракета, Мины, Coinflip, PvP и Арена.\nКэшбэк с каждой ставки и призы для топ-3 недели!',
      reply_markup: { inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: cfg.publicUrl } }]] },
    });
  }
}

export async function startBot(webhookSecret: string) {
  if (!cfg.botToken) { console.log('[bot] BOT_TOKEN не задан — бот выключен'); return; }
  const allowed = ['message', 'pre_checkout_query'];
  if (cfg.publicUrl) {
    await tg('setWebhook', { url: `${cfg.publicUrl}/tg/${webhookSecret}`, allowed_updates: allowed });
    console.log('[bot] webhook установлен');
    return;
  }
  await tg('deleteWebhook');
  console.log('[bot] long polling');
  let offset = 0;
  for (;;) {
    try {
      const ups = await tg('getUpdates', { offset, timeout: 30, allowed_updates: allowed });
      for (const up of ups) { offset = up.update_id + 1; await handleUpdate(up).catch(e => console.error('[bot]', e.message)); }
    } catch (e: any) {
      console.error('[bot] polling:', e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}
