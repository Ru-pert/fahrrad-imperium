import { animate, useMotionValue } from 'framer-motion';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { fmt0, parseZahl } from '../format';
import { useGame } from '../../store/gameStore';

// ---------------------------------------------------------------- Icons
const ICONS: Record<string, string> = {
  cockpit: 'M3 13h4v8H3zM10 3h4v18h-4zM17 9h4v12h-4z',
  bericht: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  entscheidungen: 'M4 6h16M4 12h16M4 18h16M9 3v6M15 9v6M8 15v6',
  markt: 'M3 17l6-6 4 4 8-9M15 6h6v6',
  mehr: 'M5 12h.01M12 12h.01M19 12h.01',
  finanzen: 'M12 3v18M16 7.5c0-1.9-1.8-3-4-3s-4 1.1-4 3 1.8 2.6 4 3 4 1.1 4 3-1.8 3-4 3-4-1.1-4-3',
  werke: 'M3 21V10l6 4V10l6 4V6h6v15zM7 21v-3M12 21v-3M17 21v-3',
  einstellungen: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3.9a7 7 0 00-2.2-1.3L14 3h-4l-.4 2.4a7 7 0 00-2.2 1.3l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-.9a7 7 0 002.2 1.3L10 21h4l.4-2.4a7 7 0 002.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z',
  check: 'M5 13l4 4L19 7',
  firmensitz: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6M8 11h2M14 11h2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  warn: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
};

export function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name] ?? ''} />
    </svg>
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
      <polyline points={pts} fill="none" stroke={farbe} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
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
  label: string;
  wert: number;
  format: (x: number) => string;
  vorher?: number;
  verlauf?: number[];
  farbe?: string;
  hinweis?: string;
}) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="muted text-xs font-medium uppercase tracking-wide">{p.label}</div>
        <Trend aktuell={p.wert} vorher={p.vorher} />
      </div>
      <div className="mt-1 text-xl font-bold sm:text-2xl">
        <AnimatedNumber value={p.wert} format={p.format} />
      </div>
      {p.hinweis && <div className="muted text-xs">{p.hinweis}</div>}
      <div className="mt-2">
        <Sparkline werte={p.verlauf ?? []} farbe={p.farbe} />
      </div>
    </div>
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

export function Card({ titel, children, aktion, className = '' }: { titel?: ReactNode; children: ReactNode; aktion?: ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(titel || aktion) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{titel}</h2>
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
  hint?: string;
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
        <label htmlFor={id} className="text-sm font-medium">
          {p.label}
        </label>
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

export function Toasts() {
  const hinweise = useGame((s) => s.hinweise);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {hinweise.map((h) => (
        <div key={h.id} className="pointer-events-auto rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          {h.text}
        </div>
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
