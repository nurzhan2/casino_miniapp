import { readFileSync, writeFileSync } from 'node:fs';
const f = 'C:/Users/user/Projects/bitkong/web/src/pages/Crash.tsx';
let s = readFileSync(f, 'utf8');

// объявление ссылки на ракету
if (!s.includes('const rocketRef')) {
  s = s.replace('export default function Crash() {', `export default function Crash() {
  const rocketRef = useRef<HTMLDivElement>(null);`);
}
// сама ссылка на элемент
s = s.replace(`{s.phase === 'running' && <div className="absolute text-4xl"`,
  `{s.phase === 'running' && <div ref={rocketRef} className="absolute text-4xl"`);

writeFileSync(f, s, 'utf8');
console.log('decl:', s.includes('const rocketRef'), 'attr:', s.includes('ref={rocketRef}'), 'useRef import:', /import \{[^}]*useRef/.test(s));
