import { tx, getSetting } from '../db.ts';
import { nextRoll } from '../fair.ts';
import { placeBet, settleBet, HttpError, announceWin } from '../wallet.ts';

// Вероятности: орёл 47.5%, решка 47.5%, ребро 5%. Множитель = RTP / вероятность.
const P = { heads: 0.475, tails: 0.475, edge: 0.05 } as const;
type Side = keyof typeof P;

export function coinflipOdds(rtp = getSetting('rtp')) {
  return Object.fromEntries(Object.entries(P).map(([k, p]) => [k, Math.floor((rtp / p) * 100) / 100])) as Record<Side, number>;
}

export function coinflip(userId: number, amount: number, side: Side) {
  if (!(side in P)) throw new HttpError(400, 'Выберите сторону');
  const res = tx(() => {
    const id = placeBet(userId, 'coinflip', amount, { side });
    const { values, proof } = nextRoll(userId, 1);
    const r = values[0];
    const result: Side = r < P.heads ? 'heads' : r < P.heads + P.tails ? 'tails' : 'edge';
    const mult = result === side ? coinflipOdds()[side] : 0;
    const payout = Math.floor(amount * mult);
    settleBet(id, payout, mult, { side, result, roll: r, proof });
    return { id, side, result, multiplier: mult, payout, amount, proof };
  });
  announceWin(userId, 'coinflip', amount, res.payout, res.multiplier);
  return res;
}
