/**
 * Spieltiefe (Spezifikation 5.7, 5.8, 6.3, 7, 11): Kundenzufriedenheit, Sonderabsatz,
 * Einkauf mit Mengenstaffeln, Rettungsangebot, Marktforschung & Spionage.
 */

export const ZUFRIEDENHEIT = {
  start: 52,
  /** Z_t = Z_{t−1} + anpassung · (Z^Ziel − Z_{t−1}) */
  anpassung: 0.3,
  basis: 50,
  /** +25 Punkte je 0,2 Qualität über 1,0 */
  qualitaetFaktor: 25 / 0.2,
  umweltFaktor: 0.2,
  /** −150 Punkte je 100 % Preiserhöhung (also −1,5 je 1 %) */
  preiserhoehungFaktor: 150,
  /** −40 Punkte bei 100 % Fehlmenge */
  fehlmengeFaktor: 40,
  imageFaktor: 0.1,
  /** Wirkung auf die Attraktivität: (Z / 50)^exponent */
  exponent: 0.5,
};

export const EINKAUF = {
  /** Rabatt nach Bestellmenge je Produkt und Quartal */
  staffeln: [
    { ab: 100_000, rabatt: 0.13 },
    { ab: 20_000, rabatt: 0.1 },
    { ab: 5_000, rabatt: 0.06 },
    { ab: 1_000, rabatt: 0.03 },
    { ab: 0, rabatt: 0 },
  ],
};

export const rabattFuer = (menge: number): number => EINKAUF.staffeln.find((s) => menge >= s.ab)?.rabatt ?? 0;

export const GROSSABNEHMER = {
  /** Angebote je aktiver Region und Quartal: 0 bis max */
  maxJeRegion: 2,
  wahrscheinlichkeit: 0.55,
  preisMin: 0.6,
  preisMax: 0.85,
  /** Höchstmenge relativ zum eigenen Vorquartalsabsatz im Segment */
  mengeMin: 0.08,
  mengeMax: 0.25,
  mindestMenge: 80,
  kunden: ['Leasing-Löwe GmbH', 'Pizzablitz Lieferdienst', 'Hotelkette Sonnenhof', 'Fahrradverleih Rollmops', 'Kurierdienst Pfeilschnell', 'Stadtwerke-Mitarbeiterflotte', 'Ferienpark Seeblick', 'Uni-Campus-Rad'],
};

export const AUSSCHREIBUNG = {
  wahrscheinlichkeit: 0.15,
  mengeMin: 400,
  mengeMax: 2500,
  minTechnikMin: 100,
  minTechnikMax: 112,
  /** Konkurrenz bietet Ø-Marktpreis × Faktor (≈ HK × 1,05–1,25) */
  konkurrenzMin: 0.55,
  konkurrenzMax: 0.75,
  /** Bei Lieferausfall: Image-Abzug */
  imageAbzugAusfall: 2,
  behoerden: ['Polizei', 'Bundeswehr-Fuhrpark', 'Deutsche Post', 'Stadtverwaltung', 'Forstamt', 'Rettungsdienst', 'Bahnhofsmission', 'Botschaftsfuhrpark'],
};

export const RETTUNG = {
  /** Anteil, den der Investor übernimmt */
  anteil: 0.4,
  mindestKapital: 1_500_000,
  /** Kapital = max(mindest, −Eigenkapital + puffer · Bilanzsumme, 1,2 · Kontokorrent) */
  puffer: 0.25,
};

export const MARKTFORSCHUNG = {
  marktbericht: { preis: 20_000, sigmaAnteile: 0.15, sigmaPreise: 0.08 },
  branchenanalyse: { preis: 80_000, sigmaPreise: 0.05, sigmaBudgets: 0.15 },
  kundenbefragung: { preis: 50_000, sigma: 0.2 },
  spionage: {
    preis: 250_000,
    grundrisiko: 0.15,
    jeWeitere: 0.05,
    schwerZuschlag: 0.1,
    strafeFaktor: 3,
    image: -15,
    racheQuartale: 2,
    /** Preisnachlass des ausspionierten Konkurrenten */
    racheRabatt: 0.12,
    /** Wahrscheinlichkeit, dass der Konkurrent seinen Plan trotzdem leicht ändert */
    planAenderung: 0.1,
  },
};
