import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Cell, PieChart, Pie, ReferenceLine, Legend } from 'recharts';
import { eurKompakt, fmt0 } from '../format';

const achse = { fontSize: 11, fill: 'var(--muted)' };

export interface Serie {
  key: string;
  name: string;
  farbe: string;
}

export function LinienDiagramm({
  daten,
  serien,
  hoehe = 220,
  format = eurKompakt,
}: {
  daten: Record<string, number | string>[];
  serien: Serie[];
  hoehe?: number;
  format?: (x: number) => string;
}) {
  return (
    <div style={{ height: hoehe }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={daten} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={achse} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={achse} width={58} tickFormatter={(v: number) => format(v).replace(' €', '')} />
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
            formatter={(v: number) => format(v)}
          />
          {serien.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {serien.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.farbe} strokeWidth={2.2} dot={false} animationDuration={900} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Wasserfalldiagramm: Posten mit Wert; Summenbalken optional */
export function Wasserfall({ posten, hoehe = 240 }: { posten: { name: string; wert: number; summe?: boolean }[]; hoehe?: number }) {
  let lauf = 0;
  const daten = posten.map((p) => {
    if (p.summe) {
      const d = { name: p.name, basis: Math.min(0, p.wert), delta: Math.abs(p.wert), wert: p.wert, farbe: '#0f766e' };
      lauf = p.wert;
      return d;
    }
    const von = lauf;
    const bis = lauf + p.wert;
    lauf = bis;
    return { name: p.name, basis: Math.min(von, bis), delta: Math.abs(p.wert), wert: p.wert, farbe: p.wert >= 0 ? '#10b981' : '#f43f5e' };
  });
  return (
    <div style={{ height: hoehe }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={daten} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={achse} interval={0} angle={-25} textAnchor="end" height={50} />
          <YAxis tick={achse} width={58} tickFormatter={(v: number) => eurKompakt(v).replace(' €', '')} />
          <ReferenceLine y={0} stroke="var(--muted)" />
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
            formatter={(_v: number, _n: string, item) => eurKompakt((item.payload as { wert: number }).wert)}
            labelFormatter={(l) => String(l)}
          />
          <Bar dataKey="basis" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="delta" stackId="a" isAnimationActive={false}>
            {daten.map((d, i) => (
              <Cell key={i} fill={d.farbe} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ teile, hoehe = 200, mitte }: { teile: { name: string; wert: number; farbe: string }[]; hoehe?: number; mitte?: string }) {
  return (
    <div className="relative" style={{ height: hoehe }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={teile} dataKey="wert" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={1} animationDuration={900} stroke="none">
            {teile.map((t) => (
              <Cell key={t.name} fill={t.farbe} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
            formatter={(v: number) => `${(v * 100).toFixed(2).replace('.', ',')} %`}
          />
        </PieChart>
      </ResponsiveContainer>
      {mitte && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-lg font-bold">{mitte}</div>}
    </div>
  );
}

export function Balken({ daten, hoehe = 200, farbe = '#0d9488', format = fmt0 }: { daten: { name: string; wert: number; farbe?: string }[]; hoehe?: number; farbe?: string; format?: (x: number) => string }) {
  return (
    <div style={{ height: hoehe }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={daten} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={achse} />
          <YAxis tick={achse} width={50} tickFormatter={(v: number) => format(v)} />
          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => format(v)} />
          <Bar dataKey="wert" animationDuration={800}>
            {daten.map((d, i) => (
              <Cell key={i} fill={d.farbe ?? farbe} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
