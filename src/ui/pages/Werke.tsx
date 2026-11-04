import { LINIENTYPEN, PRODUKTE, quartalLabel } from '../../engine';
import { Leer } from '../components/Leer';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, fmt2, pct } from '../format';
import { LinienDiagramm } from '../components/charts';
import { Badge, Card, Tabelle } from '../components/ui';
import { useLetzterBericht, usePreview } from '../hooks';
import { Werksgelaende } from '../iso/Werksgelaende';
import { linienName } from '../components/Werk';

const FARBEN = ['#0d9488', '#6366f1', '#d97706', '#db2777'];

export function Werke() {
  const state = useGame((s) => s.state)!;
  const historie = useGame((s) => s.historie);
  const bericht = useLetzterBericht();
  const vorschau = usePreview();
  const verlauf = historie.map((h) => {
    const o: Record<string, number | string> = { label: quartalLabel(h.report.quartal) };
    for (const p of h.report.produkte) {
      o[p.produkt] = p.hkProStueck;
      o[`${p.produkt}-lk`] = p.lernkurve * 100;
    }
    return o;
  });
  const produkte = Object.keys(state.produkte) as (keyof typeof PRODUKTE)[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Werke</h1>
        <p className="muted text-sm">Linien, Personal, Produktivität und Stückkosten.</p>
      </div>
      {state.werke.filter((w) => w.status === 'bau').map((w) => (
        <Card icon="werk" farbe="#f59e0b" key={w.id} titel={`Werk ${w.name} – im Bau`}>
          <p className="text-sm">Fertig in {w.bauRest} Quartal(en). Danach Linien kaufen und Personal einstellen (Entscheidungen → Werk &amp; Linien).</p>
        </Card>
      ))}
      {state.werke.filter((w) => w.status !== 'bau').map((w) => {
        const wr = bericht?.werke.find((x) => x.id === w.id);
        const vw = vorschau?.werke.find((x) => x.id === w.id);
        const aus = vw?.auslastung ?? wr?.auslastung ?? 0;
        return (
          <Card icon="werke" key={w.id} titel={`Werk ${w.name}`} aktion={<Badge>{w.region}</Badge>}>
            <div className="mb-4">
              <Werksgelaende state={state} werk={w} vorher={historie[historie.length - 1]?.stateVor} produktion={bericht?.produkte.reduce((s, p) => s + p.produziert, 0) ?? 0} ueberstunden={(bericht?.werke.find((x) => x.id === w.id)?.ueberstunden ?? 0) > 0} />
            </div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Auslastung (Vorschau für dieses Quartal)</span>
              <strong className="tnum">{pct(aus, 0)}</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className={`h-full rounded-full ${aus > 1 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, aus * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs muted">Optimum für die Motivation liegt bei etwa 80 % Auslastung.</div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ['Mitarbeitende', fmt0(w.mitarbeitende)],
                ['Motivation', fmt2(w.motivation)],
                ['Kompetenz', fmt2(w.kompetenz)],
                ['Produktivität I', wr ? fmt2(wr.produktivitaetI) : '–'],
                ['Einarbeitung', wr ? fmt2(wr.einarbeitung) : '–'],
                ['Wartungsvertrag', w.wartung === 'voll' ? 'Voll' : w.wartung === 'basis' ? 'Basis' : 'Keiner'],
                ['Gebäude-Buchwert', eurKompakt(w.gebaeudeBuchwert)],
                ['Leerkosten', wr ? eurKompakt(wr.leerkosten) : '–'],
              ].map(([l, v]) => (
                <div key={l}>
                  <dt className="muted text-xs">{l}</dt>
                  <dd className="tnum font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mb-1 mt-4 text-sm font-semibold">Fertigungslinien</h3>
            <Tabelle>
              <thead>
                <tr className="muted text-xs">
                  <th className="py-1 text-left">Linie</th><th className="px-2 text-left">Typ</th><th className="px-2 text-right">Alter</th>
                  <th className="px-2 text-right">Verfügb.</th><th className="px-2 text-right">Umwelt</th><th className="pl-2 text-right">Buchwert</th>
                </tr>
              </thead>
              <tbody>
                {w.linien.map((l) => (
                  <tr key={l.id} className="border-t border-[var(--line)]">
                    <td className="py-1.5">{linienName(l)}{l.status === 'bau' && <Badge farbe="amber">im Bau</Badge>}</td>
                    <td className="px-2">{l.typ} · {LINIENTYPEN[l.typ].name}</td>
                    <td className="px-2 text-right">{LINIENTYPEN[l.typ].lebensdauer - l.restlaufzeit} Q</td>
                    <td className="px-2 text-right">{pct(l.verfuegbarkeit, 0)}</td>
                    <td className="px-2 text-right">{fmt0(l.umweltindex)}</td>
                    <td className="pl-2 text-right">{eur(l.buchwert)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabelle>
          </Card>
        );
      })}

      <Card icon="produktion" titel="Stückkosten und Erfahrungskurve">
        {verlauf.length >= 2 ? (
          <>
            <LinienDiagramm daten={verlauf} serien={produkte.map((p, i) => ({ key: p, name: PRODUKTE[p].name, farbe: FARBEN[i % FARBEN.length] }))} format={(x) => eur(x)} />
            <p className="muted mt-2 text-xs">Jede Verdopplung der kumulierten Menge spart rund 10 % der Herstellkosten (Untergrenze 60 %).</p>
          </>
        ) : (
          <Leer titel="Noch kein Verlauf">Der Verlauf erscheint nach zwei abgeschlossenen Quartalen.</Leer>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {produkte.map((p) => (
            <div key={p} className="rounded-xl border border-[var(--line)] p-3 text-sm">
              <strong>{PRODUKTE[p].name}</strong>
              <div className="muted tnum">Kumulierte Menge {fmt0(state.produkte[p]!.kumMenge)} · letzte Herstellkosten {eur(state.produkte[p]!.letzteHk)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
