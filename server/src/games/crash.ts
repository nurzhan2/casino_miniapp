// Ракета (краш): общий раунд для всех. Множитель m(t) = e^(K·t), точка краха из сида раунда.
import { randomBytes } from 'node:crypto';
import { db, tx, getSetting, now } from '../db.ts';
import { sha256, roundFloat } from '../fair.ts';
import { placeBet, settleBet, HttpError, announceWin, pushBalance, displayName } from '../wallet.ts';
import { broadcast } from '../hub.ts';

const BET_MS = 8000, END_MS = 4000, K = 0.00006, MAX_MULT = 10000;
export const mAt = (ms: number) => Math.floor(Math.exp(K * Math.max(0, ms)) * 100) / 100;

type CBet = { userId: number; name: string; photo: string | null; amount: number; betId: number; auto: number | null; cashed: number | null };
const R = {
  id: 0, phase: 'betting' as 'betting' | 'running' | 'crashed',
  seed: '', hash: '', crash: 1, startAt: 0, phaseEnd: 0,
  bets: new Map<number, CBet>(),
};
const history: { id: number; crash: number; seed: string }[] = [];
let ticker: any = null;

function crashPoint(seed: string) {
  const r = roundFloat(seed, 'crash');
  const rtp = getSetting('rtp');
  return Math.min(MAX_MULT, Math.max(1, Math.floor((100 * rtp) / (1 - r)) / 100)); // P(≥x) = RTP/x
}

const betsView = () => [...R.bets.values()].map(b => ({ id: b.userId, name: b.name, photo: b.photo, amount: b.amount, cashed: b.cashed }))
  .sort((a, b) => b.amount - a.amount);

export function crashState() {
  return {
    id: R.id, phase: R.phase, hash: R.hash, startAt: R.startAt, phaseEnd: R.phaseEnd, serverNow: now(),
    crash: R.phase === 'crashed' ? R.crash : undefined, seed: R.phase === 'crashed' ? R.seed : undefined,
    bets: betsView(), history: history.slice(0, 20).map(h => h.crash),
  };
}
const emit = () => broadcast({ t: 'crash', state: crashState() });

function newRound() {
  R.id++; R.phase = 'betting'; R.seed = randomBytes(32).toString('hex'); R.hash = sha256(R.seed);
  R.crash = crashPoint(R.seed); R.bets = new Map(); R.startAt = 0; R.phaseEnd = now() + BET_MS;
  emit();
  setTimeout(run, BET_MS);
}

function run() {
  R.phase = 'running'; R.startAt = now(); R.phaseEnd = 0;
  emit();
  const flightMs = Math.log(R.crash) / K;
  ticker = setInterval(autoCashouts, 50);
  setTimeout(crash, flightMs);
}

function autoCashouts() {
  const m = mAt(now() - R.startAt);
  for (const b of R.bets.values()) if (b.auto && !b.cashed && m >= b.auto && b.auto < R.crash) doCashout(b, b.auto);
}

function crash() {
  clearInterval(ticker);
  R.phase = 'crashed'; R.phaseEnd = now() + END_MS;
  tx(() => { for (const b of R.bets.values()) if (!b.cashed) settleBet(b.betId, 0, 0, { round: R.id, crash: R.crash }); });
  history.unshift({ id: R.id, crash: R.crash, seed: R.seed });
  history.length = Math.min(history.length, 50);
  emit();
  setTimeout(newRound, END_MS);
}

function doCashout(b: CBet, m: number) {
  const payout = Math.floor(b.amount * m);
  tx(() => settleBet(b.betId, payout, m, { round: R.id, crash: R.crash, cashed: m }));
  b.cashed = m;
  pushBalance(b.userId);
  announceWin(b.userId, 'crash', b.amount, payout, m);
  emit();
  return { payout, multiplier: m };
}

export function crashBet(userId: number, amount: number, auto?: number | null) {
  if (R.phase !== 'betting') throw new HttpError(400, 'Ставки принимаются до старта ракеты');
  if (R.bets.has(userId)) throw new HttpError(400, 'Вы уже в этом раунде');
  const a = auto && auto >= 1.01 ? Math.floor(auto * 100) / 100 : null;
  const betId = tx(() => placeBet(userId, 'crash', amount, { round: R.id, auto: a }));
  const u = db.prepare('SELECT username, first_name, photo_url FROM users WHERE id=?').get(userId) as any;
  R.bets.set(userId, { userId, name: displayName(u), photo: u.photo_url, amount, betId, auto: a, cashed: null });
  emit();
  return { ok: true, round: R.id };
}

export function crashCashout(userId: number) {
  const b = R.bets.get(userId);
  if (R.phase !== 'running' || !b || b.cashed) throw new HttpError(400, 'Нечего забирать');
  const m = mAt(now() - R.startAt);
  if (m >= R.crash) throw new HttpError(400, 'Ракета уже взорвалась');
  return doCashout(b, m);
}

export function startCrash() {
  // незакрытые ставки после рестарта сервера — возвращаем
  const open = db.prepare("SELECT id, amount FROM bets WHERE game='crash' AND status='open'").all() as any[];
  tx(() => { for (const b of open) settleBet(b.id, b.amount, 1, { refund: 'restart' }); });
  newRound();
}
