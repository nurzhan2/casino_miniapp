import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic, sleep } from '../lib/api';
import { TopBar, BetInput } from '../ui/kit';
import { Bomb, Gem } from '../ui/icons';
import { Emo } from '../ui/emoji';
import { win as fxWin, lose as fxLose } from '../lib/fx';
import { sfx } from '../lib/sfx';
import { Num } from '../ui/bits';

export default function Mines() {
  const { refresh, toast } = useApp();
  const [amount, setAmount] = useState(100);
  const [size, setSize] = useState(5);
  const [mines, setMines] = useState(3);
  const [g, setG] = useState<any>(null);        // состояние игры с сервера
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/api/mines').then(r => { if (r) { setG(r); setSize(r.size); setMines(r.mines); } }); }, []);

  const open = g?.status === 'open';
  const n = (g?.size ?? size) ** 2;
  const maxMines = size * size - 1;

  const start = async () => {
    setBusy(true);
    try { setG(await api('/api/mines/start', { amount, size, mines })); haptic('medium'); refresh(); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  const reveal = async (cell: number) => {
    if (!open || pending !== null || g.revealed.includes(cell)) return;
    setPending(cell);
    haptic('light');
    // «на грани»: клетка трясётся дольше, когда риск выше
    const risk = g.mines / (n - g.revealed.length);
    try {
      if (risk > 0.35) { const el = document.getElementById('mines-grid'); el?.classList.add('near-miss'); setTimeout(() => el?.classList.remove('near-miss'), 500); }
      const [r] = await Promise.all([api('/api/mines/reveal', { cell }), sleep(350 + risk * 900)]);
      setG(r);
      if (r.status === 'lost') { haptic('error'); fxLose('Взрыв!'); }
      else if (r.status === 'won') { haptic('success'); fxWin(r.payout, r.multiplier, r.amount); refresh(); }
      else { haptic('light'); sfx.reveal(); }
    } catch (e: any) { toast(e.message, 'err'); } finally { setPending(null); }
  };

  const cashout = async () => {
    setBusy(true);
    try { const r = await api('/api/mines/cashout', {}); setG(r); haptic('success'); fxWin(r.payout, r.multiplier, r.amount); refresh(); }
    catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  const cells = [...Array(n).keys()];
  const cols = g?.size ?? size;
  return (
    <div className="px-4">
      <TopBar title="Мины" right={g && <span className="text-sm font-extrabold text-lime">×<Num v={g.multiplier} fixed={2} /></span>} />
      <div className={`card p-3 mt-2 ${g?.status === 'lost' ? 'flash-red' : ''}`}>
        <div id="mines-grid" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cells.map(c => {
            const safe = g?.revealed?.includes(c);
            const bomb = g?.minePos?.includes(c);
            const hit = g?.hit === c;
            const shown = safe || (g && g.status !== 'open' && bomb);
            return (
              <button key={c} onClick={() => reveal(c)} disabled={!open}
                className={`aspect-square rounded-xl grid place-items-center transition-all ${cols === 7 ? 'text-xl' : cols === 5 ? 'text-3xl' : 'text-5xl'}
                  ${pending === c ? 'shake bg-banana/30' : ''}
                  ${shown ? (bomb ? (hit ? 'bg-danger pop' : 'bg-danger/25') : 'bg-lime/20 pop') : 'bg-moss border border-white/10 active:scale-95'}`}
                style={{ opacity: !open && !shown && g ? 0.5 : 1, animationDelay: `${(bomb ? c % 7 : 0) * 55}ms` }}>
                {shown ? (bomb ? <Emo n="bomb" size={cols === 7 ? 24 : cols === 5 ? 36 : 54} /> : <Emo n="gem" size={cols === 7 ? 24 : cols === 5 ? 36 : 54} />) : pending === c ? <span className="w-2 h-2 rounded-full bg-banana animate-ping" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-4 mt-3 space-y-3">
        {open ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Ставка <b className="text-white">{fmt(g.amount)}★</b></span>
              <span className="text-white/60">Следующая: <b className="text-lime">×{g.next ?? '—'}</b></span>
            </div>
            <button disabled={busy || g.revealed.length === 0} onClick={cashout} className="btn-lime w-full h-14 text-lg">
              Забрать {fmt(g.amount * g.multiplier)}★
            </button>
          </>
        ) : (
          <>
            {g && <div className={`text-center font-display pop ${g.status === 'won' ? 'text-lime' : 'text-danger'}`}>{g.status === 'won' ? `Выигрыш ${fmt(g.payout)}★` : 'Бум! Попробуй ещё'}</div>}
            <BetInput value={amount} onChange={setAmount} />
            <div className="grid grid-cols-3 gap-2">
              {[3, 5, 7].map(s => (
                <button key={s} onClick={() => { setSize(s); setMines(Math.min(mines, s * s - 1)); setG(null); }}
                  className={`h-10 rounded-xl font-extrabold ${size === s ? 'bg-lime text-jungle' : 'btn-ghost'}`}>{s}×{s}</button>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-white/60">Количество мин</span><b>{mines}</b></div>
              <input type="range" min={1} max={maxMines} value={mines} onChange={e => setMines(Number(e.target.value))} className="w-full accent-[#b6ff3b]" />
            </div>
            <button disabled={busy} onClick={start} className="btn-lime w-full h-14 text-lg">Играть {fmt(amount)}★</button>
          </>
        )}
      </div>
      {g?.proof && <div className="text-[10px] text-white/30 mt-2 break-all px-1">Хэш сида: {g.proof.serverSeedHash} · nonce {g.proof.nonce}</div>}
    </div>
  );
}
