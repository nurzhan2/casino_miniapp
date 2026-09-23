// Кнопка оплаты через привязанный кошелёк в блоке TON. node scripts/tonconnect.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:/Users/user/Projects/bitkong/web/src/pages/Profile.tsx';
let s = readFileSync(f, 'utf8');

if (!s.includes("from '../lib/ton'")) {
  s = s.replace("import { Avatar, Star } from '../ui/kit';", `import { Avatar, Star } from '../ui/kit';
import { tonPay } from '../lib/ton';`);
}

s = s.replace(/<button onClick=\{\(\) => \(tg\?\.openLink \? tg\.openLink\(ton\.link\) : window\.open\(ton\.link\)\)\} className="btn-lime w-full h-10">[^<]*<\/button>/,
  `<button onClick={async () => {
              try { await tonPay(ton.address, ton.amount, ton.comment); toast('Платёж отправлен — баланс появится через минуту'); }
              catch { tg?.openLink ? tg.openLink(ton.link) : window.open(ton.link); }
            }} className="btn-lime w-full h-10">Оплатить из кошелька</button>
            <button onClick={() => (tg?.openLink ? tg.openLink(ton.link) : window.open(ton.link))} className="btn-ghost w-full h-9 text-xs">Открыть ссылку вручную</button>`);

writeFileSync(f, s, 'utf8');
console.log(s.includes('tonPay(') ? 'ton connect ok' : 'MISS');
