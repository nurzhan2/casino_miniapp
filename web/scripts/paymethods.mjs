// Пополнение: выбор способа (Stars / CryptoBot / TON / СБП). node scripts/paymethods.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:/Users/user/Projects/bitkong/web/src/pages/Profile.tsx';
let s = readFileSync(f, 'utf8');

s = s.replace(/const \[dep, setDep\] = useState\(100\);/,
  `const [dep, setDep] = useState(100);
  const [pays, setPays] = useState<any[]>([]);
  const [ton, setTon] = useState<any>(null);`);

s = s.replace(/useEffect\(\(\) => \{ api\('\/api\/bets'\)\.then\(setBets\); \}, \[me\.balance\]\);/,
  `useEffect(() => { api('/api/bets').then(setBets); }, [me.balance]);
  useEffect(() => { api('/api/deposit/methods').then(setPays).catch(() => {}); }, []);`);

s = s.replace(/const deposit = async \(\) => \{[\s\S]*?\n  \};/,
  `const deposit = async (method: string) => {
    setTon(null);
    try {
      const r = await api('/api/deposit', { amount: dep, method });
      if (r.type === 'ton') { setTon(r); return; }                       // показываем адрес и комментарий
      if (method === 'stars' && tg?.openInvoice) {
        tg.openInvoice(r.link, (st: string) => { if (st === 'paid') { haptic('success'); toast(\`+\${fmt(dep)}★ зачислено\`); setTimeout(refresh, 800); } });
      } else if (tg?.openLink) tg.openLink(r.link);
      else window.open(r.link);
    } catch (e: any) { toast(e.message, 'err'); }
  };
  const copyTon = (v: string) => { navigator.clipboard?.writeText(v); toast('Скопировано'); };`);

s = s.replace(/<button onClick=\{deposit\} className="btn-lime w-full h-12 mt-2">[^<]*<\/button>/,
  `<div className="space-y-2 mt-2">
          {pays.length === 0 && <div className="text-xs text-white/40 text-center py-2">Способы пополнения пока не подключены</div>}
          {pays.map((p: any, i: number) => (
            <button key={p.id} onClick={() => deposit(p.id)} className={\`w-full h-12 flex items-center justify-between px-4 \${i === 0 ? 'btn-lime' : 'btn-ghost'}\`}>
              <span className="font-extrabold">{p.title}</span>
              <span className={\`text-xs \${i === 0 ? 'opacity-70' : 'text-white/45'}\`}>
                {p.id === 'stars' ? \`\${fmt(dep)}★\` : \`≈ \${(dep / p.rate).toFixed(p.unit === '₽' ? 0 : 2)} \${p.unit}\`}
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
            <button onClick={() => (tg?.openLink ? tg.openLink(ton.link) : window.open(ton.link))} className="btn-lime w-full h-10">Открыть кошелёк</button>
          </div>
        )}`);

writeFileSync(f, s, 'utf8');
console.log('profile payments ok');
