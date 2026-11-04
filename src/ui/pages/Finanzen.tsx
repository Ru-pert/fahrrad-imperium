import { motion } from 'framer-motion';
import { useState } from 'react';
import { quartalLabel, type GuV, type Bilanz } from '../../engine';
import { Leer } from '../components/Leer';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, fmt1, pct } from '../format';
import { LinienDiagramm, Wasserfall } from '../components/charts';
import { Badge, Card, IconBadge, Tabelle, Tabs } from '../components/ui';
import { useLetzterBericht } from '../hooks';

type Reiter = 'guv' | 'bilanz' | 'cashflow' | 'kredit';

function Zeilen({ zeilen, spalten }: { zeilen: { l: string; a: number; b?: number; fett?: boolean; kasten?: boolean }[]; spalten: string[] }) {
  return (
    <Tabelle>
      <thead>
        <tr className="muted text-xs">
          <th className="py-1 pr-2 text-left">Position</th>
          {spalten.map((s) => <th key={s} className="px-2 text-right">{s}</th>)}
          <th className="pl-2 text-right">Δ</th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((z) => (
          <tr key={z.l} className={`border-t border-[var(--line)] ${z.fett ? 'font-semibold' : ''}`}>
            <td className="py-1.5 pr-2">{z.l}</td>
            <td className="px-2 text-right">{eur(z.a)}</td>
            {z.b !== undefined && <td className="px-2 text-right muted">{eur(z.b)}</td>}
            {z.b === undefined && spalten.length > 1 && <td className="px-2 text-right muted">–</td>}
            <td className={`pl-2 text-right ${z.b === undefined ? 'muted' : z.a - z.b >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {z.b === undefined ? '–' : eurKompakt(z.a - z.b)}
            </td>
          </tr>
        ))}
      </tbody>
    </Tabelle>
  );
}

const guvZeilen = (a: GuV, b?: GuV) => [
  { l: 'Umsatzerlöse', a: a.umsatz, b: b?.umsatz, fett: true },
  { l: '− Herstellkosten des Umsatzes', a: -a.herstellkosten, b: b && -b.herstellkosten },
  { l: '− Logistik & Zölle', a: -a.logistik, b: b && -b.logistik },
  { l: '= Deckungsbeitrag', a: a.deckungsbeitrag, b: b?.deckungsbeitrag, fett: true },
  { l: '− Marketing', a: -a.marketing, b: b && -b.marketing },
  { l: '− Forschung & Entwicklung', a: -a.fe, b: b && -b.fe },
  { l: '− Nachhaltigkeit', a: -a.nachhaltigkeit, b: b && -b.nachhaltigkeit },
  { l: '− Fertigungsgemeinkosten (Energie, Linien, Wartung, Nacharbeit, Lager)', a: -a.fertigungsgemeinkosten, b: b && -b.fertigungsgemeinkosten },
  { l: '− Personalnebenkosten & Leerkosten', a: -a.personal, b: b && -b.personal },
  { l: '− Vertrieb', a: -a.vertrieb, b: b && -b.vertrieb },
  { l: '− Verwaltung', a: -a.verwaltung, b: b && -b.verwaltung },
  { l: '− Abschreibungen', a: -a.abschreibungen, b: b && -b.abschreibungen },
  { l: '+ Sonstige Erträge / − Aufwand', a: a.sonstigeErtraege - a.sonstigerAufwand, b: b && b.sonstigeErtraege - b.sonstigerAufwand },
  { l: '= EBIT', a: a.ebit, b: b?.ebit, fett: true },
  { l: '− Zinsen', a: -a.zinsen, b: b && -b.zinsen },
  { l: '= EBT', a: a.ebt, b: b?.ebt, fett: true },
  { l: '− Steuern', a: -a.steuern, b: b && -b.steuern },
  { l: '= Quartalsüberschuss', a: a.ueberschuss, b: b?.ueberschuss, fett: true },
];

const bilanzZeilen = (a: Bilanz, b?: Bilanz) => [
  { l: 'Sachanlagen', a: a.sachanlagen, b: b?.sachanlagen },
  { l: 'Vorräte Fertigerzeugnisse', a: a.vorraeteFertig, b: b?.vorraeteFertig },
  { l: 'Vorräte Material', a: a.vorraeteMaterial, b: b?.vorraeteMaterial },
  { l: 'Forderungen', a: a.forderungen, b: b?.forderungen },
  { l: 'Kasse', a: a.kasse, b: b?.kasse },
  { l: 'Summe Aktiva', a: a.aktiva, b: b?.aktiva, fett: true },
  { l: 'Gezeichnetes Kapital', a: a.gezeichnetesKapital, b: b?.gezeichnetesKapital },
  { l: 'Kapitalrücklage', a: a.kapitalruecklage, b: b?.kapitalruecklage },
  { l: 'Gewinnrücklagen (inkl. Verlustvortrag)', a: a.gewinnruecklagen, b: b?.gewinnruecklagen },
  { l: 'Darlehen', a: a.darlehen, b: b?.darlehen },
  { l: 'Kontokorrent', a: a.kontokorrent, b: b?.kontokorrent },
  { l: 'Verbindlichkeiten aus Lieferungen', a: a.verbindlichkeiten, b: b?.verbindlichkeiten },
  { l: 'Summe Passiva', a: a.passiva, b: b?.passiva, fett: true },
];

/** „Wohin fließt jeder Euro Umsatz?“ – gestapelter Balken mit Legende */
function EuroAufteilung({ g }: { g: GuV }) {
  const teile = [
    { name: 'Material & Montage', wert: g.herstellkosten, farbe: '#64748b' },
    { name: 'Logistik & Zölle', wert: g.logistik, farbe: '#0891b2' },
    { name: 'Marketing', wert: g.marketing, farbe: '#db2777' },
    { name: 'Forschung', wert: g.fe, farbe: '#7c3aed' },
    { name: 'Fertigung & Personal', wert: g.fertigungsgemeinkosten + g.personal + g.nachhaltigkeit, farbe: '#b45309' },
    { name: 'Verwaltung & Vertrieb', wert: g.verwaltung + g.vertrieb, farbe: '#475569' },
    { name: 'Abschreibungen', wert: g.abschreibungen, farbe: '#94a3b8' },
    { name: 'Zinsen & Steuern', wert: g.zinsen + g.steuern, farbe: '#f59e0b' },
    { name: 'Gewinn', wert: Math.max(0, g.ueberschuss), farbe: '#10b981' },
  ].filter((t) => t.wert > 0);
  const summe = teile.reduce((s, t) => s + t.wert, 0) || 1;
  return (
    <div>
      <div className="flex h-9 overflow-hidden rounded-xl">
        {teile.map((t, i) => (
          <motion.div
            key={t.name}
            title={`${t.name}: ${eurKompakt(t.wert)}`}
            className="flex items-center justify-center text-[11px] font-semibold text-white"
            style={{ background: t.farbe }}
            initial={{ width: 0 }}
            animate={{ width: `${(t.wert / summe) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
          >
            {t.wert / summe > 0.06 ? pct(t.wert / summe, 0) : ''}
          </motion.div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {teile.map((t) => (
          <span key={t.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.farbe }} />{t.name} <span className="muted tnum">{fmt0((t.wert / summe) * 100)} Cent</span></span>
        ))}
      </div>
    </div>
  );
}

/** Bilanz als zwei gestapelte Säulen: Aktiva und Passiva */
function BilanzSaeulen({ b }: { b: Bilanz }) {
  const aktiva = [
    { name: 'Sachanlagen', wert: b.sachanlagen, farbe: '#475569' },
    { name: 'Vorräte', wert: b.vorraeteFertig + b.vorraeteMaterial, farbe: '#b45309' },
    { name: 'Forderungen', wert: b.forderungen, farbe: '#0891b2' },
    { name: 'Kasse', wert: b.kasse, farbe: '#10b981' },
  ];
  const passiva = [
    { name: 'Eigenkapital', wert: b.gezeichnetesKapital + b.kapitalruecklage + b.gewinnruecklagen, farbe: '#0d9488' },
    { name: 'Darlehen & Kontokorrent', wert: b.darlehen + b.kontokorrent, farbe: '#f43f5e' },
    { name: 'Verbindlichkeiten', wert: b.verbindlichkeiten, farbe: '#f59e0b' },
  ];
  const max = Math.max(b.aktiva, b.passiva, 1);
  const Saeule = ({ titel, teile }: { titel: string; teile: typeof aktiva }) => (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex h-56 w-full max-w-[160px] flex-col-reverse overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
        {teile.filter((t) => t.wert > 0).map((t, i) => (
          <motion.div key={t.name} className="flex items-center justify-center px-1 text-center text-[11px] font-semibold leading-tight text-white" style={{ background: t.farbe }} initial={{ height: 0 }} animate={{ height: `${(t.wert / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} title={`${t.name}: ${eurKompakt(t.wert)}`}>
            {t.wert / max > 0.1 ? <span>{t.name}<br />{eurKompakt(t.wert)}</span> : ''}
          </motion.div>
        ))}
      </div>
      <div className="mt-2 text-sm font-semibold">{titel}</div>
    </div>
  );
  return (
    <div className="flex gap-6 px-4">
      <Saeule titel={`Aktiva · ${eurKompakt(b.aktiva)}`} teile={aktiva} />
      <div className="muted self-center text-2xl font-bold">=</div>
      <Saeule titel={`Passiva · ${eurKompakt(b.passiva)}`} teile={passiva} />
    </div>
  );
}

export function Finanzen() {
  const historie = useGame((s) => s.historie);
  const state = useGame((s) => s.state)!;
  const bericht = useLetzterBericht();
  const [reiter, setReiter] = useState<Reiter>('guv');
  const letzter = historie[historie.length - 1]?.report;
  const davor = historie[historie.length - 2]?.report;
  const spalten = davor ? [quartalLabel(letzter?.quartal ?? 0), quartalLabel(davor.quartal)] : [quartalLabel(letzter?.quartal ?? 0)];

  if (!bericht || !letzter) {
    return (
      <div className="space-y-4">
        <h1 className="h-page">Finanzen</h1>
        <Card><Leer titel="Die Bücher sind noch leer">GuV, Bilanz und Cashflow erscheinen nach dem ersten abgeschlossenen Quartal.</Leer></Card>
      </div>
    );
  }
  const cf = letzter.kapitalfluss;
  const ratingVerlauf = historie.map((h) => ({ label: quartalLabel(h.report.quartal), score: h.report.kennzahlen.ratingScore }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Finanzen</h1>
        <p className="muted text-sm">GuV (Umsatzkostenverfahren), Bilanz und Kapitalflussrechnung. Aktiva = Passiva wird jedes Quartal geprüft.</p>
      </div>
      <Tabs<Reiter> wert={reiter} onChange={setReiter} optionen={[{ id: 'guv', label: 'GuV' }, { id: 'bilanz', label: 'Bilanz' }, { id: 'cashflow', label: 'Cashflow' }, { id: 'kredit', label: 'Kredite & Rating' }]} />

      {reiter === 'guv' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: 'Umsatz', w: eurKompakt(letzter.guv.umsatz), icon: 'umsatz', farbe: '#0d9488' },
              { l: 'Deckungsbeitrag', w: pct(letzter.guv.deckungsbeitrag / Math.max(1, letzter.guv.umsatz), 0), sub: 'vom Umsatz', icon: 'geld', farbe: '#6366f1' },
              { l: 'EBIT-Marge', w: pct(letzter.guv.ebit / Math.max(1, letzter.guv.umsatz), 1), sub: eurKompakt(letzter.guv.ebit), icon: 'ebit', farbe: letzter.guv.ebit >= 0 ? '#10b981' : '#f43f5e' },
              { l: 'Überschuss', w: eurKompakt(letzter.guv.ueberschuss), sub: `Steuern ${eurKompakt(letzter.guv.steuern)}`, icon: 'kasse', farbe: '#16a34a' },
            ].map((k) => (
              <div key={k.l} className="card flex items-center gap-3 p-3">
                <IconBadge name={k.icon} farbe={k.farbe} />
                <div>
                  <div className="muted text-xs uppercase tracking-wide">{k.l}</div>
                  <div className="tnum text-lg font-bold">{k.w}</div>
                  {k.sub && <div className="muted tnum text-xs">{k.sub}</div>}
                </div>
              </div>
            ))}
          </div>
          <Card icon="umsatz" titel="Wohin fließt jeder Euro Umsatz?"><EuroAufteilung g={letzter.guv} /></Card>
          <Card icon="bericht" titel="Gewinn- und Verlustrechnung"><Zeilen spalten={spalten} zeilen={guvZeilen(letzter.guv, davor?.guv)} /></Card>
        </>
      )}
      {reiter === 'bilanz' && (
        <Card icon="finanzen" titel="Bilanz auf einen Blick"><BilanzSaeulen b={letzter.bilanz} /></Card>
      )}
      {reiter === 'bilanz' && (
        <Card>
          <Zeilen spalten={spalten} zeilen={bilanzZeilen(letzter.bilanz, davor?.bilanz)} />
          <p className="muted mt-2 text-xs">Differenz Aktiva − Passiva: {eur(letzter.bilanz.aktiva - letzter.bilanz.passiva)}</p>
        </Card>
      )}
      {reiter === 'cashflow' && (
        <>
          <Card icon="geld" titel="Kapitalflussrechnung (Wasserfall)">
            <Wasserfall
              posten={[
                { name: 'Kasse Anfang', wert: cf.kasseAnfang, summe: true },
                { name: 'Operativ', wert: cf.operativ },
                { name: 'Investition', wert: cf.investition },
                { name: 'Finanzierung', wert: cf.finanzierung },
                { name: 'Kasse Ende', wert: cf.kasseEnde, summe: true },
              ]}
            />
          </Card>
          <Card icon="info" titel="Details">
            <Zeilen
              spalten={[quartalLabel(letzter.quartal)]}
              zeilen={[
                { l: 'Quartalsüberschuss', a: cf.ueberschuss },
                { l: '+ Abschreibungen', a: cf.abschreibungen },
                { l: '+ Ergebnis aus Anlagenabgang', a: cf.ergebnisAnlagenabgang },
                { l: '− Zunahme Forderungen', a: cf.veraenderungForderungen },
                { l: '− Zunahme Vorräte', a: cf.veraenderungVorraete },
                { l: '+ Zunahme Verbindlichkeiten', a: cf.veraenderungVerbindlichkeiten },
                { l: '= Operativer Cashflow', a: cf.operativ, fett: true },
                { l: 'Investitionen', a: cf.investitionen },
                { l: 'Erlöse aus Anlagenverkäufen', a: cf.desinvestitionen },
                { l: '= Investitions-Cashflow', a: cf.investition, fett: true },
                { l: 'Darlehensaufnahme', a: cf.darlehenNeu },
                { l: 'Tilgung', a: cf.tilgung },
                { l: 'Kontokorrent', a: cf.kontokorrent },
                { l: 'Dividende', a: cf.dividende },
                { l: '= Finanzierungs-Cashflow', a: cf.finanzierung, fett: true },
                { l: 'Veränderung der Kasse', a: cf.gesamt, fett: true },
              ]}
            />
          </Card>
        </>
      )}
      {reiter === 'kredit' && (
        <>
          <Card icon="zins" titel="Rating und Kreditlimit">
            <div className="flex flex-wrap items-center gap-3">
              <Badge farbe="green">{state.finanzen.rating}</Badge>
              <span className="tnum text-sm">Score {fmt1(state.finanzen.ratingScore)} / 100</span>
              <span className="tnum text-sm">Kreditlimit {eur(letzter.kennzahlen.kreditlimit)}</span>
              <span className="tnum text-sm">Eigenkapitalquote {pct(letzter.bilanz.eigenkapital / Math.max(1, letzter.bilanz.aktiva), 0)}</span>
            </div>
            <div className="mt-3">
              <LinienDiagramm daten={ratingVerlauf} serien={[{ key: 'score', name: 'Rating-Score', farbe: state.unternehmen.farbe }]} format={(x) => fmt1(x)} hoehe={180} />
            </div>
          </Card>
          <Card icon="finanzen" titel="Darlehen">
            {state.finanzen.kredite.length === 0 ? (
              <p className="muted text-sm">Keine laufenden Darlehen.</p>
            ) : (
              <Tabelle>
                <thead><tr className="muted text-xs"><th className="py-1 text-left">Darlehen</th><th className="px-2 text-right">Restbetrag</th><th className="px-2 text-right">Tilgung/Q</th><th className="pl-2 text-right">Zins p. a.</th></tr></thead>
                <tbody>
                  {state.finanzen.kredite.map((k) => (
                    <tr key={k.id} className="border-t border-[var(--line)]"><td className="py-1.5">{k.id}</td><td className="px-2 text-right">{eur(k.restbetrag)}</td><td className="px-2 text-right">{eur(Math.min(k.tilgung, k.restbetrag))}</td><td className="pl-2 text-right">{pct(k.zins, 2)}</td></tr>
                  ))}
                </tbody>
              </Tabelle>
            )}
            <p className="muted mt-2 text-xs">Kontokorrent: {eur(state.finanzen.kontokorrent)} (12 % p. a., sichert eine Mindestkasse von 50.000 €).</p>
          </Card>
        </>
      )}
    </div>
  );
}
