// Звания: роутер, главная, BitKong-страница, админка. node scripts/ranks-web.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const sub = (f, pairs) => {
  let s = readFileSync(P + f, 'utf8');
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 60)); s = s.split(a).join(b); }
  writeFileSync(P + f, s, 'utf8'); console.log('ok', f);
};

sub('main.tsx', [
  ["import Tower from './pages/Tower';", "import Tower from './pages/Tower';\nimport Ranks from './pages/Ranks';"],
  ['tower: <Tower />,', 'tower: <Tower />, ranks: <Ranks />,'],
]);

sub('pages/Home.tsx', [
  ["  { k: 'cases', t: 'Кейсы', d: 'Три кейса, редкие дропы', e: 'bag', a: '#c88cff', b: '#4a2470' },",
   "  { k: 'ranks', t: 'Кейсы', d: 'Бесплатные кейсы каждый день и награды за звания', e: 'cub', a: '#ff9f3b', b: '#7a3a0c', tag: 'FREE' },"],
]);

// BitKong: прогресс уровня без списка из 25 колонок, ссылка на звания
sub('pages/BitKong.tsx', [
  ["  const lv = me.level, levels = me.levels as any[];\n  const cur = levels[lv.index - 1];\n", "  const lv = me.level;\n  const { go } = useApp();\n"],
  ["  const progress = lv.next ? Math.min(1, (me.wagered - cur.wagered) / (lv.next.wagered - cur.wagered)) : 1;",
   "  const progress = lv.next ? Math.min(1, (me.wagered - lv.from) / (lv.next.wagered - lv.from)) : 1;"],
  ['<div className="font-display">{lv.rate}% <span className="text-lime">/ Уровень {lv.index}</span></div>',
   '<div className="font-display">{lv.rate}% <span className="text-lime">/ {lv.name}</span></div>'],
  [`        <div className="grid mt-3 text-center text-[11px]" style={{ gridTemplateColumns: \`repeat(\${levels.length}, 1fr)\` }}>
          {levels.map((l, i) => (
            <div key={i} className={i + 1 === lv.index ? 'text-lime font-extrabold' : i + 1 < lv.index ? 'text-white/70' : 'text-white/30'}>
              <div>{l.rate}%</div><div className="text-[9px]">{l.wagered >= 1000 ? fmt(l.wagered / 1000) + 'k' : l.wagered}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-white/40 mt-2">Уровень растёт от общего оборота ставок.</div>`,
   `        <div className="text-[11px] text-white/40 mt-2">Уровень растёт от общего оборота ставок. За каждый уровень — звёзды и кейсы.</div>
        <button onClick={() => go('ranks')} className="btn-ghost w-full h-10 mt-3 text-sm">Все звания и награды →</button>`],
]);

// Админка: звания, бесплатные кейсы, порог реферального ключа
sub('pages/Admin.tsx', [
  [`        <div className="font-display text-sm mt-4 mb-2">Уровни кэшбэка</div>
        <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-[11px] text-white/50"><span>Оборот от ★</span><span>Кэшбэк %</span><span /></div>
        {cfg.cashback_levels.map((l: any, i: number) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 mt-1.5">
            <input type="number" className={cell} value={l.wagered} onChange={e => setRow('cashback_levels', i, 'wagered', Number(e.target.value))} />
            <input type="number" step={0.1} className={cell} value={l.rate} onChange={e => setRow('cashback_levels', i, 'rate', Number(e.target.value))} />
            <button className="btn-ghost" onClick={() => set('cashback_levels', cfg.cashback_levels.filter((_: any, j: number) => j !== i))}><Close size={14} /></button>
          </div>
        ))}
        <button className="btn-ghost w-full h-8 mt-2 text-xs" onClick={() => set('cashback_levels', [...cfg.cashback_levels, { wagered: 0, rate: 1 }])}>+ уровень</button>`,
   `        <div className="font-display text-sm mt-4 mb-2">Звания (25 уровней)</div>
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
        })}`],
]);
