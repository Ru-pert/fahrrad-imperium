import { PRODUKTE, REGIONEN, quartalLabel, umsatz4Q, type RegionId } from '../../engine';
import { regionBedingungen } from '../../engine/expansion';
import { Weltkarte } from '../components/Weltkarte';
import { ereignisDef } from '../../engine/events';
import { BikeIcon } from '../components/BikeIcon';
import { CockpitBanner } from '../components/Banner';
import { Beraterin } from '../components/Beraterin';
import { RettungsBanner } from '../components/Tiefe';
import { ZielKarte } from '../components/Endabrechnung';
import { Leer } from '../components/Leer';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from '../format';
import { LinienDiagramm } from '../components/charts';
import { Card, Fortschritt, IconBadge, KpiTile, RegionMarke, Warnung } from '../components/ui';
import { EREIGNIS_FARBE, EREIGNIS_ICON } from '../ereignisIcons';
import { useLetzterBericht, usePreview } from '../hooks';

export function Cockpit() {
  const state = useGame((s) => s.state)!;
  const gehe = useGame((s) => s.gehe);
  const entwurf = useGame((s) => s.entwurf);
  const aendere = useGame((s) => s.aendereEntwurf);
  const bericht = useLetzterBericht();
  const vorschau = usePreview();
  const k = state.kpiHistorie;
  const letzter = k[k.length - 1];
  const vorletzter = k[k.length - 2];
  const reihe = (f: (p: (typeof k)[number]) => number) => k.map(f);
  const farbe = state.unternehmen.farbe;
  void umsatz4Q;

  const daten = k.map((p) => ({ label: quartalLabel(p.quartal), umsatz: p.umsatz, ebit: p.ebit }));

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Cockpit</h1>
      <CockpitBanner state={state} bericht={bericht} />
      {state.rettungsangebot && entwurf && <RettungsBanner state={state} d={entwurf} aendere={aendere} />}
      <Beraterin state={state} vorschau={vorschau} bericht={bericht} />
      <ZielKarte state={state} />

      <Weltbuehne />

      {(state.ereignisse ?? []).length > 0 && (
        <Card icon="ereignis" farbe="#f59e0b" titel={`Ereignisse für ${quartalLabel(state.quartal)}`} aktion={<button className="btn-ghost" onClick={() => gehe('zeitung')}>Zur Zeitung</button>}>
          <ul className="space-y-2">
            {state.ereignisse.map((e) => {
              const d = ereignisDef(e.id);
              if (!d) return null;
              return (
                <li key={e.id} className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
                  <IconBadge name={EREIGNIS_ICON[e.id] ?? 'ereignis'} farbe={EREIGNIS_FARBE[e.id] ?? '#f59e0b'} />
                  <div>
                    <div className="font-semibold">{d.name}{e.neu ? ' – neu' : ''}</div>
                    <div>{d.wirkung}{d.dauer > 1 ? ` · noch ${e.rest} Quartal${e.rest > 1 ? 'e' : ''}` : ''}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {state.spielende && <Warnung>{state.spielende.grund} Lade unter „Einstellungen“ einen früheren Spielstand.</Warnung>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiTile icon="umsatz" label="Umsatz" wert={letzter?.umsatz ?? 0} format={eurKompakt} vorher={vorletzter?.umsatz} verlauf={reihe((p) => p.umsatz)} farbe={farbe} hinweis={letzter ? quartalLabel(letzter.quartal) : 'noch kein Quartal'} />
        <KpiTile icon="ebit" label="EBIT" wert={letzter?.ebit ?? 0} format={eurKompakt} vorher={vorletzter?.ebit} verlauf={reihe((p) => p.ebit)} farbe={farbe} />
        <KpiTile icon="kasse" label="Kasse" wert={state.finanzen.kasse} format={eurKompakt} vorher={vorletzter?.kasse} verlauf={reihe((p) => p.kasse)} farbe={farbe} />
        <KpiTile icon="marktanteil" label="Marktanteil" wert={letzter?.marktanteil ?? 0} format={(x) => pct(x, 2)} vorher={vorletzter?.marktanteil} verlauf={reihe((p) => p.marktanteil)} farbe={farbe} hinweis="Deutschland, nach Umsatz" />
        <KpiTile icon="wert" label="Unternehmenswert" wert={letzter?.unternehmenswert ?? bericht?.kennzahlen.eigenkapitalwert ?? 0} format={eurKompakt} vorher={vorletzter?.unternehmenswert} verlauf={reihe((p) => p.unternehmenswert)} farbe={farbe} hinweis="Eigenkapitalwert" />
        <KpiTile icon="image" label="Image" wert={state.unternehmen.image} format={(x) => fmt0(x)} vorher={vorletzter?.image} verlauf={reihe((p) => p.image)} farbe={farbe} hinweis="Skala 0–100" />
      </div>


      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Card titel="Umsatz und EBIT je Quartal" icon="umsatz" farbe={farbe}>
        {daten.length >= 2 ? (
          <LinienDiagramm
            daten={daten}
            serien={[
              { key: 'umsatz', name: 'Umsatz', farbe },
              { key: 'ebit', name: 'EBIT', farbe: '#f59e0b' },
            ]}
          />
        ) : (
          <Leer titel="Gleich geht's los">Das Diagramm erscheint, sobald zwei Quartale abgeschlossen sind.</Leer>
        )}
      </Card>
        <Card titel="Ausblick aktuelles Quartal" icon="kalender" farbe="#7c3aed" aktion={<button className="btn-ghost" onClick={() => gehe('entscheidungen')}>Entscheiden</button>}>
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
                <div className="flex items-center gap-2 font-semibold"><BikeIcon produkt={p.produkt} className="h-8 w-12" />{PRODUKTE[p.produkt].name}</div>
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

/** Die Weltkarte als Bühne: Werke, Lieferrouten, Konkurrenz und der nächste Meilenstein */
function Weltbuehne() {
  const state = useGame((s) => s.state)!;
  const gehe = useGame((s) => s.gehe);
  const zeigeMarkt = useGame((s) => s.zeigeMarkt);
  const bericht = useLetzterBericht();
  const naechste = (['EU', 'NA', 'AS', 'RW'] as RegionId[]).find((r) => !state.regionen[r]?.freigeschaltet);
  const offen = (['EU', 'NA', 'AS', 'RW'] as RegionId[]).filter((r) => state.regionen[r]?.freigeschaltet && !state.regionen[r]?.aktiv);
  const aktive = (Object.keys(REGIONEN) as RegionId[]).filter((r) => state.regionen[r]?.aktiv);
  const proRegion = (r: RegionId) => {
    const a = bericht?.angebote.filter((x) => x.region === r) ?? [];
    return { absatz: a.reduce((s, x) => s + x.absatz, 0), umsatz: a.reduce((s, x) => s + x.umsatz, 0) };
  };
  const waehle = (r: RegionId) => (state.regionen[r]?.aktiv ? zeigeMarkt(r) : gehe('expansion'));
  return (
    <section className="card relative overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
        <h2 className="flex items-center gap-2 text-base font-semibold"><IconBadge name="expansion" farbe="#2563eb" groesse="sm" />Dein Imperium</h2>
        <div className="muted flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: state.unternehmen.farbe }} /> deine Märkte</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: state.unternehmen.farbe }} /> Lieferrouten</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5" style={{ background: '#d97706', clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} /> Konkurrenz</span>
          <button className="btn-ghost min-h-[32px] px-3 text-xs" onClick={() => gehe('expansion')}>Expansion</button>
        </div>
      </div>
      <div className="relative">
        <Weltkarte state={state} routen fahnen hoehe={400} onAuswahl={waehle} />
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
          {aktive.map((r) => {
            const d = proRegion(r);
            return (
              <button key={r} onClick={() => zeigeMarkt(r)} className="pointer-events-auto rounded-xl bg-white/90 px-3 py-1.5 text-left shadow-md ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-0.5 dark:bg-slate-900/85">
                <div className="flex items-center text-xs font-semibold"><RegionMarke r={r} />{REGIONEN[r].name}</div>
                {bericht && <div className="muted tnum text-[11px]">{fmt0(d.absatz)} Räder · {eurKompakt(d.umsatz)}</div>}
              </button>
            );
          })}
        </div>
        {(naechste || offen.length > 0) && (
          <div className="absolute bottom-3 right-3 w-72 rounded-xl bg-white/90 p-3 shadow-md ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/85">
            {offen.length > 0 ? (
              <div className="text-sm">
                <div className="font-semibold text-amber-700 dark:text-amber-400">Bereit zum Markteintritt</div>
                <div>{offen.map((r) => REGIONEN[r].name).join(', ')} – jetzt unter „Expansion“ betreten!</div>
              </div>
            ) : naechste ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Nächster Meilenstein: {REGIONEN[naechste].name}</div>
                {regionBedingungen(state, naechste).map((b) =>
                  b.einheit === 'ja' ? (
                    <div key={b.text} className="text-xs">{b.erfuellt ? '✓' : '○'} {b.text}</div>
                  ) : (
                    <Fortschritt key={b.text} label={b.text} wert={Math.max(0, b.ist)} ziel={b.ziel} format={b.einheit === 'eur' ? eurKompakt : b.einheit === 'prozent' ? (x) => pct(x, 2) : (x) => fmt0(x)} />
                  ),
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
