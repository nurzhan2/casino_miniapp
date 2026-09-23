import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt, haptic, tg, GAME_NAMES } from '../lib/api';
import { Avatar, Star } from '../ui/kit';
import { tonPay } from '../lib/ton';
import { Settings, Shield } from '../ui/icons';

export default function Profile() {
  const { me, refresh, toast, go } = useApp();
  const [bets, setBets] = useState<any[]>([]);
  const [dep, setDep] = useState(100);
  const [pays, setPays] = useState<any[]>([]);
  const [ton, setTon] = useState<any>(null);
  const [wd, setWd] = useState('');
  const [seed, setSeed] = useState('');
  const [revealed, setRevealed] = useState<any>(null);

  useEffect(() => { api('/api/bets').then(setBets); }, [me.balance]);
  useEffect(() => { api('/api/deposit/methods').then(setPays).catch(() => {}); }, []);

  const deposit = async (method: string) => {
    setTon(null);
    try {
      const r = await api('/api/deposit', { amount: dep, method });
      if (r.type === 'ton') { setTon(r); return; }                       // показываем адрес и комментарий
      if (method === 'stars' && tg?.openInvoice) {
        tg.openInvoice(r.link, (st: string) => { if (st === 'paid') { haptic('success'); toast(`+${fmt(dep)}★ зачислено`); setTimeout(refresh, 800); } });
      } else if (tg?.openLink) tg.openLink(r.link);
      else window.open(r.link);
    } catch (e: any) { toast(e.message, 'err'); }
  };
  const copyTon = (v: string) => { navigator.clipboard?.writeText(v); toast('Скопировано'); };
  const withdraw = async () => {
    try { await api('/api/withdraw', { amount: Number(wd) }); toast('Заявка на вывод отправлена'); setWd(''); refresh(); }
    catch (e: any) { toast(e.message, 'err'); }
  };
  const rotate = async () => {
    try { setRevealed(await api('/api/fair/rotate', { clientSeed: seed })); setSeed(''); refresh(); }
    catch (e: any) { toast(e.message, 'err'); }
  };
  const faucet = async () => { await api('/api/dev/faucet', {}); refresh(); toast('+5000★ (тест)'); };

  return (
    <div className="px-4 space-y-3 mt-1">
      <div className="card p-4 flex items-center gap-3">
        <Avatar src={me.photo} name={me.name} size={56} />
        <div className="flex-1">
          <div className="font-display">{me.name}</div>
          <div className="text-xs text-white/50">Оборот {fmt(me.wagered)}★ · ур. {me.level.index}</div>
        </div>
        {me.isAdmin && <button onClick={() => go('admin')} className="btn-ghost px-3 py-2 text-xs"><Settings size={14} className="inline-block align-[-2px] mr-1" />Админка</button>}
      </div>

      <div className="card p-4">
        <div className="text-xs text-white/50 font-bold">Баланс</div>
        <div className="font-display text-4xl mt-1 tabular-nums"><Star /> {fmt(me.balance)}</div>
        <div className="grid grid-cols-5 gap-1.5 mt-4">
          {[50, 100, 500, 1000, 5000].map(v => (
            <button key={v} onClick={() => setDep(v)} className={`h-9 rounded-lg text-xs font-extrabold ${dep === v ? 'bg-lime text-jungle' : 'btn-ghost'}`}>{v}</button>
          ))}
        </div>
        <div className="space-y-2 mt-2">
          {pays.length === 0 && <div className="text-xs text-white/40 text-center py-2">Способы пополнения пока не подключены</div>}
          {pays.map((p: any, i: number) => (
            <button key={p.id} onClick={() => deposit(p.id)} className={`w-full h-12 flex items-center justify-between px-4 ${i === 0 ? 'btn-lime' : 'btn-ghost'}`}>
              <span className="font-extrabold">{p.title}</span>
              <span className={`text-xs ${i === 0 ? 'opacity-70' : 'text-white/45'}`}>
                {p.id === 'stars' ? `${fmt(dep)}★` : `≈ ${(dep / p.rate).toFixed(p.unit === '₽' ? 0 : 2)} ${p.unit}`}
              </span>
            </button>
          ))}
        </div>
        {ton && (
          <div className="card p-3 mt-2 text-xs space-y-2 border border-lime/30">
            <div className="font-display text-sm">Перевод в TON</div>
            <div className="text-white/50">Отправьте точную сумму и обязательно укажите комментарий — по нему зачислится баланс.</div>
            <button onClick={() => copyTon(ton.address)} className="w-full text-left bg-moss rounded-lg px-3 py-2 break-all">{ton.address}</button>
            <div className="flex gap-2">
              <button onClick={() => copyTon(ton.amount)} className="flex-1 bg-moss rounded-lg px-3 py-2 text-left">{ton.amount} TON</button>
              <button onClick={() => copyTon(ton.comment)} className="flex-1 bg-moss rounded-lg px-3 py-2 text-left">{ton.comment}</button>
            </div>
            <button onClick={async () => {
              try { await tonPay(ton.address, ton.amount, ton.comment); toast('Платёж отправлен — баланс появится через минуту'); }
              catch { tg?.openLink ? tg.openLink(ton.link) : window.open(ton.link); }
            }} className="btn-lime w-full h-10">Оплатить из кошелька</button>
            <button onClick={() => (tg?.openLink ? tg.openLink(ton.link) : window.open(ton.link))} className="btn-ghost w-full h-9 text-xs">Открыть ссылку вручную</button>
          </div>
        )}
        {!tg?.initData && <button onClick={faucet} className="btn-ghost w-full h-10 mt-2 text-sm">Тестовые 5000★ (dev)</button>}
        <div className="flex gap-2 mt-3">
          <input value={wd} onChange={e => setWd(e.target.value.replace(/\D/g, ''))} placeholder="Сумма вывода (от 100)"
            className="flex-1 bg-moss rounded-xl px-3 h-11 outline-none border border-white/10 text-sm" />
          <button onClick={withdraw} disabled={!wd} className="btn-ghost px-4">Вывести</button>
        </div>
      </div>

      <div className="card p-3">
        <div className="text-xs text-white/50 font-bold mb-2 px-1">Последние игры</div>
        {bets.length === 0 && <div className="text-sm text-white/30 p-2">Пока нет игр</div>}
        {bets.map(b => (
          <div key={b.id} className="row-hover flex items-center gap-2 px-1 py-1.5 text-sm">
            <span className="flex-1">{GAME_NAMES[b.game] ?? b.game}</span>
            <span className="text-white/50">{fmt(b.amount)}★</span>
            <span className={`w-20 text-right font-extrabold ${b.payout > b.amount ? 'text-lime' : b.payout === b.amount ? 'text-white/60' : 'text-danger'}`}>
              {b.payout > 0 ? `+${fmt(b.payout)}` : `−${fmt(b.amount)}`}</span>
          </div>
        ))}
      </div>

      <div className="card p-4 text-xs space-y-2">
        <div className="font-display text-sm"><Shield size={15} className="inline-block align-[-3px] mr-1.5 text-lime" />Честная игра</div>
        <div className="text-white/50">Результат = HMAC-SHA256(server seed, client seed:nonce). Хэш server seed известен заранее — после смены сида его можно проверить.</div>
        <div className="break-all"><span className="text-white/40">Хэш server seed:</span> {me.fair.serverSeedHash}</div>
        <div><span className="text-white/40">Client seed:</span> {me.fair.clientSeed} · <span className="text-white/40">nonce:</span> {me.fair.nonce}</div>
        <div className="flex gap-2">
          <input value={seed} onChange={e => setSeed(e.target.value)} placeholder="Свой client seed"
            className="flex-1 bg-moss rounded-lg px-3 h-9 outline-none border border-white/10" />
          <button onClick={rotate} className="btn-ghost px-3">Сменить</button>
        </div>
        {revealed && <div className="break-all text-lime/80">Раскрыт прошлый server seed: {revealed.revealedServerSeed}</div>}
      </div>
    </div>
  );
}
