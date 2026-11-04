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
  /** Angebotene Produkte */
  produkte: ProductId[];
  /** Regionen, in denen der Konkurrent verkauft */
  regionen: RegionId[];
  /**
   * Absatzanteil je Segment beim Spielstart (Kalibrierung über eine „Stärke“, z. B. Händlernetz).
   * Fehlt die Region, gilt die natürliche Attraktivität.
   */
  zielAnteil?: Partial<Record<RegionId, number>>;
  /** Fokus-Faktor auf den Zielanteil je Produkt (Spezialisten) */
  fokus?: Partial<Record<ProductId, number>>;
  /** Reagiert erst ab diesem Jahresumsatz des Spielers – dann aber hart */
  reaktionAbUmsatz?: number;
  boersennotiert?: boolean;
  /** Faktor auf die Herstellkosten (Fertigung in Niedriglohnländern, Einkaufsmacht) */
  kostenFaktor?: number;
  start: {
    kasse: number;
    bekanntheit: Partial<Record<RegionId, number>>;
    image: number;
    nachhaltigkeit: number;
    feStock: Partial<Record<ProductId, number>>;
    lagerFaktor: number;
    /** Linien beim Start (nur für die kleinen deutschen Konkurrenten fest; sonst aus der Nachfrage berechnet) */
    linien?: number;
  };
  /** 0 = vorsichtig, 1 = riskant beim Linienausbau */
  expansionsRisiko: number;
}

const DE_PRODUKTE: ProductId[] = ['stadtrad', 'ebike'];

/** Konkurrenten (Abschnitt 9). Wer außerhalb der freigeschalteten Regionen aktiv ist, läuft im Hintergrund mit. */
export const KONKURRENTEN: KonkurrentProfil[] = [
  {
    id: 'drahtesel', name: 'Drahtesel & Söhne', heimat: 'DE', farbe: '#e11d48',
    profil: 'Kostenführer', beschreibung: 'Preis 8–12 % unter Durchschnitt, Billig-Lieferanten, wenig F&E.',
    preisFaktor: 0.9, aggressivitaet: 0.5, marketingAnteil: 0.03, feAnteil: 0.01, lieferant: 'billig', preisSprung: 0.0,
    produkte: DE_PRODUKTE, regionen: ['DE'],
    start: { linien: 2, kasse: 1_200_000, bekanntheit: { DE: 0.025 }, image: 45, nachhaltigkeit: 35, feStock: { stadtrad: 60_000, ebike: 60_000 }, lagerFaktor: 0.3 },
    expansionsRisiko: 0,
  },
  {
    id: 'veloveritas', name: 'Velo Veritas', heimat: 'DE', farbe: '#7c3aed',
    profil: 'Technik/Premium', beschreibung: 'Preis +15 %, F&E 8 % vom Umsatz, Premium-Lieferanten.',
    preisFaktor: 1.15, aggressivitaet: 0.3, marketingAnteil: 0.04, feAnteil: 0.08, lieferant: 'premium', preisSprung: 0.0,
    produkte: DE_PRODUKTE, regionen: ['DE'],
    start: { linien: 2, kasse: 1_600_000, bekanntheit: { DE: 0.02 }, image: 58, nachhaltigkeit: 55, feStock: { stadtrad: 90_000, ebike: 200_000 }, lagerFaktor: 0.3 },
    expansionsRisiko: 0,
  },
  {
    id: 'kettenreaktion', name: 'Kettenreaktion GmbH', heimat: 'DE', farbe: '#f59e0b',
    profil: 'Marketing-Rakete', beschreibung: 'Marketing 15 % vom Umsatz, sprunghafte Preise, riskante Expansion.',
    preisFaktor: 1.0, aggressivitaet: 0.6, marketingAnteil: 0.15, feAnteil: 0.02, lieferant: 'standard', preisSprung: 0.08,
    produkte: DE_PRODUKTE, regionen: ['DE'],
    start: { linien: 3, kasse: 900_000, bekanntheit: { DE: 0.03 }, image: 48, nachhaltigkeit: 40, feStock: { stadtrad: 70_000, ebike: 90_000 }, lagerFaktor: 0.3 },
    expansionsRisiko: 1,
  },
  {
    id: 'pedalo', name: 'Pedalo Italiano', heimat: 'EU', farbe: '#059669',
    profil: 'Design/Image', beschreibung: 'Hohe Bekanntheit, Rennrad-Fokus, gehobene Preise.',
    preisFaktor: 1.1, aggressivitaet: 0.3, marketingAnteil: 0.06, feAnteil: 0.04, lieferant: 'premium', preisSprung: 0,
    produkte: ['rennrad', 'stadtrad', 'ebike', 'mountainbike', 'emtb'], regionen: ['EU', 'DE', 'NA'],
    zielAnteil: { EU: 0.01, DE: 0.0025, NA: 0.001 }, fokus: { rennrad: 3 }, boersennotiert: true,
    start: { kasse: 20_000_000, bekanntheit: { EU: 0.25, DE: 0.08, NA: 0.03 }, image: 70, nachhaltigkeit: 55, feStock: { rennrad: 600_000 }, lagerFaktor: 0.3 },
    expansionsRisiko: 0.3,
  },
  {
    id: 'fietsfabriek', name: 'Fietsfabriek NL', heimat: 'EU', farbe: '#ea580c',
    profil: 'Lastenrad-Spezialist', beschreibung: 'Stark bei Lastenrädern, Nachhaltigkeit 75.',
    preisFaktor: 1.0, aggressivitaet: 0.3, marketingAnteil: 0.04, feAnteil: 0.04, lieferant: 'standard', preisSprung: 0,
    produkte: ['lastenrad', 'stadtrad', 'ebike'], regionen: ['EU', 'DE'],
    zielAnteil: { EU: 0.012, DE: 0.003 }, fokus: { lastenrad: 4 },
    start: { kasse: 30_000_000, bekanntheit: { EU: 0.3, DE: 0.1 }, image: 62, nachhaltigkeit: 75, feStock: { lastenrad: 500_000 }, lagerFaktor: 0.3 },
    expansionsRisiko: 0.3,
  },
  {
    id: 'freedom', name: 'Freedom Wheels Inc.', heimat: 'NA', farbe: '#2563eb',
    profil: 'MTB-Riese', beschreibung: 'Aggressiv bei Preissenkungen gegen Neueinsteiger.',
    preisFaktor: 0.95, aggressivitaet: 0.8, marketingAnteil: 0.05, feAnteil: 0.03, lieferant: 'standard', preisSprung: 0,
    produkte: ['mountainbike', 'emtb', 'ebike', 'stadtrad', 'rennrad'], regionen: ['NA', 'EU', 'RW'],
    zielAnteil: { NA: 0.012, EU: 0.002, RW: 0.002 }, fokus: { mountainbike: 3, emtb: 2 }, boersennotiert: true, kostenFaktor: 0.85,
    start: { kasse: 80_000_000, bekanntheit: { NA: 0.35, EU: 0.05, RW: 0.05 }, image: 55, nachhaltigkeit: 45, feStock: { mountainbike: 800_000, emtb: 600_000 }, lagerFaktor: 0.3 },
    expansionsRisiko: 0.5,
  },
  {
    id: 'goldenspoke', name: 'Golden Spoke Corp.', heimat: 'AS', farbe: '#ca8a04',
    profil: 'Amtierender Weltmarktführer', beschreibung: 'Wächst 1 % je Quartal, reagiert spät, aber hart.',
    preisFaktor: 0.88, aggressivitaet: 0.9, marketingAnteil: 0.03, feAnteil: 0.03, lieferant: 'standard', preisSprung: 0,
    produkte: ['stadtrad', 'ebike', 'mountainbike', 'rennrad', 'lastenrad', 'emtb'], regionen: ['AS', 'RW', 'NA', 'EU', 'DE'],
    zielAnteil: { AS: 0.2, RW: 0.08, NA: 0.03, EU: 0.03, DE: 0.004 }, reaktionAbUmsatz: 1_000_000_000, boersennotiert: true, kostenFaktor: 0.62,
    start: { kasse: 1_500_000_000, bekanntheit: { AS: 0.6, RW: 0.35, NA: 0.15, EU: 0.12, DE: 0.05 }, image: 50, nachhaltigkeit: 40, feStock: {}, lagerFaktor: 0.3 },
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
  /** Große Hersteller starten weiter oben auf der Erfahrungskurve */
  startKumGross: 200_000,
  mindestMarketing: 5_000,
  /** Quartalslöhne eines Konkurrenten (DE) für die Herstellkosten */
  lohnProStunde: 24,
  /** F&E-Stock für Produkte ohne eigene Angabe */
  feStockStandard: 150_000,
  /** Obergrenze für das F&E-Budget je Produkt und Quartal (verhindert Technik-Explosion bei Riesen) */
  feMaxProProdukt: 150_000,
  /** Kapazitätsreserve beim Start */
  startKapazitaetsReserve: 1.3,
} as const;
