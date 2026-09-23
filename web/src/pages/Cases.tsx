import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic } from '../lib/api';
import { TopBar } from '../ui/kit';
import { Emo } from '../ui/emoji';
import { win as fxWin, lose as fxLose } from '../lib/fx';
import { sfx } from '../lib/sfx';

const ICON = ['gem', 'coin', 'banana', 'bag', 'glowstar'];
const ITEM_W = 92;

export default function Cases() {
  const { refresh, toast } = useApp();
  const [cases, setCases] = useState<any[]>([]);
  const [sel, setSel] = useState(0);
  const [strip, setStrip] = useState<number[]>([]);
  const [offset, setOffset] = useState(0);
  const [spin, setSpin] = useState(false);
  const [res, setRes] = useState<any>(null);
  const busy = useRef(false);

  useEffect(() => { api('/api/cases').then(c => { setCases(c); setStrip([...Array(40).keys()].map(i => i % c[0].drops.length)); }); }, []);
  const c = cases[sel];

  const open = async () => {
    if (busy.current || !c) return;
    busy.current = true; setSpin(false); setRes(null); setOffset(0);
    try {
      const r = await api('/api/cases/open', { case: c.id });
      // лента: случайные предметы, на 35-й позиции — выпавший
      const line = [...Array(45).keys()].map(() => Math.floor(Math.random() * c.drops.length));
      line[35] = r.index;
      setStrip(line);
      requestAnimationFrame(() => { setSpin(true); setOffset(35 * ITEM_W); });
      haptic('medium'); sfx.spin();
      await new Promise(s => setTimeout(s, 4400));
      setRes(r);
      if (r.payout > c.price) { haptic('success'); fxWin(r.payout, r.multiplier, c.price); } else haptic('warning');
      refresh();
    } catch (e: any) { toast(e.message, 'err'); } finally { busy.current = false; setSpin(false); }
  };

  if (!c) return <TopBar title="Кейсы" />;
  return (
    <div className="px-4">
      <TopBar title="Кейсы" />

      <div className="grid grid-cols-3 gap-2 mt-2">
        {cases.map((x, i) => (
          <button key={x.id} onClick={() => setSel(i)} data-tilt="6" className={`card py-3 px-2 text-center ${sel === i ? 'border-lime/50 bg-lime/5' : ''}`}>
            <Emo n={i === 0 ? 'coin' : i === 1 ? 'bag' : 'glowstar'} size={34} className="mx-auto" />
            <div className="text-[11px] font-extrabold mt-1">{x.title}</div>
            <div className="text-[10px] text-lime">{fmt(x.price)}★</div>
          </button>
        ))}
      </div>

      <div className="card mt-3 py-5 relative overflow-hidden">
        <div className="absolute left-1/2 inset-y-3 w-0.5 bg-lime -translate-x-1/2 z-10 shadow-[0_0_12px_#b6ff3b]" />
        <div className="flex" style={{
          transform: `translateX(calc(50% - ${offset + ITEM_W / 2}px))`,
          transition: spin ? 'transform 4.3s cubic-bezier(.08,.7,.05,1)' : 'none',
        }}>
          {strip.map((d, i) => (
            <div key={i} className="shrink-0 grid place-items-center gap-1" style={{ width: ITEM_W }}>
              <div className="w-[72px] h-[72px] rounded-2xl bg-moss border border-white/10 grid place-items-center">
                <Emo n={ICON[d % ICON.length]} size={40} className={spin ? '' : 'tile-float'} />
              </div>
              <div className="text-[10px] font-extrabold text-white/60">×{c.drops[d].m}</div>
            </div>
          ))}
        </div>
      </div>

      {res && <div className={`text-center font-display mt-3 pop ${res.payout > c.price ? 'text-lime glow' : 'text-white/60'}`}>
        Выпало ×{res.multiplier} — {fmt(res.payout)}★
      </div>}

      <div className="card p-4 mt-3 space-y-3">
        <button disabled={spin} onClick={open} className="btn-lime w-full h-14 text-lg">Открыть за {fmt(c.price)}★</button>
        <div className="grid grid-cols-5 gap-1.5 text-[11px]">
          {c.drops.map((d: any, i: number) => (
            <div key={i} className="bg-moss rounded-lg py-1.5 text-center">
              <div className="font-extrabold text-lime">×{d.m}</div>
              <div className="text-white/40">{(d.p * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
