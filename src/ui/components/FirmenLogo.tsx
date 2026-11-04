import type { CorporateIdentity, GameState } from '../../engine';

export const LOGO_SYMBOLE: { id: string; name: string }[] = [
  { id: 'rad', name: 'Laufrad' },
  { id: 'blitz', name: 'Blitz' },
  { id: 'berg', name: 'Berg' },
  { id: 'blatt', name: 'Blatt' },
  { id: 'stern', name: 'Stern' },
  { id: 'krone', name: 'Krone' },
  { id: 'zahnrad', name: 'Kettenblatt' },
  { id: 'welle', name: 'Welle' },
  { id: 'pfeil', name: 'Pfeil' },
  { id: 'herz', name: 'Herz' },
  { id: 'sonne', name: 'Sonne' },
  { id: 'initiale', name: 'Initiale' },
];
export const LOGO_FORMEN: CorporateIdentity['form'][] = ['kreis', 'schild', 'raute', 'quadrat', 'sechseck'];
export const CI_FARBEN = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0f172a', '#475569', '#0891b2', '#9333ea'];
export const CI_FARBEN2 = ['#ffffff', '#fde047', '#fbbf24', '#f9a8d4', '#a5f3fc', '#bbf7d0', '#e2e8f0', '#0f172a'];
export const SLOGANS = [
  'Wir bringen die Welt ins Rollen.',
  'Zwei Räder. Ein Versprechen.',
  'Tritt für Tritt besser.',
  'Weil Autos langweilig sind.',
  'Rückenwind inklusive.',
  'Fahr dein Ding.',
  'Kette rechts, Herz links.',
  'Mehr Speiche, weniger Stau.',
  'Gebaut für morgen.',
  'Ein Rad. Viele Geschichten.',
];

/** CI des Spielstands (mit Standardwerten für ältere Spielstände) */
export function ciVon(s: Pick<GameState, 'unternehmen'>): CorporateIdentity {
  return s.unternehmen.ci ?? { symbol: 'rad', form: 'kreis', farbe: s.unternehmen.farbe, farbe2: '#ffffff', slogan: 'Wir bringen die Welt ins Rollen.' };
}

function Form({ form, farbe }: { form: CorporateIdentity['form']; farbe: string }) {
  switch (form) {
    case 'schild':
      return <path d="M50 4 L90 16 V48 Q90 80 50 96 Q10 80 10 48 V16 Z" fill={farbe} />;
    case 'raute':
      return <rect x="17" y="17" width="66" height="66" rx="10" transform="rotate(45 50 50)" fill={farbe} />;
    case 'quadrat':
      return <rect x="6" y="6" width="88" height="88" rx="20" fill={farbe} />;
    case 'sechseck':
      return <path d="M50 3 L91 26.5 V73.5 L50 97 L9 73.5 V26.5 Z" fill={farbe} />;
    default:
      return <circle cx="50" cy="50" r="46" fill={farbe} />;
  }
}

function Symbol({ id, c, initiale }: { id: string; c: string; initiale: string }) {
  switch (id) {
    case 'blitz':
      return <path d="M56 16 L30 54 H48 L42 84 L70 44 H52 Z" fill={c} />;
    case 'berg':
      return <path d="M14 72 L38 34 L50 52 L60 40 L86 72 Z M33 42 L38 34 L43 42 L38 46 Z" fill={c} />;
    case 'blatt':
      return <g fill="none" stroke={c} strokeWidth="5" strokeLinecap="round"><path d="M28 72 Q24 30 72 26 Q76 70 28 72 Z" fill={c} /><path d="M30 70 Q46 52 62 36" stroke="#00000033" /></g>;
    case 'stern':
      return <path d="M50 16 L59 40 L84 40 L64 55 L72 80 L50 65 L28 80 L36 55 L16 40 L41 40 Z" fill={c} />;
    case 'krone':
      return <path d="M20 68 L16 32 L34 48 L50 24 L66 48 L84 32 L80 68 Z M22 74 H78 V80 H22 Z" fill={c} />;
    case 'zahnrad':
      return (
        <g fill={c}>
          {Array.from({ length: 12 }, (_, i) => <rect key={i} x="46" y="16" width="8" height="12" rx="2" transform={`rotate(${i * 30} 50 50)`} />)}
          <circle cx="50" cy="50" r="24" />
          <circle cx="50" cy="50" r="10" fill="#00000040" />
        </g>
      );
    case 'welle':
      return <g fill="none" stroke={c} strokeWidth="7" strokeLinecap="round"><path d="M18 42 Q34 28 50 42 T82 42" /><path d="M18 60 Q34 46 50 60 T82 60" /></g>;
    case 'pfeil':
      return <path d="M18 56 L56 56 L56 70 L84 48 L56 26 L56 40 L18 40 Z" fill={c} />;
    case 'herz':
      return <path d="M50 80 Q14 58 20 36 Q26 20 42 24 Q48 26 50 32 Q52 26 58 24 Q74 20 80 36 Q86 58 50 80 Z" fill={c} />;
    case 'sonne':
      return (
        <g fill={c}>
          <circle cx="50" cy="50" r="16" />
          {Array.from({ length: 10 }, (_, i) => <rect key={i} x="47.5" y="14" width="5" height="12" rx="2.5" transform={`rotate(${i * 36} 50 50)`} />)}
        </g>
      );
    case 'initiale':
      return <text x="50" y="66" textAnchor="middle" fontSize="48" fontWeight="900" fontFamily="'Baloo 2', system-ui, sans-serif" fill={c}>{initiale}</text>;
    default:
      return (
        <g fill="none" stroke={c} strokeWidth="5">
          <circle cx="50" cy="50" r="27" />
          <circle cx="50" cy="50" r="5" fill={c} />
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1="50" y1="50" x2="50" y2="24" strokeWidth="2.5" transform={`rotate(${i * 45} 50 50)`} />)}
        </g>
      );
  }
}

/** Firmenlogo als SVG. Mit x/y/groesse lässt es sich in andere SVGs einbetten. */
export function FirmenLogo({ ci, name, className, x, y, groesse }: { ci: CorporateIdentity; name: string; className?: string; x?: number; y?: number; groesse?: number }) {
  const initiale = (name.trim()[0] ?? 'F').toUpperCase();
  return (
    <svg viewBox="0 0 100 100" className={className} x={x} y={y} width={groesse} height={groesse} role="img" aria-label={`Logo von ${name}`}>
      <Form form={ci.form} farbe={ci.farbe} />
      <Symbol id={ci.symbol} c={ci.farbe2} initiale={initiale} />
    </svg>
  );
}
