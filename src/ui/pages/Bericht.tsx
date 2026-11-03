import { PRODUKTE, quartalLabel } from '../../engine';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from '../format';
import { Card, Tabelle, Warnung } from '../components/ui';
import { useLetzterBericht } from '../hooks';

export function Bericht() {
  const bericht = useLetzterBericht();
  const state = useGame((s) => s.state)!;
  const gehe = useGame((s) => s.gehe);
  if (!bericht) {
    return (
      <div className="space-y-4">
        <h1 className="h-page">Quartalsbericht</h1>
        <Card>
          <p className="muted">Noch kein Quartal abgeschlossen. Treffe deine ersten Entscheidungen und schließe das Quartal ab – danach erscheint hier der Bericht.</p>
          <button className="btn-primary mt-3" onClick={() => gehe('entscheidungen')}>Zu den Entscheidungen</button>
        </Card>
      </div>
    );
  }
  const g = bericht.guv;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Quartalsbericht {quartalLabel(bericht.quartal)}</h1>
        <p className="muted text-sm">Ergebnisse des Vorquartals und Branchenzahlen. (Die Zeitung „Der Kettenblatt-Kurier“ folgt in einer späteren Ausbaustufe.)</p>
      </div>

      {bericht.meldungen.map((m) => <Warnung key={m}>{m}</Warnung>)}

      <Card titel="Ergebnis">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {[
            ['Umsatz', eurKompakt(g.umsatz)],
            ['Deckungsbeitrag', eurKompakt(g.deckungsbeitrag)],
            ['EBIT', eurKompakt(g.ebit)],
            ['Überschuss', eurKompakt(g.ueberschuss)],
            ['Absatz', `${fmt0(bericht.kennzahlen.absatz)} Räder`],
            ['Kasse', eurKompakt(bericht.bilanz.kasse)],
            ['Rating', bericht.kennzahlen.rating],
            ['Kreditlimit', eurKompakt(bericht.kennzahlen.kreditlimit)],
          ].map(([l, v]) => (
            <div key={l}>
              <dt className="muted text-xs">{l}</dt>
              <dd className="tnum text-base font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card titel="Absatz je Produkt">
        <Tabelle>
          <thead>
            <tr className="muted text-left text-xs">
              <th className="py-1 pr-2">Produkt</th>
              <th className="px-2 text-right">Preis</th>
              <th className="px-2 text-right">Nachfrage</th>
              <th className="px-2 text-right">Absatz</th>
              <th className="px-2 text-right">Anteil</th>
              <th className="pl-2 text-right">Umsatz</th>
            </tr>
          </thead>
          <tbody>
            {bericht.angebote.map((a) => (
              <tr key={a.produkt + a.region} className="border-t border-[var(--line)]">
                <td className="py-2 pr-2 font-medium">{PRODUKTE[a.produkt].name}</td>
                <td className="px-2 text-right">{eur(a.preis)}</td>
                <td className="px-2 text-right">{fmt0(a.nachfrage)}</td>
                <td className="px-2 text-right">{fmt0(a.absatz)}</td>
                <td className="px-2 text-right">{pct(a.marktanteil, 2)}</td>
                <td className="pl-2 text-right">{eurKompakt(a.umsatz)}</td>
              </tr>
            ))}
          </tbody>
        </Tabelle>
        {bericht.angebote.some((a) => a.unbedient > 1) && (
          <p className="muted mt-2 text-xs">Unbediente Nachfrage ist an die Konkurrenz abgewandert – mehr Produktion oder Kapazität würde sich lohnen.</p>
        )}
      </Card>

      <Card titel="Branchenbericht (kostenlos)">
        <Tabelle>
          <thead>
            <tr className="muted text-left text-xs">
              <th className="py-1 pr-2">Unternehmen</th>
              <th className="px-2 text-right">Umsatz/Q</th>
              <th className="px-2 text-right">EBIT/Q</th>
              <th className="pl-2 text-right">Bilanzsumme</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--line)] font-semibold">
              <td className="py-2 pr-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: state.unternehmen.farbe }} />{state.unternehmen.name}</td>
              <td className="px-2 text-right">{eurKompakt(g.umsatz)}</td>
              <td className="px-2 text-right">{eurKompakt(g.ebit)}</td>
              <td className="pl-2 text-right">{eurKompakt(bericht.bilanz.aktiva)}</td>
            </tr>
            {bericht.konkurrenz.map((k) => (
              <tr key={k.id} className="border-t border-[var(--line)]">
                <td className="py-2 pr-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: k.farbe }} />{k.name}{k.status === 'pleite' ? ' (insolvent)' : ''}</td>
                <td className="px-2 text-right">{eurKompakt(k.umsatz)}</td>
                <td className="px-2 text-right">{eurKompakt(k.ebit)}</td>
                <td className="pl-2 text-right">{eurKompakt(k.bilanzsumme)}</td>
              </tr>
            ))}
          </tbody>
        </Tabelle>
        <p className="muted mt-2 text-xs">Preise, Budgets und Marktanteile der Konkurrenz gibt es nur über Marktforschung (spätere Ausbaustufe).</p>
      </Card>

      {bericht.warnungen.length > 0 && (
        <Card titel="Hinweise der Engine">
          <div className="space-y-2">{bericht.warnungen.map((w) => <Warnung key={w}>{w}</Warnung>)}</div>
        </Card>
      )}
    </div>
  );
}
