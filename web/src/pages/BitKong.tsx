import { useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic, tg } from '../lib/api';
import { Logo } from '../ui/icons';

export default function BitKong() {
  const { me, refresh, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const lv = me.level, levels = me.levels as any[];
  const cur = levels[lv.index - 1];
  const progress = lv.next ? Math.min(1, (me.wagered - cur.wagered) / (lv.next.wagered - cur.wagered)) : 1;

  const claim = async () => {
    setBusy(true);
    try { const r = await api('/api/cashback/claim', {}); haptic('success'); toast(`+${fmt(r.claimed)}★ кэшбэка на баланс`); refresh(); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const share = () => {
    const text = 'Играю в BitKong — кэшбэк с каждой ставки и призы топ-3 недели';
    if (tg?.openTelegramLink && me.refLink.startsWith('http')) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(me.refLink)}&text=${encodeURIComponent(text)}`);
    else { navigator.clipboard?.writeText(me.refLink); toast('Ссылка скопирована'); }
  };

  return (
    <div className="px-4 space-y-3 mt-1">
      <div className="card p-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#b6ff3b33,transparent_65%)]" />
        <div className="float relative flex justify-center"><Logo size={96} /></div>
        <div className="font-display text-2xl mt-2 relative">BitKong кэшбэк</div>
        <div className="text-sm text-white/60 relative">Процент с каждой ставки — неважно, выиграл или проиграл</div>
        <div className="font-display text-5xl text-lime glow mt-4 relative tabular-nums">{me.cashback.toFixed(2)}<span className="text-banana">★</span></div>
        <div className="text-xs text-white/40 relative">накоплено · всего получено {fmt(me.cashbackTotal)}★</div>
        <button disabled={busy || me.cashback < 1} onClick={claim} className="btn-lime w-full h-12 mt-4 relative">Забрать на баланс</button>
      </div>

      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-display">{lv.rate}% <span className="text-lime">/ Уровень {lv.index}</span></div>
          {lv.next && <div className="text-xs text-white/50">ещё {fmt(lv.next.wagered - me.wagered)}★ до {lv.next.rate}%</div>}
        </div>
        <div className="h-2.5 bg-moss rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="grid mt-3 text-center text-[11px]" style={{ gridTemplateColumns: `repeat(${levels.length}, 1fr)` }}>
          {levels.map((l, i) => (
            <div key={i} className={i + 1 === lv.index ? 'text-lime font-extrabold' : i + 1 < lv.index ? 'text-white/70' : 'text-white/30'}>
              <div>{l.rate}%</div><div className="text-[9px]">{l.wagered >= 1000 ? fmt(l.wagered / 1000) + 'k' : l.wagered}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-white/40 mt-2">Уровень растёт от общего оборота ставок.</div>
      </div>

      <div className="card p-4 bg-gradient-to-br from-berry/25 to-transparent">
        <div className="font-display">Приглашай друзей</div>
        <div className="text-sm text-white/60 mt-1">{me.refRate}% с каждой ставки друга — на твой кэшбэк. Приглашено: <b className="text-white">{me.referrals}</b></div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-moss rounded-xl px-3 py-2.5 text-xs truncate border border-white/10">{me.refLink}</div>
          <button onClick={share} className="btn-lime px-4">Позвать</button>
        </div>
      </div>
    </div>
  );
}
