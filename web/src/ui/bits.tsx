import { useEffect, useRef, useState } from 'react';
import { Emo } from './emoji';
import { sfx } from '../lib/sfx';
import { haptic } from '../lib/api';

/** Мерцающая заглушка на время загрузки */
export const Skeleton = ({ h = 44, className = '' }: { h?: number; className?: string }) => (
  <div className={`skeleton rounded-xl ${className}`} style={{ height: h }} />
);

export const SkeletonList = ({ n = 5, h = 44 }: { n?: number; h?: number }) => (
  <div className="space-y-2 p-1">{[...Array(n)].map((_, i) => (
    <Skeleton key={i} h={h} className="opacity-0 animate-[fade-in_.3s_ease-out_forwards]" />
  ))}</div>
);

/** Пустое состояние с живой гориллой */
export const Empty = ({ text, emo = 'kong' }: { text: string; emo?: string }) => (
  <div className="py-10 text-center">
    <Emo n={emo} size={72} className="mx-auto bob" />
    <div className="text-sm text-white/45 mt-3">{text}</div>
  </div>
);

/** Подтверждение крупной ставки: тянуть до конца */
export function ConfirmSlide({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [p, setP] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (clientX - r.left - 28) / (r.width - 56)));
    setP(v);
    if (v > 0.12 && v < 0.98) sfx.tick(v * 4);
    if (v >= 0.98 && !done.current) { done.current = true; haptic('success'); sfx.bet(); onConfirm(); }
  };
  const end = () => { if (!done.current) setP(0); };

  return (
    <div ref={box} className="relative h-14 rounded-2xl bg-moss border border-lime/30 overflow-hidden select-none"
      onPointerMove={e => e.buttons && move(e.clientX)}
      onTouchMove={e => move(e.touches[0].clientX)}
      onPointerUp={end} onTouchEnd={end} onPointerLeave={end}>
      <div className="absolute inset-y-0 left-0 bg-lime/25" style={{ width: `${p * 100}%` }} />
      <div className="absolute inset-0 grid place-items-center text-sm font-extrabold text-white/70 pointer-events-none">{label}</div>
      <div className="absolute top-1.5 bottom-1.5 w-11 rounded-xl btn-lime grid place-items-center text-xl"
        style={{ left: `calc(6px + ${p} * (100% - 56px))`, transition: p ? 'none' : 'left .3s cubic-bezier(.2,1.4,.4,1)' }}>›</div>
    </div>
  );
}

/** Счётчик, который докручивается при каждом изменении */
export function Num({ v, fixed = 0, className = '' }: { v: number; fixed?: number; className?: string }) {
  const [shown, setShown] = useState(v);
  const from = useRef(v);
  useEffect(() => {
    const start = from.current, t0 = performance.now();
    if (start === v) return;
    let raf = 0;
    const loop = (t: number) => {
      const k = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - k, 3);
      setShown(start + (v - start) * e);
      if (k < 1) raf = requestAnimationFrame(loop); else from.current = v;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return <span className={`tabular-nums ${className}`}>{shown.toLocaleString('ru-RU', { maximumFractionDigits: fixed, minimumFractionDigits: fixed })}</span>;
}
