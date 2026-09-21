// Provably fair: результат = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}:${round}`).
// Хэш serverSeed игрок видит заранее, сам seed раскрывается при смене сида.
import { createHmac, createHash, randomBytes } from 'node:crypto';
import { db } from './db.ts';

export const newSeed = () => randomBytes(32).toString('hex');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function floats(serverSeed: string, clientSeed: string, nonce: number, count: number): number[] {
  const out: number[] = [];
  let round = 0;
  while (out.length < count) {
    const h = createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:${round++}`).digest();
    for (let i = 0; i + 4 <= h.length && out.length < count; i += 4) out.push(h.readUInt32BE(i) / 2 ** 32);
  }
  return out;
}

/** Следующие случайные числа игрока (вызывать внутри tx). */
export function nextRoll(userId: number, count = 1) {
  const u = db.prepare('SELECT server_seed, client_seed, nonce FROM users WHERE id=?').get(userId) as any;
  db.prepare('UPDATE users SET nonce=nonce+1 WHERE id=?').run(userId);
  return {
    values: floats(u.server_seed, u.client_seed, u.nonce, count),
    proof: { serverSeedHash: sha256(u.server_seed), clientSeed: u.client_seed, nonce: u.nonce },
  };
}

/** Смена сида: раскрывает старый serverSeed, чтобы игрок мог проверить прошлые игры. */
export function rotateSeed(userId: number, clientSeed?: string) {
  const u = db.prepare('SELECT server_seed, client_seed FROM users WHERE id=?').get(userId) as any;
  const cs = (clientSeed || '').trim().slice(0, 64) || randomBytes(8).toString('hex');
  const ns = newSeed();
  db.prepare('UPDATE users SET server_seed=?, client_seed=?, nonce=0 WHERE id=?').run(ns, cs, userId);
  return { revealedServerSeed: u.server_seed, previousClientSeed: u.client_seed, serverSeedHash: sha256(ns), clientSeed: cs };
}

/** Случайное число для общих раундов (краш, PvP, арена) из сида раунда. */
export const roundFloat = (seed: string, tag: string) =>
  createHmac('sha256', seed).update(tag).digest().readUInt32BE(0) / 2 ** 32;
