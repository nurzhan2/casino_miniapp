// Защита от накруток: лимит частоты запросов и условие на реферальные начисления.
import { HttpError } from './wallet.ts';

type Bucket = { n: number; reset: number };
const buckets = new Map<string, Bucket>();

/** Не больше `limit` запросов за `windowMs` по ключу. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < t) { buckets.set(key, { n: 1, reset: t + windowMs }); return; }
  if (++b.n > limit) throw new HttpError(429, 'Слишком часто — подождите пару секунд');
}

setInterval(() => { const t = Date.now(); for (const [k, b] of buckets) if (b.reset < t) buckets.delete(k); }, 60000).unref();

/** Реферальный бонус начисляется, только когда приглашённый отыграл этот оборот. */
export const REF_MIN_WAGERED = 1000;
