import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic, sleep } from '../lib/api';
import { TopBar, BetInput } from '../ui/kit';
import { Emo } from '../ui/emoji';
import { Num } from '../ui/bits';
import { win as fxWin, lose as fxLose, confetti } from '../lib/fx';
import { sfx } from '../lib/sfx';

const DIFFS: [string, string, string][] = [
  ['easy', 'Лёгкий', '4 · 1'], ['medium', 'Средний', '3 · 1'], ['hard', 'Сложный', '2 · 1'],
  ['extreme', 'Экстрим', '3 · 2'], ['nightmare', 'Кошмар', '4 · 3'],
];
const ROWS = 9;

export default function Tower() {
  const { refresh, toast } = useApp();
  const [amount, setAmount] = useState(100);
  const [diff, setDiff] = useState('easy');
  const [table, setTable] = useState<number[]>([]);
  const [g, setG] = useState<any>(null);          // текущая или последняя игра
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => { api('/api/tower').then(s => { if (s) { setG(s); setDiff(s.diff); } }).catch(() => {}); }, []);
  useEffect(() => { api(`/api/tower/table?diff=${diff}`).then(setTable); }, [diff]);

  const open = g?.status === 'open';
  const cols = g?.cols ?? ({ easy: 4, medium: 3, hard: 2, extreme: 3, nightmare: 4 } as any)[diff];
  const rows = g?.table ?? table;

  const start = async () => {
    setBusy(true);
    try { const s = await api('/api/tower/start', { amount, diff }); setG(s); haptic('medium'); refresh(); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  const step = async (col: number) => {
    if (!open || busy) return;
    setBusy(true);
    setPending({ row: g.level, col });
    haptic('light');
    try {
      // пауза растёт к вершине — напряжение «на грани»
      const [r] = await Promise.all([api('/api/tower/step', { col }), sleep(260 + g.level * 70)]);
      setG(r);
      if (r.status === 'lost') { haptic('error'); fxLose('Сорвался!'); refresh(); }
      else if (r.status === 'won') { haptic('success'); fxWin(r.payout, r.multiplier, r.amount); confetti(200); refresh(); }
      else { sfx.reveal(); }
    } catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); setPending(null); }
  };

  const cashout = async () => {
    setBusy(true);
    try { const r = await api('/api/tower/cashout', {}); setG(r); haptic('success'); fxWin(r.payout, r.multiplier, r.amount); refresh(); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  /** Что показать в ячейке */
  const cell = (row: number, col: number) => {
    if (!g) return null;
    const picked = g.picks[row] === col;
    const passed = row < g.level;
    const reveal = g.status !== 'open';
    const isBad = g.bad[row]?.includes(col);
    if (pending && pending.row === row && pending.col === col) return <span className="w-2.5 h-2.5 rounded-full bg-banana animate-ping" />;
    if ((passed || reveal) && picked && !isBad) return <Emo n="banana" size={30} className="pop" />;
    if (reveal && isBad) return <Emo n="bomb" size={picked ? 34 : 24} className={picked ? 'pop' : 'opacity-60'} />;
    if (passed && isBad) return <Emo n="bomb" size={22} className="opacity-35" />;
    return null;
  };

  return (
    <div className="px-4">
      <TopBar title="Tower" right={open && <span className="text-sm font-extrabold text-lime">×<Num v={g.multiplier} fixed={2} /></span>} />

      <div className="card p-3 mt-2 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(80% 60% at 50% 0%, #b6ff3b22, transparent 70%)' }} />
        <div className="relative flex flex-col-reverse gap-1.5">
          {[...Array(ROWS).keys()].map(row => {
            const current = open && row === g.level;
            const done = g && row < g.level;
            return (
              <div key={row} className={`flex items-center gap-2 transition ${current ? 'scale-[1.03]' : ''}`}>
                <div className={`w-14 text-right text-[11px] font-extrabold tabular-nums ${current ? 'text-lime' : done ? 'text-lime/50' : 'text-white/35'}`}>
                  ×{rows[row] ?? '—'}
                </div>
                <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                  {[...Array(cols).keys()].map(col => (
                    <button key={col} disabled={!current || busy} onClick={() => step(col)}
                      className={`h-11 rounded-xl grid place-items-center border transition
                        ${current ? 'bg-lime/15 border-lime/50 pulse-lime hover:bg-lime/30' : done && g.picks[row] === col ? 'bg-lime/20 border-lime/40' : 'bg-moss border-white/8'}
                        ${g?.status === 'lost' && g.picks[row] === col && g.bad[row]?.includes(col) ? 'bg-danger/30 border-danger shake' : ''}`}>
                      {cell(row, col)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="relative flex justify-center mt-3"><Emo n="kong" size={46} className={open ? 'bob' : 'breathe'} /></div>
      </div>

      <div className="card p-4 mt-3 space-y-3">
        {open ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Ряд {g.level} из {ROWS}</span>
              <span>следующий <b className="text-lime">×{g.next}</b></span>
            </div>
            <button disabled={busy || g.level === 0} onClick={cashout} className="btn-lime w-full h-14 text-lg pulse-lime">
              {g.level === 0 ? 'Выберите ячейку в нижнем ряду' : `Забрать ${fmt(g.amount * g.multiplier)}★`}
            </button>
          </>
        ) : (
          <>
            <BetInput value={amount} onChange={setAmount} disabled={busy} />
            <div className="grid grid-cols-5 gap-1.5">
              {DIFFS.map(([k, t, hint]) => (
                <button key={k} onClick={() => setDiff(k)}
                  className={`rounded-xl py-2 text-[11px] font-extrabold leading-tight ${diff === k ? 'bg-lime text-jungle' : 'btn-ghost'}`}>
                  {t}<div className={`text-[9px] ${diff === k ? 'opacity-60' : 'text-white/35'}`}>{hint}</div>
                </button>
              ))}
            </div>
            <button disabled={busy} onClick={start} className="btn-lime w-full h-14 text-lg">Начать за {fmt(amount)}★</button>
            {g && <div className={`text-center text-sm font-bold ${g.status === 'won' ? 'text-lime' : 'text-danger'}`}>
              {g.status === 'won' ? `Забрано ${fmt(g.payout)}★ на ×${g.multiplier}` : `Сорвался на ${g.level + 1}-м ряду`}
            </div>}
          </>
        )}
      </div>
      {g?.proof && <div className="text-[10px] text-white/25 text-center mt-3 break-all">Хэш сида: {g.proof.serverSeedHash} · nonce {g.proof.nonce}</div>}
    </div>
  );
}
