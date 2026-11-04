import type { FeatureBild as BildId } from '../../engine/config/features';

const M = '#64748b'; // Metall
const D = '#1e293b'; // dunkel

/** Bildliche Darstellung je Feature (48×48) – zeigt, was entwickelt wird */
export function FeatureBild({ bild, className = 'h-12 w-12', bewegt = true, groesse }: { bild: BildId; className?: string; bewegt?: boolean; groesse?: number }) {
  return (
    <svg viewBox="0 0 48 48" className={groesse ? undefined : className} width={groesse} height={groesse} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {inhalt(bild, bewegt)}
    </svg>
  );
}

function Drehen({ an, dauer = '3s', um = '24 24' }: { an: boolean; dauer?: string; um?: string }) {
  if (!an) return null;
  const [x, y] = um.split(' ');
  return <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur={dauer} repeatCount="indefinite" />;
}

function inhalt(bild: BildId, a: boolean) {
  switch (bild) {
    case 'nabenschaltung':
      return (
        <>
          <circle cx="24" cy="24" r="19" stroke={D} strokeWidth="3" />
          <g>
            <Drehen an={a} dauer="6s" />
            {Array.from({ length: 8 }, (_, i) => i * 45).map((w) => (
              <line key={w} x1="24" y1="24" x2={24 + 17 * Math.cos((w * Math.PI) / 180)} y2={24 + 17 * Math.sin((w * Math.PI) / 180)} stroke="#94a3b8" strokeWidth="1" />
            ))}
          </g>
          <circle cx="24" cy="24" r="8" fill="#e2e8f0" stroke={M} strokeWidth="2" />
          <text x="24" y="27.5" textAnchor="middle" fontSize="9" fontWeight="700" fill={D}>8</text>
        </>
      );
    case 'scheibenbremse':
      return (
        <>
          <g>
            <Drehen an={a} dauer="4s" />
            <circle cx="24" cy="24" r="16" fill="#cbd5e1" stroke={M} strokeWidth="2" />
            {Array.from({ length: 6 }, (_, i) => i * 60).map((w) => (
              <circle key={w} cx={24 + 10.5 * Math.cos((w * Math.PI) / 180)} cy={24 + 10.5 * Math.sin((w * Math.PI) / 180)} r="2" fill="white" stroke={M} strokeWidth="0.8" />
            ))}
            <circle cx="24" cy="24" r="4" fill={M} />
          </g>
          <path d="M33 6 h9 a3 3 0 0 1 3 3 v10 a3 3 0 0 1 -3 3 h-9 z" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
          <text x="38" y="16" textAnchor="middle" fontSize="5" fontWeight="700" fill="white">HYD</text>
        </>
      );
    case 'licht':
      return (
        <>
          <path d="M18 18 L46 6 L46 42 L18 30 Z" fill="#fde047" opacity="0.45">
            {a && <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />}
          </path>
          <rect x="6" y="16" width="14" height="16" rx="4" fill={D} />
          <circle cx="17" cy="24" r="5" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" />
          <path d="M10 36 q2 6 8 6" stroke={M} strokeWidth="2" />
          <text x="11" y="46" fontSize="6" fill={M}>⚡</text>
        </>
      );
    case 'alurahmen':
      return (
        <>
          <path d="M6 38 L22 14 L42 14 L30 38 Z M22 14 L30 38" stroke="#cbd5e1" strokeWidth="5" />
          <path d="M6 38 L22 14 L42 14 L30 38 Z M22 14 L30 38" stroke="white" strokeWidth="1.2" opacity="0.9" />
          <path d="M34 22 c4 -4 8 -2 9 -8 c-6 0 -9 4 -9 8 z" fill="#38bdf8" />
          <text x="40" y="32" textAnchor="middle" fontSize="7" fontWeight="700" fill="#0284c7">−2kg</text>
        </>
      );
    case 'riemen':
      return (
        <>
          <path d="M12 14 L36 18 M12 34 L36 30" stroke="#f97316" strokeWidth="3" />
          <path d="M12 14 A10 10 0 0 0 12 34 M36 18 A6 6 0 0 1 36 30" stroke="#f97316" strokeWidth="3" />
          <g><Drehen an={a} dauer="3s" um="12 24" /><circle cx="12" cy="24" r="8" fill="#e2e8f0" stroke={M} strokeWidth="2" strokeDasharray="2 1.2" /></g>
          <g><Drehen an={a} dauer="1.8s" um="36 24" /><circle cx="36" cy="24" r="4.5" fill="#e2e8f0" stroke={M} strokeWidth="2" strokeDasharray="1.6 1" /></g>
        </>
      );
    case 'wechselakku':
      return (
        <>
          <rect x="6" y="14" width="26" height="22" rx="4" fill="#22c55e" stroke="#15803d" strokeWidth="2">
            {a && <animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2s" repeatCount="indefinite" />}
          </rect>
          <rect x="15" y="10" width="8" height="4" rx="1" fill="#15803d" />
          <path d="M21 18 l-5 8 h5 l-3 7 l8 -10 h-5 l3 -5 z" fill="#fde047" />
          <path d="M36 30 h6 M39 24 v-6 M36 18 h6 v6" stroke={M} strokeWidth="2.5" />
        </>
      );
    case 'carbon':
      return (
        <>
          <defs>
            <pattern id="fb-carbon" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#111827" />
              <rect width="2" height="2" fill="#374151" />
              <rect x="2" y="2" width="2" height="2" fill="#374151" />
            </pattern>
          </defs>
          <path d="M6 38 L22 12 L42 12 L30 38 Z" fill="url(#fb-carbon)" stroke="#111827" strokeWidth="2" />
          <path d="M14 30 L22 18 L34 18 L28 30 Z" fill="var(--card, #fff)" />
          <text x="25" y="46" textAnchor="middle" fontSize="6" fontWeight="700" fill={M}>CARBON</text>
        </>
      );
    case 'gps':
      return (
        <>
          <path d="M4 40 L16 34 L30 40 L44 34 V8 L30 14 L16 8 L4 14 Z" fill="#dcfce7" stroke="#86efac" strokeWidth="1.5" />
          <path d="M24 30 c-6 -7 -8 -10 -8 -14 a8 8 0 0 1 16 0 c0 4 -2 7 -8 14 z" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
          <circle cx="24" cy="16" r="3" fill="white" />
          {a && (
            <circle cx="24" cy="30" r="3" stroke="#ef4444" strokeWidth="1">
              <animate attributeName="r" values="2;12" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
        </>
      );
    case 'smart':
      return (
        <>
          <rect x="10" y="6" width="28" height="36" rx="5" fill={D} />
          <rect x="13" y="10" width="22" height="26" rx="2" fill="#0ea5e9" />
          <path d="M16 30 l5 -6 l4 3 l6 -9" stroke="white" strokeWidth="1.8" />
          <text x="24" y="17" textAnchor="middle" fontSize="6" fontWeight="700" fill="white">AUTO</text>
          <circle cx="24" cy="39" r="1.3" fill={M} />
        </>
      );
    case 'solar':
      return (
        <>
          <g>
            <Drehen an={a} dauer="12s" um="38 10" />
            <circle cx="38" cy="10" r="5" fill="#facc15" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((w) => (
              <line key={w} x1={38 + 7 * Math.cos((w * Math.PI) / 180)} y1={10 + 7 * Math.sin((w * Math.PI) / 180)} x2={38 + 9 * Math.cos((w * Math.PI) / 180)} y2={10 + 9 * Math.sin((w * Math.PI) / 180)} stroke="#facc15" strokeWidth="1.5" />
            ))}
          </g>
          <path d="M4 40 L10 22 L34 22 L28 40 Z" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.5" />
          <path d="M7 31 H31 M12 22 L8 40 M20 22 L16 40 M28 22 L23 40" stroke="#93c5fd" strokeWidth="0.8" />
        </>
      );
    case 'luftlos':
      return (
        <>
          <circle cx="24" cy="24" r="19" stroke={D} strokeWidth="4" />
          <g>
            <Drehen an={a} dauer="8s" />
            {Array.from({ length: 12 }, (_, i) => i * 30).map((w) => {
              const x = 24 + 13 * Math.cos((w * Math.PI) / 180);
              const y = 24 + 13 * Math.sin((w * Math.PI) / 180);
              return <polygon key={w} points={Array.from({ length: 6 }, (_, k) => `${x + 3 * Math.cos((k * Math.PI) / 3)},${y + 3 * Math.sin((k * Math.PI) / 3)}`).join(' ')} stroke="#f59e0b" strokeWidth="1.2" />;
            })}
          </g>
          <circle cx="24" cy="24" r="5" fill={M} />
        </>
      );
    case 'falt':
      return (
        <>
          <path d="M8 34 L20 14 L24 24" stroke="#0d9488" strokeWidth="4" />
          <path d="M24 24 L40 14 L36 34" stroke="#0d9488" strokeWidth="4">
            {a && <animateTransform attributeName="transform" type="rotate" values="0 24 24;-35 24 24;0 24 24" dur="2.5s" repeatCount="indefinite" />}
          </path>
          <circle cx="24" cy="24" r="3.5" fill="white" stroke={D} strokeWidth="1.5" />
          <rect x="14" y="38" width="20" height="7" rx="2" fill="#a16207" />
          <path d="M20 38 v-2 h8 v2" stroke="#a16207" strokeWidth="1.5" />
        </>
      );
    case 'gyro':
      return (
        <>
          <ellipse cx="24" cy="24" rx="18" ry="7" stroke="#a855f7" strokeWidth="2">
            <Drehen an={a} dauer="2s" />
          </ellipse>
          <ellipse cx="24" cy="24" rx="7" ry="18" stroke="#c084fc" strokeWidth="2">
            <Drehen an={a} dauer="3s" />
          </ellipse>
          <circle cx="24" cy="24" r="6" fill="#7c3aed" />
          <path d="M24 42 V46 M18 46 H30" stroke={M} strokeWidth="2" />
        </>
      );
    case 'rakete':
      return (
        <>
          <g transform="rotate(-45 24 24)">
            <path d="M24 4 C30 10 31 20 30 30 H18 C17 20 18 10 24 4 Z" fill="#e2e8f0" stroke={M} strokeWidth="1.5" />
            <circle cx="24" cy="16" r="3" fill="#38bdf8" stroke={M} strokeWidth="1" />
            <path d="M18 24 L12 32 L18 30 M30 24 L36 32 L30 30" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
            <path d="M19 31 Q24 46 29 31 Z" fill="#f97316">
              {a && <animate attributeName="d" values="M19 31 Q24 46 29 31 Z;M19 31 Q24 40 29 31 Z;M19 31 Q24 46 29 31 Z" dur="0.25s" repeatCount="indefinite" />}
            </path>
            <path d="M21 31 Q24 40 27 31 Z" fill="#fde047" />
          </g>
        </>
      );
    case 'magnet':
      return (
        <>
          <path d="M14 18 H34 Q38 18 34 22 Q28 24 24 24 Q20 24 14 22 Q10 18 14 18 Z" fill="#334155">
            {a && <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.8s" repeatCount="indefinite" />}
          </path>
          <path d="M12 46 V36 a12 12 0 0 1 24 0 V46" stroke="#ef4444" strokeWidth="6" />
          <path d="M12 46 v-4 M36 46 v-4" stroke="#cbd5e1" strokeWidth="6" />
          <path d="M16 30 q8 -6 16 0 M18 27 q6 -4 12 0" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1.5 1.5" />
        </>
      );
    case 'gedanken':
      return (
        <>
          <path d="M14 44 V36 C8 33 6 26 8 20 C10 10 20 6 28 8 C36 10 40 18 38 24 L41 30 L37 31 V36 Q37 40 32 39 L28 39 V44" fill="#fbcfe8" stroke="#be185d" strokeWidth="1.5" />
          <path d="M16 16 q4 -4 8 0 q4 -4 8 0 M17 22 q3 -3 6 0 q3 -3 6 0" stroke="#be185d" strokeWidth="1.2" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${40 + i * 2.5} ${6 + i * 1} a${4 + i * 3} ${4 + i * 3} 0 0 1 0 ${8 + i * 4}`} stroke="#ec4899" strokeWidth="1.3">
              {a && <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />}
            </path>
          ))}
        </>
      );
    case 'antigrav':
      return (
        <>
          <g>
            {a && <animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2s" repeatCount="indefinite" />}
            <circle cx="24" cy="20" r="14" stroke={D} strokeWidth="3" />
            <circle cx="24" cy="20" r="3" fill={M} />
          </g>
          <ellipse cx="24" cy="42" rx="14" ry="3" fill="#a855f7" opacity="0.4" />
          <path d="M14 38 v-3 M20 39 v-4 M28 39 v-4 M34 38 v-3" stroke="#c084fc" strokeWidth="1.3" />
          <path d="M2 45 H46" stroke={M} strokeWidth="1.5" />
        </>
      );
    case 'flux':
      return (
        <>
          <rect x="5" y="5" width="38" height="38" rx="4" fill="#cbd5e1" stroke={M} strokeWidth="1.5" />
          <path d="M24 24 L12 12 M24 24 L36 12 M24 24 V38" stroke="#facc15" strokeWidth="3">
            {a && <animate attributeName="stroke" values="#facc15;#fff;#facc15" dur="0.6s" repeatCount="indefinite" />}
          </path>
          <circle cx="12" cy="12" r="2.5" fill={D} />
          <circle cx="36" cy="12" r="2.5" fill={D} />
          <circle cx="24" cy="38" r="2.5" fill={D} />
          <text x="37" y="40" textAnchor="middle" fontSize="7" fontWeight="800" fill="#dc2626">88</text>
        </>
      );
    case 'bewusstsein':
      return (
        <>
          <circle cx="24" cy="26" r="17" fill="#fde68a" stroke="#ca8a04" strokeWidth="1.5" />
          <g>
            {[18, 30].map((x) => (
              <ellipse key={x} cx={x} cy="23" rx="3" ry="4" fill="white" stroke={D} strokeWidth="1">
                {a && <animate attributeName="ry" values="4;4;0.4;4" keyTimes="0;0.9;0.95;1" dur="3s" repeatCount="indefinite" />}
              </ellipse>
            ))}
            <circle cx="18.5" cy="24" r="1.6" fill={D} />
            <circle cx="30.5" cy="24" r="1.6" fill={D} />
          </g>
          <path d="M17 31 q7 6 14 0" stroke={D} strokeWidth="1.5" />
          <path d="M38 6 c-2 -3 -6 0 -2 3.5 c4 -3.5 0 -6.5 -2 -3.5" fill="#f43f5e">
            {a && <animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="1.2s" repeatCount="indefinite" />}
          </path>
        </>
      );
  }
}
