import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic } from '../lib/api';
import { TopBar, Star } from '../ui/kit';
import { Emo } from '../ui/emoji';
import { SkeletonList } from '../ui/bits';
import { win as fxWin } from '../lib/fx';
import { sfx } from '../lib/sfx';
import { useCountdown } from '../ui/kit';

const TIER_COLOR = ['#d08a4e', '#c9d4dd', '#ffd43b', '#7fe0d0', '#8fb8ff'];
const CASE_GLOW: Record<string, string> = { cub: '#ff9f3b', friend: '#ff3bd4', tiger: '#ffb13b', lord: '#ffd43b' };

function Timer({ at }: { at: number }) {
  const s = useCountdown(at);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return <>{h > 0 ? `${h} ч ${m} мин` : `${m} мин ${Math.floor(s % 60)} с`}</>;
}

export default function Ranks() {
  const { refresh, toast, go } = useApp();
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState(0);
  const [opening, setOpening] = useState<any>(null);   // { id, strip, offset, spin, result }
  const busy = useRef(false);

  const load = () => api('/api/ranks').then(r => { setD(r); setTab(t => (d ? t : Math.min(4, Math.floor((r.level - 1) / 5)))); });
  useEffect(() => { load(); }, []);

  const open = async (c: any) => {
    if (busy.current || !c.available) return;
    busy.current = true;
    try {
      const r = await api('/api/ranks/open', { case: c.id });
      // лента: на 30-й позиции выпавший приз
      const strip = [...Array(36)].map(() => Math.floor(Math.random() * r.drops.length));
      strip[30] = r.index;
      setOpening({ c, r, strip, spin: false });
      haptic('medium'); sfx.spin();
      requestAnimationFrame(() => requestAnimationFrame(() => setOpening((o: any) => o && { ...o, spin: true })));
      await new Promise(s => setTimeout(s, 4300));
      fxWin(r.stars, undefined, 1);
      setOpening((o: any) => o && { ...o, done: true });
      refresh(); load();
    } catch (e: any) { toast(e.message, 'err'); } finally { busy.current = false; }
  };

  if (!d) return <div className="px-4"><TopBar title="Звания" /><SkeletonList n={6} h={70} /></div>;
  const tier = Math.min(4, Math.floor((d.level - 1) / 5));
  const progress = d.to ? Math.min(1, (d.wagered - d.from) / (d.to - d.from)) : 1;
  const tierLevels = d.levels.slice(tab * 5, tab * 5 + 5);
  const final = tierLevels[4];
  const ITEM = 84;

  return (
    <div className="px-4 pb-4">
      <TopBar title="Звания" />

      {/* текущее звание */}
      <div className="card p-4 mt-2 relative overflow-hidden" data-tilt="4">
        <div className="absolute inset-0" style={{ background: `radial-gradient(90% 80% at 0% 0%, ${TIER_COLOR[tier]}33, transparent 60%)` }} />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <Emo n="shield" size={58} className="breathe" />
            <span className="absolute inset-0 grid place-items-center font-display text-sm text-jungle">{d.level}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-extrabold">Текущее звание</div>
            <div className="font-display text-xl" style={{ color: TIER_COLOR[tier] }}>{d.rank}</div>
            <div className="text-[11px] text-white/50">Уровень {d.level} · {fmt(d.wagered)} / {d.to ? fmt(d.to) : 'макс'}★</div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg text-lime">{d.rate}%</div>
            <div className="text-[10px] text-white/40">кэшбэк</div>
          </div>
        </div>
        <div className="relative h-2 bg-moss rounded-full mt-3 overflow-hidden wave-bar">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress * 100}%`, background: TIER_COLOR[tier] }} />
        </div>
      </div>

      {/* бесплатные кейсы */}
      <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/40 mt-5 mb-2.5 px-0.5">Бесплатные кейсы</div>
      <div className="grid grid-cols-2 gap-3">
        {d.cases.map((c: any, i: number) => (
          <button key={c.id} onClick={() => open(c)} disabled={!c.available}
            data-tilt={c.available ? '7' : undefined}
            className={`tile-in card relative overflow-hidden py-4 px-2 text-center ${c.available ? '' : 'opacity-75'}`}
            style={{ animationDelay: `${i * 60}ms`, borderColor: c.available ? CASE_GLOW[c.id] + '88' : undefined }}>
            {c.available && <div className="absolute inset-0 pulse-lime opacity-60" style={{ background: `radial-gradient(70% 60% at 50% 35%, ${CASE_GLOW[c.id] ?? '#b6ff3b'}44, transparent 70%)` }} />}
            <div className="relative flex justify-center">
              <Emo n={c.id} size={64} className={`${c.available ? 'bob' : 'grayscale-[.6]'} drop-shadow-[0_10px_20px_rgba(0,0,0,.5)]`} />
              {c.locked && <Emo n="lock" size={26} className="absolute -bottom-1 right-6" />}
              {c.keys > 0 && <span className="absolute -top-1 right-3 flex items-center gap-0.5 bg-banana text-jungle text-[10px] font-black rounded-full px-1.5 py-0.5"><Emo n="key" size={12} />×{c.keys}</span>}
            </div>
            <div className="relative font-display text-sm mt-2">{c.title}</div>
            <div className="relative text-[10px] mt-1 font-bold">
              {c.available ? <span className="text-lime">Открыть бесплатно</span>
                : c.locked ? <span className="text-white/45">Нужен {c.minLevel} ур.</span>
                : c.nextAt ? <span className="text-white/45">Через <Timer at={c.nextAt} /></span>
                : c.kind === 'key' ? <span className="text-white/45">Ключ за друга, который наиграет {fmt(d.refKeyWagered)}★</span>
                : null}
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => go('bitkong')} className="w-full text-[11px] text-white/45 mt-2 py-1 link-hover">Пригласить друга и получить ключ →</button>

      {/* путь звания */}
      <div className="flex gap-1.5 mt-5 overflow-x-auto no-scrollbar">
        {d.tiers.map((t: string, i: number) => (
          <button key={t} onClick={() => setTab(i)}
            className={`shrink-0 px-3.5 h-9 rounded-full text-xs font-extrabold transition ${tab === i ? 'text-jungle' : 'btn-ghost'}`}
            style={tab === i ? { background: TIER_COLOR[i] } : undefined}>{t}</button>
        ))}
      </div>

      <div className="card p-4 mt-3">
        <div className="flex justify-between items-baseline">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/40 font-extrabold">Путь звания</div>
          <div className="text-[11px] text-white/40">{tab * 5 + 1}–{tab * 5 + 5}</div>
        </div>
        <div className="font-display mt-0.5" style={{ color: TIER_COLOR[tab] }}>{d.tiers[tab]}</div>
        <div className="flex items-center justify-between mt-3">
          {tierLevels.map((l: any, i: number) => (
            <div key={l.level} className="flex items-center flex-1 last:flex-none">
              <div className={`w-9 h-9 rounded-full grid place-items-center text-xs font-black border-2 transition ${l.reached ? 'text-jungle' : 'text-white/40 border-white/15'}`}
                style={l.reached ? { background: TIER_COLOR[tab], borderColor: TIER_COLOR[tab] } : undefined}>{l.level}</div>
              {i < 4 && <div className="flex-1 h-0.5 mx-1 rounded" style={{ background: tierLevels[i + 1].reached ? TIER_COLOR[tab] : '#ffffff1a' }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mt-3 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-15"><Emo n="crown" size={130} /></div>
        <div className="text-[11px] uppercase tracking-[0.14em] font-extrabold" style={{ color: TIER_COLOR[tab] }}>Финал звания</div>
        <div className="font-display text-lg mt-0.5">{final.name} · Уровень {final.level}</div>
        <div className="text-sm text-white/60 mt-1">{final.rate}% кэшбэк · {fmt(final.stars)}<Star size={12} />{final.giftTitle ? ` · ${final.giftTitle}` : ''}</div>
      </div>

      <div className="flex justify-between items-baseline mt-5 mb-2.5 px-0.5">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/40">Награды звания</div>
        <div className="text-[11px] text-white/40">{tierLevels.filter((l: any) => l.reached).length} / 5</div>
      </div>
      <div className="space-y-2">
        {tierLevels.map((l: any, i: number) => {
          const active = l.level === d.level;
          return (
            <div key={l.level} style={{ animationDelay: `${i * 40}ms` }}
              className={`row-in card p-3 flex items-center gap-3 ${l.reached ? '' : 'opacity-60'} ${active ? 'border-lime/50' : ''}`}>
              <div className="relative shrink-0">
                <Emo n="shield" size={38} className={l.reached ? '' : 'grayscale'} />
                <span className="absolute inset-0 grid place-items-center text-[10px] font-black text-jungle">{l.level}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm">Уровень {l.level}</div>
                <div className="text-[11px] text-white/45">{l.name} · от {fmt(l.wagered)}★ · {l.rate}%</div>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {l.stars > 0 && <span className="chip-hover flex items-center gap-1 bg-moss rounded-lg px-2 py-1 text-xs font-extrabold">{fmt(l.stars)}<Star size={12} /></span>}
                  {l.gift && <span className="chip-hover flex items-center gap-1 bg-moss rounded-lg px-2 py-1 text-xs font-bold"><Emo n={l.gift} size={16} />{l.giftTitle}</span>}
                </div>
              </div>
              <div className={`text-[11px] font-extrabold ${active ? 'text-lime' : l.reached ? 'text-white/60' : 'text-white/30'}`}>
                {active ? 'Активно' : l.reached ? 'Получено' : 'Закрыто'}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => go('cases')} className="btn-ghost w-full h-11 mt-4 text-sm">Кейсы за звёзды →</button>

      {/* открытие кейса */}
      {opening && (
        <div className="fixed inset-0 z-[56] bg-black/75 backdrop-blur-sm grid place-items-center px-4 screen-in" onClick={() => opening.done && setOpening(null)}>
          <div className="w-full max-w-md card p-5 text-center" onClick={e => e.stopPropagation()}>
            <Emo n={opening.c.id} size={70} className="mx-auto bob" />
            <div className="font-display text-lg mt-1">{opening.c.title}</div>
            <div className="relative mt-4 py-3 overflow-hidden rounded-2xl bg-jungle/60">
              <div className="absolute left-1/2 inset-y-1 w-0.5 bg-lime -translate-x-1/2 z-10 shadow-[0_0_12px_#b6ff3b]" />
              <div className="flex" style={{
                transform: `translateX(calc(50% - ${(opening.spin ? 30 : 0) * ITEM + ITEM / 2}px))`,
                transition: opening.spin ? 'transform 4.2s cubic-bezier(.08,.7,.05,1)' : 'none',
              }}>
                {opening.strip.map((k: number, i: number) => (
                  <div key={i} className="shrink-0 grid place-items-center" style={{ width: ITEM }}>
                    <div className={`w-[68px] h-[68px] rounded-2xl grid place-items-center border ${opening.done && i === 30 ? 'border-lime bg-lime/15 value-pop' : 'border-white/10 bg-moss'}`}>
                      <div className="font-display text-base">{fmt(opening.r.drops[k].stars)}</div>
                      <Star size={13} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {opening.done
              ? <button onClick={() => setOpening(null)} className="btn-lime w-full h-12 mt-4">Забрать +{fmt(opening.r.stars)}★</button>
              : <div className="text-xs text-white/40 mt-4">Крутим…</div>}
          </div>
        </div>
      )}
    </div>
  );
}
