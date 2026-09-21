import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cfg, DEFAULTS } from './config.ts';
import type { Settings } from './config.ts';

mkdirSync(dirname(cfg.dbPath), { recursive: true });
export const db = new DatabaseSync(cfg.dbPath);

db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY,               -- telegram user id
  username TEXT, first_name TEXT, photo_url TEXT,
  balance INTEGER NOT NULL DEFAULT 0,   -- звёзды
  cashback INTEGER NOT NULL DEFAULT 0,  -- накопленный кэшбэк, милли-звёзды
  cashback_total INTEGER NOT NULL DEFAULT 0,
  wagered INTEGER NOT NULL DEFAULT 0,
  ref_by INTEGER, banned INTEGER NOT NULL DEFAULT 0,
  server_seed TEXT NOT NULL, client_seed TEXT NOT NULL, nonce INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
  delta INTEGER NOT NULL, kind TEXT NOT NULL, ref TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_user ON ledger(user_id, id);
CREATE TABLE IF NOT EXISTS bets(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, game TEXT NOT NULL,
  amount INTEGER NOT NULL, payout INTEGER NOT NULL DEFAULT 0, multiplier REAL,
  status TEXT NOT NULL, meta TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bets_user ON bets(user_id, id);
CREATE INDEX IF NOT EXISTS bets_time ON bets(created_at);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payments(
  charge_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS withdrawals(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS awards(
  id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT NOT NULL, place INTEGER NOT NULL,
  user_id INTEGER NOT NULL, stars INTEGER NOT NULL, gift TEXT, created_at INTEGER NOT NULL
);
`);

export const now = () => Date.now();

let depth = 0;
/** Атомарная транзакция (вложенные вызовы идут в одну транзакцию). */
export function tx<T>(fn: () => T): T {
  if (depth > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth++;
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    depth--;
  }
}

export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value: string } | undefined;
  return row ? JSON.parse(row.value) : DEFAULTS[key];
}
export function setSetting(key: keyof Settings, value: unknown) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
}
export function allSettings(): Settings {
  const out: any = {};
  for (const k of Object.keys(DEFAULTS)) out[k] = getSetting(k as keyof Settings);
  return out;
}
