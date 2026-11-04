import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import {
  HQ_STUFEN,
  KOMPONENTEN,
  LIEFERANTEN,
  PRODUKTE,
  REGIONEN,
  WARTUNG,
  aktiveProdukte,
  aktiveRegionen,
  komplexitaetsStufe,
  kreditlimit,
  referenzPreis,
  schuldenGesamt,
  type GameState,
  type Decisions,
  type ProductId,
  type QuarterReport,
  type SupplierLevel,
  type Wartung,
} from '../../engine';
import { lernkurve } from '../../engine/production';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, gruppiereWarnungen, pct } from '../format';
import { useLetzterBericht, usePreview } from '../hooks';
import { Card, Icon, IconBadge, Info, KompaktFeld, NumberField, RegionMarke, Warnung } from '../components/ui';
import { BikeIcon } from '../components/BikeIcon';
import { HebelPanel, HebelZeile } from '../components/Hebel';
import { useHebel, type HebelWirkung } from '../hebel';
import { LinienVerwaltung, WerksAnsicht } from '../components/Werk';
import { Forschungsbaum } from '../components/Forschungsbaum';
import { Beraterin } from '../components/Beraterin';
import { Auftraege, EinkaufKarte, RettungsBanner, ZufriedenheitZelle } from '../components/Tiefe';
import { FinanzSzene, LieferketteSzene, MarketingSzene, PreisSzene, TeamSzene } from '../components/Szenen';
import { KapazitaetsGrafik, PersonalErklaerung, TechnikVergleich } from '../components/Erklaer';

type AendereFn = (fn: (d: Decisions) => void) => void;

const PRODUKT_FARBE: Record<ProductId, string> = {
  stadtrad: '#0d9488', ebike: '#6366f1', mountainbike: '#d97706', lastenrad: '#db2777', rennrad: '#dc2626', emtb: '#7c3aed',
};

function useIstMobil(): boolean {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 1023px)');
    const f = () => setM(q.matches);
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  return m;
}

function Segment<T extends string>({ wert, optionen, onChange, label }: { wert: T; optionen: { id: T; label: string; sub?: string }[]; onChange: (t: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {optionen.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={wert === o.id}
          onClick={() => onChange(o.id)}
          className={`btn flex-1 flex-col !gap-0 py-1 ${wert === o.id ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`}
        >
          <span>{o.label}</span>
          {o.sub && <span className="text-[11px] font-normal opacity-80">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Feste Reglerskala für Budgets: hängt nur vom letzten Quartalsumsatz ab,
 * nicht vom eingestellten Wert (sonst wandert das Ende beim Ziehen mit).
 */
function budgetSkala(state: GameState): number {
  const umsatz = state.kpiHistorie[state.kpiHistorie.length - 1]?.umsatz ?? 2_400_000;
  return Math.max(200_000, Math.ceil((umsatz * 0.1) / 50_000) * 50_000);
}

function Gesperrt({ ab }: { ab: string }) {
  return <p className="muted text-sm">Wird {ab} freigeschaltet – bis dahin setzt die Engine sinnvolle Standardwerte.</p>;
}

// ------------------------------------------------------------------ Bereiche
interface Ctx {
  state: GameState;
  d: Decisions;
  aendere: AendereFn;
  vorschau: QuarterReport | null;
  stufe: 1 | 2 | 3;
  hebel: HebelWirkung[] | null;
  letzter: QuarterReport | null;
}

function Preise({ state, d, aendere, vorschau, hebel }: Ctx) {
  const regionen = aktiveRegionen(state);
  return (
    <Card titel={<span className="flex items-center gap-1">Verkaufspreise <Info titel="Preise">Der <strong>Referenzpreis</strong> ist der typische Ladenpreis eines Modells in der Region. Unter dem Marktdurchschnitt steigt die Nachfrage – bei günstigen Rädern stärker als bei teuren –, dafür sinkt die Marge. Mehr als das Dreifache des Referenzpreises ist nicht erlaubt. Der Balken zeigt, welchen Teil der geschätzten Nachfrage du liefern kannst. Das Gesicht zeigt die Kundenzufriedenheit: Preiserhöhungen senken sie!</Info></span>} icon="preis" farbe="#0d9488" tour="preise">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="muted text-left text-xs">
              <th className="pb-1 pr-3 font-medium">Produkt</th>
              {regionen.map((r) => <th key={r} className="px-2 pb-1 font-medium"><RegionMarke r={r} />{REGIONEN[r].name}</th>)}
            </tr>
          </thead>
          <tbody>
            {aktiveProdukte(state).map((p) => {
              const hMinus = hebel?.find((h) => h.id === `preis-${p}`);
              const hPlus = hebel?.find((h) => h.id === `preis+${p}`);
              return (
                <tr key={p} className="align-top">
                  <td className="rounded-l-xl py-2 pl-2 pr-3" style={{ background: `${PRODUKT_FARBE[p]}0f` }}>
                    <div className="flex items-center gap-2 font-semibold"><BikeIcon produkt={p} className="h-7 w-11" />{PRODUKTE[p].name}</div>
                    {hMinus && hPlus && (
                      <div className="tnum mt-1 text-[11px] leading-tight">
                        <span className="muted">−5 %:</span> <span className={hMinus.ebitJetzt >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{vorzeichen(hMinus.ebitJetzt)}</span>
                        <span className="muted"> · +5 %:</span> <span className={hPlus.ebitJetzt >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{vorzeichen(hPlus.ebitJetzt)}</span>
                        <span className="muted"> EBIT</span>
                      </div>
                    )}
                  </td>
                  {regionen.map((r, i) => {
                    const ref = referenzPreis(r, p);
                    const preis = d.preis[p]?.[r] ?? ref;
                    const seg = vorschau?.segmente.find((s) => s.produkt === p && s.region === r);
                    const ang = vorschau?.angebote.find((a) => a.produkt === p && a.region === r);
                    const quote = ang && ang.nachfrage > 0 ? Math.min(1, ang.absatz / ang.nachfrage) : 1;
                    return (
                      <td key={r} className={`px-2 py-2 ${i === regionen.length - 1 ? 'rounded-r-xl' : ''}`} style={{ background: `${PRODUKT_FARBE[p]}0f` }}>
                        <KompaktFeld
                          label={`Preis ${PRODUKTE[p].name} ${REGIONEN[r].name}`}
                          unit="€"
                          value={Math.round(preis)}
                          min={Math.round(ref * 0.5)}
                          max={Math.round(ref * 3)}
                          sliderMax={Math.round(ref * 1.6)}
                          step={1}
                          tastenSchritt={ref > 2000 ? 10 : 5}
                          farbe={PRODUKT_FARBE[p]}
                          onChange={(v) => aendere((x) => { x.preis[p] = { ...x.preis[p], [r]: v }; })}
                        />
                        <div className="tnum mt-0.5 flex items-center justify-between text-[11px]">
                          <span className={preis / ref > 1.3 || preis / ref < 0.8 ? 'font-semibold text-amber-600' : 'muted'}>{pct(preis / ref, 0)} Ref.</span>
                          {seg && <span className="muted">Ø {eur(seg.durchschnittspreis)}</span>}
                          <ZufriedenheitZelle state={state} r={r} p={p} />
                        </div>
                        {ang && (
                          <div className="mt-1" title={`Nachfrage ${fmt0(ang.nachfrage)} · Absatz ${fmt0(ang.absatz)}`}>
                            <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                              <div className="h-full rounded-full transition-all" style={{ width: `${quote * 100}%`, background: quote < 0.8 ? '#f43f5e' : PRODUKT_FARBE[p] }} />
                            </div>
                            <div className="tnum muted mt-0.5 text-[11px]">{fmt0(ang.absatz)} von {fmt0(ang.nachfrage)} Stück</div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const vorzeichen = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${eurKompakt(Math.abs(x))}`;

function Produktion({ state, d, aendere, vorschau, hebel }: Ctx) {
  const produkte = aktiveProdukte(state);
  return (
    <div className="space-y-2">
      {state.werke.filter((w) => (w.status ?? 'aktiv') === 'aktiv').map((w) => {
        const wr = vorschau?.werke.find((x) => x.id === w.id);
        return (
          <Card key={w.id} titel={`Werk ${w.name}`}>
            {wr && (
              <div className="mb-3">
                <KapazitaetsGrafik state={state} wr={wr} />
              </div>
            )}
            {produkte.map((p) => {
              const lk = lernkurve(state.produkte[p]!.kumMenge);
              const maxProProdukt = wr ? Math.ceil(wr.maxStunden / (PRODUKTE[p].montageStunden * lk)) : 5000;
              const menge = d.produktion[p]?.[w.id] ?? 0;
              const pb = vorschau?.produkte.find((x) => x.produkt === p);
              return (
                <div key={p}>
                <NumberField
                  label={`${PRODUKTE[p].name} (${PRODUKTE[p].montageStunden} Std./Stück)`}
                  unit="Stk."
                  value={menge}
                  min={0}
                  sliderMax={Math.max(100, Math.ceil(maxProProdukt * 1.05))}
                  step={10}
                  tastenSchritt={50}
                  farbe={PRODUKT_FARBE[p]}
                  onChange={(v) => aendere((x) => { x.produktion[p] = { ...x.produktion[p], [w.id]: Math.round(v) }; })}
                  hint={pb ? `Lager ${fmt0(state.produkte[p]!.lager.stueck)} · Herstellkosten ${eur(pb.hkProStueck)}/Stück` : undefined}
                  info={<>
                    <p>Ein {PRODUKTE[p].name} braucht {PRODUKTE[p].montageStunden} Montagestunden. Mit jeder gebauten Menge wird dein Team schneller (Lernkurve), die Stunden je Rad sinken.</p>
                    <p className="mt-1">Was du nicht verkaufst, landet im Lager und verursacht Lagerkosten. Verkaufen kannst du höchstens Lager + Produktion.</p>
                  </>}
                />
                <HebelZeile h={hebel?.find((h) => h.id === `prod-${p}`)} />
                </div>
              );
            })}
          </Card>
        );
      })}
    </div>
  );
}

function Marketing({ state, d, aendere, vorschau, hebel }: Ctx) {
  const regionen = aktiveRegionen(state);
  const summe = aktiveProdukte(state).reduce((s, p) => s + regionen.reduce((a, r) => a + (d.marketing[p]?.[r] ?? 0), 0), 0);
  return (
    <Card
      titel={<span className="flex items-center gap-1">Marketingbudget je Quartal <Info titel="Marketing">
        <p>Werbung wirkt zweifach: Sie macht dich <strong>bekannter</strong> (langsam, über mehrere Quartale) und steigert direkt die Nachfrage. Ohne Werbung sinkt die Bekanntheit wieder.</p>
        <p className="mt-1">Der Effekt hat einen <strong>abnehmenden Grenzertrag</strong>: Die ersten Euro bringen viel, jeder weitere weniger. Ein gutes Preis-Leistungs-Verhältnis verstärkt die Werbung.</p>
      </Info></span>}
      aktion={<span className="tnum muted text-sm">Summe {eurKompakt(summe)}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="muted text-left text-xs">
              <th className="pb-1 pr-3 font-medium">Produkt</th>
              {regionen.map((r) => <th key={r} className="px-2 pb-1 font-medium"><RegionMarke r={r} />{REGIONEN[r].name}</th>)}
            </tr>
          </thead>
          <tbody>
            {aktiveProdukte(state).map((p) => {
              const h = hebel?.find((x) => x.id === `mkt-${p}`);
              return (
                <tr key={p} className="align-top">
                  <td className="rounded-l-xl py-2 pl-2 pr-3" style={{ background: `${PRODUKT_FARBE[p]}0f` }}>
                    <div className="flex items-center gap-2 font-semibold"><BikeIcon produkt={p} className="h-7 w-11" />{PRODUKTE[p].name}</div>
                    {h && (
                      <div className="tnum mt-1 text-[11px] leading-tight">
                        <span className="muted">+10 Tsd. €:</span> <span className={h.ebitJetzt >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{vorzeichen(h.ebitJetzt)}</span>
                        <span className="muted"> jetzt, </span><span className={h.ebitNaechstes >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{vorzeichen(h.ebitNaechstes)}</span><span className="muted"> danach</span>
                      </div>
                    )}
                  </td>
                  {regionen.map((r, i) => {
                    const ang = vorschau?.angebote.find((a) => a.produkt === p && a.region === r);
                    return (
                      <td key={r} className={`px-2 py-2 ${i === regionen.length - 1 ? 'rounded-r-xl' : ''}`} style={{ background: `${PRODUKT_FARBE[p]}0f` }}>
                        <KompaktFeld
                          label={`Marketing ${PRODUKTE[p].name} ${REGIONEN[r].name}`}
                          unit="€"
                          value={d.marketing[p]?.[r] ?? 0}
                          min={0}
                          sliderMax={budgetSkala(state)}
                          step={1000}
                          tastenSchritt={5000}
                          farbe={PRODUKT_FARBE[p]}
                          onChange={(v) => aendere((x) => { x.marketing[p] = { ...x.marketing[p], [r]: v }; })}
                        />
                        {ang && <div className="tnum muted mt-0.5 text-[11px]">Marktanteil {pct(ang.marktanteil, 2)}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ForschungEntwicklung({ state, d, aendere, vorschau, hebel }: Ctx) {
  return (
    <Card titel="Technik verbessern: F&E-Budget je Produkt" icon="qualitaet" farbe="#7c3aed">
      {aktiveProdukte(state).map((p) => {
        const fe = d.fe[p] ?? 0;
        return (
          <div key={p} className="mb-3">
          <NumberField
            label={PRODUKTE[p].name}
            unit="€"
            value={fe}
            min={0}
            sliderMax={budgetSkala(state)}
            step={1000}
            tastenSchritt={5000}
            farbe={PRODUKT_FARBE[p]}
            onChange={(v) => aendere((x) => { x.fe[p] = v; })}
            hint={`F&E-Stock ${eur(state.produkte[p]!.fe)}`}
            info={<>
              <p>Dein F&E-Budget fließt in den <strong>F&E-Stock</strong> des Produkts. Daraus ergibt sich die Technik – mit abnehmendem Ertrag.</p>
              <p className="mt-1">Der Stock <strong>veraltet um 5 % je Quartal</strong>, und der Markt wird jedes Quartal besser. Wer nicht forscht, fällt zurück.</p>
            </>}
          />
          <HebelZeile h={hebel?.find((h) => h.id === `fe-${p}`)} />
          <TechnikVergleich state={state} p={p} fe={fe} vorschau={vorschau} />
          </div>
        );
      })}
    </Card>
  );
}

function Personal({ state, d, aendere, vorschau, hebel }: Ctx) {
  return (
    <div className="space-y-2">
      {state.werke.filter((w) => (w.status ?? 'aktiv') === 'aktiv').map((w) => {
        const e = d.werke[w.id];
        if (!e) return null;
        const maxPlus = Math.floor(w.mitarbeitende * 0.5);
        const maxMinus = Math.floor(w.mitarbeitende * 0.2);
        return (
          <Card key={w.id} titel={`Werk ${w.name}`}>
            <TeamSzene state={state} d={d} werkId={w.id} />
            <NumberField
              label="Einstellen (+) / Entlassen (−)"
              value={e.personalAenderung}
              min={-maxMinus}
              max={maxPlus}
              step={1}
              onChange={(v) => aendere((x) => { x.werke[w.id].personalAenderung = Math.round(v); })}
              hint={`Erlaubt: −${maxMinus} bis +${maxPlus}`}
              info={<>
                <p>Einstellen kostet 3.000 € je Person, Entlassen 6.000 € (Abfindung) und schadet Motivation und Image.</p>
                <p className="mt-1">Neue Leute arbeiten im ersten Quartal nur halb so produktiv. Je Quartal sind höchstens +50 % bzw. −20 % der Belegschaft möglich.</p>
              </>}
            />
            <HebelZeile h={hebel?.find((h) => h.id === 'personal')} />
            <PersonalErklaerung state={state} wr={vorschau?.werke.find((x) => x.id === w.id)} />
            <NumberField
              label="Schulungsbudget je Mitarbeitende/n"
              unit="€"
              value={e.schulungProKopf}
              min={0}
              max={2000}
              step={50}
              tastenSchritt={100}
              onChange={(v) => aendere((x) => { x.werke[w.id].schulungProKopf = v; })}
              info="Schulungen heben Qualität, Kompetenz und Motivation. Unter 300 € je Kopf steigt das Streikrisiko."
            />
          </Card>
        );
      })}
    </div>
  );
}

function WerkBereich({ state, d, aendere, vorschau, stufe }: Ctx) {
  return (
    <div className="space-y-4">
      {state.werke.map((w) => {
        const e = d.werke[w.id];
        if (!e) return null;
        if (w.status === 'bau') {
          return (
            <Card key={w.id} titel={`Werk ${w.name}`} icon="werk" farbe="#f59e0b">
              <p className="text-sm">Im Bau – fertig in <strong>{w.bauRest} Quartal{(w.bauRest ?? 1) > 1 ? 'en' : ''}</strong>. Danach kannst du hier Linien kaufen und Personal einstellen.</p>
            </Card>
          );
        }
        const produktion = aktiveProdukte(state).reduce((s, p) => s + (d.produktion[p]?.[w.id] ?? 0), 0);
        return (
          <Card key={w.id} titel={`Werk ${w.name}: Halle und Fertigungslinien`}>
            <WerksAnsicht state={state} werk={w} wr={vorschau?.werke.find((x) => x.id === w.id)} produktion={produktion} geplant={e.linienKaufen.flatMap((k) => Array.from({ length: k.anzahl }, () => k.typ))} verkauf={e.linienVerkaufen} />
            <div className="mt-4">
              <LinienVerwaltung state={state} werk={w} e={e} aendere={aendere} stufe={stufe} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Lieferkette({ state, d, aendere, stufe }: Ctx) {
  if (stufe < 2) {
    return (
      <Card titel="Lieferkette, Wartung, Nachhaltigkeit">
        <Gesperrt ab="ab Q3" />
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      <Card titel={<span className="flex items-center gap-1">Lieferanten <Info titel="Lieferanten">Billig-Lieferanten sparen Materialkosten, senken aber die Qualität und fallen häufiger aus (8 % je Quartal, Standard 3 %, Premium 1 %). Premium kostet mehr, hebt die Qualität und ist zuverlässig.</Info></span>}>
        {KOMPONENTEN.map((k) => (
          <div key={k} className="py-1.5">
            <div className="mb-1 text-sm font-medium capitalize">{k}</div>
            <Segment
              label={`Lieferant ${k}`}
              wert={d.lieferanten[k]}
              onChange={(v: SupplierLevel) => aendere((x) => { x.lieferanten[k] = v; })}
              optionen={(Object.keys(LIEFERANTEN) as SupplierLevel[]).map((l) => ({ id: l, label: LIEFERANTEN[l].label, sub: `Kosten ×${LIEFERANTEN[l].kosten.toFixed(2).replace('.', ',')} · Qualität ${LIEFERANTEN[l].qualitaet.toFixed(2).replace('.', ',')}` }))}
            />
          </div>
        ))}
      </Card>
      <Card titel="Wartungsvertrag">
        {state.werke.map((w) => (
          <div key={w.id} className="py-1">
            <div className="mb-1 text-sm font-medium">{w.name}</div>
            <Segment
              label={`Wartung ${w.name}`}
              wert={d.werke[w.id]?.wartung ?? w.wartung}
              onChange={(v: Wartung) => aendere((x) => { x.werke[w.id].wartung = v; })}
              optionen={(Object.keys(WARTUNG) as Wartung[]).map((k) => ({ id: k, label: WARTUNG[k].label, sub: `${fmt0(WARTUNG[k].kosten)} € je Linie` }))}
            />
          </div>
        ))}
      </Card>
      {stufe >= 3 ? (
        <Card titel="Nachhaltigkeit">
          <NumberField
            label="Nachhaltigkeitsbudget"
            unit="€"
            value={d.nachhaltigkeitsbudget}
            min={0}
            sliderMax={budgetSkala(state)}
            step={1000}
            tastenSchritt={5000}
            onChange={(v) => aendere((x) => { x.nachhaltigkeitsbudget = v; })}
            info="Das Budget hebt deinen Nachhaltigkeitsindex (mit abnehmendem Ertrag). Er verbessert das Image und ist Bedingung für Nordamerika."
            hint={`Index aktuell ${state.unternehmen.nachhaltigkeit.toFixed(1).replace('.', ',')} · Image ${state.unternehmen.image.toFixed(1).replace('.', ',')}`}
          />
        </Card>
      ) : (
        <Card titel="Nachhaltigkeit">
          <Gesperrt ab="ab Q5" />
        </Card>
      )}
    </div>
  );
}

function FinanzenBereich({ state, d, aendere }: Ctx) {
  const limit = kreditlimit(state);
  const frei = Math.max(0, limit - schuldenGesamt(state.finanzen));
  const offen = state.finanzen.kredite.reduce((s, k) => s + k.restbetrag, 0);
  const rueck = Math.max(0, state.finanzen.gewinnruecklagen);
  const hq = state.unternehmen.firmensitz.stufe;
  const naechste = HQ_STUFEN[hq + 1];
  const gekauft = d.firmensitz.kaufen.length > 0;
  return (
    <div className="space-y-2">
      <Card titel="Darlehen">
        <div className="muted tnum mb-1 text-xs">
          Kreditlimit {eur(limit)} · frei {eur(frei)} · offen {eur(offen)}
        </div>
        <NumberField label="Darlehen aufnehmen" unit="€" value={d.finanzen.darlehenNeu} min={0} max={Math.floor(frei)} sliderMax={Math.max(1000, Math.floor(frei))} step={10000} tastenSchritt={50000} onChange={(v) => aendere((x) => { x.finanzen.darlehenNeu = v; })} info="Laufzeit 8 Quartale, lineare Tilgung. Der Zins richtet sich nach Basiszins und deinem Rating; das Kreditlimit hängt an Sachanlagen und Ertrag." />
        <NumberField label="Sondertilgung" unit="€" value={d.finanzen.tilgungExtra} min={0} max={Math.floor(offen)} sliderMax={Math.max(1000, Math.floor(offen))} step={10000} tastenSchritt={50000} onChange={(v) => aendere((x) => { x.finanzen.tilgungExtra = v; })} />
      </Card>
      <Card titel="Dividende">
        {rueck > 0 ? (
          <NumberField label="Ausschüttung" unit="€" value={d.finanzen.dividende} min={0} max={Math.floor(rueck)} sliderMax={Math.max(1000, Math.floor(rueck))} step={10000} tastenSchritt={50000} onChange={(v) => aendere((x) => { x.finanzen.dividende = v; })} hint={`Gewinnrücklagen ${eur(rueck)}`} />
        ) : (
          <p className="muted text-sm">Dividende ist erst bei Gewinnrücklagen &gt; 0 möglich (aktuell {eur(state.finanzen.gewinnruecklagen)}).</p>
        )}
      </Card>
      <Card titel="Firmensitz">
        <div className="text-sm">Aktuell: <strong>{HQ_STUFEN[hq].name}</strong> <span className="muted">({HQ_STUFEN[hq].optik})</span></div>
        {naechste ? (
          <button
            className={`btn mt-2 w-full ${gekauft ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`}
            onClick={() => aendere((x) => { x.firmensitz.kaufen = gekauft ? [] : [naechste.id]; })}
          >
            {gekauft ? '✓ ' : ''}Ausbau zu „{naechste.name}“ · {eurKompakt(naechste.kosten)} · Image +{naechste.imageBonus.toString().replace('.', ',')}
          </button>
        ) : (
          <p className="muted mt-2 text-sm">Höchste Ausbaustufe erreicht.</p>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ Vorschau
function Vorschau({ vorschau, kompakt = false }: { vorschau: QuarterReport | null; kompakt?: boolean }) {
  if (!vorschau) return null;
  const wr = vorschau.werke[0];
  const zeile = (l: string, v: ReactNode, warn = false) => (
    <div key={l} className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="muted">{l}</span>
      <motion.strong
        key={typeof v === 'string' ? v : undefined}
        initial={{ backgroundColor: 'rgba(253, 230, 138, 0.9)' }}
        animate={{ backgroundColor: 'rgba(253, 230, 138, 0)' }}
        transition={{ duration: 1 }}
        className={`tnum rounded px-1 ${warn ? 'text-rose-600 dark:text-rose-400' : ''}`}
      >
        {v}
      </motion.strong>
    </div>
  );
  return (
    <div>
      {zeile('Werksauslastung', wr ? pct(wr.auslastung, 0) : '–', (wr?.auslastung ?? 0) > 1.0)}
      {!kompakt && vorschau.produkte.map((p) => zeile(`Stückkosten ${PRODUKTE[p.produkt].name}`, eur(p.hkProStueck)))}
      {zeile('Umsatz (Schätzung)', eurKompakt(vorschau.guv.umsatz))}
      {zeile('EBIT (Schätzung)', eurKompakt(vorschau.guv.ebit), vorschau.guv.ebit < 0)}
      {zeile('Kasse am Quartalsende', eurKompakt(vorschau.bilanz.kasse), vorschau.bilanz.kasse < 100_000)}
      {vorschau.bilanz.kontokorrent > 0 && zeile('Kontokorrent', eurKompakt(vorschau.bilanz.kontokorrent), true)}
      {vorschau.warnungen.length > 0 && (() => {
        const { sonstige, engpaesse } = gruppiereWarnungen(vorschau.warnungen);
        return (
          <div className="mt-2 space-y-2">
            {sonstige.slice(0, kompakt ? 2 : 4).map((w) => <Warnung key={w}>{w}</Warnung>)}
            {sonstige.length > (kompakt ? 2 : 4) && <div className="muted text-xs">+ {sonstige.length - (kompakt ? 2 : 4)} weitere Hinweise</div>}
            {engpaesse.length > 0 && (
              <Warnung>
                <span className="flex items-center gap-1"><strong>Lieferengpass in {engpaesse.length} Märkten</strong>
                  <Info titel="Lieferengpässe"><ul className="space-y-0.5">{engpaesse.map((e) => <li key={e}>{e}</li>)}</ul><p className="mt-1">Mehr produzieren, Preise anheben oder Kapazität ausbauen.</p></Info>
                </span>
              </Warnung>
            )}
          </div>
        );
      })()}
      <div className="muted mt-2 flex items-center gap-1 text-[11px]">Schätzung ohne Gewähr <Info titel="Wie wird geschätzt?">Die Vorschau rechnet dein Quartal mit deinen aktuellen Eingaben durch. Annahmen: Die Konkurrenz wiederholt ihre Entscheidungen aus dem Vorquartal, und es treten keine Zufallsereignisse ein. Das echte Ergebnis kann also abweichen.</Info></div>
    </div>
  );
}

// ------------------------------------------------------------------ Seite
interface Schritt {
  id: string;
  titel: string;
  icon: string;
  farbe: string;
  kurz?: string;
  status?: (c: Ctx) => string;
  render: (c: Ctx) => ReactNode;
}
const SCHRITTE: Schritt[] = [
  { id: 'preise', icon: 'preis', farbe: '#0d9488', titel: 'Preise', status: (c) => `${aktiveProdukte(c.state).length * aktiveRegionen(c.state).length} Preisschilder`, render: (c) => <><PreisSzene state={c.state} d={c.d} vorschau={c.vorschau} /><Preise {...c} /></> },
  { id: 'produktion', icon: 'produktion', farbe: '#475569', titel: 'Produktion', status: (c) => (c.vorschau?.werke[0] ? `Auslastung ${pct(c.vorschau.werke[0].auslastung, 0)}` : ''), render: (c) => <Produktion {...c} /> },
  { id: 'marketing', icon: 'marketing', farbe: '#db2777', titel: 'Marketing', status: (c) => eurKompakt(Object.values(c.d.marketing).reduce((s, m) => s + Object.values(m ?? {}).reduce((a, x) => a + (x ?? 0), 0), 0)), render: (c) => <><MarketingSzene state={c.state} d={c.d} vorschau={c.vorschau} /><Marketing {...c} /></> },
  {
    id: 'auftraege', icon: 'nachfrage', farbe: '#6366f1', titel: 'Aufträge',
    status: (c) => {
      const n = (c.state.angebote?.grossabnehmer.length ?? 0) + (c.state.angebote?.ausschreibungen.length ?? 0);
      return n ? `${n} Anfrage${n > 1 ? 'n' : ''} offen` : 'keine Anfragen';
    },
    render: (c) => (c.stufe < 2 ? <Card titel="Aufträge"><Gesperrt ab="ab Q3" /></Card> : <Auftraege state={c.state} d={c.d} aendere={c.aendere} vorschau={c.vorschau} letzter={c.letzter} />),
  },
  {
    id: 'fe', icon: 'fe', farbe: '#7c3aed', titel: 'Forschung & Entwicklung', kurz: 'Forschung',
    status: (c) => eurKompakt(Object.values(c.d.fe).reduce((s, x) => s + (x ?? 0), 0) + Object.values(c.d.forschung ?? {}).reduce((s, x) => s + (x ?? 0), 0)),
    render: (c) => (
      <div className="space-y-3">
        <Card titel="Labor: Forschung" icon="fe" farbe="#7c3aed">
          <Forschungsbaum state={c.state} d={c.d} aendere={c.aendere} />
        </Card>
        <ForschungEntwicklung {...c} />
      </div>
    ),
  },
  { id: 'personal', icon: 'personal', farbe: '#2563eb', titel: 'Personal', status: (c) => `${fmt0(c.state.werke.reduce((s, w) => s + w.mitarbeitende, 0))} Personen`, render: (c) => <Personal {...c} /> },
  { id: 'werk', icon: 'werk', farbe: '#b45309', titel: 'Werk & Linien', kurz: 'Werke', status: (c) => `${c.state.werke.reduce((s, w) => s + w.linien.length, 0)} Linien`, render: (c) => <WerkBereich {...c} /> },
  { id: 'lieferkette', icon: 'lieferkette', farbe: '#0891b2', titel: 'Lieferkette', status: (c) => Object.values(c.d.lieferanten).map((l) => LIEFERANTEN[l].label).join(' · '), render: (c) => <><LieferketteSzene state={c.state} d={c.d} /><Lieferkette {...c} />{c.stufe >= 3 ? <div className="mt-2"><EinkaufKarte state={c.state} d={c.d} aendere={c.aendere} vorschau={c.vorschau} /></div> : null}</> },
  { id: 'finanzen', icon: 'geld', farbe: '#16a34a', titel: 'Finanzen', status: (c) => `Kasse ${eurKompakt(c.state.finanzen.kasse)}`, render: (c) => <><FinanzSzene state={c.state} d={c.d} /><FinanzenBereich {...c} /></> },
];

export function Entscheidungen() {
  const state = useGame((s) => s.state)!;
  const entwurf = useGame((s) => s.entwurf)!;
  const aendere = useGame((s) => s.aendereEntwurf);
  const reset = useGame((s) => s.entwurfZuruecksetzen);
  const abschliessen = useGame((s) => s.abschliessen);
  const vorschau = usePreview();
  const letzterBericht = useLetzterBericht();
  const mobil = useIstMobil();
  const stufe = komplexitaetsStufe(state);
  const hebel = useHebel(state, entwurf);
  const ctx: Ctx = useMemo(() => ({ state, d: entwurf, aendere, vorschau, stufe, hebel, letzter: letzterBericht }), [state, entwurf, aendere, vorschau, stufe, hebel, letzterBericht]);
  const [schritt, setSchritt] = useState(0);
  const [bereich, setBereich] = useState<number>(() => {
    try { return Math.min(SCHRITTE.length - 1, Math.max(0, Number(localStorage.getItem('entscheidungen-bereich') ?? 0) || 0)); } catch { return 0; }
  });
  const waehleBereich = (i: number) => {
    setBereich(i);
    try { localStorage.setItem('entscheidungen-bereich', String(i)); } catch { /* egal */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [vorschauOffen, setVorschauOffen] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const letzterSchritt = SCHRITTE.length; // Zusammenfassung

  const bestaetigen = () => {
    if (vorschau && vorschau.warnungen.length > 0 && !window.confirm('Es gibt Warnungen. Quartal trotzdem abschließen?')) return;
    abschliessen();
  };

  if (!mobil) {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="h-page">Entscheidungen</h1>
              <p className="muted text-sm">Stufe {stufe} · nicht veränderte Werte werden aus dem Vorquartal übernommen.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost whitespace-nowrap" onClick={() => useGame.getState().gehe('austausch')}><Icon name="austausch" className="h-4 w-4" />Mit Claude planen</button>
              <button className="btn-ghost" onClick={reset}>Zurücksetzen</button>
            </div>
          </div>
          <RettungsBanner state={state} d={entwurf} aendere={aendere} />
          <div data-tour="bereiche" className="sticky top-[70px] z-20 -mx-1 rounded-2xl border border-[var(--line)] bg-[var(--card)]/90 p-1.5 shadow-sm backdrop-blur" role="tablist" aria-label="Bereiche">
            <div className="grid grid-cols-5 gap-1 2xl:grid-cols-9">
              {SCHRITTE.map((s, i) => {
                const aktiv = i === bereich;
                return (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={aktiv}
                    onClick={() => waehleBereich(i)}
                    className={`relative flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition ${aktiv ? '' : 'hover:bg-black/[0.04] dark:hover:bg-white/5'}`}
                  >
                    {aktiv && <motion.span layoutId="bereich-aktiv" className="absolute inset-0 rounded-xl" style={{ background: `${s.farbe}1a`, boxShadow: `inset 0 0 0 1.5px ${s.farbe}66` }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className="relative"><IconBadge name={s.icon} farbe={s.farbe} groesse="sm" /></span>
                    <span className="relative min-w-0">
                      <span className="block truncate text-[13px] font-semibold leading-tight">{s.kurz ?? s.titel}</span>
                      <span className="muted tnum block truncate text-[11px] leading-tight">{s.status?.(ctx) ?? ''}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <motion.div key={SCHRITTE[bereich].id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            {SCHRITTE[bereich].render(ctx)}
          </motion.div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button className="btn-ghost" disabled={bereich === 0} onClick={() => waehleBereich(bereich - 1)}>
              <Icon name="chevronLeft" className="h-4 w-4" /> {bereich > 0 ? SCHRITTE[bereich - 1].kurz ?? SCHRITTE[bereich - 1].titel : 'Zurück'}
            </button>
            {bereich < SCHRITTE.length - 1 ? (
              <button className="btn-primary" onClick={() => waehleBereich(bereich + 1)}>
                Weiter: {SCHRITTE[bereich + 1].kurz ?? SCHRITTE[bereich + 1].titel} <Icon name="chevron" className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn-primary" onClick={bestaetigen} disabled={!!state.spielende}>Quartal abschließen <Icon name="chevron" className="h-4 w-4" /></button>
            )}
          </div>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto xl:pb-4">
          <div className="card p-3"><Beraterin state={state} vorschau={vorschau} bericht={letzterBericht} kompakt /></div>
          <Card titel="Live-Vorschau" icon="cockpit" tour="vorschau">
            <Vorschau vorschau={vorschau} />
            <button className="btn-primary mt-3 w-full" onClick={bestaetigen} disabled={!!state.spielende}>Quartal abschließen</button>
          </Card>
          <Card titel="Was bringt welcher Hebel?" icon="ziel" farbe="#7c3aed" tour="hebel">
            <HebelPanel hebel={hebel} />
          </Card>
        </aside>
      </div>
    );
  }

  // ---- Handy: Assistent mit wischbaren Karten
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s0 = start.current;
    start.current = null;
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x;
    const dy = t.clientY - s0.y;
    const ziel = e.target as HTMLElement;
    if (ziel.closest('input[type="range"]') || ziel.closest('input')) return;
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 2) setSchritt((v) => Math.max(0, Math.min(letzterSchritt, v + (dx < 0 ? 1 : -1))));
  };
  const aktuell = SCHRITTE[schritt];

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="pb-16">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="h-page">{aktuell ? aktuell.titel : 'Zusammenfassung'}</h1>
        <button className="btn-ghost" onClick={reset} aria-label="Entscheidungen auf Vorquartal zurücksetzen">Zurücksetzen</button>
      </div>
      <div className="mb-3 flex items-center gap-1" role="tablist" aria-label="Bereiche">
        {[...SCHRITTE, { id: 'zusammenfassung', titel: 'Fertig' }].map((s, i) => (
          <button key={s.id} role="tab" aria-selected={i === schritt} aria-label={s.titel} onClick={() => setSchritt(i)} className="flex h-11 flex-1 items-center justify-center">
            <span className={`h-2 rounded-full transition-all ${i === schritt ? 'w-8 bg-brand-600' : 'w-2 bg-black/20 dark:bg-white/25'}`} />
          </button>
        ))}
      </div>

      <div className="mb-3"><RettungsBanner state={state} d={entwurf} aendere={aendere} /></div>
      {aktuell ? (
        aktuell.render(ctx)
      ) : (
        <Card titel="Zusammenfassung">
          <Vorschau vorschau={vorschau} />
          <button className="btn-primary mt-3 w-full" onClick={bestaetigen} disabled={!!state.spielende}>Quartal abschließen</button>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn-ghost" disabled={schritt === 0} onClick={() => setSchritt(schritt - 1)}>Zurück</button>
        <button className="btn-primary" disabled={schritt === letzterSchritt} onClick={() => setSchritt(schritt + 1)}>Weiter</button>
      </div>

      {/* Einklappbare Vorschauleiste am unteren Rand */}
      {vorschau && (
        <div className="fixed inset-x-0 z-40 border-t border-[var(--line)] bg-[var(--card)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
          <button className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4 text-sm" onClick={() => setVorschauOffen((o) => !o)} aria-expanded={vorschauOffen}>
            <span className="muted">Vorschau</span>
            <span className="tnum">Auslastung <strong>{pct(vorschau.werke[0]?.auslastung ?? 0, 0)}</strong> · Kasse <strong>{eurKompakt(vorschau.bilanz.kasse)}</strong></span>
            {vorschau.warnungen.length > 0 && <span className="rounded-full bg-amber-500 px-2 text-xs font-bold text-white">{vorschau.warnungen.length}</span>}
          </button>
          {vorschauOffen && (
            <div className="max-h-[50vh] overflow-y-auto px-4 pb-3">
              <Vorschau vorschau={vorschau} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
