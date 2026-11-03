import type { ProductId, RegionId } from '../types';

export interface RegionConfig {
  id: RegionId;
  name: string;
  startvolumen: number;
  zusatzwachstum: number;
  kaufkraft: number;
  /** Segmentmix in Prozent: Stadtrad / E-Bike / MTB / Rennrad / Lastenrad / E-MTB */
  mix: Record<ProductId, number>;
  eintritt: number;
  zoll: number;
  freischaltung: string;
}

const mix = (a: number[]): Record<ProductId, number> => ({
  stadtrad: a[0], ebike: a[1], mountainbike: a[2], rennrad: a[3], lastenrad: a[4], emtb: a[5],
});

export const REGIONEN: Record<RegionId, RegionConfig> = {
  DE: { id: 'DE', name: 'Deutschland', startvolumen: 1_000_000, zusatzwachstum: 0, kaufkraft: 1.0, mix: mix([35, 30, 15, 7, 5, 8]), eintritt: 0, zoll: 0, freischaltung: 'Start' },
  EU: { id: 'EU', name: 'Europa', startvolumen: 4_000_000, zusatzwachstum: 0, kaufkraft: 0.95, mix: mix([45, 25, 12, 8, 4, 6]), eintritt: 2_000_000, zoll: 0, freischaltung: 'Umsatz 4Q ≥ 10 Mio. € und Marktanteil DE ≥ 1 %' },
  NA: { id: 'NA', name: 'Nordamerika', startvolumen: 4_500_000, zusatzwachstum: 0.003, kaufkraft: 1.1, mix: mix([30, 20, 25, 10, 5, 10]), eintritt: 15_000_000, zoll: 0.10, freischaltung: 'Umsatz 4Q ≥ 60 Mio. € und Nachhaltigkeit ≥ 45' },
  AS: { id: 'AS', name: 'Asien', startvolumen: 15_000_000, zusatzwachstum: 0.01, kaufkraft: 0.55, mix: mix([70, 18, 5, 3, 2, 2]), eintritt: 40_000_000, zoll: 0.15, freischaltung: 'Umsatz 4Q ≥ 250 Mio. € und ein Werk außerhalb DE' },
  RW: { id: 'RW', name: 'Rest der Welt', startvolumen: 8_000_000, zusatzwachstum: 0.015, kaufkraft: 0.5, mix: mix([65, 12, 12, 4, 4, 3]), eintritt: 100_000_000, zoll: 0.12, freischaltung: 'Umsatz 4Q ≥ 1 Mrd. €' },
};

export const REGION_IDS = Object.keys(REGIONEN) as RegionId[];

/** Logistik: innerhalb der Region / regionsübergreifend (zzgl. Zoll der Zielregion) */
export const LOGISTIK = { innerhalb: 0.03, uebergreifend: 0.08 };

/** Werkstandorte (Stufe 6 – hier nur Konfiguration) */
export const WERK_STANDORTE = {
  DE: { name: 'Deutschland (weiteres Werk)', region: 'DE', lohnIndex: 1.0, baukosten: 12_000_000, bauzeit: 2 },
  PL: { name: 'Polen', region: 'EU', lohnIndex: 0.5, baukosten: 8_000_000, bauzeit: 2 },
  US: { name: 'USA', region: 'NA', lohnIndex: 1.1, baukosten: 15_000_000, bauzeit: 2 },
  MX: { name: 'Mexiko', region: 'NA', lohnIndex: 0.4, baukosten: 10_000_000, bauzeit: 2 },
  VN: { name: 'Vietnam', region: 'AS', lohnIndex: 0.3, baukosten: 10_000_000, bauzeit: 3 },
  BR: { name: 'Brasilien', region: 'RW', lohnIndex: 0.45, baukosten: 12_000_000, bauzeit: 3 },
} as const;
