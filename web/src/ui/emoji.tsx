// Объёмные эмодзи (Microsoft Fluent 3D, MIT). Шрифт Apple использовать нельзя по лицензии.
const BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';
const MAP: Record<string, string> = {
  kong: 'Gorilla/3D/gorilla_3d.png',
  rocket: 'Rocket/3D/rocket_3d.png',
  boom: 'Collision/3D/collision_3d.png',
  bomb: 'Bomb/3D/bomb_3d.png',
  gem: 'Gem%20stone/3D/gem_stone_3d.png',
  coin: 'Coin/3D/coin_3d.png',
  banana: 'Banana/3D/banana_3d.png',
  bolt: 'High%20voltage/3D/high_voltage_3d.png',
  wheel: 'Ferris%20wheel/3D/ferris_wheel_3d.png',
  swords: 'Crossed%20swords/3D/crossed_swords_3d.png',
  bag: 'Money%20bag/3D/money_bag_3d.png',
  trophy: 'Trophy/3D/trophy_3d.png',
  star: 'Star/3D/star_3d.png',
  glowstar: 'Glowing%20star/3D/glowing_star_3d.png',
  medal1: '1st%20place%20medal/3D/1st_place_medal_3d.png',
  medal2: '2nd%20place%20medal/3D/2nd_place_medal_3d.png',
  medal3: '3rd%20place%20medal/3D/3rd_place_medal_3d.png',
};

export type EmoName = keyof typeof MAP;
export function Emo({ n, size = 28, className = '', style }: { n: string; size?: number; className?: string; style?: any }) {
  return <img src={BASE + MAP[n]} width={size} height={size} alt="" draggable={false} loading="lazy"
    className={`select-none pointer-events-none ${className}`} style={style} />;
}
