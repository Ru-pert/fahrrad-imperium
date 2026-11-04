import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import welt from 'world-atlas/countries-110m.json';
import { KONKURRENTEN, REGIONEN, type GameState, type RegionId } from '../../engine';
import { useGame } from '../../store/gameStore';

/** ISO-3166-Nummern → Spielregion */
const LAENDER: Record<Exclude<RegionId, 'RW'>, string[]> = {
  DE: ['276'],
  EU: ['040', '056', '100', '191', '196', '203', '208', '233', '246', '250', '300', '348', '372', '380', '428', '440', '442', '470', '528', '616', '620', '642', '703', '705', '724', '752', '826', '756', '578', '352'],
  NA: ['840', '124', '484', '304'],
  AS: ['156', '392', '410', '408', '158', '356', '704', '764', '360', '458', '608', '104', '116', '418', '050', '586', '524', '144', '496', '702', '096', '064', '626'],
};
const LAND_ZU_REGION = new Map<string, RegionId>();
for (const [r, ids] of Object.entries(LAENDER)) for (const id of ids) LAND_ZU_REGION.set(id, r as RegionId);
export const regionVonLand = (id: string | number | undefined): RegionId => LAND_ZU_REGION.get(String(id ?? '').padStart(3, '0')) ?? 'RW';

/** Koordinaten [Länge, Breite] */
export const WERK_ORTE: Record<string, [number, number]> = {
  DE: [8.65, 49.87], PL: [17.03, 51.1], US: [-104.99, 39.74], MX: [-100.3, 25.67], VN: [106.68, 20.86], BR: [-49.27, -25.43],
};
const ZWEITES_DE: [number, number] = [9.48, 51.31];
export const KONKURRENZ_ORTE: Record<string, [number, number]> = {
  drahtesel: [7.0, 51.45], veloveritas: [11.58, 48.14], kettenreaktion: [13.4, 52.52], pedalo: [9.19, 45.46],
  fietsfabriek: [4.9, 52.37], freedom: [-122.68, 45.52], goldenspoke: [114.06, 22.54],
};

const BREITE = 960;
const HOEHE = 500;

export type RegionStatus = 'aktiv' | 'freigeschaltet' | 'gesperrt';
export const regionStatus = (s: GameState, r: RegionId): RegionStatus =>
  s.regionen[r]?.aktiv ? 'aktiv' : s.regionen[r]?.freigeschaltet ? 'freigeschaltet' : 'gesperrt';

/**
 * Weltkarte: Regionen leuchten in der Firmenfarbe, wenn aktiv (hell, wenn freigeschaltet).
 * Werke als Pins, Konkurrenz-Hauptsitze als graue Pins. `leuchten` lässt Regionen pulsieren (Freischaltung).
 */
export function Weltkarte({
  state,
  auswahl,
  onAuswahl,
  leuchten = [],
  kompakt = false,
}: {
  state: GameState;
  auswahl?: RegionId | null;
  onAuswahl?: (r: RegionId) => void;
  leuchten?: RegionId[];
  kompakt?: boolean;
}) {
  const reduziert = useGame((s) => s.reduziert);
  const farbe = state.unternehmen.farbe;
  const { laender, pfad, projektion } = useMemo(() => {
    const topo = welt as unknown as Topology<{ countries: GeometryCollection }>;
    const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    const proj = geoNaturalEarth1().fitExtent([[8, 8], [BREITE - 8, HOEHE - 8]], fc);
    return { laender: fc.features.filter((f) => f.properties?.name !== 'Antarctica'), pfad: geoPath(proj), projektion: proj };
  }, []);

  const fuellung = (r: RegionId) => {
    const st = regionStatus(state, r);
    if (st === 'aktiv') return farbe;
    if (st === 'freigeschaltet') return `${farbe}66`;
    return '#cbd5e1';
  };
  const punkt = (ll: [number, number]) => projektion(ll) ?? [0, 0];

  return (
    <svg viewBox={`0 0 ${BREITE} ${HOEHE}`} className="w-full rounded-xl bg-sky-50 dark:bg-slate-800" role="img" aria-label="Weltkarte der Regionen">
      <defs>
        <pattern id="schraffur" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={farbe} strokeWidth="2" opacity="0.6" />
        </pattern>
      </defs>
      {laender.map((f: Feature<Geometry, { name: string }>, i) => {
        const r = regionVonLand(f.id);
        const d = pfad(f) ?? '';
        const gewaehlt = auswahl === r;
        const glow = leuchten.includes(r);
        return (
          <g key={`${String(f.id)}-${i}`}>
            <motion.path
              d={d}
              fill={fuellung(r)}
              stroke={gewaehlt ? '#0f172a' : '#ffffff'}
              strokeWidth={gewaehlt ? 1.2 : 0.4}
              className={onAuswahl ? 'cursor-pointer' : ''}
              onClick={() => onAuswahl?.(r)}
              whileHover={onAuswahl ? { opacity: 0.8 } : undefined}
              animate={glow && !reduziert ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
              transition={glow ? { duration: 1.2, repeat: Infinity } : undefined}
            >
              <title>{`${f.properties?.name ?? ''} – ${REGIONEN[r].name}`}</title>
            </motion.path>
            {regionStatus(state, r) === 'freigeschaltet' && <path d={d} fill="url(#schraffur)" pointerEvents="none" />}
          </g>
        );
      })}
      {/* Konkurrenz-Hauptsitze */}
      {!kompakt &&
        KONKURRENTEN.map((k) => {
          const [x, y] = punkt(KONKURRENZ_ORTE[k.id]);
          return (
            <g key={k.id} transform={`translate(${x} ${y})`}>
              <circle r="4.5" fill="#64748b" stroke="#fff" strokeWidth="1.2" />
              <title>{`${k.name} (Hauptsitz)`}</title>
            </g>
          );
        })}
      {/* Eigene Werke */}
      {state.werke.map((w, i) => {
        const ort = w.standort && w.standort !== 'DE' ? WERK_ORTE[w.standort] : i === 0 ? WERK_ORTE.DE : ZWEITES_DE;
        const [x, y] = punkt(ort);
        return (
          <g key={w.id} transform={`translate(${x} ${y})`}>
            {!reduziert && (w.status ?? 'aktiv') === 'aktiv' && (
              <motion.circle r="6" fill={farbe} initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 3 }} transition={{ duration: 2, repeat: Infinity }} />
            )}
            <path d="M0 0 C -8 -12 -8 -20 0 -22 C 8 -20 8 -12 0 0 Z" fill={w.status === 'bau' ? '#f59e0b' : farbe} stroke="#fff" strokeWidth="1.5" />
            <circle cy="-14" r="3" fill="#fff" />
            <title>{`Werk ${w.name}${w.status === 'bau' ? ' (im Bau)' : ''}`}</title>
          </g>
        );
      })}
      {/* Lichtwelle bei Freischaltung */}
      {!reduziert &&
        leuchten.map((r) => {
          const mitte: Record<RegionId, [number, number]> = { DE: [10, 51], EU: [10, 48], NA: [-100, 42], AS: [105, 32], RW: [-55, -12] };
          const [x, y] = punkt(mitte[r]);
          return (
            <motion.circle key={r} cx={x} cy={y} r={20} fill="none" stroke={farbe} strokeWidth="4" initial={{ r: 10, opacity: 0.9 }} animate={{ r: 260, opacity: 0 }} transition={{ duration: 2.4, repeat: 2 }} />
          );
        })}
    </svg>
  );
}
