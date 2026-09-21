import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { fmt, tg, GAME_NAMES } from '../lib/api';

export const Star = ({ className = '' }: { className?: string }) => <span className={`text-banana ${className}`}>★</span>;

export function Avatar({ src, name, size = 32 }: { src?: string | null; name?: string; size?: number }) {
  const s = { width: size, height: size };
  if (src) return <img src={src} style={s} className="rounded-full object-cover shrink-0" />;
  return (
    <div style={s} className="rounded-full bg-vine grid place-items-center text-xs font-extrabold text-lime shrink-0">
      {(name || '?').replace('@', '').slice(0, 2).toUpperCase()}
    </div>
  );
}

export function Header() {
  const { me, go } = useApp();
  return (
    <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
      <Avatar src={me.photo} name={me.name} size={36} />
      <div className="min-w-0">
        <div className="text-sm font-extrabold truncate">{me.name}</div>
        <div className="text-[11px] text-lime/80 font-bold">Ур. {me.level.index} · кэшбэк {me.level.rate}%</div>
      </div>
      <button onClick={() => go('profile')} className="ml-auto flex items-center gap-2 bg-moss border border-white/10 rounded-full pl-3 pr-1 py-1">
        <Star /> <span className="font-extrabold tabular-nums">{fmt(me.balance)}</span>
        <span className="w-7 h-7 rounded-full bg-lime text-jungle grid place-items-center font-black text-lg leading-none">+</span>
      </button>
    </div>
  );
}

export function LiveStrip() {
  const { live, online } = useApp();
  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
      <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-extrabold text-lime">
        <span className="w-2 h-2 rounded-full bg-lime pulse-lime" /> LIVE {online > 0 && <span className="text-white/40">· {online}</span>}
      </div>
      {live.length === 0 && <div className="text-xs text-white/30">Здесь появятся крупные выигрыши</div>}
      {live.map((w, i) => (
        <div key={w.at + '' + i} className="slide-in shrink-0 flex items-center gap-1.5 bg-moss rounded-full pl-1 pr-3 py-1">
          <Avatar src={w.photo} name={w.name} size={22} />
          <span className="text-[11px] text-white/60">{GAME_NAMES[w.game]}</span>
          <span className="text-xs font-extrabold text-lime">+{fmt(w.payout)}★</span>
        </div>
      ))}
    </div>
  );
}

/** Ввод ставки: ½, ×2, быстрые суммы */
export function BetInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const { me } = useApp();
  const clamp = (v: number) => Math.max(me.minBet, Math.min(me.maxBet, Math.floor(v) || me.minBet));
  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div className="flex items-center gap-2">
        <button className="btn-ghost w-11 h-11 text-lg" onClick={() => onChange(clamp(value / 2))}>½</button>
        <div className="flex-1 flex items-center justify-center gap-1.5 bg-moss rounded-xl h-11 border border-white/10">
          <Star />
          <input inputMode="numeric" value={value} onChange={e => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
            onBlur={() => onChange(clamp(value))}
            className="w-24 bg-transparent text-center text-lg font-extrabold outline-none tabular-nums" />
        </div>
        <button className="btn-ghost w-11 h-11 text-sm" onClick={() => onChange(clamp(value * 2))}>×2</button>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {[10, 100, 500, 1000].map(v => (
          <button key={v} className="btn-ghost h-9 text-sm" onClick={() => onChange(clamp(v))}>{v}★</button>
        ))}
      </div>
    </div>
  );
}

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const { go } = useApp();
  useEffect(() => {
    const b = tg?.BackButton;
    if (!b) return;
    const back = () => go('home');
    b.show(); b.onClick(back);
    return () => { b.offClick(back); b.hide(); };
  }, [go]);
  return (
    <div className="flex items-center gap-3 px-4 pt-3 pb-1">
      {!tg?.initData && <button onClick={() => go('home')} className="btn-ghost w-9 h-9 text-lg">‹</button>}
      <div className="font-display text-lg">{title}</div>
      <div className="ml-auto">{right}</div>
    </div>
  );
}

/** Секунды до отметки времени сервера (для обратного отсчёта) */
export function useCountdown(until?: number) {
  const { clock } = useApp();
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 200); return () => clearInterval(i); }, []);
  return until ? Math.max(0, (until - clock()) / 1000) : 0;
}

export function BottomNav() {
  const { screen, go } = useApp();
  const items = [['home', '🎮', 'Игры'], ['leaders', '🏆', 'Лидеры'], ['bitkong', '🦍', 'BitKong'], ['profile', '👤', 'Профиль']];
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-jungle via-jungle/95 to-transparent">
      <div className="card grid grid-cols-4 p-1.5 max-w-md mx-auto">
        {items.map(([k, ic, label]) => (
          <button key={k} onClick={() => go(k)} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition ${screen === k ? 'bg-lime/15 text-lime' : 'text-white/50'}`}>
            <span className="text-xl leading-none">{ic}</span>
            <span className="text-[10px] font-extrabold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
