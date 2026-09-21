import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api, onWs, haptic } from './api';

type Toast = { id: number; text: string; kind: 'ok' | 'err' };
type Ctx = {
  me: any; refresh: () => Promise<void>; setBalance: (b: number) => void;
  crash: any; jackpots: Record<string, any>; live: any[]; online: number; clock: () => number;
  toast: (text: string, kind?: 'ok' | 'err') => void; go: (s: string) => void; screen: string;
};
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export function AppProvider({ initialMe, children }: { initialMe: any; children: ReactNode }) {
  const [me, setMe] = useState(initialMe);
  const [crash, setCrash] = useState<any>(null);
  const [jackpots, setJackpots] = useState<Record<string, any>>({});
  const [live, setLive] = useState<any[]>([]);
  const [online, setOnline] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [screen, setScreen] = useState('home');
  const offset = useRef(0); // серверное время − локальное

  const refresh = useCallback(async () => setMe(await api('/api/me')), []);
  const toast = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Math.random();
    setToasts(t => [...t, { id, text, kind }]);
    if (kind === 'err') haptic('error');
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);

  useEffect(() => {
    api('/api/live').then(r => { setLive(r.items); setOnline(r.online); }).catch(() => {});
    return onWs(m => {
      if (m.serverNow ?? m.state?.serverNow) offset.current = (m.serverNow ?? m.state.serverNow) - Date.now();
      if (m.t === 'balance') setMe((x: any) => ({ ...x, balance: m.balance, cashback: m.cashback }));
      if (m.t === 'crash') setCrash(m.state);
      if (m.t === 'jackpot') setJackpots(j => ({ ...j, [m.state.kind]: m.state }));
      if (m.t === 'live') setLive(l => [m.item, ...l].slice(0, 30));
    });
  }, []);

  const value: Ctx = {
    me, refresh, setBalance: b => setMe((x: any) => ({ ...x, balance: b })),
    crash, jackpots, live, online, clock: () => Date.now() + offset.current,
    toast, go: s => { setScreen(s); window.scrollTo(0, 0); }, screen,
  };
  return (
    <C.Provider value={value}>
      {children}
      <div className="fixed top-3 inset-x-3 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pop mx-auto px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xl ${t.kind === 'err' ? 'bg-danger text-white' : 'bg-lime text-jungle'}`}>{t.text}</div>
        ))}
      </div>
    </C.Provider>
  );
}
