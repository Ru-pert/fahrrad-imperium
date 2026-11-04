import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Konfetti, RechenAnimation } from './Effekte';
import { Abzeichen } from './Abzeichen';
import { Weltkarte } from './Weltkarte';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ERFOLGE, PRODUKTE, REGIONEN, SPIELER_ID, quartalLabel, type RegionId, type ProductId, type QuarterReport } from '../../engine';
import { useGame } from '../../store/gameStore';
import { eurKompakt, fmt0, fmt2, pct } from '../format';
import { AnimatedNumber, Icon, IconBadge } from './ui';
import { FeatureBild } from './FeatureBild';
import { FEATURES } from '../../engine/config/features';
import { BikeIcon, PRODUKT_FARBE } from './BikeIcon';
import { Donut } from './charts';

type Zeitraum = 'quartal' | 'jahr';

const tooltipStil = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 };
const achse = { fontSize: 11, fill: 'var(--muted)' };

interface Firma {
  id: string;
  name: string;
  farbe: string;
  eigen: boolean;
}

const achsenEnde = (d: { wert: number }[]) => Math.ceil((Math.max(105, ...d.map((x) => x.wert)) + 3) / 5) * 5;
const achsenTicks = (d: { wert: number }[]) => {
  const ende = achsenEnde(d);
  const t: number[] = [];
  for (let x = 90; x <= ende; x += ende - 90 > 30 ? 10 : 5) t.push(x);
  return t;
};

/** Stempel „abgeschlossen“ mit kurzer Animation */
function Stempel({ quartal }: { quartal: number }) {
  return (
    <motion.div
      initial={{ scale: 2.2, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: -6, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
      className="mx-auto flex w-fit items-center gap-3 rounded-2xl border-4 border-emerald-600 px-5 py-3 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500">
        <Icon name="check" className="h-6 w-6" />
      </span>
      <div className="text-left leading-tight">
        <div className="text-xl font-black uppercase tracking-wider sm:text-2xl">{quartalLabel(quartal)}</div>
        <div className="text-sm font-bold uppercase tracking-[0.2em]">abgeschlossen</div>
      </div>
    </motion.div>
  );
}

function Kachel({ label, wert, vorher, format, delay, icon }: { label: string; wert: number; vorher?: number; format: (x: number) => string; delay: number; icon: string }) {
  const delta = vorher !== undefined && vorher !== 0 ? wert / Math.abs(vorher) - Math.sign(vorher) : undefined;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="card p-3">
      <div className="flex items-center gap-2"><IconBadge name={icon} groesse="sm" /><span className="muted text-xs font-medium uppercase tracking-wide">{label}</span></div>
      <div className="mt-1 text-xl font-bold sm:text-2xl">
        <AnimatedNumber value={wert} format={format} />
      </div>
      {vorher !== undefined && (
        <div className={`text-xs font-semibold ${wert >= vorher ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {wert >= vorher ? '▲' : '▼'} {delta !== undefined && Number.isFinite(delta) ? pct(Math.abs(delta), 0) : ''} ggü. Vorperiode
        </div>
      )}
    </motion.div>
  );
}

function Abschnitt({ titel, untertitel, children, delay = 0, icon }: { titel: string; untertitel?: string; children: React.ReactNode; delay?: number; icon?: string }) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="card p-4">
      <h3 className="flex items-center gap-2 text-base font-bold">{icon && <IconBadge name={icon} groesse="sm" />}{titel}</h3>
      {untertitel && <p className="muted mb-2 text-xs">{untertitel}</p>}
      {children}
    </motion.section>
  );
}

export function Auswertung() {
  const bericht = useGame((s) => s.frischerBericht);
  const schliessen = useGame((s) => s.frischerBerichtSchliessen);
  const gehe = useGame((s) => s.gehe);
  const state = useGame((s) => s.state);
  const historie = useGame((s) => s.historie);
  const [zeitraum, setZeitraum] = useState<Zeitraum>('quartal');
  const frisch = useGame((s) => s.auswertungFrisch);
  const reduziert = useGame((s) => s.reduziert);
  const [fertigFuer, setFertigFuer] = useState<number | null>(null);
  const phase: 'rechnen' | 'fertig' = bericht && frisch && fertigFuer !== bericht.quartal ? 'rechnen' : 'fertig';
  const rechnenFertig = useCallback(() => setFertigFuer(bericht?.quartal ?? null), [bericht]);

  useEffect(() => {
    setZeitraum('quartal');
    if (bericht) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [bericht]);

  const daten = useMemo(() => {
    if (!bericht || !state) return null;
    const idx = historie.findIndex((h) => h.report.quartal === bericht.quartal);
    const bis = idx >= 0 ? idx : historie.length - 1;
    const anzahl = zeitraum === 'jahr' ? 4 : 1;
    const periode: QuarterReport[] = historie.slice(Math.max(0, bis - anzahl + 1), bis + 1).map((h) => h.report);
    const vorperiode: QuarterReport[] = historie.slice(Math.max(0, bis - 2 * anzahl + 1), Math.max(0, bis - anzahl + 1)).map((h) => h.report);
    if (!periode.length) periode.push(bericht);

    const firmen: Firma[] = [
      { id: SPIELER_ID, name: state.unternehmen.name, farbe: state.unternehmen.farbe, eigen: true },
      ...bericht.konkurrenz.map((k) => ({ id: k.id, name: k.name, farbe: k.farbe, eigen: false })),
    ];
    const produkte = [...new Set(bericht.segmente.map((s) => s.produkt))] as ProductId[];

    const summe = (rs: QuarterReport[], f: (r: QuarterReport) => number) => rs.reduce((a, r) => a + f(r), 0);
    const absatzVon = (rs: QuarterReport[], id: string, p: ProductId) =>
      summe(rs, (r) => r.segmente.filter((s) => s.produkt === p).reduce((a, s) => a + (s.absatz[id] ?? 0), 0));
    const umsatzVon = (rs: QuarterReport[], id: string) =>
      id === SPIELER_ID ? summe(rs, (r) => r.guv.umsatz) : summe(rs, (r) => r.konkurrenz.find((k) => k.id === id)?.umsatz ?? 0);

    const kurz = (n: string) => n.replace(' GmbH', '').replace(' & Söhne', '');
    const absatzDaten = firmen.map((f) => {
      const o: Record<string, string | number> = { name: kurz(f.name) };
      for (const p of produkte) o[p] = absatzVon(periode, f.id, p);
      return o;
    });

    const anteile = produkte.map((p) => {
      const total = summe(periode, (r) => r.segmente.filter((s) => s.produkt === p).reduce((a, s) => a + Object.values(s.absatz).reduce((x, y) => x + y, 0), 0));
      const teile = firmen.map((f) => ({ name: f.name, wert: total > 0 ? absatzVon(periode, f.id, p) / total : 0, farbe: f.farbe }));
      const rest = total > 0 ? absatzVon(periode, 'rest', p) / total : 0;
      return { produkt: p, teile: [...teile, { name: 'Restmarkt (viele kleine Anbieter)', wert: rest, farbe: '#cbd5e1' }], eigen: teile[0].wert };
    });

    const technik = produkte.map((p) => {
      const seg = bericht.segmente.find((s) => s.produkt === p)!;
      return {
        produkt: p,
        daten: firmen
          .filter((f) => seg.technikIndex[f.id] !== undefined)
          .map((f) => ({ name: kurz(f.name), wert: seg.technikIndex[f.id], farbe: f.farbe }))
          .sort((a, b) => b.wert - a.wert),
      };
    });

    const qualEigen = bericht.angebote.reduce((a, x) => a + x.qualitaet, 0) / Math.max(1, bericht.angebote.length);
    const profil = firmen.map((f) => {
      const k = bericht.konkurrenz.find((x) => x.id === f.id);
      return {
        ...f,
        image: f.eigen ? bericht.kennzahlen.image : k?.image ?? 0,
        qualitaet: f.eigen ? qualEigen : k?.qualitaet ?? 0,
        bekanntheit: f.eigen ? state.regionen.DE?.bekanntheit ?? 0 : k?.bekanntheit ?? 0,
        umsatz: umsatzVon(periode, f.id),
        pleite: k?.status === 'pleite',
      };
    });
    const rangliste = [...profil].sort((a, b) => b.umsatz - a.umsatz);

    const kpi = (rs: QuarterReport[]) => ({
      umsatz: summe(rs, (r) => r.guv.umsatz),
      ebit: summe(rs, (r) => r.guv.ebit),
      absatz: summe(rs, (r) => r.kennzahlen.absatz),
      anteil: rs.length ? summe(rs, (r) => r.kennzahlen.marktanteil) / rs.length : 0,
    });
    return { periode, firmen, produkte, absatzDaten, anteile, technik, profil, rangliste, jetzt: kpi(periode), vorher: vorperiode.length ? kpi(vorperiode) : undefined };
  }, [bericht, state, historie, zeitraum]);

  if (!bericht || !state || !daten) return null;
  if (phase === 'rechnen') {
    return (
      <motion.div className="fixed inset-0 z-[70] bg-[var(--bg)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status" aria-live="polite">
        <RechenAnimation dauer={reduziert ? 300 : 2400} fertig={rechnenFertig} />
      </motion.div>
    );
  }
  const frueher = historie.filter((h) => h.report.quartal < bericht.quartal).map((h) => h.report);
  const rekordUmsatz = frueher.length > 0 && bericht.guv.umsatz > Math.max(...frueher.map((r) => r.guv.umsatz));
  const wiederGewinn = frueher.length > 0 && bericht.guv.ebit > 0 && frueher[frueher.length - 1].guv.ebit <= 0;
  const feier = frisch && !state.spielende && (rekordUmsatz || wiederGewinn || (bericht.neueErfolge?.length ?? 0) > 0 || (bericht.freischaltungen?.length ?? 0) > 0);
  const { jetzt, vorher } = daten;
  const titelZeitraum =
    zeitraum === 'jahr' && daten.periode.length > 1
      ? `${quartalLabel(daten.periode[0].quartal)} – ${quartalLabel(daten.periode[daten.periode.length - 1].quartal)}`
      : quartalLabel(bericht.quartal);
  const platz = daten.rangliste.findIndex((r) => r.eigen) + 1;
  const weiter = (ziel: 'zeitung' | 'cockpit' | 'bericht' | 'expansion' | 'entscheidungen') => {
    schliessen();
    gehe(ziel);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] overflow-y-auto bg-[var(--bg)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Auswertung ${quartalLabel(bericht.quartal)}`}
    >
      <div className="mx-auto max-w-4xl space-y-4 px-4 pb-32 pt-6" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        {feier && !reduziert && <Konfetti />}
        <Stempel quartal={bericht.quartal} />
        {feier && (
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="mx-auto w-fit rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-900">
            {rekordUmsatz ? '🏆 Rekordumsatz!' : wiederGewinn ? '🎉 Zurück in den schwarzen Zahlen!' : '⭐ Neuer Erfolg freigeschaltet!'}
          </motion.div>
        )}
        {(bericht.freischaltungen?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="card overflow-hidden p-4">
            <div className="mb-2 text-center">
              {bericht.freischaltungen.filter((f) => f.art === 'region').map((f) => (
                <div key={f.id} className="text-2xl font-black text-brand-700 dark:text-brand-500">🌍 {REGIONEN[f.id as RegionId].name} freigeschaltet!</div>
              ))}
              {bericht.freischaltungen.filter((f) => f.art === 'produkt').map((f) => (
                <div key={f.id} className="mt-1 flex items-center justify-center gap-2 text-lg font-bold"><BikeIcon produkt={f.id as ProductId} className="h-7 w-11" /> Neues Produkt verfügbar: {PRODUKTE[f.id as ProductId].name}</div>
              ))}
              {bericht.freischaltungen.filter((f) => f.art === 'feature').map((f) => {
                const ft = FEATURES.find((x) => x.id === f.id);
                if (!ft) return null;
                return (
                  <div key={f.id} className="mt-2 flex items-center justify-center gap-3">
                    <FeatureBild bild={ft.bild} className="h-12 w-12" />
                    <div className="text-left">
                      <div className="text-lg font-bold">Feature erforscht: {ft.name}</div>
                      <div className="text-sm italic text-slate-600 dark:text-slate-300">„{ft.slogan}“ – wirkt ab dem nächsten Quartal</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {bericht.freischaltungen.some((f) => f.art === 'region') && (
              <Weltkarte state={state} leuchten={bericht.freischaltungen.filter((f) => f.art === 'region').map((f) => f.id as RegionId)} kompakt />
            )}
            <div className="mt-3 flex justify-center">
              {bericht.freischaltungen.some((f) => f.art !== 'feature') ? (
                <button className="btn-primary" onClick={() => weiter('expansion')}>Zur Expansion <Icon name="chevron" className="h-4 w-4" /></button>
              ) : (
                <button className="btn-primary" onClick={() => weiter('entscheidungen')}>Zu den Entscheidungen <Icon name="chevron" className="h-4 w-4" /></button>
              )}
            </div>
          </motion.div>
        )}
        {bericht.neueErfolge?.length > 0 && (
          <div className="card mx-auto w-fit p-4 text-center">
            <div className="mb-2 text-sm font-bold uppercase tracking-widest text-amber-700">Neue Erfolge!</div>
            <div className="flex flex-wrap justify-center gap-5">
              {bericht.neueErfolge.map((id, i) => {
                const e = ERFOLGE.find((x) => x.id === id);
                if (!e) return null;
                return (
                  <div key={id} className="flex w-28 flex-col items-center">
                    <Abzeichen e={e} erreicht groesse={72} animiert={!reduziert} verzoegerung={0.6 + i * 0.25} />
                    <div className="mt-1 text-sm font-bold">{e.name}</div>
                    <div className="muted text-[11px] leading-tight">{e.bedingung}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="muted text-center text-sm">
          Das Quartal ist abgerechnet und gespeichert. Du bist jetzt in <strong className="text-[var(--ink)]">{quartalLabel(state.quartal)}</strong>.
          {platz > 0 && <> Nach Umsatz liegst du auf <strong className="text-[var(--ink)]">Platz {platz} von {daten.rangliste.length}</strong>.</>}
        </motion.p>

        {state.spielende && (
          <div className="rounded-2xl bg-rose-100 p-4 text-sm font-semibold text-rose-900">{state.spielende.grund} Lade unter „Einstellungen“ einen früheren Spielstand.</div>
        )}

        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border border-[var(--line)] p-1" role="tablist">
            {(['quartal', 'jahr'] as Zeitraum[]).map((z) => (
              <button key={z} role="tab" aria-selected={zeitraum === z} onClick={() => setZeitraum(z)} className={`btn ${zeitraum === z ? 'bg-brand-600 text-white' : ''}`}>
                {z === 'quartal' ? 'Dieses Quartal' : 'Letzte 4 Quartale'}
              </button>
            ))}
          </div>
        </div>
        <p className="muted -mt-2 text-center text-xs">Zeitraum: {titelZeitraum}{zeitraum === 'jahr' && daten.periode.length < 4 ? ` (erst ${daten.periode.length} Quartal${daten.periode.length > 1 ? 'e' : ''} gespielt)` : ''}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kachel icon="umsatz" label="Umsatz" wert={jetzt.umsatz} vorher={vorher?.umsatz} format={eurKompakt} delay={0.3} />
          <Kachel icon="ebit" label="EBIT" wert={jetzt.ebit} vorher={vorher?.ebit} format={eurKompakt} delay={0.4} />
          <Kachel icon="rad" label="Verkaufte Räder" wert={jetzt.absatz} vorher={vorher?.absatz} format={fmt0} delay={0.5} />
          <Kachel icon="marktanteil" label="Marktanteil" wert={jetzt.anteil} vorher={vorher?.anteil} format={(x) => pct(x, 2)} delay={0.6} />
        </div>

        {bericht.meldungen.length > 0 && (
          <div className="space-y-2">
            {bericht.meldungen.map((m) => (
              <div key={m} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">{m}</div>
            ))}
          </div>
        )}

        <Abschnitt icon="rad" titel="Verkaufte Fahrräder im Vergleich" untertitel="Stückzahlen je Fahrradtyp – du und deine Konkurrenz" delay={0.7}>
          <div className="mb-2 flex flex-wrap gap-3">
            {daten.produkte.map((p) => (
              <span key={p} className="flex items-center gap-1 text-xs"><BikeIcon produkt={p} className="h-5 w-8" /> {PRODUKTE[p].name}</span>
            ))}
          </div>
          <div style={{ height: 60 + daten.firmen.length * 52 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daten.absatzDaten} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={achse} tickFormatter={(v: number) => fmt0(v)} />
                <YAxis type="category" dataKey="name" tick={achse} width={96} />
                <Tooltip contentStyle={tooltipStil} formatter={(v: number) => `${fmt0(v)} Stück`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {daten.produkte.map((p) => (
                  <Bar key={p} dataKey={p} name={PRODUKTE[p].name} stackId="a" fill={PRODUKT_FARBE[p]} animationDuration={900} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Abschnitt>

        <Abschnitt icon="marktanteil" titel="Marktanteile in Deutschland" untertitel="Anteil am verkauften Volumen je Segment – grau ist der Restmarkt aus vielen kleinen Anbietern" delay={0.8}>
          <div className="grid gap-4 sm:grid-cols-2">
            {daten.anteile.map((a) => {
              const ohneRest = a.teile.filter((t) => !t.name.startsWith('Restmarkt'));
              const summeFirmen = ohneRest.reduce((s, t) => s + t.wert, 0);
              return (
                <div key={a.produkt}>
                  <div className="mb-1 flex items-center gap-2 font-semibold"><BikeIcon produkt={a.produkt} className="h-6 w-9" /> {PRODUKTE[a.produkt].name}</div>
                  <Donut teile={ohneRest.map((t) => ({ ...t, wert: summeFirmen > 0 ? t.wert / summeFirmen : 0 }))} mitte={pct(summeFirmen > 0 ? a.eigen / summeFirmen : 0, 0)} hoehe={170} />
                  <p className="muted text-center text-xs">Anteil unter den 4 großen Herstellern (Mitte: deiner)</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {a.teile.map((t) => (
                      <li key={t.name} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.farbe }} /><span className="truncate">{t.name}</span></span>
                        <span className="tnum font-semibold">{pct(t.wert, 2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Abschnitt>

        <Abschnitt icon="testsieg" titel="Testmagazin „Rad & Tat“: Technikindex" untertitel="Wer mehr in F&E investiert, hat die bessere Technik. Unter 100 Punkten gilt ein Rad als nicht marktfähig." delay={0.9}>
          <div className="grid gap-4 sm:grid-cols-2">
            {daten.technik.map((t) => (
              <div key={t.produkt}>
                <div className="mb-1 flex items-center gap-2 font-semibold"><BikeIcon produkt={t.produkt} className="h-6 w-9" /> {PRODUKTE[t.produkt].name}</div>
                <div style={{ height: 50 + t.daten.length * 34 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={t.daten} layout="vertical" margin={{ top: 4, right: 32, left: 4, bottom: 4 }}>
                      <XAxis type="number" domain={[90, achsenEnde(t.daten)]} ticks={achsenTicks(t.daten)} tick={achse} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={achse} width={96} />
                      <ReferenceLine x={100} stroke="#f43f5e" strokeDasharray="4 3" label={{ value: '100', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
                      <Tooltip contentStyle={tooltipStil} formatter={(v: number) => `${fmt0(v)} Punkte`} />
                      <Bar dataKey="wert" name="Technikindex" animationDuration={900} label={{ position: 'right', fontSize: 11, fill: 'var(--ink)', formatter: (v: number) => fmt0(v) }}>
                        {t.daten.map((d) => <Cell key={d.name} fill={d.farbe} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {t.daten[0] && <p className="muted text-xs">Testsieger: <strong className="text-[var(--ink)]">{t.daten[0].name}</strong></p>}
              </div>
            ))}
          </div>
        </Abschnitt>

        <Abschnitt icon="ziel" titel="Unternehmen im Vergleich" untertitel="Umsatz, Image (0–100), Produktqualität (0,8–1,2) und Markenbekanntheit in Deutschland" delay={1.0}>
          <div className="space-y-3">
            {daten.rangliste.map((f, i) => {
              const maxUmsatz = Math.max(...daten.rangliste.map((x) => x.umsatz), 1);
              return (
                <div key={f.id} className={`rounded-xl border p-3 ${f.eigen ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20' : 'border-[var(--line)]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 font-semibold">
                      <span className="tnum muted w-6">{i + 1}.</span>
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: f.farbe }} />
                      <span className="truncate">{f.name}{f.pleite ? ' (insolvent)' : ''}</span>
                    </div>
                    <span className="tnum font-bold">{eurKompakt(f.umsatz)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <motion.div className="h-full rounded-full" style={{ background: f.farbe }} initial={{ width: 0 }} animate={{ width: `${(f.umsatz / maxUmsatz) * 100}%` }} transition={{ duration: 0.9, delay: 1.1 + i * 0.1 }} />
                  </div>
                  <div className="tnum mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="muted">Image</span> <strong>{fmt0(f.image)}</strong></div>
                    <div><span className="muted">Qualität</span> <strong>{fmt2(f.qualitaet)}</strong></div>
                    <div><span className="muted">Bekanntheit</span> <strong>{pct(f.bekanntheit, 1)}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="muted mt-2 text-xs">Preise, Werbe- und F&E-Budgets der Konkurrenz bleiben geheim – die gibt es später über Marktforschung.</p>
        </Abschnitt>

        {bericht.warnungen.length > 0 && (
          <Abschnitt titel="Hinweise" delay={1.1}>
            <ul className="list-disc space-y-1 pl-5 text-sm">{bericht.warnungen.map((w) => <li key={w}>{w}</li>)}</ul>
          </Abschnitt>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--line)] bg-[var(--card)]/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-4xl grid-cols-[1fr_1fr_1.4fr] gap-2 p-3">
          <button className="btn-ghost" onClick={() => weiter('cockpit')}>Cockpit</button>
          <button className="btn-ghost" onClick={() => weiter('bericht')}>Details</button>
          <button className="btn-primary" onClick={() => weiter('zeitung')}>
            Zur Zeitung von {quartalLabel(state.quartal)} <Icon name="chevron" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
