import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { PRODUKTE, quartalLabel, type Decisions, type GameState, type ProductId } from '../../engine';
import { FORSCHUNG } from '../../engine/config/research';
import { alleProjekte, restQuartale, type ProjektStatus } from '../../engine/forschung';
import { volumenFaktor } from '../../engine/market';
import { useGame } from '../../store/gameStore';
import { eurKompakt, fmt0, pct } from '../format';
import { BikeIcon, PRODUKT_FARBE } from './BikeIcon';
import { NumberField } from './ui';

const SP = 230;
const ZE = 120;
const R = 38;

/** Kleine Kurve: erwartete Marktentwicklung eines Segments in den nächsten 40 Quartalen */
export function Lebenszyklus({ produkt, ab, breite = 220, hoehe = 56 }: { produkt: ProductId; ab: number; breite?: number; hoehe?: number }) {
  const werte = Array.from({ length: 41 }, (_, i) => volumenFaktor(produkt, 'DE', ab + i));
  const max = Math.max(...werte);
  const min = Math.min(...werte);
  const pkte = werte.map((v, i) => `${(i / 40) * breite},${hoehe - 4 - ((v - min) / (max - min || 1)) * (hoehe - 8)}`).join(' ');
  const farbe = PRODUKT_FARBE[produkt];
  const veraenderung = werte[40] / werte[0] - 1;
  return (
    <div>
      <svg viewBox={`0 0 ${breite} ${hoehe}`} className="w-full" style={{ height: hoehe }}>
        <polyline points={`0,${hoehe} ${pkte} ${breite},${hoehe}`} fill={`${farbe}22`} stroke="none" />
        <polyline points={pkte} fill="none" stroke={farbe} strokeWidth="2" />
      </svg>
      <div className="muted flex justify-between text-[10px]">
        <span>{quartalLabel(ab)}</span>
        <span className={veraenderung >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{veraenderung >= 0 ? '+' : ''}{pct(veraenderung, 0)} in 10 Jahren</span>
        <span>{quartalLabel(ab + 40)}</span>
      </div>
    </div>
  );
}

function Knoten({ st, x, y, budget, gewaehlt, onClick }: { st: ProjektStatus; x: number; y: number; budget: number; gewaehlt: boolean; onClick: () => void }) {
  const reduziert = useGame((s) => s.reduziert);
  const p = st.projekt.produkt;
  const farbe = st.fertig ? '#10b981' : st.offen ? PRODUKT_FARBE[p] : '#94a3b8';
  const umfang = 2 * Math.PI * (R + 6);
  const aktiv = budget > 0 && !st.fertig;
  return (
    <g transform={`translate(${x} ${y})`} className="cursor-pointer" onClick={onClick}>
      {aktiv && !reduziert && (
        <motion.circle r={R + 10} fill="none" stroke={farbe} strokeWidth="2" initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 1.35 }} transition={{ duration: 1.6, repeat: Infinity }} />
      )}
      <circle r={R + 6} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <motion.circle
        r={R + 6}
        fill="none"
        stroke={farbe}
        strokeWidth="7"
        strokeLinecap="round"
        transform="rotate(-90)"
        strokeDasharray={umfang}
        initial={false}
        animate={{ strokeDashoffset: umfang * (1 - st.anteil) }}
        transition={{ duration: 0.8 }}
      />
      <circle r={R} fill={st.fertig ? '#ecfdf5' : st.offen ? '#ffffff' : '#f1f5f9'} stroke={gewaehlt ? '#0f172a' : 'none'} strokeWidth="2.5" />
      <foreignObject x={-30} y={-22} width={60} height={40}>
        <div className="grid h-full w-full place-items-center">
          <BikeIcon produkt={p} className="h-9 w-14" farbe={st.offen || st.fertig ? undefined : '#94a3b8'} />
        </div>
      </foreignObject>
      {st.fertig && (
        <g transform={`translate(${R - 6} ${-R + 6})`}>
          <circle r="11" fill="#10b981" />
          <path d="M-5 0 l3.5 3.5 l6.5 -7" stroke="#fff" strokeWidth="2.5" fill="none" />
        </g>
      )}
      {!st.offen && !st.fertig && (
        <g transform={`translate(${R - 6} ${-R + 6})`}>
          <circle r="11" fill="#64748b" />
          <rect x="-4.5" y="-1" width="9" height="7" rx="1" fill="#fff" />
          <path d="M-3 -1 v-2.5 a3 3 0 0 1 6 0 v2.5" stroke="#fff" strokeWidth="1.6" fill="none" />
        </g>
      )}
      <text y={R + 24} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{st.projekt.name}</text>
      <text y={R + 40} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">
        {st.fertig ? `→ ${PRODUKTE[p].name} im Programm` : `${pct(st.anteil, 0)} von ${eurKompakt(st.projekt.kosten)}`}
      </text>
    </g>
  );
}

/**
 * Forschungsbaum als „Labor“: Knoten mit Fortschrittsring, Verbindungen zu Voraussetzungen,
 * pulsierende Ringe für laufende Projekte. Auswahl öffnet das Projekt mit Budgetregler.
 */
export function Forschungsbaum({ state, d, aendere }: { state: GameState; d: Decisions; aendere: (fn: (d: Decisions) => void) => void }) {
  const status = useMemo(() => alleProjekte(state), [state]);
  const [auswahl, setAuswahl] = useState<string>(() => status.find((s) => s.offen && !s.fertig)?.projekt.id ?? FORSCHUNG[0].id);
  const pos = (spalte: number, zeile: number) => [80 + spalte * SP, 70 + zeile * ZE] as const;
  const breite = 80 + 2 * SP + 140;
  const hoehe = 70 + 2 * ZE + 90;
  const start = pos(0, 1);
  const st = status.find((s) => s.projekt.id === auswahl)!;
  const budget = d.forschung?.[auswahl] ?? 0;
  const rest = restQuartale(st, budget);
  const laufend = status.filter((s) => (d.forschung?.[s.projekt.id] ?? 0) > 0 && !s.fertig);
  const summe = laufend.reduce((a, s) => a + (d.forschung?.[s.projekt.id] ?? 0), 0);

  return (
    <div className="grid gap-4 2xl:grid-cols-[1fr_320px]">
      <div className="rounded-xl bg-gradient-to-br from-violet-50 to-sky-50 p-2 dark:from-slate-800 dark:to-slate-900">
        <svg viewBox={`0 0 ${breite} ${hoehe}`} className="w-full" role="img" aria-label="Forschungsbaum">
          {/* Laborkulisse */}
          <g opacity="0.12" fill="#7c3aed">
            <path d={`M${breite - 70} 20 h24 v40 l22 50 a8 8 0 0 1 -7 11 h-54 a8 8 0 0 1 -7 -11 l22 -50 z`} />
            <circle cx={breite - 40} cy={hoehe - 40} r="28" />
          </g>
          {/* Verbindungen */}
          {status.map((s) => {
            const [x, y] = pos(s.projekt.spalte, s.projekt.zeile);
            const quellen = s.projekt.voraussetzungen.length ? s.projekt.voraussetzungen.map((v) => FORSCHUNG.find((f) => f.id === v)!) : [null];
            return quellen.map((q, i) => {
              const [qx, qy] = q ? pos(q.spalte, q.zeile) : start;
              const fertig = q ? status.find((x) => x.projekt.id === q.id)!.fertig : true;
              return (
                <path
                  key={`${s.projekt.id}-${i}`}
                  d={`M${qx + R + 8} ${qy} C ${qx + SP / 2} ${qy}, ${x - SP / 2} ${y}, ${x - R - 8} ${y}`}
                  fill="none"
                  stroke={fertig ? '#10b981' : '#cbd5e1'}
                  strokeWidth="3"
                  strokeDasharray={fertig ? undefined : '6 6'}
                />
              );
            });
          })}
          {/* Start: Stadtrad */}
          <g transform={`translate(${start[0]} ${start[1]})`}>
            <circle r={R} fill="#ecfdf5" stroke="#10b981" strokeWidth="4" />
            <foreignObject x={-30} y={-22} width={60} height={40}>
              <div className="grid h-full w-full place-items-center"><BikeIcon produkt="stadtrad" className="h-9 w-14" /></div>
            </foreignObject>
            <text y={R + 24} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">Stadtrad</text>
            <text y={R + 40} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">Startprodukt</text>
          </g>
          {status.map((s) => {
            const [x, y] = pos(s.projekt.spalte, s.projekt.zeile);
            return <Knoten key={s.projekt.id} st={s} x={x} y={y} budget={d.forschung?.[s.projekt.id] ?? 0} gewaehlt={auswahl === s.projekt.id} onClick={() => setAuswahl(s.projekt.id)} />;
          })}
        </svg>
        <div className="muted px-2 pb-1 text-xs">
          Klicke auf ein Projekt. Laufende Projekte pulsieren. {laufend.length > 0 ? `Forschung in diesem Quartal: ${eurKompakt(summe)} für ${laufend.map((s) => s.projekt.name).join(', ')}.` : 'Derzeit wird nicht geforscht.'}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--line)] p-4">
        <div className="flex items-center gap-3">
          <BikeIcon produkt={st.projekt.produkt} className="h-10 w-16" />
          <div>
            <div className="text-lg font-bold">{st.projekt.name}</div>
            <div className="muted text-xs">ergibt: {PRODUKTE[st.projekt.produkt].name}</div>
          </div>
        </div>
        <p className="mt-2 text-sm">{st.projekt.beschreibung}</p>
        <dl className="tnum mt-3 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="muted">Kosten gesamt</dt><dd className="text-right">{eurKompakt(st.projekt.kosten)}</dd>
          <dt className="muted">Bereits investiert</dt><dd className="text-right">{eurKompakt(st.investiert)}</dd>
          <dt className="muted">Mindestdauer</dt><dd className="text-right">{st.projekt.mindestQuartale} Quartale ({st.quartale} erledigt)</dd>
          <dt className="muted">Referenzpreis</dt><dd className="text-right">{eurKompakt(PRODUKTE[st.projekt.produkt].referenzpreis)}</dd>
        </dl>
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Erwarteter Markt in Deutschland</div>
          <Lebenszyklus produkt={st.projekt.produkt} ab={state.quartal} />
          <div className="muted text-xs">{PRODUKTE[st.projekt.produkt].lebenszyklus.text}</div>
        </div>
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          {st.fertig ? (
            <p className="text-sm font-semibold text-emerald-700">Erforscht – das Produkt ist im Programm. Preise und Produktion stellst du oben ein.</p>
          ) : !st.offen ? (
            <p className="text-sm text-slate-600">🔒 Erst erforschen: {st.projekt.voraussetzungen.map((v) => FORSCHUNG.find((f) => f.id === v)!.name).join(' und ')}.</p>
          ) : st.investiert >= st.projekt.kosten ? (
            <p className="text-sm font-semibold">Voll finanziert – fertig nach Ablauf der Mindestdauer.</p>
          ) : (
            <>
              <NumberField
                label="Forschungsbudget je Quartal"
                unit="€"
                value={budget}
                min={0}
                max={Math.round(st.projekt.kosten - st.investiert)}
                sliderMax={Math.round(st.projekt.kosten - st.investiert)}
                step={10_000}
                tastenSchritt={50_000}
                onChange={(v) => aendere((x) => { x.forschung = { ...(x.forschung ?? {}), [auswahl]: v }; })}
              />
              <p className={`mt-1 text-sm ${rest === Infinity ? 'text-amber-700' : 'text-emerald-700'}`}>
                {rest === Infinity ? 'Ohne Budget geht es nicht voran.' : `Fertig in ca. ${fmt0(rest)} Quartal${rest > 1 ? 'en' : ''} (${quartalLabel(state.quartal + rest)}).`}
              </p>
              <p className="muted mt-1 text-xs">Das Budget läuft weiter, bis du es änderst oder das Projekt fertig ist. Es zählt als F&E-Aufwand in der GuV.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
