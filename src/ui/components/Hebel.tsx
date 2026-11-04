import { motion } from 'framer-motion';
import type { HebelWirkung } from '../hebel';
import { eurKompakt, fmt0 } from '../format';
import { Info } from './ui';

const vz = (x: number, f: (x: number) => string) => (x > 0 ? '+' : x < 0 ? '−' : '±') + f(Math.abs(x));

function Balken({ wert, max, hell }: { wert: number; max: number; hell?: boolean }) {
  const breite = max > 0 ? Math.min(50, (Math.abs(wert) / max) * 50) : 0;
  const farbe = wert >= 0 ? (hell ? 'bg-emerald-300' : 'bg-emerald-500') : hell ? 'bg-rose-300' : 'bg-rose-500';
  return (
    <div className="relative h-2.5 w-full rounded bg-black/5 dark:bg-white/10">
      <div className="absolute inset-y-[-2px] left-1/2 w-px bg-[var(--muted)]" />
      <motion.div
        className={`absolute inset-y-0 rounded ${farbe}`}
        initial={false}
        animate={{ left: wert >= 0 ? '50%' : `${50 - breite}%`, width: `${breite}%` }}
        transition={{ duration: 0.35 }}
      />
    </div>
  );
}

/** Übersicht: Welcher Hebel bringt wie viel EBIT – jetzt und im nächsten Quartal */
export function HebelPanel({ hebel }: { hebel: HebelWirkung[] | null }) {
  if (!hebel) return <p className="muted text-sm">Berechne Hebelwirkungen …</p>;
  const max = Math.max(1, ...hebel.flatMap((h) => [Math.abs(h.ebitJetzt), Math.abs(h.ebitNaechstes)]));
  const bester = [...hebel].sort((a, b) => b.ebitJetzt + b.ebitNaechstes - (a.ebitJetzt + a.ebitNaechstes))[0];
  return (
    <div>
      <div className="muted mb-2 flex items-center gap-1 text-xs">
        EBIT-Wirkung je Hebel: jetzt · danach
        <Info titel="Wie lese ich die Hebel?">
          Was passiert, wenn du ausgehend von deinen aktuellen Eingaben <em>einen</em> Hebel ein Stück bewegst? Linker Balken: EBIT-Wirkung in diesem Quartal, heller Balken: Spätwirkung im nächsten Quartal (Marke, Technik, Lager, Personal).
        </Info>
      </div>
      {bester && bester.ebitJetzt + bester.ebitNaechstes > 0 && (
        <div className="mb-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <strong>Tipp:</strong> „{bester.label}“ bringt über zwei Quartale rund {eurKompakt(bester.ebitJetzt + bester.ebitNaechstes)} mehr EBIT.
        </div>
      )}
      <ul className="space-y-2">
        {hebel.map((h) => (
          <li key={h.id} className="text-xs">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{h.label}</span>
              <span className="tnum muted">{h.absatz !== 0 ? `${vz(h.absatz, fmt0)} Räder` : ''}</span>
            </div>
            <div className="mt-0.5 grid grid-cols-2 gap-2">
              <div title={`dieses Quartal: ${vz(h.ebitJetzt, eurKompakt)}`}>
                <Balken wert={h.ebitJetzt} max={max} />
                <div className={`tnum text-[10px] ${h.ebitJetzt >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>jetzt {vz(h.ebitJetzt, eurKompakt)}</div>
              </div>
              <div title={`nächstes Quartal: ${vz(h.ebitNaechstes, eurKompakt)}`}>
                <Balken wert={h.ebitNaechstes} max={max} hell />
                <div className={`tnum text-[10px] ${h.ebitNaechstes >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>danach {vz(h.ebitNaechstes, eurKompakt)}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kurze Wirkungszeile unter einem Regler */
export function HebelZeile({ h }: { h?: HebelWirkung }) {
  if (!h) return null;
  const farbe = (x: number) => (x >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400');
  return (
    <div className="tnum mt-1 rounded-md bg-black/5 px-2 py-1 text-xs dark:bg-white/5">
      <span className="font-semibold">{h.label.split(': ')[1] ?? h.label}:</span>{' '}
      {h.absatz !== 0 && <>{vz(h.absatz, fmt0)} Räder · </>}
      EBIT <span className={farbe(h.ebitJetzt)}>{vz(h.ebitJetzt, eurKompakt)}</span> jetzt,{' '}
      <span className={farbe(h.ebitNaechstes)}>{vz(h.ebitNaechstes, eurKompakt)}</span> im nächsten Quartal
    </div>
  );
}
