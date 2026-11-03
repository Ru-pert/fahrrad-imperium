import type { ProductId, RegionId, SupplierLevel } from '../types';

export interface KonkurrentProfil {
  id: string;
  name: string;
  heimat: RegionId;
  farbe: string;
  profil: string;
  beschreibung: string;
  /** Zielpreis relativ zum Marktdurchschnitt */
  preisFaktor: number;
  /** Wahrscheinlichkeit, auf Marktanteilsgewinne des Spielers mit Preissenkung zu reagieren (0,2–0,8) */
  aggressivitaet: number;
  /** Marketing und F&E als Anteil des Vorquartalsumsatzes */
  marketingAnteil: number;
  feAnteil: number;
  lieferant: SupplierLevel;
  /** Zusätzliche Preisschwankung (sprunghafte Preise) */
  preisSprung: number;
  /** Startwerte */
  start: {
    linien: number;
    kasse: number;
    bekanntheit: number;
    image: number;
    nachhaltigkeit: number;
    feStock: Record<ProductId, number>;
    lagerFaktor: number;
    /** Aufteilung des Marketings auf die Produkte */
    marketingSplit: Record<ProductId, number>;
  };
  /** Ab dieser Kasse wird die Expansion ausgelöst (Linienbau) */
  expansionsRisiko: number;
}

const split = (stadtrad: number, ebike: number): Record<ProductId, number> => ({
  stadtrad, ebike, mountainbike: 0, lastenrad: 0, rennrad: 0, emtb: 0,
});
const fe = (s: number, e: number): Record<ProductId, number> => ({
  stadtrad: s, ebike: e, mountainbike: 0, lastenrad: 0, rennrad: 0, emtb: 0,
});

/** Die drei deutschen Konkurrenten der Stufe 1. Weitere folgen in Stufe 6. */
export const KONKURRENTEN: KonkurrentProfil[] = [
  {
    id: 'drahtesel', name: 'Drahtesel & Söhne', heimat: 'DE', farbe: '#e11d48',
    profil: 'Kostenführer', beschreibung: 'Preis 8–12 % unter Durchschnitt, Billig-Lieferanten, wenig F&E.',
    preisFaktor: 0.9, aggressivitaet: 0.5, marketingAnteil: 0.03, feAnteil: 0.01, lieferant: 'billig', preisSprung: 0.0,
    start: { linien: 2, kasse: 1_200_000, bekanntheit: 0.025, image: 45, nachhaltigkeit: 35, feStock: fe(60_000, 60_000), lagerFaktor: 0.3, marketingSplit: split(0.5, 0.5) },
    expansionsRisiko: 0,
  },
  {
    id: 'veloveritas', name: 'Velo Veritas', heimat: 'DE', farbe: '#7c3aed',
    profil: 'Technik/Premium', beschreibung: 'Preis +15 %, F&E 8 % vom Umsatz, Premium-Lieferanten.',
    preisFaktor: 1.15, aggressivitaet: 0.3, marketingAnteil: 0.04, feAnteil: 0.08, lieferant: 'premium', preisSprung: 0.0,
    start: { linien: 2, kasse: 1_600_000, bekanntheit: 0.02, image: 58, nachhaltigkeit: 55, feStock: fe(90_000, 200_000), lagerFaktor: 0.3, marketingSplit: split(0.3, 0.7) },
    expansionsRisiko: 0,
  },
  {
    id: 'kettenreaktion', name: 'Kettenreaktion GmbH', heimat: 'DE', farbe: '#f59e0b',
    profil: 'Marketing-Rakete', beschreibung: 'Marketing 15 % vom Umsatz, sprunghafte Preise, riskante Expansion.',
    preisFaktor: 1.0, aggressivitaet: 0.6, marketingAnteil: 0.15, feAnteil: 0.02, lieferant: 'standard', preisSprung: 0.08,
    start: { linien: 3, kasse: 900_000, bekanntheit: 0.03, image: 48, nachhaltigkeit: 40, feStock: fe(70_000, 90_000), lagerFaktor: 0.3, marketingSplit: split(0.4, 0.6) },
    expansionsRisiko: 1,
  },
];

export const KONKURRENT_BALANCE = {
  /** Fixkosten je Linie und Quartal (Personal, Verwaltung, Abschreibung) */
  fixkostenProLinie: 100_000,
  linieStunden: 6000,
  linienKosten: 600_000,
  produktionsAufschlag: 1.1,
  ausbauAuslastung: 0.9,
  rauschen: 0.05,
  senkungMin: 0.03,
  senkungMax: 0.08,
  pleiteQuartale: 3,
  steuersatz: 0.3,
  startKumProduktion: 2000,
  mindestMarketing: 5_000,
  /** Quartalslöhne eines Konkurrenten (DE) für die Herstellkosten */
  lohnProStunde: 24,
} as const;
