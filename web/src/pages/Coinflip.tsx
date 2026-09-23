import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic, sleep } from '../lib/api';
import { TopBar, BetInput } from '../ui/kit';
import { Logo, Bolt, StarIcon } from '../ui/icons';
import { Emo } from '../ui/emoji';
import { win as fxWin, lose as fxLose } from '../lib/fx';

const SIDES = [
  { k: 'heads', t: 'Орёл', e: 'kong', c: 'from-[#3bc9ff] to-[#0e5f86]' },
  { k: 'edge', t: 'Ребро', e: 'bolt', c: 'from-[#ff5a5a] to-[#7d1c1c]' },
  { k: 'tails', t: 'Решка', e: 'banana', c: 'from-[#8b5cff] to-[#3b1d8a]' },
];

export default function Coinflip() {
  const { refresh, toast } = useApp();
  const [amount, setAmount] = useState(100);
  const [odds, setOdds] = useState<any>({ heads: 2, tails: 2, edge: 19 });
  const [rot, setRot] = useState({ y: 0, x: 0 });
  const [spinning, setSpinning] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => { api('/api/coinflip/odds').then(setOdds); }, []);

  const flip = async (side: string) => {
    if (spinning) return;
    setSpinning(true); setRes(null); haptic('medium');
    try {
      const r = await api('/api/coinflip', { amount, side });
      // долгое вращение с замедлением в конце — момент «на грани»
      const turns = 360 * 8;
      const baseY = Math.ceil(rot.y / 360) * 360 + turns;
      setRot({ y: baseY + (r.result === 'tails' ? 180 : 0), x: r.result === 'edge' ? 90 : 0 });
      await sleep(2600);
      setRes(r);
      setRecent(x => [r.result, ...x].slice(0, 12));
      if (r.payout > 0) { haptic('success'); fxWin(r.payout, r.multiplier, amount); } else { haptic('error'); fxLose('Мимо'); }
      refresh();
    } catch (e: any) { toast(e.message, 'err'); } finally { setSpinning(false); }
  };

  return (
    <div className="px-4">
      <TopBar title="Coinflip" />
      <div className="card mt-2 h-64 grid place-items-center relative overflow-hidden" style={{ perspective: 800 }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,#b6ff3b1f,transparent_60%)]" />
        <div className="relative w-36 h-36" style={{ transformStyle: 'preserve-3d', transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`, transition: spinning ? 'transform 2.6s cubic-bezier(.15,.7,.1,1)' : 'none' }}>
          <div className="absolute inset-0 rounded-full grid place-items-center bg-gradient-to-br from-banana to-[#c98a00] border-4 border-[#ffe98a] shadow-2xl" style={{ backfaceVisibility: 'hidden' }}><Emo n="kong" size={96} /></div>
          <div className="absolute inset-0 rounded-full grid place-items-center bg-gradient-to-br from-lime to-[#5e9b10] border-4 border-[#e2ffb0] shadow-2xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><Emo n="banana" size={92} /></div>
        </div>
        {res && <div className={`absolute bottom-4 font-display pop ${res.payout > 0 ? 'text-lime glow' : 'text-danger'}`}>
          {res.payout > 0 ? `+${fmt(res.payout)}★` : `${SIDES.find(s => s.k === res.result)?.t} — мимо`}</div>}
      </div>

      <div className="flex gap-1.5 py-2 overflow-x-auto no-scrollbar">
        {recent.map((r, i) => <span key={i} className="w-7 h-7 rounded-lg bg-moss grid place-items-center text-white/70"><Emo n={SIDES.find(s => s.k === r)?.e || 'coin'} size={20} /></span>)}
      </div>

      <div className="card p-4 space-y-3">
        <BetInput value={amount} onChange={setAmount} disabled={spinning} />
        <div className="grid grid-cols-3 gap-2">
          {SIDES.map(s => (
            <button key={s.k} disabled={spinning} onClick={() => flip(s.k)} className={`bg-gradient-to-br ${s.c} rounded-2xl py-3.5 font-extrabold active:scale-95 transition`}>
              <div className="flex justify-center mb-1"><Emo n={s.e} size={34} /></div>
              <div className="text-sm">{s.t}</div>
              <div className="text-xs opacity-80">×{odds[s.k]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
