const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const fmt0 = (x: number): string => nf0.format(Math.round(x) === 0 ? 0 : x);
export const fmt1 = (x: number): string => nf1.format(x);
export const fmt2 = (x: number): string => nf2.format(x);
export const eur = (x: number): string => eur0.format(Math.round(x) === 0 ? 0 : x);
export const pct = (x: number, digits = 1): string =>
  new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(x);

/** Kompakte Beträge: 1,2 Mio. € / 340 Tsd. € */
export function eurKompakt(x: number): string {
  const a = Math.abs(x);
  const sign = x < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}${fmt2(a / 1e9)} Mrd. €`;
  if (a >= 1e6) return `${sign}${fmt2(a / 1e6)} Mio. €`;
  if (a >= 1e4) return `${sign}${fmt0(a / 1e3)} Tsd. €`;
  return `${sign}${fmt0(a)} €`;
}

/** Eingabe wie „1.234,5“ → Zahl */
export function parseZahl(text: string): number | null {
  const t = text.replace(/\s|€/g, '').replace(/\./g, '').replace(',', '.');
  if (t === '' || t === '-') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Kurze Symbole je Region */
export const REGION_SYMBOL: Record<string, string> = { DE: 'DE', EU: 'EU', NA: 'NA', AS: 'AS', RW: 'RW' };
export const REGION_FARBE: Record<string, string> = { DE: '#0d9488', EU: '#2563eb', NA: '#dc2626', AS: '#d97706', RW: '#7c3aed' };

const ENGPASS = /^(.+?) \((\w+)\): Nachfrage ([\d.]+) Stück, aber nur ([\d.]+) lieferbar\.?$/;

/** Teilt Engine-Warnungen in Lieferengpässe (kurz gefasst) und sonstige Hinweise */
export function gruppiereWarnungen(warnungen: string[]): { sonstige: string[]; engpaesse: string[] } {
  const sonstige: string[] = [];
  const engpaesse: string[] = [];
  for (const w of warnungen) {
    const m = ENGPASS.exec(w);
    if (m) engpaesse.push(`${m[1]} (${m[2]}): ${m[4]} von ${m[3]} lieferbar`);
    else sonstige.push(w);
  }
  return { sonstige, engpaesse };
}
