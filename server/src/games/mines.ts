import { db, tx, getSetting } from '../db.ts';
import { nextRoll } from '../fair.ts';
import { placeBet, settleBet, HttpError, announceWin } from '../wallet.ts';

const SIZES = [3, 5, 7];

/** Множитель после k открытых безопасных клеток: RTP / P(k подряд безопасных). */
export function minesMultiplier(n: number, m: number, k: number, rtp: number) {
  if (k === 0) return 1;
  let p = 1;
  for (let i = 0; i < k; i++) p *= (n - m - i) / (n - i);
  return Math.floor((rtp / p) * 100) / 100;
}

function active(userId: number) {
  const b = db.prepare("SELECT * FROM bets WHERE user_id=? AND game='mines' AND status='open' ORDER BY id DESC LIMIT 1")
    .get(userId) as any;
  return b ? { ...b, meta: JSON.parse(b.meta) } : null;
}

function view(b: any, finished = false) {
  const { size, mines, revealed, minePos, proof, rtp } = b.meta;
  const n = size * size;
  return {
    id: b.id, amount: b.amount, size, mines, revealed,
    multiplier: minesMultiplier(n, mines, revealed.length, rtp),
    next: revealed.length < n - mines ? minesMultiplier(n, mines, revealed.length + 1, rtp) : null,
    status: finished ? b.status : 'open',
    minePos: finished ? minePos : undefined,
    payout: finished ? b.payout : undefined,
    proof,
  };
}

export function minesState(userId: number) {
  const b = active(userId);
  return b ? view(b) : null;
}

export function minesStart(userId: number, amount: number, size: number, mines: number) {
  if (!SIZES.includes(size)) throw new HttpError(400, 'Поле 3×3, 5×5 или 7×7');
  const n = size * size;
  if (!Number.isInteger(mines) || mines < 1 || mines > n - 1) throw new HttpError(400, `Мин от 1 до ${n - 1}`);
  return tx(() => {
    if (active(userId)) throw new HttpError(400, 'Сначала закончите текущую игру');
    const id = placeBet(userId, 'mines', amount);
    const { values, proof } = nextRoll(userId, n);
    const cells = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) {           // Фишер–Йейтс по provably-fair числам
      const j = Math.floor(values[i] * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const meta = { size, mines, minePos: cells.slice(0, mines).sort((a, b) => a - b), revealed: [] as number[], proof, rtp: getSetting('rtp') };
    db.prepare('UPDATE bets SET meta=? WHERE id=?').run(JSON.stringify(meta), id);
    return view({ id, amount, status: 'open', meta });
  });
}

export function minesReveal(userId: number, cell: number) {
  const res = tx(() => {
    const b = active(userId);
    if (!b) throw new HttpError(400, 'Нет активной игры');
    const n = b.meta.size * b.meta.size;
    if (!Number.isInteger(cell) || cell < 0 || cell >= n || b.meta.revealed.includes(cell)) throw new HttpError(400, 'Неверная клетка');
    if (b.meta.minePos.includes(cell)) {
      b.meta.hit = cell;
      settleBet(b.id, 0, 0, b.meta);
      return { ...view({ ...b, status: 'lost', payout: 0 }, true), hit: cell };
    }
    b.meta.revealed.push(cell);
    if (b.meta.revealed.length === n - b.meta.mines) return finish(b);   // всё открыто — авто-кэшаут
    db.prepare('UPDATE bets SET meta=? WHERE id=?').run(JSON.stringify(b.meta), b.id);
    return view(b);
  });
  if ((res as any).payout) announceWin(userId, 'mines', res.amount, (res as any).payout, res.multiplier);
  return res;
}

function finish(b: any) {
  const n = b.meta.size * b.meta.size;
  const mult = minesMultiplier(n, b.meta.mines, b.meta.revealed.length, b.meta.rtp);
  const payout = Math.floor(b.amount * mult);
  settleBet(b.id, payout, mult, b.meta);
  return view({ ...b, status: 'won', payout }, true);
}

export function minesCashout(userId: number) {
  const res = tx(() => {
    const b = active(userId);
    if (!b) throw new HttpError(400, 'Нет активной игры');
    if (b.meta.revealed.length === 0) throw new HttpError(400, 'Откройте хотя бы одну клетку');
    return finish(b);
  });
  announceWin(userId, 'mines', res.amount, res.payout!, res.multiplier);
  return res;
}
