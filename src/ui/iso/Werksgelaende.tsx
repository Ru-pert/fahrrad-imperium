import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { BALANCE, type GameState, type Linie, type Werk } from '../../engine';
import { hallenPlaetze } from '../../engine/production';
import { useGame } from '../../store/gameStore';
import { fmt0 } from '../format';
import { Baum, Flaeche, H, Kran, Quader, Satteldach, Sheddach, Staub, W, ZoomFlaeche, iso, schattiere } from './iso';

/** Ein Modul auf dem Werksgelände */
interface Modul {
  key: string;
  name: string;
  gx: number;
  gy: number;
  sx: number;
  sy: number;
  /** Zeichnung in Rasterkoordinaten */
  zeichne: () => ReactNode;
  /** im Bau → Kran */
  imBau?: boolean;
}

const DACH: Record<string, string> = { A: '#475569', B: '#0f766e', C: '#15803d' };
const AUTOFARBEN = ['#ef4444', '#3b82f6', '#f59e0b', '#64748b', '#10b981', '#e5e7eb', '#8b5cf6', '#0f172a'];

const linienNr = (l: Linie) => /-L(\d+)$/.exec(l.id)?.[1] ?? '?';

function Beschriftung({ gx, gy, z, text, klein }: { gx: number; gy: number; z: number; text: string; klein?: string }) {
  const [x, y] = iso(gx, gy, z);
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect x={-Math.max(text.length * 3.6, (klein?.length ?? 0) * 2.9) - 6} y={-14} width={Math.max(text.length * 7.2, (klein?.length ?? 0) * 5.8) + 12} height={klein ? 28 : 18} rx="4" fill="white" opacity="0.92" />
      <text x="0" y="-1" fontSize="11" fontWeight="700" textAnchor="middle" fill="#0f172a">{text}</text>
      {klein && <text x="0" y="11" fontSize="9" textAnchor="middle" fill="#334155">{klein}</text>}
    </g>
  );
}

/**
 * Leitet die Module deterministisch aus dem Spielzustand ab (feste Bauplätze),
 * damit das Gelände organisch, aber reproduzierbar wächst.
 */
export function module(state: GameState, werk: Werk): { module: Modul[]; nx: number; ny: number } {
  const m: Modul[] = [];
  const plaetze = hallenPlaetze(werk) + ((werk.halleImBau ?? 0) > 0 ? BALANCE.produktion.hallenErweiterung.plaetze : 0);
  const proReihe = 2;
  const reihen = Math.ceil(plaetze / proReihe);
  const lager = Object.values(state.produkte).reduce((s, p) => s + (p?.lager.stueck ?? 0), 0);
  const ma = werk.mitarbeitende;
  const nachhaltig = state.unternehmen.nachhaltigkeit;
  const feGesamt = Object.values(state.produkte).reduce((s, p) => s + (p?.fe ?? 0), 0);

  // Werkstatt (Start)
  m.push({
    key: 'werkstatt', name: 'Werkstatt', gx: 0, gy: 0, sx: 2, sy: 2,
    zeichne: () => (
      <>
        <Quader gx={0} gy={0} sx={2} sy={2} hoehe={24} farbe="#b45309" />
        <Satteldach gx={0} gy={0} sx={2} sy={2} z={24} firsthoehe={14} farbe="#991b1b" />
        <Beschriftung gx={1} gy={1} z={52} text="Werkstatt" />
      </>
    ),
  });

  // Montagehallen: eine je Linie, freie Plätze als Bauplatz
  for (let i = 0; i < plaetze; i++) {
    const gx = 3 + (i % proReihe) * 4;
    const gy = Math.floor(i / proReihe) * 3;
    const l = werk.linien[i];
    const erweiterung = i >= hallenPlaetze(werk);
    if (l) {
      const hoch = l.typ === 'A' ? 46 : l.typ === 'B' ? 38 : 30;
      const bau = l.status === 'bau';
      m.push({
        key: `halle-${l.id}`, name: `Linie ${linienNr(l)}`, gx, gy, sx: 3, sy: 2, imBau: bau,
        zeichne: () => (
          <>
            {bau ? (
              <>
                <Flaeche gx={gx} gy={gy} sx={3} sy={2} farbe="#d6d3d1" strich="#a8a29e" />
                <Quader gx={gx + 0.2} gy={gy + 0.2} sx={2.6} sy={1.6} hoehe={hoch * 0.55} farbe="#e7e5e4" />
                <Beschriftung gx={gx + 1.5} gy={gy + 1} z={hoch + 14} text={`Linie ${linienNr(l)} im Bau`} klein={`Typ ${l.typ} · fertig nächstes Quartal`} />
              </>
            ) : (
              <>
                <Quader gx={gx} gy={gy} sx={3} sy={2} hoehe={hoch} farbe="#cbd5e1" />
                <Sheddach gx={gx} gy={gy} sx={3} sy={2} z={hoch} farbe={DACH[l.typ]} zaehne={3} />
                {nachhaltig >= 50 && <Flaeche gx={gx + 0.25} gy={gy + 1.15} sx={2.5} sy={0.7} z={hoch + 1} farbe="#1e3a8a" strich="#93c5fd" />}
                <Beschriftung gx={gx + 1.5} gy={gy + 1} z={hoch + 26} text={`Linie ${linienNr(l)}`} klein={`Typ ${l.typ} · ${fmt0(l.verfuegbarkeit * 100)} % verfügbar`} />
              </>
            )}
          </>
        ),
      });
    } else {
      m.push({
        key: `${erweiterung ? 'erweiterung' : 'platz'}-${i}`, name: erweiterung ? 'Hallenerweiterung' : 'Bauplatz', gx, gy, sx: 3, sy: 2, imBau: erweiterung,
        zeichne: () => (
          <>
            <Flaeche gx={gx} gy={gy} sx={3} sy={2} farbe={erweiterung ? '#fde68a' : '#e7e5e4'} strich={erweiterung ? '#d97706' : '#a8a29e'} />
            <Beschriftung gx={gx + 1.5} gy={gy + 1} z={10} text={erweiterung ? 'Erweiterung im Bau' : 'Freier Hallenplatz'} />
          </>
        ),
      });
    }
  }

  // Hochregallager wächst mit dem Bestand
  const lagerHoehe = 18 + Math.min(90, lager / 40);
  m.push({
    key: 'lager', name: 'Hochregallager', gx: 0, gy: 3, sx: 2, sy: 2,
    zeichne: () => (
      <>
        <Quader gx={0} gy={3} sx={2} sy={2} hoehe={lagerHoehe} farbe="#e2e8f0" />
        {Array.from({ length: Math.floor(lagerHoehe / 14) }, (_, i) => (
          <Flaeche key={i} gx={0} gy={5} sx={2} sy={0.001} z={8 + i * 14} farbe="none" strich="#3b82f6" />
        ))}
        <Beschriftung gx={1} gy={4} z={lagerHoehe + 18} text="Lager" klein={`${fmt0(lager)} Räder`} />
      </>
    ),
  });

  // Lkw-Rampe
  m.push({
    key: 'rampe', name: 'Lkw-Rampe', gx: 0, gy: 6, sx: 2, sy: 1,
    zeichne: () => (
      <>
        <Quader gx={0} gy={6} sx={2} sy={1} hoehe={8} farbe="#94a3b8" />
        <Quader gx={0.1} gy={6.1} sx={0.5} sy={0.8} hoehe={22} farbe="#f59e0b" />
      </>
    ),
  });

  // Parkplatz wächst mit dem Personal
  const parkX = 3;
  const parkY = reihen * 3;
  const parkB = Math.min(9, 2 + Math.floor(ma / 20));
  const autos = Math.min(parkB * 4, Math.ceil(ma / 3));
  m.push({
    key: `parkplatz-${parkB}`, name: 'Parkplatz', gx: parkX, gy: parkY, sx: parkB, sy: 2,
    zeichne: () => (
      <>
        <Flaeche gx={parkX} gy={parkY} sx={parkB} sy={2} farbe="#64748b" />
        {Array.from({ length: autos }, (_, i) => {
          const cx = parkX + 0.15 + (i % (parkB * 2)) * 0.5;
          const cy = parkY + 0.2 + Math.floor(i / (parkB * 2)) * 1;
          return <Quader key={i} gx={cx} gy={cy} sx={0.32} sy={0.6} hoehe={6} farbe={AUTOFARBEN[(i * 7) % AUTOFARBEN.length]} kante={false} />;
        })}
        <Beschriftung gx={parkX + parkB / 2} gy={parkY + 1} z={22} text="Parkplatz" klein={`${ma} Mitarbeitende`} />
      </>
    ),
  });

  // Kantine ab großen Werken
  if (ma >= 60) {
    const kx = parkX + parkB + 1;
    m.push({
      key: 'kantine', name: 'Kantine', gx: kx, gy: parkY, sx: 2, sy: 2,
      zeichne: () => (
        <>
          <Quader gx={kx} gy={parkY} sx={2} sy={2} hoehe={18} farbe="#fef3c7" />
          <Satteldach gx={kx} gy={parkY} sx={2} sy={2} z={18} firsthoehe={10} farbe="#b45309" />
          <Beschriftung gx={kx + 1} gy={parkY + 1} z={40} text="Kantine" />
        </>
      ),
    });
  }

  // Recyclinghof (Nachhaltigkeit)
  if (nachhaltig >= 60) {
    m.push({
      key: 'recycling', name: 'Recyclinghof', gx: 0, gy: 8, sx: 2, sy: 2,
      zeichne: () => (
        <>
          <Flaeche gx={0} gy={8} sx={2} sy={2} farbe="#bbf7d0" strich="#16a34a" />
          {[0, 1, 2].map((i) => <Quader key={i} gx={0.2 + i * 0.6} gy={8.6} sx={0.45} sy={0.8} hoehe={10} farbe={['#16a34a', '#2563eb', '#eab308'][i]} />)}
          <Beschriftung gx={1} gy={9} z={26} text="Recyclinghof" />
        </>
      ),
    });
  }

  // Teststrecke (viel F&E)
  if (feGesamt >= 1_000_000) {
    const ty = parkY + 3;
    m.push({
      key: 'teststrecke', name: 'Teststrecke', gx: 3, gy: ty, sx: 5, sy: 3,
      zeichne: () => {
        const [x, y] = iso(5.5, ty + 1.5);
        return (
          <>
            <Flaeche gx={3} gy={ty} sx={5} sy={3} farbe="#86efac" />
            <ellipse cx={x} cy={y} rx="100" ry="36" fill="none" stroke="#dc2626" strokeWidth="9" />
            <ellipse cx={x} cy={y} rx="100" ry="36" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="6 6" />
            <Beschriftung gx={5.5} gy={ty + 1.5} z={10} text="Teststrecke" />
          </>
        );
      },
    });
  }

  // Bahnanschluss für große Werke
  if (werk.linien.length >= 6) {
    const bx = 3 + proReihe * 4;
    m.push({
      key: 'bahn', name: 'Bahnanschluss', gx: bx, gy: 0, sx: 1, sy: reihen * 3 + 2,
      zeichne: () => (
        <>
          <Flaeche gx={bx} gy={0} sx={1} sy={reihen * 3 + 2} farbe="#a8a29e" />
          {Array.from({ length: (reihen * 3 + 2) * 3 }, (_, i) => <Flaeche key={i} gx={bx} gy={i / 3} sx={1} sy={0.08} farbe="#78350f" />)}
          <Quader gx={bx + 0.2} gy={1} sx={0.6} sy={2.2} hoehe={14} farbe="#1d4ed8" />
          <Beschriftung gx={bx + 0.5} gy={2} z={34} text="Bahnanschluss" />
        </>
      ),
    });
  }

  let maxX = 0;
  let maxY = 0;
  for (const x of m) {
    maxX = Math.max(maxX, x.gx + x.sx);
    maxY = Math.max(maxY, x.gy + x.sy);
  }
  // Gelände wächst von 6×6 bis 24×24 Kacheln
  const nx = Math.min(24, Math.max(6, Math.ceil(maxX) + 2));
  const ny = Math.min(24, Math.max(6, Math.ceil(maxY) + 2));
  return { module: m, nx, ny };
}

/** Darmstadt-Silhouette mit Hochzeitsturm und Mathildenhöhe */
function Skyline({ breite }: { breite: number }) {
  return (
    <g fill="#94a3b8" opacity="0.35">
      <rect x={breite * 0.08} y="40" width="26" height="110" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${breite * 0.08 + i * 5.2} 40 q2.6 -14 5.2 0 z`} />)}
      <path d={`M${breite * 0.14} 150 v-50 l18 -14 l18 14 v50 z`} />
      <ellipse cx={breite * 0.14 + 18} cy="78" rx="10" ry="6" fill="#64748b" />
      <rect x={breite * 0.8} y="90" width="60" height="60" />
      <rect x={breite * 0.86} y="70" width="34" height="80" />
      <text x={breite * 0.08} y="166" fontSize="11" fill="#475569" opacity="1">Darmstadt · Hochzeitsturm</text>
    </g>
  );
}

export function Werksgelaende({ state, werk, vorher, produktion }: { state: GameState; werk: Werk; vorher?: GameState; produktion: number }) {
  const reduziert = useGame((s) => s.reduziert);
  const { module: mods, nx: NX, ny: NY } = module(state, werk);
  const vorherWerk = vorher?.werke.find((w) => w.id === werk.id);
  const alteKeys = new Set(vorher && vorherWerk ? module(vorher, vorherWerk).module.map((x) => x.key) : mods.map((x) => x.key));
  const N = Math.max(NX, NY);
  const breite = ((NX + NY) * W) / 2 + 160;
  const oben = 190;
  const hoehe = ((NX + NY) * H) / 2 + oben + 70;
  const ox = (NY * W) / 2 + 80;
  const oy = oben;
  const sortiert = [...mods].sort((a, b) => a.gx + a.sx + a.gy + a.sy - (b.gx + b.sx + b.gy + b.sy));
  const lkw = Math.min(6, Math.max(1, Math.ceil(produktion / 400)));
  // Lkw-Weg: Rampe → Zufahrt → aus dem Bild
  const [ax, ay] = iso(1, 7.2);
  const [bx, by] = iso(1, NY + 0.6);
  const [cx, cy] = iso(NX + 2, NY + 0.6);
  const weg = `M${ax} ${ay} L${bx} ${by} L${cx} ${cy}`;

  return (
    <div>
      <ZoomFlaeche
        breite={breite}
        hoehe={hoehe}
        hintergrund={
          <>
            <defs>
              <linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#bae6fd" />
                <stop offset="1" stopColor="#f0f9ff" />
              </linearGradient>
            </defs>
            <rect width={breite} height={hoehe} fill="url(#himmel)" />
            <Skyline breite={breite} />
          </>
        }
      >
        <g transform={`translate(${ox} ${oy})`}>
          {/* Grundstück */}
          <Flaeche gx={-1} gy={-1} sx={NX + 1} sy={NY + 1} farbe="#a3e635" opacity={0.55} />
          <Flaeche gx={0} gy={0} sx={NX - 1} sy={NY - 1} farbe="#d9f99d" />
          {Array.from({ length: N }, (_, i) => (
            <g key={i} stroke="#84cc16" strokeWidth="0.4" opacity="0.6">
              {i < NX && <line x1={iso(i, 0)[0]} y1={iso(i, 0)[1]} x2={iso(i, NY - 1)[0]} y2={iso(i, NY - 1)[1]} />}
              {i < NY && <line x1={iso(0, i)[0]} y1={iso(0, i)[1]} x2={iso(NX - 1, i)[0]} y2={iso(NX - 1, i)[1]} />}
            </g>
          ))}
          {/* Straße */}
          <Flaeche gx={0.6} gy={7} sx={0.8} sy={Math.max(0, NY - 7)} farbe="#57534e" />
          <Flaeche gx={-1} gy={NY} sx={NX + 3} sy={1.2} farbe="#57534e" />
          <path d={`M${iso(-1, NY + 0.6)[0]} ${iso(-1, NY + 0.6)[1]} L${iso(NX + 2, NY + 0.6)[0]} ${iso(NX + 2, NY + 0.6)[1]}`} stroke="#fafaf9" strokeWidth="1.5" strokeDasharray="10 8" />
          {/* Bäume am Rand (deterministisch) */}
          {Array.from({ length: NY }, (_, i) => (i % 2 === 0 ? <Baum key={`b${i}`} gx={NX - 0.5} gy={i + 0.3} groesse={0.8 + ((i * 37) % 5) / 10} /> : null))}
          {Array.from({ length: NX }, (_, i) => (i % 3 === 1 ? <Baum key={`c${i}`} gx={i + 0.3} gy={-0.6} groesse={0.7 + ((i * 13) % 4) / 10} /> : null))}

          {sortiert.map((x) => {
            const neu = !alteKeys.has(x.key) || x.imBau;
            const inhalt = x.zeichne();
            return (
              <motion.g key={x.key} initial={neu && !reduziert ? { opacity: 0, y: -40 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
                {inhalt}
                {neu && <Kran gx={x.gx + x.sx} gy={x.gy} hoehe={80} animiert={!reduziert} />}
                {neu && !alteKeys.has(x.key) && !reduziert && <Staub gx={x.gx + x.sx / 2} gy={x.gy + x.sy / 2} />}
              </motion.g>
            );
          })}

          {/* Abfahrende Lkw */}
          {Array.from({ length: lkw }, (_, i) => (
            <g key={`lkw${i}`}>
              <g>
                <rect x="-14" y="-16" width="22" height="12" fill={state.unternehmen.farbe} stroke="#0f172a" strokeWidth="0.6" />
                <rect x="8" y="-12" width="8" height="8" fill="#334155" />
                <circle cx="-8" cy="-3" r="3" fill="#0f172a" />
                <circle cx="11" cy="-3" r="3" fill="#0f172a" />
                {!reduziert && <animateMotion path={weg} dur="9s" begin={`-${(i * 9) / lkw}s`} repeatCount="indefinite" />}
                {reduziert && <animateMotion path={weg} dur="0.01s" keyPoints={`${(i + 1) / (lkw + 1)};${(i + 1) / (lkw + 1)}`} keyTimes="0;1" fill="freeze" calcMode="linear" />}
              </g>
            </g>
          ))}
        </g>
        <g transform={`translate(${breite - 250} ${hoehe - 44})`}>
          <rect width="236" height="34" rx="8" fill="white" opacity="0.92" />
          <text x="12" y="21" fontSize="12" fontWeight="700" fill="#0f172a">Dieses Quartal: {fmt0(produktion)} Räder · {lkw} Lkw</text>
        </g>
      </ZoomFlaeche>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {mods.filter((x) => !x.key.startsWith('platz')).map((x) => (
          <span key={x.key} className={`rounded-full border px-2 py-0.5 ${!alteKeys.has(x.key) ? 'border-amber-500 bg-amber-50 font-semibold text-amber-900' : 'border-[var(--line)]'}`}>
            {x.name}{!alteKeys.has(x.key) ? ' – neu' : ''}
          </span>
        ))}
        <span className="muted">Gelände {NX}×{NY} Kacheln</span>
      </div>
      <span className="hidden">{schattiere('#000000', 1)}</span>
    </div>
  );
}
