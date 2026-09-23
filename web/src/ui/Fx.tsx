import { useEffect, useRef, useState } from 'react';
import { onFx } from '../lib/fx';
import type { WinEvent } from '../lib/fx';
import { fmt } from '../lib/api';
import { Star } from './kit';

/** Плавный счётчик числа */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const t0 = performance.now(), from = 0;
    const loop = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (target - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return v;
}

/** Полноэкранный оверлей «выиграл / проиграл» */
export function FxOverlay() {
  const [e, setE] = useState<WinEvent | null>(null);
  useEffect(() => onFx(ev => {
    setE(ev);
    setTimeout(() => setE(null), ev.kind === 'win' ? 2100 : 1500);
  }), []);
  if (!e) return null;
  return (
    <div className="fixed inset-0 z-[58] grid place-items-center pointer-events-none px-8">
      {e.kind === 'win' ? <WinCard amount={e.amount ?? 0} multiplier={e.multiplier} /> : (
        <div className="fx-lose text-center">
          <div className="font-display text-4xl text-danger">{e.text}</div>
        </div>
      )}
    </div>
  );
}

function WinCard({ amount, multiplier }: { amount: number; multiplier?: number }) {
  const n = useCountUp(amount, 800);
  return (
    <div className="fx-win text-center">
      {multiplier ? <div className="font-display text-2xl text-banana fx-mult">×{multiplier}</div> : null}
      <div className="relative font-display text-[56px] leading-none text-lime fx-shine">
        +{fmt(n)}<Star size={34} />
      </div>
      <div className="text-xs font-extrabold tracking-[0.3em] uppercase text-white/50 mt-2">Выигрыш</div>
    </div>
  );
}
