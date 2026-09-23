import { useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic } from '../lib/api';
import { TopBar, BetInput } from '../ui/kit';
import { Emo } from '../ui/emoji';
import { win as fxWin, lose as fxLose } from '../lib/fx';
import { sfx } from '../lib/sfx';

export default function Upgrade() {
  const { me, refresh, toast } = useApp();
  const [amount, setAmount] = useState(100);
  const [target, setTarget] = useState(2);
  const [rot, setRot] = useState(0);
  const [spin, setSpin] = useState(false);
  const [res, setRes] = useState<any>(null);
  const busy = useRef(false);

  const chance = Math.min(0.99, (me.rtp ?? 0.95) / target);
  const R = 92, C = 2 * Math.PI * R;

  const go = async () => {
    if (busy.current) return;
    busy.current = true; setSpin(true); setRes(null); haptic('medium'); sfx.spin();
    try {
      const r = await api('/api/upgrade', { amount, target });
      // стрелка останавливается на выпавшем числе: зелёный сектор = шанс
      setRot(x => Math.ceil(x / 360) * 360 + 360 * 5 + r.roll * 360);
      await new Promise(s => setTimeout(s, 3400));
      setRes(r);
      if (r.win) { haptic('success'); fxWin(r.payout, r.target, amount); } else { haptic('error'); fxLose('Апгрейд не прошёл'); }
      refresh();
    } catch (e: any) { toast(e.message, 'err'); } finally { busy.current = false; setSpin(false); }
  };

  return (
    <div className="px-4">
      <TopBar title="Апгрейд" right={<span className="text-xs text-white/40">шанс {(chance * 100).toFixed(1)}%</span>} />

      <div className="card p-5 mt-2">
        <div className="relative w-56 h-56 mx-auto">
          <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
            <circle cx="110" cy="110" r={R} fill="none" stroke="#25352b" strokeWidth="18" />
            <circle cx="110" cy="110" r={R} fill="none" stroke="#b6ff3b" strokeWidth="18"
              strokeDasharray={`${C * chance} ${C}`} strokeLinecap="round" className="transition-all duration-300" />
          </svg>
          <div className="absolute inset-0" style={{ transform: `rotate(${rot}deg)`, transition: spin ? 'transform 3.4s cubic-bezier(.1,.75,.06,1)' : 'none' }}>
            <div className="absolute left-1/2 top-1 -translate-x-1/2 w-0 h-0 border-x-[8px] border-x-transparent border-t-[18px] border-t-white drop-shadow" />
          </div>
          <div className="absolute inset-0 grid place-items-center">
            {res ? <div className={`pop font-display text-2xl ${res.win ? 'text-lime glow' : 'text-danger'}`}>{res.win ? `+${fmt(res.payout)}★` : 'мимо'}</div>
              : <div className="text-center"><Emo n="glowstar" size={40} className="mx-auto breathe" /><div className="font-display text-2xl mt-1">×{target}</div></div>}
          </div>
        </div>
        <div className="text-center text-xs text-white/50 mt-3">
          Ставка {fmt(amount)}★ → выигрыш {fmt(Math.floor(amount * target))}★
        </div>
      </div>

      <div className="card p-4 mt-3 space-y-3">
        <BetInput value={amount} onChange={setAmount} disabled={spin} />
        <div>
          <div className="flex justify-between text-sm mb-1"><span className="text-white/60">Множитель</span><b>×{target}</b></div>
          <input type="range" min={1.2} max={20} step={0.1} value={target} disabled={spin}
            onChange={e => setTarget(Number(e.target.value))} className="w-full accent-[#b6ff3b]" />
          <div className="flex gap-1.5 mt-2">
            {[1.5, 2, 3, 5, 10, 20].map(t => (
              <button key={t} onClick={() => setTarget(t)} className={`flex-1 h-8 rounded-lg text-xs font-extrabold ${target === t ? 'bg-lime text-jungle' : 'btn-ghost'}`}>×{t}</button>
            ))}
          </div>
        </div>
        <button disabled={spin} onClick={go} className="btn-lime w-full h-14 text-lg">Апгрейд за {fmt(amount)}★</button>
      </div>
    </div>
  );
}
