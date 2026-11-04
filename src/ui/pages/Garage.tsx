import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { PRODUKTE, PRODUKT_IDS, type ProductId } from '../../engine';
import { EPOCHEN, FEATURES } from '../../engine/config/features';
import { istErforscht } from '../../engine/forschung';
import { useGame } from '../../store/gameStore';
import { eur, fmt0, pct } from '../format';
import { BikeBild, BikeIcon, PRODUKT_FARBE } from '../components/BikeIcon';
import { FeatureBild } from '../components/FeatureBild';
import { Card, Icon } from '../components/ui';
import { useLetzterBericht } from '../hooks';
import { klang } from '../klang';

const GESEHEN = 'fi-garage-gesehen';
const ladeGesehen = (): string[] | null => {
  try {
    const v = localStorage.getItem(GESEHEN);
    return v ? (JSON.parse(v) as string[]) : null;
  } catch {
    return null;
  }
};

/** Garage: alle Modelle groß, mit erforschten Features, Probefahrt und Enthüllung neuer Features */
export function Garage() {
  const state = useGame((s) => s.state)!;
  const gehe = useGame((s) => s.gehe);
  const reduziert = useGame((s) => s.reduziert);
  const bericht = useLetzterBericht();
  const imProgramm = PRODUKT_IDS.filter((p) => state.produkte[p]);
  const [p, setP] = useState<ProductId>(imProgramm[0] ?? 'stadtrad');
  const steuerung = useAnimationControls();
  const [gespiegelt, setGespiegelt] = useState(false);
  const fertig = useMemo(() => FEATURES.filter((f) => istErforscht(state, f.id)), [state]);
  const radFeatures = fertig.filter((f) => f.fuer.includes(p)).map((f) => f.id);
  const [neu, setNeu] = useState<string[]>([]);

  // Neu erforschte Features einmal mit Blitzlicht enthüllen
  useEffect(() => {
    const gesehen = ladeGesehen();
    const ids = fertig.map((f) => f.id);
    const frisch = gesehen ? ids.filter((id) => !gesehen.includes(id)) : [];
    if (frisch.length) {
      setNeu(frisch);
      if (!reduziert) klang.erfolg();
    }
    try {
      localStorage.setItem(GESEHEN, JSON.stringify(ids));
    } catch {
      /* egal */
    }
  }, [fertig, reduziert]);

  const probefahrt = async () => {
    klang.klingel();
    await steuerung.start({ x: '120%', transition: { duration: 1.4, ease: 'easeIn' } });
    steuerung.set({ x: '-120%' });
    await steuerung.start({ x: '0%', transition: { duration: 1.1, ease: 'easeOut' } });
  };

  const angebot = bericht?.produkte.find((x) => x.produkt === p);
  const preise = bericht?.angebote.filter((a) => a.produkt === p) ?? [];
  const aktiv = imProgramm.includes(p);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Garage</h1>
        <p className="muted text-sm">Deine Modelle mit allem, was das Labor bisher erfunden hat.</p>
      </div>

      {/* Bühne */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 shadow-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full w-2/3" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(253,230,138,0.35), transparent 60%)' }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative flex items-center justify-between px-6 pt-5 text-white">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Modell</div>
            <div className="font-display text-3xl font-extrabold">{PRODUKTE[p].name}</div>
            <div className="text-sm text-slate-300">{aktiv ? `${radFeatures.length} Feature${radFeatures.length === 1 ? '' : 's'} verbaut` : 'Noch nicht erforscht'}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn border border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setGespiegelt(!gespiegelt)} disabled={!aktiv}>
              <Icon name="chevronLeft" className="h-4 w-4" /> Drehen
            </button>
            <button className="btn bg-amber-400 text-amber-950 hover:bg-amber-300" onClick={probefahrt} disabled={!aktiv || reduziert}>
              <Icon name="rad" className="h-4 w-4" /> Probefahrt
            </button>
          </div>
        </div>
        <div className="relative h-72 overflow-hidden">
          <motion.div animate={steuerung} className="absolute inset-0 flex items-end justify-center pb-6">
            <motion.div animate={{ scaleX: gespiegelt ? -1 : 1 }} transition={{ duration: 0.5 }}>
              <BikeBild produkt={p} features={aktiv ? radFeatures : []} className="h-64 w-[26rem]" farbe={aktiv ? undefined : '#475569'} />
            </motion.div>
          </motion.div>
          {!aktiv && (
            <div className="absolute inset-0 grid place-items-center">
              <button className="btn bg-white/90 text-slate-900" onClick={() => gehe('entscheidungen')}><Icon name="schloss" className="h-4 w-4" /> Im Labor erforschen</button>
            </div>
          )}
        </div>
        {/* Blitzlicht bei neuen Features */}
        <AnimatePresence>
          {neu.length > 0 && (
            <motion.div className="absolute inset-0 grid place-items-center bg-white" initial={{ opacity: 1 }} animate={{ opacity: [1, 0.9, 0] }} transition={{ duration: 1.2, times: [0, 0.2, 1] }} onAnimationComplete={() => undefined} style={{ pointerEvents: 'none' }} />
          )}
        </AnimatePresence>
        {neu.length > 0 && (
          <motion.div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-2xl bg-amber-300 px-4 py-2 text-center font-bold text-amber-950 shadow-lg" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, type: 'spring' }}>
            Neu enthüllt: {neu.map((id) => FEATURES.find((f) => f.id === id)?.name).join(', ')}
            <button className="ml-2 text-xs underline" onClick={() => setNeu([])}>ok</button>
          </motion.div>
        )}
        {/* Modellauswahl */}
        <div className="relative flex gap-2 overflow-x-auto bg-black/30 px-4 py-3">
          {PRODUKT_IDS.map((x) => {
            const da = imProgramm.includes(x);
            return (
              <button key={x} onClick={() => setP(x)} className={`flex min-w-[110px] flex-col items-center rounded-xl px-3 py-2 transition ${x === p ? 'bg-white/15 ring-2 ring-amber-300' : 'hover:bg-white/10'}`}>
                <BikeIcon produkt={x} className="h-8 w-12" farbe={da ? PRODUKT_FARBE[x] : '#64748b'} />
                <span className={`mt-1 text-xs font-semibold ${da ? 'text-white' : 'text-slate-400'}`}>{PRODUKTE[x].name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card titel="Ausstattung" icon="fe" farbe="#7c3aed" aktion={<button className="btn-ghost" onClick={() => gehe('entscheidungen')}>Zum Labor</button>}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {FEATURES.filter((f) => f.fuer.includes(p)).map((f) => {
              const da = istErforscht(state, f.id);
              return (
                <motion.div key={f.id} className={`flex items-center gap-2 rounded-xl border p-2 ${da ? 'border-[var(--line)]' : 'border-dashed border-[var(--line)] opacity-50 grayscale'}`} initial={neu.includes(f.id) ? { scale: 1.3, boxShadow: '0 0 0 6px rgba(251,191,36,0.6)' } : false} animate={{ scale: 1, boxShadow: '0 0 0 0 rgba(251,191,36,0)' }} transition={{ delay: 0.8, duration: 0.8 }}>
                  <FeatureBild bild={f.bild} className="h-10 w-10 shrink-0" bewegt={da && !reduziert} />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">{f.name}</div>
                    <div className="text-[10px] font-semibold" style={{ color: EPOCHEN[f.epoche].farbe }}>{da ? 'verbaut' : EPOCHEN[f.epoche].name}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
        <Card titel="Datenblatt" icon="bericht" farbe={PRODUKT_FARBE[p]}>
          <dl className="tnum grid grid-cols-2 gap-y-2 text-sm">
            <dt className="muted">Referenzpreis</dt><dd className="text-right font-semibold">{eur(PRODUKTE[p].referenzpreis)}</dd>
            <dt className="muted">Montage</dt><dd className="text-right font-semibold">{PRODUKTE[p].montageStunden} Std./Stück</dd>
            {angebot && <><dt className="muted">Verkauft (letztes Q.)</dt><dd className="text-right font-semibold">{fmt0(angebot.absatz)}</dd></>}
            {angebot && <><dt className="muted">Technikindex</dt><dd className="text-right font-semibold">{fmt0(angebot.technikIndex)}</dd></>}
            {angebot && <><dt className="muted">Qualität</dt><dd className="text-right font-semibold">{angebot.qualitaet.toFixed(2).replace('.', ',')}</dd></>}
            {preise.length > 0 && <><dt className="muted">Ø Verkaufspreis</dt><dd className="text-right font-semibold">{eur(preise.reduce((s, a) => s + a.preis, 0) / preise.length)}</dd></>}
            {preise.length > 0 && <><dt className="muted">Marktanteil DE</dt><dd className="text-right font-semibold">{pct(preise.find((a) => a.region === 'DE')?.marktanteil ?? 0, 2)}</dd></>}
          </dl>
          <p className="muted mt-3 text-xs">{PRODUKTE[p].lebenszyklus.text}</p>
        </Card>
      </div>
    </div>
  );
}
