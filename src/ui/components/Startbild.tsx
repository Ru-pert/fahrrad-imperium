import { motion } from 'framer-motion';
import { useGame } from '../../store/gameStore';
import { BikeBild } from './BikeIcon';

/** Titelbild: Garage in Firmenfarbe mit Schild, aus der ein Rad rollt */
export function GaragenSzene({ name, farbe }: { name: string; farbe: string }) {
  const reduziert = useGame((s) => s.reduziert);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 via-sky-100 to-amber-50 shadow-xl ring-1 ring-black/5 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-800">
      <svg viewBox="0 0 600 340" className="block w-full" aria-hidden="true">
        {/* Sonne, Wolken */}
        <circle cx="510" cy="70" r="34" fill="#fde047" />
        {[0, 1].map((i) => (
          <motion.g key={i} initial={{ x: i * 260 }} animate={reduziert ? undefined : { x: [i * 260, i * 260 + 600] }} transition={{ duration: 40 + i * 10, repeat: Infinity, ease: 'linear' }}>
            <g transform={`translate(${-120} ${50 + i * 40})`} fill="#ffffff" opacity="0.9">
              <ellipse cx="0" cy="0" rx="34" ry="14" />
              <ellipse cx="26" cy="-8" rx="24" ry="14" />
              <ellipse cx="-24" cy="-4" rx="18" ry="10" />
            </g>
          </motion.g>
        ))}
        {/* Hügel, Straße */}
        <path d="M0 250 Q 150 200 300 240 T 600 225 V 340 H 0 Z" fill="#86efac" />
        <path d="M0 270 Q 200 245 400 268 T 600 262 V 340 H 0 Z" fill="#4ade80" />
        <rect x="0" y="292" width="600" height="48" fill="#57534e" />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 56} y="314" width="28" height="4" fill="#fafaf9" />)}
        {/* Garage */}
        <g>
          <path d="M70 292 V 170 L 170 118 L 270 170 V 292 Z" fill={farbe} />
          <path d="M60 172 L 170 112 L 280 172" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="100" y="196" width="140" height="96" rx="4" fill="#1e293b" />
          <clipPath id="tor"><rect x="100" y="196" width="140" height="96" /></clipPath>
          <g clipPath="url(#tor)">
          <motion.g initial={{ y: 0 }} animate={reduziert ? { y: -80 } : { y: [0, -80] }} transition={{ duration: 1.2, delay: 0.4 }}>
            <rect x="100" y="196" width="140" height="96" fill="#e2e8f0" />
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="100" y={196 + i * 19} width="140" height="2" fill="#94a3b8" />)}
          </motion.g>
          </g>
          {/* Schild */}
          <rect x="96" y="150" width="148" height="30" rx="6" fill="#fef3c7" stroke="#1e293b" strokeWidth="3" />
          <text x="170" y="171" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1e293b" style={{ fontFamily: 'Bricolage Grotesque Variable, Inter, sans-serif' }}>
            {name.length > 22 ? `${name.slice(0, 21)}…` : name || 'Deine Firma'}
          </text>
          <rect x="250" y="210" width="16" height="16" fill="#fef9c3" stroke="#1e293b" strokeWidth="2" />
        </g>
      </svg>
      {/* Rad rollt aus der Garage */}
      <motion.div
        className="absolute bottom-[9%] left-[18%] w-[34%]"
        initial={{ x: '0%', opacity: 0 }}
        animate={reduziert ? { x: '120%', opacity: 1 } : { x: ['0%', '0%', '130%'], opacity: [0, 1, 1] }}
        transition={{ duration: 2.4, delay: 1.2, times: [0, 0.2, 1], ease: 'easeOut' }}
      >
        <BikeBild produkt="stadtrad" farbe={farbe} className="h-auto w-full" />
      </motion.div>
    </div>
  );
}
