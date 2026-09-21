import { useApp } from '../lib/store';
import { fmt } from '../lib/api';

const PVP = [
  { k: 'pvp', t: 'PvP', d: 'Колесо на банк: чем больше ставка — тем больше шанс', ic: '🎡', bg: 'from-[#ff3bd4] to-[#7a1d8a]' },
  { k: 'arena', t: 'Арена', d: 'Шар решает, чья зона победит', ic: '💪', bg: 'from-[#5a7dff] to-[#2a2f8a]' },
];
const SOLO = [
  { k: 'crash', t: 'Ракета', d: 'Забери выигрыш до взрыва', ic: '🚀', bg: 'from-[#8b5cff] to-[#3b1d8a]', tag: 'ТОП' },
  { k: 'mines', t: 'Мины', d: 'Ищи бананы, обходи бомбы', ic: '💣', bg: 'from-[#1fa2ff] to-[#0b4f8a]' },
  { k: 'coinflip', t: 'Coinflip', d: 'Орёл, решка или ребро ×19', ic: '🪙', bg: 'from-[#ffb13b] to-[#a8541a]' },
];
const SOON = [['🎯', 'Plinko'], ['🎰', 'Рулетка'], ['🎁', 'Кейсы'], ['📈', 'Апгрейд']];

function Tile({ g, big }: { g: any; big?: boolean }) {
  const { go, jackpots, crash } = useApp();
  const jp = jackpots[g.k];
  const extra = g.k === 'crash' && crash?.history?.length ? `Последний: ×${crash.history[0]}`
    : jp ? (jp.players.length ? `Банк ${fmt(jp.total)}★ · игроков ${jp.players.length}` : 'Ждём игроков') : null;
  return (
    <button onClick={() => go(g.k)} className={`relative overflow-hidden text-left rounded-3xl p-4 bg-gradient-to-br ${g.bg} ${big ? 'h-36' : 'h-32'} active:scale-[.98] transition`}>
      <div className="absolute -right-3 -bottom-4 text-[88px] leading-none drop-shadow-2xl">{g.ic}</div>
      {g.tag && <span className="absolute top-3 right-3 text-[10px] font-black bg-banana text-jungle px-2 py-0.5 rounded-full">{g.tag}</span>}
      <div className="font-display text-xl relative">{g.t}</div>
      <div className={`text-[11px] text-white/80 mt-1 relative leading-snug line-clamp-2 ${big ? 'max-w-[85%]' : 'max-w-[60%]'}`}>{g.d}</div>
      {extra && <div className="absolute left-4 bottom-3 text-[11px] font-extrabold bg-black/30 rounded-full px-2 py-0.5">{extra}</div>}
    </button>
  );
}

export default function Home() {
  const { me, go } = useApp();
  return (
    <div className="px-4 space-y-5 mt-1">
      <button onClick={() => go('bitkong')} className="w-full card p-4 flex items-center gap-3 text-left relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-lime/15 to-transparent" />
        <div className="text-5xl float relative">🦍</div>
        <div className="relative flex-1">
          <div className="font-display text-base">Кэшбэк BitKong</div>
          <div className="text-xs text-white/60">{me.level.rate}% с каждой ставки — выиграл или проиграл</div>
        </div>
        <div className="relative text-right">
          <div className="text-lime font-extrabold">{me.cashback.toFixed(2)}★</div>
          <div className="text-[10px] text-white/40">накоплено</div>
        </div>
      </button>

      <section>
        <div className="font-display text-sm text-white/70 mb-2">PvP игры</div>
        <div className="grid grid-cols-2 gap-3">{PVP.map(g => <Tile key={g.k} g={g} big />)}</div>
      </section>
      <section>
        <div className="font-display text-sm text-white/70 mb-2">Соло игры</div>
        <div className="grid grid-cols-1 gap-3">{SOLO.map(g => <Tile key={g.k} g={g} />)}</div>
      </section>
      <section>
        <div className="font-display text-sm text-white/70 mb-2">Скоро</div>
        <div className="grid grid-cols-4 gap-2">
          {SOON.map(([i, t]) => (
            <div key={t} className="card py-3 text-center opacity-60"><div className="text-2xl">{i}</div><div className="text-[10px] font-bold mt-1">{t}</div></div>
          ))}
        </div>
      </section>
    </div>
  );
}
