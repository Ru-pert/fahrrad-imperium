import { motion } from 'framer-motion';
import {
  FUEHRUNG,
  RESSORTS,
  RESSORT_IDS,
  fuehrungVon,
  geplanteKosten,
  gehaelter,
  hauptwirkung,
  kannBefoerdern,
  mackeName,
  mackeVon,
  marktGehalt,
  quartalLabel,
  titelVon,
  type Decisions,
  type Fuehrungskraft,
  type GameState,
  type Ressort,
} from '../../engine';
import { useGame } from '../../store/gameStore';
import { eurKompakt, pct } from '../format';
import { Gesicht } from '../components/Gesicht';
import { Aufklapper, Card, Icon, IconBadge, Info } from '../components/ui';

type Fuehrung = NonNullable<Decisions['fuehrung']>;
type Liste = keyof Fuehrung;

const umschalten = (d: Decisions, liste: Liste, id: string) => {
  const f = (d.fuehrung ??= {});
  const l = f[liste] ?? [];
  f[liste] = l.includes(id) ? l.filter((x) => x !== id) : [...l, id];
};

function Sterne({ n, farbe }: { n: number; farbe: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Können ${n} von 5`} title={`Können ${n} von 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" fill={i <= n ? farbe : 'none'} stroke={farbe} strokeWidth="1.2" opacity={i <= n ? 1 : 0.35} />
        </svg>
      ))}
    </span>
  );
}

function LoyalitaetsBalken({ wert }: { wert: number }) {
  const farbe = wert >= 60 ? '#10b981' : wert >= 35 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="muted w-16">Loyalität</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <motion.div className="h-full rounded-full" style={{ background: farbe }} initial={{ width: 0 }} animate={{ width: `${wert}%` }} />
      </div>
      <span className="tnum w-7 text-right font-semibold">{Math.round(wert)}</span>
    </div>
  );
}

const wirkungText = (r: Ressort, x: number): string => {
  const p = pct(x, 1);
  switch (r) {
    case 'produktion': return `+${p} Kapazität`;
    case 'vertrieb': return `+${p} Nachfrage`;
    case 'forschung': return `+${p} F&E-Wirkung`;
    case 'marketing': return `+${p} Werbewirkung`;
    case 'finanzen': return `−${p} Verwaltung & Zinsen`;
  }
};

function MackeChip({ p }: { p: Fuehrungskraft }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
      {mackeName(p)}
      <Info titel={mackeName(p)}>{mackeVon(p.macke).text}</Info>
    </span>
  );
}

function PersonKarte({ state, p, d }: { state: GameState; p: Fuehrungskraft; d: Decisions }) {
  const aendere = useGame((s) => s.aendereEntwurf);
  const R = RESSORTS[p.ressort];
  const t = state.quartal;
  const ausfall = p.ausfallBis !== undefined && p.ausfallBis >= t;
  const entlassen = d.fuehrung?.entlassen?.includes(p.id);
  const befoerdern = d.fuehrung?.befoerdern?.includes(p.id);
  const markt = marktGehalt(state, p.stufe) * (mackeVon(p.macke).gehalt ?? 1);
  return (
    <motion.div layout className={`card relative flex flex-col p-4 ${entlassen ? 'opacity-60' : ''}`} style={{ boxShadow: `inset 0 3px 0 ${R.farbe}` }}>
      <div className="flex items-start gap-3">
        <motion.div whileHover={{ rotate: [0, -4, 4, 0] }}>
          <Gesicht seed={p.gesicht} weiblich={p.weiblich} farbe={R.farbe} alter={p.alter} stimmung={ausfall ? 20 : p.loyalitaet} muede={ausfall} className="h-20 w-20 shrink-0" titel={p.name} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: R.farbe }}>{titelVon(p)}</div>
          <div className="font-display truncate text-base font-bold leading-tight">{p.name}</div>
          <div className="muted text-xs">{p.alter} Jahre · seit {quartalLabel(p.seit ?? t)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5"><Sterne n={p.stufe} farbe={R.farbe} /><MackeChip p={p} /></div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="muted">Wirkung</span>
          <span className="font-semibold">{ausfall ? <span className="text-rose-600">fällt aus (Burn-out)</span> : wirkungText(p.ressort, hauptwirkung(state, p, t))}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="muted">Gehalt je Quartal</span>
          <span className="tnum font-semibold">{eurKompakt(p.gehalt)}{p.gehalt < markt * 0.95 && <span className="ml-1 text-xs text-amber-600" title="Unter dem Marktgehalt – die Loyalität sinkt">▼ Markt {eurKompakt(markt)}</span>}</span>
        </div>
        <LoyalitaetsBalken wert={p.loyalitaet} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={`btn min-h-[36px] flex-1 px-3 text-sm ${befoerdern ? 'bg-amber-400 text-amber-950' : 'border border-[var(--line)]'}`}
          disabled={!kannBefoerdern(p, t) || entlassen}
          title={kannBefoerdern(p, t) ? `Gehalt +${Math.round((FUEHRUNG.befoerderung.gehalt - 1) * 100)} %, Loyalität +${FUEHRUNG.befoerderung.loyalitaet}, Wirkung +${Math.round(FUEHRUNG.befoerderungBonus * 100)} %` : p.befoerdert >= FUEHRUNG.befoerderung.max ? 'Höchste Stufe erreicht' : `Frühestens ${FUEHRUNG.befoerderung.abstand} Quartale nach der letzten Beförderung bzw. dem Start`}
          onClick={() => aendere((x) => umschalten(x, 'befoerdern', p.id))}
        >
          <Icon name="krone" className="h-4 w-4" /> {befoerdern ? 'Wird befördert' : 'Befördern'}
        </button>
        <button className={`btn min-h-[36px] px-3 text-sm ${entlassen ? 'bg-rose-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => aendere((x) => umschalten(x, 'entlassen', p.id))} title={`Abfindung ${eurKompakt(FUEHRUNG.abfindung * p.gehalt)}`}>
          {entlassen ? 'Wird entlassen' : 'Entlassen'}
        </button>
      </div>
    </motion.div>
  );
}

function LeererPlatz({ r }: { r: Ressort }) {
  const R = RESSORTS[r];
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line)] p-4 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full" style={{ background: `${R.farbe}18`, color: R.farbe }}>
        <Icon name={R.icon} className="h-8 w-8" />
      </div>
      <div className="mt-2 font-semibold">{R.titel[0]}</div>
      <div className="muted text-xs">unbesetzt · wirkt auf {R.wirkung}</div>
    </div>
  );
}

function BewerberKarte({ state, b, d, besetzt }: { state: GameState; b: Fuehrungskraft; d: Decisions; besetzt: boolean }) {
  const aendere = useGame((s) => s.aendereEntwurf);
  const R = RESSORTS[b.ressort];
  const gewaehlt = d.fuehrung?.einstellen?.includes(b.id);
  const konflikt = !gewaehlt && (besetzt || (d.fuehrung?.einstellen ?? []).some((id) => id !== b.id && fuehrungVon(state).bewerber.find((x) => x.id === id)?.ressort === b.ressort));
  const herkunft = b.herkunft ? state.konkurrenten[b.herkunft] : undefined;
  return (
    <motion.div layout className={`card flex flex-col p-4 ${gewaehlt ? 'ring-2 ring-emerald-500' : ''}`}>
      <div className="flex items-start gap-3">
        <Gesicht seed={b.gesicht} weiblich={b.weiblich} farbe={R.farbe} alter={b.alter} stimmung={70} className="h-16 w-16 shrink-0" titel={b.name} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: R.farbe }}>{R.name}</div>
          <div className="font-semibold leading-tight">{b.name}</div>
          <div className="muted text-xs">{b.alter} Jahre{herkunft ? ` · bisher bei ${herkunft.name}` : ''}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5"><Sterne n={b.stufe} farbe={R.farbe} /><MackeChip p={b} /></div>
        </div>
      </div>
      <dl className="tnum mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="muted">Wirkung</dt><dd className="text-right font-semibold">{wirkungText(b.ressort, hauptwirkung(state, b, state.quartal))}</dd>
        <dt className="muted">Gehalt je Quartal</dt><dd className="text-right font-semibold">{eurKompakt(b.gehalt)}</dd>
        <dt className="muted">Antrittsprämie{b.abloese ? ' + Ablöse' : ''}</dt><dd className="text-right font-semibold">{eurKompakt(FUEHRUNG.anwerbePraemie * b.gehalt + (b.abloese ?? 0))}</dd>
      </dl>
      <button
        className={`btn mt-3 min-h-[38px] w-full text-sm ${gewaehlt ? 'bg-emerald-600 text-white' : 'btn-primary'}`}
        disabled={konflikt}
        onClick={() => aendere((x) => umschalten(x, 'einstellen', b.id))}
        title={konflikt ? 'Das Ressort ist besetzt – erst entlassen oder andere Auswahl abwählen' : undefined}
      >
        {gewaehlt ? <><Icon name="check" className="h-4 w-4" /> Wird eingestellt</> : herkunft ? 'Abwerben' : 'Einstellen'}
      </button>
    </motion.div>
  );
}

/** Warnung bei Abwerbeversuchen mit Gegenangebot (auch im Cockpit) */
export function AbwerbeAlarm() {
  const state = useGame((s) => s.state)!;
  const d = useGame((s) => s.entwurf);
  const aendere = useGame((s) => s.aendereEntwurf);
  const z = fuehrungVon(state);
  if (!d || !z.abwerbung.length) return null;
  return (
    <div className="space-y-2">
      {z.abwerbung.map((a) => {
        const p = z.team.find((x) => x.id === a.personId);
        if (!p) return null;
        const halten = d.fuehrung?.gegenangebot?.includes(p.id);
        const k = state.konkurrenten[a.konkurrent];
        return (
          <motion.div key={a.personId} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-3 shadow-md dark:bg-amber-950/40">
            <Gesicht seed={p.gesicht} weiblich={p.weiblich} farbe={RESSORTS[p.ressort].farbe} alter={p.alter} stimmung={40} className="h-14 w-14 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-display font-bold">{k?.name ?? 'Die Konkurrenz'} will {p.name} abwerben!</div>
              <div>{titelVon(p)} · bleibt nur mit einem Gehalt von <strong>{eurKompakt(a.forderung)}</strong> je Quartal (bisher {eurKompakt(p.gehalt)}).</div>
            </div>
            <div className="flex gap-2">
              <button className={`btn min-h-[36px] text-sm ${halten ? 'bg-emerald-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => aendere((x) => { const f = (x.fuehrung ??= {}); f.gegenangebot = [...(f.gegenangebot ?? []).filter((i) => i !== p.id), p.id]; })}>{halten ? '✓ ' : ''}Gegenangebot</button>
              <button className={`btn min-h-[36px] text-sm ${!halten ? 'bg-slate-700 text-white' : 'border border-[var(--line)]'}`} onClick={() => aendere((x) => { const f = (x.fuehrung ??= {}); f.gegenangebot = (f.gegenangebot ?? []).filter((i) => i !== p.id); })}>{!halten ? '✓ ' : ''}Ziehen lassen</button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function Team() {
  const state = useGame((s) => s.state)!;
  const d = useGame((s) => s.entwurf)!;
  const z = fuehrungVon(state);
  const geplant = geplanteKosten(state, d.fuehrung);
  const besetzt = (r: Ressort) => z.team.some((p) => p.ressort === r && !d.fuehrung?.entlassen?.includes(p.id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-page">Führungsteam</h1>
          <p className="muted text-sm">Fünf Chefsessel, fünf Menschen mit Stärken und Macken. Gute Leute machen dein Unternehmen besser – und sind bei der Konkurrenz begehrt.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <div className="card px-3 py-2"><div className="muted text-[10px] uppercase">Gehälter je Quartal</div><div className="tnum font-bold">{eurKompakt(gehaelter(state))}</div></div>
          {geplant > 0 && <div className="card px-3 py-2"><div className="muted text-[10px] uppercase">Einmalkosten geplant</div><div className="tnum font-bold text-rose-600">{eurKompakt(geplant)}</div></div>}
        </div>
      </div>

      <Aufklapper titel="So funktioniert das Führungsteam" merken="team-erklaerung" icon={<Icon name="info" className="h-4 w-4 text-sky-600" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><strong>Wirkung:</strong> Je Stern 2 % auf den Bereich des Ressorts (Forschung und Marketing dreifach, Finanzen doppelt). Jede Beförderung bringt 15 % mehr Wirkung.</li>
          <li><strong>Kosten:</strong> Gehalt jedes Quartal, beim Einstellen eine Antrittsprämie (ein Quartalsgehalt) – bei Leuten der Konkurrenz zusätzlich eine Ablöse. Entlassen kostet zwei Quartalsgehälter Abfindung. Alles läuft über die Verwaltungskosten.</li>
          <li><strong>Loyalität:</strong> Steigt mit der Zeit, mit fairem Gehalt und Beförderungen; sie sinkt in Verlustquartalen und wenn das Gehalt hinter dem Markt zurückbleibt (das Marktgehalt wächst mit deinem Umsatz). Wer wenig loyal ist, wird abgeworben – dann kannst du mit einem Gegenangebot halten.</li>
          <li><strong>Macken:</strong> Jede Person hat eine Eigenart, die zusätzlich wirkt – fahre über das ⓘ.</li>
        </ul>
      </Aufklapper>

      <AbwerbeAlarm />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RESSORT_IDS.map((r) => {
          const p = z.team.find((x) => x.ressort === r);
          return p ? <PersonKarte key={r} state={state} p={p} d={d} /> : <LeererPlatz key={r} r={r} />;
        })}
      </div>

      <Card titel={`Bewerbungen für ${quartalLabel(state.quartal)}`} icon="koffer" farbe="#0d9488" aktion={<span className="muted text-xs">Jedes Quartal neue Leute</span>}>
        <div className="grid gap-3 md:grid-cols-3">
          {z.bewerber.map((b) => <BewerberKarte key={b.id} state={state} b={b} d={d} besetzt={besetzt(b.ressort)} />)}
        </div>
      </Card>

      {(z.ehemalige?.length ?? 0) > 0 && (
        <Card titel="Ehemalige" icon="personal" farbe="#64748b">
          <ul className="space-y-1 text-sm">
            {[...(z.ehemalige ?? [])].reverse().map((e, i) => (
              <li key={i} className="flex items-center gap-2">
                <IconBadge name={e.grund === 'abgeworben' ? 'herzbruch' : 'personal'} farbe={e.grund === 'abgeworben' ? '#e11d48' : '#64748b'} groesse="sm" />
                <span><strong>{e.name}</strong> ({RESSORTS[e.ressort].name}) – {e.grund === 'abgeworben' ? `abgeworben von ${state.konkurrenten[e.zu ?? '']?.name ?? 'der Konkurrenz'}` : 'entlassen'} im {quartalLabel(e.quartal)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
