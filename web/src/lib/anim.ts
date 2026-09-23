// Анимационные хуки
import { useEffect, useRef, useState } from 'react';

/** Плавный счётчик: докручивает от прошлого значения к новому */
export function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    const start = from.current, t0 = performance.now();
    if (start === target) return;
    const loop = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      setV(start + (target - start) * e);
      if (p < 1) raf.current = requestAnimationFrame(loop);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return v;
}

/** Возвращает true на короткое время после изменения значения — для подсветки */
export function useFlash(value: any, ms = 700) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setOn(true);
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [value]);
  return on;
}

/** Значение с предыдущего рендера */
export function usePrev<T>(v: T) {
  const r = useRef<T>(v);
  useEffect(() => { r.current = v; }, [v]);
  return r.current;
}
