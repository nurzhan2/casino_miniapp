// Звания и бесплатные кейсы: награды за уровни, ежедневные кейсы, ключи (за рефералов и уровни).
import { db, tx, now, getSetting } from './db.ts';
import { nextRoll } from './fair.ts';
import { move, HttpError, levelFor } from './wallet.ts';

export const TIERS = ['Бронза', 'Серебро', 'Золото', 'Платина', 'Алмаз'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
export const rankName = (level: number) => `${TIERS[Math.min(4, Math.floor((level - 1) / 5))]} ${ROMAN[(level - 1) % 5]}`;

db.exec(`
CREATE TABLE IF NOT EXISTS case_keys(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, case_id TEXT NOT NULL,
  source TEXT, created_at INTEGER NOT NULL, opened_at INTEGER
);
CREATE INDEX IF NOT EXISTS case_keys_user ON case_keys(user_id, case_id, opened_at);
CREATE TABLE IF NOT EXISTS free_opens(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, case_id TEXT NOT NULL,
  stars INTEGER NOT NULL, via TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS free_opens_user ON free_opens(user_id, case_id, created_at);
`);
try { db.exec('ALTER TABLE users ADD COLUMN ref_key_given INTEGER NOT NULL DEFAULT 0'); } catch { /* колонка уже есть */ }

const defs = () => getSetting('free_cases') as any[];
const caseTitle = (id: string) => defs().find(c => c.id === id)?.title ?? id;

export function giveKey(userId: number, caseId: string, source: string) {
  if (!caseId) return;
  db.prepare('INSERT INTO case_keys(user_id,case_id,source,created_at) VALUES(?,?,?,?)').run(userId, caseId, source, now());
}

/** Вызывается из placeBet внутри транзакции: награды за новые уровни и ключ рефереру. */
export function onWager(u: any, amount: number) {
  const before = levelFor(u.wagered).index, after = levelFor(u.wagered + amount).index;
  if (after > before) {
    const ranks = getSetting('ranks') as any[];
    for (let l = before + 1; l <= after; l++) {
      const r = ranks[l - 1];
      if (!r) continue;
      if (r.stars > 0) move(u.id, Math.floor(r.stars), 'rank_reward', String(l));
      if (r.gift) giveKey(u.id, r.gift, `rank_${l}`);
    }
  }
  const need = getSetting('ref_key_wagered');
  if (u.ref_by && !u.ref_key_given && u.wagered < need && u.wagered + amount >= need) {
    db.prepare('UPDATE users SET ref_key_given=1 WHERE id=?').run(u.id);
    giveKey(u.ref_by, 'friend', `ref_${u.id}`);
  }
}

function keysOf(userId: number, caseId: string) {
  return (db.prepare('SELECT COUNT(*) c FROM case_keys WHERE user_id=? AND case_id=? AND opened_at IS NULL').get(userId, caseId) as any).c as number;
}
function lastDaily(userId: number, caseId: string) {
  const r = db.prepare("SELECT created_at FROM free_opens WHERE user_id=? AND case_id=? AND via='daily' ORDER BY id DESC LIMIT 1").get(userId, caseId) as any;
  return r?.created_at ?? 0;
}
const normDrops = (drops: any[]) => {
  const total = drops.reduce((s, d) => s + Number(d.p), 0) || 1;
  return drops.map(d => ({ p: Number(d.p) / total, stars: Math.floor(Number(d.stars)) }));
};

export function ranksState(userId: number) {
  const u = db.prepare('SELECT wagered, ref_by FROM users WHERE id=?').get(userId) as any;
  const lv = levelFor(u.wagered);
  const ranks = getSetting('ranks') as any[];
  const t = now();
  return {
    level: lv.index, rank: rankName(lv.index), rate: lv.rate, wagered: u.wagered,
    from: ranks[lv.index - 1]?.wagered ?? 0, to: lv.next?.wagered ?? null,
    tiers: TIERS,
    levels: ranks.map((r, i) => ({
      level: i + 1, name: rankName(i + 1), wagered: r.wagered, rate: r.rate, stars: r.stars,
      gift: r.gift || null, giftTitle: r.gift ? caseTitle(r.gift) : null, reached: i + 1 <= lv.index,
    })),
    cases: defs().map(c => {
      const keys = keysOf(userId, c.id);
      const nextAt = c.kind === 'daily' ? lastDaily(userId, c.id) + c.cooldownH * 3600_000 : 0;
      const dailyOk = c.kind === 'daily' && lv.index >= c.minLevel && nextAt <= t;
      return {
        id: c.id, title: c.title, kind: c.kind, minLevel: c.minLevel, keys,
        available: keys > 0 || dailyOk,
        nextAt: c.kind === 'daily' && lv.index >= c.minLevel && !dailyOk ? nextAt : null,
        locked: c.kind === 'daily' && lv.index < c.minLevel && keys === 0,
        drops: normDrops(c.drops),
      };
    }),
    refKeyWagered: getSetting('ref_key_wagered'),
    serverNow: t,
  };
}

export function openFreeCase(userId: number, caseId: string) {
  return tx(() => {
    const c = defs().find(x => x.id === caseId);
    if (!c) throw new HttpError(404, 'Нет такого кейса');
    const u = db.prepare('SELECT wagered FROM users WHERE id=?').get(userId) as any;
    const level = levelFor(u.wagered).index;
    let via = '';
    const key = db.prepare('SELECT id FROM case_keys WHERE user_id=? AND case_id=? AND opened_at IS NULL ORDER BY id LIMIT 1').get(userId, caseId) as any;
    if (c.kind === 'daily' && level >= c.minLevel && lastDaily(userId, caseId) + c.cooldownH * 3600_000 <= now()) via = 'daily';
    else if (key) { via = 'key'; db.prepare('UPDATE case_keys SET opened_at=? WHERE id=?').run(now(), key.id); }
    else if (c.kind === 'daily' && level < c.minLevel) throw new HttpError(400, `Откроется с ${c.minLevel} уровня`);
    else if (c.kind === 'daily') throw new HttpError(400, 'Кейс ещё не перезарядился');
    else throw new HttpError(400, 'Нет ключа — пригласите друга, который поиграет');

    const drops = normDrops(c.drops);
    const { values, proof } = nextRoll(userId, 1);
    let acc = 0, idx = drops.length - 1;
    for (let i = 0; i < drops.length; i++) { acc += drops[i].p; if (values[0] < acc) { idx = i; break; } }
    const stars = drops[idx].stars;
    if (stars > 0) move(userId, stars, 'free_case', caseId);
    db.prepare('INSERT INTO free_opens(user_id,case_id,stars,via,created_at) VALUES(?,?,?,?,?)').run(userId, caseId, stars, via, now());
    return { case: caseId, index: idx, stars, via, drops, proof };
  });
}
