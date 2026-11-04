import { FirmenLogo } from './FirmenLogo';
import type { CorporateIdentity } from '../../engine';
import type { ProductId } from '../../engine';

export const PRODUKT_FARBE: Record<ProductId, string> = {
  stadtrad: '#0d9488', ebike: '#6366f1', mountainbike: '#d97706', lastenrad: '#db2777', rennrad: '#dc2626', emtb: '#7c3aed',
};

type P = [number, number];
interface Geometrie {
  hinten: [number, number, number];
  vorne: [number, number, number];
  tretlager: P;
  sattel: P;
  lenker: P;
  /** Rahmenrohre */
  rahmen: string;
  gabel: string;
  lenkerPfad: string;
  sattelPfad: string;
  /** Reifenbreite (Strichstärke) */
  reifen: number;
  /** Akku entlang des Unterrohrs (von, bis) */
  akku?: [P, P];
  motor?: 'nabe' | 'mitte';
  /** Zusätze: Korb, Kiste, Schutzbleche, Dämpfer … */
  extras?: { d: string; fuellung?: boolean; breite?: number }[];
  stollen?: boolean;
  felgenInnen?: boolean;
}

/** Jede Bauform hat ihre eigene Silhouette (Koordinaten im 64×40-Raster, Boden bei y≈38) */
const GEOMETRIE: Record<ProductId, Geometrie> = {
  stadtrad: {
    hinten: [13, 28, 9], vorne: [51, 28, 9], tretlager: [29, 30], sattel: [25, 10], lenker: [43, 5],
    rahmen: 'M13 28 L29 30 L25 11 M13 28 L25.5 14 M29 30 Q33 20 46 17 L44 11',
    gabel: 'M46 17 L51 28', lenkerPfad: 'M44 11 L43 6 Q48 4 39 4.5', sattelPfad: 'M21 10 H29', reifen: 3,
    extras: [
      { d: 'M47 8.5 h11 l-1.5 7 h-8 z', fuellung: true, breite: 2 },
      { d: 'M3 27 A10 10 0 0 1 21 23', breite: 2 },
      { d: 'M43 23 A10 10 0 0 1 61 27', breite: 2 },
      { d: 'M6 18 H23 M13 18 L13 28', breite: 2 },
    ],
  },
  ebike: {
    hinten: [13, 28, 9], vorne: [51, 28, 9], tretlager: [30, 30], sattel: [26, 10], lenker: [45, 7],
    rahmen: 'M13 28 L30 30 L26 11 M13 28 L26.5 14 M30 30 L45.5 17 M26.8 15 L44.6 13.5 L45.5 17 L44 12',
    gabel: 'M45.5 17 L51 28', lenkerPfad: 'M44 12 L43 7 H48', sattelPfad: 'M22 10 H30', reifen: 3,
    akku: [[32.5, 26.5], [42, 19]], motor: 'nabe',
    extras: [
      { d: 'M3 27 A10 10 0 0 1 21 23', breite: 2 },
      { d: 'M43 23 A10 10 0 0 1 61 27', breite: 2 },
      { d: 'M6 18 H23 M13 18 L13 28', breite: 2 },
    ],
  },
  mountainbike: {
    hinten: [13, 28, 9], vorne: [51, 28, 9], tretlager: [29, 29], sattel: [25, 11], lenker: [42, 7],
    rahmen: 'M13 28 L29 29 L25 12 M13 28 L26 18 M29 29 L44.5 16 M25.6 14.5 L43 12 L44.5 16',
    gabel: 'M44.5 16 L48 22.5 M48 22.5 L51 28', lenkerPfad: 'M43 12 L42 7 M36 7 H48', sattelPfad: 'M21 11 H29', reifen: 4.5,
    stollen: true,
    extras: [
      { d: 'M44.8 16.5 L47.6 22', breite: 5.5 },
      { d: 'M22 19 L27 17.5', breite: 4 },
    ],
  },
  rennrad: {
    hinten: [13, 28, 10], vorne: [51, 28, 10], tretlager: [30, 30], sattel: [25, 9], lenker: [51, 9],
    rahmen: 'M13 28 L30 30 L25 10 M13 28 L25.5 12 M30 30 L46 15 M25.5 11.2 L45 10.5 L46 15',
    gabel: 'M46 15 Q49 22 51 28', lenkerPfad: 'M45 10.5 L47 9 H51 Q54 9 54 12.5 Q54 16 51 16', sattelPfad: 'M21 9 H28', reifen: 1.8,
    felgenInnen: true,
  },
  lastenrad: {
    hinten: [10, 29, 8], vorne: [55, 32, 5.5], tretlager: [24, 30], sattel: [21, 10], lenker: [30, 5],
    rahmen: 'M10 29 L24 30 L21 11 M10 29 L21.5 14 M24 30 L33 18 L32 12 M24 31 H50 L55 32 M33 18 L34 29',
    gabel: 'M51 22 L55 32', lenkerPfad: 'M32 12 L31 7 Q35 5 27 5.5', sattelPfad: 'M17 10 H25', reifen: 3,
    akku: [[25.5, 27.5], [31, 20.5]], motor: 'nabe',
    extras: [
      { d: 'M35 16 H53 L51.5 29 H36.5 Z', fuellung: true, breite: 2 },
      { d: 'M1.5 26 A9 9 0 0 1 17 22', breite: 2 },
    ],
  },
  emtb: {
    hinten: [13, 28, 9], vorne: [51, 28, 9], tretlager: [29, 29], sattel: [25, 11], lenker: [42, 7],
    rahmen: 'M13 28 L29 29 L25 12 M13 28 L26 18 M29 29 L44.5 16 M25.6 14.5 L43 12 L44.5 16',
    gabel: 'M44.5 16 L48 22.5 M48 22.5 L51 28', lenkerPfad: 'M43 12 L42 7 M36 7 H48', sattelPfad: 'M21 11 H29', reifen: 4.5,
    stollen: true, akku: [[31, 26.5], [41.5, 18.5]], motor: 'mitte',
    extras: [
      { d: 'M44.8 16.5 L47.6 22', breite: 5.5 },
      { d: 'M22 19 L27 17.5', breite: 4 },
    ],
  },
};

function Rad({ g, wo, c, reifenFarbe, detail, luftlos }: { g: Geometrie; wo: 'hinten' | 'vorne'; c: string; reifenFarbe: string; detail: boolean; luftlos?: boolean }) {
  const [x, y, r] = g[wo];
  return (
    <g>
      <circle cx={x} cy={y} r={r} stroke={reifenFarbe} strokeWidth={g.reifen} />
      {g.stollen && <circle cx={x} cy={y} r={r + g.reifen / 2} stroke={reifenFarbe} strokeWidth="1.6" strokeDasharray="1.2 1.8" />}
      {g.felgenInnen && <circle cx={x} cy={y} r={r - 2.5} stroke={c} strokeWidth="1.2" opacity="0.6" />}
      {detail && !luftlos && [0, 30, 60, 90, 120, 150].map((a) => (
        <line key={a} x1={x + Math.cos((a * Math.PI) / 180) * (r - 1)} y1={y + Math.sin((a * Math.PI) / 180) * (r - 1)} x2={x - Math.cos((a * Math.PI) / 180) * (r - 1)} y2={y - Math.sin((a * Math.PI) / 180) * (r - 1)} stroke="#94a3b8" strokeWidth="0.4" />
      ))}
      {luftlos && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <path key={a} d={`M${x} ${y} L${x + Math.cos((a * Math.PI) / 180) * (r - 1)} ${y + Math.sin((a * Math.PI) / 180) * (r - 1)}`} stroke="#f59e0b" strokeWidth="1.2" />
      ))}
      {luftlos && <circle cx={x} cy={y} r={r - 3.5} stroke="#f59e0b" strokeWidth="1" />}
    </g>
  );
}

/** Zeichnet eine Bauform; mit `features` werden erforschte Ausstattungen am Rad sichtbar. */
function Rad2D({ produkt, c, detail, features = [] }: { produkt: ProductId; c: string; detail: boolean; features?: string[] }) {
  const g = GEOMETRIE[produkt];
  const hat = (id: string) => features.includes(id);
  const reifen = detail ? '#334155' : c;
  const [hx, hy, hr] = g.hinten;
  const [vx, vy, vr] = g.vorne;
  const [bx, by] = g.tretlager;
  const [sx, sy] = g.sattel;
  const [lx, ly] = g.lenker;
  const rahmenFarbe = hat('f-carbon') && SPORT.includes(produkt) ? '#1f2937' : c;
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Antrieb: Kette oder Riemen */}
      {detail && <path d={`M${bx} ${by - 2.5} L${hx} ${hy - 2} M${bx} ${by + 2.5} L${hx} ${hy + 2}`} stroke={hat('f-riemen') ? '#f97316' : '#94a3b8'} strokeWidth={hat('f-riemen') ? 1.6 : 0.9} strokeDasharray={hat('f-riemen') ? undefined : '1 0.8'} />}
      <Rad g={g} wo="hinten" c={c} reifenFarbe={reifen} detail={detail} luftlos={hat('f-luftlos')} />
      <Rad g={g} wo="vorne" c={c} reifenFarbe={reifen} detail={detail} luftlos={hat('f-luftlos')} />
      {g.extras?.map((e, i) => (
        <path key={i} d={e.d} stroke={c} strokeWidth={e.breite ?? 3} fill={e.fuellung ? c : 'none'} fillOpacity={e.fuellung ? 0.22 : 0} />
      ))}
      <path d={g.rahmen} stroke={rahmenFarbe} strokeWidth="3" />
      {hat('f-alurahmen') && !(hat('f-carbon') && SPORT.includes(produkt)) && <path d={g.rahmen} stroke="white" strokeWidth="0.7" opacity="0.75" transform="translate(-0.4 -0.6)" />}
      {hat('f-carbon') && SPORT.includes(produkt) && <path d={g.rahmen} stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="0.8 1.2" />}
      {hat('f-solar') && E_MODELLE.includes(produkt) && <path d={g.rahmen} stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 1" />}
      <path d={g.gabel} stroke={rahmenFarbe} strokeWidth="3" />
      <path d={g.lenkerPfad} stroke={c} strokeWidth="2.5" />
      {!hat('f-magnet') && <path d={g.sattelPfad} stroke={c} strokeWidth="3" />}
      {g.akku && (
        <line x1={g.akku[0][0]} y1={g.akku[0][1]} x2={g.akku[1][0]} y2={g.akku[1][1]} stroke={hat('f-wechselakku') ? '#22c55e' : detail ? '#1e293b' : c} strokeWidth="4.5" />
      )}
      {g.akku && detail && (
        <line x1={g.akku[0][0]} y1={g.akku[0][1]} x2={g.akku[1][0]} y2={g.akku[1][1]} stroke="#facc15" strokeWidth="0.8" strokeDasharray="1.5 2" />
      )}
      {g.motor === 'nabe' && <circle cx={hx} cy={hy} r="3.2" fill={detail ? '#1e293b' : c} />}
      {g.motor === 'mitte' && <circle cx={bx} cy={by} r="3.6" fill={detail ? '#1e293b' : c} />}
      <circle cx={bx} cy={by} r="2" fill={c} />

      {/* ------- sichtbare Features ------- */}
      {hat('f-nabenschaltung') && <circle cx={hx} cy={hy} r="2.6" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />}
      {hat('f-scheibenbremsen') && (
        <g stroke="#cbd5e1" strokeWidth="1">
          <circle cx={hx} cy={hy} r="3.8" />
          <circle cx={vx} cy={vy} r={Math.min(3.8, vr - 1.5)} />
        </g>
      )}
      {hat('f-licht') && (
        <g>
          <path d={`M${lx + 4} ${ly + 6} L${lx + 20} ${ly + 1} L${lx + 20} ${ly + 13} Z`} fill="#fde047" opacity="0.35" />
          <circle cx={lx + 4} cy={ly + 6} r="1.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
        </g>
      )}
      {hat('f-gps') && (
        <g stroke="#22c55e" strokeWidth="0.8">
          <circle cx={sx} cy={sy + 4} r="1.2" fill="#22c55e" />
          <path d={`M${sx - 3} ${sy + 1} A4 4 0 0 1 ${sx + 3} ${sy + 1} M${sx - 5} ${sy - 1} A7 7 0 0 1 ${sx + 5} ${sy - 1}`} />
        </g>
      )}
      {hat('f-smart') && <rect x={lx - 2} y={ly - 4} width="5" height="3.5" rx="0.8" fill="#0ea5e9" stroke="#0369a1" strokeWidth="0.5" />}
      {hat('f-falt') && ['stadtrad', 'ebike', 'rennrad'].includes(produkt) && <circle cx={(bx + lx) / 2} cy={(by + ly) / 2 + 4} r="1.8" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />}
      {hat('f-gyro') && (
        <g transform={`translate(${(bx + sx + hx) / 3 + 3} ${(by + sy + hy) / 3 + 2})`}>
          <ellipse rx="3.4" ry="1.4" stroke="#a855f7" strokeWidth="0.8">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.2s" repeatCount="indefinite" />
          </ellipse>
          <circle r="1" fill="#a855f7" />
        </g>
      )}
      {hat('f-magnet') && (
        <g>
          <path d={g.sattelPfad} stroke={c} strokeWidth="3" transform="translate(0 -3.5)">
            <animateTransform attributeName="transform" type="translate" values="0 -3.5;0 -4.5;0 -3.5" dur="1.6s" repeatCount="indefinite" />
          </path>
          <path d={`M${sx - 3} ${sy - 1} Q${sx} ${sy - 3} ${sx + 3} ${sy - 1}`} stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="0.8 0.8" />
        </g>
      )}
      {hat('f-rakete') && ['ebike', 'rennrad', 'emtb'].includes(produkt) && (
        <g transform={`translate(${hx - 6} ${hy - hr - 4})`}>
          <path d="M0 0 H9 L11 1.5 L9 3 H0 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.6" />
          <path d="M0 0.3 L-5 1.5 L0 2.7 Z" fill="#f97316">
            <animate attributeName="d" values="M0 0.3 L-5 1.5 L0 2.7 Z;M0 0.3 L-8 1.5 L0 2.7 Z;M0 0.3 L-5 1.5 L0 2.7 Z" dur="0.3s" repeatCount="indefinite" />
          </path>
        </g>
      )}
      {hat('f-gedanken') && (
        <g stroke="#ec4899" strokeWidth="0.7">
          <path d={`M${lx - 1} ${ly - 3} q1.5 -2 0 -4 M${lx + 1.5} ${ly - 3} q1.5 -2.5 0 -5 M${lx + 4} ${ly - 3} q1.5 -2 0 -4`} />
        </g>
      )}
      {hat('f-bewusstsein') && (
        <g>
          <circle cx={lx + 2.5} cy={ly + 8} r="1.3" fill="white" stroke="#0f172a" strokeWidth="0.4" />
          <circle cx={lx + 2.9} cy={ly + 8} r="0.6" fill="#0f172a" />
          <path d={`M${lx - 4} ${ly - 2} c-1 -1.5 -3 0 -1 1.8 c2 -1.8 0 -3.3 -1 -1.8`} fill="#f43f5e" />
        </g>
      )}
      {hat('f-flux') && (
        <g stroke="#facc15" strokeWidth="0.9">
          <path d={`M${hx - hr - 2} ${hy - 4} l-4 2 l3 1 l-5 3`} />
          <path d={`M${hx - hr - 1} ${hy + 3} l-5 1 l3 1.5 l-5 1.5`} />
        </g>
      )}
    </g>
  );
}

const SPORT: ProductId[] = ['mountainbike', 'rennrad', 'emtb'];
const E_MODELLE: ProductId[] = ['ebike', 'lastenrad', 'emtb'];

/** Kleines Symbolbild je Fahrradmodell – jede Bauform hat ihre eigene Silhouette */
export function BikeIcon({ produkt, className = 'h-8 w-12', farbe }: { produkt: ProductId; className?: string; farbe?: string }) {
  const c = farbe ?? PRODUKT_FARBE[produkt];
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <Rad2D produkt={produkt} c={c} detail={false} />
    </svg>
  );
}

/** Große Darstellung mit Speichen, Akku und allen erforschten Features */
export function BikeBild({ produkt, features = [], className = 'h-32 w-52', farbe, logo, firma = '' }: { produkt: ProductId; features?: string[]; className?: string; farbe?: string; logo?: CorporateIdentity; firma?: string }) {
  const c = farbe ?? PRODUKT_FARBE[produkt];
  const schwebt = features.includes('f-antigrav');
  const g = GEOMETRIE[produkt];
  // Logo-Aufkleber auf dem Unterrohr (zwischen Tretlager und Lenkkopf)
  const lx = g.tretlager[0] + (g.lenker[0] - g.tretlager[0]) * 0.45;
  const ly = g.tretlager[1] + (g.lenker[1] - g.tretlager[1]) * 0.45 + 1.5;
  return (
    <svg viewBox="-8 -10 82 54" className={className} role="img" aria-label="Fahrrad">
      <ellipse cx="32" cy="39.5" rx="28" ry="1.6" fill={schwebt ? '#a855f7' : '#94a3b8'} opacity={schwebt ? 0.35 : 0.3} />
      <g>
        {schwebt && <animateTransform attributeName="transform" type="translate" values="0 -3;0 -5;0 -3" dur="2s" repeatCount="indefinite" />}
        <Rad2D produkt={produkt} c={c} detail features={features} />
        {logo && <FirmenLogo ci={logo} name={firma} x={lx - 3.2} y={ly - 3.2} groesse={6.4} />}
      </g>
      {schwebt && (
        <g stroke="#c084fc" strokeWidth="0.6" opacity="0.7">
          <path d="M8 37 v-2 M14 38 v-2.5 M48 37 v-2 M54 38 v-2.5" />
        </g>
      )}
    </svg>
  );
}
