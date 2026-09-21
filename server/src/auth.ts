import { createHmac, timingSafeEqual } from 'node:crypto';
import { cfg } from './config.ts';

/** Проверка Telegram WebApp initData (подпись ботом). */
export function verifyInitData(initData: string, maxAgeSec = 86400) {
  if (!cfg.botToken) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const dcs = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(cfg.botToken).digest();
  const calc = createHmac('sha256', secret).update(dcs).digest('hex');
  if (calc.length !== hash.length || !timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > maxAgeSec) return null;
  const user = JSON.parse(p.get('user') ?? 'null');
  return user ? { user, startParam: p.get('start_param') } : null;
}

const sign = (s: string) => createHmac('sha256', cfg.sessionSecret).update(s).digest('base64url');

export function issueToken(userId: number, ttlSec = 7 * 86400) {
  const body = `${userId}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${body}.${sign(body)}`;
}

export function readToken(token?: string | null): number | null {
  if (!token) return null;
  const [id, exp, sig] = token.split('.');
  if (!id || !exp || !sig || sign(`${id}.${exp}`) !== sig) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return Number(id);
}
