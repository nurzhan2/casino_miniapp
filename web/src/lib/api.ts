export const tg: any = (window as any).Telegram?.WebApp;
let token = '';

export async function api<T = any>(path: string, body?: object): Promise<T> {
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Ошибка сети');
  return j;
}

export async function login() {
  tg?.ready();
  tg?.expand();
  tg?.setHeaderColor?.('#0a130d');
  tg?.setBackgroundColor?.('#0a130d');
  tg?.disableVerticalSwipes?.();
  const initData = tg?.initData || '';
  let devUser;
  if (!initData) { // вне Telegram — dev-режим: ?u=2 чтобы зайти вторым игроком
    const q = new URLSearchParams(location.search);
    const id = Number(q.get('u') || sessionStorage.getItem('devUser') || 1);
    sessionStorage.setItem('devUser', String(id));
    devUser = { id, username: 'dev' + id, first_name: 'Dev ' + id, startParam: q.get('startapp') };
  }
  const r = await api('/api/auth', { initData, devUser });
  token = r.token;
  return r.me;
}
export const getToken = () => token;

export function haptic(t: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') {
  const h = tg?.HapticFeedback;
  if (!h) return;
  if (t === 'success' || t === 'error' || t === 'warning') h.notificationOccurred(t);
  else h.impactOccurred(t);
}

// ---- WebSocket с автопереподключением ----
type Handler = (msg: any) => void;
const handlers = new Set<Handler>();
export const onWs = (h: Handler) => { handlers.add(h); return () => { handlers.delete(h); }; };

export function connectWs() {
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  let ping: any;
  ws.onopen = () => { ping = setInterval(() => ws.readyState === 1 && ws.send('ping'), 25000); };
  ws.onmessage = e => { const m = JSON.parse(e.data); handlers.forEach(h => h(m)); };
  ws.onclose = () => { clearInterval(ping); setTimeout(connectWs, 1500); };
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const fmt = (n: number) => Math.floor(n).toLocaleString('ru-RU');
export const GAME_NAMES: Record<string, string> = { crash: 'Ракета', mines: 'Мины', coinflip: 'Coinflip', pvp: 'PvP', arena: 'Арена' };
