// Лидерборд недели по обороту + призы для 1-2-3 мест, которые задаёт админ
import { db, tx, getSetting, now } from './db.ts';
import { move, displayName, pushBalance, HttpError } from './wallet.ts';

/** Начало недели (понедельник 00:00 по Алматы/Москве ≈ UTC+5/UTC+3 — берём UTC+3). */
export function weekStart(offsetWeeks = 0, t = now()) {
  const TZ = 3 * 3600_000;
  const d = new Date(t + TZ);
  const day = (d.getUTCDay() + 6) % 7; // пн = 0
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day) - TZ;
  return start + offsetWeeks * 7 * 86400_000;
}
const periodKey = (start: number) => new Date(start + 3 * 3600_000).toISOString().slice(0, 10);

function top(from: number, to: number, limit: number) {
  return (db.prepare(`
    SELECT b.user_id id, SUM(b.amount) wagered, SUM(b.payout) won, COUNT(*) games,
           u.username, u.first_name, u.photo_url
    FROM bets b JOIN users u ON u.id=b.user_id
    WHERE b.created_at>=? AND b.created_at<? AND b.status!='open' AND (b.meta IS NULL OR b.meta NOT LIKE '%"refund"%')
    GROUP BY b.user_id ORDER BY wagered DESC LIMIT ?`).all(from, to, limit) as any[])
    .map((r, i) => ({ place: i + 1, id: r.id, name: displayName(r), photo: r.photo_url, wagered: r.wagered, won: r.won, games: r.games }));
}

export function leaders(userId: number, which: 'current' | 'previous' = 'current') {
  const from = weekStart(which === 'current' ? 0 : -1), to = from + 7 * 86400_000;
  const list = top(from, to, 50);
  const mine = list.find(r => r.id === userId) ?? null;
  const awarded = db.prepare('SELECT place, user_id, stars, gift FROM awards WHERE period=?').all(periodKey(from));
  return { period: periodKey(from), from, to, prizes: getSetting('leader_prizes'), list, mine, awarded };
}

/** Выдать призы за прошедшую неделю (или текущую, если current=true). Повторно не выдаёт. */
export function awardLeaders(current = false) {
  const from = weekStart(current ? 0 : -1), key = periodKey(from);
  const res = tx(() => {
    if (db.prepare('SELECT 1 FROM awards WHERE period=?').get(key)) throw new HttpError(400, `Призы за ${key} уже выданы`);
    const prizes = getSetting('leader_prizes');
    const list = top(from, from + 7 * 86400_000, prizes.length);
    const out: any[] = [];
    for (const p of prizes) {
      const w = list[p.place - 1];
      if (!w) continue;
      if (p.stars > 0) move(w.id, p.stars, 'leader_prize', key);
      db.prepare('INSERT INTO awards(period,place,user_id,stars,gift,created_at) VALUES(?,?,?,?,?,?)')
        .run(key, p.place, w.id, p.stars, p.gift || null, now());
      out.push({ place: p.place, user: w.name, id: w.id, stars: p.stars, gift: p.gift });
    }
    return out;
  });
  res.forEach(r => pushBalance(r.id));
  return { period: key, awarded: res };
}
