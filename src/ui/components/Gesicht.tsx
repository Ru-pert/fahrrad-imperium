/** Gezeichnete Gesichter für Führungskräfte – deterministisch aus einem Seed */

const HAUT = ['#f9d7b9', '#f1c19b', '#e0a87e', '#c68856', '#9a6236', '#6f4424'];
const HAAR = ['#2b1d14', '#5b3a24', '#a0522d', '#d4a253', '#e8d3a0', '#8d8d8d', '#1c1c1c', '#b33a2a'];
const FRISUREN_W = ['lang', 'dutt', 'bob', 'locken', 'zopf', 'kurz', 'pony'];
const FRISUREN_M = ['kurz', 'seite', 'locken', 'glatze', 'stoppel', 'tolle', 'lang'];

function zufall(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return ((s ^ (s >>> 13)) >>> 0) / 4294967296;
  };
}

export interface GesichtProps {
  seed: number;
  weiblich: boolean;
  farbe: string;
  alter?: number;
  /** 0–100: bestimmt den Gesichtsausdruck */
  stimmung?: number;
  className?: string;
  /** Ausgefallen (Burn-out): müde Augen, Kaffee */
  muede?: boolean;
  titel?: string;
}

export function Gesicht({ seed, weiblich, farbe, alter = 40, stimmung = 60, className = 'h-16 w-16', muede, titel }: GesichtProps) {
  const r = zufall(seed);
  const haut = HAUT[Math.floor(r() * HAUT.length)];
  let haar = HAAR[Math.floor(r() * HAAR.length)];
  if (alter > 52 && r() < 0.6) haar = r() < 0.5 ? '#9ca3af' : '#d1d5db';
  const frisuren = weiblich ? FRISUREN_W : FRISUREN_M;
  const frisur = frisuren[Math.floor(r() * frisuren.length)];
  const brille = r() < 0.35 ? (r() < 0.5 ? 'rund' : 'eckig') : null;
  const bart = !weiblich && r() < 0.4 ? (r() < 0.5 ? 'voll' : 'schnauzer') : null;
  const ohrring = weiblich && r() < 0.5;
  const sommersprossen = r() < 0.2;
  const id = `g${seed}`;
  const mund = stimmung >= 60 ? 'M42 68 Q50 75 58 68' : stimmung >= 35 ? 'M43 70 Q50 71.5 57 70' : 'M43 72 Q50 66 57 72';
  const brauen = stimmung < 35 ? ['M35 44 L44 46', 'M65 44 L56 46'] : ['M35 45 Q39.5 42.5 44 45', 'M56 45 Q60.5 42.5 65 45'];

  const haarHinten = () => {
    if (frisur === 'lang') return <path d="M27 48 Q24 20 50 18 Q76 20 73 48 L76 84 Q60 90 50 88 Q40 90 24 84 Z" fill={haar} />;
    if (frisur === 'zopf') return <path d="M68 44 Q82 56 74 82 Q70 88 66 80 Q74 62 64 48 Z" fill={haar} />;
    if (frisur === 'bob') return <path d="M28 50 Q24 20 50 18 Q76 20 72 50 L72 64 Q66 66 66 58 L34 58 Q34 66 28 64 Z" fill={haar} />;
    return null;
  };
  const haarOben = () => {
    switch (frisur) {
      case 'kurz':
        return <path d="M31 44 Q30 22 50 21 Q70 22 69 44 Q66 32 50 31 Q36 32 31 44 Z" fill={haar} />;
      case 'seite':
        return <path d="M31 46 Q28 22 52 21 Q72 23 69 44 Q62 28 44 34 Q36 36 31 46 Z" fill={haar} />;
      case 'tolle':
        return <path d="M31 44 Q28 26 40 20 Q52 10 66 20 Q72 28 69 44 Q64 30 50 31 Q36 32 31 44 Z" fill={haar} />;
      case 'locken':
        return (
          <g fill={haar}>
            {[[34, 30], [42, 24], [50, 22], [58, 24], [66, 30], [30, 38], [70, 38], [38, 27], [62, 27]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" />)}
          </g>
        );
      case 'glatze':
        return <path d="M30 46 Q30 40 33 38 L33 50 Z M70 46 Q70 40 67 38 L67 50 Z" fill={haar} />;
      case 'stoppel':
        return <path d="M31 42 Q32 24 50 23 Q68 24 69 42 Q64 30 50 30 Q36 30 31 42 Z" fill={haar} opacity="0.75" />;
      case 'dutt':
        return (
          <g fill={haar}>
            <circle cx="50" cy="15" r="9" />
            <path d="M31 46 Q29 22 50 21 Q71 22 69 46 Q66 30 50 30 Q34 30 31 46 Z" />
          </g>
        );
      case 'pony':
        return <path d="M30 48 Q28 20 50 19 Q72 20 70 48 Q66 38 62 37 L60 40 Q50 36 40 40 L38 37 Q33 38 30 48 Z" fill={haar} />;
      default:
        return <path d="M31 46 Q29 21 50 20 Q71 21 69 46 Q66 31 50 30 Q34 31 31 46 Z" fill={haar} />;
    }
  };

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={titel ?? 'Porträt'}>
      <defs>
        <clipPath id={`${id}-k`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
        <linearGradient id={`${id}-h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={farbe} stopOpacity="0.28" />
          <stop offset="1" stopColor={farbe} stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-k)`}>
        <rect width="100" height="100" fill={`url(#${id}-h)`} />
        <circle cx="50" cy="50" r="48" fill="white" opacity="0.25" />
        {haarHinten()}
        {/* Oberkörper */}
        <path d="M14 104 Q16 80 36 76 L50 82 L64 76 Q84 80 86 104 Z" fill={farbe} />
        <path d="M40 76 L50 90 L60 76 Z" fill="white" opacity="0.9" />
        <path d="M46 78 L50 92 L54 78 Z" fill={weiblich ? 'none' : '#1f2937'} />
        <rect x="44" y="64" width="12" height="14" rx="4" fill={haut} />
        {/* Kopf */}
        <ellipse cx="30.5" cy="52" rx="4" ry="6" fill={haut} />
        <ellipse cx="69.5" cy="52" rx="4" ry="6" fill={haut} />
        {ohrring && <circle cx="30" cy="59" r="1.8" fill="#fbbf24" />}
        <ellipse cx="50" cy="49" rx="19" ry="23" fill={haut} />
        {haarOben()}
        {/* Augen */}
        {muede ? (
          <g stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M36 52 Q40 54 44 52" />
            <path d="M56 52 Q60 54 64 52" />
          </g>
        ) : (
          <g fill="#1f2937">
            <ellipse cx="40" cy="51" rx="2.4" ry="2.8" />
            <ellipse cx="60" cy="51" rx="2.4" ry="2.8" />
            <circle cx="40.8" cy="50.2" r="0.8" fill="white" />
            <circle cx="60.8" cy="50.2" r="0.8" fill="white" />
          </g>
        )}
        <g stroke={haar === '#e8d3a0' ? '#a16207' : haar} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d={brauen[0]} />
          <path d={brauen[1]} />
        </g>
        <path d="M50 53 Q48 60 50 61.5" stroke="#00000033" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {stimmung >= 60 && <g fill="#f87171" opacity="0.25"><circle cx="36" cy="61" r="3.5" /><circle cx="64" cy="61" r="3.5" /></g>}
        {sommersprossen && <g fill="#a16207" opacity="0.45">{[[37, 58], [40, 60], [34, 60], [63, 58], [60, 60], [66, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.8" />)}</g>}
        {bart === 'voll' && <path d="M32 54 Q34 78 50 80 Q66 78 68 54 Q64 66 58 66 Q50 63 42 66 Q36 66 32 54 Z" fill={haar} />}
        {bart === 'schnauzer' && <path d="M41 64 Q50 60 59 64 Q55 66 50 64.5 Q45 66 41 64 Z" fill={haar} />}
        <path d={mund} stroke="#7f1d1d" strokeWidth="2.2" fill={stimmung >= 60 ? '#fff' : 'none'} strokeLinecap="round" />
        {brille === 'rund' && (
          <g stroke="#1f2937" strokeWidth="1.8" fill="#ffffff22">
            <circle cx="40" cy="51" r="6.5" />
            <circle cx="60" cy="51" r="6.5" />
            <path d="M46.5 51 L53.5 51" />
          </g>
        )}
        {brille === 'eckig' && (
          <g stroke="#1f2937" strokeWidth="1.8" fill="#ffffff22">
            <rect x="32.5" y="46" width="14" height="10" rx="2.5" />
            <rect x="53.5" y="46" width="14" height="10" rx="2.5" />
            <path d="M46.5 50 L53.5 50" />
          </g>
        )}
        {muede && (
          <g transform="translate(70 70)">
            <rect x="0" y="0" width="12" height="14" rx="2" fill="#fafaf9" stroke="#57534e" />
            <path d="M12 4 q5 0 5 4 q0 4 -5 4" stroke="#57534e" fill="none" />
            <path d="M3 -3 q2 -3 0 -6 M8 -3 q2 -3 0 -6" stroke="#a8a29e" fill="none" />
          </g>
        )}
      </g>
      <circle cx="50" cy="50" r="48" fill="none" stroke={farbe} strokeWidth="2" opacity="0.6" />
    </svg>
  );
}
