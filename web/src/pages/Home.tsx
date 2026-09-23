import { useApp } from '../lib/store';
import { fmt } from '../lib/api';
import { StarIcon } from '../ui/icons';
import { Emo } from '../ui/emoji';
import { Star } from '../ui/kit';

const PVP = [
  { k: 'pvp', t: 'PvP', d: 'Колесо на банк — доля ставки решает шанс', e: 'wheel', a: '#ff3bd4', b: '#7a1d8a' },
  { k: 'arena', t: 'Арена', d: 'Зона больше — выше вероятность', e: 'swords', a: '#5a7dff', b: '#22276e' },
];
const SOLO = [
  { k: 'crash', t: 'Ракета', d: 'Забрать до взрыва', e: 'rocket', a: '#8b5cff', b: '#2c1466', tag: 'ТОП' },
  { k: 'mines', t: 'Мины', d: 'Кристаллы против бомб', e: 'bomb', a: '#1fa2ff', b: '#0a3c69' },
  { k: 'coinflip', t: 'Coinflip', d: 'Орёл, решка или ребро', e: 'coin', a: '#ffb13b', b: '#7d3c0e' },
  { k: 'plinko', t: 'Plinko', d: 'Шарик ищет крупный множитель', e: 'gem', a: '#3bd4b0', b: '#0c5a49' },
  { k: 'roulette', t: 'Рулетка', d: 'До ×50 за один оборот', e: 'wheel', a: '#ff5a5a', b: '#7a1b1b' },
  { k: 'cases', t: 'Кейсы', d: 'Три кейса, редкие дропы', e: 'bag', a: '#c88cff', b: '#4a2470' },
  { k: 'upgrade', t: 'Апгрейд', d: 'Свой множитель и свой риск', e: 'glowstar', a: '#ffd43b', b: '#8a6100' },
];

function Tile({ g, tall }: { g: any; tall?: boolean }) {
  const { go, jackpots, crash } = useApp();
  const jp = jackpots[g.k];
  const extra = g.k === 'crash' && crash?.history?.length ? `Последний раунд ×${crash.history[0]}`
    : jp ? (jp.players.length ? `Банк ${fmt(jp.total)} · игроков ${jp.players.length}` : 'Ждём игроков') : null;
  return (
    <button onClick={() => go(g.k)}
      className={`relative overflow-hidden text-left rounded-[22px] p-4 w-full active:scale-[.985] transition ${tall ? 'h-40' : 'h-[112px]'}`}
      style={{ background: `linear-gradient(145deg, ${g.a}, ${g.b})` }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 100% 0%, #ffffff26, transparent 60%)' }} />
      <Emo n={g.e} size={tall ? 132 : 118}
        className={`absolute drop-shadow-[0_10px_24px_rgba(0,0,0,.45)] ${tall ? '-right-6 -bottom-7' : '-right-5 -bottom-7'}`} />
      {g.tag && <span className="absolute top-3.5 right-3.5 text-[10px] font-extrabold tracking-wider bg-black/35 backdrop-blur px-2 py-1 rounded-md z-10">{g.tag}</span>}
      <div className="relative font-display text-[19px] leading-none">{g.t}</div>
      <div className="relative text-[11px] text-white/75 mt-1.5 max-w-[58%] leading-snug">{g.d}</div>
      {extra && (
        <div className="absolute left-4 bottom-3.5 flex items-center gap-1 text-[11px] font-bold bg-black/35 backdrop-blur rounded-md px-2 py-1">
          {jp && <StarIcon size={11} />}{extra}
        </div>
      )}
    </button>
  );
}

export default function Home() {
  const { me, go } = useApp();
  return (
    <div className="px-4 space-y-6 mt-1">
      <button onClick={() => go('bitkong')} className="w-full card p-4 flex items-center gap-3.5 text-left relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-lime/12 via-transparent to-transparent" />
        <Emo n="kong" size={52} className="relative shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,.5)]" />
        <div className="relative flex-1 min-w-0">
          <div className="font-display text-[15px]">Кэшбэк BitKong</div>
          <div className="text-[11px] text-white/55 mt-0.5">{me.level.rate}% с каждой ставки — при любом исходе</div>
        </div>
        <div className="relative text-right">
          <div className="text-lime font-extrabold tabular-nums flex items-center gap-1 justify-end">{me.cashback.toFixed(2)}<Star size={13} /></div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider">накоплено</div>
        </div>
      </button>

      <section>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/40 mb-2.5 px-0.5">PvP</div>
        <div className="grid grid-cols-2 gap-3">{PVP.map(g => <Tile key={g.k} g={g} tall />)}</div>
      </section>

      <section>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/40 mb-2.5 px-0.5">Соло</div>
        <div className="space-y-3">{SOLO.map(g => <Tile key={g.k} g={g} />)}</div>
      </section>
    </div>
  );
}
