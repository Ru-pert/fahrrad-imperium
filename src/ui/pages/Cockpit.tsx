import { PRODUKTE, quartalLabel, umsatz4Q } from '../../engine';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from '../format';
import { LinienDiagramm } from '../components/charts';
import { Card, Fortschritt, KpiTile, Warnung } from '../components/ui';
import { useLetzterBericht, usePreview } from '../hooks';

export function Cockpit() {
  const state = useGame((s) => s.state)!;
  const gehe = useGame((s) => s.gehe);
  const bericht = useLetzterBericht();
  const vorschau = usePreview();
  const k = state.kpiHistorie;
  const letzter = k[k.length - 1];
  const vorletzter = k[k.length - 2];
  const reihe = (f: (p: (typeof k)[number]) => number) => k.map(f);
  const farbe = state.unternehmen.farbe;
  const realUmsatz4Q = k.slice(-4).reduce((s, p) => s + p.umsatz, 0);
  const anteilDE = bericht?.kennzahlen.marktanteil ?? 0;
  void umsatz4Q;

  const daten = k.map((p) => ({ label: quartalLabel(p.quartal), umsatz: p.umsatz, ebit: p.ebit }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Cockpit</h1>
        <p className="muted text-sm">
          {state.unternehmen.name} · Entscheidung für {quartalLabel(state.quartal)}
        </p>
      </div>

      {state.spielende && <Warnung>{state.spielende.grund} Lade unter „Einstellungen“ einen früheren Spielstand.</Warnung>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiTile label="Umsatz" wert={letzter?.umsatz ?? 0} format={eurKompakt} vorher={vorletzter?.umsatz} verlauf={reihe((p) => p.umsatz)} farbe={farbe} hinweis={letzter ? quartalLabel(letzter.quartal) : 'noch kein Quartal'} />
        <KpiTile label="EBIT" wert={letzter?.ebit ?? 0} format={eurKompakt} vorher={vorletzter?.ebit} verlauf={reihe((p) => p.ebit)} farbe={farbe} />
        <KpiTile label="Kasse" wert={state.finanzen.kasse} format={eurKompakt} vorher={vorletzter?.kasse} verlauf={reihe((p) => p.kasse)} farbe={farbe} />
        <KpiTile label="Marktanteil" wert={letzter?.marktanteil ?? 0} format={(x) => pct(x, 2)} vorher={vorletzter?.marktanteil} verlauf={reihe((p) => p.marktanteil)} farbe={farbe} hinweis="Deutschland, nach Umsatz" />
        <KpiTile label="Unternehmenswert" wert={letzter?.unternehmenswert ?? bericht?.kennzahlen.eigenkapitalwert ?? 0} format={eurKompakt} vorher={vorletzter?.unternehmenswert} verlauf={reihe((p) => p.unternehmenswert)} farbe={farbe} hinweis="Eigenkapitalwert" />
        <KpiTile label="Image" wert={state.unternehmen.image} format={(x) => fmt0(x)} vorher={vorletzter?.image} verlauf={reihe((p) => p.image)} farbe={farbe} hinweis="Skala 0–100" />
      </div>

      <Card titel="Umsatz und EBIT je Quartal">
        {daten.length >= 2 ? (
          <LinienDiagramm
            daten={daten}
            serien={[
              { key: 'umsatz', name: 'Umsatz', farbe },
              { key: 'ebit', name: 'EBIT', farbe: '#f59e0b' },
            ]}
          />
        ) : (
          <p className="muted text-sm">Das Diagramm erscheint, sobald zwei Quartale abgeschlossen sind.</p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titel="Nächster Meilenstein: Europa">
          <div className="space-y-3">
            <Fortschritt label="Umsatz der letzten 4 Quartale" wert={realUmsatz4Q} ziel={10_000_000} format={eurKompakt} />
            <Fortschritt label="Marktanteil Deutschland" wert={anteilDE} ziel={0.01} format={(x) => pct(x, 2)} />
          </div>
          <p className="muted mt-3 text-xs">Europa wird in einer späteren Ausbaustufe freigeschaltet (Eintritt 2 Mio. €).</p>
        </Card>

        <Card titel="Ausblick aktuelles Quartal" aktion={<button className="btn-ghost" onClick={() => gehe('entscheidungen')}>Entscheiden</button>}>
          {vorschau ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="muted">Umsatz (Schätzung)</dt>
              <dd className="tnum text-right font-semibold">{eur(vorschau.guv.umsatz)}</dd>
              <dt className="muted">EBIT (Schätzung)</dt>
              <dd className="tnum text-right font-semibold">{eur(vorschau.guv.ebit)}</dd>
              <dt className="muted">Kasse am Quartalsende</dt>
              <dd className="tnum text-right font-semibold">{eur(vorschau.bilanz.kasse)}</dd>
              <dt className="muted">Werksauslastung</dt>
              <dd className="tnum text-right font-semibold">{pct(vorschau.werke[0]?.auslastung ?? 0, 0)}</dd>
            </dl>
          ) : null}
          {vorschau && vorschau.warnungen.length > 0 && (
            <div className="mt-3 space-y-2">
              {vorschau.warnungen.slice(0, 3).map((w) => (
                <Warnung key={w}>{w}</Warnung>
              ))}
            </div>
          )}
        </Card>
      </div>

      {bericht && (
        <Card titel={`Produkte im ${quartalLabel(bericht.quartal)}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {bericht.produkte.map((p) => (
              <div key={p.produkt} className="rounded-xl border border-[var(--line)] p-3">
                <div className="font-semibold">{PRODUKTE[p.produkt].name}</div>
                <div className="muted tnum text-sm">
                  {fmt0(p.absatz)} verkauft · Umsatz {eurKompakt(p.umsatz)} · Technikindex {fmt0(p.technikIndex)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
