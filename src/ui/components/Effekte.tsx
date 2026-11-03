import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const FARBEN = ['#0d9488', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#ec4899', '#facc15'];

/** Konfetti-Regen (rein dekorativ) */
export function Konfetti({ anzahl = 90 }: { anzahl?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden="true">
      {Array.from({ length: anzahl }, (_, i) => {
        const x = (i * 53) % 100;
        const dauer = 2.2 + ((i * 7) % 10) / 6;
        const breite = 6 + (i % 4) * 2;
        return (
          <motion.div
            key={i}
            className="absolute top-0 rounded-sm"
            style={{ left: `${x}%`, width: breite, height: breite * 0.45, background: FARBEN[i % FARBEN.length] }}
            initial={{ y: -40, rotate: 0, opacity: 1 }}
            animate={{ y: '105vh', rotate: 360 * (i % 2 ? 2 : -2), x: [0, (i % 5) * 12 - 24, 0], opacity: [1, 1, 0.6] }}
            transition={{ duration: dauer, delay: (i % 15) * 0.06, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}

const SCHRITTE = [
  { text: 'Kundschaft strömt in die Läden …', icon: '🛒' },
  { text: 'Die Bänder laufen, Räder werden montiert …', icon: '⚙️' },
  { text: 'Die Konkurrenz zieht ihre Pläne durch …', icon: '🚴' },
  { text: 'Die Buchhaltung bucht und bilanziert …', icon: '📒' },
  { text: 'Der Kettenblatt-Kurier geht in Druck …', icon: '📰' },
];

/** Kurze Rechen-Animation, bevor die Auswertung erscheint */
export function RechenAnimation({ dauer, fertig }: { dauer: number; fertig: () => void }) {
  const [schritt, setSchritt] = useState(0);
  useEffect(() => {
    const takt = dauer / SCHRITTE.length;
    const t = setInterval(() => setSchritt((s) => Math.min(SCHRITTE.length - 1, s + 1)), takt);
    const ende = setTimeout(fertig, dauer);
    return () => {
      clearInterval(t);
      clearTimeout(ende);
    };
  }, [dauer, fertig]);
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      <motion.svg viewBox="-50 -50 100 100" className="h-32 w-32" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
        <circle r="44" fill="none" stroke="#1f2937" strokeWidth="6" />
        <circle r="38" fill="none" stroke="#94a3b8" strokeWidth="2" />
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1="0" y1="0" x2="0" y2="-38" stroke="#64748b" strokeWidth="1.2" transform={`rotate(${i * 22.5})`} />
        ))}
        <circle r="6" fill="#0d9488" />
      </motion.svg>
      <div className="h-8 text-lg font-semibold">
        <AnimatePresence mode="wait">
          <motion.div key={schritt} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <span className="mr-2">{SCHRITTE[schritt].icon}</span>
            {SCHRITTE[schritt].text}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="h-2 w-72 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <motion.div className="h-full bg-brand-500" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: dauer / 1000, ease: 'easeInOut' }} />
      </div>
    </div>
  );
}
