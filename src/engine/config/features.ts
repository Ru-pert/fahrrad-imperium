import type { ProductId } from '../types';

/**
 * Feature-Forschung: einzelne Ausstattungsmerkmale der Räder.
 * Epoche 1 ist realistisch, jede weitere Epoche wird abgedrehter (und teurer).
 * Wirkungen gelten für alle Produkte in `fuer`, die im Programm sind – auch für später erforschte.
 */
export interface FeatureWirkung {
  /** additiv auf die Technik (Skala von technikAusStock) */
  technik?: number;
  /** additiv auf die Qualität (0,8–1,2) */
  qualitaet?: number;
  /** Faktor auf die Attraktivität (0,05 = +5 %) */
  nachfrage?: number;
  /** dauerhafter Image-Bonus (Punkte) */
  image?: number;
  /** dauerhafter Nachhaltigkeits-Bonus (Punkte im Zielwert) */
  nachhaltigkeit?: number;
  /** Materialkosten-Änderung (0,03 = +3 %) */
  material?: number;
}

export type FeatureBild =
  | 'nabenschaltung' | 'scheibenbremse' | 'licht' | 'alurahmen'
  | 'riemen' | 'wechselakku' | 'carbon' | 'gps'
  | 'smart' | 'solar' | 'luftlos' | 'falt'
  | 'gyro' | 'magnet' | 'gedanken' | 'rakete'
  | 'antigrav' | 'flux' | 'bewusstsein';

export interface FeatureProjekt {
  id: string;
  name: string;
  /** kurzer Werbespruch */
  slogan: string;
  beschreibung: string;
  epoche: 1 | 2 | 3 | 4 | 5;
  kosten: number;
  mindestQuartale: number;
  /** Feature- oder Produkt-Forschungsprojekte */
  voraussetzungen: string[];
  fuer: ProductId[];
  wirkung: FeatureWirkung;
  bild: FeatureBild;
  /** Zeile innerhalb der Epochen-Spalte */
  zeile: number;
}

export const EPOCHEN: Record<FeatureProjekt['epoche'], { name: string; text: string; farbe: string }> = {
  1: { name: 'Solide Technik', text: 'Bewährt und realistisch', farbe: '#0ea5e9' },
  2: { name: 'Moderne Ausstattung', text: 'Was Premiumräder heute haben', farbe: '#10b981' },
  3: { name: 'Zukunftstechnik', text: 'Gerade noch denkbar', farbe: '#8b5cf6' },
  4: { name: 'Abgedreht', text: 'Die Ingenieure trinken zu viel Kaffee', farbe: '#f97316' },
  5: { name: 'Völlig irre', text: 'Physik ist eher ein Vorschlag', farbe: '#ec4899' },
};

const ALLE: ProductId[] = ['stadtrad', 'ebike', 'mountainbike', 'rennrad', 'lastenrad', 'emtb'];
const ALLTAG: ProductId[] = ['stadtrad', 'ebike', 'lastenrad'];
const E: ProductId[] = ['ebike', 'lastenrad', 'emtb'];
const SPORT: ProductId[] = ['mountainbike', 'rennrad', 'emtb'];

export const FEATURES: FeatureProjekt[] = [
  // ---------------------------------------------------------------- Epoche 1: realistisch
  {
    id: 'f-nabenschaltung', name: 'Nabenschaltung', slogan: '8 Gänge, null Kettenfett an der Hose',
    beschreibung: 'Wartungsarme 8-Gang-Nabe im Hinterrad. Pendler lieben sie.',
    epoche: 1, kosten: 300_000, mindestQuartale: 2, voraussetzungen: [], fuer: ALLTAG,
    wirkung: { qualitaet: 0.02, nachfrage: 0.03 }, bild: 'nabenschaltung', zeile: 0,
  },
  {
    id: 'f-scheibenbremsen', name: 'Hydraulische Scheibenbremsen', slogan: 'Bremst auch bei Regen',
    beschreibung: 'Bremsscheiben vorne und hinten. Mehr Sicherheit, etwas teureres Material.',
    epoche: 1, kosten: 350_000, mindestQuartale: 2, voraussetzungen: [], fuer: ALLE,
    wirkung: { qualitaet: 0.03, nachfrage: 0.02, material: 0.02 }, bild: 'scheibenbremse', zeile: 1,
  },
  {
    id: 'f-licht', name: 'LED-Licht & Nabendynamo', slogan: 'Immer Licht, nie Batterien',
    beschreibung: 'Strom aus der Vorderradnabe für helles LED-Licht. Gut fürs Image.',
    epoche: 1, kosten: 250_000, mindestQuartale: 1, voraussetzungen: [], fuer: ALLTAG,
    wirkung: { nachfrage: 0.03, image: 0.5 }, bild: 'licht', zeile: 2,
  },
  {
    id: 'f-alurahmen', name: 'Hydroforming-Alurahmen', slogan: '2 kg leichter',
    beschreibung: 'Unter Hochdruck geformte Aluminiumrohre: leichter und steifer.',
    epoche: 1, kosten: 400_000, mindestQuartale: 2, voraussetzungen: [], fuer: ALLE,
    wirkung: { technik: 0.06, material: -0.01 }, bild: 'alurahmen', zeile: 3,
  },
  // ---------------------------------------------------------------- Epoche 2: modern
  {
    id: 'f-riemen', name: 'Riemenantrieb', slogan: 'Leise wie ein Segelboot',
    beschreibung: 'Carbonriemen statt Kette: rostet nicht, quietscht nicht, hält ewig.',
    epoche: 2, kosten: 700_000, mindestQuartale: 2, voraussetzungen: ['f-nabenschaltung'], fuer: ALLTAG,
    wirkung: { qualitaet: 0.04, nachfrage: 0.04 }, bild: 'riemen', zeile: 0,
  },
  {
    id: 'f-wechselakku', name: 'Wechselakku', slogan: 'Akku raus, in die Wohnung, laden',
    beschreibung: 'Herausnehmbarer Akku mit doppelter Reichweite. Setzt den Elektroantrieb voraus.',
    epoche: 2, kosten: 800_000, mindestQuartale: 2, voraussetzungen: ['elektro'], fuer: E,
    wirkung: { nachfrage: 0.06, nachhaltigkeit: 1 }, bild: 'wechselakku', zeile: 1,
  },
  {
    id: 'f-carbon', name: 'Carbon-Rahmen', slogan: 'Leichter als dein Rucksack',
    beschreibung: 'Rahmen aus Kohlefaser. Sportfahrer zahlen dafür viel – das Material ist aber teuer.',
    epoche: 2, kosten: 900_000, mindestQuartale: 3, voraussetzungen: ['f-alurahmen'], fuer: SPORT,
    wirkung: { technik: 0.15, nachfrage: 0.03, material: 0.05 }, bild: 'carbon', zeile: 2,
  },
  {
    id: 'f-gps', name: 'GPS-Diebstahlschutz', slogan: 'Wir finden dein Rad',
    beschreibung: 'Versteckter GPS-Sender mit App. Gestohlene Räder werden wiedergefunden.',
    epoche: 2, kosten: 600_000, mindestQuartale: 2, voraussetzungen: ['f-licht'], fuer: ALLE,
    wirkung: { nachfrage: 0.04, image: 0.5 }, bild: 'gps', zeile: 3,
  },
  // ---------------------------------------------------------------- Epoche 3: Zukunft
  {
    id: 'f-smart', name: 'Smart-Bike mit Autopilot-Schaltung', slogan: 'Das Rad schaltet, bevor du es willst',
    beschreibung: 'Sensoren und KI wählen immer den richtigen Gang, das Display zeigt Navigation und Puls.',
    epoche: 3, kosten: 1_800_000, mindestQuartale: 3, voraussetzungen: ['f-riemen', 'f-gps'], fuer: ALLE,
    wirkung: { technik: 0.12, nachfrage: 0.04 }, bild: 'smart', zeile: 0,
  },
  {
    id: 'f-solar', name: 'Solar-Lackierung', slogan: 'Parken = Laden',
    beschreibung: 'Der Lack ist eine Solarzelle und lädt den Akku in der Sonne. Gut für Image und Umwelt.',
    epoche: 3, kosten: 2_000_000, mindestQuartale: 3, voraussetzungen: ['f-wechselakku'], fuer: E,
    wirkung: { nachfrage: 0.05, image: 1, nachhaltigkeit: 3, material: 0.02 }, bild: 'solar', zeile: 1,
  },
  {
    id: 'f-luftlos', name: 'Pannenfreie Luftlos-Reifen', slogan: 'Nie wieder Platten',
    beschreibung: 'Wabenstruktur statt Luftschlauch. Die Kundschaft ist begeistert, Werkstätten weniger.',
    epoche: 3, kosten: 1_500_000, mindestQuartale: 2, voraussetzungen: ['f-scheibenbremsen'], fuer: ALLE,
    wirkung: { qualitaet: 0.05, nachfrage: 0.03 }, bild: 'luftlos', zeile: 2,
  },
  {
    id: 'f-falt', name: 'Origami-Faltrahmen', slogan: 'Passt in jede Handtasche',
    beschreibung: 'Das Rad faltet sich auf Knopfdruck auf Aktentaschengröße zusammen.',
    epoche: 3, kosten: 1_700_000, mindestQuartale: 3, voraussetzungen: ['f-carbon'], fuer: ['stadtrad', 'ebike', 'rennrad'],
    wirkung: { nachfrage: 0.07, material: 0.03 }, bild: 'falt', zeile: 3,
  },
  // ---------------------------------------------------------------- Epoche 4: abgedreht
  {
    id: 'f-gyro', name: 'Gyro-Selbstbalance', slogan: 'Umfallen? Unmöglich.',
    beschreibung: 'Ein Kreisel im Rahmen hält das Rad aufrecht – auch im Stand und ohne Fahrer.',
    epoche: 4, kosten: 4_000_000, mindestQuartale: 3, voraussetzungen: ['f-smart'], fuer: ALLE,
    wirkung: { qualitaet: 0.04, nachfrage: 0.07 }, bild: 'gyro', zeile: 0,
  },
  {
    id: 'f-rakete', name: 'Raketen-Rückenwind', slogan: 'Von 0 auf Bußgeld in 2 Sekunden',
    beschreibung: 'Ein kleiner Booster am Gepäckträger. Riesige Nachfrage – aber er rußt und knallt gelegentlich.',
    epoche: 4, kosten: 4_500_000, mindestQuartale: 3, voraussetzungen: ['f-solar'], fuer: ['ebike', 'rennrad', 'emtb'],
    wirkung: { nachfrage: 0.12, qualitaet: -0.02, nachhaltigkeit: -3, image: -0.5 }, bild: 'rakete', zeile: 1,
  },
  {
    id: 'f-magnet', name: 'Magnetschwebe-Sattel', slogan: 'Sitzen wie auf einer Wolke',
    beschreibung: 'Der Sattel schwebt auf einem Magnetfeld. Schlaglöcher werden zur Legende.',
    epoche: 4, kosten: 3_500_000, mindestQuartale: 3, voraussetzungen: ['f-luftlos'], fuer: ALLE,
    wirkung: { qualitaet: 0.06, image: 1.5 }, bild: 'magnet', zeile: 2,
  },
  {
    id: 'f-gedanken', name: 'Gedankensteuerung', slogan: 'Denk an „Klingeln“',
    beschreibung: 'Ein Stirnband liest deine Absichten: Klingeln, Schalten und Blinken per Gedanke.',
    epoche: 4, kosten: 5_000_000, mindestQuartale: 4, voraussetzungen: ['f-smart'], fuer: ALLE,
    wirkung: { technik: 0.25, nachfrage: 0.03 }, bild: 'gedanken', zeile: 3,
  },
  // ---------------------------------------------------------------- Epoche 5: völlig irre
  {
    id: 'f-antigrav', name: 'Anti-Schwerkraft-Räder', slogan: 'Schwebt 10 cm über jedem Stau',
    beschreibung: 'Die Laufräder berühren den Boden nicht mehr. Ampeln sind jetzt nur noch Empfehlungen.',
    epoche: 5, kosten: 12_000_000, mindestQuartale: 4, voraussetzungen: ['f-gyro', 'f-magnet'], fuer: ALLE,
    wirkung: { technik: 0.2, nachfrage: 0.12, qualitaet: 0.03 }, bild: 'antigrav', zeile: 0,
  },
  {
    id: 'f-flux', name: 'Fluxkompensator', slogan: 'Ankunft vor Abfahrt',
    beschreibung: 'Bei exakt 88 km/h fährst du in die Vergangenheit. Nie wieder zu spät zur Arbeit.',
    epoche: 5, kosten: 15_000_000, mindestQuartale: 5, voraussetzungen: ['f-rakete', 'f-gedanken'], fuer: ALLE,
    wirkung: { technik: 0.3, nachfrage: 0.1, image: 3 }, bild: 'flux', zeile: 2,
  },
  {
    id: 'f-bewusstsein', name: 'Rad mit Bewusstsein', slogan: 'Es kommt, wenn du pfeifst',
    beschreibung: 'Das Rad hat eine eigene Persönlichkeit, holt dich ab und tröstet dich nach Montagen.',
    epoche: 5, kosten: 13_000_000, mindestQuartale: 4, voraussetzungen: ['f-gyro', 'f-gedanken'], fuer: ALLE,
    wirkung: { nachfrage: 0.1, qualitaet: 0.05, image: 2 }, bild: 'bewusstsein', zeile: 1,
  },
];

export const FEATURE_BALANCE = {
  /** Image-Bonus aller Features zusammen höchstens */
  imageMax: 6,
};
