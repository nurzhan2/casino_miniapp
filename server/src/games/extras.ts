// Plinko, Рулетка, Кейсы, Апгрейд. Все таблицы выплат масштабируются под RTP из админки.
import { tx, getSetting } from '../db.ts';
import { nextRoll } from '../fair.ts';
import { placeBet, settleBet, HttpError, announceWin } from '../wallet.ts';

/** Множители по весам так, чтобы матожидание равнялось RTP. */
function scaleToRTP(items: { p: number; m: number }[], rtp: number) {
  const ev = items.reduce((s, i) => s + i.p * i.m, 0);
  const k = rtp / ev;
  return items.map(i => ({ ...i, m: Math.max(0, Math.floor(i.m * k * 100) / 100) }));
}
const pick = (items: { p: number }[], r: number) => {
  let acc = 0;
  for (let i = 0; i < items.length; i++) { acc += items[i].p; if (r < acc) return i; }
  return items.length - 1;
};

// ---------- Plinko ----------
const RISK = { low: 1.35, mid: 1.9, high: 2.7 } as const;
export type Risk = keyof typeof RISK;

function binomial(rows: number) {
  const out: number[] = [];
  let c = 1;
  for (let k = 0; k <= rows; k++) { out.push(c); c = (c * (rows - k)) / (k + 1); }
  const total = out.reduce((a, b) => a + b, 0);
  return out.map(v => v / total);
}

export function plinkoTable(rows: number, risk: Risk, rtp = getSetting('rtp')) {
  const probs = binomial(rows);
  const center = rows / 2;
  const raw = probs.map((p, i) => ({ p, m: Math.pow(RISK[risk], Math.abs(i - center)) }));
  return scaleToRTP(raw, rtp);
}

export function plinko(userId: number, amount: number, rows: number, risk: Risk) {
  if (![8, 12, 16].includes(rows)) throw new HttpError(400, 'Рядов может быть 8, 12 или 16');
  if (!(risk in RISK)) throw new HttpError(400, 'Неверный риск');
  const res = tx(() => {
    const id = placeBet(userId, 'plinko', amount, { rows, risk });
    const { values, proof } = nextRoll(userId, rows);
    const path = values.map(v => (v < 0.5 ? 0 : 1));          // 0 — влево, 1 — вправо
    const slot = path.reduce((a: number, b: number) => a + b, 0);
    const table = plinkoTable(rows, risk);
    const mult = table[slot].m;
    const payout = Math.floor(amount * mult);
    settleBet(id, payout, mult, { rows, risk, path, slot, proof });
    return { path, slot, multiplier: mult, payout, amount, table: table.map(t => t.m), proof };
  });
  announceWin(userId, 'plinko', amount, res.payout, res.multiplier);
  return res;
}

// ---------- Рулетка ----------
const WHEEL = [
  { p: 0.30, m: 1.2, label: '×1.2' },
  { p: 0.18, m: 1.5, label: '×1.5' },
  { p: 0.09, m: 2, label: '×2' },
  { p: 0.03, m: 5, label: '×5' },
  { p: 0.008, m: 20, label: '×20' },
  { p: 0.002, m: 50, label: '×50' },
];
export function rouletteTable(rtp = getSetting('rtp')) {
  const wins = scaleToRTP(WHEEL, rtp);
  const lose = 1 - wins.reduce((s, w) => s + w.p, 0);
  return [...wins, { p: lose, m: 0, label: 'мимо' }];
}

export function roulette(userId: number, amount: number) {
  const res = tx(() => {
    const id = placeBet(userId, 'roulette', amount);
    const { values, proof } = nextRoll(userId, 1);
    const table = rouletteTable();
    const idx = pick(table, values[0]);
    const mult = table[idx].m;
    const payout = Math.floor(amount * mult);
    settleBet(id, payout, mult, { idx, roll: values[0], proof });
    return { index: idx, label: table[idx].label, multiplier: mult, payout, amount, roll: values[0], table, proof };
  });
  announceWin(userId, 'roulette', amount, res.payout, res.multiplier);
  return res;
}

// ---------- Кейсы ----------
export const CASES = [
  { id: 'bronze', title: 'Бронзовый', price: 100, drops: [{ p: 0.5, m: 0.5 }, { p: 0.28, m: 1.2 }, { p: 0.15, m: 2 }, { p: 0.06, m: 4 }, { p: 0.01, m: 15 }] },
  { id: 'silver', title: 'Серебряный', price: 500, drops: [{ p: 0.46, m: 0.6 }, { p: 0.3, m: 1.3 }, { p: 0.15, m: 2.5 }, { p: 0.08, m: 5 }, { p: 0.01, m: 25 }] },
  { id: 'gold', title: 'Золотой', price: 2000, drops: [{ p: 0.42, m: 0.7 }, { p: 0.3, m: 1.4 }, { p: 0.18, m: 3 }, { p: 0.09, m: 6 }, { p: 0.01, m: 40 }] },
];
export const caseList = (rtp = getSetting('rtp')) =>
  CASES.map(c => ({ id: c.id, title: c.title, price: c.price, drops: scaleToRTP(c.drops, rtp) }));

export function openCase(userId: number, caseId: string) {
  const c = caseList().find(x => x.id === caseId);
  if (!c) throw new HttpError(404, 'Нет такого кейса');
  const res = tx(() => {
    const id = placeBet(userId, 'case', c.price, { case: caseId });
    const { values, proof } = nextRoll(userId, 1);
    const idx = pick(c.drops, values[0]);
    const mult = c.drops[idx].m;
    const payout = Math.floor(c.price * mult);
    settleBet(id, payout, mult, { case: caseId, idx, proof });
    return { case: c.id, index: idx, multiplier: mult, payout, amount: c.price, drops: c.drops.map(d => d.m), proof };
  });
  announceWin(userId, 'case', c.price, res.payout, res.multiplier);
  return res;
}

// ---------- Апгрейд ----------
export function upgrade(userId: number, amount: number, target: number) {
  const t = Math.floor(target * 100) / 100;
  if (!(t >= 1.2 && t <= 50)) throw new HttpError(400, 'Множитель от 1.2 до 50');
  const rtp = getSetting('rtp');
  const chance = rtp / t;
  const res = tx(() => {
    const id = placeBet(userId, 'upgrade', amount, { target: t });
    const { values, proof } = nextRoll(userId, 1);
    const win = values[0] < chance;
    const payout = win ? Math.floor(amount * t) : 0;
    settleBet(id, payout, win ? t : 0, { target: t, roll: values[0], proof });
    return { win, target: t, chance, multiplier: win ? t : 0, payout, amount, roll: values[0], proof };
  });
  announceWin(userId, 'upgrade', amount, res.payout, res.multiplier);
  return res;
}
