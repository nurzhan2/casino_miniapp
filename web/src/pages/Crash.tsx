import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic } from '../lib/api';
import { TopBar, BetInput, Avatar, Star, useCountdown } from '../ui/kit';
import { Logo, Rocket, Burst } from '../ui/icons';
import { Emo } from '../ui/emoji';
import { win as fxWin, lose as fxLose, trail } from '../lib/fx';

const K = 0.00006;
const mAt = (ms: number) => Math.floor(Math.exp(K * Math.max(0, ms)) * 100) / 100;

export default function Crash() {
  const rocketRef = useRef<HTMLDivElement>(null);
  const { crash: s, clock, me, toast, setBalance } = useApp();
  const [amount, setAmount] = useState(100);
  const [auto, setAuto] = useState('');
  const [m, setM] = useState(1);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(0);
  const pts = useRef<number[]>([]);
  const left = useCountdown(s?.phase === 'betting' ? s.phaseEnd : undefined);

  const mine = s?.bets?.find((b: any) => b.id === me.id);
  const inGame = !!mine && !mine.cashed && s?.phase !== 'crashed';

  useEffect(() => {
    if (s?.phase !== 'running') { if (s?.phase === 'betting') pts.current = []; return; }
    let raf = 0;
    const loop = () => { const v = mAt(clock() - s.startAt); setM(v); pts.current.push(v); raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [s?.phase, s?.startAt]);

  useEffect(() => {
    if (s?.phase === 'crashed') { setM(s.crash); setFlash(x => x + 1); if (mine && !mine.cashed) haptic('error'); }
  }, [s?.phase]);

  // «на грани»: чем выше множитель при активной ставке, тем сильнее тряска
  const tension = inGame && s?.phase === 'running' ? Math.min(1, (m - 1) / 4) : 0;

  const bet = async () => {
    setBusy(true);
    try { await api('/api/crash/bet', { amount, auto: Number(auto) || null }); setBalance(me.balance - amount); haptic('medium'); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const cashout = async () => {
    setBusy(true);
    try { const r = await api('/api/crash/cashout', {}); haptic('success'); fxWin(r.payout, r.multiplier, mine?.amount); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (s?.phase !== 'running') return;
    const el = rocketRef.current;
    const i = setInterval(() => {
      const r = el?.getBoundingClientRect();
      if (r) trail(r.left + r.width / 2, r.bottom - 6, Math.min(2.5, 0.6 + Math.log(Math.max(1, m))));
    }, 45);
    return () => clearInterval(i);
  }, [s?.phase, m]);

  if (!s) return <TopBar title="Ракета" />;
  const W = 340, H = 200, list = pts.current;
  const yMax = Math.max(2, m * 1.25), n = Math.max(list.length, 60);
  const path = list.map((v, i) => `${i ? 'L' : 'M'}${(i / n) * W * 0.85},${H - ((v - 1) / (yMax - 1)) * H * 0.85}`).join(' ');
  const tip = list.length ? [((list.length - 1) / n) * W * 0.85, H - ((m - 1) / (yMax - 1)) * H * 0.85] : [0, H];

  return (
    <div className="px-4">
      <TopBar title="Ракета" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2">
        {s.history.map((h: number, i: number) => (
          <span key={i} style={{ animationDelay: `${i * 25}ms` }} className={`row-in shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full ${h >= 2 ? 'bg-lime/15 text-lime' : 'bg-white/5 text-white/50'}`}>×{h}</span>
        ))}
      </div>

      <div key={flash} className={`card relative overflow-hidden h-60 ${s.phase === 'crashed' ? 'flash-red' : ''}`}
        style={tension > 0 ? { animation: `shake ${0.35 - tension * 0.25}s linear infinite`, boxShadow: `0 0 ${20 + tension * 40}px #b6ff3b${Math.round(30 + tension * 60).toString(16)}` } : undefined}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-x-0 bottom-0 w-full h-[85%]" preserveAspectRatio="none">
          <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b6ff3b" stopOpacity=".35" /><stop offset="1" stopColor="#b6ff3b" stopOpacity="0" /></linearGradient></defs>
          {path && <><path d={`${path} L${tip[0]},${H} L0,${H} Z`} fill="url(#g)" /><path d={path} stroke="#b6ff3b" strokeWidth="3" fill="none" /></>}
        </svg>
        {s.phase === 'running' && <div ref={rocketRef} className="absolute text-4xl" style={{ left: `${(tip[0] / W) * 100}%`, top: `${15 + (tip[1] / H) * 85 * 0.85}%`, transform: 'translate(-30%,-70%) rotate(-30deg)' }}><Emo n="rocket" size={54} className="drop-shadow-[0_0_18px_#b6ff3b66]" /></div>}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          {s.phase === 'betting' && <div className="text-center"><div className="float flex justify-center"><Emo n="kong" size={78} className="breathe" /></div><div className="font-display text-lg mt-2">Старт через {left.toFixed(1)}с</div></div>}
          {s.phase === 'running' && <div className={`font-display text-6xl tabular-nums ${m >= 2 ? 'text-lime glow' : ''}`}>×{m.toFixed(2)}</div>}
          {s.phase === 'crashed' && <div className="text-center pop"><div className="flex justify-center"><Emo n="boom" size={76} /></div><div className="font-display text-4xl text-danger">×{s.crash}</div></div>}
        </div>
      </div>

      <div className="card p-4 mt-3 space-y-3">
        <BetInput value={amount} onChange={setAmount} disabled={inGame || s.phase !== 'betting'} />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/60">Автовывод ×</span>
          <input value={auto} onChange={e => setAuto(e.target.value.replace(/[^\d.]/g, ''))} placeholder="выкл"
            className="w-20 bg-moss rounded-lg px-2 py-1.5 font-bold outline-none border border-white/10" />
        </div>
        {inGame && s.phase === 'running'
          ? <button disabled={busy} onClick={cashout} className="btn-lime w-full h-14 text-lg pulse-lime">Забрать {fmt(mine.amount * m)}★</button>
          : mine && s.phase !== 'crashed'
            ? <button disabled className="btn-ghost w-full h-14">{mine.cashed ? `Забрали на ×${mine.cashed}` : 'Ставка принята — ждём старт'}</button>
            : <button disabled={busy || s.phase !== 'betting'} onClick={bet} className="btn-lime w-full h-14 text-lg">
                {s.phase === 'betting' ? `Поставить ${fmt(amount)}★` : 'Ждём следующий раунд'}
              </button>}
      </div>

      <div className="card mt-3 p-3">
        <div className="text-xs text-white/50 font-bold mb-2">Ставки раунда · {s.bets.length}</div>
        {s.bets.length === 0 && <div className="text-sm text-white/30 py-2">Пока пусто</div>}
        {s.bets.map((b: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-1.5">
            <Avatar src={b.photo} name={b.name} size={26} />
            <span className="text-sm truncate flex-1">{b.name}</span>
            <span className="text-sm font-bold"><Star /> {fmt(b.amount)}</span>
            <span className={`w-16 text-right text-sm font-extrabold ${b.cashed ? 'text-lime' : s.phase === 'crashed' ? 'text-danger' : 'text-white/30'}`}>
              {b.cashed ? `×${b.cashed}` : s.phase === 'crashed' ? '✕' : '…'}
            </span>
          </div>
        ))}
        <div className="text-[10px] text-white/30 mt-2 break-all">Хэш раунда: {s.hash}{s.seed && <><br />Сид: {s.seed}</>}</div>
      </div>
    </div>
  );
}
