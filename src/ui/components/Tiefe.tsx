import { motion } from 'framer-motion';
import { PRODUKTE, REGIONEN, aktiveProdukte, type Decisions, type GameState, type ProductId, type QuarterReport } from '../../engine';
import { EINKAUF, rabattFuer } from '../../engine/config/tiefe';
import { technikAusStock, technikIndex } from '../../engine/market';
import { zufriedenheitVon } from '../../engine/tiefe';
import { eur, eurKompakt, fmt0, pct } from '../format';
import { BikeIcon, PRODUKT_FARBE } from './BikeIcon';
import { Leer } from './Leer';
import { Card, Icon, IconBadge, Info, KompaktFeld, RegionMarke } from './ui';

type Aendere = (fn: (d: Decisions) => void) => void;

// ---------------------------------------------------------------- Kundenzufriedenheit

const smiley = (z: number) => (z >= 70 ? { farbe: '#16a34a', mund: 'M8 14q4 4 8 0' } : z >= 50 ? { farbe: '#65a30d', mund: 'M8 14.5q4 2 8 0' } : z >= 35 ? { farbe: '#d97706', mund: 'M8 15h8' } : { farbe: '#dc2626', mund: 'M8 16q4-3 8 0' });

/** Kleines Gesicht mit Zufriedenheitswert */
export function Zufriedenheit({ wert, klein = false }: { wert: number; klein?: boolean }) {
  const s = smiley(wert);
  return (
    <span className="inline-flex items-center gap-1" title={`Kundenzufriedenheit ${fmt0(wert)} von 100`}>
      <svg viewBox="0 0 24 24" className={klein ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill={s.farbe} opacity="0.18" stroke={s.farbe} strokeWidth="1.8" />
        <circle cx="9" cy="10" r="1.2" fill={s.farbe} />
        <circle cx="15" cy="10" r="1.2" fill={s.farbe} />
        <path d={s.mund} stroke={s.farbe} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
      <span className="tnum text-xs font-semibold" style={{ color: s.farbe }}>{fmt0(wert)}</span>
    </span>
  );
}

export const zufriedenheitInfo = (
  <>
    <p><strong>Kundenzufriedenheit</strong> (0–100) je Produkt und Markt. Über 50 steigt die Nachfrage, darunter sinkt sie (bei 25 um rund 30 %).</p>
    <p className="mt-1">Sie steigt mit Qualität, Umweltfreundlichkeit und Image. Sie sinkt bei <strong>Preiserhöhungen</strong> (−1,5 je 1 %) und wenn Kundschaft leer ausgeht (Lieferengpässe). Preissenkungen schaden nicht. Sie ändert sich jedes Quartal um 30 % des Abstands zum Zielwert.</p>
  </>
);

// ---------------------------------------------------------------- Rettungsangebot

export function RettungsBanner({ state, d, aendere }: { state: GameState; d: Decisions; aendere: Aendere }) {
  const r = state.rettungsangebot;
  if (!r) return null;
  const abgelehnt = d.rettung === 'ablehnen';
  return (
    <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-lg dark:from-amber-950/50 dark:to-orange-950/40">
      <div className="flex flex-wrap items-center gap-4">
        <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#fde68a" />
          <path d="M14 46h36l-4-18H18z" fill="#334155" />
          <rect x="24" y="20" width="16" height="10" rx="2" fill="#334155" />
          <path d="M26 20v-4h12v4" stroke="#334155" strokeWidth="3" fill="none" />
          <text x="32" y="42" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fde68a">€</text>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold">Rettung in letzter Sekunde?</div>
          <p className="text-sm">
            Ein Investor bietet <strong>{eurKompakt(r.kapital)}</strong> frisches Eigenkapital – gegen <strong>{pct(r.anteil, 0)}</strong> deiner Anteile. Lehnst du ab, ist das Unternehmen insolvent und das Spiel vorbei. Das Angebot gibt es nur einmal.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={`btn ${!abgelehnt ? 'bg-emerald-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => aendere((x) => { x.rettung = 'annehmen'; })}>{!abgelehnt ? '✓ ' : ''}Annehmen</button>
          <button className={`btn ${abgelehnt ? 'bg-rose-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => aendere((x) => { x.rettung = 'ablehnen'; })}>{abgelehnt ? '✓ ' : ''}Ablehnen</button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------- Einkauf

/** Rabattstaffel als Treppe; die erreichte Stufe leuchtet */
function Staffel({ menge, farbe }: { menge: number; farbe: string }) {
  const stufen = [...EINKAUF.staffeln].reverse();
  const aktiv = rabattFuer(menge);
  return (
    <div className="flex items-end gap-1">
      {stufen.map((s, i) => (
        <div key={s.ab} className="flex flex-col items-center">
          <div className={`w-10 rounded-t-md text-center text-[10px] font-bold text-white transition-all ${s.rabatt === aktiv ? 'ring-2 ring-offset-1' : 'opacity-40'}`} style={{ height: 10 + i * 7, background: farbe, ['--tw-ring-color' as string]: farbe }}>
            {s.rabatt ? `${Math.round(s.rabatt * 100)} %` : ''}
          </div>
          <div className="muted tnum mt-0.5 text-[9px]">{s.ab >= 1000 ? `${s.ab / 1000}k` : s.ab}</div>
        </div>
      ))}
    </div>
  );
}

export function EinkaufKarte({ state, d, aendere, vorschau }: { state: GameState; d: Decisions; aendere: Aendere; vorschau: QuarterReport | null }) {
  return (
    <Card
      titel={<span className="flex items-center gap-1">Einkauf mit Mengenrabatt <Info titel="Einkauf">
        <p>Bestellst du Material-Sets (ein Set = alle Teile für ein Rad) im Voraus, gibt es Rabatt: ab 1.000 Sets 3 %, ab 5.000 6 %, ab 20.000 10 %, ab 100.000 13 %.</p>
        <p className="mt-1">Verbraucht wird zuerst das Materiallager, dann deine Bestellung. Fehlende Sets kauft die Einkaufsabteilung ohne Rabatt nach. Übrige Sets kommen ins Materiallager (Lagerkosten 1,5 % je Quartal).</p>
      </Info></span>}
      icon="lager"
      farbe="#0891b2"
    >
      <div className="space-y-3">
        {aktiveProdukte(state).map((p) => {
          const pz = state.produkte[p]!;
          const geplantRoh = Object.values(d.produktion[p] ?? {}).reduce((s, x) => s + (x ?? 0), 0);
          // Machbare Produktion laut Vorschau (nach Kapazität und Ereignissen)
          const geplant = vorschau?.produkte.find((x) => x.produkt === p)?.produziert ?? geplantRoh;
          const bestellt = d.einkauf?.[p] ?? 0;
          const e = vorschau?.einkauf?.find((x) => x.produkt === p);
          return (
            <div key={p} className="grid items-center gap-3 rounded-xl p-2 md:grid-cols-[180px_170px_1fr_160px]" style={{ background: `${PRODUKT_FARBE[p]}0d` }}>
              <div className="flex items-center gap-2 font-semibold"><BikeIcon produkt={p} className="h-6 w-9" />{PRODUKTE[p].name}</div>
              <KompaktFeld label={`Einkauf ${PRODUKTE[p].name}`} value={bestellt} min={0} sliderMax={Math.max(25_000, Math.ceil(geplant * 1.5))} step={100} tastenSchritt={1000} unit="Sets" farbe={PRODUKT_FARBE[p]} onChange={(v) => aendere((x) => { x.einkauf = { ...(x.einkauf ?? {}), [p]: v }; })} />
              <Staffel menge={bestellt} farbe={PRODUKT_FARBE[p]} />
              <div className="tnum text-xs">
                <div>Machbare Produktion: <strong>{fmt0(geplant)}</strong>{geplantRoh > geplant + 1 ? <span className="muted"> (geplant {fmt0(geplantRoh)})</span> : null}</div>
                <div className="muted">Materiallager: {fmt0(pz.materialSets)} Sets</div>
                {e && e.ersparnis !== 0 && <div className={e.ersparnis > 0 ? 'font-semibold text-emerald-600' : 'text-rose-600'}>{e.ersparnis > 0 ? 'Ersparnis' : 'Mehrkosten'} {eurKompakt(Math.abs(e.ersparnis))}</div>}
                {bestellt > geplant && <div className="text-amber-600">{fmt0(bestellt - geplant)} Sets gehen ins Lager</div>}
              </div>
              <button className="btn-ghost min-h-[30px] px-2 text-[11px] md:col-start-2" onClick={() => aendere((x) => { x.einkauf = { ...(x.einkauf ?? {}), [p]: Math.max(0, Math.round(geplant - pz.materialSets)) }; })}>= Bedarf</button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Aufträge: Großabnehmer & Ausschreibungen

const Kunde = ({ name }: { name: string }) => {
  const icon = /Pizza|Kurier|Liefer/.test(name) ? 'lieferkette' : /Hotel|Ferien/.test(name) ? 'firmensitz' : /Leasing/.test(name) ? 'geld' : /Uni|Stadt/.test(name) ? 'personal' : 'rad';
  return <IconBadge name={icon} farbe="#0891b2" />;
};

export function Auftraege({ state, d, aendere, vorschau, letzter }: { state: GameState; d: Decisions; aendere: Aendere; vorschau: QuarterReport | null; letzter: QuarterReport | null }) {
  const ga = state.angebote?.grossabnehmer ?? [];
  const as = state.angebote?.ausschreibungen ?? [];
  const lager = (p: ProductId) => state.produkte[p]?.lager.stueck ?? 0;
  const produktion = (p: ProductId) => Object.values(d.produktion[p] ?? {}).reduce((s, x) => s + (x ?? 0), 0);
  const ergebnisse = letzter?.sonderabsatz ?? [];
  return (
    <div className="space-y-4">
      <Card titel={<span className="flex items-center gap-1">Großabnehmer <Info titel="Großabnehmer">Firmen kaufen eine feste Menge zu einem Festpreis (meist 60–85 % des Marktpreises). Keine Logistikkosten, Zahlung sofort, der normale Verkauf bleibt unberührt – solange genug Räder da sind. Geliefert wird aus Lager und Produktion, <strong>vor</strong> dem normalen Markt.</Info></span>} icon="lieferkette" farbe="#0891b2">
        {ga.length === 0 ? (
          <Leer titel="Gerade keine Anfragen">Großabnehmer melden sich ab dem 3. Quartal – neue Anfragen stehen jeweils in der Zeitung.</Leer>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {ga.map((g) => {
              const menge = d.grossabnehmer?.find((x) => x.angebotId === g.id)?.menge ?? 0;
              const markt = vorschau?.segmente.find((x) => x.produkt === g.produkt && x.region === g.region)?.durchschnittspreis ?? g.preis;
              const hk = vorschau?.produkte.find((x) => x.produkt === g.produkt)?.hkProStueck ?? 0;
              const setze = (v: number) => aendere((x) => { x.grossabnehmer = [...(x.grossabnehmer ?? []).filter((y) => y.angebotId !== g.id), ...(v > 0 ? [{ angebotId: g.id, menge: v }] : [])]; });
              return (
                <div key={g.id} className="rounded-xl border border-[var(--line)] p-3">
                  <div className="flex items-start gap-3">
                    <Kunde name={g.kunde} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{g.kunde}</div>
                      <div className="muted flex items-center text-xs"><RegionMarke r={g.region} />{REGIONEN[g.region].name} · bis {fmt0(g.hoechstmenge)} Stück</div>
                    </div>
                    <BikeIcon produkt={g.produkt} className="h-8 w-12" />
                  </div>
                  <div className="tnum mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-black/[0.03] p-1.5 dark:bg-white/5"><div className="muted">Festpreis</div><div className="text-sm font-bold">{eur(g.preis)}</div></div>
                    <div className="rounded-lg bg-black/[0.03] p-1.5 dark:bg-white/5"><div className="muted">Ø Markt</div><div className="text-sm font-bold">{eur(markt)}</div></div>
                    <div className="rounded-lg bg-black/[0.03] p-1.5 dark:bg-white/5"><div className="muted">Marge je Rad</div><div className={`text-sm font-bold ${g.preis - hk >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{eur(g.preis - hk)}</div></div>
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <div className="flex-1"><KompaktFeld label={`Liefermenge ${g.kunde}`} value={menge} min={0} max={g.hoechstmenge} step={10} tastenSchritt={50} unit="Stk." farbe={PRODUKT_FARBE[g.produkt]} onChange={setze} /></div>
                    <button className="btn-ghost min-h-[34px] px-2 text-xs" onClick={() => setze(g.hoechstmenge)}>Alles</button>
                  </div>
                  <div className="muted mt-1 text-[11px]">Verfügbar: {fmt0(lager(g.produkt))} im Lager + {fmt0(produktion(g.produkt))} geplante Produktion</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card titel={<span className="flex items-center gap-1">Öffentliche Ausschreibungen <Info titel="Ausschreibungen">Eine Behörde sucht eine feste Menge. Du gibst einen Stückpreis ab – das <strong>niedrigste Gebot</strong> gewinnt, sofern dein Technikindex das Minimum erreicht. Die Konkurrenz bietet meist knapp über ihren Herstellkosten. Gewonnene Aufträge werden zuerst beliefert, gezahlt wird im Folgequartal. Kannst du nicht voll liefern, kostet das Image.</Info></span>} icon="finanzen" farbe="#6366f1">
        {as.length === 0 ? (
          <Leer titel="Keine Ausschreibung offen">Ab dem 5. Quartal schreiben Behörden gelegentlich Aufträge aus (etwa jedes siebte Quartal).</Leer>
        ) : (
          as.map((a) => {
            const gebot = d.ausschreibungen?.find((x) => x.id === a.id)?.stueckpreis ?? 0;
            const pz = state.produkte[a.produkt];
            const ti = pz ? technikIndex(technikAusStock(pz.fe), state.markt[a.region]?.[a.produkt]?.tBar ?? 0) : 0;
            const hk = vorschau?.produkte.find((x) => x.produkt === a.produkt)?.hkProStueck ?? 0;
            const ok = ti >= a.minTechnikindex;
            return (
              <div key={a.id} className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4 dark:border-indigo-700 dark:bg-indigo-950/20">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-white"><Icon name="finanzen" className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-indigo-600">Amtliche Ausschreibung</div>
                    <div className="font-display text-lg font-bold">{a.behoerde} sucht {fmt0(a.menge)} {PRODUKTE[a.produkt].name}s</div>
                    <div className="muted flex items-center text-xs"><RegionMarke r={a.region} />{REGIONEN[a.region].name} · Mindest-Technikindex {a.minTechnikindex} · dein Index <strong className={ok ? 'ml-1 text-emerald-600' : 'ml-1 text-rose-600'}>{fmt0(ti)}</strong></div>
                  </div>
                  <BikeIcon produkt={a.produkt} className="h-10 w-16" />
                </div>
                <div className="mt-3 grid items-end gap-3 md:grid-cols-[220px_1fr]">
                  <KompaktFeld label={`Gebot ${a.behoerde}`} value={gebot} min={0} sliderMax={Math.round(PRODUKTE[a.produkt].referenzpreis * 1.2)} step={5} tastenSchritt={10} unit="€/Stk." farbe="#6366f1" onChange={(v) => aendere((x) => { x.ausschreibungen = [...(x.ausschreibungen ?? []).filter((y) => y.id !== a.id), ...(v > 0 ? [{ id: a.id, stueckpreis: v }] : [])]; })} />
                  <div className="tnum text-xs">
                    {gebot > 0 ? (
                      <>
                        <div>Auftragswert bei Zuschlag: <strong>{eurKompakt(gebot * a.menge)}</strong> · Marge {eurKompakt((gebot - hk) * a.menge)}</div>
                        <div className="muted">Deine Herstellkosten ≈ {eur(hk)} je Rad{!ok && <span className="font-semibold text-rose-600"> · Technik reicht nicht – das Gebot wäre ungültig</span>}</div>
                      </>
                    ) : (
                      <div className="muted">Kein Gebot abgegeben. Herstellkosten ≈ {eur(hk)} je Rad.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {ergebnisse.length > 0 && (
        <Card titel="Ergebnisse des letzten Quartals" icon="bericht">
          <ul className="space-y-1.5 text-sm">
            {ergebnisse.map((x) => (
              <li key={x.id} className="flex items-start gap-2">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${x.art === 'ausschreibung' && !x.gewonnen ? 'bg-rose-500' : 'bg-emerald-500'}`}>{x.art === 'ausschreibung' && !x.gewonnen ? '✕' : '✓'}</span>
                {x.text}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** Zufriedenheit für eine Zelle (Produkt × Region) */
export function ZufriedenheitZelle({ state, r, p }: { state: GameState; r: Parameters<typeof zufriedenheitVon>[1]; p: ProductId }) {
  return <Zufriedenheit wert={zufriedenheitVon(state, r, p)} klein />;
}

