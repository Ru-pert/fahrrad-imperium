import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { quartalLabel, type GameState } from '../../engine';
import { SPIELZIEL } from '../../engine/config/spielziel';
import { restQuartaleBisZiel, wertung, type Wertung } from '../../engine/spielziel';
import { szenarioVon } from '../../engine/szenarien';
import { ladeBestenliste } from '../../store/bestenliste';
import { useGame } from '../../store/gameStore';
import { eurKompakt, fmt0 } from '../format';
import { klang } from '../klang';
import { Konfetti } from './Effekte';
import { AnimatedNumber, Icon, Info } from './ui';

const STUFEN_FARBE = ['#a8a29e', '#b45309', '#0d9488', '#2563eb', '#7c3aed', '#ca8a04'];
export const stufenIndex = (punkte: number) => SPIELZIEL.stufen.reduce((best, x, i) => (punkte >= x.ab ? i : best), 0);

/** Medaille je Rangstufe (6 Stufen, ab Stufe 6 mit Krone) */
export function Rangmedaille({ index, pleite = false, className = 'h-28 w-28' }: { index: number; pleite?: boolean; className?: string }) {
  const farbe = pleite ? '#64748b' : STUFEN_FARBE[index];
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      <path d="M30 2h14l8 30H38zM56 2h14l-8 30H48z" fill={pleite ? '#94a3b8' : '#dc2626'} opacity="0.85" />
      <circle cx="50" cy="66" r="38" fill={farbe} />
      <circle cx="50" cy="66" r="30" fill="#fff" opacity="0.25" />
      <circle cx="50" cy="66" r="30" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
      {pleite ? (
        <path d="M36 66h28" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      ) : index >= 5 ? (
        <path d="M30 76l4-22 10 10 6-14 6 14 10-10 4 22z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="38" cy="72" r="8" />
          <circle cx="62" cy="72" r="8" />
          <path d="M38 72l7-12h12l5 12M45 60l5 12 7-12" />
        </g>
      )}
      <g fill="#fff">
        {Array.from({ length: Math.min(index, 4) }, (_, i) => <circle key={i} cx={50 - (Math.min(index, 4) - 1) * 6 + i * 12} cy="100" r="3.5" />)}
      </g>
    </svg>
  );
}

/** Leiter der Rangstufen mit Markierung */
export function StufenLeiter({ punkte, kompakt = false }: { punkte: number; kompakt?: boolean }) {
  const max = 1000;
  return (
    <div>
      <div className="relative h-3 rounded-full bg-black/5 dark:bg-white/10">
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-stone-400 via-teal-500 to-amber-400" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (punkte / max) * 100)}%` }} transition={{ duration: 1 }} />
        {SPIELZIEL.stufen.slice(1).map((s) => <div key={s.ab} className="absolute inset-y-[-3px] w-0.5 bg-[var(--ink)] opacity-30" style={{ left: `${(s.ab / max) * 100}%` }} />)}
      </div>
      {!kompakt && (
        <div className="relative mt-1 h-8 text-[10px]">
          {SPIELZIEL.stufen.map((s, i) => (
            <span key={s.ab} className={`absolute -translate-x-1/2 whitespace-nowrap ${punkte >= s.ab ? 'font-semibold' : 'muted'}`} style={{ left: `${Math.max(4, (s.ab / max) * 100)}%`, top: i % 2 ? 14 : 0, color: punkte >= s.ab ? STUFEN_FARBE[i] : undefined }}>
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Feierliche Endabrechnung nach 15 Jahren (oder bei Insolvenz) */
export function Endabrechnung() {
  const w = useGame((s) => s.endabrechnung);
  const offenBericht = useGame((s) => s.frischerBericht);
  const state = useGame((s) => s.state);
  const reduziert = useGame((s) => s.reduziert);
  const schliessen = useGame((s) => s.zeigeEndabrechnung);
  const weiterspielen = useGame((s) => s.weiterspielen);
  const gehe = useGame((s) => s.gehe);
  const sichtbar = !!w && !offenBericht && !!state;
  const liste = useMemo(() => (sichtbar ? ladeBestenliste() : []), [sichtbar]);
  useEffect(() => {
    if (sichtbar && w && !w.pleite) setTimeout(() => klang.erfolg(), 400);
  }, [sichtbar, w]);
  if (!sichtbar || !w || !state) return null;
  const idx = stufenIndex(w.punkte);
  const farbe = w.pleite ? '#64748b' : STUFEN_FARBE[idx];
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[80] overflow-y-auto bg-[var(--bg)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-label="Endabrechnung">
        {!w.pleite && idx >= 3 && !reduziert && <Konfetti />}
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)]">{w.pleite ? 'Das Spiel ist vorbei' : `Endabrechnung nach ${SPIELZIEL.quartale / 4} Jahren`}</div>
            <h1 className="mt-1 text-3xl font-extrabold">{state.unternehmen.name}</h1>
          </div>
          <motion.div className="flex flex-col items-center" initial={{ scale: 0.5, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}>
            <Rangmedaille index={idx} pleite={w.pleite} className="h-36 w-36 drop-shadow-xl" />
            <div className="font-display mt-2 text-4xl font-extrabold" style={{ color: farbe }}>{w.stufe}</div>
            <div className="muted mt-1 max-w-md text-center">{w.stufenText}</div>
            <div className="font-display mt-3 text-5xl font-black tabular-nums"><AnimatedNumber value={w.punkte} /> <span className="text-2xl font-bold text-[var(--muted)]">Punkte</span></div>
          </motion.div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold">Wie sich deine Punkte zusammensetzen <Info titel="Wertung">Unternehmenswert (dein Anteil, logarithmisch bis 100 Mrd. €), Platz in der Weltrangliste nach Quartalsumsatz, erschlossene Regionen, Erfolge sowie Image und Nachhaltigkeit.{w.pleite ? ' Bei Insolvenz zählen nur 40 % der Punkte.' : ''}</Info></div>
            <div className="space-y-3">
              {w.bausteine.map((b, i) => (
                <div key={b.id} className="grid grid-cols-[120px_1fr_64px] items-center gap-2 text-sm sm:grid-cols-[170px_1fr_70px] sm:gap-3">
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="muted text-xs">{b.text}</div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <motion.div className="h-full rounded-full" style={{ background: farbe }} initial={{ width: 0 }} animate={{ width: `${(b.punkte / b.max) * 100}%` }} transition={{ delay: 0.6 + i * 0.15, duration: 0.7 }} />
                  </div>
                  <div className="tnum text-right font-semibold">{fmt0(b.punkte)} <span className="muted text-xs">/ {b.max}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-4"><StufenLeiter punkte={w.punkte} /></div>
          </div>

          {liste.length > 0 && (
            <div className="card p-5">
              <div className="mb-2 flex items-center gap-2 font-semibold"><Icon name="erfolge" className="h-5 w-5 text-amber-500" /> Deine Bestenliste</div>
              <ol className="space-y-1 text-sm">
                {liste.slice(0, 8).map((e, i) => {
                  const ich = e.firma === state.unternehmen.name && e.punkte === w.punkte && e.seed === state.einstellungen.seed;
                  return (
                    <li key={`${e.datum}-${i}`} className={`grid grid-cols-[28px_1fr_70px] items-center gap-2 rounded-lg px-2 py-1 sm:grid-cols-[28px_1fr_150px_70px] ${ich ? 'bg-amber-100 font-semibold dark:bg-amber-900/30' : ''}`}>
                      <span className="muted tnum">{i + 1}.</span>
                      <span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full" style={{ background: e.farbe }} />{e.firma}</span>
                      <span className="muted hidden text-xs sm:block">{e.stufe} · {e.schwierigkeit}</span>
                      <span className="tnum text-right">{fmt0(e.punkte)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pb-10">
            {!w.pleite && (
              <button className="btn-primary" onClick={weiterspielen}>
                Weiterspielen (ohne Wertung) <Icon name="chevron" className="h-4 w-4" />
              </button>
            )}
            <button className="btn-ghost" onClick={() => { schliessen(null); gehe('einstellungen'); }}>Neues Spiel beginnen</button>
            <button className="btn-ghost" onClick={() => schliessen(null)}>Schließen</button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Zielanzeige im Cockpit: Zeit bis zur Endabrechnung, aktuelle Punkte, Abstand zu Golden Spoke */
export function ZielKarte({ state }: { state: GameState }) {
  const zeige = useGame((s) => s.zeigeEndabrechnung);
  const w: Wertung = useMemo(() => state.endwertung ?? wertung(state), [state]);
  const rest = restQuartaleBisZiel(state);
  const idx = stufenIndex(w.punkte);
  const gs = state.konkurrenten.goldenspoke;
  const eigen = state.kpiHistorie[state.kpiHistorie.length - 1]?.umsatz ?? 0;
  const abstand = gs && gs.letzterUmsatz > 0 ? eigen / gs.letzterUmsatz : 0;
  const fertig = !!state.endwertung;
  return (
    <section data-tour="ziel" className="card grid items-center gap-4 p-4 md:grid-cols-[auto_1fr_220px]">
      <Rangmedaille index={idx} className="h-20 w-20" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-base font-semibold">{fertig ? (state.endlos ? 'Freies Spiel – Endabrechnung erledigt' : 'Endabrechnung') : 'Dein Ziel: in 15 Jahren zum Fahrrad-Kaiser'}</h2>
          <span className="muted text-xs">{fertig ? `gewertet in ${quartalLabel(state.endwertung!.quartal)}` : `noch ${rest} Quartal${rest === 1 ? '' : 'e'} bis zur Endabrechnung`}</span>
        </div>
        <div className="mt-1 text-sm">
          {fertig ? 'Ergebnis' : 'Stand jetzt'}: <strong style={{ color: STUFEN_FARBE[idx] }}>{w.stufe}</strong> mit <strong className="tnum">{fmt0(w.punkte)}</strong> Punkten
          {w.naechsteStufe && !fertig ? <span className="muted"> · noch {fmt0(w.naechsteStufe.ab - w.punkte)} bis „{w.naechsteStufe.name}“</span> : null}
        </div>
        <div className="mt-2"><StufenLeiter punkte={w.punkte} kompakt /></div>
        {(() => {
          const sz = szenarioVon(state);
          if (!sz.ziel) return null;
          const erreicht = state.szenarioErreicht !== undefined;
          const verpasst = !erreicht && state.quartal >= sz.ziel.frist;
          return (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold text-white`} style={{ background: erreicht ? '#16a34a' : verpasst ? '#94a3b8' : sz.farbe }}>{sz.name}</span>
              <span className={erreicht ? 'font-semibold text-emerald-600' : verpasst ? 'muted line-through' : ''}>{sz.ziel.text}</span>
              {!erreicht && !verpasst && <span className="muted tnum">({Math.round(sz.ziel.fortschritt(state) * 100)} %)</span>}
              <span className="muted">· {erreicht ? `+${sz.ziel.bonus} Punkte` : verpasst ? 'verpasst' : `+${sz.ziel.bonus} Punkte möglich`}</span>
            </div>
          );
        })()}
        {!fertig && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10" title="Spielzeit">
            <div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.min(100, (state.quartal / SPIELZIEL.quartale) * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Golden Spoke</div>
        <div className="tnum">{eurKompakt(gs?.letzterUmsatz ?? 0)} Umsatz/Q</div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-900/40"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, abstand * 100)}%` }} /></div>
        <div className="muted mt-0.5 text-[11px]">Du hast {Math.round(abstand * 100)} % seines Umsatzes{abstand >= 1 ? ' – du bist vorbei!' : ''}</div>
        {fertig && <button className="mt-2 text-xs font-semibold text-brand-700 underline" onClick={() => zeige(state.endwertung!)}>Endabrechnung ansehen</button>}
      </div>
    </section>
  );
}
