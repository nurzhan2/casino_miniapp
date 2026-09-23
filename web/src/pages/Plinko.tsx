import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic } from '../lib/api';
import { TopBar, BetInput } from '../ui/kit';
import { win as fxWin, lose as fxLose } from '../lib/fx';

const RISKS: [string, string][] = [['low', 'Низкий'], ['mid', 'Средний'], ['high', 'Высокий']];

export default function Plinko() {
  const { refresh, toast } = useApp();
  const [amount, setAmount] = useState(100);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState('mid');
  const [table, setTable] = useState<number[]>([]);
  const [ball, setBall] = useState<{ x: number; y: number } | null>(null);
  const [hits, setHits] = useState<{ slot: number; m: number; id: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const raf = useRef(0);

  useEffect(() => { api(`/api/plinko/table?rows=${rows}&risk=${risk}`).then(t => setTable(t.map((x: any) => x.m))); }, [rows, risk]);

  const drop = async () => {
    if (busy) return;
    setBusy(true);
    haptic('light');
    try {
      const r = await api('/api/plinko', { amount, rows, risk });
      await animate(r.path);
      setHits(h => [{ slot: r.slot, m: r.multiplier, id: Date.now() }, ...h].slice(0, 8));
      if (r.payout > amount) { haptic('success'); fxWin(r.payout, r.multiplier, amount); }
      else haptic('warning');
      refresh();
    } catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); setBall(null); }
  };

  /** Шарик идёт по пути с сервера: влево-вправо на каждом ряду */
  const animate = (path: number[]) => new Promise<void>(res => {
    const step = 190, t0 = performance.now();
    const loop = (t: number) => {
      const p = Math.min(path.length, (t - t0) / step);
      const i = Math.floor(p), frac = p - i;
      const rights = path.slice(0, i).reduce((a, b) => a + b, 0) + (path[i] ?? 0) * frac;
      const offset = rights - p / 2;                       // смещение в шагах от центра
      setBall({ x: Math.min(0.96, Math.max(0.04, 0.5 + offset / rows)), y: p / path.length });
      if (p < path.length) raf.current = requestAnimationFrame(loop);
      else { haptic('medium'); res(); }
    };
    raf.current = requestAnimationFrame(loop);
  });
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const color = (m: number) => m >= 5 ? '#ff3bd4' : m >= 2 ? '#ffb13b' : m >= 1 ? '#b6ff3b' : '#3c5545';
  const pegs = [...Array(rows).keys()];

  return (
    <div className="px-4">
      <TopBar title="Plinko" right={<span className="text-xs text-white/40">RTP 95%</span>} />

      <div className="card p-3 mt-2 relative overflow-hidden" style={{ aspectRatio: '1 / 0.92' }}>
        <div className="absolute inset-3 bottom-8">
          {pegs.map(r => (
            <div key={r} className="absolute flex justify-center gap-[3%] w-full" style={{ top: `${(r / rows) * 100}%` }}>
              {[...Array(r + 3).keys()].map(c => <span key={c} className="w-1.5 h-1.5 rounded-full bg-white/25" />)}
            </div>
          ))}
          {ball && (
            <div className="absolute w-3.5 h-3.5 rounded-full bg-lime shadow-[0_0_14px_#b6ff3b] -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${ball.x * 100}%`, top: `${ball.y * 100}%` }} />
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3 flex gap-[2px]">
          {table.map((m, i) => (
            <div key={i} className={`flex-1 rounded text-center text-[9px] font-extrabold py-1 transition ${hits[0]?.slot === i && !busy ? 'scale-110' : ''}`}
              style={{ background: color(m) + '33', color: color(m) }}>{m}</div>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 py-2 overflow-x-auto no-scrollbar">
        {hits.map(h => <span key={h.id} className="shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full"
          style={{ background: color(h.m) + '22', color: color(h.m) }}>×{h.m}</span>)}
      </div>

      <div className="card p-4 space-y-3">
        <BetInput value={amount} onChange={setAmount} disabled={busy} />
        <div className="grid grid-cols-3 gap-2">
          {[8, 12, 16].map(r => (
            <button key={r} onClick={() => setRows(r)} className={`h-10 rounded-xl font-extrabold text-sm ${rows === r ? 'bg-lime text-jungle' : 'btn-ghost'}`}>{r} рядов</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {RISKS.map(([k, t]) => (
            <button key={k} onClick={() => setRisk(k)} className={`h-10 rounded-xl font-extrabold text-sm ${risk === k ? 'bg-lime text-jungle' : 'btn-ghost'}`}>{t}</button>
          ))}
        </div>
        <button disabled={busy} onClick={drop} className="btn-lime w-full h-14 text-lg">Бросить {fmt(amount)}★</button>
      </div>
    </div>
  );
}
