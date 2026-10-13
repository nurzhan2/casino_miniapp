// Tower (башня BitKong): 9 рядов, в каждом ряду есть проигрышные ячейки, игрок лезет вверх.
import { db, tx, getSetting } from '../db.ts';
import { nextRoll } from '../fair.ts';
import { placeBet, settleBet, HttpError, announceWin } from '../wallet.ts';

export const ROWS = 9;
export const DIFF = {
  easy: { cols: 4, bad: 1, title: 'Лёгкий' },
  medium: { cols: 3, bad: 1, title: 'Средний' },
  hard: { cols: 2, bad: 1, title: 'Сложный' },
  extreme: { cols: 3, bad: 2, title: 'Экстрим' },
  nightmare: { cols: 4, bad: 3, title: 'Кошмар' },
} as const;
export type Diff = keyof typeof DIFF;

export const MAX_MULT = 10000;   // потолок выигрыша: на Кошмаре вершина иначе даёт ×249 000

/** Множитель после k пройденных рядов: RTP / (шанс пройти ряд)^k, не выше потолка */
export function towerMultiplier(d: Diff, k: number, rtp: number) {
  if (k === 0) return 1;
  const { cols, bad } = DIFF[d];
  const p = (cols - bad) / cols;
  return Math.min(MAX_MULT, Math.floor((rtp / Math.pow(p, k)) * 100) / 100);
}

export const towerTable = (d: Diff, rtp = getSetting('rtp')) =>
  [...Array(ROWS)].map((_, i) => towerMultiplier(d, i + 1, rtp));

function active(userId: number) {
  const b = db.prepare("SELECT * FROM bets WHERE user_id=? AND game='tower' AND status='open' ORDER BY id DESC LIMIT 1").get(userId) as any;
  return b ? { ...b, meta: JSON.parse(b.meta) } : null;
}

function view(b: any, finished = false) {
  const { diff, level, picks, bad, rtp, proof } = b.meta;
  return {
    id: b.id, amount: b.amount, diff, level, picks,
    cols: DIFF[diff as Diff].cols,
    multiplier: towerMultiplier(diff, level, rtp),
    next: level < ROWS ? towerMultiplier(diff, level + 1, rtp) : null,
    table: towerTable(diff, rtp),
    status: finished ? b.status : 'open',
    bad: finished ? bad : bad.slice(0, level),          // проигрышные ячейки видны только у пройденных рядов
    payout: finished ? b.payout : undefined,
    proof,
  };
}

export const towerState = (userId: number) => { const b = active(userId); return b ? view(b) : null; };

export function towerStart(userId: number, amount: number, diff: Diff) {
  if (!(diff in DIFF)) throw new HttpError(400, 'Неверная сложность');
  const { cols, bad: nBad } = DIFF[diff];
  return tx(() => {
    if (active(userId)) throw new HttpError(400, 'Сначала закончите текущую игру');
    const id = placeBet(userId, 'tower', amount, { diff });
    const { values, proof } = nextRoll(userId, ROWS * cols);
    const bad: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const c = [...Array(cols).keys()];
      for (let i = cols - 1; i > 0; i--) {                 // Фишер–Йейтс по provably-fair числам
        const j = Math.floor(values[r * cols + i] * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      bad.push(c.slice(0, nBad).sort((a, b) => a - b));
    }
    const meta = { diff, level: 0, picks: [] as number[], bad, rtp: getSetting('rtp'), proof };
    db.prepare('UPDATE bets SET meta=? WHERE id=?').run(JSON.stringify(meta), id);
    return view({ id, amount, status: 'open', meta });
  });
}

function finish(b: any) {
  const mult = towerMultiplier(b.meta.diff, b.meta.level, b.meta.rtp);
  const payout = Math.floor(b.amount * mult);
  settleBet(b.id, payout, mult, b.meta);
  return view({ ...b, status: 'won', payout }, true);
}

export function towerStep(userId: number, col: number) {
  const res = tx(() => {
    const b = active(userId);
    if (!b) throw new HttpError(400, 'Нет активной игры');
    const { cols } = DIFF[b.meta.diff as Diff];
    if (!Number.isInteger(col) || col < 0 || col >= cols) throw new HttpError(400, 'Неверная ячейка');
    const row = b.meta.level;
    b.meta.picks.push(col);
    if (b.meta.bad[row].includes(col)) {
      settleBet(b.id, 0, 0, b.meta);
      return { ...view({ ...b, status: 'lost', payout: 0 }, true), hit: { row, col } };
    }
    b.meta.level++;
    if (b.meta.level === ROWS) return finish(b);           // вершина — автоматический кэшаут
    db.prepare('UPDATE bets SET meta=? WHERE id=?').run(JSON.stringify(b.meta), b.id);
    return view(b);
  });
  if ((res as any).payout) announceWin(userId, 'tower', res.amount, (res as any).payout, res.multiplier);
  return res;
}

export function towerCashout(userId: number) {
  const res = tx(() => {
    const b = active(userId);
    if (!b) throw new HttpError(400, 'Нет активной игры');
    if (b.meta.level === 0) throw new HttpError(400, 'Пройдите хотя бы один ряд');
    return finish(b);
  });
  announceWin(userId, 'tower', res.amount, res.payout!, res.multiplier);
  return res;
}
