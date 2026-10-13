// Тестеры: кнопка бесплатных звёзд в проде по списку TESTER_IDS. node scripts/testers.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const S = 'C:/Users/user/Projects/bitkong/server/src/';
const W = 'C:/Users/user/Projects/bitkong/web/src/';
const sub = (p, f, pairs) => {
  let s = readFileSync(p + f, 'utf8');
  for (const [a, b] of pairs) { if (!s.includes(a)) console.log('MISS', f, a.slice(0, 50)); s = s.split(a).join(b); }
  writeFileSync(p + f, s, 'utf8'); console.log('ok', f);
};

sub(S, 'config.ts', [
  ["  admins: (process.env.ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(Number),",
   "  admins: (process.env.ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(Number),\n  testers: (process.env.TESTER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean).map(Number),"],
]);

sub(S, 'index.ts', [
  ['const isAdmin = (id: number) => cfg.admins.includes(id);',
   "const isAdmin = (id: number) => cfg.admins.includes(id);\nconst isTester = (id: number) => cfg.dev || cfg.testers.includes(id) || cfg.admins.includes(id);\nconst meOut = (id: number) => ({ ...me(id, isAdmin(id), cfg.botUsername), tester: isTester(id) });"],
  ['return { token: issueToken(user.id), me: me(user.id, isAdmin(user.id), cfg.botUsername) };',
   'return { token: issueToken(user.id), me: meOut(user.id) };'],
  ["app.get('/api/me', async req => me(uid(req), isAdmin(uid(req)), cfg.botUsername));",
   "app.get('/api/me', async req => meOut(uid(req)));"],
  ["if (cfg.dev) app.post('/api/dev/faucet', async req => { tx(() => move(uid(req), 5000, 'dev_faucet')); pushBalance(uid(req)); return { ok: true }; });",
   `app.post('/api/dev/faucet', async req => {
  if (!isTester(uid(req))) throw new HttpError(403, 'Только для тестеров');
  tx(() => move(uid(req), 5000, 'test_faucet'));
  pushBalance(uid(req));
  return { ok: true };
});`],
]);

sub(W, 'pages/Profile.tsx', [
  ['{!tg?.initData && <button onClick={faucet} className="btn-ghost w-full h-10 mt-2 text-sm">Тестовые 5000★ (dev)</button>}',
   '{me.tester && <button onClick={faucet} className="btn-ghost w-full h-10 mt-2 text-sm border-banana/40 text-banana">+5000★ бесплатно (тест)</button>}'],
]);
