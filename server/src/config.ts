try { process.loadEnvFile(); } catch { /* no .env */ }

export const cfg = {
  port: Number(process.env.PORT ?? 8080),
  botToken: process.env.BOT_TOKEN ?? '',
  botUsername: process.env.BOT_USERNAME ?? '',
  publicUrl: (process.env.PUBLIC_URL ?? '').replace(/\/$/, ''),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  admins: (process.env.ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(Number),
  testers: (process.env.TESTER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(Number),
  dev: process.env.DEV === '1',
  dbPath: process.env.DB_PATH ?? 'data/bitkong.db',
};

// ---------- Звания: 25 уровней, 5 рангов по 5 уровней ----------
// wagered — оборот для уровня, rate — % кэшбэка, stars — награда при достижении, gift — ключ от кейса
const TIER_RATE = [0.5, 1, 1.5, 2, 2.5];                  // Бронза, Серебро, Золото, Платина, Алмаз
const TIER_GIFT = ['friend', 'tiger', 'tiger', 'lord', 'lord'];
const round = (v: number, step: number) => Math.round(v / step) * step;
const RANKS = Array.from({ length: 25 }, (_, i) => {
  const level = i + 1, tier = Math.floor(i / 5), final = level % 5 === 0;
  const wagered = level === 1 ? 0 : round(1000 * Math.pow(1.6, level - 2), 500);
  const stars = level === 1 ? 0 : Math.max(10, round(wagered * (final ? 0.006 : 0.0025), 5));
  return { wagered, rate: TIER_RATE[tier], stars, gift: final ? TIER_GIFT[tier] : (level % 5 === 3 ? 'cub' : '') };
});

// Бесплатные кейсы: daily — раз в cooldownH часов с уровня minLevel; key — только по ключу.
// p — шанс в процентах (нормируется), stars — приз.
const FREE_CASES = [
  { id: 'cub', title: 'Тигрёнок', kind: 'daily', minLevel: 1, cooldownH: 24,
    drops: [{ p: 50, stars: 1 }, { p: 30, stars: 3 }, { p: 14, stars: 10 }, { p: 5, stars: 30 }, { p: 1, stars: 200 }] },
  { id: 'friend', title: 'Кейс друга', kind: 'key', minLevel: 1, cooldownH: 0,
    drops: [{ p: 45, stars: 10 }, { p: 30, stars: 25 }, { p: 17, stars: 50 }, { p: 7, stars: 150 }, { p: 1, stars: 1000 }] },
  { id: 'tiger', title: 'Тигр', kind: 'daily', minLevel: 15, cooldownH: 24,
    drops: [{ p: 45, stars: 10 }, { p: 30, stars: 30 }, { p: 17, stars: 80 }, { p: 7, stars: 250 }, { p: 1, stars: 2000 }] },
  { id: 'lord', title: 'Владыка джунглей', kind: 'daily', minLevel: 25, cooldownH: 24,
    drops: [{ p: 40, stars: 50 }, { p: 30, stars: 150 }, { p: 20, stars: 400 }, { p: 9, stars: 1200 }, { p: 1, stars: 10000 }] },
];

// Настройки, которые админ меняет из админки (хранятся в БД, это дефолты)
export const DEFAULTS = {
  rtp: 0.95,                 // возврат игроку; 1 - rtp = маржа
  min_bet: 10,
  max_bet: 100000,
  ranks: RANKS,
  free_cases: FREE_CASES,
  ref_key_wagered: 1000,     // приглашённый должен наиграть столько ★, чтобы пригласивший получил «Кейс друга»
  ref_rate: 0.5,             // % с оборота приглашённого
  leader_prizes: [
    { place: 1, stars: 1000, gift: '' },
    { place: 2, stars: 500, gift: '' },
    { place: 3, stars: 250, gift: '' },
  ],
  jackpot_countdown: 20,     // секунд после входа второго игрока
  pvp_rake: 5,               // % комиссии владельца с банка PvP и Арены
  rate_usdt: 61,             // звёзд за 1 USDT (~80 ₽ по курсу 1★ = 1.3 ₽)
  rate_ton: 77,              // звёзд за 1 TON (100 ₽ по курсу 1★ = 1.3 ₽)
  rate_rub: 0.77,            // звёзд за 1 ₽ (1★ = 1.3 ₽)
};
export type Settings = typeof DEFAULTS;
export const SETTING_KEYS = Object.keys(DEFAULTS) as (keyof Settings)[];
