import {
  BALANCE,
  LINIENTYPEN,
  WARTUNG,
  type Decisions,
  type GameState,
  type Linie,
  type LinienTyp,
  type Werk,
  type WerkBericht,
} from '../../engine';
import { hallenPlaetze } from '../../engine/production';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from '../format';

export const linienName = (l: Linie): string => `Linie ${/-L(\d+)$/.exec(l.id)?.[1] ?? l.id}`;

const TYP_BESCHREIBUNG: Record<LinienTyp, string> = {
  A: 'Viel Kapazität für große Mengen. Teuer in Anschaffung und Unterhalt, schlechter Umweltindex.',
  B: 'Der solide Allrounder: mittlere Kapazität, mittlere Kosten.',
  C: 'Klein und sauber: wenig Kapazität, günstig im Unterhalt, bester Umweltindex, kürzere Lebensdauer.',
};

// ------------------------------------------------------------------ Grafik

function Rad({ x, y, farbe }: { x: number; y: number; farbe: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={farbe} strokeWidth="1.6" fill="none">
      <circle cx="0" cy="0" r="4" />
      <circle cx="13" cy="0" r="4" />
      <path d="M0 0 L5 -6 L11 -6 L13 0 M5 -6 L7 0 L11 -6" />
    </g>
  );
}

/**
 * Animierte Werksansicht: Hallenplätze mit Linien (Bänder mit laufenden Rädern),
 * freie Plätze, Linien im Bau, Personal, Lager und abfahrende Lkw.
 */
export function WerksAnsicht({ state, werk, wr, produktion, geplant = [], verkauf = [] }: { state: GameState; werk: Werk; wr?: WerkBericht; produktion: number; geplant?: LinienTyp[]; verkauf?: string[] }) {
  const reduziert = useGame((s) => s.reduziert);
  const plaetze = hallenPlaetze(werk) + ((werk.halleImBau ?? 0) > 0 ? BALANCE.produktion.hallenErweiterung.plaetze : 0);
  const breite = 980;
  const bayB = Math.min(150, (breite - 300) / plaetze - 10);
  const startX = 170;
  const auslastung = wr?.auslastung ?? 0.7;
  const tempo = Math.max(1.2, 5 - 3 * Math.min(1.2, auslastung)); // Sekunden je Durchlauf
  const lager = Object.values(state.produkte).reduce((s, p) => s + (p?.lager.stueck ?? 0), 0);
  const kisten = Math.min(24, Math.ceil(lager / 150));
  const lkw = Math.min(5, Math.max(1, Math.round(produktion / 600)));
  const leute = Math.min(40, Math.round(werk.mitarbeitende / 2));
  const farbeStatus = !wr ? '#64748b' : wr.gekuerzt ? '#e11d48' : wr.ueberstunden > 0 ? '#f59e0b' : '#10b981';
  return (
    <svg viewBox={`0 0 ${breite} 300`} className="w-full rounded-xl bg-gradient-to-b from-sky-100 to-sky-50 dark:from-slate-800 dark:to-slate-900" role="img" aria-label={`Werk ${werk.name}`}>
      {/* Hintergrund: Darmstadt mit Hochzeitsturm */}
      <g fill="#cbd5e1" className="dark:opacity-40" opacity="0.8">
        <rect x="40" y="70" width="26" height="110" />
        <path d="M36 70 h34 l-3 -10 h-28 z M40 60 c0 -10 26 -10 26 0" />
        <rect x="80" y="120" width="40" height="60" />
        <rect x="860" y="110" width="50" height="70" />
        <rect x="915" y="130" width="40" height="50" />
      </g>
      <rect x="0" y="230" width={breite} height="70" fill="#94a3b8" opacity="0.35" />
      <rect x="0" y="262" width={breite} height="4" fill="#64748b" opacity="0.5" />

      {/* Halle */}
      <rect x={startX - 14} y="62" width={plaetze * (bayB + 10) + 18} height="172" rx="6" fill="#e2e8f0" stroke="#475569" strokeWidth="2" className="dark:fill-slate-700" />
      <text x={startX - 4} y="56" fontSize="13" fontWeight="700" fill="currentColor">Halle {werk.name} · {werk.linien.length}/{hallenPlaetze(werk)} Linienplätze belegt</text>

      {Array.from({ length: plaetze }, (_, i) => {
        const x = startX + i * (bayB + 10);
        const l = werk.linien[i];
        const erweiterung = i >= hallenPlaetze(werk);
        if (erweiterung) {
          return (
            <g key={i}>
              <rect x={x} y="74" width={bayB} height="150" rx="4" fill="none" stroke="#f59e0b" strokeDasharray="6 4" strokeWidth="2" />
              <path d={`M${x + 10} 220 L${x + bayB / 2} 90 L${x + bayB - 10} 220`} stroke="#f59e0b" strokeWidth="3" fill="none" />
              <text x={x + bayB / 2} y="150" fontSize="12" textAnchor="middle" fill="#b45309" fontWeight="700">Erweiterung</text>
              <text x={x + bayB / 2} y="166" fontSize="11" textAnchor="middle" fill="#b45309">im Bau</text>
            </g>
          );
        }
        if (!l) {
          const plan = geplant[i - werk.linien.length];
          if (plan) {
            return (
              <g key={i}>
                <rect x={x} y="74" width={bayB} height="150" rx="4" fill="none" stroke={state.unternehmen.farbe} strokeDasharray="6 4" strokeWidth="2.5" />
                <text x={x + bayB / 2} y="140" fontSize="12" textAnchor="middle" fontWeight="700" fill={state.unternehmen.farbe}>Kauf geplant</text>
                <text x={x + bayB / 2} y="156" fontSize="11" textAnchor="middle" fill={state.unternehmen.farbe}>Typ {plan} · {LINIENTYPEN[plan].name}</text>
              </g>
            );
          }
          return (
            <g key={i}>
              <rect x={x} y="74" width={bayB} height="150" rx="4" fill="none" stroke="#94a3b8" strokeDasharray="6 4" strokeWidth="2" />
              <text x={x + bayB / 2} y="150" fontSize="12" textAnchor="middle" fill="#64748b">freier Platz</text>
            </g>
          );
        }
        const kap = LINIENTYPEN[l.typ].kapazitaet;
        const hoehe = 40 + (kap / 9000) * 70;
        const band = 200;
        if (l.status === 'bau') {
          return (
            <g key={i}>
              <rect x={x} y="74" width={bayB} height="150" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
              <path d={`M${x + 20} 220 V96 H${x + bayB - 16} M${x + 20} 110 L${x + 50} 96`} stroke="#d97706" strokeWidth="4" fill="none" />
              <line x1={x + bayB - 30} y1="96" x2={x + bayB - 30} y2="140" stroke="#d97706" strokeWidth="1.5" />
              <rect x={x + bayB - 38} y="140" width="16" height="12" fill="#d97706" />
              <text x={x + bayB / 2} y="180" fontSize="12" textAnchor="middle" fontWeight="700" fill="#92400e">{linienName(l)} · Typ {l.typ}</text>
              <text x={x + bayB / 2} y="196" fontSize="11" textAnchor="middle" fill="#92400e">im Bau – ab nächstem Quartal</text>
            </g>
          );
        }
        const alt = l.restlaufzeit === 0;
        const wirdVerkauft = verkauf.includes(l.id);
        return (
          <g key={i} opacity={wirdVerkauft ? 0.45 : 1}>
            {wirdVerkauft && <text x={x + bayB / 2} y="90" fontSize="11" textAnchor="middle" fontWeight="700" fill="#e11d48">wird verkauft</text>}
            <rect x={x} y="74" width={bayB} height="150" rx="4" fill="#f8fafc" stroke="#475569" className="dark:fill-slate-600" />
            {/* Maschine: Höhe ~ Kapazität */}
            <rect x={x + 8} y={band - hoehe} width={bayB - 16} height={hoehe - 12} rx="3" fill={l.typ === 'A' ? '#64748b' : l.typ === 'B' ? '#0d9488' : '#16a34a'} opacity={0.35 + 0.65 * l.verfuegbarkeit} />
            <text x={x + bayB / 2} y={band - hoehe + 16} fontSize="12" textAnchor="middle" fontWeight="700" fill="#0f172a">{linienName(l)}</text>
            <text x={x + bayB / 2} y={band - hoehe + 30} fontSize="10.5" textAnchor="middle" fill="#0f172a">Typ {l.typ} · {fmt0(kap)} Std.</text>
            {alt && <text x={x + bayB / 2} y={band - hoehe + 44} fontSize="10" textAnchor="middle" fill="#b91c1c">abgeschrieben</text>}
            {/* Band mit laufenden Rädern */}
            <rect x={x + 4} y={band} width={bayB - 8} height="6" rx="3" fill="#334155" />
            <svg x={x + 4} y={band - 12} width={bayB - 8} height="14" overflow="hidden">
              <g>
                {Array.from({ length: Math.ceil(bayB / 30) + 2 }, (_, k) => (
                  <Rad key={k} x={k * 30 - 30} y={10} farbe={state.unternehmen.farbe} />
                ))}
                {!reduziert && auslastung > 0.05 && (
                  <animateTransform attributeName="transform" type="translate" from="0 0" to="30 0" dur={`${tempo / 4}s`} repeatCount="indefinite" />
                )}
              </g>
            </svg>
            {/* Verfügbarkeit */}
            <rect x={x + 8} y={band + 14} width={bayB - 16} height="5" rx="2" fill="#cbd5e1" />
            <rect x={x + 8} y={band + 14} width={(bayB - 16) * l.verfuegbarkeit} height="5" rx="2" fill={l.verfuegbarkeit > 0.9 ? '#10b981' : '#f59e0b'} />
          </g>
        );
      })}

      {/* Personal */}
      {Array.from({ length: leute }, (_, i) => {
        const x = startX + 4 + (i % 20) * ((plaetze * (bayB + 10) - 10) / 20);
        const y = 244 + Math.floor(i / 20) * 12;
        return (
          <g key={i} transform={`translate(${x} ${y})`} fill="#334155">
            <circle cx="0" cy="-5" r="2.6" />
            <rect x="-2.4" y="-2" width="4.8" height="7" rx="1.5" />
          </g>
        );
      })}

      {/* Lager */}
      <g transform="translate(10 186)">
        <text x="0" y="-8" fontSize="11" fontWeight="700" fill="currentColor">Lager</text>
        {Array.from({ length: kisten }, (_, i) => (
          <rect key={i} x={(i % 6) * 22} y={36 - Math.floor(i / 6) * 14} width="20" height="12" fill="#d97706" stroke="#92400e" />
        ))}
        <text x="0" y="62" fontSize="10.5" fill="currentColor">{fmt0(lager)} Räder</text>
      </g>

      {/* Lkw */}
      <g>
        {Array.from({ length: lkw }, (_, i) => (
          <g key={i}>
            <g transform={`translate(${breite - 160} 258)`}>
              <rect x="0" y="-22" width="34" height="18" fill={state.unternehmen.farbe} />
              <rect x="34" y="-16" width="12" height="12" fill="#334155" />
              <circle cx="8" cy="-2" r="4" fill="#0f172a" />
              <circle cx="38" cy="-2" r="4" fill="#0f172a" />
              {!reduziert && <animateTransform attributeName="transform" type="translate" from={`${breite - 200} 258`} to={`${breite + 40} 258`} dur="5s" begin={`${i}s`} repeatCount="indefinite" />}
            </g>
          </g>
        ))}
        <text x={breite - 150} y="290" fontSize="11" fill="currentColor">{fmt0(produktion)} Räder geplant</text>
      </g>

      {/* Status */}
      <g transform={`translate(${breite - 190} 20)`}>
        <rect width="180" height="34" rx="8" fill="white" opacity="0.85" className="dark:fill-slate-800" />
        <circle cx="16" cy="17" r="6" fill={farbeStatus} />
        <text x="30" y="21" fontSize="12" fontWeight="700" fill="currentColor">Auslastung {pct(auslastung, 0)}</text>
      </g>
      <text x="10" y="20" fontSize="12" fill="currentColor">{werk.mitarbeitende} Mitarbeitende (1 Figur = 2 Personen)</text>
    </svg>
  );
}

// ------------------------------------------------------------------ Linienverwaltung

export function LinienVerwaltung({
  werk,
  e,
  aendere,
  stufe,
}: {
  state?: GameState;
  werk: Werk;
  e: Decisions['werke'][string];
  aendere: (fn: (d: Decisions) => void) => void;
  stufe: 1 | 2 | 3;
}) {
  const plaetze = hallenPlaetze(werk);
  const typen: LinienTyp[] = stufe >= 3 ? ['A', 'B', 'C'] : ['B'];
  const kaufAnzahl = (t: LinienTyp) => e.linienKaufen.find((k) => k.typ === t)?.anzahl ?? 0;
  const gesamtKauf = e.linienKaufen.reduce((s, k) => s + k.anzahl, 0);
  const frei = plaetze - werk.linien.length + e.linienVerkaufen.length;
  const halleVoll = werk.linien.length >= plaetze;
  const H = BALANCE.produktion.hallenErweiterung;
  const setzeKauf = (t: LinienTyp, n: number) =>
    aendere((x) => {
      const rest = x.werke[werk.id].linienKaufen.filter((k) => k.typ !== t);
      x.werke[werk.id].linienKaufen = n > 0 ? [...rest, { typ: t, anzahl: n }] : rest;
    });

  return (
    <div className="space-y-5">
      {/* Bestehende Linien */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Deine Fertigungslinien</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {werk.linien.map((l) => {
            const cfg = LINIENTYPEN[l.typ];
            const alter = cfg.lebensdauer - l.restlaufzeit;
            const erloes = cfg.restwert * l.buchwert;
            const verkauf = e.linienVerkaufen.includes(l.id);
            const kannVerkaufen = stufe >= 3 && l.status === 'aktiv' && werk.linien.length - e.linienVerkaufen.length > 1;
            return (
              <div key={l.id} className={`rounded-xl border-2 p-3 text-xs ${verkauf ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'border-[var(--line)]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{linienName(l)}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${l.status === 'bau' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{l.status === 'bau' ? 'im Bau' : 'läuft'}</span>
                </div>
                <div className="font-medium">Typ {l.typ} · {cfg.name}</div>
                <dl className="tnum mt-2 grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5">
                  <dt className="muted">Kapazität</dt><dd className="text-right">{fmt0(cfg.kapazitaet * l.verfuegbarkeit)} Std./Q</dd>
                  <dt className="muted">Verfügbarkeit</dt><dd className="text-right">{pct(l.verfuegbarkeit, 0)}</dd>
                  <dt className="muted">Alter</dt><dd className="text-right">{alter} von {cfg.lebensdauer} Q</dd>
                  <dt className="muted">Umweltindex</dt><dd className="text-right">{fmt0(l.umweltindex)}</dd>
                  <dt className="muted">Fixkosten + Wartung</dt><dd className="text-right">{eur(cfg.fixkosten + WARTUNG[werk.wartung].kosten)}/Q</dd>
                  <dt className="muted">Buchwert</dt><dd className="text-right">{eur(l.buchwert)}</dd>
                  <dt className="muted">Verkaufserlös</dt><dd className="text-right">{eur(erloes)}</dd>
                </dl>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-black/10" title="Abschreibung">
                  <div className="h-full bg-slate-500" style={{ width: `${(alter / cfg.lebensdauer) * 100}%` }} />
                </div>
                {stufe >= 3 ? (
                  <button
                    className={`btn mt-2 w-full text-xs ${verkauf ? 'bg-rose-600 text-white' : 'border border-[var(--line)]'}`}
                    disabled={!verkauf && !kannVerkaufen}
                    onClick={() => aendere((x) => { const v = x.werke[werk.id].linienVerkaufen; x.werke[werk.id].linienVerkaufen = verkauf ? v.filter((i) => i !== l.id) : [...v, l.id]; })}
                  >
                    {verkauf ? `Verkauf geplant (+${eurKompakt(erloes)}) – rückgängig` : 'Verkaufen'}
                  </button>
                ) : (
                  <p className="muted mt-2">Verkauf ab Q5 möglich.</p>
                )}
                {verkauf && <p className="mt-1 text-rose-700 dark:text-rose-300">Buchverlust {eur(l.buchwert - erloes)}, {fmt0(cfg.kapazitaet)} Std. Kapazität fallen weg.</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Kauf */}
      <div>
        <h3 className="text-sm font-semibold">Neue Linien kaufen <span className="muted font-normal">(Bauzeit 1 Quartal · {frei > 0 ? `${frei} freie${frei === 1 ? 'r' : ''} Platz${frei === 1 ? '' : 'e'}` : 'Halle voll'})</span></h3>
        <table className="tnum mt-2 w-full text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap [&_td:first-child]:whitespace-normal">
          <thead>
            <tr className="muted border-b border-[var(--line)] text-left text-xs">
              <th className="py-1">Typ</th><th className="text-right">Preis</th><th className="text-right">Kapazität</th><th className="text-right">Lebensdauer</th>
              <th className="text-right">Fixkosten/Q</th><th className="text-right">Umwelt</th><th className="text-right">€ je Std. Kapazität</th><th className="w-44 text-right">Anzahl</th>
            </tr>
          </thead>
          <tbody>
            {typen.map((t) => {
              const cfg = LINIENTYPEN[t];
              const n = kaufAnzahl(t);
              return (
                <tr key={t} className="border-b border-[var(--line)] align-top">
                  <td className="py-2 pr-2">
                    <div className="font-semibold">Typ {t} · {cfg.name}</div>
                    <div className="muted text-xs">{TYP_BESCHREIBUNG[t]}</div>
                  </td>
                  <td className="py-2 text-right">{eurKompakt(cfg.preis)}</td>
                  <td className="py-2 text-right">{fmt0(cfg.kapazitaet)} Std.</td>
                  <td className="py-2 text-right">{cfg.lebensdauer} Q</td>
                  <td className="py-2 text-right">{eur(cfg.fixkosten)}</td>
                  <td className="py-2 text-right">{cfg.umwelt}</td>
                  <td className="py-2 text-right">{eur(cfg.preis / cfg.kapazitaet)}</td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn-ghost w-11 shrink-0" aria-label={`Typ ${t} weniger`} disabled={n <= 0} onClick={() => setzeKauf(t, n - 1)}>−</button>
                      <span className="w-6 text-center text-lg font-bold">{n}</span>
                      <button className="btn-ghost w-11 shrink-0" aria-label={`Typ ${t} mehr`} disabled={gesamtKauf >= Math.min(BALANCE.produktion.maxNeueLinienProQuartal, frei)} onClick={() => setzeKauf(t, n + 1)}>+</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {stufe < 3 && <p className="muted mt-1 text-xs">Die Typen A (Hochleistung) und C (Öko-Kompakt) sowie der Verkauf von Linien werden ab Q5 freigeschaltet.</p>}
      </div>

      {/* Halle */}
      <div className="rounded-xl border border-[var(--line)] p-3">
        <h3 className="text-sm font-semibold">Halle erweitern</h3>
        <p className="muted text-xs">
          Die Halle hat {plaetze} Linienplätze. Sind alle belegt, kannst du sie für {eurKompakt(H.kosten)} um {H.plaetze} Plätze erweitern (Bauzeit {H.bauzeit} Quartal, Abschreibung über 40 Quartale).
        </p>
        {(werk.halleImBau ?? 0) > 0 ? (
          <p className="mt-2 text-sm font-semibold text-amber-700">Erweiterung läuft – ab nächstem Quartal gibt es {plaetze + H.plaetze} Plätze.</p>
        ) : (
          <button
            className={`btn mt-2 ${e.halleErweitern ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`}
            disabled={!halleVoll}
            onClick={() => aendere((x) => { x.werke[werk.id].halleErweitern = !x.werke[werk.id].halleErweitern; })}
          >
            {e.halleErweitern ? '✓ Erweiterung beauftragt' : `Halle erweitern (+${H.plaetze} Plätze, ${eurKompakt(H.kosten)})`}
          </button>
        )}
        {!halleVoll && (werk.halleImBau ?? 0) === 0 && <p className="muted mt-1 text-xs">Noch {plaetze - werk.linien.length} Platz/Plätze frei – erst Linien kaufen, dann erweitern.</p>}
      </div>
    </div>
  );
}
