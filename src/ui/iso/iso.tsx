/**
 * Isometrische Grundbausteine (SVG). Raster-Koordinaten (gx, gy) werden auf den Bildschirm projiziert:
 *   x = (gx − gy) · W/2,  y = (gx + gy) · H/2
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';

export const W = 64;
export const H = 32;

export const iso = (gx: number, gy: number, z = 0): [number, number] => [((gx - gy) * W) / 2, ((gx + gy) * H) / 2 - z];
const pt = (p: [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/** Farbe abdunkeln/aufhellen (Hex) */
export function schattiere(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Bodenfläche (Raute) über sx × sy Kacheln */
export function Flaeche({ gx, gy, sx, sy, farbe, z = 0, strich, opacity }: { gx: number; gy: number; sx: number; sy: number; farbe: string; z?: number; strich?: string; opacity?: number }) {
  return (
    <polygon
      points={[iso(gx, gy, z), iso(gx + sx, gy, z), iso(gx + sx, gy + sy, z), iso(gx, gy + sy, z)].map(pt).join(' ')}
      fill={farbe}
      stroke={strich}
      strokeWidth={strich ? 1 : 0}
      opacity={opacity}
    />
  );
}

/** Quader mit drei sichtbaren Seiten */
export function Quader({ gx, gy, sx, sy, hoehe, farbe, z = 0, oben, kante = true }: { gx: number; gy: number; sx: number; sy: number; hoehe: number; farbe: string; z?: number; oben?: string; kante?: boolean }) {
  const s = kante ? schattiere(farbe, 0.55) : 'none';
  const top = [iso(gx, gy, z + hoehe), iso(gx + sx, gy, z + hoehe), iso(gx + sx, gy + sy, z + hoehe), iso(gx, gy + sy, z + hoehe)];
  const links = [iso(gx, gy + sy, z), iso(gx + sx, gy + sy, z), iso(gx + sx, gy + sy, z + hoehe), iso(gx, gy + sy, z + hoehe)];
  const rechts = [iso(gx + sx, gy, z), iso(gx + sx, gy + sy, z), iso(gx + sx, gy + sy, z + hoehe), iso(gx + sx, gy, z + hoehe)];
  return (
    <g strokeWidth={0.8} stroke={s} strokeLinejoin="round">
      <polygon points={links.map(pt).join(' ')} fill={schattiere(farbe, 0.85)} />
      <polygon points={rechts.map(pt).join(' ')} fill={schattiere(farbe, 0.68)} />
      <polygon points={top.map(pt).join(' ')} fill={oben ?? schattiere(farbe, 1.12)} />
    </g>
  );
}

/** Satteldach entlang der x-Achse */
export function Satteldach({ gx, gy, sx, sy, z, firsthoehe, farbe }: { gx: number; gy: number; sx: number; sy: number; z: number; firsthoehe: number; farbe: string }) {
  const m = gy + sy / 2;
  const a = [iso(gx, gy, z), iso(gx + sx, gy, z), iso(gx + sx, m, z + firsthoehe), iso(gx, m, z + firsthoehe)];
  const b = [iso(gx, m, z + firsthoehe), iso(gx + sx, m, z + firsthoehe), iso(gx + sx, gy + sy, z), iso(gx, gy + sy, z)];
  const giebel = [iso(gx + sx, gy, z), iso(gx + sx, gy + sy, z), iso(gx + sx, m, z + firsthoehe)];
  return (
    <g stroke={schattiere(farbe, 0.5)} strokeWidth={0.8} strokeLinejoin="round">
      <polygon points={a.map(pt).join(' ')} fill={schattiere(farbe, 1.05)} />
      <polygon points={b.map(pt).join(' ')} fill={schattiere(farbe, 0.8)} />
      <polygon points={giebel.map(pt).join(' ')} fill={schattiere(farbe, 0.65)} />
    </g>
  );
}

/** Sheddach (Sägezahn) für Fabrikhallen */
export function Sheddach({ gx, gy, sx, sy, z, farbe, zaehne = 3 }: { gx: number; gy: number; sx: number; sy: number; z: number; farbe: string; zaehne?: number }) {
  const t = sx / zaehne;
  const teile: ReactNode[] = [];
  for (let i = 0; i < zaehne; i++) {
    const x0 = gx + i * t;
    const glas = [iso(x0 + t, gy, z), iso(x0 + t, gy + sy, z), iso(x0 + t, gy + sy, z + 12), iso(x0 + t, gy, z + 12)];
    const dach = [iso(x0, gy, z), iso(x0, gy + sy, z), iso(x0 + t, gy + sy, z + 12), iso(x0 + t, gy, z + 12)];
    teile.push(
      <g key={i}>
        <polygon points={dach.map(pt).join(' ')} fill={schattiere(farbe, 1.0)} stroke={schattiere(farbe, 0.55)} strokeWidth={0.7} />
        <polygon points={glas.map(pt).join(' ')} fill="#bae6fd" stroke={schattiere(farbe, 0.55)} strokeWidth={0.7} />
      </g>,
    );
  }
  return <g>{teile}</g>;
}

export function Baum({ gx, gy, groesse = 1 }: { gx: number; gy: number; groesse?: number }) {
  const [x, y] = iso(gx, gy);
  return (
    <g transform={`translate(${x} ${y}) scale(${groesse})`}>
      <ellipse cx="0" cy="2" rx="9" ry="4" fill="#000" opacity="0.15" />
      <rect x="-1.5" y="-12" width="3" height="13" fill="#78350f" />
      <circle cx="0" cy="-18" r="9" fill="#16a34a" />
      <circle cx="-4" cy="-14" r="6" fill="#15803d" />
    </g>
  );
}

/** Kran mit Staubwolke – für Module im Bau oder frisch gebaut */
export function Kran({ gx, gy, hoehe = 70, animiert = true }: { gx: number; gy: number; hoehe?: number; animiert?: boolean }) {
  const [x, y] = iso(gx, gy);
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-2" y={-hoehe} width="4" height={hoehe} fill="#f59e0b" stroke="#92400e" strokeWidth="0.6" />
      <g>
        <rect x="-10" y={-hoehe - 4} width="56" height="4" fill="#f59e0b" stroke="#92400e" strokeWidth="0.6" />
        <line x1="38" y1={-hoehe} x2="38" y2={-hoehe + 26} stroke="#334155" />
        <rect x="33" y={-hoehe + 26} width="10" height="7" fill="#64748b" />
        {animiert && <animateTransform attributeName="transform" type="rotate" values={`-12 0 ${-hoehe};12 0 ${-hoehe};-12 0 ${-hoehe}`} dur="6s" repeatCount="indefinite" />}
      </g>
    </g>
  );
}

export function Staub({ gx, gy }: { gx: number; gy: number }) {
  const [x, y] = iso(gx, gy);
  return (
    <g transform={`translate(${x} ${y})`} fill="#d6d3d1">
      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={i}
          cx={(i - 1.5) * 14}
          cy={-6}
          r={8}
          initial={{ opacity: 0.9, scale: 0.4 }}
          animate={{ opacity: 0, scale: 2.2, cy: -26 }}
          transition={{ duration: 1.8, delay: i * 0.15, repeat: 1, repeatDelay: 0.3 }}
        />
      ))}
    </g>
  );
}

/** Zoom- und Verschiebe-Container für große SVG-Ansichten */
export function ZoomFlaeche({ breite, hoehe, children, hintergrund }: { breite: number; hoehe: number; children: ReactNode; hintergrund?: ReactNode }) {
  const [ansicht, setAnsicht] = useState({ s: 1, x: 0, y: 0 });
  const zieh = useRef<{ x: number; y: number; ax: number; ay: number } | null>(null);
  const rahmen = useRef<HTMLDivElement>(null);
  useEffect(() => setAnsicht({ s: 1, x: 0, y: 0 }), [breite, hoehe]);

  const zoom = (faktor: number, cx = 0.5, cy = 0.5) =>
    setAnsicht((a) => {
      const s = Math.min(3, Math.max(0.6, a.s * faktor));
      const k = s / a.s;
      // um den Zeigepunkt zoomen (cx, cy relativ zur Fläche)
      const px = cx * breite;
      const py = cy * hoehe;
      return { s, x: px - (px - a.x) * k, y: py - (py - a.y) * k };
    });
  // Mausrad nur mit Strg/⌘ (bzw. Trackpad-Pinch), damit die Seite normal scrollt
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breite, hoehe]);
  const onDown = (e: PointerEvent) => {
    zieh.current = { x: e.clientX, y: e.clientY, ax: ansicht.x, ay: ansicht.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const z = zieh.current;
    if (!z || !rahmen.current) return;
    const r = rahmen.current.getBoundingClientRect();
    const f = breite / r.width;
    setAnsicht((a) => ({ ...a, x: z.ax + (e.clientX - z.x) * f, y: z.ay + (e.clientY - z.y) * f }));
  };
  const onUp = () => {
    zieh.current = null;
  };
  return (
    <div className="relative" ref={rahmen}>
      <svg
        viewBox={`0 0 ${breite} ${hoehe}`}
        ref={svgRef}
        className="w-full cursor-grab touch-none select-none rounded-xl active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        role="img"
      >
        {hintergrund}
        <g transform={`translate(${ansicht.x} ${ansicht.y}) scale(${ansicht.s})`}>{children}</g>
      </svg>
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <button className="btn-ghost bg-[var(--card)]" aria-label="Hineinzoomen" onClick={() => zoom(1.25)}>＋</button>
        <button className="btn-ghost bg-[var(--card)]" aria-label="Herauszoomen" onClick={() => zoom(0.8)}>－</button>
        <button className="btn-ghost bg-[var(--card)] text-xs" onClick={() => setAnsicht({ s: 1, x: 0, y: 0 })}>Zentrieren</button>
      </div>
      <div className="muted absolute bottom-2 left-3 text-[11px]">Ziehen zum Verschieben · Strg/⌘ + Mausrad zum Zoomen</div>
    </div>
  );
}
