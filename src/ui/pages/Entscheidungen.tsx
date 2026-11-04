import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import {
  HQ_STUFEN,
  KOMPONENTEN,
  LIEFERANTEN,
  PRODUKTE,
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
import { eur, eurKompakt, fmt0, pct } from '../format';
import { usePreview } from '../hooks';
import { Card, IconBadge, NumberField, Warnung } from '../components/ui';
import { BikeIcon } from '../components/BikeIcon';
import { HebelPanel, HebelZeile } from '../components/Hebel';
import { useHebel, type HebelWirkung } from '../hebel';
import { LinienVerwaltung, WerksAnsicht } from '../components/Werk';
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
}

function Preise({ state, d, aendere, vorschau, hebel }: Ctx) {
  return (
    <div className="space-y-2">
      {aktiveProdukte(state).map((p) =>
        aktiveRegionen(state).map((r) => {
          const ref = referenzPreis(r, p);
          const preis = d.preis[p]?.[r] ?? ref;
          const seg = vorschau?.segmente.find((s) => s.produkt === p && s.region === r);
          const ang = vorschau?.angebote.find((a) => a.produkt === p && a.region === r);
          return (
            <Card key={`${p}${r}`} titel={<span className="flex items-center gap-2" style={{ color: PRODUKT_FARBE[p] }}><BikeIcon produkt={p} className="h-7 w-11" />{PRODUKTE[p].name}{aktiveRegionen(state).length > 1 ? ` · ${r}` : ''}</span>}>
              <NumberField
                label="Verkaufspreis"
                unit="€"
                value={Math.round(preis)}
                min={Math.round(ref * 0.5)}
                max={Math.round(ref * 3)}
                sliderMax={Math.round(ref * 1.6)}
                step={1}
                tastenSchritt={p === 'ebike' ? 10 : 5}
                farbe={PRODUKT_FARBE[p]}
                onChange={(v) => aendere((x) => { x.preis[p] = { ...x.preis[p], [r]: v }; })}
                hint={`${pct(preis / ref, 0)} des Referenzpreises (${eur(ref)})${seg ? ` · Marktdurchschnitt ${eur(seg.durchschnittspreis)}` : ''}`}
              />
              {ang && (
                <div className="muted tnum mt-1 text-xs">
                  Geschätzte Nachfrage {fmt0(ang.nachfrage)} Stück · Absatz {fmt0(ang.absatz)} · Marktanteil {pct(ang.marktanteil, 2)}
                </div>
              )}
              <HebelZeile h={hebel?.find((h) => h.id === `preis-${p}`)} />
              <HebelZeile h={hebel?.find((h) => h.id === `preis+${p}`)} />
            </Card>
          );
        }),
      )}
    </div>
  );
}

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
  return (
    <div className="space-y-2">
      <Card titel="Marketingbudget je Quartal">
        {aktiveProdukte(state).map((p) =>
          aktiveRegionen(state).map((r) => {
            const m = d.marketing[p]?.[r] ?? 0;
            const seg = vorschau?.segmente.find((s) => s.produkt === p && s.region === r);
            const ang = vorschau?.angebote.find((a) => a.produkt === p && a.region === r);
            return (
              <div key={`${p}${r}`}>
              <NumberField

                label={`${PRODUKTE[p].name}${aktiveRegionen(state).length > 1 ? ` · ${r}` : ''}`}
                unit="€"
                value={m}
                min={0}
                sliderMax={budgetSkala(state)}
                step={1000}
                tastenSchritt={5000}
                farbe={PRODUKT_FARBE[p]}
                onChange={(v) => aendere((x) => { x.marketing[p] = { ...x.marketing[p], [r]: v }; })}
                hint={ang && seg ? `Marketingfaktor wirkt mit abnehmendem Grenzertrag · Marktanteil ${pct(ang.marktanteil, 2)}` : undefined}
              />
              <HebelZeile h={hebel?.find((h) => h.id === `mkt-${p}`)} />
              </div>
            );
          }),
        )}
      </Card>
      <p className="muted px-1 text-xs">Die Markenbekanntheit (aktuell {pct(state.regionen.DE?.bekanntheit ?? 0, 1)} in Deutschland) baut sich langsam auf und wieder ab.</p>
    </div>
  );
}

function ForschungEntwicklung({ state, d, aendere, vorschau, hebel }: Ctx) {
  return (
    <Card titel="F&E-Budget je Quartal">
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
            hint={`F&E-Stock ${eur(state.produkte[p]!.fe)} – veraltet um 5 % je Quartal`}
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
            <div className="muted mb-2 text-sm tnum">{w.mitarbeitende} Mitarbeitende · Motivation {w.motivation.toFixed(2).replace('.', ',')} · Kompetenz {w.kompetenz.toFixed(2).replace('.', ',')}</div>
            <NumberField
              label="Einstellen (+) / Entlassen (−)"
              value={e.personalAenderung}
              min={-maxMinus}
              max={maxPlus}
              step={1}
              onChange={(v) => aendere((x) => { x.werke[w.id].personalAenderung = Math.round(v); })}
              hint={`Erlaubt: −${maxMinus} bis +${maxPlus} · Einstellung 3.000 €, Entlassung 6.000 € je Person`}
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
              hint="Hebt Qualität, Kompetenz und Motivation – unter 300 € steigt das Streikrisiko"
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
      <Card titel="Lieferanten">
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
        <p className="muted mt-1 text-xs">Billig-Lieferanten fallen häufiger aus (8 % je Quartal, Standard 3 %, Premium 1 %).</p>
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
            hint={`Nachhaltigkeitsindex aktuell ${state.unternehmen.nachhaltigkeit.toFixed(1).replace('.', ',')} · Image ${state.unternehmen.image.toFixed(1).replace('.', ',')}`}
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
          Kreditlimit {eur(limit)} · frei {eur(frei)} · offen {eur(offen)} · Zins: Basiszins 3 % + Rating-Aufschlag
        </div>
        <NumberField label="Darlehen aufnehmen" unit="€" value={d.finanzen.darlehenNeu} min={0} max={Math.floor(frei)} sliderMax={Math.max(1000, Math.floor(frei))} step={10000} tastenSchritt={50000} onChange={(v) => aendere((x) => { x.finanzen.darlehenNeu = v; })} hint="Laufzeit 8 Quartale, lineare Tilgung" />
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
      {vorschau.warnungen.length > 0 && (
        <div className="mt-2 space-y-2">
          {vorschau.warnungen.slice(0, kompakt ? 2 : 6).map((w) => (
            <Warnung key={w}>{w}</Warnung>
          ))}
        </div>
      )}
      <p className="muted mt-2 text-[11px]">Schätzung ohne Absatzrisiko: Die Konkurrenz wiederholt ihre Vorquartalsentscheidungen, es treten keine Zufallsereignisse ein.</p>
    </div>
  );
}

// ------------------------------------------------------------------ Seite
interface Schritt {
  id: string;
  titel: string;
  icon: string;
  farbe: string;
  render: (c: Ctx) => ReactNode;
}
const SCHRITTE: Schritt[] = [
  { id: 'preise', icon: 'preis', farbe: '#0d9488', titel: 'Preise', render: (c) => <Preise {...c} /> },
  { id: 'produktion', icon: 'produktion', farbe: '#475569', titel: 'Produktion', render: (c) => <Produktion {...c} /> },
  { id: 'marketing', icon: 'marketing', farbe: '#db2777', titel: 'Marketing', render: (c) => <Marketing {...c} /> },
  { id: 'fe', icon: 'fe', farbe: '#7c3aed', titel: 'F&E', render: (c) => <ForschungEntwicklung {...c} /> },
  { id: 'personal', icon: 'personal', farbe: '#2563eb', titel: 'Personal', render: (c) => <Personal {...c} /> },
  { id: 'werk', icon: 'werk', farbe: '#b45309', titel: 'Werk & Linien', render: (c) => <WerkBereich {...c} /> },
  { id: 'lieferkette', icon: 'lieferkette', farbe: '#0891b2', titel: 'Lieferkette', render: (c) => <Lieferkette {...c} /> },
  { id: 'finanzen', icon: 'geld', farbe: '#16a34a', titel: 'Finanzen', render: (c) => <FinanzenBereich {...c} /> },
];

export function Entscheidungen() {
  const state = useGame((s) => s.state)!;
  const entwurf = useGame((s) => s.entwurf)!;
  const aendere = useGame((s) => s.aendereEntwurf);
  const reset = useGame((s) => s.entwurfZuruecksetzen);
  const abschliessen = useGame((s) => s.abschliessen);
  const vorschau = usePreview();
  const mobil = useIstMobil();
  const stufe = komplexitaetsStufe(state);
  const hebel = useHebel(state, entwurf);
  const ctx: Ctx = useMemo(() => ({ state, d: entwurf, aendere, vorschau, stufe, hebel }), [state, entwurf, aendere, vorschau, stufe, hebel]);
  const [schritt, setSchritt] = useState(0);
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
              <button className="btn-ghost" onClick={() => useGame.getState().gehe('austausch')}>Mit Claude planen</button>
              <button className="btn-ghost" onClick={reset}>Zurücksetzen</button>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {SCHRITTE.map((s) => (
              <div key={s.id} className={s.id === 'werk' ? 'xl:col-span-2' : ''}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"><IconBadge name={s.icon} farbe={s.farbe} groesse="sm" /><span className="muted">{s.titel}</span></h2>
                {s.render(ctx)}
              </div>
            ))}
          </div>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto xl:pb-4">
          <Card titel="Live-Vorschau" icon="cockpit">
            <Vorschau vorschau={vorschau} />
            <button className="btn-primary mt-3 w-full" onClick={bestaetigen} disabled={!!state.spielende}>Quartal abschließen</button>
          </Card>
          <Card titel="Was bringt welcher Hebel?" icon="ziel" farbe="#7c3aed">
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
