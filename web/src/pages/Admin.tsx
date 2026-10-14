import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, GAME_NAMES } from '../lib/api';
import { TopBar } from '../ui/kit';
import { Close } from '../ui/icons';
import { SkeletonList } from '../ui/bits';

const Num = ({ label, value, onChange, step = 1 }: any) => (
  <label className="flex items-center justify-between gap-2 text-sm py-1">
    <span className="text-white/60">{label}</span>
    <input type="number" step={step} value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-28 bg-moss rounded-lg px-2 h-9 outline-none border border-white/10 text-right font-bold" />
  </label>
);
const cell = 'bg-moss rounded-lg px-2 h-8 outline-none border border-white/10 w-full text-sm';

export default function Admin() {
  const { toast } = useApp();
  const [st, setSt] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [wds, setWds] = useState<any[]>([]);
  const [delta, setDelta] = useState<Record<number, string>>({});

  const load = () => {
    api('/api/admin/stats').then(setSt);
    api('/api/admin/settings').then(setCfg);
    api('/api/admin/withdrawals').then(setWds);
    api(`/api/admin/users?q=${encodeURIComponent(q)}`).then(setUsers);
  };
  useEffect(load, []);
  const run = async (fn: () => Promise<any>, ok: string) => { try { await fn(); toast(ok); load(); } catch (e: any) { toast(e.message, 'err'); } };
  const save = () => run(() => api('/api/admin/settings', cfg), 'Настройки сохранены');
  const set = (k: string, v: any) => setCfg((c: any) => ({ ...c, [k]: v }));
  const setRow = (k: string, i: number, f: string, v: any) => set(k, cfg[k].map((r: any, j: number) => j === i ? { ...r, [f]: v } : r));

  if (!st || !cfg) return <div className="px-4"><TopBar title="Админка" /><SkeletonList n={5} /></div>;
  const margin = st.total.wagered - st.total.paid;
  return (
    <div className="px-4 space-y-3">
      <TopBar title="Админка" />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Игроков', st.users], ['Онлайн', st.online], ['Пополнения', fmt(st.deposits) + '★'],
          ['Оборот 24ч', fmt(st.day.wagered) + '★'], ['Выплаты 24ч', fmt(st.day.paid) + '★'], ['Доход всего', fmt(margin) + '★']].map(([l, v]) => (
          <div key={l as string} className="card p-2.5"><div className="text-[10px] text-white/50">{l}</div><div className="font-extrabold">{v}</div></div>
        ))}
      </div>
      <div className="card p-3 text-xs">
        {st.byGame.map((g: any) => (
          <div key={g.game} className="flex justify-between py-1"><span>{GAME_NAMES[g.game] ?? g.game} · {g.bets} ставок</span>
            <span>оборот {fmt(g.wagered)}★ · RTP факт {g.wagered ? ((g.paid / g.wagered) * 100).toFixed(1) : 0}%</span></div>
        ))}
      </div>

      <div className="card p-4">
        <div className="font-display text-sm mb-2">Экономика</div>
        <Num label="RTP (0.5–0.99)" value={cfg.rtp} step={0.01} onChange={(v: number) => set('rtp', v)} />
        <Num label="Мин. ставка ★" value={cfg.min_bet} onChange={(v: number) => set('min_bet', v)} />
        <Num label="Макс. ставка ★" value={cfg.max_bet} onChange={(v: number) => set('max_bet', v)} />
        <Num label="Реферальный %" value={cfg.ref_rate} step={0.1} onChange={(v: number) => set('ref_rate', v)} />
        <Num label="Таймер PvP/Арены, сек" value={cfg.jackpot_countdown} onChange={(v: number) => set('jackpot_countdown', v)} />
        <Num label="Комиссия с банка PvP, %" value={cfg.pvp_rake} step={1} onChange={(v: number) => set('pvp_rake', v)} />

        <div className="font-display text-sm mt-4 mb-2">Курс пополнений</div>
        <Num label="Звёзд за 1 ₽" value={cfg.rate_rub} step={0.01} onChange={(v: number) => set('rate_rub', v)} />
        <Num label="Звёзд за 1 TON" value={cfg.rate_ton} step={1} onChange={(v: number) => set('rate_ton', v)} />
        <Num label="Звёзд за 1 USDT" value={cfg.rate_usdt} step={1} onChange={(v: number) => set('rate_usdt', v)} />

        <div className="font-display text-sm mt-4 mb-2">Звания (25 уровней)</div>
        <div className="grid grid-cols-[26px_1.2fr_.7fr_.8fr_1fr] gap-1.5 text-[10px] text-white/50"><span>Ур</span><span>Оборот ★</span><span>Кэшб %</span><span>Приз ★</span><span>Ключ</span></div>
        <div className="max-h-72 overflow-y-auto pr-1">
        {cfg.ranks.map((l: any, i: number) => (
          <div key={i} className="grid grid-cols-[26px_1.2fr_.7fr_.8fr_1fr] gap-1.5 mt-1.5 items-center">
            <span className="text-xs text-white/50 text-center">{i + 1}</span>
            <input type="number" className={cell} value={l.wagered} onChange={e => setRow('ranks', i, 'wagered', Number(e.target.value))} />
            <input type="number" step={0.1} className={cell} value={l.rate} onChange={e => setRow('ranks', i, 'rate', Number(e.target.value))} />
            <input type="number" className={cell} value={l.stars} onChange={e => setRow('ranks', i, 'stars', Number(e.target.value))} />
            <select className={cell} value={l.gift || ''} onChange={e => setRow('ranks', i, 'gift', e.target.value)}>
              <option value="">—</option>
              {cfg.free_cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        ))}
        </div>

        <div className="font-display text-sm mt-4 mb-2">Бесплатные кейсы</div>
        <Num label="Ключ за друга: он наиграл ★" value={cfg.ref_key_wagered} onChange={(v: number) => set('ref_key_wagered', v)} />
        {cfg.free_cases.map((c: any, ci: number) => {
          const setCase = (f: string, v: any) => set('free_cases', cfg.free_cases.map((x: any, j: number) => j === ci ? { ...x, [f]: v } : x));
          const setDrop = (di: number, f: string, v: number) => setCase('drops', c.drops.map((d: any, j: number) => j === di ? { ...d, [f]: v } : d));
          const total = c.drops.reduce((s: number, d: any) => s + Number(d.p), 0) || 1;
          const ev = c.drops.reduce((s: number, d: any) => s + (Number(d.p) / total) * Number(d.stars), 0);
          return (
            <div key={c.id} className="bg-moss/60 rounded-xl p-3 mt-2">
              <div className="flex gap-2 items-center">
                <input className={cell} value={c.title} onChange={e => setCase('title', e.target.value)} />
                <span className="text-[10px] text-white/40 shrink-0">{c.kind === 'daily' ? 'ежедневный' : 'по ключу'}</span>
              </div>
              {c.kind === 'daily' && (
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <label>С уровня<input type="number" className={cell} value={c.minLevel} onChange={e => setCase('minLevel', Number(e.target.value))} /></label>
                  <label>Раз в часов<input type="number" className={cell} value={c.cooldownH} onChange={e => setCase('cooldownH', Number(e.target.value))} /></label>
                </div>
              )}
              <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-[10px] text-white/50 mt-2"><span>Шанс %</span><span>Приз ★</span><span /></div>
              {c.drops.map((d: any, di: number) => (
                <div key={di} className="grid grid-cols-[1fr_1fr_32px] gap-2 mt-1">
                  <input type="number" step={0.1} className={cell} value={d.p} onChange={e => setDrop(di, 'p', Number(e.target.value))} />
                  <input type="number" className={cell} value={d.stars} onChange={e => setDrop(di, 'stars', Number(e.target.value))} />
                  <button className="btn-ghost" onClick={() => setCase('drops', c.drops.filter((_: any, j: number) => j !== di))}><Close size={14} /></button>
                </div>
              ))}
              <div className="flex justify-between items-center mt-2">
                <button className="btn-ghost h-7 px-3 text-xs" onClick={() => setCase('drops', [...c.drops, { p: 1, stars: 10 }])}>+ приз</button>
                <span className="text-[11px] text-white/50">в среднем {ev.toFixed(1)}★ за открытие</span>
              </div>
            </div>
          );
        })}

        <div className="font-display text-sm mt-4 mb-2">Призы недели (топ по обороту)</div>
        <div className="grid grid-cols-[40px_1fr_1.4fr_32px] gap-2 text-[11px] text-white/50"><span>Место</span><span>Звёзды</span><span>Подарок / текст</span><span /></div>
        {cfg.leader_prizes.map((p: any, i: number) => (
          <div key={i} className="grid grid-cols-[40px_1fr_1.4fr_32px] gap-2 mt-1.5">
            <input type="number" className={cell} value={p.place} onChange={e => setRow('leader_prizes', i, 'place', Number(e.target.value))} />
            <input type="number" className={cell} value={p.stars} onChange={e => setRow('leader_prizes', i, 'stars', Number(e.target.value))} />
            <input className={cell} value={p.gift} placeholder="NFT-подарок" onChange={e => setRow('leader_prizes', i, 'gift', e.target.value)} />
            <button className="btn-ghost" onClick={() => set('leader_prizes', cfg.leader_prizes.filter((_: any, j: number) => j !== i))}><Close size={14} /></button>
          </div>
        ))}
        <button className="btn-ghost w-full h-8 mt-2 text-xs" onClick={() => set('leader_prizes', [...cfg.leader_prizes, { place: cfg.leader_prizes.length + 1, stars: 100, gift: '' }])}>+ место</button>
        <button className="btn-lime w-full h-11 mt-4" onClick={save}>Сохранить настройки</button>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button className="btn-ghost h-10 text-xs" onClick={() => confirm('Выдать призы за прошлую неделю?') && run(() => api('/api/admin/leaders/award', {}), 'Призы выданы')}>Призы за прошлую неделю</button>
          <button className="btn-ghost h-10 text-xs" onClick={() => confirm('Выдать призы по текущему топу?') && run(() => api('/api/admin/leaders/award', { current: true }), 'Призы выданы')}>Призы по текущему топу</button>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-display text-sm mb-2">Выводы {st.pendingWithdrawals > 0 && <span className="text-banana">· ждут {st.pendingWithdrawals}</span>}</div>
        {wds.length === 0 && <div className="text-sm text-white/30">Заявок нет</div>}
        {wds.map(w => (
          <div key={w.id} className="flex items-center gap-2 py-1.5 text-sm">
            <span className="flex-1 truncate">{w.username ? '@' + w.username : w.first_name} · {fmt(w.amount)}★</span>
            {w.status === 'pending' ? <>
              <button className="btn-lime px-3 h-8 text-xs" onClick={() => run(() => api(`/api/admin/withdrawals/${w.id}`, { approve: true }), 'Отмечено выплаченным')}>Выплачено</button>
              <button className="btn-ghost px-3 h-8 text-xs" onClick={() => run(() => api(`/api/admin/withdrawals/${w.id}`, { approve: false }), 'Возвращено на баланс')}>Отказ</button>
            </> : <span className="text-xs text-white/40">{w.status === 'paid' ? 'выплачено' : 'отклонено'}</span>}
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="font-display text-sm mb-2">Игроки</div>
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="@username или ID" className={cell + ' h-10'} />
          <button className="btn-ghost px-4" onClick={load}>Найти</button>
        </div>
        {users.map(u => (
          <div key={u.id} className="py-2 border-b border-white/5 text-sm">
            <div className="flex justify-between"><b>{u.username ? '@' + u.username : u.first_name} <span className="text-white/30 font-normal">{u.id}</span></b>
              <span>{fmt(u.balance)}★</span></div>
            <div className="text-[11px] text-white/40">оборот {fmt(u.wagered)}★ · кэшбэк {(u.cashback / 1000).toFixed(2)}★</div>
            <div className="flex gap-2 mt-1.5">
              <input value={delta[u.id] ?? ''} onChange={e => setDelta(d => ({ ...d, [u.id]: e.target.value }))} placeholder="±звёзды" className={cell} />
              <button className="btn-ghost px-3 text-xs" onClick={() => run(() => api('/api/admin/balance', { userId: u.id, delta: Number(delta[u.id]) }), 'Баланс изменён')}>Начислить</button>
              <button className="btn-ghost px-3 text-xs" onClick={() => run(() => api('/api/admin/balance', { userId: u.id, mode: 'set', value: Number(delta[u.id]) || 0 }), 'Баланс выставлен')}>Выставить</button>
              <button className="btn-ghost px-3 text-xs" onClick={() => confirm(`Обнулить баланс ${u.username ? '@' + u.username : u.id}?`) && run(() => api('/api/admin/balance', { userId: u.id, mode: 'set', value: 0 }), 'Баланс обнулён')}>Обнулить</button>
              <button className="btn-ghost px-3 text-xs" onClick={() => run(() => api('/api/admin/ban', { userId: u.id, banned: !u.banned }), u.banned ? 'Разбанен' : 'Забанен')}>{u.banned ? 'Разбан' : 'Бан'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
