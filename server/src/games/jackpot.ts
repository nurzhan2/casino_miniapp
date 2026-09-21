// PvP (колесо) и Арена: общий банк, шанс победы = доля ставки в банке. Победитель забирает банк × RTP.
import { randomBytes } from 'node:crypto';
import { db, tx, getSetting, now } from '../db.ts';
import { sha256, roundFloat } from '../fair.ts';
import { placeBet, settleBet, HttpError, announceWin, pushBalance, displayName } from '../wallet.ts';
import { broadcast } from '../hub.ts';

export const KINDS = ['pvp', 'arena'] as const;
export type Kind = typeof KINDS[number];
const SPIN_MS = 7000, SHOW_MS = 4000, SOLO_REFUND_MS = 10 * 60 * 1000;

type P = { userId: number; name: string; photo: string | null; amount: number; betIds: number[]; color: string };
type Room = {
  kind: Kind; id: number; phase: 'waiting' | 'countdown' | 'spinning';
  seed: string; hash: string; players: Map<number, P>; total: number; endsAt: number;
  winner?: number; roll?: number; payout?: number; timer?: any;
};
const COLORS = ['#b6ff3b', '#ff3bd4', '#3bc9ff', '#ffb13b', '#8b5cff', '#ff5a5a', '#3bffb0', '#ffe03b', '#5a7dff', '#ff8a3b'];
const rooms = {} as Record<Kind, Room>;
const hist: Record<Kind, any[]> = { pvp: [], arena: [] };
let seq = (db.prepare("SELECT COUNT(*) c FROM bets WHERE game IN ('pvp','arena')").get() as any).c + 1000;

function fresh(kind: Kind): Room {
  const seed = randomBytes(32).toString('hex');
  return { kind, id: ++seq, phase: 'waiting', seed, hash: sha256(seed), players: new Map(), total: 0, endsAt: 0 };
}

export function jackpotState(kind: Kind) {
  const r = rooms[kind];
  return {
    kind, id: r.id, phase: r.phase, hash: r.hash, total: r.total, endsAt: r.endsAt, serverNow: now(),
    players: [...r.players.values()].map(p => ({ id: p.userId, name: p.name, photo: p.photo, amount: p.amount, color: p.color, chance: r.total ? p.amount / r.total : 0 })),
    winner: r.winner, roll: r.roll, payout: r.payout, seed: r.phase === 'spinning' ? r.seed : undefined,
    spinMs: SPIN_MS, history: hist[kind].slice(0, 10),
  };
}
const emit = (kind: Kind) => broadcast({ t: 'jackpot', state: jackpotState(kind) });

export function jackpotJoin(kind: Kind, userId: number, amount: number) {
  const r = rooms[kind];
  if (!r) throw new HttpError(404, 'Нет такой игры');
  if (r.phase === 'spinning') throw new HttpError(400, 'Раунд разыгрывается, подождите следующий');
  tx(() => {
    const betId = placeBet(userId, kind, amount, { round: r.id });
    const ex = r.players.get(userId);
    if (ex) { ex.amount += amount; ex.betIds.push(betId); }
    else {
      const u = db.prepare('SELECT username, first_name, photo_url FROM users WHERE id=?').get(userId) as any;
      r.players.set(userId, { userId, name: displayName(u), photo: u.photo_url, amount, betIds: [betId], color: COLORS[r.players.size % COLORS.length] });
    }
    r.total += amount;
  });
  if (r.players.size === 1 && r.phase === 'waiting') {
    clearTimeout(r.timer);
    r.timer = setTimeout(() => refundSolo(kind), SOLO_REFUND_MS);
  }
  if (r.players.size >= 2 && r.phase === 'waiting') {
    clearTimeout(r.timer);
    r.phase = 'countdown';
    r.endsAt = now() + getSetting('jackpot_countdown') * 1000;
    r.timer = setTimeout(() => spin(kind), r.endsAt - now());
  }
  emit(kind);
  return { ok: true, round: r.id };
}

function spin(kind: Kind) {
  const r = rooms[kind];
  const roll = roundFloat(r.seed, 'winner');
  let acc = 0, winner: P | undefined;
  for (const p of r.players.values()) { acc += p.amount / r.total; if (roll < acc) { winner = p; break; } }
  winner ??= [...r.players.values()].at(-1)!;
  const payout = Math.floor(r.total * getSetting('rtp'));
  tx(() => {
    for (const p of r.players.values())
      p.betIds.forEach((id, i) => {
        const win = p === winner && i === 0;
        settleBet(id, win ? payout : 0, win ? payout / p.amount : 0, { round: r.id, roll, total: r.total });
      });
  });
  r.phase = 'spinning'; r.winner = winner.userId; r.roll = roll; r.payout = payout;
  emit(kind);
  setTimeout(() => {
    pushBalance(winner!.userId);
    announceWin(winner!.userId, kind, winner!.amount, payout, Math.round((payout / winner!.amount) * 100) / 100);
    hist[kind].unshift({ id: r.id, winner: winner!.name, photo: winner!.photo, chance: winner!.amount / r.total, payout, total: r.total, players: r.players.size, seed: r.seed, at: now() });
    hist[kind].length = Math.min(hist[kind].length, 30);
  }, SPIN_MS);
  setTimeout(() => { rooms[kind] = fresh(kind); emit(kind); }, SPIN_MS + SHOW_MS);
}

function refundSolo(kind: Kind) {
  const r = rooms[kind];
  if (r.phase !== 'waiting' || r.players.size !== 1) return;
  const p = [...r.players.values()][0];
  tx(() => p.betIds.forEach(id => {
    const b = db.prepare('SELECT amount FROM bets WHERE id=?').get(id) as any;
    settleBet(id, b.amount, 1, { refund: 'no_opponent' });
  }));
  pushBalance(p.userId);
  rooms[kind] = fresh(kind);
  emit(kind);
}

export function startJackpots() {
  const open = db.prepare("SELECT id, amount FROM bets WHERE game IN ('pvp','arena') AND status='open'").all() as any[];
  tx(() => { for (const b of open) settleBet(b.id, b.amount, 1, { refund: 'restart' }); });
  for (const k of KINDS) rooms[k] = fresh(k);
}
