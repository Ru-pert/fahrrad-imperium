import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useGame } from '../../store/gameStore';
import { Baum, Flaeche, H, Kran, Quader, Satteldach, Staub, W, ZoomFlaeche, iso } from './iso';

/** Fensterbänder auf beiden sichtbaren Seiten eines Quaders */
function Fenster({ gx, gy, sx, sy, von, bis, abstand = 14, farbe = '#bae6fd' }: { gx: number; gy: number; sx: number; sy: number; von: number; bis: number; abstand?: number; farbe?: string }) {
  const baender: ReactNode[] = [];
  for (let z = von; z < bis; z += abstand) {
    const a = iso(gx + 0.1, gy + sy, z);
    const b = iso(gx + sx - 0.1, gy + sy, z);
    const c = iso(gx + sx, gy + 0.1, z);
    const d = iso(gx + sx, gy + sy - 0.1, z);
    baender.push(
      <g key={z}>
        <polygon points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1] - 6} ${a[0]},${a[1] - 6}`} fill={farbe} opacity="0.9" />
        <polygon points={`${c[0]},${c[1]} ${d[0]},${d[1]} ${d[0]},${d[1] - 6} ${c[0]},${c[1] - 6}`} fill={farbe} opacity="0.7" />
      </g>,
    );
  }
  return <g>{baender}</g>;
}

function Schild({ gx, gy, z, text, farbe }: { gx: number; gy: number; z: number; text: string; farbe: string }) {
  const [x, y] = iso(gx, gy, z);
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-text.length * 3.8 - 6} y={-16} width={text.length * 7.6 + 12} height={20} rx="4" fill={farbe} />
      <text x="0" y="-2" fontSize="12" fontWeight="800" textAnchor="middle" fill="white">{text}</text>
    </g>
  );
}

/** Hauptgebäude je Ausbaustufe (0 = Garage … 6 = Wolkenkratzer) */
function Gebaeude({ stufe, name, farbe }: { stufe: number; name: string; farbe: string }) {
  const kurz = name.replace(/ (GmbH|AG)$/, '');
  switch (stufe) {
    case 0:
      return (
        <>
          <Quader gx={3} gy={3} sx={2} sy={2} hoehe={20} farbe="#a8a29e" />
          <Flaeche gx={3.3} gy={5} sx={1.4} sy={0.001} z={2} farbe="none" strich="#57534e" />
          <Satteldach gx={3} gy={3} sx={2} sy={2} z={20} firsthoehe={8} farbe="#78716c" />
          <Schild gx={4} gy={4} z={40} text="Garage" farbe="#57534e" />
        </>
      );
    case 1:
      return (
        <>
          <Quader gx={3} gy={3} sx={3} sy={2} hoehe={20} farbe="#b45309" />
          <Quader gx={3} gy={3} sx={3} sy={2} z={20} hoehe={18} farbe="#fde68a" />
          <Fenster gx={3} gy={3} sx={3} sy={2} von={26} bis={36} />
          <Satteldach gx={3} gy={3} sx={3} sy={2} z={38} firsthoehe={10} farbe="#7c2d12" />
          <Schild gx={4.5} gy={4} z={62} text={kurz} farbe={farbe} />
        </>
      );
    case 2:
      return (
        <>
          <Quader gx={2.5} gy={2.5} sx={4} sy={3} hoehe={56} farbe="#e2e8f0" />
          <Fenster gx={2.5} gy={2.5} sx={4} sy={3} von={10} bis={54} />
          <Quader gx={2.5} gy={2.5} sx={4} sy={3} z={56} hoehe={4} farbe={farbe} />
          <Schild gx={4.5} gy={4} z={78} text={kurz} farbe={farbe} />
        </>
      );
    case 3:
      return (
        <>
          <Flaeche gx={4} gy={6} sx={1} sy={3} farbe="#e7e5e4" />
          <Quader gx={2.5} gy={2.5} sx={4} sy={3.5} hoehe={40} farbe="#fef3c7" />
          <Fenster gx={2.5} gy={2.5} sx={4} sy={3.5} von={10} bis={38} abstand={16} farbe="#93c5fd" />
          <Satteldach gx={2.5} gy={2.5} sx={4} sy={3.5} z={40} firsthoehe={22} farbe="#9f1239" />
          <Quader gx={6.2} gy={2.5} sx={0.8} sy={0.8} hoehe={66} farbe="#fef3c7" />
          <Schild gx={4.5} gy={4.2} z={84} text={`Villa ${kurz}`} farbe={farbe} />
        </>
      );
    case 4:
      return (
        <>
          <Flaeche gx={1.5} gy={6.2} sx={6} sy={1.6} farbe="#d6d3d1" />
          <Quader gx={2} gy={2} sx={5} sy={4} hoehe={110} farbe="#7dd3fc" oben="#e0f2fe" />
          <Fenster gx={2} gy={2} sx={5} sy={4} von={6} bis={108} abstand={10} farbe="#0369a1" />
          {[2.5, 4.5, 6.5].map((x) => {
            const [px, py] = iso(x, 7.6);
            return (
              <g key={x} transform={`translate(${px} ${py})`}>
                <line x1="0" y1="0" x2="0" y2="-40" stroke="#475569" strokeWidth="1.5" />
                <rect x="0" y="-40" width="16" height="10" fill={farbe} />
              </g>
            );
          })}
          <Schild gx={4.5} gy={4} z={130} text={kurz} farbe={farbe} />
        </>
      );
    case 5:
      return (
        <>
          {(() => {
            const [px, py] = iso(7.5, 7.5);
            return <ellipse cx={px} cy={py} rx="52" ry="22" fill="#38bdf8" stroke="#0284c7" />;
          })()}
          <Quader gx={1} gy={1} sx={3} sy={3} hoehe={70} farbe="#e2e8f0" />
          <Fenster gx={1} gy={1} sx={3} sy={3} von={8} bis={68} />
          <Flaeche gx={1} gy={1} sx={3} sy={3} z={70} farbe="#4ade80" />
          <Quader gx={5} gy={1.5} sx={3} sy={2.5} hoehe={50} farbe="#f1f5f9" />
          <Fenster gx={5} gy={1.5} sx={3} sy={2.5} von={8} bis={48} />
          <Quader gx={1.5} gy={5} sx={3} sy={2.5} hoehe={40} farbe="#f8fafc" />
          <Fenster gx={1.5} gy={5} sx={3} sy={2.5} von={8} bis={38} />
          <Schild gx={2.5} gy={2.5} z={92} text={`${kurz} Campus`} farbe={farbe} />
        </>
      );
    default:
      return (
        <>
          <Quader gx={3} gy={3} sx={3} sy={3} hoehe={60} farbe="#cbd5e1" />
          <Quader gx={3.3} gy={3.3} sx={2.4} sy={2.4} z={60} hoehe={220} farbe="#93c5fd" oben="#dbeafe" />
          <Fenster gx={3.3} gy={3.3} sx={2.4} sy={2.4} von={66} bis={276} abstand={9} farbe="#1e40af" />
          <Flaeche gx={3.4} gy={3.4} sx={2.2} sy={2.2} z={281} farbe="#334155" />
          {(() => {
            const [px, py] = iso(4.5, 4.5, 282);
            return (
              <g transform={`translate(${px} ${py})`}>
                <ellipse rx="22" ry="11" fill="none" stroke="#facc15" strokeWidth="2" />
                <text y="5" fontSize="14" fontWeight="900" textAnchor="middle" fill="#facc15">H</text>
              </g>
            );
          })()}
          <Schild gx={4.5} gy={4.5} z={250} text={kurz.toUpperCase()} farbe={farbe} />
        </>
      );
  }
}

/** Extras an festen Plätzen */
function Extra({ id, farbe }: { id: string; farbe: string }) {
  switch (id) {
    case 'brunnen': {
      const [x, y] = iso(1.2, 7.5);
      return (
        <g transform={`translate(${x} ${y})`}>
          <ellipse rx="22" ry="11" fill="#94a3b8" />
          <ellipse rx="17" ry="8" fill="#38bdf8" />
          <rect x="-2" y="-20" width="4" height="20" fill="#e2e8f0" />
          <motion.circle cx="0" cy="-22" r="4" fill="#bae6fd" animate={{ cy: [-22, -30, -22], opacity: [1, 0.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
        </g>
      );
    }
    case 'espressobar':
      return (
        <>
          <Quader gx={0.4} gy={4} sx={1} sy={1} hoehe={14} farbe="#78350f" />
          <Flaeche gx={0.2} gy={3.8} sx={1.4} sy={1.4} z={16} farbe="#f59e0b" />
        </>
      );
    case 'parkhaus':
      return (
        <>
          <Quader gx={8} gy={0} sx={2} sy={2} hoehe={36} farbe="#a3a3a3" />
          <Fenster gx={8} gy={0} sx={2} sy={2} von={6} bis={34} abstand={10} farbe="#404040" />
        </>
      );
    case 'teststrecke': {
      const [x, y] = iso(8.7, 6.5);
      return <ellipse cx={x} cy={y} rx="60" ry="24" fill="none" stroke="#dc2626" strokeWidth="7" />;
    }
    case 'statue': {
      const [x, y] = iso(1.8, 1.2);
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect x="-8" y="-8" width="16" height="8" fill="#a8a29e" />
          <rect x="-3" y="-30" width="6" height="22" fill="#eab308" />
          <circle cx="0" cy="-34" r="5" fill="#facc15" />
        </g>
      );
    }
    case 'hubschrauber': {
      const [x, y] = iso(9, 3.6);
      return (
        <g transform={`translate(${x} ${y})`}>
          <ellipse rx="20" ry="10" fill="#334155" />
          <text y="4" fontSize="11" fontWeight="900" textAnchor="middle" fill="#facc15">H</text>
          <g transform="translate(0 -14)">
            <ellipse rx="14" ry="7" fill={farbe} />
            <motion.line x1="-22" y1="-9" x2="22" y2="-9" stroke="#0f172a" strokeWidth="2" animate={{ scaleX: [1, -1, 1] }} transition={{ duration: 0.4, repeat: Infinity }} />
          </g>
        </g>
      );
    }
    case 'museum':
      return (
        <>
          <Quader gx={7.5} gy={7.5} sx={2.5} sy={1.6} hoehe={30} farbe="#f5f5f4" />
          <Satteldach gx={7.5} gy={7.5} sx={2.5} sy={1.6} z={30} firsthoehe={10} farbe="#d6d3d1" />
        </>
      );
    default:
      return null;
  }
}

export function Hauptquartier({ stufe, extras, firma, farbe, neu }: { stufe: number; extras: string[]; firma: string; farbe: string; neu?: boolean }) {
  const reduziert = useGame((s) => s.reduziert);
  const NX = 11;
  const NY = 10;
  const breite = ((NX + NY) * W) / 2 + 120;
  const oben = stufe >= 6 ? 330 : 190;
  const hoehe = ((NX + NY) * H) / 2 + oben + 40;
  const ox = (NY * W) / 2 + 60;
  return (
    <ZoomFlaeche
      breite={breite}
      hoehe={hoehe}
      hintergrund={
        <>
          <defs>
            <linearGradient id="himmelHq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c7d2fe" />
              <stop offset="1" stopColor="#f0f9ff" />
            </linearGradient>
          </defs>
          <rect width={breite} height={hoehe} fill="url(#himmelHq)" />
        </>
      }
    >
      <g transform={`translate(${ox} ${oben})`}>
        <Flaeche gx={0} gy={0} sx={NX} sy={NY} farbe="#bef264" />
        <Flaeche gx={0} gy={9} sx={NX} sy={1} farbe="#78716c" />
        {[0.5, 2.5, 9.8, 10.3].map((x, i) => <Baum key={i} gx={x} gy={i % 2 ? 0.4 : 8.4} groesse={0.9} />)}
        {stufe >= 3 && [1, 6.8, 7.8].map((y, i) => <Baum key={`p${i}`} gx={i === 0 ? 7.2 : 0.8} gy={y} groesse={1.1} />)}
        {extras.filter((e) => e !== 'museum' && e !== 'parkhaus').map((e) => <Extra key={e} id={e} farbe={farbe} />)}
        <motion.g key={stufe} initial={neu && !reduziert ? { opacity: 0, y: -50 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <Gebaeude stufe={stufe} name={firma} farbe={farbe} />
        </motion.g>
        {extras.filter((e) => e === 'museum' || e === 'parkhaus').map((e) => <Extra key={e} id={e} farbe={farbe} />)}
        {neu && (
          <>
            <Kran gx={7} gy={2} hoehe={stufe >= 6 ? 300 : 140} animiert={!reduziert} />
            {!reduziert && <Staub gx={4.5} gy={5} />}
          </>
        )}
      </g>
    </ZoomFlaeche>
  );
}
