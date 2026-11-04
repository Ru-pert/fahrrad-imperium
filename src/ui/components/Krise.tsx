import { motion } from 'framer-motion';
import { krisenAnsicht, type Decisions, type GameState, type QuarterReport } from '../../engine';
import { eurKompakt } from '../format';
import { Icon, IconBadge } from './ui';

type Aendere = (fn: (d: Decisions) => void) => void;

/** Offene Krise mit Antwortmöglichkeiten (wirkt im laufenden Quartal) */
export function KrisenKarte({ state, d, aendere, kompakt, onOeffnen }: { state: GameState; d: Decisions; aendere: Aendere; kompakt?: boolean; onOeffnen?: () => void }) {
  const k = krisenAnsicht(state);
  if (!k) return null;
  const gewaehlt = d.krise && k.optionen.some((o) => o.id === d.krise) ? d.krise : k.optionen.find((o) => o.standard)!.id;
  const bewusst = !!d.krise;
  return (
    <motion.section
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative overflow-hidden rounded-2xl border-2 border-rose-400 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-4 shadow-lg dark:border-rose-700 dark:from-rose-950/50 dark:via-orange-950/30 dark:to-slate-900"
      aria-label={`Krise: ${k.titel}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-rose-400/20 blur-xl" />
      <div className="flex items-start gap-3">
        <motion.div animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3 }}>
          <IconBadge name={k.icon} farbe="#e11d48" groesse="lg" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"><Icon name="krise" className="h-3 w-3" /> Krise</span>
            {bewusst ? <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Entschieden</span> : <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Bitte entscheiden</span>}
          </div>
          <h2 className="font-display mt-1 text-lg font-bold leading-tight">{k.titel}</h2>
          <p className="mt-1 text-sm">{k.text}</p>
        </div>
      </div>
      {kompakt ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="muted text-sm">Gewählt: <strong className="text-[var(--ink)]">{k.optionen.find((o) => o.id === gewaehlt)?.label}</strong>{bewusst ? '' : ' (wenn du nichts wählst)'}</span>
          {onOeffnen && <button className="btn-primary ml-auto min-h-[36px] px-3 text-sm" onClick={onOeffnen}>Jetzt entscheiden <Icon name="chevron" className="h-4 w-4" /></button>}
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Antwort auf die Krise">
          {k.optionen.map((o) => {
            const aktiv = o.id === gewaehlt;
            return (
              <button
                key={o.id}
                role="radio"
                aria-checked={aktiv}
                onClick={() => aendere((x) => { x.krise = o.id; })}
                className={`flex flex-col rounded-xl border-2 p-3 text-left transition ${aktiv ? 'border-rose-500 bg-white shadow-md dark:bg-slate-900' : 'border-transparent bg-white/60 hover:border-rose-300 dark:bg-slate-900/40'}`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${aktiv ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300'}`}>{aktiv && <Icon name="check" className="h-3 w-3" />}</span>
                  {o.label}
                </span>
                <span className="muted mt-1 text-xs leading-snug">{o.hinweis}</span>
                <span className="mt-2 flex flex-wrap gap-1 text-[11px] font-semibold">
                  {o.kosten > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">−{eurKompakt(o.kosten)}</span>}
                  {o.ertrag > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">+{eurKompakt(o.ertrag)}</span>}
                  {o.risiko > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Risiko {o.risiko} %</span>}
                  {o.standard && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">gilt ohne Wahl</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

/** Ausgang der Krise im Quartalsbericht */
export function KrisenAusgang({ krise }: { krise: NonNullable<QuarterReport['krise']> }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${krise.pech ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40' : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'}`}>
      <IconBadge name={krise.pech ? 'krise' : 'check'} farbe={krise.pech ? '#e11d48' : '#059669'} />
      <div>
        <div className="font-semibold">{krise.titel} – {krise.label}</div>
        <div>{krise.text}</div>
        {(krise.kosten > 0 || krise.ertrag > 0) && (
          <div className="muted mt-1 text-xs">
            {krise.kosten > 0 && <>Kosten {eurKompakt(krise.kosten)} </>}
            {krise.ertrag > 0 && <>· Ertrag {eurKompakt(krise.ertrag)}</>}
          </div>
        )}
      </div>
    </div>
  );
}
