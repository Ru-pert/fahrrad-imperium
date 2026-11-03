import { useState } from 'react';
import { quartalLabel, type GuV, type Bilanz } from '../../engine';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt1, pct } from '../format';
import { LinienDiagramm, Wasserfall } from '../components/charts';
import { Badge, Card, Tabelle, Tabs } from '../components/ui';
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
        <Card><p className="muted text-sm">GuV, Bilanz und Cashflow erscheinen nach dem ersten abgeschlossenen Quartal.</p></Card>
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

      {reiter === 'guv' && <Card><Zeilen spalten={spalten} zeilen={guvZeilen(letzter.guv, davor?.guv)} /></Card>}
      {reiter === 'bilanz' && (
        <Card>
          <Zeilen spalten={spalten} zeilen={bilanzZeilen(letzter.bilanz, davor?.bilanz)} />
          <p className="muted mt-2 text-xs">Differenz Aktiva − Passiva: {eur(letzter.bilanz.aktiva - letzter.bilanz.passiva)}</p>
        </Card>
      )}
      {reiter === 'cashflow' && (
        <>
          <Card titel="Kapitalflussrechnung (Wasserfall)">
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
          <Card titel="Details">
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
          <Card titel="Rating und Kreditlimit">
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
          <Card titel="Darlehen">
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
