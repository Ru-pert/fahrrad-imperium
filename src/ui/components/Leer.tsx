import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useGame } from '../../store/gameStore';

/** Kleine Szene: ein Fahrrad wartet vor der Garage, über ihm eine Sanduhr */
function WarteSzene({ farbe }: { farbe: string }) {
  const reduziert = useGame((s) => s.reduziert);
  return (
    <svg viewBox="0 0 160 96" className="h-24 w-40" aria-hidden="true">
      <ellipse cx="80" cy="88" rx="70" ry="5" fill="#94a3b8" opacity="0.2" />
      <path d="M18 86V40l38-20 38 20v46z" fill={farbe} opacity="0.12" />
      <path d="M18 86V40l38-20 38 20v46" fill="none" stroke={farbe} strokeWidth="3" strokeLinejoin="round" />
      <rect x="32" y="52" width="48" height="34" rx="2" fill="none" stroke={farbe} strokeWidth="2.5" />
      <path d="M32 60h48M32 68h48M32 76h48" stroke={farbe} strokeWidth="1.5" opacity="0.5" />
      <g transform="translate(96 58)">
        <circle cx="8" cy="20" r="8" fill="none" stroke="#334155" strokeWidth="2.5" />
        <circle cx="40" cy="20" r="8" fill="none" stroke="#334155" strokeWidth="2.5" />
        <path d="M8 20l10-14h14l8 14M18 6l8 14 6-14M15 2h7M32 6l-2-5h5" fill="none" stroke={farbe} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <motion.g
        style={{ originX: '120px', originY: '24px' }}
        animate={reduziert ? undefined : { rotate: [0, 0, 180, 180] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
      >
        <path d="M112 12h16M112 36h16M114 12c0 8 12 8 12 12s-12 4-12 12M126 12c0 8-12 8-12 12s12 4 12 12" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M117 31l3-3 3 3z" fill="#f59e0b" />
      </motion.g>
    </svg>
  );
}

/** Freundlicher leerer Zustand mit Illustration */
export function Leer({ titel, children, aktion }: { titel: string; children?: ReactNode; aktion?: ReactNode }) {
  const farbe = useGame((s) => s.state?.unternehmen.farbe) ?? '#0d9488';
  return (
    <div className="flex flex-col items-center gap-1 py-6 text-center">
      <WarteSzene farbe={farbe} />
      <div className="font-display mt-1 text-base font-bold">{titel}</div>
      {children && <div className="muted max-w-md text-sm">{children}</div>}
      {aktion && <div className="mt-2">{aktion}</div>}
    </div>
  );
}
