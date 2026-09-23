// Звёзды летят к балансу, золотой режим, сбор логотипа из частиц. node scripts/fx5.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/user/Projects/bitkong/web/src/';
const get = f => readFileSync(P + f, 'utf8');
const put = (f, s) => writeFileSync(P + f, s, 'utf8');

let fx = get('lib/fx.ts');
if (!fx.includes('flyToBalance')) fx += `
/** Звёзды стягиваются от центра к балансу в шапке */
export function flyToBalance(n = 18) {
  ensure();
  const target = document.getElementById('bk-balance')?.getBoundingClientRect();
  const tx = target ? target.left + target.width / 2 : innerWidth - 60;
  const ty = target ? target.top + target.height / 2 : 40;
  const x0 = innerWidth / 2, y0 = innerHeight * 0.44;
  for (let i = 0; i < n; i++) {
    const delay = i * 26;
    setTimeout(() => {
      const p = {
        x: x0 + (Math.random() - 0.5) * 120, y: y0 + (Math.random() - 0.5) * 80,
        vx: 0, vy: 0, g: 0, life: 0, max: 46, size: 9 + Math.random() * 6,
        color: '#ffd43b', rot: 0, vr: 0.3, shape: 'star' as const,
      };
      const sx = p.x, sy = p.y;
      const t0 = performance.now();
      const fly = (t: number) => {
        const k = Math.min(1, (t - t0) / 520), e = k * k * (3 - 2 * k);
        p.x = sx + (tx - sx) * e;
        p.y = sy + (ty - sy) * e - Math.sin(e * Math.PI) * 90;
        p.life = Math.floor(k * p.max);
        if (k < 1) requestAnimationFrame(fly);
      };
      parts.push(p);
      run();
      requestAnimationFrame(fly);
    }, delay);
  }
}

/** Золотая тема на пару секунд — для крупных выигрышей */
export function goldMode(ms = 2200) {
  document.documentElement.classList.add('gold-mode');
  setTimeout(() => document.documentElement.classList.remove('gold-mode'), ms);
}

/** Логотип собирается из частиц на загрузке */
export function assembleLogo(x: number, y: number) {
  ensure();
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2, r = 120 + Math.random() * 90;
    const p = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: 0, vy: 0, g: 0, life: 0, max: 60, size: 4 + Math.random() * 5, color: i % 3 ? '#b6ff3b' : '#ffd43b', rot: 0, vr: 0.2, shape: 'circle' as const };
    const sx = p.x, sy = p.y, t0 = performance.now() + i * 8;
    const step = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / 700)), e = 1 - Math.pow(1 - k, 3);
      p.x = sx + (x - sx) * e; p.y = sy + (y - sy) * e; p.life = Math.floor(k * p.max);
      if (k < 1) requestAnimationFrame(step);
    };
    parts.push(p);
    run();
    requestAnimationFrame(step);
  }
}
`;
put('lib/fx.ts', fx);

// win() усиливаем: звук, звёзды к балансу, золотой режим
let f2 = get('lib/fx.ts');
if (!f2.includes('flyToBalance(')|| !f2.includes('sfx.')) {
  f2 = f2.replace("export type WinEvent", "import { sfx } from './sfx';\n\nexport type WinEvent");
  f2 = f2.replace(`  confetti(big ? 170 : 90);
  if (big) { coinRain(50); shake(300, 0.6); }
  flash('#b6ff3b', 320);`, `  confetti(big ? 170 : 90);
  sfx[big ? 'bigWin' : 'win']();
  setTimeout(() => flyToBalance(big ? 26 : 14), 450);
  if (big) { coinRain(50); shake(300, 0.6); goldMode(); }
  flash('#b6ff3b', 320);`);
  f2 = f2.replace(`  debris();
  shake(360, 1);`, `  debris();
  sfx.lose();
  shake(360, 1);`);
  put('lib/fx.ts', f2);
}
console.log('fx5 ok');
