import { motion } from 'framer-motion';
import type { ErfolgDef } from '../../engine';
import { Icon } from './ui';

/** Medaillen-Abzeichen eines Erfolgs */
export function Abzeichen({ e, erreicht, groesse = 72, animiert = false, verzoegerung = 0 }: { e: ErfolgDef; erreicht: boolean; groesse?: number; animiert?: boolean; verzoegerung?: number }) {
  const farbe = erreicht ? e.farbe : '#94a3b8';
  const inhalt = (
    <div className="relative" style={{ width: groesse, height: groesse }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <defs>
          <linearGradient id={`g-${e.id}-${erreicht}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={erreicht ? '#fde68a' : '#e2e8f0'} />
            <stop offset="1" stopColor={erreicht ? '#d97706' : '#94a3b8'} />
          </linearGradient>
        </defs>
        {/* Band */}
        <path d="M30 70 L22 98 L36 90 L44 99 L50 72 Z M70 70 L78 98 L64 90 L56 99 L50 72 Z" fill={farbe} opacity={erreicht ? 0.9 : 0.4} />
        <circle cx="50" cy="44" r="38" fill={`url(#g-${e.id}-${erreicht})`} />
        <circle cx="50" cy="44" r="30" fill={erreicht ? farbe : '#cbd5e1'} />
        <circle cx="50" cy="44" r="30" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
      <div className="absolute grid place-items-center text-white" style={{ left: 0, right: 0, top: groesse * 0.14, height: groesse * 0.6 }}>
        <Icon name={erreicht ? e.icon : 'schloss'} className="h-[45%] w-[45%]" />
      </div>
    </div>
  );
  if (!animiert) return inhalt;
  return (
    <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: [0, 1.25, 1], rotate: [-40, 10, 0] }} transition={{ duration: 0.9, delay: verzoegerung }}>
      {inhalt}
    </motion.div>
  );
}
