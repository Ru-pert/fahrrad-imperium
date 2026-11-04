import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { REGIONEN, quartalLabel, type RegionId } from '../../engine';
import { BOERSE, UEBERNAHME } from '../../engine/config/boerse';
import {
  aktienKaufPreis, boerseVon, fundamentalJeAktie, gruenderAnteil, ipoBedingungen, ipoFairerPreis, ipoMoeglich, ipoPlatzierung,
  istBoersennotiert, konkurrentWert, markenPreis, uebernahmeMoeglich, uebernahmePreis,
} from '../../engine/boerse';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from '../format';
import { Donut } from '../components/charts';
import { Konfetti } from '../components/Effekte';
import { Card, Icon, Info, KpiTile, NumberField, RegionMarke } from '../components/ui';
import { klang } from '../klang';

/** Börsenglocke (Illustration) */
function Glocke({ className = 'h-24 w-24', schwingt = false }: { className?: string; schwingt?: boolean }) {
  const reduziert = useGame((s) => s.reduziert);
  return (
    <motion.svg viewBox="0 0 100 100" className={className} aria-hidden="true" style={{ originX: '50px', originY: '12px' }} animate={schwingt && !reduziert ? { rotate: [0, 18, -16, 12, -8, 4, 0] } : undefined} transition={{ duration: 1.6, repeat: schwingt ? Infinity : 0, repeatDelay: 0.6 }}>
      <rect x="44" y="4" width="12" height="10" rx="3" fill="#78716c" />
      <path d="M50 12c-18 0-26 14-26 34v14l-8 12h68l-8-12V46c0-20-8-34-26-34z" fill="#facc15" stroke="#a16207" strokeWidth="3" />
      <path d="M32 40c2-10 8-18 16-20" stroke="#fef9c3" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="80" r="8" fill="#a16207" />
      <rect x="16" y="70" width="68" height="6" rx="3" fill="#ca8a04" />
    </motion.svg>
  );
}

/** Vollbild-Feier nach dem Börsengang */
export function IpoFeier() {
  const state = useGame((s) => s.state);
  const offenBericht = useGame((s) => s.frischerBericht);
  const reduziert = useGame((s) => s.reduziert);
  const b = state?.boerse;
  const schluessel = state ? `fi-ipo-gefeiert-${state.einstellungen.seed}-${b?.ipoQuartal}` : '';
  const [gesehen, setGesehen] = useState(() => {
    try {
      return !!localStorage.getItem(schluessel);
    } catch {
      return true;
    }
  });
  const sichtbar = !!state && !!b?.notiert && b.ipoQuartal === state.quartal - 1 && !gesehen && !offenBericht;
  useEffect(() => {
    if (sichtbar) {
      klang.klingel();
      setTimeout(() => klang.erfolg(), 600);
    }
  }, [sichtbar]);
  if (!sichtbar || !b || !state) return null;
  const zu = () => {
    try {
      localStorage.setItem(schluessel, '1');
    } catch {
      /* egal */
    }
    setGesehen(true);
  };
  const erster = b.verlauf[0]?.kurs ?? b.kurs;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[85] grid place-items-center bg-gradient-to-b from-indigo-950 via-slate-900 to-black p-6 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={zu} role="dialog" aria-label="Börsengang">
        {!reduziert && <Konfetti />}
        <div className="flex flex-col items-center text-center">
          <Glocke className="h-40 w-40" schwingt />
          <div className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-amber-300">Ding Dong!</div>
          <h1 className="font-display mt-1 text-4xl font-black">{state.unternehmen.name} ist an der Börse</h1>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div><div className="text-xs uppercase tracking-widest text-slate-400">Ausgabepreis</div><div className="font-display text-3xl font-bold">{eur(erster)}</div></div>
            <div><div className="text-xs uppercase tracking-widest text-slate-400">Kurs heute</div><div className="font-display text-3xl font-bold text-emerald-300">{eur(b.kurs)}</div></div>
          </div>
          <p className="mt-6 max-w-md text-slate-300">Aus der GmbH ist eine AG geworden. Ab jetzt bewegt jede Quartalszahl den Kurs – Gewinnüberraschungen heben die Stimmung, Enttäuschungen drücken sie.</p>
          <button className="btn mt-6 bg-amber-400 text-amber-950 hover:bg-amber-300" onClick={zu}>Weiter <Icon name="chevron" className="h-4 w-4" /></button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Kursverlauf mit Zwischenpunkten */
function KursChart({ verlauf, farbe }: { verlauf: { quartal: number; kurs: number; punkte: number[] }[]; farbe: string }) {
  const punkte = verlauf.flatMap((v, i) => (i === 0 ? [v.kurs] : v.punkte));
  if (punkte.length < 2) return <div className="muted py-8 text-center text-sm">Der Kursverlauf erscheint nach dem ersten Quartal an der Börse.</div>;
  const min = Math.min(...punkte) * 0.95;
  const max = Math.max(...punkte) * 1.05;
  const B = 600;
  const H = 180;
  const xy = (v: number, i: number) => `${(i / (punkte.length - 1)) * B},${H - ((v - min) / (max - min || 1)) * H}`;
  const linie = punkte.map(xy).join(' ');
  const steigt = punkte[punkte.length - 1] >= punkte[0];
  return (
    <div>
      <svg viewBox={`0 0 ${B} ${H}`} className="h-48 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="kursflaeche" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={steigt ? '#10b981' : '#f43f5e'} stopOpacity="0.3" />
            <stop offset="1" stopColor={steigt ? '#10b981' : '#f43f5e'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${linie} ${B},${H}`} fill="url(#kursflaeche)" />
        <motion.polyline points={linie} fill="none" stroke={steigt ? '#059669' : '#e11d48'} strokeWidth="2.2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
      </svg>
      <div className="muted flex justify-between text-[11px]">
        <span>{quartalLabel(verlauf[0].quartal)}</span>
        <span>{eur(min / 0.95)} – {eur(max / 1.05)}</span>
        <span>{quartalLabel(verlauf[verlauf.length - 1].quartal)}</span>
      </div>
      <span className="hidden" style={{ color: farbe }} />
    </div>
  );
}

export function Boerse() {
  const state = useGame((s) => s.state)!;
  const entwurf = useGame((s) => s.entwurf)!;
  const aendere = useGame((s) => s.aendereEntwurf);
  const b = boerseVon(state);
  const kpi = state.kpiHistorie[state.kpiHistorie.length - 1];
  const ekWert = kpi?.unternehmenswert ?? 0;
  const anteil = gruenderAnteil(state);
  const fund = fundamentalJeAktie(state);
  const bd = entwurf.boerse ?? {};
  const [ipoAnteil, setIpoAnteil] = useState(bd.ipo?.anteil ?? 0.25);
  const [ipoPreis, setIpoPreis] = useState(Math.round((bd.ipo?.preis ?? fund) * 100) / 100);
  const quote = ipoPlatzierung(state, ipoPreis);
  const neueAktien = Math.round(((b.aktienGesamt * ipoAnteil) / (1 - ipoAnteil)) * quote);
  const konkurrenten = Object.values(state.konkurrenten).filter((k) => k.status === 'aktiv');
  const kaps = useMemo(
    () => [{ id: 'du', name: state.unternehmen.name, wert: ekWert, farbe: state.unternehmen.farbe }, ...konkurrenten.map((k) => ({ id: k.id, name: k.name, wert: konkurrentWert(k), farbe: k.farbe }))].sort((a, c) => c.wert - a.wert),
    [state, ekWert, konkurrenten],
  );
  const maxKap = Math.max(1, ...kaps.map((x) => x.wert));
  const vorher = b.verlauf.length > 1 ? b.verlauf[b.verlauf.length - 2].kurs : b.kurs;
  const setzeBoerse = (fn: (x: NonNullable<typeof entwurf.boerse>) => void) => aendere((x) => { const n = { ...(x.boerse ?? {}) }; fn(n); x.boerse = n; });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Börse & Übernahmen</h1>
        <p className="muted text-sm">Unternehmenswert, Börsengang, Aktien – und die Konkurrenz einfach aufkaufen.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon="wert" label="Eigenkapitalwert" wert={ekWert} format={eurKompakt} verlauf={state.kpiHistorie.slice(-12).map((k) => k.unternehmenswert)} farbe="#7c3aed" />
        <KpiTile icon="personal" label="Dein Anteil" wert={anteil} format={(x) => pct(x, 1)} farbe="#0d9488" hinweis={`${fmt0(b.aktienGruender)} von ${fmt0(b.aktienGesamt)} Aktien`} />
        <KpiTile icon="kasse" label="Dein Privatvermögen" wert={anteil * Math.max(0, ekWert)} format={eurKompakt} farbe="#ca8a04" hinweis="Anteil × Eigenkapitalwert (Spaßkennzahl)" />
        <KpiTile icon="markt" label={b.notiert ? 'Aktienkurs' : 'Wert je Aktie'} wert={b.notiert ? b.kurs : fund} vorher={b.notiert ? vorher : undefined} format={eur} farbe="#16a34a" hinweis={b.notiert ? `Stimmung ${pct(b.stimmung - 1, 0)}` : 'fundamental, vor Börsengang'} />
      </div>

      {!b.notiert ? (
        <Card titel={<span className="flex items-center gap-1">Börsengang (IPO) <Info titel="Börsengang">Du gibst 10–40 % neue Aktien aus und legst den Ausgabepreis fest (±15 % um den fundamentalen Wert). Ist der Preis zu hoch, kaufen die Anleger nur einen Teil. 5 % des Erlöses kosten Banken und Prospekt. Danach bist du eine AG und kannst Kapital erhöhen, Aktien zurückkaufen und Konkurrenzaktien kaufen.</Info></span>} icon="wert" farbe="#7c3aed">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr_1fr]">
            <Glocke className="h-28 w-28" schwingt={ipoMoeglich(state)} />
            <div className="space-y-2">
              <div className="text-sm font-semibold">Voraussetzungen</div>
              {ipoBedingungen(state).map((x) => (
                <div key={x.text} className="flex items-center gap-2 text-sm">
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold text-white ${x.erfuellt ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>{x.erfuellt ? '✓' : ''}</span>
                  {x.text}
                </div>
              ))}
            </div>
            {ipoMoeglich(state) ? (
              <div>
                <NumberField label="Anteil neuer Aktien" unit="%" value={Math.round(ipoAnteil * 100)} min={10} max={40} step={1} onChange={(v) => setIpoAnteil(v / 100)} />
                <NumberField label="Ausgabepreis je Aktie" unit="€" value={ipoPreis} min={Math.round(fund * 85) / 100} max={Math.round(fund * 115) / 100} step={0.01} tastenSchritt={0.5} onChange={setIpoPreis} hint={`fundamental ${eur(fund)} · Anleger schätzen ≈ ${eur(ipoFairerPreis(state))}`} />
                <div className="tnum mt-2 rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-950/30">
                  <div>Erwartete Platzierung: <strong className={quote < 1 ? 'text-amber-600' : 'text-emerald-600'}>{pct(quote, 0)}</strong></div>
                  <div>Erlös nach Kosten: <strong>{eurKompakt(neueAktien * ipoPreis * (1 - BOERSE.ipo.kosten))}</strong> · dein Anteil danach {pct((b.aktienGruender) / (b.aktienGesamt + neueAktien), 0)}</div>
                </div>
                <button className={`btn mt-3 w-full ${bd.ipo ? 'bg-emerald-600 text-white' : 'btn-primary'}`} onClick={() => setzeBoerse((x) => { x.ipo = bd.ipo ? undefined : { anteil: ipoAnteil, preis: ipoPreis }; })}>
                  {bd.ipo ? '✓ Börsengang zum Quartalsende beantragt' : 'Börsengang beantragen'}
                </button>
              </div>
            ) : (
              <p className="muted self-center text-sm">Sobald alle Voraussetzungen erfüllt sind, kannst du hier den Börsengang planen.</p>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card titel={`Kursverlauf ${state.unternehmen.name}`} icon="markt" farbe="#16a34a"><KursChart verlauf={b.verlauf} farbe={state.unternehmen.farbe} /></Card>
          <Card titel="Aktionärsstruktur" icon="personal" farbe="#0d9488">
            <Donut
              mitte={pct(anteil, 0)}
              teile={[
                { name: 'Du (Gründer)', wert: b.aktienGruender, farbe: state.unternehmen.farbe },
                ...(b.aktienInvestor ? [{ name: 'Investor', wert: b.aktienInvestor, farbe: '#64748b' }] : []),
                { name: 'Streubesitz', wert: b.aktienGesamt - b.aktienGruender - b.aktienInvestor, farbe: '#a5b4fc' },
              ]}
            />
          </Card>
          <Card titel="Kapitalmaßnahmen in diesem Quartal" icon="geld" className="lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField label="Kapitalerhöhung (neue Aktien)" unit="%" value={Math.round((bd.kapitalerhoehung ?? 0) * 100)} min={0} max={20} step={1} onChange={(v) => setzeBoerse((x) => { x.kapitalerhoehung = v / 100 || undefined; })} hint={`Erlös ≈ ${eurKompakt(b.aktienGesamt * (bd.kapitalerhoehung ?? 0) * b.kurs * 0.95 * 0.97)} · 5 % Abschlag, 3 % Kosten`} />
              <NumberField label="Aktienrückkauf" unit="%" value={Math.round((bd.rueckkauf ?? 0) * 100)} min={0} max={10} step={1} onChange={(v) => setzeBoerse((x) => { x.rueckkauf = v / 100 || undefined; })} hint={`Kosten ≈ ${eurKompakt(b.aktienGesamt * (bd.rueckkauf ?? 0) * b.kurs * 1.02)} · hebt die Stimmung`} />
              <NumberField label="Dividende je Aktie" unit="€" value={Math.round((entwurf.finanzen.dividende / b.aktienGesamt) * 100) / 100} min={0} step={0.01} tastenSchritt={0.1} onChange={(v) => aendere((x) => { x.finanzen.dividende = Math.round(v * b.aktienGesamt); })} hint={`gesamt ${eurKompakt(entwurf.finanzen.dividende)} · nur aus Gewinnrücklagen`} />
            </div>
          </Card>
        </div>
      )}

      <Card titel="Wer ist wie viel wert?" icon="wert" farbe="#7c3aed">
        <div className="space-y-1.5">
          {kaps.map((x, i) => (
            <div key={x.id} className={`grid grid-cols-[minmax(0,180px)_1fr_100px] items-center gap-3 rounded-lg px-1 py-0.5 text-sm ${x.id === 'du' ? 'bg-brand-50 font-semibold dark:bg-brand-900/30' : ''}`}>
              <span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.farbe }} />{x.name}</span>
              <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><motion.div className="h-full rounded-full" style={{ background: x.farbe }} initial={{ width: 0 }} animate={{ width: `${Math.max(1, (x.wert / maxKap) * 100)}%` }} transition={{ duration: 0.7, delay: i * 0.04 }} /></div>
              <span className="tnum text-right">{eurKompakt(x.wert)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card titel={<span className="flex items-center gap-1">Übernahmen <Info titel="Übernahmen">Kaufbar ist jeder Konkurrent mit höchstens halb so viel Umsatz wie du. Preis = Unternehmenswert × 1,3. Du bekommst Werk, Linien (bis {UEBERNAHME.maxLinien}), Personal, Lager, F&E-Wissen und die Marke. Integrationskosten: 10 % im Folgequartal, zwei Quartale +5 % Materialkosten. Börsennotierte Firmen (Pedalo, Freedom, Golden Spoke) kaufst du über Aktien – ab 50 % gehören sie dir.</Info></span>} icon="rakete" farbe="#b91c1c">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {konkurrenten.map((k) => {
            const m = uebernahmeMoeglich(state, k.id);
            const notiert = istBoersennotiert(k.id);
            const beteiligung = state.beteiligungen?.[k.id]?.anteil ?? 0;
            const gewaehlt = entwurf.uebernahme === k.id;
            const kauf = bd.aktienKauf?.find((x) => x.konkurrent === k.id)?.anteil ?? 0;
            return (
              <div key={k.id} className={`rounded-xl border p-3 ${gewaehlt || kauf ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20' : 'border-[var(--line)]'}`}>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-black text-white" style={{ background: k.farbe }}>{k.name.slice(0, 1)}</span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{k.name}</div>
                    <div className="muted text-xs">{notiert ? 'börsennotiert' : 'privat'} · Umsatz {eurKompakt(k.letzterUmsatz)}/Q</div>
                  </div>
                </div>
                <div className="tnum mt-2 text-sm">Wert ≈ <strong>{eurKompakt(konkurrentWert(k))}</strong>{beteiligung > 0 ? <span> · dir gehören <strong>{pct(beteiligung, 0)}</strong></span> : null}</div>
                {!m.ok && <div className="mt-1 text-xs text-slate-500">Übernahme nicht möglich: {m.grund}</div>}
                {notiert ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[0.1, 0.25, 0.51 - beteiligung].filter((x) => x > 0.005 && beteiligung + x <= 1).map((x) => (
                      <button key={x} className={`btn min-h-[32px] px-2 text-xs ${Math.abs(kauf - x) < 0.001 ? 'bg-rose-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => setzeBoerse((y) => { y.aktienKauf = [...(y.aktienKauf ?? []).filter((z) => z.konkurrent !== k.id), ...(Math.abs(kauf - x) < 0.001 ? [] : [{ konkurrent: k.id, anteil: x }])]; })}>
                        +{pct(x, 0)} für {eurKompakt(aktienKaufPreis(state, k.id, x))}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button disabled={!m.ok} className={`btn mt-2 w-full ${gewaehlt ? 'bg-rose-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => aendere((x) => { x.uebernahme = gewaehlt ? undefined : k.id; })}>
                    {gewaehlt ? '✓ Übernahme beauftragt' : `Übernehmen für ${eurKompakt(uebernahmePreis(state, k.id))}`}
                  </button>
                )}
              </div>
            );
          })}
          {konkurrenten.length === 0 && <p className="muted text-sm">Kein Konkurrent mehr am Markt – du hast sie alle geschluckt!</p>}
        </div>
      </Card>

      <Card titel={<span className="flex items-center gap-1">Regionale Marke zukaufen <Info titel="Marke zukaufen">Du kaufst eine kleine regionale Fahrradmarke und ihre Kundschaft: Deine Bekanntheit steigt um 2 Punkte, der Restmarkt der vielen kleinen Anbieter schrumpft um 3 %. Preis: 0,15 % des Jahresmarktumsatzes der Region.</Info></span>} icon="marketing" farbe="#db2777">
        <div className="flex flex-wrap gap-2">
          {(['EU', 'NA', 'AS', 'RW'] as RegionId[]).filter((r) => state.regionen[r]?.aktiv).map((r) => {
            const da = entwurf.markeZukaufen?.includes(r);
            return (
              <button key={r} className={`btn ${da ? 'bg-pink-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => aendere((x) => { x.markeZukaufen = da ? (x.markeZukaufen ?? []).filter((y) => y !== r) : [...(x.markeZukaufen ?? []), r]; })}>
                <RegionMarke r={r} />{REGIONEN[r].name} · {eurKompakt(markenPreis(state, r))}{da ? ' ✓' : ''}
              </button>
            );
          })}
          {!(['EU', 'NA', 'AS', 'RW'] as RegionId[]).some((r) => state.regionen[r]?.aktiv) && <p className="muted text-sm">Möglich, sobald du im Ausland verkaufst.</p>}
        </div>
      </Card>
    </div>
  );
}
