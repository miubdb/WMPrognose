import type { Avatar as AvatarT } from '../../../shared/types';

export const SKINS = ['#ffdbb4', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
export const HAIR_COLORS = ['#2b1d12', '#5a3825', '#a0522d', '#d4a64a', '#f2d675', '#c0392b', '#8e44ad', '#cfd8dc'];
export const SHIRT_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#ec407a', '#262626', '#f5f5f5'];
export const BGS = ['#4338ca', '#1d4ed8', '#0f766e', '#c2410c', '#7e22ce', '#be185d', '#15803d', '#a16207'];
export const FACE_NAMES = ['Lächeln', 'Grinsen', 'Schmunzeln', 'Staunen', 'Cool', 'Zunge', 'Zwinkern', 'Entschlossen'];
export const HAIR_NAMES = ['Glatze', 'Kurz', 'Bürste', 'Lang', 'Locken', 'Irokese', 'Dutt', 'Scheitel', 'Afro'];
export const HAT_NAMES = ['Keine', 'Cap', 'Mütze', 'Stirnband', 'Partyhut', 'Krone'];
export const SHIRT_NAMES = ['Uni', 'Streifen', 'Ringel', 'Schärpe', 'Karo'];
export const ACC_NAMES = ['Keine', 'Brille', 'Sonnenbrille', 'Schnurrbart', 'Kopfhörer', 'Ohrring', 'Kriegsbemalung'];

export const DEFAULT_AVATAR: AvatarT = { face: 0, skin: 1, hair: 1, hairColor: 1, hat: 0, shirt: 0, shirtColor: 1, acc: 0, bg: 0 };
export function randomAvatar(): AvatarT {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { face: r(8), skin: r(6), hair: r(9), hairColor: r(8), hat: Math.random() < 0.3 ? 1 + r(5) : 0, shirt: r(5), shirtColor: r(10), acc: Math.random() < 0.5 ? 0 : r(7), bg: r(8) };
}

function Face({ n }: { n: number }) {
  const eye = (x: number, o: any = {}) => <ellipse cx={x} cy={52} rx={3.2} ry={3.8} fill="#1b1230" {...o} />;
  const brow = <><path d="M33 44 L45 46" stroke="#1b1230" strokeWidth="2.4" strokeLinecap="round" /><path d="M67 44 L55 46" stroke="#1b1230" strokeWidth="2.4" strokeLinecap="round" /></>;
  switch (n) {
    case 1: return <>{eye(39)}{eye(61)}<path d="M38 62 Q50 78 62 62 Z" fill="#7a1d2e" stroke="#1b1230" strokeWidth="2" strokeLinejoin="round" /><path d="M41 63 Q50 66 59 63" stroke="#fff" strokeWidth="3" fill="none" /></>;
    case 2: return <>{eye(39)}{eye(61)}<path d="M40 66 Q52 72 62 62" stroke="#1b1230" strokeWidth="2.6" fill="none" strokeLinecap="round" /></>;
    case 3: return <>{eye(39, { ry: 5, rx: 4 })}{eye(61, { ry: 5, rx: 4 })}<ellipse cx="50" cy="68" rx="5" ry="6.5" fill="#7a1d2e" stroke="#1b1230" strokeWidth="2" /></>;
    case 4: return <><rect x="31" y="48" width="16" height="7" rx="3" fill="#1b1230" /><rect x="53" y="48" width="16" height="7" rx="3" fill="#1b1230" /><path d="M42 67 L58 67" stroke="#1b1230" strokeWidth="2.8" strokeLinecap="round" /></>;
    case 5: return <>{eye(39)}{eye(61)}<path d="M38 62 Q50 74 62 62" stroke="#1b1230" strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d="M46 67 Q50 80 55 67 Z" fill="#ff6b8a" stroke="#1b1230" strokeWidth="1.6" /></>;
    case 6: return <>{eye(39)}<path d="M55 52 Q61 47 67 52" stroke="#1b1230" strokeWidth="2.8" fill="none" strokeLinecap="round" /><path d="M38 62 Q50 74 62 62" stroke="#1b1230" strokeWidth="2.6" fill="none" strokeLinecap="round" /></>;
    case 7: return <>{brow}{eye(39, { cy: 54 })}{eye(61, { cy: 54 })}<path d="M41 68 Q50 64 59 68" stroke="#1b1230" strokeWidth="2.8" fill="none" strokeLinecap="round" /></>;
    default: return <>{eye(39)}{eye(61)}<path d="M39 62 Q50 72 61 62" stroke="#1b1230" strokeWidth="2.6" fill="none" strokeLinecap="round" /></>;
  }
}

function HairBack({ n, c }: { n: number; c: string }) {
  if (n === 3) return <path d="M24 46 Q22 86 30 90 L70 90 Q78 86 76 46 Q76 18 50 18 Q24 18 24 46Z" fill={c} />;
  if (n === 4) return <g fill={c}><circle cx="28" cy="38" r="13" /><circle cx="72" cy="38" r="13" /><circle cx="38" cy="24" r="14" /><circle cx="62" cy="24" r="14" /><circle cx="50" cy="20" r="14" /></g>;
  if (n === 8) return <g fill={c}><circle cx="50" cy="34" r="33" /></g>;
  if (n === 6) return <circle cx="50" cy="10" r="9" fill={c} />;
  return null;
}
function HairFront({ n, c }: { n: number; c: string }) {
  switch (n) {
    case 1: return <path d="M26 44 Q24 20 50 19 Q76 20 74 44 Q68 32 50 32 Q32 32 26 44Z" fill={c} />;
    case 2: return <path d="M27 40 Q28 21 50 20 Q72 21 73 40 Q60 30 50 30 Q40 30 27 40Z" fill={c} opacity="0.92" />;
    case 3: return <path d="M25 50 Q22 18 50 18 Q78 18 75 50 Q72 34 50 31 Q28 34 25 50Z" fill={c} />;
    case 4: return <path d="M27 42 Q30 28 50 27 Q70 28 73 42 Q62 34 50 34 Q38 34 27 42Z" fill={c} />;
    case 5: return <path d="M44 22 L47 4 L53 4 L56 22 Q52 18 50 18 Q48 18 44 22Z" fill={c} stroke={c} strokeWidth="3" strokeLinejoin="round" />;
    case 6: return <path d="M26 44 Q24 20 50 19 Q76 20 74 44 Q68 30 50 30 Q32 30 26 44Z" fill={c} />;
    case 7: return <path d="M25 46 Q22 18 52 18 Q78 20 75 46 Q70 30 58 27 Q40 38 25 46Z" fill={c} />;
    case 8: return <path d="M26 42 Q30 26 50 25 Q70 26 74 42 Q62 32 50 32 Q38 32 26 42Z" fill={c} />;
    default: return null;
  }
}
function Hat({ n }: { n: number }) {
  switch (n) {
    case 1: return <g><path d="M24 40 Q26 14 50 14 Q74 14 76 40Z" fill="#e53935" /><path d="M70 38 Q92 38 94 44 Q80 46 70 42Z" fill="#b71c1c" /><circle cx="50" cy="14" r="3" fill="#fff" /></g>;
    case 2: return <g><path d="M24 40 Q22 10 50 8 Q78 10 76 40Z" fill="#1e88e5" /><rect x="22" y="36" width="56" height="9" rx="4" fill="#1565c0" /><circle cx="50" cy="6" r="5" fill="#fff" /></g>;
    case 3: return <g><rect x="24" y="33" width="52" height="7" rx="3" fill="#fdd835" /><rect x="24" y="35" width="52" height="2" fill="#f57f17" /></g>;
    case 4: return <g><path d="M36 28 L50 -8 L64 28Z" fill="#ec407a" /><circle cx="50" cy="-8" r="4" fill="#fdd835" /><path d="M40 20 L60 20 M43 12 L57 12" stroke="#fff" strokeWidth="2" /></g>;
    case 5: return <g><path d="M28 28 L30 8 L40 20 L50 4 L60 20 L70 8 L72 28Z" fill="#f5b82e" stroke="#b57d0a" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="50" cy="8" r="2.6" fill="#ef4444" /><circle cx="30" cy="10" r="2" fill="#38bdf8" /><circle cx="70" cy="10" r="2" fill="#38bdf8" /></g>;
    default: return null;
  }
}
function Acc({ n }: { n: number }) {
  switch (n) {
    case 1: return <g fill="none" stroke="#1b1230" strokeWidth="2.2"><circle cx="39" cy="52" r="9" /><circle cx="61" cy="52" r="9" /><path d="M48 52 L52 52" /></g>;
    case 2: return <g><rect x="28" y="45" width="19" height="11" rx="5" fill="#111" /><rect x="53" y="45" width="19" height="11" rx="5" fill="#111" /><path d="M47 49 L53 49" stroke="#111" strokeWidth="2" /><path d="M31 48 L36 48" stroke="#8ab4ff" strokeWidth="1.6" /></g>;
    case 3: return <path d="M36 63 Q43 57 50 62 Q57 57 64 63 Q57 67 50 64 Q43 67 36 63Z" fill="#2b1d12" />;
    case 4: return <g><path d="M22 52 Q22 18 50 18 Q78 18 78 52" fill="none" stroke="#222" strokeWidth="4" /><rect x="17" y="46" width="9" height="16" rx="4" fill="#14d9c0" /><rect x="74" y="46" width="9" height="16" rx="4" fill="#14d9c0" /></g>;
    case 5: return <g><circle cx="24" cy="62" r="3.2" fill="#f5b82e" /><circle cx="76" cy="62" r="3.2" fill="#f5b82e" /></g>;
    case 6: return <g><path d="M30 58 L40 58 M30 62 L40 62" stroke="#e53935" strokeWidth="2.4" /><path d="M60 58 L70 58 M60 62 L70 62" stroke="#fff" strokeWidth="2.4" /></g>;
    default: return null;
  }
}
function Shirt({ style, c }: { style: number; c: string }) {
  const body = <path d="M14 100 Q16 80 36 76 L64 76 Q84 80 86 100Z" fill={c} />;
  const light = c === '#f5f5f5' ? '#1e88e5' : '#ffffff';
  return (
    <g>
      {body}
      {style === 1 && <g stroke={light} strokeWidth="4" opacity="0.8"><path d="M30 78 L28 100 M42 76 L41 100 M50 76 L50 100 M58 76 L59 100 M70 78 L72 100" /></g>}
      {style === 2 && <g stroke={light} strokeWidth="4" opacity="0.8"><path d="M16 88 L84 88 M14 96 L86 96" /></g>}
      {style === 3 && <path d="M30 78 L72 100 L60 100 L24 82Z" fill={light} opacity="0.85" />}
      {style === 4 && <g fill={light} opacity="0.55">{[0, 1, 2, 3].map(i => [0, 1, 2, 3, 4].map(j => ((i + j) % 2 ? <rect key={i + '-' + j} x={20 + j * 12} y={78 + i * 6} width="6" height="6" /> : null)))}</g>}
      <path d="M40 76 Q50 90 60 76Z" fill="rgba(0,0,0,0.25)" />
    </g>
  );
}

export function Avatar({ a, size = 96, rounded = true, className = '' }: { a: AvatarT; size?: number | string; rounded?: boolean; className?: string }) {
  const skin = SKINS[a.skin] ?? SKINS[0];
  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" style={{ borderRadius: rounded ? '50%' : 12, background: BGS[a.bg] ?? BGS[0], overflow: 'hidden', display: 'block' }} role="img" aria-label="Avatar">
      <g transform="translate(0,2)">
        <HairBack n={a.hair} c={hair} />
        <Shirt style={a.shirt} c={SHIRT_COLORS[a.shirtColor] ?? SHIRT_COLORS[0]} />
        <rect x="44" y="68" width="12" height="12" rx="4" fill={skin} />
        <ellipse cx="24" cy="54" rx="4" ry="6" fill={skin} /><ellipse cx="76" cy="54" rx="4" ry="6" fill={skin} />
        <ellipse cx="50" cy="48" rx="27" ry="30" fill={skin} />
        <ellipse cx="33" cy="62" rx="5" ry="3.2" fill="#ff7a8a" opacity="0.28" /><ellipse cx="67" cy="62" rx="5" ry="3.2" fill="#ff7a8a" opacity="0.28" />
        <Face n={a.face} />
        <HairFront n={a.hair} c={hair} />
        <Acc n={a.acc} />
        <Hat n={a.hat} />
      </g>
    </svg>
  );
}
