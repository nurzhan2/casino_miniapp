// Набор SVG-иконок и фирменный знак. Никаких эмодзи в интерфейсе.
type P = { className?: string; size?: number };
const S = ({ size = 20, className = '', children, stroke = true }: any) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}
    fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : 'none'}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

/** Фирменный знак BitKong: геометрическая морда гориллы */
export function Logo({ size = 40, className = '' }: P) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="bk-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6ff7a" /><stop offset="1" stopColor="#7ed321" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#0f1a13" stroke="url(#bk-g)" strokeWidth="2.5" />
      <circle cx="16" cy="22" r="7" fill="url(#bk-g)" opacity=".45" />
      <circle cx="48" cy="22" r="7" fill="url(#bk-g)" opacity=".45" />
      <path d="M32 12c11 0 18 7.5 18 17.5S43 50 32 50 14 39.5 14 29.5 21 12 32 12Z" fill="url(#bk-g)" />
      <ellipse cx="32" cy="38" rx="11" ry="8.5" fill="#0f1a13" opacity=".85" />
      <circle cx="24" cy="27" r="3.2" fill="#0f1a13" />
      <circle cx="40" cy="27" r="3.2" fill="#0f1a13" />
      <path d="M27.5 40.5h9" stroke="url(#bk-g)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Звезда Telegram Stars */
export const StarIcon = ({ size = 16, className = '' }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
    <defs><linearGradient id="st-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset="1" stopColor="#f5a623" /></linearGradient></defs>
    <path fill="url(#st-g)" d="M12 2.6l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3L12 16.7 6.4 19.8l1.3-6.3-4.8-4.3 6.4-.7L12 2.6Z" />
  </svg>
);

export const Rocket = (p: P) => <S {...p}><path d="M12 3c3.5 2 5.5 5.6 5.5 9.4L19 17l-3.6-1.3H8.6L5 17l1.5-4.6C6.5 8.6 8.5 5 12 3Z" /><circle cx="12" cy="10.5" r="2" /><path d="M9.5 18.5c.8 1.4 1.6 2.3 2.5 3 .9-.7 1.7-1.6 2.5-3" /></S>;
export const Bomb = (p: P) => <S {...p}><circle cx="10.5" cy="14.5" r="6.5" /><path d="M15.4 10.2l2.2-2.2M17.6 8V5.4M17.6 8h2.8" /></S>;
export const Gem = (p: P) => <S {...p}><path d="M6 3h12l3 5.5L12 21 3 8.5 6 3Z" /><path d="M3.2 8.5h17.6M9 3l3 5.5L15 3M12 8.5V21" /></S>;
export const Coin = (p: P) => <S {...p}><ellipse cx="12" cy="8.5" rx="8" ry="4" /><path d="M4 8.5v7c0 2.2 3.6 4 8 4s8-1.8 8-4v-7" /><path d="M4 12c0 2.2 3.6 4 8 4s8-1.8 8-4" /></S>;
export const Wheel = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.3 4.3M14.1 14.1l4.3 4.3M18.4 5.6l-4.3 4.3M9.9 14.1l-4.3 4.3" /></S>;
export const Arena = (p: P) => <S {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M12 4v16" /><circle cx="12" cy="12" r="2.5" /><path d="M3 9h3v6H3M21 9h-3v6h3" /></S>;
export const Trophy = (p: P) => <S {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4.5A2.5 2.5 0 0 0 7 10.5M17 6h2.5A2.5 2.5 0 0 1 17 10.5" /><path d="M12 14v3M8.5 20h7M10 17h4l.6 3H9.4l.6-3Z" /></S>;
export const Games = (p: P) => <S {...p}><rect x="2.5" y="6.5" width="19" height="11" rx="4" /><path d="M7 10v4M5 12h4M15.5 11.5h.01M18 13.5h.01" /></S>;
export const User = (p: P) => <S {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c.8-3.8 3.8-5.8 7.5-5.8s6.7 2 7.5 5.8" /></S>;
export const Gift = (p: P) => <S {...p}><rect x="3" y="9" width="18" height="11" rx="2" /><path d="M2.5 9h19M12 9v11M12 9S9.5 3.5 7.5 4.5 9 9 12 9Zm0 0s2.5-5.5 4.5-4.5S15 9 12 9Z" /></S>;
export const Chart = (p: P) => <S {...p}><path d="M4 19V9M10 19V5M16 19v-6M21 19H3" /></S>;
export const Plinko = (p: P) => <S {...p}><circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="7" r="1.2" fill="currentColor" stroke="none" /><circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" /><circle cx="9.5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="14.5" cy="12" r="1.2" fill="currentColor" stroke="none" /><path d="M4 20h16M8 20v-3M16 20v-3M12 20v-4" /></S>;
export const Shield = (p: P) => <S {...p}><path d="M12 3l7.5 3v6c0 4.2-3 7.8-7.5 9-4.5-1.2-7.5-4.8-7.5-9V6L12 3Z" /><path d="M9.2 12.2l2 2 3.6-3.8" /></S>;
export const Settings = (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2 2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.6 1Z" /></S>;
export const Close = (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const Check = (p: P) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7" /></S>;
export const Bolt = (p: P) => <S {...p}><path d="M13 2L5 13h6l-1 9 8-11h-6l1-9Z" /></S>;
export const Users = (p: P) => <S {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19c.7-3.2 3.2-5 6-5s5.3 1.8 6 5" /><path d="M16 6.2a3.2 3.2 0 0 1 0 6.1M18 14.5c2 .7 3.2 2.3 3.6 4.5" /></S>;
export const Burst = (p: P) => (
  <svg viewBox="0 0 24 24" width={24} height={24} className="w-full h-full">
    <path fill="#ff8a3b" d="M12 1.5l2.3 5.2 5.2-1.6-2.7 4.8 4.7 2.6-5.3 1.4 1.3 5.3-4.4-3.2-3.6 4.1-.9-5.5-5.4.7 3.4-4.3L2 7.9l5.4.3L8.6 2.8 12 5.6V1.5Z" />
    <path fill="#ffd43b" d="M12 6.5l1.5 3.3 3.4-1-1.8 3 3 1.7-3.4.9.8 3.4-2.8-2-2.3 2.6-.6-3.5-3.5.5 2.2-2.8-2.4-2 3.5.2.8-3.4L12 8.6V6.5Z" />
  </svg>
);
