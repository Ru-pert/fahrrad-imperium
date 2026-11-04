import { useState } from 'react';
import { PRODUKTE, PRODUKT_IDS, REGIONEN, SPIELER_ID, aktiveProdukte, aktiveRegionen, quartalLabel, referenzPreis, type ProductId, type RegionId } from '../../engine';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from '../format';
import { Donut, LinienDiagramm } from '../components/charts';
import { Card, Tabelle, Tabs } from '../components/ui';
import { BikeIcon } from '../components/BikeIcon';
import { Lebenszyklus } from '../components/Forschungsbaum';
import { useLetzterBericht } from '../hooks';

export function Markt() {
  const state = useGame((s) => s.state)!;
  const historie = useGame((s) => s.historie);
  const bericht = useLetzterBericht();
  const produkte = aktiveProdukte(state);
  const [p, setP] = useState<ProductId>(produkte[0]);
  const regionen = aktiveRegionen(state);
  const [r, setR] = useState<RegionId>('DE');
  const farbe = state.unternehmen.farbe;
  const seg = bericht?.segmente.find((s) => s.produkt === p && s.region === r);
  const ang = bericht?.angebote.find((a) => a.produkt === p && a.region === r);
  const verlauf = historie.map((h) => {
    const s = h.report.segmente.find((x) => x.produkt === p && x.region === r);
    return { label: quartalLabel(h.report.quartal), volumen: s?.volumen ?? 0, preis: s?.durchschnittspreis ?? 0, eigen: h.report.angebote.find((a) => a.produkt === p && a.region === r)?.preis ?? 0 };
  });
  const anteil = ang?.marktanteil ?? 0;
  const rangliste = bericht
    ? [
        { name: state.unternehmen.name, umsatz: bericht.guv.umsatz, farbe, eigen: true },
        ...bericht.konkurrenz.map((k) => ({ name: k.name, umsatz: k.umsatz, farbe: k.farbe, eigen: false })),
      ].sort((a, b) => b.umsatz - a.umsatz)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Markt {REGIONEN[r].name}</h1>
        <p className="muted text-sm">Saisonal schwankender Markt; der Restmarkt vieler kleiner Anbieter ist grau dargestellt.</p>
      </div>
      {regionen.length > 1 && <Tabs<RegionId> wert={r} optionen={regionen.map((x) => ({ id: x, label: REGIONEN[x].name }))} onChange={setR} />}
      <Tabs wert={p} optionen={produkte.map((x) => ({ id: x, label: PRODUKTE[x].name }))} onChange={setP} />
      <Card titel="Wie entwickeln sich die Fahrradmärkte? (nächste 10 Jahre)" icon="markt">
        <div className="grid gap-4 md:grid-cols-3">
          {PRODUKT_IDS.map((x) => (
            <div key={x} className={`rounded-xl border p-3 ${produkte.includes(x) ? 'border-[var(--line)]' : 'border-dashed border-slate-300'}`}>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><BikeIcon produkt={x} className="h-6 w-9" />{PRODUKTE[x].name}{!produkte.includes(x) && <span className="muted text-xs font-normal">(noch nicht im Programm)</span>}</div>
              <Lebenszyklus produkt={x} ab={state.quartal} breite={260} hoehe={60} />
              <div className="muted text-xs">{PRODUKTE[x].lebenszyklus.text}</div>
            </div>
          ))}
        </div>
      </Card>

      {!bericht || !seg ? (
        <Card>
          <p className="muted text-sm">Marktdaten erscheinen nach dem ersten abgeschlossenen Quartal.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card icon="marktanteil" titel={`Marktanteil ${PRODUKTE[p].name}`}>
              <Donut
                mitte={pct(anteil, 2)}
                teile={[
                  { name: state.unternehmen.name, wert: anteil, farbe },
                  { name: 'Konkurrenz', wert: Math.max(0, 1 - anteil - (seg.anteile.rest ?? 0)), farbe: '#94a3b8' },
                  { name: 'Restmarkt', wert: seg.anteile.rest ?? 0, farbe: '#cbd5e1' },
                ]}
              />
              <p className="muted mt-1 text-xs">Anteile der einzelnen Konkurrenten bekommst du später über Marktforschung.</p>
            </Card>
            <Card icon="markt" titel="Marktkennzahlen">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="muted">Marktvolumen im Quartal</dt>
                <dd className="tnum text-right font-semibold">{fmt0(seg.volumen)} Stück</dd>
                <dt className="muted">Ø Marktpreis</dt>
                <dd className="tnum text-right font-semibold">{eur(seg.durchschnittspreis)}</dd>
                <dt className="muted">Referenzpreis</dt>
                <dd className="tnum text-right font-semibold">{eur(referenzPreis(r, p))}</dd>
                <dt className="muted">Dein Preis</dt>
                <dd className="tnum text-right font-semibold">{eur(ang?.preis ?? 0)}</dd>
                <dt className="muted">Technikindex (Testmagazin)</dt>
                <dd className={`tnum text-right font-semibold ${(ang?.technikIndex ?? 100) < 100 ? 'text-rose-600' : ''}`}>{fmt0(ang?.technikIndex ?? 0)}{(ang?.technikIndex ?? 100) < 100 ? ' – nicht marktfähig' : ''}</dd>
                <dt className="muted">Nachfrage / Absatz</dt>
                <dd className="tnum text-right font-semibold">{fmt0(ang?.nachfrage ?? 0)} / {fmt0(ang?.absatz ?? 0)}</dd>
                <dt className="muted">Markenbekanntheit</dt>
                <dd className="tnum text-right font-semibold">{pct(state.regionen[r]?.bekanntheit ?? 0, 1)}</dd>
              </dl>
            </Card>
          </div>

          <Card icon="markt" titel="Marktvolumen im Verlauf">
            <LinienDiagramm daten={verlauf} serien={[{ key: 'volumen', name: 'Stück je Quartal', farbe }]} format={(x) => fmt0(x)} />
          </Card>
          <Card icon="preis" titel="Preisentwicklung">
            <LinienDiagramm
              daten={verlauf}
              serien={[
                { key: 'preis', name: 'Ø Marktpreis', farbe: '#94a3b8' },
                { key: 'eigen', name: 'Dein Preis', farbe },
              ]}
              format={(x) => eur(x)}
            />
          </Card>

          <Card icon="stern" titel="Rangliste nach Quartalsumsatz">
            <Tabelle>
              <tbody>
                {rangliste.map((r, i) => (
                  <tr key={r.name} className={`border-t border-[var(--line)] ${r.eigen ? 'font-semibold' : ''}`}>
                    <td className="py-2 pr-2 w-8">{i + 1}.</td>
                    <td className="pr-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.farbe }} />{r.name}</td>
                    <td className="text-right">{eurKompakt(r.umsatz)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabelle>
          </Card>
        </>
      )}
      <span className="hidden">{SPIELER_ID}</span>
    </div>
  );
}
