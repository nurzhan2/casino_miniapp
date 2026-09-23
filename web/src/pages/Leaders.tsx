import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { api, fmt } from '../lib/api';
import { Avatar, Star, useCountdown } from '../ui/kit';
import { Trophy } from '../ui/icons';
import { Emo } from '../ui/emoji';
import { SkeletonList, Empty } from '../ui/bits';

const MEDAL_STYLE = ['from-[#ffd76a] to-[#e0a000] text-[#3a2800]', 'from-[#dfe7ee] to-[#9fb0bf] text-[#1d2630]', 'from-[#e7a86a] to-[#b06a2c] text-[#2e1806]'];

export default function Leaders() {
  const { me } = useApp();
  const [period, setPeriod] = useState<'current' | 'previous'>('current');
  const [d, setD] = useState<any>(null);
  useEffect(() => { setD(null); api(`/api/leaders?period=${period}`).then(setD); }, [period]);
  const left = useCountdown(period === 'current' ? d?.to : undefined);
  const days = Math.floor(left / 86400), hrs = Math.floor((left % 86400) / 3600);

  const podium = [1, 0, 2].map(i => ({ r: d?.list[i], prize: d?.prizes.find((p: any) => p.place === i + 1), place: i + 1 }));
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mt-1">
        <div className="font-display text-xl flex items-center gap-2"><Trophy size={20} className="text-banana" />Лидеры</div>
        <div className="flex bg-moss rounded-xl p-1 text-xs font-extrabold">
          {(['current', 'previous'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg ${period === p ? 'bg-lime text-jungle' : 'text-white/60'}`}>
              {p === 'current' ? 'Эта неделя' : 'Прошлая'}</button>
          ))}
        </div>
      </div>
      {period === 'current' && d && <div className="text-xs text-white/50 mt-1">Итоги через {days}д {hrs}ч · рейтинг по сумме ставок</div>}

      <div className="grid grid-cols-3 gap-2 items-end mt-4">
        {podium.map(({ r, prize, place }) => (
          <div key={place} className={`card text-center p-3 ${place === 1 ? 'pb-6 border-banana/40 bg-gradient-to-b from-banana/15 to-transparent' : ''}`}>
            <Emo n={`medal${place}`} size={place === 1 ? 40 : 32} className="mx-auto" />
            <div className="flex justify-center my-2"><Avatar src={r?.photo} name={r?.name ?? '?'} size={place === 1 ? 52 : 40} /></div>
            <div className="text-xs font-extrabold truncate">{r?.name ?? '—'}</div>
            <div className="text-[10px] text-white/50">{r ? `${fmt(r.wagered)}★` : 'свободно'}</div>
            {prize && <div className="mt-2 text-[11px] font-extrabold bg-lime/15 text-lime rounded-full py-0.5">
              {prize.stars > 0 && `${fmt(prize.stars)}★`}{prize.gift && ` ${prize.gift}`}</div>}
          </div>
        ))}
      </div>

      {d?.mine && d.mine.place > 3 && <div className="card mt-3 p-3 flex items-center gap-2 border-lime/30">
        <span className="w-8 text-center font-extrabold text-lime">#{d.mine.place}</span>
        <span className="flex-1 font-bold">Ты</span><span><Star /> {fmt(d.mine.wagered)}</span>
      </div>}

      <div className="card mt-3 p-2">
        {!d && <SkeletonList n={6} />}
        {d?.list.length === 0 && <Empty text="На этой неделе ещё никто не играл — стань первым" emo="trophy" />}
        {d?.list.slice(3).map((r: any, i: number) => (
          <div key={r.id} style={{ animationDelay: `${i * 35}ms` }} className={`row-in row-hover flex items-center gap-2 px-2 py-2 rounded-xl ${r.id === me.id ? 'bg-lime/10' : ''}`}>
            <span className="w-8 text-center text-sm font-extrabold text-white/50">{r.place}</span>
            <Avatar src={r.photo} name={r.name} size={28} />
            <span className="flex-1 text-sm truncate">{r.name}</span>
            <span className="text-sm font-bold"><Star /> {fmt(r.wagered)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
