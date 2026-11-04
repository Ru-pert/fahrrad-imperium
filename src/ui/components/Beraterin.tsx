import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { PRODUKTE, REGIONEN, aktiveProdukte, type GameState, type QuarterReport, type RegionId } from '../../engine';
import { alleProjekte } from '../../engine/forschung';
import { useGame, type Seite } from '../../store/gameStore';
import { eurKompakt, fmt0, gruppiereWarnungen } from '../format';
import { Icon } from './ui';

export interface Tipp {
  text: string;
  stimmung: 'warn' | 'gut' | 'info';
  ziel?: Seite;
  zielText?: string;
}

const SPRUECHE = [
  'Ein Fahrrad fällt nur um, wenn es stehen bleibt. Mit Firmen ist es genauso.',
  'Mein Doktorvater sagte immer: „Erst die Kette ölen, dann die Bilanz.“',
  'Marktanteile sind wie Rückenwind – man merkt sie erst, wenn sie fehlen.',
  'Wer billig kauft, flickt doppelt. Das gilt für Schläuche und Lieferanten.',
  'Forschung ist teuer. Veraltete Räder sind teurer.',
];

/** Tipps der Beraterin – nach Dringlichkeit sortiert */
export function beraterTipps(state: GameState, vorschau: QuarterReport | null, bericht: QuarterReport | null, historie: { report: QuarterReport }[]): Tipp[] {
  const t: Tipp[] = [];
  if (vorschau) {
    if (vorschau.bilanz.kasse < 200_000) t.push({ stimmung: 'warn', text: `Die Kasse wird knapp: Am Quartalsende bleiben nur ${eurKompakt(vorschau.bilanz.kasse)}. Ausgaben senken oder ein Darlehen aufnehmen!`, ziel: 'entscheidungen', zielText: 'Zu den Finanzen' });
    if (vorschau.guv.ebit < 0) t.push({ stimmung: 'warn', text: `Mit deinen Eingaben machst du ${eurKompakt(-vorschau.guv.ebit)} Verlust. Schau dir Preise und Budgets noch einmal an.`, ziel: 'entscheidungen', zielText: 'Entscheidungen prüfen' });
    const { engpaesse, sonstige } = gruppiereWarnungen(vorschau.warnungen);
    if (sonstige.some((w) => w.includes('Kapazität reicht nur'))) t.push({ stimmung: 'warn', text: 'Deine Werke laufen am Limit, die Produktion wird gekürzt. Neue Fertigungslinien würden helfen.', ziel: 'entscheidungen', zielText: 'Linien kaufen' });
    if (engpaesse.length > 0) t.push({ stimmung: 'info', text: `In ${engpaesse.length} ${engpaesse.length === 1 ? 'Markt' : 'Märkten'} wollen mehr Leute deine Räder kaufen, als du liefern kannst. Mehr produzieren – oder die Preise etwas anheben.` });
  }
  if (bericht) {
    for (const p of aktiveProdukte(state)) {
      const lager = state.produkte[p]?.lager.stueck ?? 0;
      const absatz = bericht.produkte.find((x) => x.produkt === p)?.absatz ?? 0;
      if (lager > 500 && lager > absatz * 0.6) {
        t.push({ stimmung: 'warn', text: `Dein Lager läuft voll: ${fmt0(lager)} ${PRODUKTE[p].name}${lager > 1 ? 's' : ''} warten auf Käufer. Produktion drosseln oder den Preis senken.`, ziel: 'entscheidungen', zielText: 'Produktion anpassen' });
        break;
      }
    }
    const veraltet = bericht.produkte.find((x) => x.technikIndex < 103);
    if (veraltet) t.push({ stimmung: 'warn', text: `Das Testmagazin hält dein ${PRODUKTE[veraltet.produkt].name} bald für veraltet (Technikindex ${fmt0(veraltet.technikIndex)}). Etwas mehr F&E-Budget wirkt Wunder.`, ziel: 'entscheidungen', zielText: 'F&E erhöhen' });
    const frueher = historie.slice(0, -1).map((h) => h.report.guv.umsatz);
    if (frueher.length > 0 && bericht.guv.umsatz > Math.max(...frueher)) t.push({ stimmung: 'gut', text: `Rekordumsatz von ${eurKompakt(bericht.guv.umsatz)}! Ich habe zur Feier eine neue Klingel poliert.` });
  }
  const anfragen = (state.angebote?.grossabnehmer.length ?? 0) + (state.angebote?.ausschreibungen.length ?? 0);
  if (anfragen > 0) t.push({ stimmung: 'info', text: `${anfragen} Großaufträge warten auf dich – ${state.angebote?.ausschreibungen.length ? 'darunter eine öffentliche Ausschreibung' : 'Festpreise, sofortige Zahlung, keine Logistikkosten'}.`, ziel: 'entscheidungen', zielText: 'Zu den Aufträgen' });
  const zuf = Object.entries(state.unternehmen.zufriedenheit ?? {}).filter(([k]) => k.includes(':')).sort((a, b) => a[1] - b[1])[0];
  if (zuf && zuf[1] < 40) {
    const [r, p] = zuf[0].split(':') as [RegionId, keyof typeof PRODUKTE];
    t.push({ stimmung: 'warn', text: `Die Kundschaft für dein ${PRODUKTE[p]?.name ?? 'Rad'} in ${REGIONEN[r]?.name ?? r} ist unzufrieden (${fmt0(zuf[1])} von 100). Keine weiteren Preiserhöhungen – besser Qualität und Liefertreue!` });
  }
  if (bericht && (bericht.guv.koordination ?? 0) > 0.08 * bericht.guv.umsatz) t.push({ stimmung: 'info', text: `Dein Imperium wird träge: Koordination kostet schon ${eurKompakt(bericht.guv.koordination ?? 0)} im Quartal. Jedes weitere Werk, jeder Markt und jedes Produkt muss sich lohnen.` });
  const rest = 60 - state.quartal;
  if (!state.endwertung && rest > 0 && rest <= 4) t.unshift({ stimmung: 'info', text: `Endspurt! Noch ${rest} Quartal${rest > 1 ? 'e' : ''} bis zur Endabrechnung. Jetzt zählen Unternehmenswert, Weltrang und Image.` });
  const bereit = (['EU', 'NA', 'AS', 'RW'] as RegionId[]).filter((r) => state.regionen[r]?.freigeschaltet && !state.regionen[r]?.aktiv);
  if (bereit.length) t.push({ stimmung: 'info', text: `${REGIONEN[bereit[0]].name} wartet auf dich! Der Markteintritt kostet ${eurKompakt(REGIONEN[bereit[0]].eintritt)}.`, ziel: 'expansion', zielText: 'Zur Expansion' });
  const forscht = Object.values(state.letzteEntscheidungen?.forschung ?? {}).some((x) => (x ?? 0) > 0);
  const offen = alleProjekte(state).some((p) => p.offen && !p.fertig);
  if (!forscht && offen && state.quartal >= 2) t.push({ stimmung: 'info', text: 'Im Labor ist es still. Ohne Forschung bleibt es bei deinen bisherigen Rädern – das E-Bike wartet!', ziel: 'entscheidungen', zielText: 'Zum Labor' });
  t.push({ stimmung: 'info', text: SPRUECHE[state.quartal % SPRUECHE.length] });
  return t;
}

/** Prof. Ulrike Speiche: graue Hochsteckfrisur, runde Brille, Laborkittel, Schraubenschlüssel */
export function SpeicheAvatar({ className = 'h-20 w-20', stimmung = 'info' }: { className?: string; stimmung?: Tipp['stimmung'] }) {
  const reduziert = useGame((s) => s.reduziert);
  return (
    <motion.svg viewBox="0 0 80 80" className={className} aria-hidden="true" animate={reduziert ? undefined : { rotate: stimmung === 'warn' ? [0, -3, 3, 0] : [0, 1.5, 0] }} transition={{ duration: stimmung === 'warn' ? 0.6 : 3, repeat: Infinity, repeatDelay: stimmung === 'warn' ? 2 : 0 }}>
      <circle cx="40" cy="40" r="38" fill={stimmung === 'warn' ? '#fef3c7' : stimmung === 'gut' ? '#dcfce7' : '#e0f2fe'} />
      {/* Kittel */}
      <path d="M14 78c2-16 12-22 26-22s24 6 26 22z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M34 57l6 10 6-10" fill="#0d9488" />
      <path d="M40 67v11" stroke="#cbd5e1" strokeWidth="1.2" />
      {/* Schraubenschlüssel in der Brusttasche */}
      <rect x="49" y="64" width="9" height="7" rx="1" fill="#e2e8f0" stroke="#94a3b8" />
      <path d="M53 64v-6m-2 0h4" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
      {/* Hals, Kopf */}
      <rect x="35" y="48" width="10" height="9" rx="3" fill="#f2c9a5" />
      <ellipse cx="40" cy="36" rx="14" ry="15" fill="#f8d9bb" />
      {/* Haare mit Dutt */}
      <circle cx="40" cy="15" r="7" fill="#cbd5e1" />
      <path d="M26 36c-2-12 5-19 14-19s16 7 14 19c-2-7-6-11-14-11s-12 4-14 11z" fill="#cbd5e1" />
      <path d="M36 14c2-2 6-2 8 0" stroke="#94a3b8" strokeWidth="1" fill="none" />
      {/* Brille */}
      <circle cx="34" cy="37" r="5" fill="#ffffff55" stroke="#334155" strokeWidth="1.6" />
      <circle cx="46" cy="37" r="5" fill="#ffffff55" stroke="#334155" strokeWidth="1.6" />
      <path d="M39 37h2" stroke="#334155" strokeWidth="1.6" />
      <circle cx="34" cy="37.5" r="1.4" fill="#1e293b" />
      <circle cx="46" cy="37.5" r="1.4" fill="#1e293b" />
      {/* Mund */}
      {stimmung === 'warn' ? <path d="M36 46q4-2 8 0" stroke="#9a3412" strokeWidth="1.6" fill="none" strokeLinecap="round" /> : <path d="M35 44q5 4 10 0" stroke="#9a3412" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      <circle cx="29" cy="42" r="2" fill="#fca5a5" opacity="0.6" />
      <circle cx="51" cy="42" r="2" fill="#fca5a5" opacity="0.6" />
    </motion.svg>
  );
}

/** Beraterin mit Sprechblase; blättert durch die Tipps */
export function Beraterin({ state, vorschau, bericht, kompakt = false }: { state: GameState; vorschau: QuarterReport | null; bericht: QuarterReport | null; kompakt?: boolean }) {
  const historie = useGame((s) => s.historie);
  const gehe = useGame((s) => s.gehe);
  const tipps = useMemo(() => beraterTipps(state, vorschau, bericht, historie), [state, vorschau, bericht, historie]);
  const [i, setI] = useState(0);
  const tipp = tipps[i % tipps.length];
  const rahmen = tipp.stimmung === 'warn' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40' : tipp.stimmung === 'gut' ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40' : 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40';
  return (
    <div className={`flex items-start gap-3 ${kompakt ? '' : 'card p-3'}`}>
      <SpeicheAvatar className={kompakt ? 'h-14 w-14 shrink-0' : 'h-20 w-20 shrink-0'} stimmung={tipp.stimmung} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold">Prof. Ulrike Speiche <span className="muted text-xs font-normal">· Beraterin</span></span>
          {tipps.length > 1 && (
            <span className="flex items-center gap-1 text-xs">
              <span className="muted tnum">{(i % tipps.length) + 1}/{tipps.length}</span>
              <button className="grid h-6 w-6 place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" aria-label="Nächster Tipp" onClick={() => setI(i + 1)}><Icon name="chevron" className="h-4 w-4" /></button>
            </span>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={i % tipps.length} initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className={`relative rounded-2xl rounded-tl-sm border px-3 py-2 text-sm ${rahmen}`}>
            {tipp.text}
            {tipp.ziel && (
              <button className="ml-1 font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-500" onClick={() => gehe(tipp.ziel!)}>
                {tipp.zielText ?? 'Hinsehen'} →
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
