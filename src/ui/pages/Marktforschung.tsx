import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { PRODUKTE, REGIONEN, REGION_IDS, type RegionId } from '../../engine';
import { MARKTFORSCHUNG } from '../../engine/config/tiefe';
import { branchenanalyse, kundenbefragung, marktbericht, spionageAkte, spionageRisiko, type BranchenanalyseAkte, type KundenbefragungAkte, type MarktberichtAkte, type SpionageAkte } from '../../engine/tiefe';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from '../format';
import { BikeIcon } from '../components/BikeIcon';
import { Leer } from '../components/Leer';
import { Zufriedenheit } from '../components/Tiefe';
import { Card, Icon, Info, RegionMarke } from '../components/ui';
import { klang } from '../klang';

const M = MARKTFORSCHUNG;
const ca = (x: string) => `~${x}`;

/** Aktendeckel mit Stempel */
function Akte({ titel, unter, stempel, geheim = false, children }: { titel: string; unter: string; stempel: string; geheim?: boolean; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} className={`relative overflow-hidden rounded-lg border p-4 shadow-md ${geheim ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-amber-300/70 bg-[#f7ecd2] text-stone-900'}`}>
      <div className="absolute -top-1 left-8 h-6 w-3 rounded-b-full border-2 border-slate-400 border-t-0" aria-hidden="true" />
      <motion.div
        className={`pointer-events-none absolute right-4 top-3 rotate-[-12deg] rounded border-[3px] px-2 py-0.5 text-sm font-black uppercase tracking-[0.2em] ${geheim ? 'border-rose-500 text-rose-500' : 'border-rose-700/80 text-rose-700/80'}`}
        initial={{ scale: 2.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 14 }}
        style={{ fontFamily: '"Courier New", monospace' }}
      >
        {stempel}
      </motion.div>
      <div className="mb-3 pr-36" style={{ fontFamily: '"Courier New", monospace' }}>
        <div className={`text-[11px] uppercase tracking-widest ${geheim ? 'text-slate-400' : 'text-stone-500'}`}>{unter}</div>
        <div className="text-lg font-bold">{titel}</div>
      </div>
      {children}
    </motion.div>
  );
}

function MarktberichtAnsicht({ a, farbe }: { a: MarktberichtAkte; farbe: (id: string) => string }) {
  return (
    <div className="space-y-3">
      {a.segmente.map((s) => (
        <div key={s.produkt}>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold"><BikeIcon produkt={s.produkt} className="h-5 w-8" />{PRODUKTE[s.produkt].name}</span>
            <span className="tnum text-xs">{ca(fmt0(s.volumen))} Räder · Ø {ca(eur(s.durchschnittspreis))}</span>
          </div>
          <div className="mt-1 flex h-4 overflow-hidden rounded">
            {s.anteile.map((x) => <div key={x.id} title={`${x.name}: ~${pct(x.anteil, 1)}`} style={{ width: `${x.anteil * 100}%`, background: farbe(x.id) }} />)}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px]">
            {s.anteile.filter((x) => x.id !== 'rest').slice(0, 4).map((x) => <span key={x.id} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: farbe(x.id) }} />{x.name} {ca(pct(x.anteil, 1))}</span>)}
          </div>
        </div>
      ))}
      <div className="text-[11px] opacity-70">Genauigkeit: Anteile ±{pct(a.genauigkeit.anteile, 0)}, Preise ±{pct(a.genauigkeit.preise, 0)} · Stand Vorquartal</div>
    </div>
  );
}

function BranchenAnsicht({ a }: { a: BranchenanalyseAkte }) {
  return (
    <div className="overflow-x-auto">
      <table className="tnum w-full text-xs">
        <thead><tr className="text-left opacity-70"><th className="py-1">Hersteller / Rad</th><th className="text-right">Preis</th><th className="text-right">Werbung</th><th className="text-right">F&E</th><th className="text-right">Kapazität</th></tr></thead>
        <tbody>
          {a.konkurrenten.map((k) =>
            k.produkte.map((p, i) => (
              <tr key={k.id + p.produkt} className={i === 0 ? 'border-t border-stone-400/40' : ''}>
                <td className="whitespace-nowrap py-1">{i === 0 ? <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: k.farbe }} />{k.name} <span className="font-normal opacity-60">Bekanntheit {ca(pct(k.bekanntheit, 0))}</span></span> : null}<span className="ml-4 inline-flex items-center gap-1"><BikeIcon produkt={p.produkt} className="h-3.5 w-5" />{PRODUKTE[p.produkt].kurz}</span></td>
                <td className="text-right">{ca(eur(p.preis))}</td>
                <td className="text-right">{ca(eurKompakt(p.marketing))}</td>
                <td className="text-right">{ca(eurKompakt(p.fe))}</td>
                <td className="text-right">{ca(fmt0(p.kapazitaet))}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      <div className="mt-2 text-[11px] opacity-70">Genauigkeit: Preise ±{pct(a.genauigkeit.preise, 0)}, Budgets und Kapazität ±{pct(a.genauigkeit.budgets, 0)} · Werte des Vorquartals</div>
    </div>
  );
}

function IndexBalken({ label, wert }: { label: string; wert: number }) {
  const breite = Math.min(100, (wert / 200) * 100);
  return (
    <div className="grid grid-cols-[80px_1fr_40px] items-center gap-2 text-xs">
      <span>{label}</span>
      <div className="relative h-2.5 rounded-full bg-stone-400/30">
        <div className="absolute inset-y-0 left-0 rounded-full bg-stone-700" style={{ width: `${breite}%` }} />
        <div className="absolute inset-y-[-3px] left-1/2 w-px bg-rose-600" />
      </div>
      <span className="tnum text-right">{ca(fmt0(wert))}</span>
    </div>
  );
}

function BefragungAnsicht({ a }: { a: KundenbefragungAkte }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {a.segmente.map((s) => (
        <div key={s.produkt} className="rounded-md bg-white/40 p-2">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><BikeIcon produkt={s.produkt} className="h-5 w-8" />{PRODUKTE[s.produkt].name}</div>
          <IndexBalken label="Preis" wert={s.preis} />
          <IndexBalken label="Werbung" wert={s.marketing} />
          <IndexBalken label="Technik" wert={s.technik} />
          <div className="mt-1.5 flex flex-wrap gap-2">
            {s.zufriedenheit.map((z) => <span key={z.region} className="flex items-center"><RegionMarke r={z.region} /><Zufriedenheit wert={z.wert} klein /></span>)}
          </div>
        </div>
      ))}
      <div className="text-[11px] opacity-70 md:col-span-2">Wie empfindlich reagiert die Kundschaft? 100 = durchschnittlich (roter Strich). Über 100: Hier lohnt sich dieser Hebel besonders. Genauigkeit ±{pct(a.genauigkeit, 0)}.</div>
    </div>
  );
}

function SpionageAnsicht({ a }: { a: SpionageAkte }) {
  return (
    <div className="space-y-2">
      {a.produkte.map((p) => (
        <div key={p.produkt} className="rounded-md border border-slate-700 p-2">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><BikeIcon produkt={p.produkt} className="h-5 w-8" farbe="#e2e8f0" />{PRODUKTE[p.produkt].name}<span className="ml-auto text-xs font-normal text-slate-400">Produktion {fmt0(p.produktion)} · F&E {eurKompakt(p.fe)}</span></div>
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(p.preise) as RegionId[]).map((r) => (
              <span key={r} className="rounded bg-slate-800 px-2 py-1"><RegionMarke r={r} />{eur(p.preise[r] ?? 0)} · Werbung {eurKompakt(p.marketing[r] ?? 0)}</span>
            ))}
          </div>
        </div>
      ))}
      <div className="text-xs text-slate-400">Geplanter Ausbau: {a.neueLinien} neue Linie{a.neueLinien === 1 ? '' : 'n'}. Exakte Pläne für dieses Quartal – mit 10 % Wahrscheinlichkeit ändert {a.name} noch leicht ab.</div>
    </div>
  );
}

export function Marktforschung() {
  const state = useGame((s) => s.state)!;
  const entwurf = useGame((s) => s.entwurf)!;
  const aendere = useGame((s) => s.aendereEntwurf);
  const mf = entwurf.marktforschung ?? {};
  const kaufbar = REGION_IDS.filter((r) => state.regionen[r]?.aktiv || state.regionen[r]?.freigeschaltet);
  const summe =
    (mf.marktbericht?.length ?? 0) * M.marktbericht.preis + (mf.branchenanalyse?.length ?? 0) * M.branchenanalyse.preis + (mf.kundenbefragung ? M.kundenbefragung.preis : 0) + (mf.spionage?.length ?? 0) * M.spionage.preis;
  const konkurrenten = Object.values(state.konkurrenten).filter((k) => k.status === 'aktiv');
  const farbe = (id: string) => (id === 'rest' ? '#cbd5e1' : id === 'spieler' ? state.unternehmen.farbe : state.konkurrenten[id]?.farbe ?? '#94a3b8');

  const kaufe = (text: string, preis: number, fn: () => void) => {
    if (!window.confirm(`${text} für ${eur(preis)} kaufen?\nDie Kosten werden mit diesem Quartal gebucht. Gekauft ist gekauft.`)) return;
    fn();
    klang.kasse();
  };
  const neu = (feld: 'marktbericht' | 'branchenanalyse', r: RegionId) =>
    aendere((x) => { x.marktforschung = { ...(x.marktforschung ?? {}), [feld]: [...new Set([...(x.marktforschung?.[feld] ?? []), r])] }; });

  const risiko = spionageRisiko(state, mf.spionage?.length ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-page">Marktforschung</h1>
          <p className="muted text-sm">Wissen ist Vorsprung. Je billiger die Quelle, desto ungenauer die Zahlen.</p>
        </div>
        {summe > 0 && <div className="rounded-xl bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900">In diesem Quartal gekauft: {eurKompakt(summe)}</div>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { feld: 'marktbericht' as const, titel: 'Marktbericht', icon: 'marktanteil', farbe: '#0d9488', preis: M.marktbericht.preis, text: 'Marktvolumen, Ø-Preise und die Marktanteile aller Anbieter je Segment.', genau: `Anteile ±${pct(M.marktbericht.sigmaAnteile, 0)}` },
          { feld: 'branchenanalyse' as const, titel: 'Branchenanalyse', icon: 'bericht', farbe: '#6366f1', preis: M.branchenanalyse.preis, text: 'Preise, Werbung, F&E und Kapazität jedes Konkurrenten.', genau: `Preise ±${pct(M.branchenanalyse.sigmaPreise, 0)}` },
        ].map((x) => (
          <Card key={x.feld} titel={x.titel} icon={x.icon} farbe={x.farbe}>
            <p className="text-sm">{x.text}</p>
            <div className="muted mt-1 text-xs">{eur(x.preis)} je Region · {x.genau}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {kaufbar.map((r) => {
                const da = mf[x.feld]?.includes(r);
                return (
                  <button key={r} disabled={da} onClick={() => kaufe(`${x.titel} ${REGIONEN[r].name}`, x.preis, () => neu(x.feld, r))} className={`btn min-h-[34px] px-2 text-xs ${da ? 'bg-emerald-100 text-emerald-800' : 'border border-[var(--line)]'}`}>
                    <RegionMarke r={r} />{da ? 'gekauft' : 'kaufen'}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
        <Card titel="Kundenbefragung" icon="personal" farbe="#db2777">
          <p className="text-sm">Worauf achtet die Kundschaft – Preis, Werbung oder Technik? Und wie zufrieden ist sie mit deinen Rädern?</p>
          <div className="muted mt-1 text-xs">{eur(M.kundenbefragung.preis)} · Genauigkeit ±{pct(M.kundenbefragung.sigma, 0)}</div>
          <button disabled={!!mf.kundenbefragung} className={`btn mt-3 w-full ${mf.kundenbefragung ? 'bg-emerald-100 text-emerald-800' : 'btn-primary'}`} onClick={() => kaufe('Kundenbefragung', M.kundenbefragung.preis, () => aendere((x) => { x.marktforschung = { ...(x.marktforschung ?? {}), kundenbefragung: true }; }))}>
            {mf.kundenbefragung ? 'gekauft' : 'Befragung starten'}
          </button>
        </Card>
        <section className="card relative overflow-hidden border-slate-700 bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-slate-100">
          <div className="mb-2 flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
              <path d="M4 14h24l-3-6H7z" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.2" />
              <rect x="2" y="13" width="28" height="3" rx="1" fill="#1e293b" />
              <circle cx="11" cy="21" r="4" fill="none" stroke="#e2e8f0" strokeWidth="1.8" />
              <circle cx="21" cy="21" r="4" fill="none" stroke="#e2e8f0" strokeWidth="1.8" />
              <path d="M15 21h2" stroke="#e2e8f0" strokeWidth="1.8" />
            </svg>
            <h2 className="text-base font-semibold">Industriespionage</h2>
            <Info titel="Spionage">Du erfährst die <strong>geplanten</strong> Entscheidungen eines Konkurrenten für dieses Quartal – Preise, Werbung, F&E, Ausbau. Risiko: 15 % Grundrisiko, +5 Prozentpunkte je weiterer Spionage in den letzten 4 Quartalen{state.einstellungen.schwierigkeit === 'schwer' ? ', +10 im Modus „schwer“' : ''}. Fliegst du auf: Strafe 750.000 €, Image −15, und der Konkurrent senkt zwei Quartale lang aggressiv die Preise. Die Akte bekommst du trotzdem.</Info>
          </div>
          <div className="text-xs text-slate-400">{eur(M.spionage.preis)} je Konkurrent</div>
          <div className="mt-2">
            <div className="flex justify-between text-xs"><span>Entdeckungsrisiko nächster Einsatz</span><strong className={risiko > 0.25 ? 'text-rose-400' : 'text-amber-300'}>{pct(risiko, 0)}</strong></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${Math.min(100, risiko * 100 * 2)}%` }} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {konkurrenten.map((k) => {
              const da = mf.spionage?.includes(k.id);
              return (
                <button key={k.id} disabled={da} onClick={() => kaufe(`Spionage bei ${k.name} (Risiko ${pct(risiko, 0)})`, M.spionage.preis, () => aendere((x) => { x.marktforschung = { ...(x.marktforschung ?? {}), spionage: [...new Set([...(x.marktforschung?.spionage ?? []), k.id])] }; }))} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${da ? 'bg-rose-500/30 text-rose-100' : 'bg-white/10 hover:bg-white/20'}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: k.farbe }} />{k.name.replace(/ (GmbH|Inc\.|Corp\.|& Söhne)$/, '')}{da ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <h2 className="mt-2 flex items-center gap-2 text-lg font-bold"><Icon name="bericht" className="h-5 w-5" /> Deine Akten in diesem Quartal</h2>
      {summe === 0 ? (
        <Card><Leer titel="Noch keine Akten">Kaufe oben einen Bericht – er liegt sofort hier. Die Daten stammen aus dem Vorquartal, die Spionage zeigt die Pläne für dieses Quartal.</Leer></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {(mf.spionage ?? []).map((id) => {
            const a = spionageAkte(state, id);
            return a ? <Akte key={`sp-${id}`} titel={`Pläne von ${a.name}`} unter="Operation Klapprad · nur für die Geschäftsführung" stempel="Streng geheim" geheim><SpionageAnsicht a={a} /></Akte> : null;
          })}
          {(mf.marktbericht ?? []).map((r) => <Akte key={`mb-${r}`} titel={`Marktbericht ${REGIONEN[r].name}`} unter="Institut für Zweiradökonomie" stempel="Vertraulich"><MarktberichtAnsicht a={marktbericht(state, r)} farbe={farbe} /></Akte>)}
          {(mf.branchenanalyse ?? []).map((r) => <div key={`ba-${r}`} className="xl:col-span-2"><Akte titel={`Branchenanalyse ${REGIONEN[r].name}`} unter="Speichen & Partner Consulting" stempel="Vertraulich"><BranchenAnsicht a={branchenanalyse(state, r)} /></Akte></div>)}
          {mf.kundenbefragung && <Akte titel="Kundenbefragung" unter="Umfrageinstitut Klingelton" stempel="Vertraulich"><BefragungAnsicht a={kundenbefragung(state)} /></Akte>}
        </div>
      )}
    </div>
  );
}
