import { useEffect, useState } from 'react';
import { quartalLabel, type GameState, type QuarterReport } from '../../engine';
import { FirmenLogo, ciVon } from './FirmenLogo';
import { useGame } from '../../store/gameStore';
import { eurKompakt } from '../format';

const SAISON = [
  { name: 'Winter', text: 'ruhige Zeit – rund 25 % weniger Nachfrage', himmel: ['#bfdbfe', '#eff6ff'], huegel: ['#e2e8f0', '#cbd5e1'], partikel: 'schnee' },
  { name: 'Frühling', text: 'Hochsaison – rund 30 % mehr Nachfrage', himmel: ['#bae6fd', '#f0fdf4'], huegel: ['#86efac', '#4ade80'], partikel: 'bluete' },
  { name: 'Sommer', text: 'Saison läuft – rund 15 % mehr Nachfrage', himmel: ['#7dd3fc', '#fefce8'], huegel: ['#a3e635', '#65a30d'], partikel: 'sonne' },
  { name: 'Herbst', text: 'es wird kühler – rund 20 % weniger Nachfrage', himmel: ['#fed7aa', '#fff7ed'], huegel: ['#fdba74', '#ea580c'], partikel: 'laub' },
] as const;

type Tageszeit = 'morgen' | 'tag' | 'abend' | 'nacht';
const TAGESZEIT_NAME: Record<Tageszeit, string> = { morgen: 'Morgen', tag: 'Tag', abend: 'Abend', nacht: 'Nacht' };
function tageszeitJetzt(): Tageszeit {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return 'morgen';
  if (h >= 8 && h < 18) return 'tag';
  if (h >= 18 && h < 21) return 'abend';
  return 'nacht';
}
/** Aktuelle Tageszeit (aktualisiert sich jede Minute) */
function useTageszeit(): Tageszeit {
  const [tz, setTz] = useState(tageszeitJetzt);
  useEffect(() => {
    const i = window.setInterval(() => setTz(tageszeitJetzt()), 60_000);
    return () => window.clearInterval(i);
  }, []);
  return tz;
}

/** Eigenes Werk am Straßenrand: Fenster leuchten abends und nachts, Logo auf dem Dach */
function EigenesWerk({ x, state, licht }: { x: number; state: GameState; licht: boolean }) {
  const ci = ciVon(state);
  const fenster = licht ? '#fde68a' : '#bfdbfe';
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="104" width="120" height="48" fill="#e2e8f0" stroke="#94a3b8" />
      <path d="M0 104 L20 90 L20 104 L40 90 L40 104 L60 90 L60 104 L80 90 L80 104 L100 90 L100 104 L120 90 L120 104 Z" fill={ci.farbe} />
      <rect x="104" y="72" width="9" height="22" fill="#64748b" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={8 + i * 22} y="114" width="14" height="10" rx="1.5" fill={fenster} opacity={licht && i % 3 === 1 ? 0.55 : 1} />)}
      <rect x="48" y="132" width="24" height="20" fill="#475569" />
      {licht && <rect x="48" y="132" width="24" height="20" fill="#fde68a" opacity="0.35" />}
      <rect x="14" y="74" width="68" height="16" rx="3" fill="white" stroke={ci.farbe} />
      <FirmenLogo ci={ci} name={state.unternehmen.name} x={16} y={75} groesse={14} />
      <text x="33" y="85.5" fontSize="8" fontWeight="800" fill={ci.farbe}>{state.unternehmen.name.replace(/ (GmbH|AG)$/, '').slice(0, 11)}</text>
    </g>
  );
}

/** Radfahrer mit drehenden Laufrädern und tretenden Beinen */
function Fahrer({ farbe, x, y, skala = 1, animiert, name }: { farbe: string; x: number; y: number; skala?: number; animiert: boolean; name: string }) {
  const rad = (cx: number) => (
    <g transform={`translate(${cx} 0)`}>
      <circle r="13" fill="none" stroke="#1f2937" strokeWidth="2.5" />
      <g stroke="#6b7280" strokeWidth="1">
        <line x1="-13" y1="0" x2="13" y2="0" />
        <line x1="0" y1="-13" x2="0" y2="13" />
        <line x1="-9" y1="-9" x2="9" y2="9" />
        <line x1="-9" y1="9" x2="9" y2="-9" />
        {animiert && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.6s" repeatCount="indefinite" />}
      </g>
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${skala})`}>
      <g>
        {animiert && <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 0" dur="0.3s" repeatCount="indefinite" />}
        {rad(-20)}
        {rad(20)}
        <path d="M-20 0 L-6 -18 L14 -18 L20 0 M-6 -18 L0 0 L14 -18 M-8 -24 L-2 -24 M14 -18 L12 -26 L18 -27" stroke={farbe} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Fahrer */}
        <path d="M-4 -24 L6 -42 L14 -27" stroke={farbe} strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="8" cy="-48" r="5.5" fill="#fcd34d" />
        <path d="M3 -51 a6 6 0 0 1 11 0 z" fill={farbe} />
        {/* Beine um die Kurbel */}
        <g>
          <line x1="-4" y1="-24" x2="0" y2="-8" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          {animiert && <animateTransform attributeName="transform" type="rotate" values="-25 -4 -24;20 -4 -24;-25 -4 -24" dur="0.6s" repeatCount="indefinite" />}
        </g>
        <g>
          <line x1="-4" y1="-24" x2="4" y2="-6" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          {animiert && <animateTransform attributeName="transform" type="rotate" values="20 -4 -24;-25 -4 -24;20 -4 -24" dur="0.6s" repeatCount="indefinite" />}
        </g>
      </g>
      <text x="0" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">{name}</text>
    </g>
  );
}

function Partikel({ art, breite, animiert }: { art: string; breite: number; animiert: boolean }) {
  if (art === 'sonne') {
    return (
      <g transform={`translate(${breite - 90} 46)`}>
        <circle r="26" fill="#fde047" />
        <g stroke="#facc15" strokeWidth="3" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="0" y1="-34" x2="0" y2="-44" transform={`rotate(${i * 30})`} />
          ))}
          {animiert && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="30s" repeatCount="indefinite" />}
        </g>
      </g>
    );
  }
  const farbe = art === 'schnee' ? '#ffffff' : art === 'bluete' ? '#f9a8d4' : '#f97316';
  return (
    <g>
      {Array.from({ length: 22 }, (_, i) => {
        const x = (i * 97) % breite;
        const dauer = 5 + (i % 5);
        return (
          <g key={i} transform={`translate(${x} 0)`}>
            {art === 'laub' ? <ellipse rx="5" ry="2.5" fill={farbe} transform="rotate(30)" /> : <circle r={art === 'schnee' ? 2.5 : 3} fill={farbe} />}
            {animiert && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`${x} -10; ${x + 30} 90; ${x - 10} 190`}
                dur={`${dauer}s`}
                begin={`-${(i * 0.7) % dauer}s`}
                repeatCount="indefinite"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Cockpit-Banner: Landschaft passend zur Jahreszeit, dazu ein „Radrennen“ –
 * die Fahrer sind nach dem Umsatz des letzten Quartals aufgereiht (vorne = mehr Umsatz).
 */
export function CockpitBanner({ state, bericht }: { state: GameState; bericht: QuarterReport | null }) {
  const reduziert = useGame((s) => s.reduziert);
  const dunkel = useGame((s) => s.dunkel);
  const tz = useTageszeit();
  const nacht = dunkel || tz === 'nacht';
  const daemmerung = !nacht && (tz === 'morgen' || tz === 'abend');
  const licht = nacht || tz === 'abend';
  const animiert = !reduziert;
  const s = SAISON[state.quartal % 4];
  const himmel: readonly [string, string] = nacht ? ['#0b1026', '#27306b'] : tz === 'morgen' ? ['#fda4af', '#fde68a'] : tz === 'abend' ? ['#6d28d9', '#fb923c'] : s.himmel;
  const breite = 1100;
  const hoehe = 190;
  const teilnehmer = [
    { id: 'du', name: state.unternehmen.name.replace(/ (GmbH|AG)$/, ''), farbe: state.unternehmen.farbe, umsatz: bericht?.guv.umsatz ?? 0 },
    ...(bericht?.konkurrenz ?? Object.values(state.konkurrenten).map((k) => ({ id: k.id, name: k.name, farbe: k.farbe, umsatz: k.letzterUmsatz, status: k.status })))
      .filter((k) => k.status !== 'pleite')
      .map((k) => ({ id: k.id, name: k.name.replace(/ (GmbH|& Söhne)$/, ''), farbe: k.farbe, umsatz: k.umsatz })),
  ];
  const max = Math.max(1, ...teilnehmer.map((t) => t.umsatz));
  const platz = [...teilnehmer].sort((a, b) => b.umsatz - a.umsatz).findIndex((t) => t.id === 'du') + 1;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] shadow-sm">
      <svg viewBox={`0 0 ${breite} ${hoehe}`} className="block w-full" role="img" aria-label={`${s.name}, ${TAGESZEIT_NAME[tz]}: ${s.text}`}>
        <defs>
          <linearGradient id="bannerHimmel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={himmel[0]} />
            <stop offset="1" stopColor={himmel[1]} />
          </linearGradient>
        </defs>
        <rect width={breite} height={hoehe} fill="url(#bannerHimmel)" />
        {nacht ? (
          <g>
            {Array.from({ length: 46 }, (_, i) => {
              const x = (i * 241) % breite;
              const y = 8 + ((i * 53) % 90);
              return (
                <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 1.6 : 1} fill="#fef9c3">
                  {animiert && <animate attributeName="opacity" values="0.2;1;0.2" dur={`${2 + (i % 4)}s`} begin={`${(i % 7) * 0.4}s`} repeatCount="indefinite" />}
                </circle>
              );
            })}
            <circle cx="930" cy="48" r="24" fill="#fef3c7" />
            <circle cx="942" cy="40" r="22" fill="#0f1535" />
            {s.partikel === 'schnee' && <Partikel art="schnee" breite={breite} animiert={animiert} />}
          </g>
        ) : daemmerung ? (
          <g>
            {/* Tief stehende Sonne: morgens links, abends rechts */}
            <circle cx={tz === 'morgen' ? 160 : 900} cy="112" r="34" fill={tz === 'morgen' ? '#fdba74' : '#f97316'} opacity="0.9" />
            <circle cx={tz === 'morgen' ? 160 : 900} cy="112" r="58" fill={tz === 'morgen' ? '#fed7aa' : '#fb923c'} opacity="0.25" />
            {tz === 'morgen' &&
              [0, 1, 2].map((i) => (
                <path key={i} d="M0 0 q4 -4 8 0 q4 -4 8 0" stroke="#334155" strokeWidth="1.6" fill="none" transform={`translate(${300 + i * 26} ${40 + (i % 2) * 10})`}>
                  {animiert && <animateTransform attributeName="transform" type="translate" values={`${300 + i * 26} ${40 + (i % 2) * 10};${700 + i * 26} ${20 + (i % 2) * 10}`} dur={`${18 + i * 2}s`} repeatCount="indefinite" />}
                </path>
              ))}
            {s.partikel !== 'sonne' && <Partikel art={s.partikel} breite={breite} animiert={animiert} />}
          </g>
        ) : (
          <Partikel art={s.partikel} breite={breite} animiert={animiert} />
        )}
        {/* Hügel (Parallaxe) */}
        <g>
          <path d={`M0 120 Q 120 70 260 110 T 560 105 T 860 100 T ${breite * 2} 110 V ${hoehe} H 0 Z`} fill={s.huegel[0]} />
          <path d={`M${breite} 120 Q ${breite + 120} 70 ${breite + 260} 110 T ${breite + 560} 105 T ${breite + 860} 100 T ${breite * 2} 110 V ${hoehe} H ${breite} Z`} fill={s.huegel[0]} />
          {animiert && <animateTransform attributeName="transform" type="translate" from="0 0" to={`${-breite} 0`} dur="60s" repeatCount="indefinite" />}
        </g>
        <g>
          <path d={`M0 140 Q 150 110 300 135 T 600 130 T 900 138 T ${breite * 2} 132 V ${hoehe} H 0 Z`} fill={s.huegel[1]} opacity="0.8" />
          <path d={`M${breite} 140 Q ${breite + 150} 110 ${breite + 300} 135 T ${breite + 600} 130 T ${breite + 900} 138 T ${breite * 2} 132 V ${hoehe} H ${breite} Z`} fill={s.huegel[1]} opacity="0.8" />
          <EigenesWerk x={640} state={state} licht={licht} />
          <EigenesWerk x={640 + breite} state={state} licht={licht} />
          {animiert && <animateTransform attributeName="transform" type="translate" from="0 0" to={`${-breite} 0`} dur="30s" repeatCount="indefinite" />}
        </g>
        {nacht && <rect width={breite} height={hoehe} fill="#0b1026" opacity="0.45" />}
        {daemmerung && <rect width={breite} height={hoehe} fill={tz === 'morgen' ? '#fb7185' : '#7c3aed'} opacity="0.14" />}
        {/* Straße */}
        <rect x="0" y="152" width={breite} height="38" fill={nacht ? '#292524' : '#57534e'} />
        {licht && (
          <g>
            {[120, 420, 720, 1020].map((x) => (
              <g key={x}>
                <path d={`M${x} 152 V 96 h 14`} stroke="#57534e" strokeWidth="3" fill="none" />
                <path d={`M${x + 14} 98 L ${x - 18} 190 L ${x + 50} 190 Z`} fill="#fde68a" opacity="0.12" />
                <circle cx={x + 14} cy="98" r="4" fill="#fde68a" />
              </g>
            ))}
          </g>
        )}
        <g>
          {Array.from({ length: 30 }, (_, i) => <rect key={i} x={i * 80} y="170" width="40" height="3" fill="#fafaf9" />)}
          {animiert && <animateTransform attributeName="transform" type="translate" from="0 0" to="-80 0" dur="0.8s" repeatCount="indefinite" />}
        </g>
        {/* Fahrer nach Umsatz aufgereiht */}
        {[...teilnehmer].sort((a, b) => b.umsatz - a.umsatz).map((t, rang) => {
          // Reihenfolge nach Umsatz; Abstand wächst mit dem Umsatzunterschied
          const abstand = Math.min(140, 620 / Math.max(1, teilnehmer.length - 1));
          const x = 1040 - rang * abstand - (bericht ? (1 - t.umsatz / max) * 20 : 0);
          const y = 160 - (rang % 2) * 6;
          return (
            <g key={t.id}>
              {licht && <path d={`M${x + 26} ${y - 22} L ${x + 120} ${y - 34} L ${x + 120} ${y + 4} Z`} fill="#fef08a" opacity="0.18" />}
              <Fahrer farbe={t.farbe} x={x} y={y} skala={t.id === 'du' ? 1.15 : 0.95} animiert={animiert} name={t.id === 'du' ? 'Du' : t.name} />
            </g>
          );
        })}
      </svg>
      <div className="relative border-t border-[var(--line)] bg-white/90 px-4 py-3 dark:bg-slate-900/80 sm:absolute sm:left-5 sm:top-4 sm:max-w-[45%] sm:rounded-xl sm:border-0 sm:shadow-sm sm:backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">{quartalLabel(state.quartal)} · {s.name} · {TAGESZEIT_NAME[nacht && tz !== 'nacht' ? 'nacht' : tz]}</div>
        <div className="flex items-center gap-2">
          <FirmenLogo ci={ciVon(state)} name={state.unternehmen.name} className="h-8 w-8 shrink-0" />
          <div className="text-xl font-black leading-tight sm:text-2xl">{state.unternehmen.name}</div>
        </div>
        <div className="text-sm">Saison: {s.text}</div>
        {bericht && (
          <div className="mt-1 text-sm">
            Im Umsatz-Rennen auf <strong>Platz {platz}</strong> von {teilnehmer.length} ({eurKompakt(bericht.guv.umsatz)} im {quartalLabel(bericht.quartal)})
          </div>
        )}
      </div>
    </div>
  );
}
