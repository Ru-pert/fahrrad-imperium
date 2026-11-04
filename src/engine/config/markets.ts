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

export interface WerkStandort {
  name: string;
  /** Ortsname für die Werksansicht */
  ort: string;
  region: RegionId;
  lohnIndex: number;
  baukosten: number;
  bauzeit: number;
  besonderheit: string;
  /** Qualitätsabschlag auf dort gebaute Räder */
  qualitaet: number;
  /** Wirkung auf den Nachhaltigkeitsindex (Δ_Werke) */
  nachhaltigkeit: number;
  /** Voraussetzung: Region freigeschaltet (undefined = immer möglich) */
  braucht?: RegionId;
}

/** Werkstandorte (8). Polen, USA und Mexiko dürfen schon vor der Freischaltung ihrer Region gebaut werden (Asien-Bedingung). */
export const WERK_STANDORTE: Record<string, WerkStandort> = {
  DE: { name: 'Deutschland (weiteres Werk)', ort: 'Kassel', region: 'DE', lohnIndex: 1.0, baukosten: 12_000_000, bauzeit: 2, besonderheit: 'keine', qualitaet: 0, nachhaltigkeit: 0 },
  PL: { name: 'Polen', ort: 'Wrocław', region: 'EU', lohnIndex: 0.5, baukosten: 8_000_000, bauzeit: 2, besonderheit: 'günstige Löhne, nah an Europa', qualitaet: 0, nachhaltigkeit: 0 },
  US: { name: 'USA', ort: 'Denver', region: 'NA', lohnIndex: 1.1, baukosten: 15_000_000, bauzeit: 2, besonderheit: 'spart den US-Zoll', qualitaet: 0, nachhaltigkeit: 0 },
  MX: { name: 'Mexiko', ort: 'Monterrey', region: 'NA', lohnIndex: 0.4, baukosten: 10_000_000, bauzeit: 2, besonderheit: 'Nachhaltigkeit −3', qualitaet: 0, nachhaltigkeit: -3 },
  VN: { name: 'Vietnam', ort: 'Hải Phòng', region: 'AS', lohnIndex: 0.3, baukosten: 10_000_000, bauzeit: 3, besonderheit: 'Qualität −0,03, Nachhaltigkeit −5', qualitaet: -0.03, nachhaltigkeit: -5, braucht: 'AS' },
  BR: { name: 'Brasilien', ort: 'Curitiba', region: 'RW', lohnIndex: 0.45, baukosten: 12_000_000, bauzeit: 3, besonderheit: 'erfordert Rest der Welt', qualitaet: 0, nachhaltigkeit: 0, braucht: 'RW' },
};
