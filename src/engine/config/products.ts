import type { ProductId } from '../types';

export interface ProduktConfig {
  id: ProductId;
  name: string;
  kurz: string;
  /** Freischaltungsregel (Text; die Logik folgt in Stufe 6). */
  freischaltung: string;
  referenzpreis: number;
  material: number;
  montageStunden: number;
  /** Preiselastizität ε */
  epsilon: number;
  /** Technik-Sensitivität τ */
  tau: number;
  /** Marktwachstum je Quartal */
  wachstum: number;
  istEBike: boolean;
  /**
   * Marktlebenszyklus: Wachstum je Quartal = basis + Boom (Glockenkurve um „mitte“) + Welle (Trends).
   * So entwickeln sich die Segmente unterschiedlich (Stadtrad schrumpft, E-Bike boomt früh, Lastenrad später …).
   */
  lebenszyklus: {
    basis: number;
    boom?: { hoehe: number; mitte: number; breite: number };
    welle?: { amplitude: number; periode: number };
    text: string;
  };
  /** Einführungskosten und Vorlaufzeit (Quartale) */
  einfuehrungskosten: number;
  vorlauf: number;
}

export const PRODUKTE: Record<ProductId, ProduktConfig> = {
  stadtrad: { id: 'stadtrad', name: 'Stadtrad', kurz: 'Stadt', freischaltung: 'Start', referenzpreis: 650, material: 260, montageStunden: 4, epsilon: 2.5, tau: 0.15, wachstum: 0.003, istEBike: false, einfuehrungskosten: 0, vorlauf: 0, lebenszyklus: { basis: -0.004, text: 'Großer, reifer Markt – schrumpft langsam' } },
  ebike: { id: 'ebike', name: 'E-Bike', kurz: 'E-Bike', freischaltung: 'Start', referenzpreis: 2800, material: 1350, montageStunden: 7, epsilon: 1.4, tau: 0.45, wachstum: 0.02, istEBike: true, einfuehrungskosten: 0, vorlauf: 0, lebenszyklus: { basis: 0.006, boom: { hoehe: 0.032, mitte: 4, breite: 18 }, text: 'Boom in den ersten Jahren, danach Sättigung' } },
  mountainbike: { id: 'mountainbike', name: 'Mountainbike', kurz: 'MTB', freischaltung: 'F&E-Gesamtstock ≥ 1 Mio. €', referenzpreis: 1100, material: 450, montageStunden: 5, epsilon: 1.8, tau: 0.3, wachstum: 0.01, istEBike: false, einfuehrungskosten: 500000, vorlauf: 1, lebenszyklus: { basis: 0.006, welle: { amplitude: 0.008, periode: 20 }, text: 'Stabil, schwankt mit Outdoor-Trends' } },
  lastenrad: { id: 'lastenrad', name: 'Lastenrad', kurz: 'Last', freischaltung: 'Umsatz 4Q ≥ 15 Mio. €', referenzpreis: 4200, material: 2100, montageStunden: 10, epsilon: 1.2, tau: 0.35, wachstum: 0.035, istEBike: true, einfuehrungskosten: 500000, vorlauf: 1, lebenszyklus: { basis: 0.006, boom: { hoehe: 0.05, mitte: 22, breite: 8 }, text: 'Nische – wird in einigen Jahren zum großen Trend' } },
  rennrad: { id: 'rennrad', name: 'Rennrad', kurz: 'Renn', freischaltung: 'Europa freigeschaltet', referenzpreis: 1900, material: 800, montageStunden: 6, epsilon: 1.1, tau: 0.5, wachstum: 0.008, istEBike: false, einfuehrungskosten: 500000, vorlauf: 1, lebenszyklus: { basis: 0.003, welle: { amplitude: 0.012, periode: 16 }, text: 'Klein, aber treu – folgt dem Radsport-Fieber' } },
  emtb: { id: 'emtb', name: 'E-MTB', kurz: 'E-MTB', freischaltung: 'E-Bike-Technik ≥ Marktdurchschnitt + 0,5', referenzpreis: 4500, material: 2200, montageStunden: 9, epsilon: 1.0, tau: 0.55, wachstum: 0.025, istEBike: true, einfuehrungskosten: 500000, vorlauf: 1, lebenszyklus: { basis: 0.008, boom: { hoehe: 0.045, mitte: 32, breite: 12 }, text: 'Startet winzig, wächst später stark' } },
};

export const PRODUKT_IDS = Object.keys(PRODUKTE) as ProductId[];
/** Produkte, die in Stufe 1/2 der Umsetzung im Spiel sind. */
export const STARTPRODUKTE: ProductId[] = ['stadtrad'];

/** Lieferantenstufen (Kosten, Qualität, Ausfallrisiko je Quartal, Umweltindex) */
export const LIEFERANTEN = {
  billig: { kosten: 0.85, qualitaet: 0.9, ausfall: 0.08, umwelt: 35, label: 'Billig' },
  standard: { kosten: 1.0, qualitaet: 1.0, ausfall: 0.03, umwelt: 50, label: 'Standard' },
  premium: { kosten: 1.15, qualitaet: 1.1, ausfall: 0.01, umwelt: 70, label: 'Premium' },
} as const;

/** Gewichte der Komponenten am Materialwert. */
export const KOMPONENTEN_GEWICHT_EBIKE = { rahmen: 0.3, antrieb: 0.3, akku: 0.4 } as const;
export const KOMPONENTEN_GEWICHT_STANDARD = { rahmen: 0.5, antrieb: 0.5, akku: 0 } as const;

/** Linientypen (Abschnitt 6.1) */
export const LINIENTYPEN = {
  A: { name: 'Hochleistung', preis: 900000, lebensdauer: 40, kapazitaet: 9000, fixkosten: 25000, umwelt: 45, restwert: 0.3 },
  B: { name: 'Standard', preis: 600000, lebensdauer: 40, kapazitaet: 6000, fixkosten: 15000, umwelt: 60, restwert: 0.4 },
  C: { name: 'Öko-Kompakt', preis: 450000, lebensdauer: 32, kapazitaet: 4000, fixkosten: 8000, umwelt: 85, restwert: 0.2 },
} as const;

export const WARTUNG = {
  keiner: { kosten: 0, label: 'Keiner' },
  basis: { kosten: 4000, label: 'Basis' },
  voll: { kosten: 7000, label: 'Voll' },
} as const;
