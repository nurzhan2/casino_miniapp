import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic } from '../lib/api';
import { TopBar, BetInput, Avatar, Star, useCountdown } from '../ui/kit';
import { Logo } from '../ui/icons';
import { Emo } from '../ui/emoji';
import { win as fxWin, lose as fxLose } from '../lib/fx';

/** Колесо PvP: сегменты по долям, указатель сверху */
function Wheel({ s, spinning }: { s: any; spinning: boolean }) {
  const [rot, setRot] = useState(0);
  useEffect(() => {
    if (spinning && s.roll != null) setRot(r => Math.ceil(r / 360) * 360 + 360 * 7 + (360 - s.roll * 360));
  }, [spinning, s.id]);
  const R = 100, r = 62;
  let acc = 0;
  const segs = s.players.map((p: any) => {
    const a0 = acc * 2 * Math.PI, a1 = (acc + p.chance) * 2 * Math.PI; acc += p.chance;
    const pt = (a: number, rad: number) => `${110 + rad * Math.sin(a)},${110 - rad * Math.cos(a)}`;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const d = p.chance >= 0.9999
      ? `M110,10 A100,100 0 1,1 109.99,10 L109.99,48 A62,62 0 1,0 110,48 Z`
      : `M${pt(a0, R)} A${R},${R} 0 ${big},1 ${pt(a1, R)} L${pt(a1, r)} A${r},${r} 0 ${big},0 ${pt(a0, r)} Z`;
    const mid = (a0 + a1) / 2;
    return { d, color: p.color, p, lx: 110 + 81 * Math.sin(mid), ly: 110 - 81 * Math.cos(mid), big: p.chance > 0.08 };
  });
  return (
    <div className="relative w-64 h-64 mx-auto">
      <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 z-10 w-0 h-0 border-x-[9px] border-x-transparent border-t-[16px] border-t-lime drop-shadow-[0_2px_6px_#b6ff3b80]" />
      <svg viewBox="0 0 220 220" className="w-full h-full" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${s.spinMs}ms cubic-bezier(.12,.75,.08,1)` : 'none' }}>
        <circle cx="110" cy="110" r="100" fill="#1a2a1f" /><circle cx="110" cy="110" r="62" fill="#0a130d" />
        {segs.map((g: any, i: number) => <path key={i} d={g.d} fill={g.color} stroke="#0a130d" strokeWidth="2" />)}
        {segs.map((g: any, i: number) => g.big && <text key={'t' + i} x={g.lx} y={g.ly + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#0a130d">{Math.round(g.p.chance * 100)}%</text>)}
      </svg>
    </div>
  );
}

/** Арена: поле делится на зоны по долям, шар мечется и останавливается в зоне победителя */
function Arena({ s, spinning }: { s: any; spinning: boolean }) {
  const [ball, setBall] = useState({ x: 0.5, y: 0.5 });
  const raf = useRef(0);
  useEffect(() => {
    if (!spinning || s.roll == null) { setBall({ x: 0.5, y: 0.5 }); return; }
    const t0 = performance.now(), dur = s.spinMs - 300;
    const reflect = (v: number) => { v = ((v % 2) + 2) % 2; return v > 1 ? 2 - v : v; };
    const loop = (t: number) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      const x = reflect(s.roll + (1 - e) * 6.3), y = reflect(0.5 + (1 - e) * 4.7);
      setBall({ x, y });
      if (p < 1) raf.current = requestAnimationFrame(loop);
      else haptic('heavy');
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [spinning, s.id]);
  let acc = 0;
  return (
    <div className="relative w-full aspect-square rounded-3xl overflow-hidden border-4 border-white/10 bg-moss">
      {s.players.map((p: any) => { const l = acc; acc += p.chance; return (
        <div key={p.id} className="absolute inset-y-0 grid place-items-center" style={{ left: `${l * 100}%`, width: `${p.chance * 100}%`, background: p.color + 'cc' }}>
          {p.chance > 0.12 && <Avatar src={p.photo} name={p.name} size={36} />}
        </div>); })}
      {s.players.length === 0 && <div className="absolute inset-0 grid place-items-center text-white/40 font-bold">Ожидание игроков</div>}
      <div className="absolute w-7 h-7 rounded-full bg-white shadow-[0_0_20px_#fff] -translate-x-1/2 -translate-y-1/2" style={{ left: `${ball.x * 100}%`, top: `${ball.y * 100}%` }} />
    </div>
  );
}

export default function Jackpot({ kind }: { kind: 'pvp' | 'arena' }) {
  const { jackpots, me, refresh, toast } = useApp();
  const s = jackpots[kind];
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const left = useCountdown(s?.phase === 'countdown' ? s.endsAt : undefined);
  const spinning = s?.phase === 'spinning';

  useEffect(() => {
    if (!spinning) { setShowResult(false); return; }
    const t = setTimeout(() => {
      setShowResult(true);
      if (s.winner === me.id) { haptic('success'); fxWin(s.payout, undefined, my?.amount); }
      else { haptic('warning'); fxLose('Банк ушёл сопернику'); }
      refresh();
    }, s.spinMs);
    return () => clearTimeout(t);
  }, [spinning, s?.id]);

  const join = async () => {
    setBusy(true);
    try { await api(`/api/jackpot/${kind}/join`, { amount }); haptic('medium'); refresh(); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  if (!s) return <TopBar title={kind === 'pvp' ? 'PvP' : 'Арена'} />;
  const my = s.players.find((p: any) => p.id === me.id);
  const winner = s.players.find((p: any) => p.id === s.winner);
  return (
    <div className="px-4">
      <TopBar title={kind === 'pvp' ? 'PvP' : 'Арена'} right={<span className="text-xs text-white/40">Игра #{s.id}</span>} />
      <div className="card p-4 mt-2 relative">
        {kind === 'pvp' ? <Wheel s={s} spinning={spinning} /> : <Arena s={s} spinning={spinning} />}
        {kind === 'pvp' && <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center w-28">
            {showResult && winner ? <div className="pop"><Avatar src={winner.photo} name={winner.name} size={40} /><div className="text-xs font-extrabold mt-1 truncate">{winner.name}</div></div>
              : s.phase === 'countdown' ? <div className="font-display text-3xl">{Math.ceil(left)}</div>
              : spinning ? <Emo n={kind === 'pvp' ? 'wheel' : 'swords'} size={52} className="mx-auto" />
              : <div className="text-xs text-white/60 font-bold">Ждём второго игрока</div>}
          </div>
        </div>}
        <div className="flex justify-center mt-3">
          <div className="bg-moss rounded-full px-4 py-1.5 font-extrabold">Банк <Star /> {fmt(s.total)}</div>
        </div>
        {kind === 'arena' && <div className="text-center text-sm font-bold mt-2 text-white/70">
          {s.phase === 'countdown' ? `Старт через ${Math.ceil(left)}с` : spinning ? (showResult && winner ? `Победил ${winner.name}` : 'Шар в игре…') : 'Ждём второго игрока'}</div>}
        {showResult && winner && <div className={`text-center font-display mt-2 pop ${winner.id === me.id ? 'text-lime glow' : 'text-white/70'}`}>
          {winner.id === me.id ? `Ты выиграл ${fmt(s.payout)}★!` : `${winner.name} забрал ${fmt(s.payout)}★`}</div>}
      </div>

      <div className="card p-4 mt-3 space-y-3">
        <BetInput value={amount} onChange={setAmount} disabled={spinning} />
        <button disabled={busy || spinning} onClick={join} className="btn-lime w-full h-14 text-lg">
          {spinning ? 'Розыгрыш…' : my ? `Добавить ${fmt(amount)}★ (шанс ${Math.round(my.chance * 100)}%)` : `Сделать ставку ${fmt(amount)}★`}
        </button>
      </div>

      <div className="card p-3 mt-3">
        <div className="text-xs text-white/50 font-bold mb-2">Игроки · {s.players.length}</div>
        {s.players.map((p: any) => (
          <div key={p.id} className="flex items-center gap-2 py-1.5">
            <span className="w-2 h-8 rounded-full" style={{ background: p.color }} />
            <Avatar src={p.photo} name={p.name} size={28} />
            <div className="flex-1 min-w-0"><div className="text-sm truncate">{p.name}</div><div className="text-[11px] text-white/40">Шанс {(p.chance * 100).toFixed(1)}%</div></div>
            <b><Star /> {fmt(p.amount)}</b>
          </div>
        ))}
        <div className="text-[10px] text-white/30 mt-2 break-all">Хэш: {s.hash}{s.seed && <><br />Сид: {s.seed}</>}</div>
      </div>

      {s.history.length > 0 && <div className="card p-3 mt-3">
        <div className="text-xs text-white/50 font-bold mb-2">История</div>
        {s.history.map((h: any) => (
          <div key={h.id} className="flex items-center gap-2 py-1.5 text-sm">
            <Avatar src={h.photo} name={h.winner} size={24} />
            <span className="flex-1 truncate">{h.winner} <span className="text-white/40">· шанс {(h.chance * 100).toFixed(1)}%</span></span>
            <b className="text-lime">+{fmt(h.payout)}★</b>
          </div>
        ))}
      </div>}
    </div>
  );
}
