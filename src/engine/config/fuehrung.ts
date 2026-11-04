/** Führungskräfte: Ressorts, Macken, Gehälter, Loyalität */
import type { Ressort } from '../types';

export const RESSORTS: Record<Ressort, { name: string; titel: [string, string, string]; wirkung: string; farbe: string; icon: string }> = {
  produktion: { name: 'Produktion', titel: ['Werksleitung', 'Produktionsdirektion', 'Vorstand Produktion'], wirkung: 'Kapazität aller Werke', farbe: '#0891b2', icon: 'produktion' },
  vertrieb: { name: 'Vertrieb', titel: ['Vertriebsleitung', 'Vertriebsdirektion', 'Vorstand Vertrieb'], wirkung: 'Nachfrage in allen Märkten', farbe: '#16a34a', icon: 'preis' },
  forschung: { name: 'Forschung', titel: ['Laborleitung', 'Forschungsdirektion', 'Vorstand Technik'], wirkung: 'Wirkung von F&E und Forschungsprojekten', farbe: '#7c3aed', icon: 'fe' },
  marketing: { name: 'Marketing', titel: ['Marketingleitung', 'Markendirektion', 'Vorstand Marke'], wirkung: 'Werbewirkung (Bekanntheit)', farbe: '#db2777', icon: 'marketing' },
  finanzen: { name: 'Finanzen', titel: ['Leitung Finanzen', 'Finanzdirektion', 'Finanzvorstand'], wirkung: 'Verwaltungskosten und Kreditzinsen', farbe: '#b45309', icon: 'finanzen' },
};
export const RESSORT_IDS = Object.keys(RESSORTS) as Ressort[];

export interface MackeDef {
  id: string;
  name: [string, string];
  text: string;
  /** Multiplikator auf die Ressortwirkung */
  wirkung?: number;
  gehalt?: number;
  /** Multiplikator auf das Abwerberisiko (0 = nie) */
  abwerbung?: number;
  loyalitaet?: number;
  qualitaet?: number;
  image?: number;
  bekanntheit?: number;
  nachhaltigkeit?: number;
  motivation?: number;
  burnout?: number;
  /** Wirkung schwankt jedes Quartal zwischen min und max */
  schwankung?: [number, number];
}

export const MACKEN: MackeDef[] = [
  { id: 'perfektion', name: ['Perfektionistin', 'Perfektionist'], text: 'Etwas langsamer, aber jede Schraube sitzt: Qualität aller Räder steigt leicht.', wirkung: 0.85, qualitaet: 0.03 },
  { id: 'draufgaenger', name: ['Draufgängerin', 'Draufgänger'], text: 'Holt mehr heraus als alle anderen – und ist für Abwerbeangebote sehr empfänglich.', wirkung: 1.3, abwerbung: 1.7 },
  { id: 'sparfuchs', name: ['Sparfüchsin', 'Sparfuchs'], text: 'Verlangt ein Viertel weniger Gehalt, knausert aber beim Kaffee: Motivation in den Werken sinkt leicht.', gehalt: 0.75, motivation: -0.01 },
  { id: 'charme', name: ['Charmebolzen', 'Charmebolzen'], text: 'Alle lieben sie oder ihn: Image +1,5 je Quartal (Zielwert).', image: 1.5 },
  { id: 'workaholic', name: ['Workaholic', 'Workaholic'], text: 'Arbeitet Tag und Nacht (+20 % Wirkung), fällt aber ab und zu mit Burn-out ein Quartal aus.', wirkung: 1.2, burnout: 0.07 },
  { id: 'netzwerk', name: ['Netzwerkerin', 'Netzwerker'], text: 'Kennt jeden: Bekanntheit in allen Märkten +0,4 Punkte je Quartal.', bekanntheit: 0.004 },
  { id: 'chaos', name: ['Chaos-Genie', 'Chaos-Genie'], text: 'Mal genial, mal daneben: Die Wirkung schwankt jedes Quartal zwischen 50 % und 170 %.', schwankung: [0.5, 1.7] },
  { id: 'treu', name: ['Treue Seele', 'Treue Seele'], text: 'Lässt sich nie abwerben, wirkt aber etwas weniger stark (−10 %).', wirkung: 0.9, abwerbung: 0, loyalitaet: 3 },
  { id: 'oeko', name: ['Öko-Herz', 'Öko-Herz'], text: 'Achtet auf die Umwelt: Nachhaltigkeit +3 (Zielwert).', nachhaltigkeit: 3 },
];
export const mackeVon = (id: string): MackeDef => MACKEN.find((m) => m.id === id) ?? MACKEN[0];

export const FUEHRUNG = {
  /** Wirkung je Stufe (2 % → Stufe 5 = 10 %) */
  wirkungJeStufe: 0.02,
  /** Zusatzwirkung je Beförderung */
  befoerderungBonus: 0.15,
  /** Forschung, Marketing: Hebel auf die Wirkung (3 × 10 % = 30 %) */
  hebel: { produktion: 1, vertrieb: 1, forschung: 2, marketing: 2, finanzen: 2 },
  /** Gehalt je Quartal: Stufe^exp × max(min, anteil × Quartalsumsatz) */
  gehalt: { exponent: 1.35, min: 12_000, umsatzAnteil: 0.0006, mindestAnteilMarkt: 0.9 },
  anwerbePraemie: 1,
  abfindung: 2,
  abloese: 2,
  befoerderung: { gehalt: 1.25, loyalitaet: 25, abstand: 4, max: 2 },
  loyalitaet: { start: 60, jeQuartal: 2, gehaltFaktor: 25, gehaltMax: 5, verlust: -4, min: 0, max: 100 },
  abwerbung: { basis: 0.5, sperre: 2, topZuschlag: 1.3, forderung: 1.1, aufschlag: 1.15 },
  bewerber: 3,
  konkurrentAnteil: 0.25,
  stufenGewicht: [0.15, 0.3, 0.3, 0.18, 0.07],
};

export const VORNAMEN_W = ['Anja', 'Birte', 'Carla', 'Dilek', 'Elif', 'Frieda', 'Greta', 'Hanna', 'Ines', 'Jule', 'Katja', 'Lena', 'Mia', 'Nora', 'Olga', 'Pia', 'Rosa', 'Sanne', 'Tanja', 'Yasmin', 'Zoe', 'Aylin', 'Merle', 'Wiebke'];
export const VORNAMEN_M = ['Arne', 'Ben', 'Cem', 'Dario', 'Emil', 'Finn', 'Gustav', 'Hakan', 'Ivo', 'Jonas', 'Kemal', 'Lars', 'Mats', 'Nils', 'Ole', 'Paul', 'Rafael', 'Sven', 'Tarik', 'Uwe', 'Yusuf', 'Malte', 'Henrik', 'Lukas'];
export const NACHNAMEN = ['Schaltwerk', 'Felgenhauer', 'Nabe', 'Ritzel', 'Lenker', 'Sattler', 'Bremer', 'Kurbel', 'Speichert', 'Rahmlow', 'Klingel', 'Strampe', 'Tretmann', 'Kettler', 'Pedalski', 'Schlauch', 'Ventil', 'Gangl', 'Dynamo', 'Rücktritt', 'Lichtenberg', 'Sturm', 'Bergmann', 'Yilmaz', 'Nowak', 'Okafor', 'Rossi', 'Haddad'];
