import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import './index.css';
import { login, connectWs } from './lib/api';
import { AppProvider, useApp } from './lib/store';
import { Header, LiveStrip, BottomNav } from './ui/kit';
import { FxOverlay } from './ui/Fx';
import { initRipples } from './lib/fx';
import Home from './pages/Home';
import Crash from './pages/Crash';
import Mines from './pages/Mines';
import Coinflip from './pages/Coinflip';
import Jackpot from './pages/Jackpot';
import Leaders from './pages/Leaders';
import BitKong from './pages/BitKong';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Plinko from './pages/Plinko';
import Roulette from './pages/Roulette';
import Cases from './pages/Cases';
import Upgrade from './pages/Upgrade';
import { Logo } from './ui/icons';

function Screens() {
  const { screen } = useApp();
  const tabs = ['home', 'leaders', 'bitkong', 'profile'];
  const page: Record<string, any> = {
    home: <Home />, crash: <Crash />, mines: <Mines />, coinflip: <Coinflip />,
    pvp: <Jackpot kind="pvp" />, arena: <Jackpot kind="arena" />,
    plinko: <Plinko />, roulette: <Roulette />, cases: <Cases />, upgrade: <Upgrade />,
    leaders: <Leaders />, bitkong: <BitKong />, profile: <Profile />, admin: <Admin />,
  };
  return (
    <div className="max-w-md mx-auto pb-28">
      <div className="bk-bg"><div className="bk-grid" /><div className="bk-orb bk-orb-1" /><div className="bk-orb bk-orb-2" /><div className="bk-orb bk-orb-3" /></div>
      {tabs.includes(screen) && <><Header /><LiveStrip /></>}
      <div key={screen} className="screen-in">{page[screen] ?? <Home />}</div>
      {tabs.includes(screen) && <BottomNav />}
      <FxOverlay />
    </div>
  );
}

function Root() {
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { initRipples(); login().then(m => { setMe(m); connectWs(); }).catch(e => setErr(e.message)); }, []);
  if (err) return <div className="h-full grid place-items-center p-8 text-center"><div><div className="flex justify-center mb-4"><Logo size={64} /></div>{err}</div></div>;
  if (!me) return <div className="h-full grid place-items-center"><div className="float"><Logo size={72} /></div></div>;
  return <AppProvider initialMe={me}><Screens /></AppProvider>;
}

createRoot(document.getElementById('root')!).render(<Root />);
