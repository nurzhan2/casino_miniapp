import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic } from '../lib/api';
import { TopBar, BetInput } from '../ui/kit';
import { Emo } from '../ui/emoji';
import { win as fxWin, lose as fxLose } from '../lib/fx';

const COLORS = ['#b6ff3b', '#ffb13b', '#3bc9ff', '#ff3bd4', '#8b5cff', '#ff5a5a', '#2c3c31'];

export default function Roulette() {
  const { refresh, toast } = useApp();
  const [amount, setAmount] = useState(100);
  const [table, setTable] = useState<any[]>([]);
  const [rot, setRot] = useState(0);
  const [spin, setSpin] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const busy = useRef(false);

  useEffect(() => { api('/api/roulette/table').then(setTable); }, []);

  const go = async () => {
    if (busy.current) return;
    busy.current = true; setSpin(true); setRes(null); haptic('medium');
    try {
      const r = await api('/api/roulette', { amount });
      // сектор победителя ставим под стрелку: секторы пропорциональны вероятностям
      const before = r.table.slice(0, r.index).reduce((s: number, t: any) => s + t.p, 0);
      const mid = before + r.table[r.index].p / 2;
      setRot(x => Math.ceil(x / 360) * 360 + 360 * 6 + (360 - mid * 360));
      await new Promise(s => setTimeout(s, 4200));
      setRes(r);
      setLog(l => [{ ...r, id: Date.now() }, ...l].slice(0, 10));
      if (r.payout > 0) { haptic('success'); fxWin(r.payout, r.multiplier, amount); } else { haptic('error'); fxLose('Мимо'); }
      refresh();
    } catch (e: any) { toast(e.message, 'err'); } finally { busy.current = false; setSpin(false); }
  };

  let acc = 0;
  const segs = table.map((t, i) => {
    const a0 = acc * 2 * Math.PI, a1 = (acc + t.p) * 2 * Math.PI; acc += t.p;
    const pt = (a: number, rad: number) => `${110 + rad * Math.sin(a)},${110 - rad * Math.cos(a)}`;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const mid = (a0 + a1) / 2;
    return { d: `M110,110 L${pt(a0, 100)} A100,100 0 ${big},1 ${pt(a1, 100)} Z`, c: COLORS[i % COLORS.length], t, lx: 110 + 68 * Math.sin(mid), ly: 110 - 68 * Math.cos(mid), show: t.p > 0.05 };
  });

  return (
    <div className="px-4">
      <TopBar title="Рулетка" />
      <div className="card p-4 mt-2 relative">
        <div className="relative w-64 h-64 mx-auto">
          <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 z-10 w-0 h-0 border-x-[9px] border-x-transparent border-t-[16px] border-t-lime" />
          <svg viewBox="0 0 220 220" className="w-full h-full"
            style={{ transform: `rotate(${rot}deg)`, transition: spin ? 'transform 4.2s cubic-bezier(.1,.75,.06,1)' : 'none' }}>
            {segs.map((s, i) => <path key={i} d={s.d} fill={s.c} stroke="#0a130d" strokeWidth="1.5" />)}
            {segs.map((s, i) => s.show && <text key={'t' + i} x={s.lx} y={s.ly + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#0a130d">{s.t.label}</text>)}
            <circle cx="110" cy="110" r="30" fill="#0f1a13" stroke="#ffffff22" />
          </svg>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            {res ? <div className={`pop font-display text-lg ${res.payout > 0 ? 'text-lime glow' : 'text-white/50'}`}>{res.payout > 0 ? `+${fmt(res.payout)}` : 'мимо'}</div>
              : <Emo n="wheel" size={38} />}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 py-2 overflow-x-auto no-scrollbar">
        {log.map(l => <span key={l.id} className={`shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full ${l.payout > 0 ? 'bg-lime/15 text-lime' : 'bg-white/5 text-white/40'}`}>{l.label}</span>)}
      </div>

      <div className="card p-4 space-y-3">
        <BetInput value={amount} onChange={setAmount} disabled={spin} />
        <button disabled={spin} onClick={go} className="btn-lime w-full h-14 text-lg">Крутить {fmt(amount)}★</button>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          {table.filter(t => t.m > 0).map((t, i) => (
            <div key={i} className="bg-moss rounded-lg py-1.5 text-center">
              <div className="font-extrabold" style={{ color: COLORS[i % COLORS.length] }}>{t.label}</div>
              <div className="text-white/40">{(t.p * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
