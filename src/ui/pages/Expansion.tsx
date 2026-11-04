import { motion } from 'framer-motion';
import { useState } from 'react';
import { PRODUKTE, REGIONEN, quartalLabel, type GameState, type ProductId, type RegionId } from '../../engine';
import { WERK_STANDORTE } from '../../engine/config/markets';
import { EXPANSION, regionBedingungen, werkBaubar, type Bedingung } from '../../engine/expansion';
import { alleProjekte } from '../../engine/forschung';
import { useGame } from '../../store/gameStore';
import { eurKompakt, fmt0, fmt2, pct } from '../format';
import { BikeIcon } from '../components/BikeIcon';
import { Badge, Card, Fortschritt, Icon } from '../components/ui';
import { Weltkarte, regionStatus } from '../components/Weltkarte';
import { useLetzterBericht } from '../hooks';

const AUSLAND: RegionId[] = ['EU', 'NA', 'AS', 'RW'];
const NEUE_PRODUKTE: ProductId[] = ['mountainbike', 'lastenrad', 'rennrad', 'emtb'];

function formatBed(b: Bedingung, x: number): string {
  switch (b.einheit) {
    case 'eur': return eurKompakt(x);
    case 'prozent': return pct(x, 2);
    case 'punkte': return fmt2(x);
    case 'ja': return x >= 1 ? 'ja' : 'nein';
    default: return fmt0(x);
  }
}

function Bedingungen({ liste }: { liste: Bedingung[] }) {
  return (
    <div className="space-y-2">
      {liste.map((b) => (
        <div key={b.text}>
          {b.einheit === 'ja' ? (
            <div className="flex items-center gap-2 text-sm">
              <span className={`grid h-5 w-5 place-items-center rounded-full ${b.erfuellt ? 'bg-emerald-500 text-white' : 'bg-black/10'}`}>{b.erfuellt && <Icon name="check" className="h-3 w-3" />}</span>
              {b.text}
            </div>
          ) : (
            <Fortschritt label={`${b.erfuellt ? '✓ ' : ''}${b.text}`} wert={Math.max(0, b.ist)} ziel={b.ziel} format={(x) => formatBed(b, x)} />
          )}
        </div>
      ))}
    </div>
  );
}

/** Jahresumsatz (letzte 4 Quartale) je Unternehmen */
function weltrangliste(state: GameState, historie: { report: { konkurrenz: { id: string; name: string; farbe: string; umsatz: number; status: string }[] } }[]) {
  const n = Math.min(4, historie.length);
  const letzte = historie.slice(-4);
  const zeilen = [
    { id: 'du', name: state.unternehmen.name, farbe: state.unternehmen.farbe, umsatz: state.kpiHistorie.slice(-4).reduce((s, k) => s + k.umsatz, 0) * (n ? 4 / n : 0), eigen: true, pleite: false },
    ...Object.values(state.konkurrenten).map((k) => {
      const summe = letzte.reduce((s, h) => s + (h.report.konkurrenz.find((x) => x.id === k.id)?.umsatz ?? 0), 0);
      return { id: k.id, name: k.name, farbe: k.farbe, umsatz: n ? (summe * 4) / n : k.letzterUmsatz * 4, eigen: false, pleite: k.status === 'pleite' };
    }),
  ];
  return zeilen.sort((a, b) => b.umsatz - a.umsatz);
}

export function Expansion() {
  const state = useGame((s) => s.state)!;
  const entwurf = useGame((s) => s.entwurf)!;
  const aendere = useGame((s) => s.aendereEntwurf);
  const historie = useGame((s) => s.historie);
  const bericht = useLetzterBericht();
  const [auswahl, setAuswahl] = useState<RegionId | null>(null);
  const gehe = useGame((s) => s.gehe);
  const projekte = alleProjekte(state);
  const ex = entwurf.expansion ?? { maerkteBetreten: [], produkteEinfuehren: [], werkeBauen: [] };
  const leuchten = (bericht?.freischaltungen ?? []).filter((f) => f.art === 'region').map((f) => f.id as RegionId);

  const umschalten = (feld: 'maerkteBetreten' | 'produkteEinfuehren' | 'werkeBauen', wert: string) =>
    aendere((d) => {
      const e = (d.expansion ??= { maerkteBetreten: [], produkteEinfuehren: [], werkeBauen: [] });
      const liste = e[feld] as string[];
      (e[feld] as string[]) = liste.includes(wert) ? liste.filter((x) => x !== wert) : [...liste, wert];
    });

  const kosten =
    ex.maerkteBetreten.reduce((s, r) => s + REGIONEN[r].eintritt, 0) +
    ex.produkteEinfuehren.length * EXPANSION.produktEinfuehrung +
    ex.werkeBauen.reduce((s, c) => s + WERK_STANDORTE[c].baukosten, 0);
  const rangliste = weltrangliste(state, historie);
  const platz = rangliste.findIndex((r) => r.eigen) + 1;
  const reg = auswahl ? REGIONEN[auswahl] : null;
  const segs = auswahl ? bericht?.segmente.filter((s) => s.region === auswahl) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="h-page">Expansion</h1>
          <p className="muted text-sm">Neue Märkte, neue Produkte, neue Werke – Schritt für Schritt zum Weltmarktführer. Alles hier wird beim Abschluss von {quartalLabel(state.quartal)} ausgeführt.</p>
        </div>
        {kosten > 0 && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`rounded-xl border px-4 py-2 text-sm ${kosten > state.finanzen.kasse ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'}`}>
            Vorgemerkt: <strong>{eurKompakt(kosten)}</strong>{kosten > state.finanzen.kasse ? ' – mehr als in der Kasse!' : ''}
          </motion.div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card titel="Weltkarte" icon="markt" aktion={<span className="muted text-xs">Region anklicken für Details</span>}>
          <Weltkarte state={state} auswahl={auswahl} onAuswahl={setAuswahl} leuchten={leuchten} />
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: state.unternehmen.farbe }} /> aktiv</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: `${state.unternehmen.farbe}66` }} /> freigeschaltet – Eintritt möglich</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-300" /> gesperrt</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-slate-500" /> Hauptsitz Konkurrenz</span>
          </div>
        </Card>
        <Card titel={reg ? reg.name : 'Region wählen'} icon="ziel">
          {!auswahl || !reg ? (
            <p className="muted text-sm">Klicke auf eine Region der Karte, um Marktgröße, Konkurrenz und Bedingungen zu sehen.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <Badge farbe={regionStatus(state, auswahl) === 'aktiv' ? 'green' : regionStatus(state, auswahl) === 'freigeschaltet' ? 'amber' : 'slate'}>
                {regionStatus(state, auswahl) === 'aktiv' ? 'aktiv' : regionStatus(state, auswahl) === 'freigeschaltet' ? 'freigeschaltet' : 'gesperrt'}
              </Badge>
              <dl className="tnum grid grid-cols-2 gap-1">
                <dt className="muted">Marktvolumen/Q</dt><dd className="text-right">{fmt0(segs.reduce((s, x) => s + x.volumen, 0) || reg.startvolumen)} Räder</dd>
                <dt className="muted">Kaufkraft</dt><dd className="text-right">{fmt2(reg.kaufkraft)}</dd>
                <dt className="muted">Zoll bei Import</dt><dd className="text-right">{pct(reg.zoll, 0)}</dd>
                <dt className="muted">Markteintritt</dt><dd className="text-right">{reg.eintritt ? eurKompakt(reg.eintritt) : '–'}</dd>
                {state.regionen[auswahl]?.aktiv && (<><dt className="muted">Deine Bekanntheit</dt><dd className="text-right">{pct(state.regionen[auswahl]!.bekanntheit, 1)}</dd></>)}
              </dl>
              {segs.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Wer verkauft hier? (Absatzanteile)</div>
                  {Object.values(state.konkurrenten)
                    .map((k) => ({ k, anteil: segs.reduce((s, x) => s + (x.absatz[k.id] ?? 0), 0) / Math.max(1, segs.reduce((s, x) => s + Object.values(x.absatz).reduce((a, b) => a + b, 0), 0)) }))
                    .filter((x) => x.anteil > 0)
                    .sort((a, b) => b.anteil - a.anteil)
                    .map(({ k, anteil }) => (
                      <div key={k.id} className="flex justify-between"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: k.farbe }} />{k.name}</span><span className="tnum">{pct(anteil, 2)}</span></div>
                    ))}
                </div>
              )}
              {auswahl !== 'DE' && !state.regionen[auswahl]?.freigeschaltet && <Bedingungen liste={regionBedingungen(state, auswahl)} />}
            </div>
          )}
        </Card>
      </div>

      <Card titel="Märkte" icon="markt">
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          {AUSLAND.map((r) => {
            const st = regionStatus(state, r);
            const vorgemerkt = ex.maerkteBetreten.includes(r);
            const startetBald = state.regionen[r]?.aktivSeit !== undefined && !state.regionen[r]?.aktiv;
            return (
              <motion.div key={r} layout className={`rounded-xl border-2 p-3 ${st === 'aktiv' ? 'border-emerald-400' : st === 'freigeschaltet' ? 'border-amber-400' : 'border-[var(--line)]'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold">{REGIONEN[r].name}</div>
                  <Badge farbe={st === 'aktiv' ? 'green' : st === 'freigeschaltet' ? 'amber' : 'slate'}>{st === 'aktiv' ? 'aktiv' : st === 'freigeschaltet' ? 'freigeschaltet' : 'gesperrt'}</Badge>
                </div>
                <div className="muted tnum mb-2 text-xs">{fmt0(REGIONEN[r].startvolumen)} Räder/Q · Kaufkraft {fmt2(REGIONEN[r].kaufkraft)} · Zoll {pct(REGIONEN[r].zoll, 0)}</div>
                {st === 'gesperrt' && <Bedingungen liste={regionBedingungen(state, r)} />}
                {st === 'freigeschaltet' && (
                  startetBald ? (
                    <p className="text-sm font-semibold text-emerald-700">Eintritt läuft – Verkauf ab nächstem Quartal.</p>
                  ) : (
                    <button className={`btn mt-1 w-full ${vorgemerkt ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => umschalten('maerkteBetreten', r)}>
                      {vorgemerkt ? '✓ Markteintritt vorgemerkt' : `Markt betreten (${eurKompakt(REGIONEN[r].eintritt)})`}
                    </button>
                  )
                )}
                {st === 'aktiv' && <p className="text-sm">Bekanntheit {pct(state.regionen[r]!.bekanntheit, 1)} · Anteil {pct(state.regionen[r]!.marktanteil, 2)}<br /><span className="muted text-xs">Preise und Marketing stellst du in den Entscheidungen ein.</span></p>}
              </motion.div>
            );
          })}
        </div>
      </Card>

      <Card titel="Neue Produkte (über Forschung)" icon="rad">
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          {NEUE_PRODUKTE.map((p) => {
            const pz = state.produkte[p];
            const verfuegbar = !!projekte.find((x) => x.projekt.produkt === p && x.offen);
            const cfg = PRODUKTE[p];
            return (
              <div key={p} className={`rounded-xl border-2 p-3 ${pz ? 'border-emerald-400' : verfuegbar ? 'border-amber-400' : 'border-[var(--line)]'}`}>
                <div className="flex items-center gap-2">
                  <BikeIcon produkt={p} className="h-9 w-14" farbe={pz || verfuegbar ? undefined : '#94a3b8'} />
                  <div>
                    <div className="font-bold">{cfg.name}</div>
                    <div className="muted tnum text-xs">Referenzpreis {eurKompakt(cfg.referenzpreis)} · Markt +{pct(cfg.wachstum, 1)}/Q</div>
                  </div>
                </div>
                <div className="muted mt-1 text-xs">Preiselastizität {fmt2(cfg.epsilon)} · Technik-Sensitivität {fmt2(cfg.tau)} · {cfg.montageStunden} Std./Stück</div>
                <div className="mt-2">
                  {pz ? (
                    <p className="text-sm font-semibold text-emerald-700">{pz.status === 'vorlauf' ? 'Gerade fertig erforscht – ab nächstem Quartal produzierbar' : 'Im Programm'}</p>
                  ) : (
                    (() => {
                      const st = projekte.find((x) => x.projekt.produkt === p);
                      if (!st) return null;
                      return (
                        <div className="space-y-1">
                          <Fortschritt label={`Forschung „${st.projekt.name}“`} wert={st.investiert} ziel={st.projekt.kosten} format={eurKompakt} />
                          <p className="muted text-xs">{st.offen ? `Mindestens ${st.projekt.mindestQuartale} Quartale Entwicklung.` : `🔒 Voraussetzung: ${st.projekt.voraussetzungen.join(', ')}`}</p>
                          <button className="btn-ghost w-full" onClick={() => gehe('entscheidungen')}>Zum Forschungslabor</button>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card titel="Neue Werke" icon="werke">
        <div className="grid gap-3 lg:grid-cols-3">
          {Object.entries(WERK_STANDORTE).map(([code, st]) => {
            const vorhanden = state.werke.filter((w) => (w.standort ?? 'DE') === code && !(code === 'DE' && w.id === 'DE-1'));
            const baubar = werkBaubar(state, code);
            const vorgemerkt = ex.werkeBauen.includes(code);
            return (
              <div key={code} className={`rounded-xl border-2 p-3 ${vorhanden.length ? 'border-emerald-400' : 'border-[var(--line)]'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold">{st.name}</div>
                  <Badge>{REGIONEN[st.region].name}</Badge>
                </div>
                <div className="muted text-xs">{st.ort} · {st.besonderheit}</div>
                <dl className="tnum mt-2 grid grid-cols-2 gap-x-2 text-xs">
                  <dt className="muted">Baukosten</dt><dd className="text-right">{eurKompakt(st.baukosten)}</dd>
                  <dt className="muted">Bauzeit</dt><dd className="text-right">{st.bauzeit} Quartale</dd>
                  <dt className="muted">Lohnniveau</dt><dd className="text-right">{pct(st.lohnIndex, 0)} von DE</dd>
                  <dt className="muted">Hallenplätze</dt><dd className="text-right">4 Linien</dd>
                </dl>
                {vorhanden.map((w) => (
                  <p key={w.id} className="mt-2 text-sm font-semibold text-emerald-700">{w.status === 'bau' ? `Im Bau – noch ${w.bauRest} Quartal(e)` : `Werk ${w.name} in Betrieb (${w.linien.length} Linien)`}</p>
                ))}
                {(code === 'DE' || !vorhanden.length) && (
                  baubar.ok ? (
                    <button className={`btn mt-2 w-full ${vorgemerkt ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => umschalten('werkeBauen', code)}>
                      {vorgemerkt ? '✓ Bau vorgemerkt' : 'Werk bauen'}
                    </button>
                  ) : (
                    <p className="muted mt-2 text-xs">{baubar.grund}</p>
                  )
                )}
              </div>
            );
          })}
        </div>
        <p className="muted mt-2 text-xs">Neue Werke starten leer: Nach Fertigstellung kaufst du Linien (Bauzeit 1 Quartal) und stellst Personal ein (mindestens 20 Personen je Quartal möglich). Ein Werk außerhalb Deutschlands ist Voraussetzung für Asien.</p>
      </Card>

      <Card titel="Weltrangliste nach Jahresumsatz" icon="stern" aktion={<span className="muted text-xs">Ziel: 4 Quartale in Folge Platz 1</span>}>
        <div className="space-y-2">
          {rangliste.map((z, i) => {
            const max = Math.max(1, rangliste[0].umsatz);
            return (
              <div key={z.id} className={`grid grid-cols-[32px_220px_1fr_110px] items-center gap-3 rounded-lg px-2 py-1 text-sm ${z.eigen ? 'bg-brand-50 font-semibold dark:bg-brand-900/20' : ''}`}>
                <span className="tnum muted">{i + 1}.</span>
                <span className="flex items-center gap-2 truncate"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: z.farbe }} />{z.name}{z.pleite ? ' (insolvent)' : ''}</span>
                <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <motion.div className="h-full rounded-full" style={{ background: z.farbe }} initial={{ width: 0 }} animate={{ width: `${Math.max(0.5, (z.umsatz / max) * 100)}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
                </div>
                <span className="tnum text-right">{eurKompakt(z.umsatz)}</span>
              </div>
            );
          })}
        </div>
        <p className="muted mt-2 text-xs">Du liegst auf Platz {platz} von {rangliste.length}. Golden Spoke ist der amtierende Weltmarktführer – der Weg dorthin führt über alle Kontinente.</p>
      </Card>
    </div>
  );
}
