import type { ProductId } from '../types';

/**
 * Forschungsbaum: Neue Produkte entstehen nur durch Forschung.
 * Ein Projekt ist fertig, wenn das investierte Budget die Kosten erreicht UND die Mindestdauer vergangen ist.
 */
export interface ForschungsProjekt {
  id: string;
  name: string;
  beschreibung: string;
  /** Produkt, das nach Abschluss in Serie gehen kann */
  produkt: ProductId;
  kosten: number;
  mindestQuartale: number;
  voraussetzungen: string[];
  /** Position im Baum (Spalte, Zeile) für die Grafik */
  spalte: number;
  zeile: number;
}

export const FORSCHUNG: ForschungsProjekt[] = [
  {
    id: 'elektro', name: 'Elektroantrieb', produkt: 'ebike', kosten: 1_200_000, mindestQuartale: 3, voraussetzungen: [], spalte: 1, zeile: 0,
    beschreibung: 'Motor, Akku und Steuerung – die Grundlage aller E-Modelle. Danach kannst du E-Bikes bauen.',
  },
  {
    id: 'federung', name: 'Federung & Geländerahmen', produkt: 'mountainbike', kosten: 600_000, mindestQuartale: 2, voraussetzungen: [], spalte: 1, zeile: 1,
    beschreibung: 'Robuste Rahmen und Federgabeln für das Gelände. Danach kannst du Mountainbikes bauen.',
  },
  {
    id: 'leichtbau', name: 'Leichtbau', produkt: 'rennrad', kosten: 900_000, mindestQuartale: 3, voraussetzungen: [], spalte: 1, zeile: 2,
    beschreibung: 'Leichte Rahmen und Aerodynamik. Danach kannst du Rennräder bauen.',
  },
  {
    id: 'lastenrahmen', name: 'Lastenrahmen', produkt: 'lastenrad', kosten: 800_000, mindestQuartale: 2, voraussetzungen: ['elektro'], spalte: 2, zeile: 0,
    beschreibung: 'Lange Rahmen, Ladefläche und starker Motor. Setzt den Elektroantrieb voraus.',
  },
  {
    id: 'emtb', name: 'E-MTB-Plattform', produkt: 'emtb', kosten: 1_000_000, mindestQuartale: 2, voraussetzungen: ['elektro', 'federung'], spalte: 2, zeile: 1,
    beschreibung: 'Elektroantrieb trifft Geländerahmen. Setzt Elektroantrieb und Federung voraus.',
  },
];

export const FORSCHUNG_BALANCE = {
  /** F&E-Stock des neuen Produkts = Anteil der Forschungskosten */
  feStockAnteil: 0.3,
  /** Kumulierte Menge zu Beginn (Erfahrungskurve: neue Produkte sind anfangs teurer) */
  startKumMenge: 1000,
};
