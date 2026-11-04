import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Illu, hatIllu } from './Illus';
import * as L from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { fmt0, parseZahl, REGION_FARBE } from '../format';
import { useGame } from '../../store/gameStore';

// ---------------------------------------------------------------- Icons
const ICONS: Record<string, LucideIcon> = {
  cockpit: L.LayoutDashboard, zeitung: L.Newspaper, bericht: L.FileBarChart2, entscheidungen: L.SlidersHorizontal,
  markt: L.TrendingUp, mehr: L.MoreHorizontal, finanzen: L.Landmark, werke: L.Factory, firmensitz: L.Building2,
  einstellungen: L.Settings, erfolge: L.Trophy, check: L.Check, plus: L.Plus, minus: L.Minus, chevron: L.ChevronRight,
  chevronLeft: L.ChevronLeft, up: L.ArrowUpRight, down: L.ArrowDownRight, warn: L.AlertTriangle, sun: L.Sun, moon: L.Moon,
  umsatz: L.Coins, ebit: L.BadgeEuro, kasse: L.Wallet, marktanteil: L.PieChart, wert: L.Gem, image: L.Sparkles,
  rad: L.Bike, personal: L.Users, fe: L.FlaskConical, marketing: L.Megaphone, preis: L.Tag, produktion: L.Cog,
  lieferkette: L.Truck, geld: L.Banknote, werk: L.Hammer, regen: L.CloudRain, hitze: L.ThermometerSun, akku: L.BatteryLow,
  energie: L.Zap, zins: L.Percent, streik: L.Megaphone, stahl: L.Anvil, boom: L.Rocket, gesetz: L.Scale, praemie: L.HandCoins,
  sport: L.Medal, lasten: L.Package, fachkraft: L.UserX, schnee: L.Snowflake, bluete: L.Flower2, laub: L.Leaf,
  ereignis: L.Zap, info: L.Info, lager: L.Boxes, testsieg: L.Award, rueckruf: L.Wrench, viral: L.Smartphone, qualitaet: L.ShieldCheck,
  rakete: L.Rocket, stern: L.Star, schloss: L.Lock, austausch: L.MessagesSquare, expansion: L.Globe2, ziel: L.Target, kopieren: L.Copy, vorlesen: L.Volume2, kalender: L.CalendarDays,
};

export function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  if (hatIllu(name)) return <Illu name={name} className={className} />;
  const C = ICONS[name] ?? L.Circle;
  return <C className={className} strokeWidth={1.8} aria-hidden="true" />;
}

/** Runder, farbiger Icon-Hintergrund */
export function IconBadge({ name, farbe = '#0d9488', groesse = 'md' }: { name: string; farbe?: string; groesse?: 'sm' | 'md' | 'lg' }) {
  const g = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-12 w-12' }[groesse];
  const i = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }[groesse];
  return (
    <span className={`inline-grid ${g} shrink-0 place-items-center rounded-xl`} style={{ background: `linear-gradient(140deg, ${farbe}2e, ${farbe}12)`, color: farbe, boxShadow: `inset 0 0 0 1px ${farbe}26` }}>
      <Icon name={name} className={i} />
    </span>
  );
}

/** Kleines Regionskürzel als farbige Marke (statt Flaggen-Emojis, die nicht überall dargestellt werden) */
export function RegionMarke({ r }: { r: string }) {
  const farbe = REGION_FARBE[r] ?? '#64748b';
  return (
    <span className="mr-1.5 inline-grid h-[18px] min-w-[26px] place-items-center rounded-md px-1 align-middle text-[10px] font-extrabold tracking-wide text-white" style={{ background: farbe }}>
      {r}
    </span>
  );
}

// ---------------------------------------------------------------- Zahlen
export function AnimatedNumber({ value, format = fmt0 }: { value: number; format?: (x: number) => string }) {
  const reduziert = useGame((s) => s.reduziert);
  const mv = useMotionValue(value);
  const [txt, setTxt] = useState(format(value));
  useEffect(() => {
    if (reduziert) {
      setTxt(format(value));
      return;
    }
    const c = animate(mv, value, { duration: 0.9, ease: 'easeOut' });
    const un = mv.on('change', (v) => setTxt(format(v)));
    return () => {
      c.stop();
      un();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduziert]);
  return <span className="tnum">{txt}</span>;
}

export function Sparkline({ werte, farbe = '#0d9488', hoehe = 28 }: { werte: number[]; farbe?: string; hoehe?: number }) {
  if (werte.length < 2) return <div style={{ height: hoehe }} />;
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const span = max - min || 1;
  const pts = werte.map((v, i) => `${(i / (werte.length - 1)) * 100},${hoehe - 3 - ((v - min) / span) * (hoehe - 6)}`).join(' ');
  return (
    <svg viewBox={`0 0 100 ${hoehe}`} preserveAspectRatio="none" className="w-full" style={{ height: hoehe }} aria-hidden="true">
      <motion.polyline points={pts} fill="none" stroke={farbe} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
    </svg>
  );
}

export function Trend({ aktuell, vorher, invert = false }: { aktuell: number; vorher?: number; invert?: boolean }) {
  if (vorher === undefined || vorher === aktuell) return <span className="muted text-xs">–</span>;
  const hoch = aktuell > vorher;
  const gut = invert ? !hoch : hoch;
  return (
    <span className={`inline-flex items-center text-xs font-semibold ${gut ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      <Icon name={hoch ? 'up' : 'down'} className="h-3.5 w-3.5" />
    </span>
  );
}

export function KpiTile(p: {
  icon?: string;
  label: string;
  wert: number;
  format: (x: number) => string;
  vorher?: number;
  verlauf?: number[];
  farbe?: string;
  hinweis?: string;
}) {
  return (
    <motion.div className="card p-3 sm:p-4" whileHover={{ y: -3, boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {p.icon && <IconBadge name={p.icon} farbe={p.farbe} groesse="sm" />}
          <div className="muted text-xs font-medium uppercase tracking-wide">{p.label}</div>
        </div>
        <Trend aktuell={p.wert} vorher={p.vorher} />
      </div>
      <div className="mt-1 text-xl font-bold sm:text-2xl">
        <AnimatedNumber value={p.wert} format={p.format} />
      </div>
      {p.hinweis && <div className="muted text-xs">{p.hinweis}</div>}
      <div className="mt-2">
        <Sparkline werte={p.verlauf ?? []} farbe={p.farbe} />
      </div>
    </motion.div>
  );
}

export function Fortschritt({ label, wert, ziel, format }: { label: string; wert: number; ziel: number; format: (x: number) => string }) {
  const anteil = Math.max(0, Math.min(1, wert / ziel));
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tnum muted">
          {format(wert)} / {format(ziel)}
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(anteil * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${anteil * 100}%` }} />
      </div>
    </div>
  );
}

export function Card({ titel, children, aktion, className = '', icon, farbe, tour }: { titel?: ReactNode; children: ReactNode; aktion?: ReactNode; className?: string; icon?: string; farbe?: string; tour?: string }) {
  return (
    <section data-tour={tour} className={`card p-4 transition-shadow hover:shadow-md ${className}`}>
      {(titel || aktion) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">{icon && <IconBadge name={icon} farbe={farbe} groesse="sm" />}{titel}</h2>
          {aktion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tabs<T extends string>({ wert, optionen, onChange }: { wert: T; optionen: { id: T; label: string }[]; onChange: (t: T) => void }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
      {optionen.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={wert === o.id}
          onClick={() => onChange(o.id)}
          className={`btn whitespace-nowrap ${wert === o.id ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, farbe = 'slate' }: { children: ReactNode; farbe?: 'slate' | 'green' | 'red' | 'amber' }) {
  const m = {
    slate: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    red: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
  }[farbe];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${m}`}>{children}</span>;
}

export function Warnung({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
      <Icon name="warn" className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- Erklärungen: Pop-up und Aufklapper

/**
 * Kleines ⓘ-Symbol: Beim Überfahren erscheint die Erklärung, ein Klick heftet sie an.
 * Das Pop-up liegt in einem Portal, damit es nicht von Rahmen mit overflow abgeschnitten wird.
 */
export function Info({ children, titel, className = '' }: { children: ReactNode; titel?: string; className?: string }) {
  const knopf = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [offen, setOffen] = useState<'hover' | 'fix' | null>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; oben: boolean }>({ top: 0, left: 0, oben: false });
  const id = useId();
  const platziere = () => {
    const r = knopf.current?.getBoundingClientRect();
    if (!r) return;
    const breite = 300;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - breite / 2), window.innerWidth - breite - 8);
    const oben = r.bottom > window.innerHeight - 220;
    setPos(oben ? { bottom: window.innerHeight - r.top + 8, left, oben } : { top: r.bottom + 8, left, oben });
  };
  useEffect(() => {
    if (!offen) return;
    const zu = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setOffen(null);
        return;
      }
      if (e.type === 'scroll') {
        if (offen === 'hover') setOffen(null);
        else platziere();
        return;
      }
      const t = e.target as Node;
      if (!knopf.current?.contains(t) && !panel.current?.contains(t)) setOffen(null);
    };
    document.addEventListener('mousedown', zu);
    document.addEventListener('keydown', zu);
    window.addEventListener('scroll', zu, true);
    window.addEventListener('resize', platziere);
    return () => {
      document.removeEventListener('mousedown', zu);
      document.removeEventListener('keydown', zu);
      window.removeEventListener('scroll', zu, true);
      window.removeEventListener('resize', platziere);
    };
  }, [offen]);
  return (
    <>
      <button
        ref={knopf}
        type="button"
        aria-label={titel ? `Erklärung: ${titel}` : 'Erklärung anzeigen'}
        aria-expanded={!!offen}
        aria-describedby={offen ? id : undefined}
        className={`inline-grid h-5 w-5 shrink-0 place-items-center rounded-full align-middle text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700 ${offen ? 'bg-brand-50 text-brand-600 dark:bg-slate-700' : ''} ${className}`}
        onMouseEnter={() => { if (!offen) { platziere(); setOffen('hover'); } }}
        onMouseLeave={() => { if (offen === 'hover') setOffen(null); }}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); platziere(); setOffen(offen === 'fix' ? null : 'fix'); }}
      >
        <L.Info className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {offen && (
              <motion.div
                ref={panel}
                id={id}
                role="tooltip"
                initial={{ opacity: 0, y: pos.oben ? 6 : -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="card fixed z-[100] w-[300px] p-3 text-xs leading-relaxed shadow-xl"
                style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
              >
                {titel && <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><Icon name="info" className="h-4 w-4 text-brand-600" />{titel}</div>}
                <div className="text-slate-700 dark:text-slate-200">{children}</div>
                {offen === 'fix' && <div className="muted mt-1.5 text-[10px]">Klick daneben oder Esc schließt.</div>}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

const ladeOffen = (schluessel?: string): boolean | null => {
  if (!schluessel) return null;
  try {
    const v = localStorage.getItem(`aufklapper:${schluessel}`);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
};

/**
 * Aufklappbarer Bereich: Kopfzeile mit Titel und kurzer Zusammenfassung, Details erst auf Klick.
 * Mit `merken` bleibt der Zustand im Browser gespeichert.
 */
export function Aufklapper({
  titel, zusammenfassung, children, merken, standardOffen = false, icon, className = '',
}: { titel: ReactNode; zusammenfassung?: ReactNode; children: ReactNode; merken?: string; standardOffen?: boolean; icon?: ReactNode; className?: string }) {
  const [offen, setOffen] = useState<boolean>(() => ladeOffen(merken) ?? standardOffen);
  const reduziert = useGame((s) => s.reduziert);
  const umschalten = () => {
    setOffen(!offen);
    if (merken) {
      try { localStorage.setItem(`aufklapper:${merken}`, offen ? '0' : '1'); } catch { /* egal */ }
    }
  };
  return (
    <div className={`rounded-xl border border-[var(--line)] ${offen ? 'bg-transparent' : 'bg-black/[0.02] dark:bg-white/[0.03]'} ${className}`}>
      <button type="button" onClick={umschalten} aria-expanded={offen} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-black/[0.03] dark:hover:bg-white/5">
        <motion.span animate={{ rotate: offen ? 90 : 0 }} transition={{ duration: reduziert ? 0 : 0.2 }} className="text-slate-400">
          <L.ChevronRight className="h-4 w-4" aria-hidden="true" />
        </motion.span>
        {icon}
        <span className="font-semibold">{titel}</span>
        {zusammenfassung && <span className="muted tnum ml-auto truncate text-right">{zusammenfassung}</span>}
      </button>
      <AnimatePresence initial={false}>
        {offen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduziert ? 0 : 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- Eingabe
export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Maximum nur für den Schieberegler (Eingabe darf darüber liegen) */
  sliderMax?: number;
  step?: number;
  unit?: string;
  hint?: ReactNode;
  /** Erklärung als ⓘ-Pop-up neben der Beschriftung */
  info?: ReactNode;
  farbe?: string;
  /** Schrittweite der +/−-Tasten */
  tastenSchritt?: number;
}

export function NumberField(p: NumberFieldProps) {
  const id = useId();
  const min = p.min ?? 0;
  const step = p.step ?? 1;
  const tasten = p.tastenSchritt ?? step;
  const sliderMax = p.sliderMax ?? p.max ?? Math.max(p.value * 2, 100);
  const [text, setText] = useState<string | null>(null);
  const clampWert = (v: number) => Math.min(p.max ?? Infinity, Math.max(min, v));
  const setze = (v: number) => p.onChange(clampWert(Math.round(v / step) * step));
  return (
    <div className="py-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {p.label}
          </label>
          {p.info && <Info titel={p.label}>{p.info}</Info>}
        </div>
        <div className="flex items-center gap-1">
          <input
            id={id}
            inputMode="decimal"
            className="tnum h-11 w-28 rounded-xl border border-[var(--line)] bg-transparent px-3 text-right font-semibold"
            value={text ?? fmt0(p.value)}
            onFocus={(e) => {
              setText(String(p.value));
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setText(e.target.value);
              const n = parseZahl(e.target.value);
              if (n !== null) p.onChange(clampWert(n));
            }}
            onBlur={() => setText(null)}
          />
          {p.unit && <span className="muted w-9 text-xs">{p.unit}</span>}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" className="btn-ghost shrink-0" aria-label={`${p.label} verringern`} onClick={() => setze(p.value - tasten)}>
          <Icon name="minus" />
        </button>
        <input
          type="range"
          min={min}
          max={sliderMax}
          step={step}
          value={Math.min(sliderMax, Math.max(min, p.value))}
          onChange={(e) => setze(Number(e.target.value))}
          aria-label={p.label}
          style={p.farbe ? { accentColor: p.farbe } : undefined}
        />
        <button type="button" className="btn-ghost shrink-0" aria-label={`${p.label} erhöhen`} onClick={() => setze(p.value + tasten)}>
          <Icon name="plus" />
        </button>
      </div>
      {p.hint && <div className="muted mt-0.5 text-xs">{p.hint}</div>}
    </div>
  );
}

/** Kompaktes Zahlenfeld für Tabellen: Eingabe mit −/+ und dünnem Regler */
export function KompaktFeld(p: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; sliderMax?: number; step?: number; tastenSchritt?: number; farbe?: string; unit?: string }) {
  const min = p.min ?? 0;
  const step = p.step ?? 1;
  const tasten = p.tastenSchritt ?? step;
  const sliderMax = p.sliderMax ?? p.max ?? Math.max(p.value * 2, 100);
  const [text, setText] = useState<string | null>(null);
  const clampWert = (v: number) => Math.min(p.max ?? Infinity, Math.max(min, v));
  const setze = (v: number) => p.onChange(clampWert(Math.round(v / step) * step));
  return (
    <div className="min-w-[150px]">
      <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--card)] focus-within:ring-2 focus-within:ring-brand-500/40">
        <button type="button" className="grid h-8 w-7 place-items-center text-slate-500 hover:text-[var(--ink)]" aria-label={`${p.label} verringern`} onClick={() => setze(p.value - tasten)}>
          <L.Minus className="h-3.5 w-3.5" />
        </button>
        <input
          inputMode="decimal"
          aria-label={p.label}
          className="tnum h-8 w-full min-w-0 bg-transparent text-right text-sm font-semibold outline-none"
          value={text ?? fmt0(p.value)}
          onFocus={(e) => { setText(String(p.value)); e.currentTarget.select(); }}
          onChange={(e) => { setText(e.target.value); const n = parseZahl(e.target.value); if (n !== null) p.onChange(clampWert(n)); }}
          onBlur={() => setText(null)}
        />
        {p.unit && <span className="muted pl-1 text-xs">{p.unit}</span>}
        <button type="button" className="grid h-8 w-7 place-items-center text-slate-500 hover:text-[var(--ink)]" aria-label={`${p.label} erhöhen`} onClick={() => setze(p.value + tasten)}>
          <L.Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        type="range"
        className="kompakt-regler mt-1 w-full"
        min={min}
        max={sliderMax}
        step={step}
        value={Math.min(sliderMax, Math.max(min, p.value))}
        onChange={(e) => setze(Number(e.target.value))}
        aria-label={p.label}
        style={p.farbe ? { accentColor: p.farbe } : undefined}
      />
    </div>
  );
}

export function Toasts() {
  const hinweise = useGame((s) => s.hinweise);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {hinweise.map((h) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          <Icon name="info" className="h-4 w-4" />
          {h.text}
        </motion.div>
      ))}
    </div>
  );
}

/** Horizontal scrollbare Tabelle mit fixierter erster Spalte (Handy-Ansicht) */
export function Tabelle({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="sticky-col tnum w-full min-w-[420px] border-collapse text-sm">{children}</table>
    </div>
  );
}
