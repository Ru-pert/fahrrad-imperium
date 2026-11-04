/**
 * Bildliche Darstellungen der Abteilungen: Team (HR), Marketing, Lieferkette, Finanzen, Preise.
 * Reine SVG-Grafiken, die die aktuellen Zahlen „zum Anfassen“ zeigen.
 */
import { motion } from 'framer-motion';
import {
  BALANCE,
  LIEFERANTEN,
  REGIONEN,
  aktiveProdukte,
  aktiveRegionen,
  kreditlimit,
  referenzPreis,
  type Decisions,
  type GameState,
  type Komponente,
  type QuarterReport,
  type SupplierLevel,
} from '../../engine';
import { useGame } from '../../store/gameStore';
import { eurKompakt, fmt0, pct } from '../format';
import { BikeIcon, PRODUKT_FARBE } from './BikeIcon';
import { Icon, Info } from './ui';

function Rahmen({ children, farbe, titel, untertitel, info }: { children: React.ReactNode; farbe: string; titel: string; untertitel?: string; info?: React.ReactNode }) {
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-[var(--line)]" style={{ background: `linear-gradient(135deg, ${farbe}14, transparent 70%)` }}>
      <div className="flex items-baseline justify-between px-3 pt-2">
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest" style={{ color: farbe }}>{titel}{info && <span className="normal-case tracking-normal"><Info titel={titel}>{info}</Info></span>}</span>
        {untertitel && <span className="muted text-xs">{untertitel}</span>}
      </div>
      <div className="p-3 pt-1">{children}</div>
    </div>
  );
}

// ------------------------------------------------------------------ Team (HR)

function Figur({ farbe, neu, weg, hut, i, reduziert }: { farbe: string; neu?: boolean; weg?: boolean; hut?: boolean; i: number; reduziert: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 20 30"
      className="h-8 w-[22px]"
      initial={neu && !reduziert ? { x: 30, opacity: 0 } : false}
      animate={weg && !reduziert ? { opacity: [1, 0.25, 1] } : { x: 0, opacity: 1 }}
      transition={weg ? { duration: 1.4, repeat: Infinity } : { delay: (i % 12) * 0.04, duration: 0.5 }}
    >
      <circle cx="10" cy="7" r="5" fill="#fcd34d" />
      <path d="M2 29 C2 18 18 18 18 29 Z" fill={weg ? '#f43f5e' : farbe} />
      {hut && <path d="M3 4 L10 1 L17 4 L10 7 Z" fill="#0f172a" />}
      {neu && <circle cx="17" cy="3" r="3" fill="#10b981" />}
    </motion.svg>
  );
}

/** Team des Werks: Figuren eingefärbt nach Motivation, neue Leute grün markiert, Entlassungen rot, Schulung als Hut */
export function TeamSzene({ state, d, werkId }: { state: GameState; d: Decisions; werkId: string }) {
  const reduziert = useGame((s) => s.reduziert);
  const w = state.werke.find((x) => x.id === werkId);
  if (!w) return null;
  const e = d.werke[werkId];
  const proFigur = Math.max(1, Math.ceil((w.mitarbeitende + Math.max(0, e?.personalAenderung ?? 0)) / 48));
  const bestand = Math.round(w.mitarbeitende / proFigur);
  const neu = Math.round(Math.max(0, e?.personalAenderung ?? 0) / proFigur);
  const weg = Math.round(Math.max(0, -(e?.personalAenderung ?? 0)) / proFigur);
  const schulAnteil = Math.min(1, (e?.schulungProKopf ?? 0) / 1500);
  const farbe = w.motivation >= 1.02 ? '#10b981' : w.motivation >= 0.92 ? '#f59e0b' : '#ef4444';
  const gesicht = w.motivation >= 1.02 ? '😄' : w.motivation >= 0.92 ? '🙂' : '😟';
  const sterne = Math.round(((w.kompetenz - 0.9) / 0.25) * 5);
  return (
    <Rahmen farbe="#2563eb" titel={`Team ${w.name}`} untertitel={`1 Figur = ${proFigur} Person${proFigur > 1 ? 'en' : ''}`}>
      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: bestand }, (_, i) => (
          <Figur key={`b${i}`} i={i} farbe={farbe} weg={i >= bestand - weg} hut={i < Math.round(bestand * schulAnteil)} reduziert={reduziert} />
        ))}
        {Array.from({ length: neu }, (_, i) => <Figur key={`n${i}`} i={i} farbe="#34d399" neu reduziert={reduziert} />)}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
        <div><div className="text-lg font-bold">{w.mitarbeitende}{(e?.personalAenderung ?? 0) !== 0 && <span className={(e?.personalAenderung ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}> {(e?.personalAenderung ?? 0) > 0 ? '+' : ''}{e?.personalAenderung}</span>}</div><div className="muted">Mitarbeitende</div></div>
        <div><div className="text-lg">{gesicht}</div><div className="muted">Motivation {w.motivation.toFixed(2).replace('.', ',')}</div></div>
        <div><div className="text-sm text-amber-500">{'★'.repeat(Math.max(0, Math.min(5, sterne)))}<span className="text-slate-300">{'★'.repeat(5 - Math.max(0, Math.min(5, sterne)))}</span></div><div className="muted">Kompetenz</div></div>
        <div><div className="text-lg">🎓</div><div className="muted">{fmt0(e?.schulungProKopf ?? 0)} €/Kopf</div></div>
      </div>
    </Rahmen>
  );
}

// ------------------------------------------------------------------ Marketing

/** Plakatwand und Bekanntheit je Region als „100 Menschen“-Raster */
export function MarketingSzene({ state, d, vorschau }: { state: GameState; d: Decisions; vorschau: QuarterReport | null }) {
  const reduziert = useGame((s) => s.reduziert);
  const regionen = aktiveRegionen(state);
  const gesamt = aktiveProdukte(state).reduce((s, p) => s + regionen.reduce((a, r) => a + (d.marketing[p]?.[r] ?? 0), 0), 0);
  const mStar = (vorschau?.segmente ?? []).filter((s) => regionen.includes(s.region)).reduce((a, s) => a + (s.marketing.spieler !== undefined ? 1 : 0), 0);
  const lautstaerke = Math.min(3, Math.round(gesamt / 50_000));
  void mStar;
  return (
    <Rahmen farbe="#db2777" titel="Marketing & Marke" untertitel={`${eurKompakt(gesamt)} Werbung in diesem Quartal`} info="Jeder Punkt steht für 1 % der Menschen in der Region. Werbung baut Bekanntheit langsam auf, ohne Werbung geht sie zurück.">
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <svg viewBox="0 0 220 120" className="w-full max-w-[260px]">
          <rect x="20" y="10" width="160" height="70" rx="4" fill="#fff" stroke="#db2777" strokeWidth="3" />
          <rect x="95" y="80" width="10" height="34" fill="#94a3b8" />
          <text x="100" y="40" textAnchor="middle" fontSize="15" fontWeight="900" fill={state.unternehmen.farbe}>{state.unternehmen.name.replace(/ (GmbH|AG)$/, '')}</text>
          <text x="100" y="60" textAnchor="middle" fontSize="10" fill="#475569">Räder, die bewegen.</text>
          <g transform="translate(190 46)">
            <path d="M-8 -8 L8 -14 L8 14 L-8 8 Z" fill="#db2777" />
            {Array.from({ length: lautstaerke }, (_, i) => (
              <motion.path
                key={i}
                d={`M${14 + i * 7} -10 Q${20 + i * 7} 0 ${14 + i * 7} 10`}
                stroke="#db2777"
                strokeWidth="2"
                fill="none"
                animate={reduziert ? undefined : { opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </g>
        </svg>
        <div className="grid gap-3 md:grid-cols-2">
          {regionen.map((r) => {
            const b = state.regionen[r]?.bekanntheit ?? 0;
            const gefuellt = Math.round(b * 100);
            return (
              <div key={r}>
                <div className="flex justify-between text-xs"><span className="font-semibold">{REGIONEN[r].name}</span><span className="tnum">{pct(b, 1)} kennen dich</span></div>
                <div className="mt-1 grid max-w-[360px] grid-cols-[repeat(20,1fr)] gap-[3px]">
                  {Array.from({ length: 100 }, (_, i) => (
                    <div key={i} className="aspect-square min-h-[8px] rounded-full" style={{ background: i < gefuellt ? state.unternehmen.farbe : '#cbd5e1' }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Rahmen>
  );
}

// ------------------------------------------------------------------ Lieferkette

const STUFE_EURO: Record<SupplierLevel, string> = { billig: '€', standard: '€€', premium: '€€€' };
const STUFE_FARBE: Record<SupplierLevel, string> = { billig: '#f59e0b', standard: '#64748b', premium: '#7c3aed' };
const KOMP_ICON: Record<Komponente, string> = { rahmen: 'werk', akku: 'akku', antrieb: 'produktion' };

/** Fluss: Lieferanten → Werke → Märkte, mit Qualität, Kosten und Ausfallrisiko */
export function LieferketteSzene({ state, d }: { state: GameState; d: Decisions }) {
  const reduziert = useGame((s) => s.reduziert);
  const regionen = aktiveRegionen(state);
  const werke = state.werke.filter((w) => (w.status ?? 'aktiv') === 'aktiv');
  const komp: Komponente[] = ['rahmen', 'antrieb', 'akku'];
  const pfeil = (key: string) => (
    <svg key={key} viewBox="0 0 60 20" className="h-5 w-12 shrink-0">
      <motion.line x1="0" y1="10" x2="52" y2="10" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 5" animate={reduziert ? undefined : { strokeDashoffset: [22, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
      <path d="M50 4 L58 10 L50 16 Z" fill="#94a3b8" />
    </svg>
  );
  return (
    <Rahmen farbe="#0891b2" titel="Lieferkette" untertitel="Lieferanten → Werke → Märkte" info="€ = Billig (günstig, Qualität 0,90, fällt öfter aus) · €€ = Standard · €€€ = Premium (teuer, Qualität 1,10, zuverlässig). E-Modelle brauchen zusätzlich Akkus.">
      <div className="flex flex-wrap items-center gap-2">
        <div className="space-y-1.5">
          {komp.map((k) => {
            const l = d.lieferanten[k];
            return (
              <div key={k} className="flex w-44 items-center gap-2 rounded-lg border bg-[var(--card)] px-2 py-1" style={{ borderColor: STUFE_FARBE[l] }}>
                <Icon name={KOMP_ICON[k]} className="h-4 w-4" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold capitalize">{k}</div>
                  <div className="muted">{LIEFERANTEN[l].label} · Ausfall {pct(LIEFERANTEN[l].ausfall, 0)}</div>
                </div>
                <span className="text-xs font-bold" style={{ color: STUFE_FARBE[l] }}>{STUFE_EURO[l]}</span>
              </div>
            );
          })}
        </div>
        {pfeil('a')}
        <div className="space-y-1.5">
          {werke.map((w) => (
            <div key={w.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 py-1.5 text-xs">
              <Icon name="werke" className="h-5 w-5" />
              <div><div className="font-semibold">{w.name}</div><div className="muted">{w.linien.length} Linien</div></div>
            </div>
          ))}
        </div>
        {pfeil('b')}
        <div className="flex flex-wrap gap-1.5">
          {aktiveProdukte(state).map((p) => <BikeIcon key={p} produkt={p} className="h-7 w-11" />)}
        </div>
        {pfeil('c')}
        <div className="space-y-1">
          {regionen.map((r) => (
            <div key={r} className="flex items-center gap-1 rounded-lg bg-[var(--card)] px-2 py-1 text-xs"><Icon name="lieferkette" className="h-4 w-4" />{REGIONEN[r].name}</div>
          ))}
        </div>
      </div>
    </Rahmen>
  );
}

// ------------------------------------------------------------------ Finanzen

/** Tresor: Kasse als Münzstapel, Kredite als Gewichte, Kreditlimit als Balken, Rating als Siegel */
export function FinanzSzene({ state, d }: { state: GameState; d: Decisions }) {
  const kasse = state.finanzen.kasse;
  const schulden = state.finanzen.kredite.reduce((s, k) => s + k.restbetrag, 0) + state.finanzen.kontokorrent;
  const limit = kreditlimit(state);
  const skala = Math.max(kasse, schulden + d.finanzen.darlehenNeu, limit, 1);
  const stapel = (wert: number) => Math.max(0, Math.min(14, Math.round((wert / skala) * 14)));
  const muenzen = stapel(kasse);
  const neuMuenzen = stapel(d.finanzen.darlehenNeu);
  const gewichte = stapel(schulden);
  const ratingIdx = (BALANCE.finanzen.ratingStufen as readonly string[]).indexOf(state.finanzen.rating);
  const ratingFarbe = ratingIdx <= 2 ? '#10b981' : ratingIdx <= 4 ? '#f59e0b' : '#ef4444';
  return (
    <Rahmen farbe="#16a34a" titel="Tresor" untertitel={`Rating ${state.finanzen.rating}`}>
      <div className="flex flex-wrap items-end gap-6">
        <svg viewBox="0 0 90 150" className="h-36 w-20">
          {Array.from({ length: muenzen }, (_, i) => <ellipse key={i} cx="45" cy={138 - i * 9} rx="30" ry="7" fill="#facc15" stroke="#ca8a04" />)}
          {Array.from({ length: neuMuenzen }, (_, i) => <ellipse key={`n${i}`} cx="45" cy={138 - (muenzen + i) * 9} rx="30" ry="7" fill="#fde68a" stroke="#ca8a04" strokeDasharray="3 2" />)}
          <text x="45" y="149" textAnchor="middle" fontSize="9" fill="currentColor">Kasse</text>
        </svg>
        <svg viewBox="0 0 90 150" className="h-36 w-20">
          {Array.from({ length: gewichte }, (_, i) => <rect key={i} x="18" y={130 - i * 9} width="54" height="8" rx="2" fill="#64748b" />)}
          <text x="45" y="149" textAnchor="middle" fontSize="9" fill="currentColor">Schulden</text>
        </svg>
        <div className="min-w-[260px] flex-1 space-y-2 text-sm">
          <div className="flex justify-between"><span>💰 Kasse</span><strong className="tnum">{eurKompakt(kasse)}</strong></div>
          <div className="flex justify-between"><span>⛓️ Darlehen + Kontokorrent</span><strong className="tnum">{eurKompakt(schulden)}</strong></div>
          {d.finanzen.darlehenNeu > 0 && <div className="flex justify-between text-emerald-700"><span>➕ neues Darlehen</span><strong className="tnum">{eurKompakt(d.finanzen.darlehenNeu)}</strong></div>}
          <div>
            <div className="flex justify-between text-xs"><span>Kreditrahmen genutzt</span><span className="tnum">{eurKompakt(schulden)} / {eurKompakt(limit)}</span></div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/10">
              <div className={`h-full rounded-full ${schulden > limit ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (schulden / Math.max(1, limit)) * 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 text-xl font-black" style={{ borderColor: ratingFarbe, color: ratingFarbe }}>
          {state.finanzen.rating}
        </div>
      </div>
    </Rahmen>
  );
}

// ------------------------------------------------------------------ Preise

/** Preisschilder je Produkt auf einer Skala: eigener Preis vs. Marktdurchschnitt und Referenz */
export function PreisSzene({ state, d, vorschau }: { state: GameState; d: Decisions; vorschau: QuarterReport | null }) {
  const regionen = aktiveRegionen(state);
  const r = regionen[0];
  return (
    <Rahmen farbe="#0d9488" titel={`Preisschilder ${REGIONEN[r].name}`} untertitel="links günstig · rechts teuer" info={<>Liegt dein Preisschild links vom Marktdurchschnitt, bist du günstiger – das bringt Nachfrage (beim Stadtrad stärker als bei teuren Rädern), kostet aber Marge.</>}>
      <div className="space-y-3">
        {aktiveProdukte(state).map((p) => {
          const ref = referenzPreis(r, p);
          const preis = d.preis[p]?.[r] ?? ref;
          const markt = vorschau?.segmente.find((s) => s.produkt === p && s.region === r)?.durchschnittspreis ?? ref;
          const pos = (x: number) => `${Math.min(100, Math.max(0, ((x / ref - 0.6) / 0.9) * 100))}%`;
          return (
            <div key={p} className="grid grid-cols-[56px_1fr] items-center gap-2">
              <BikeIcon produkt={p} className="h-8 w-14" />
              <div className="relative h-10">
                <div className="absolute inset-x-0 top-5 h-1.5 rounded-full bg-gradient-to-r from-emerald-300 via-slate-200 to-rose-300" />
                <div className="absolute top-3 h-5 w-0.5 bg-slate-500" style={{ left: pos(markt) }} title="Marktdurchschnitt" />
                <div className="muted absolute top-8 -translate-x-1/2 text-[10px]" style={{ left: pos(markt) }}>Ø Markt</div>
                <motion.div className="absolute -top-0.5 -translate-x-1/2" initial={false} animate={{ left: pos(preis) }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                  <div className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white shadow" style={{ background: PRODUKT_FARBE[p] }}>
                    🏷️ {eurKompakt(preis)}
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </Rahmen>
  );
}
