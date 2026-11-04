import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { PRODUKTE, quartalLabel, type Decisions, type GameState, type ProductId } from '../../engine';
import { EPOCHEN, FEATURES, type FeatureProjekt, type FeatureWirkung } from '../../engine/config/features';
import { alleFeatures, istErforscht, projektName, restQuartale, type ProjektStatus } from '../../engine/forschung';
import { useGame } from '../../store/gameStore';
import { eurKompakt, fmt0, pct } from '../format';
import { BikeBild, BikeIcon } from './BikeIcon';
import { FeatureBild } from './FeatureBild';
import { Icon, Info, NumberField } from './ui';

const SP = 200;
const ZE = 128;
const R = 34;
const X0 = 100;
const Y0 = 112;

const pos = (f: FeatureProjekt) => [X0 + (f.epoche - 1) * SP, Y0 + f.zeile * ZE] as const;

function Knoten({ st, budget, gewaehlt, onClick }: { st: ProjektStatus<FeatureProjekt>; budget: number; gewaehlt: boolean; onClick: () => void }) {
  const reduziert = useGame((s) => s.reduziert);
  const [x, y] = pos(st.projekt);
  const ep = EPOCHEN[st.projekt.epoche];
  const farbe = st.fertig ? '#10b981' : st.offen ? ep.farbe : '#94a3b8';
  const umfang = 2 * Math.PI * (R + 5);
  const aktiv = budget > 0 && !st.fertig;
  return (
    <g transform={`translate(${x} ${y})`} className="cursor-pointer" onClick={onClick}>
      {aktiv && !reduziert && (
        <motion.circle r={R + 9} fill="none" stroke={farbe} strokeWidth="2" initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 1.35 }} transition={{ duration: 1.6, repeat: Infinity }} />
      )}
      <circle r={R + 5} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <motion.circle
        r={R + 5} fill="none" stroke={farbe} strokeWidth="6" strokeLinecap="round" transform="rotate(-90)" strokeDasharray={umfang}
        initial={false} animate={{ strokeDashoffset: umfang * (1 - st.anteil) }} transition={{ duration: 0.8 }}
      />
      <circle r={R} fill={st.fertig ? '#ecfdf5' : st.offen ? '#ffffff' : '#f1f5f9'} stroke={gewaehlt ? '#0f172a' : 'none'} strokeWidth="2.5" />
      <g opacity={st.offen || st.fertig ? 1 : 0.35} transform="translate(-24 -24)">
        <FeatureBild bild={st.projekt.bild} groesse={48} bewegt={!reduziert && (st.fertig || gewaehlt || aktiv)} />
      </g>
      {st.fertig && (
        <g transform={`translate(${R - 5} ${-R + 5})`}>
          <circle r="10" fill="#10b981" />
          <path d="M-4.5 0 l3 3 l6 -6.5" stroke="#fff" strokeWidth="2.3" fill="none" />
        </g>
      )}
      {!st.offen && !st.fertig && (
        <g transform={`translate(${R - 5} ${-R + 5})`}>
          <circle r="10" fill="#64748b" />
          <rect x="-4" y="-1" width="8" height="6.5" rx="1" fill="#fff" />
          <path d="M-2.7 -1 v-2.3 a2.7 2.7 0 0 1 5.4 0 v2.3" stroke="#fff" strokeWidth="1.5" fill="none" />
        </g>
      )}
      <text y={R + 21} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{kurz(st.projekt.name)}</text>
      <text y={R + 35} textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.7">
        {st.fertig ? 'erforscht ✓' : `${pct(st.anteil, 0)} von ${eurKompakt(st.projekt.kosten)}`}
      </text>
    </g>
  );
}

const kurz = (n: string) => (n.length > 24 ? n.replace(' mit Autopilot-Schaltung', '').replace('Hydraulische ', '').replace(' & Nabendynamo', ' + Dynamo') : n);

const WIRKUNG_TEXT: { key: keyof FeatureWirkung; label: string; icon: string; fmt: (v: number) => string; gut: (v: number) => boolean }[] = [
  { key: 'nachfrage', label: 'Nachfrage', icon: 'nachfrage', fmt: (v) => `${v > 0 ? '+' : ''}${pct(v, 0)}`, gut: (v) => v > 0 },
  { key: 'technik', label: 'Technik', icon: 'technik', fmt: (v) => `${v > 0 ? '+' : ''}${v.toLocaleString('de-DE', { maximumFractionDigits: 2 })}`, gut: (v) => v > 0 },
  { key: 'qualitaet', label: 'Qualität', icon: 'qualitaet', fmt: (v) => `${v > 0 ? '+' : ''}${fmt0(v * 100)} Pkt.`, gut: (v) => v > 0 },
  { key: 'image', label: 'Image', icon: 'image', fmt: (v) => `${v > 0 ? '+' : ''}${v.toLocaleString('de-DE')} Pkt.`, gut: (v) => v > 0 },
  { key: 'nachhaltigkeit', label: 'Nachhaltigkeit', icon: 'nachhaltigkeit', fmt: (v) => `${v > 0 ? '+' : ''}${v.toLocaleString('de-DE')} Pkt.`, gut: (v) => v > 0 },
  { key: 'material', label: 'Materialkosten', icon: 'lager', fmt: (v) => `${v > 0 ? '+' : ''}${pct(v, 0)}`, gut: (v) => v < 0 },
];

export function Wirkungen({ w }: { w: FeatureWirkung }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WIRKUNG_TEXT.filter((x) => w[x.key]).map((x) => {
        const v = w[x.key]!;
        return (
          <span key={x.key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${x.gut(v) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'}`}>
            <Icon name={x.icon} className="h-3.5 w-3.5" /> {x.label} {x.fmt(v)}
          </span>
        );
      })}
    </div>
  );
}

const imProgramm = (s: GameState): ProductId[] => (Object.keys(s.produkte) as ProductId[]).filter((p) => s.produkte[p]);
const fertigeFeatures = (s: GameState) => FEATURES.filter((f) => istErforscht(s, f.id)).map((f) => f.id);

/** Galerie: alle eigenen Modelle mit ihrer aktuellen Ausstattung */
export function ModellGalerie({ state }: { state: GameState }) {
  const fertig = fertigeFeatures(state);
  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
      {imProgramm(state).map((p) => {
        const anzahl = FEATURES.filter((f) => fertig.includes(f.id) && f.fuer.includes(p)).length;
        return (
          <div key={p} className="rounded-xl border border-[var(--line)] bg-white/60 px-2 pb-1.5 pt-1 text-center dark:bg-slate-900/40">
            <BikeBild produkt={p} features={fertig.filter((id) => FEATURES.find((f) => f.id === id)!.fuer.includes(p))} className="mx-auto h-16 w-24" />
            <div className="text-sm font-semibold">{PRODUKTE[p].name}</div>
            <div className="muted text-[11px]">{anzahl ? `${anzahl} Feature${anzahl > 1 ? 's' : ''}` : 'Grundausstattung'}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Feature-Forschung: fünf Epochen von realistisch bis völlig irre, jedes Feature mit eigenem Bild */
export function FeatureBaum({ state, d, aendere }: { state: GameState; d: Decisions; aendere: (fn: (d: Decisions) => void) => void }) {
  const status = useMemo(() => alleFeatures(state), [state]);
  const [auswahl, setAuswahl] = useState<string>(() => status.find((s) => s.offen && !s.fertig)?.projekt.id ?? FEATURES[0].id);
  const st = status.find((s) => s.projekt.id === auswahl)!;
  const programm = imProgramm(state);
  const passend = st.projekt.fuer.filter((p) => programm.includes(p));
  const [vorschauRad, setVorschauRad] = useState<ProductId | null>(null);
  const rad = vorschauRad && st.projekt.fuer.includes(vorschauRad) ? vorschauRad : passend[0] ?? st.projekt.fuer[0];
  const fertig = fertigeFeatures(state);
  const radFeatures = [...new Set([...fertig, st.projekt.id])].filter((id) => FEATURES.find((f) => f.id === id)!.fuer.includes(rad));
  const budget = d.forschung?.[auswahl] ?? 0;
  const rest = restQuartale(st, budget);
  const laufend = status.filter((s) => (d.forschung?.[s.projekt.id] ?? 0) > 0 && !s.fertig);
  const summe = laufend.reduce((a, s) => a + (d.forschung?.[s.projekt.id] ?? 0), 0);
  const ep = EPOCHEN[st.projekt.epoche];
  const breite = X0 + 4 * SP + 100;
  const hoehe = Y0 + 3 * ZE + 84;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--line)] p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Deine Modelle mit Ausstattung</div>
        <ModellGalerie state={state} />
      </div>
      <div className="grid gap-4">
        <div className="overflow-x-auto rounded-xl bg-gradient-to-r from-sky-50 via-violet-50 to-pink-50 p-2 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
          <svg viewBox={`0 0 ${breite} ${hoehe}`} className="w-full min-w-[720px]" role="img" aria-label="Feature-Forschungsbaum">
            {/* Epochen-Bänder */}
            {([1, 2, 3, 4, 5] as const).map((e) => {
              const x = X0 + (e - 1) * SP;
              return (
                <g key={e}>
                  <rect x={x - SP / 2 + 6} y={8} width={SP - 12} height={hoehe - 16} rx="16" fill={EPOCHEN[e].farbe} opacity="0.07" />
                  <text x={x} y={30} textAnchor="middle" fontSize="14" fontWeight="800" fill={EPOCHEN[e].farbe}>{e}. {EPOCHEN[e].name}</text>
                  <text x={x} y={46} textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.6">{EPOCHEN[e].text}</text>
                  <text x={x} y={60} textAnchor="middle" fontSize="12">{'🤪'.repeat(e - 1) || '🔧'}</text>
                </g>
              );
            })}
            {/* Verbindungen */}
            {status.flatMap((s) => {
              const [x, y] = pos(s.projekt);
              return s.projekt.voraussetzungen.map((v) => {
                const q = FEATURES.find((f) => f.id === v);
                const ok = istErforscht(state, v);
                if (!q) {
                  return (
                    <text key={`${s.projekt.id}-${v}`} x={x - R - 6} y={y - R - 4} textAnchor="end" fontSize="9.5" fill={ok ? '#059669' : '#64748b'}>
                      {ok ? '✓' : '🔒'} {projektName(v)}
                    </text>
                  );
                }
                const [qx, qy] = pos(q);
                return (
                  <path
                    key={`${s.projekt.id}-${v}`}
                    d={`M${qx + R + 6} ${qy} C ${qx + SP / 2} ${qy}, ${x - SP / 2} ${y}, ${x - R - 6} ${y}`}
                    fill="none" stroke={ok ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" strokeDasharray={ok ? undefined : '5 5'}
                  />
                );
              });
            })}
            {status.map((s) => (
              <Knoten key={s.projekt.id} st={s} budget={d.forschung?.[s.projekt.id] ?? 0} gewaehlt={auswahl === s.projekt.id} onClick={() => setAuswahl(s.projekt.id)} />
            ))}
          </svg>
          <div className="muted px-2 pb-1 text-xs">
            Je weiter rechts, desto abgedrehter – und teurer. <Info titel="Feature-Forschung">Features verbessern deine Räder dauerhaft: mehr Nachfrage, Technik, Qualität, Image oder Nachhaltigkeit – manche erhöhen aber die Materialkosten oder haben Nebenwirkungen. Die Konkurrenz hat keine Features, damit kannst du dich absetzen.</Info> {laufend.length > 0 ? `Feature-Forschung in diesem Quartal: ${eurKompakt(summe)} für ${laufend.map((s) => s.projekt.name).join(', ')}.` : 'Derzeit wird an keinem Feature geforscht.'}
          </div>
        </div>

        <motion.div key={auswahl} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 rounded-xl border border-[var(--line)] p-4 lg:grid-cols-2">
          <div>
          <div className="flex items-start gap-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl" style={{ background: `${ep.farbe}18` }}>
              <FeatureBild bild={st.projekt.bild} className="h-16 w-16" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: ep.farbe }}>Epoche {st.projekt.epoche} · {ep.name}</div>
              <div className="text-lg font-bold leading-tight">{st.projekt.name}</div>
              <div className="text-sm italic text-slate-600 dark:text-slate-300">„{st.projekt.slogan}“</div>
            </div>
          </div>
          <p className="mt-2 text-sm">{st.projekt.beschreibung}</p>
          <div className="mt-2"><Wirkungen w={st.projekt.wirkung} /></div>
          <dl className="tnum mt-3 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="muted">Kosten gesamt</dt><dd className="text-right">{eurKompakt(st.projekt.kosten)}</dd>
            <dt className="muted">Bereits investiert</dt><dd className="text-right">{eurKompakt(st.investiert)}</dd>
            <dt className="muted">Mindestdauer</dt><dd className="text-right">{st.projekt.mindestQuartale} Quartale ({st.quartale} erledigt)</dd>
          </dl>
          </div>
          <div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide">{st.fertig ? 'So sieht dein Rad aus' : 'Vorschau mit Feature'}</div>
              <div className="flex gap-1">
                {st.projekt.fuer.map((p) => (
                  <button key={p} title={PRODUKTE[p].name} onClick={() => setVorschauRad(p)} className={`rounded-md p-0.5 ${p === rad ? 'bg-white shadow dark:bg-slate-700' : 'opacity-60 hover:opacity-100'}`}>
                    <BikeIcon produkt={p} className="h-5 w-8" farbe={programm.includes(p) ? undefined : '#94a3b8'} />
                  </button>
                ))}
              </div>
            </div>
            <BikeBild produkt={rad} features={radFeatures} className="mx-auto h-36 w-60" />
            <div className="muted text-center text-[11px]">
              {PRODUKTE[rad].name}{programm.includes(rad) ? '' : ' (noch nicht im Programm)'} · gilt für {st.projekt.fuer.map((p) => PRODUKTE[p].kurz).join(', ')}
            </div>
          </div>
          <div className="mt-3 border-t border-[var(--line)] pt-3">
            {st.fertig ? (
              <p className="text-sm font-semibold text-emerald-700">Erforscht – wirkt dauerhaft auf alle passenden Räder, auch auf später entwickelte.</p>
            ) : !st.offen ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">🔒 Erst erforschen: {st.projekt.voraussetzungen.filter((v) => !istErforscht(state, v)).map(projektName).join(' und ')}.</p>
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
                  info="Fertig, wenn das investierte Budget die Kosten erreicht UND die Mindestdauer vorbei ist. Ab dem Quartal danach wirkt das Feature dauerhaft auf alle passenden Räder – auch auf später entwickelte."
                  onChange={(v) => aendere((x) => { x.forschung = { ...(x.forschung ?? {}), [auswahl]: v }; })}
                />
                <p className={`mt-1 text-sm ${rest === Infinity ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {rest === Infinity ? 'Ohne Budget geht es nicht voran.' : `Fertig in ca. ${fmt0(rest)} Quartal${rest > 1 ? 'en' : ''} (${quartalLabel(state.quartal + rest)}), wirkt ab dem Quartal danach.`}
                </p>
                {passend.length === 0 && <p className="mt-1 text-xs text-amber-700">Achtung: Du baust noch keines der passenden Räder – das Feature wirkt erst, wenn du eins entwickelst.</p>}
              </>
            )}
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
