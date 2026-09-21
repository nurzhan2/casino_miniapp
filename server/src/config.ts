try { process.loadEnvFile(); } catch { /* no .env */ }

export const cfg = {
  port: Number(process.env.PORT ?? 8080),
  botToken: process.env.BOT_TOKEN ?? '',
  botUsername: process.env.BOT_USERNAME ?? '',
  publicUrl: (process.env.PUBLIC_URL ?? '').replace(/\/$/, ''),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  admins: (process.env.ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(Number),
  dev: process.env.DEV === '1',
  dbPath: process.env.DB_PATH ?? 'data/bitkong.db',
};

// Настройки, которые админ меняет из админки (хранятся в БД, это дефолты)
export const DEFAULTS = {
  rtp: 0.95,                 // возврат игроку; 1 - rtp = маржа
  min_bet: 10,
  max_bet: 100000,
  cashback_levels: [         // уровень по суммарному обороту, rate — % кэшбэка со ставки
    { wagered: 0, rate: 1 },
    { wagered: 10000, rate: 1.5 },
    { wagered: 50000, rate: 2 },
    { wagered: 200000, rate: 3 },
    { wagered: 1000000, rate: 4 },
    { wagered: 5000000, rate: 5 },
  ],
  ref_rate: 0.5,             // % с оборота приглашённого
  leader_prizes: [
    { place: 1, stars: 1000, gift: '' },
    { place: 2, stars: 500, gift: '' },
    { place: 3, stars: 250, gift: '' },
  ],
  jackpot_countdown: 20,     // секунд после входа второго игрока
};
export type Settings = typeof DEFAULTS;
export const SETTING_KEYS = Object.keys(DEFAULTS) as (keyof Settings)[];
