import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { quartalLabel, type GameState, type QuarterReport } from '../../engine';
import { eurKompakt } from '../format';
import { AnimatedNumber, Icon } from './ui';
import { Weltkarte } from './Weltkarte';
import { klang } from '../klang';

const JAHRESZEITEN = [
  { name: 'Winter', icon: 'schnee', farbe: '#93c5fd', himmel: 'from-sky-200 to-slate-100' },
  { name: 'Frühling', icon: 'bluete', farbe: '#f472b6', himmel: 'from-sky-200 to-emerald-100' },
  { name: 'Sommer', icon: 'sun', farbe: '#f59e0b', himmel: 'from-sky-300 to-amber-100' },
  { name: 'Herbst', icon: 'laub', farbe: '#ea580c', himmel: 'from-orange-200 to-amber-50' },
];

const DAUER = [1500, 1500, 1100, 1300];

/** Szene 1: Die Fabrik produziert, Lkw fahren los */
function Fabrik({ farbe, raeder }: { farbe: string; raeder: number }) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-3">
      <svg viewBox="0 0 800 260" className="w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 to-sky-50 shadow-xl ring-1 ring-black/5 dark:from-slate-700 dark:to-slate-800">
        <rect x="0" y="210" width="800" height="50" fill="#57534e" />
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={i * 60} y="232" width="30" height="4" fill="#fafaf9" opacity="0.8" />)}
        <rect x="0" y="200" width="800" height="12" fill="#a3e635" />
        {/* Fabrik */}
        <g>
          <rect x="60" y="90" width="260" height="112" fill={farbe} opacity="0.85" />
          <path d="M60 90 l40 -36 v36 l40 -36 v36 l40 -36 v36 l40 -36 v36 l40 -36 v36 l60 -36 v36z" fill={farbe} />
          <rect x="250" y="20" width="26" height="70" fill="#78716c" />
          {[0, 1, 2].map((i) => (
            <motion.circle key={i} cx="263" cy="14" r="10" fill="#e7e5e4" initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: [0, 0.9, 0], y: -60, scale: 1.8 }} transition={{ duration: 1.6, delay: i * 0.5, repeat: Infinity }} />
          ))}
          {[0, 1, 2, 3].map((i) => <rect key={i} x={80 + i * 58} y="118" width="38" height="26" rx="3" fill="#fef9c3" opacity="0.9" />)}
          <rect x="250" y="150" width="56" height="52" fill="#334155" />
        </g>
        {/* Fließband mit Rädern */}
        <rect x="300" y="186" width="120" height="8" fill="#334155" />
        {[0, 1, 2].map((i) => (
          <motion.g key={i} initial={{ x: 300, opacity: 0 }} animate={{ x: [300, 420], opacity: [0, 1, 1, 0] }} transition={{ duration: 1, delay: i * 0.33, repeat: Infinity }}>
            <circle cx="6" cy="178" r="7" fill="none" stroke="#1f2937" strokeWidth="2" />
            <circle cx="26" cy="178" r="7" fill="none" stroke="#1f2937" strokeWidth="2" />
            <path d="M6 178 l7 -10 h10 l3 10 M13 168 l5 10 5 -10" stroke={farbe} strokeWidth="2.5" fill="none" />
          </motion.g>
        ))}
        {/* Lkw */}
        {[0, 1, 2].map((i) => (
          <motion.g key={i} initial={{ x: 420 }} animate={{ x: 900 }} transition={{ duration: 1.3, delay: 0.15 + i * 0.35, ease: 'easeIn' }}>
            <rect x="0" y="176" width="70" height="40" rx="3" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
            <rect x="70" y="190" width="26" height="26" rx="3" fill={farbe} />
            <rect x="78" y="194" width="12" height="9" fill="#bae6fd" />
            <circle cx="18" cy="218" r="7" fill="#1f2937" />
            <circle cx="80" cy="218" r="7" fill="#1f2937" />
            <path d="M12 190 h44" stroke={farbe} strokeWidth="4" />
          </motion.g>
        ))}
      </svg>
      <div className="text-center">
        <div className="muted text-sm uppercase tracking-widest">Die Bänder laufen</div>
        <div className="font-display text-4xl font-extrabold"><AnimatedNumber value={raeder} /> Räder</div>
      </div>
    </div>
  );
}

/** Szene 2: Räder unterwegs zu den Märkten */
function Lieferung({ state, umsatz, maerkte }: { state: GameState; umsatz: number; maerkte: number }) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-3">
      <div className="w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
        <Weltkarte state={state} routen kompakt hoehe={400} />
      </div>
      <div className="text-center">
        <div className="muted text-sm uppercase tracking-widest">Ausgeliefert in {maerkte} {maerkte === 1 ? 'Markt' : 'Märkte'}</div>
        <div className="font-display text-4xl font-extrabold"><AnimatedNumber value={umsatz} format={eurKompakt} /> Umsatz</div>
      </div>
    </div>
  );
}

/** Szene 3: Die Jahreszeit wechselt */
function Jahreszeit({ von, nach }: { von: number; nach: number }) {
  const a = JAHRESZEITEN[von % 4];
  const b = JAHRESZEITEN[nach % 4];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-48 w-48">
        <motion.div className={`absolute inset-0 grid place-items-center rounded-full bg-gradient-to-b ${a.himmel} shadow-xl`} initial={{ opacity: 1, rotate: 0 }} animate={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.7, delay: 0.2 }}>
          <span style={{ color: a.farbe }}><Icon name={a.icon} className="h-20 w-20" /></span>
        </motion.div>
        <motion.div className={`absolute inset-0 grid place-items-center rounded-full bg-gradient-to-b ${b.himmel} shadow-xl`} initial={{ opacity: 0, rotate: 90, scale: 0.8 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.25, type: 'spring' }}>
          <span style={{ color: b.farbe }}><Icon name={b.icon} className="h-20 w-20" /></span>
        </motion.div>
      </div>
      <div className="text-center">
        <div className="muted text-sm uppercase tracking-widest">{a.name} → {b.name}</div>
        <div className="font-display text-4xl font-extrabold">{quartalLabel(von)} → {quartalLabel(nach)}</div>
      </div>
    </div>
  );
}

/** Szene 4: Die Zeitung fliegt herein */
function ZeitungFlug({ bericht }: { bericht: QuarterReport }) {
  return (
    <motion.div
      initial={{ scale: 0.2, rotate: -540, opacity: 0 }}
      animate={{ scale: 1, rotate: -3, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="w-full max-w-xl rounded-sm bg-[#fbf7ee] p-6 text-[#1c1917] shadow-2xl"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <div className="flex justify-between text-[10px] uppercase tracking-widest"><span>Ausgabe {quartalLabel(bericht.quartal)}</span><span>Preis: 1 Speiche</span></div>
      <div className="my-2 border-y-2 border-[#1c1917] py-1 text-center text-3xl font-black">Der Kettenblatt-Kurier</div>
      <div className="text-center text-2xl font-bold leading-tight">{bericht.zeitung?.schlagzeile ?? 'Ein neues Quartal beginnt'}</div>
      {bericht.zeitung?.unterzeile && <div className="mt-1 text-center text-sm italic">{bericht.zeitung.unterzeile}</div>}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <div key={i} className="space-y-1">{[0, 1, 2, 3].map((j) => <div key={j} className="h-1.5 rounded bg-[#1c1917]/20" style={{ width: `${70 + ((i + j) % 3) * 12}%` }} />)}</div>)}
      </div>
    </motion.div>
  );
}

/**
 * Überspringbare Szene beim Quartalsabschluss: Produktion → Auslieferung → Jahreszeit → Zeitung.
 */
export function Quartalswechsel({ state, bericht, fertig: fertigRoh }: { state: GameState; bericht: QuarterReport; fertig: () => void }) {
  const [szene, setSzene] = useState(0);
  const beendet = useRef(false);
  const fertig = useCallback(() => {
    if (beendet.current) return;
    beendet.current = true;
    fertigRoh();
  }, [fertigRoh]);
  useEffect(() => {
    if (szene >= DAUER.length) {
      fertig();
      return;
    }
    if (szene === 3) klang.wusch();
    const t = setTimeout(() => setSzene((s) => s + 1), DAUER[szene]);
    return () => clearTimeout(t);
  }, [szene, fertig]);
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') fertig();
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [fertig]);
  const maerkte = new Set(bericht.angebote.filter((a) => a.absatz > 0).map((a) => a.region)).size;
  const raeder = bericht.produkte.reduce((s, p) => s + (p.produziert ?? p.absatz), 0);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-b from-sky-50 to-[var(--bg)] px-6 dark:from-slate-900" onClick={fertig} role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div key={szene} className="flex w-full justify-center" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.25 }}>
          {szene === 0 && <Fabrik farbe={state.unternehmen.farbe} raeder={raeder} />}
          {szene === 1 && <Lieferung state={state} umsatz={bericht.guv.umsatz} maerkte={Math.max(1, maerkte)} />}
          {szene === 2 && <Jahreszeit von={bericht.quartal} nach={state.quartal} />}
          {szene >= 3 && <ZeitungFlug bericht={bericht} />}
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center gap-2">
        {DAUER.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === szene ? 'w-8 bg-brand-600' : i < szene ? 'w-2 bg-brand-600/60' : 'w-2 bg-black/15 dark:bg-white/20'}`} />)}
      </div>
      <button className="btn-ghost absolute bottom-8 right-8" onClick={(e) => { e.stopPropagation(); fertig(); }}>
        Überspringen <Icon name="chevron" className="h-4 w-4" />
      </button>
    </div>
  );
}
