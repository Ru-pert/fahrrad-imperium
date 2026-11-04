import { motion } from 'framer-motion';
import { Fragment } from 'react';
import { PRODUKTE, REGIONEN, quartalLabel, type AngebotBericht, type ProductId } from '../../engine';
import { Leer } from '../components/Leer';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, gruppiereWarnungen, pct } from '../format';
import { Aufklapper, Card, Icon, Info, KpiTile, RegionMarke, Warnung } from '../components/ui';
import { BikeIcon, PRODUKT_FARBE } from '../components/BikeIcon';
import { Zufriedenheit } from '../components/Tiefe';
import { useLetzterBericht } from '../hooks';
import { KrisenAusgang } from '../components/Krise';

/** Balken: Wie viel der Nachfrage konnte geliefert werden? */
function Lieferquote({ absatz, nachfrage, farbe }: { absatz: number; nachfrage: number; farbe: string }) {
  const q = nachfrage > 0 ? Math.min(1, absatz / nachfrage) : 1;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <motion.div className="h-full rounded-full" style={{ background: q < 0.8 ? '#f43f5e' : farbe }} initial={{ width: 0 }} animate={{ width: `${q * 100}%` }} transition={{ duration: 0.6 }} />
      </div>
      <span className={`tnum w-10 text-right text-xs ${q < 0.8 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'muted'}`}>{pct(q, 0)}</span>
    </div>
  );
}

export function Bericht() {
  const bericht = useLetzterBericht();
  const state = useGame((s) => s.state)!;
  const historie = useGame((s) => s.historie);
  const gehe = useGame((s) => s.gehe);
  const zeige = useGame((s) => s.zeigeAuswertung);
  if (!bericht) {
    return (
      <div className="space-y-4">
        <h1 className="h-page">Quartalsbericht</h1>
        <Card>
          <Leer titel="Noch kein Bericht" aktion={<button className="btn-primary" onClick={() => gehe('entscheidungen')}>Zu den Entscheidungen</button>}>
            Treffe deine ersten Entscheidungen und schließe das Quartal ab – danach erscheint hier der Bericht.
          </Leer>
        </Card>
      </div>
    );
  }
  const g = bericht.guv;
  const vorher = historie.length > 1 ? historie[historie.length - 2].report : undefined;
  const verlauf = (f: (r: NonNullable<typeof bericht>) => number) => historie.slice(-12).map((h) => f(h.report));

  // Absatz nach Produkt gruppiert
  const produkte = [...new Set(bericht.angebote.map((a) => a.produkt))] as ProductId[];
  const nachProdukt = produkte.map((p) => {
    const zeilen = bericht.angebote.filter((a) => a.produkt === p);
    const summe = (f: (a: AngebotBericht) => number) => zeilen.reduce((s, a) => s + f(a), 0);
    return { p, zeilen, nachfrage: summe((a) => a.nachfrage), absatz: summe((a) => a.absatz), umsatz: summe((a) => a.umsatz) };
  });
  const mehrereRegionen = new Set(bericht.angebote.map((a) => a.region)).size > 1;

  const firmen = [
    { id: 'du', name: state.unternehmen.name, umsatz: g.umsatz, ebit: g.ebit, bilanz: bericht.bilanz.aktiva, farbe: state.unternehmen.farbe, eigen: true, pleite: false },
    ...bericht.konkurrenz.map((k) => ({ id: k.id, name: k.name, umsatz: k.umsatz, ebit: k.ebit, bilanz: k.bilanzsumme, farbe: k.farbe, eigen: false, pleite: k.status === 'pleite', uebernommen: !!state.konkurrenten[k.id]?.uebernommen })),
  ].sort((a, b) => b.umsatz - a.umsatz);
  const maxUmsatz = Math.max(...firmen.map((f) => f.umsatz), 1);
  const { sonstige, engpaesse } = gruppiereWarnungen(bericht.warnungen);
  // Krise und Personalien stehen in eigenen Karten
  const extra = new Set((bericht.fuehrung ?? []).map((x) => x.text));
  const meldungen = bericht.meldungen.filter((m) => !extra.has(m) && !m.startsWith('Krise „'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-page">Quartalsbericht {quartalLabel(bericht.quartal)}</h1>
          <p className="muted text-sm">Ergebnisse des abgeschlossenen Quartals und Branchenzahlen.</p>
        </div>
        <button className="btn-primary" onClick={() => zeige(bericht)}><Icon name="stern" className="h-4 w-4" /> Grafische Auswertung öffnen</button>
      </div>

      {(bericht.krise || (bericht.fuehrung?.length ?? 0) > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {bericht.krise && (
            <Card titel="Krise" icon="krise" farbe="#e11d48">
              <KrisenAusgang krise={bericht.krise} />
            </Card>
          )}
          {(bericht.fuehrung?.length ?? 0) > 0 && (
            <Card titel="Personalien im Führungsteam" icon="team" farbe="#7c3aed" aktion={<button className="btn-ghost" onClick={() => gehe('team')}>Zum Team</button>}>
              <ul className="space-y-1.5 text-sm">
                {bericht.fuehrung!.map((x, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name={x.art === 'abgeworben' || x.art === 'abwerbeversuch' ? 'herzbruch' : x.art === 'befoerdert' ? 'krone' : x.art === 'burnout' ? 'kaffee' : 'personal'} className={`mt-0.5 h-4 w-4 shrink-0 ${x.art === 'abgeworben' || x.art === 'abwerbeversuch' ? 'text-rose-600' : 'text-violet-600'}`} />
                    {x.text}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {meldungen.length > 0 && (
        <div className="card divide-y divide-[var(--line)] px-4">
          {meldungen.map((m) => (
            <div key={m} className="flex items-start gap-2 py-2 text-sm">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              {m}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon="umsatz" label="Umsatz" wert={g.umsatz} vorher={vorher?.guv.umsatz} verlauf={verlauf((r) => r.guv.umsatz)} format={eurKompakt} farbe="#0d9488" />
        <KpiTile icon="ebit" label="EBIT" wert={g.ebit} vorher={vorher?.guv.ebit} verlauf={verlauf((r) => r.guv.ebit)} format={eurKompakt} farbe="#6366f1" hinweis={`Überschuss ${eurKompakt(g.ueberschuss)}`} />
        <KpiTile icon="rad" label="Absatz" wert={bericht.kennzahlen.absatz} vorher={vorher?.kennzahlen.absatz} verlauf={verlauf((r) => r.kennzahlen.absatz)} format={(x) => `${fmt0(x)} Räder`} farbe="#d97706" />
        <KpiTile icon="kasse" label="Kasse" wert={bericht.bilanz.kasse} vorher={vorher?.bilanz.kasse} verlauf={verlauf((r) => r.bilanz.kasse)} format={eurKompakt} farbe="#16a34a" hinweis={`Rating ${bericht.kennzahlen.rating} · Kreditlimit ${eurKompakt(bericht.kennzahlen.kreditlimit)}`} />
      </div>

      <Card icon="rad" titel={<span className="flex items-center gap-1">Absatz je Produkt{mehrereRegionen ? ' und Markt' : ''} <Info titel="Lieferquote">Der Balken zeigt, welchen Teil der Nachfrage du bedienen konntest. Unbediente Nachfrage wandert zur Konkurrenz ab – unter 80 % wird er rot: Mehr Produktion oder Kapazität würde sich lohnen. Fehlmengen und Preiserhöhungen drücken außerdem die Kundenzufriedenheit.</Info></span>}>
        <div className="-mx-4 overflow-x-auto px-4">
        <table className="tnum w-full min-w-[640px] text-sm">
          <thead>
            <tr className="muted text-left text-xs">
              <th className="py-1 pr-2 font-medium">Produkt / Markt</th>
              <th className="px-2 text-right font-medium">Preis</th>
              <th className="px-2 text-right font-medium">Nachfrage</th>
              <th className="px-2 text-right font-medium">Absatz</th>
              <th className="px-2 font-medium">Lieferquote</th>
              <th className="px-2 text-right font-medium">Anteil</th>
              <th className="px-2 text-center font-medium">Zufriedenheit</th>
              <th className="pl-2 text-right font-medium">Umsatz</th>
            </tr>
          </thead>
          <tbody>
            {nachProdukt.map(({ p, zeilen, nachfrage, absatz, umsatz }) => (
              <Fragment key={p}>
                <tr className="border-t-2 border-[var(--line)]" style={{ background: `${PRODUKT_FARBE[p]}0d` }}>
                  <td className="py-2 pr-2 font-semibold"><span className="flex items-center gap-2"><BikeIcon produkt={p} className="h-6 w-9" />{PRODUKTE[p].name}</span></td>
                  <td className="px-2" />
                  <td className="px-2 text-right font-semibold">{fmt0(nachfrage)}</td>
                  <td className="px-2 text-right font-semibold">{fmt0(absatz)}</td>
                  <td className="px-2"><Lieferquote absatz={absatz} nachfrage={nachfrage} farbe={PRODUKT_FARBE[p]} /></td>
                  <td className="px-2" />
                  <td className="px-2 text-center">{zeilen.length === 1 && zeilen[0].zufriedenheit !== undefined ? <Zufriedenheit wert={zeilen[0].zufriedenheit} klein /> : null}</td>
                  <td className="pl-2 text-right font-semibold">{eurKompakt(umsatz)}</td>
                </tr>
                {(mehrereRegionen ? zeilen : []).map((a) => (
                  <tr key={a.region} className="border-t border-[var(--line)] text-[13px]">
                    <td className="py-1.5 pl-11 pr-2"><RegionMarke r={a.region} />{REGIONEN[a.region].name}</td>
                    <td className="px-2 text-right">{eur(a.preis)}</td>
                    <td className="muted px-2 text-right">{fmt0(a.nachfrage)}</td>
                    <td className="px-2 text-right">{fmt0(a.absatz)}</td>
                    <td className="px-2"><Lieferquote absatz={a.absatz} nachfrage={a.nachfrage} farbe={PRODUKT_FARBE[p]} /></td>
                    <td className="muted px-2 text-right">{pct(a.marktanteil, 2)}</td>
                    <td className="px-2 text-center">{a.zufriedenheit !== undefined && <Zufriedenheit wert={a.zufriedenheit} klein />}</td>
                    <td className="pl-2 text-right">{eurKompakt(a.umsatz)}</td>
                  </tr>
                ))}
                {!mehrereRegionen && zeilen[0] && (
                  <tr className="text-[13px]">
                    <td className="muted pb-2 pl-11 text-xs" colSpan={8}>Preis {eur(zeilen[0].preis)} · Marktanteil {pct(zeilen[0].marktanteil, 2)}</td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {((bericht.sonderabsatz?.length ?? 0) > 0 || (bericht.einkauf?.some((e) => e.bestellt > 0) ?? false) || (bericht.spionage?.length ?? 0) > 0) && (
        <Card icon="nachfrage" farbe="#6366f1" titel="Aufträge, Einkauf und Geheimdienst">
          <ul className="space-y-1.5 text-sm">
            {(bericht.sonderabsatz ?? []).map((x) => (
              <li key={x.id} className="flex items-start gap-2">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${x.art === 'ausschreibung' && !x.gewonnen ? 'bg-rose-500' : 'bg-emerald-500'}`}>{x.art === 'ausschreibung' && !x.gewonnen ? '✕' : '✓'}</span>
                {x.text}
              </li>
            ))}
            {(bericht.einkauf ?? []).filter((e) => e.bestellt > 0).map((e) => (
              <li key={e.produkt} className="flex items-start gap-2">
                <Icon name="lager" className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                Einkauf {PRODUKTE[e.produkt].name}: {fmt0(e.bestellt)} Sets mit {pct(e.rabatt, 0)} Rabatt bestellt – {e.ersparnis >= 0 ? 'gespart' : 'Mehrkosten'} {eurKompakt(Math.abs(e.ersparnis))}, Materiallager jetzt {fmt0(e.lagerEnde)} Sets.
              </li>
            ))}
            {(bericht.spionage ?? []).map((x) => (
              <li key={x.konkurrent} className="flex items-start gap-2">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${x.erwischt ? 'bg-rose-500' : 'bg-slate-700'}`}>{x.erwischt ? '!' : '✓'}</span>
                {x.erwischt ? `Spionage bei ${state.konkurrenten[x.konkurrent]?.name} aufgeflogen – Strafe ${eurKompakt(x.strafe)}, Image −15.` : `Spionage bei ${state.konkurrenten[x.konkurrent]?.name} blieb unentdeckt.`}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card icon="bericht" titel={<span className="flex items-center gap-1">Branchenbericht <Info titel="Branchenbericht">Umsatz und EBIT aller Hersteller im letzten Quartal. Preise, Budgets und Marktanteile der Konkurrenz gibt es nur über Marktforschung (spätere Ausbaustufe).</Info></span>}>
        <div className="space-y-1.5">
          <div className="muted grid grid-cols-[minmax(0,1fr)_96px] gap-3 text-xs sm:grid-cols-[200px_1fr_110px_110px]">
            <span>Unternehmen</span><span className="text-right sm:text-left">Umsatz im Quartal</span><span className="hidden text-right sm:block">EBIT</span><span className="hidden text-right sm:block">Bilanzsumme</span>
          </div>
          {firmen.map((f, i) => (
            <div key={f.id} className={`grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 rounded-lg sm:grid-cols-[200px_1fr_110px_110px] px-1 py-1 text-sm ${f.eigen ? 'bg-brand-50 font-semibold dark:bg-brand-900/30' : ''}`}>
              <span className="flex items-center gap-2 truncate"><span className="muted tnum w-4 text-xs">{i + 1}.</span><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.farbe }} />{f.name}{'uebernommen' in f && f.uebernommen ? ' (übernommen)' : f.pleite ? ' (insolvent)' : ''}</span>
              <div className="flex items-center gap-2">
                <div className="hidden h-3 flex-1 overflow-hidden rounded-full bg-black/5 sm:block dark:bg-white/10">
                  <motion.div className="h-full rounded-full" style={{ background: f.farbe }} initial={{ width: 0 }} animate={{ width: `${Math.max(1, (f.umsatz / maxUmsatz) * 100)}%` }} transition={{ duration: 0.7, delay: i * 0.04 }} />
                </div>
                <span className="tnum w-24 text-right">{eurKompakt(f.umsatz)}</span>
              </div>
              <span className={`tnum hidden text-right sm:block ${f.ebit < 0 ? 'text-rose-600' : ''}`}>{eurKompakt(f.ebit)}</span>
              <span className="tnum muted hidden text-right sm:block">{eurKompakt(f.bilanz)}</span>
            </div>
          ))}
        </div>
      </Card>

      {bericht.warnungen.length > 0 && (
        <Aufklapper
          merken="bericht-hinweise"
          icon={<Icon name="warn" className="h-4 w-4 text-amber-600" />}
          titel={`Hinweise der Engine (${bericht.warnungen.length})`}
          zusammenfassung={engpaesse.length ? `${engpaesse.length} Märkte mit Lieferengpass` : undefined}
          className="card"
        >
          <div className="space-y-2">
            {sonstige.map((w) => <Warnung key={w}>{w}</Warnung>)}
            {engpaesse.length > 0 && (
              <Warnung>
                <strong>Lieferengpass in {engpaesse.length} Märkten:</strong>
                <ul className="mt-1 grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">
                  {engpaesse.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </Warnung>
            )}
          </div>
        </Aufklapper>
      )}
    </div>
  );
}
