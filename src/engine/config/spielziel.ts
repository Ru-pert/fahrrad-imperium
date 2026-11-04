/**
 * Balancing für das späte Spiel und das Spielziel (Endabrechnung).
 */

/** Koordinationskosten: Größe macht träge. Anteil vom Umsatz, gedeckelt. */
export const KOMPLEXITAET = {
  jeWeiteresWerk: 0.012,
  jeWeitereRegion: 0.014,
  jeWeiteresProdukt: 0.007,
  max: 0.14,
};

/** Härtere Konkurrenz */
export const KONKURRENZ_DRUCK = {
  /** Preiskampf, wenn der Spieler (Jahresumsatz) mindestens diesen Anteil des Konkurrenzumsatzes erreicht */
  kampfAbVerhaeltnis: 0.5,
  kampfPreisNachlass: 0.05,
  kampfMarketingFaktor: 1.3,
  /** Feature-Nachbau: nach so vielen Quartalen kopiert die Konkurrenz einen Teil der Wirkung */
  nachbauNachQuartalen: 4,
  nachbauAnteil: 0.6,
  /** Golden Spoke verliert ab diesem Quartal an Schwung (Stärke × Faktor je Quartal) */
  alterungAbQuartal: 8,
  alterungJeQuartal: 0.975,
  alterungMinimum: 0.3,
  /** Der alternde Riese schließt alte Werke: Linien × Faktor je Quartal, kein Ausbau mehr */
  linienSchwundJeQuartal: 0.985,
};

/** Spielziel: Endabrechnung nach 15 Jahren */
export const SPIELZIEL = {
  quartale: 60,
  /** Punkte-Bausteine (max. etwa 1.000) */
  punkte: {
    /** Eigenkapitalwert (eigener Anteil), logarithmisch: 1 Mio. € → 0, 100 Mrd. € → max */
    wertMax: 350,
    wertVon: 1e6,
    wertBis: 1e11,
    /** Weltrang nach Quartalsumsatz */
    rang: [250, 170, 120, 80, 50, 30, 15, 0],
    /** Je aktive Region */
    region: 25,
    /** Je Erfolg */
    erfolg: 5,
    /** (Image + Nachhaltigkeit) / 2 → 0–100 Punkte */
    imageMax: 100,
    /** Abzug bei Insolvenz (Faktor auf die Summe) */
    pleiteFaktor: 0.4,
  },
  stufen: [
    { ab: 0, name: 'Garagenbastler', text: 'Immerhin: Die Werkbank steht noch.' },
    { ab: 200, name: 'Werkstattmeister', text: 'Solides Handwerk, treue Stammkundschaft.' },
    { ab: 350, name: 'Fahrradfabrikant', text: 'Eine echte Fabrik mit Namen in der Branche.' },
    { ab: 500, name: 'Branchengröße', text: 'Die Konkurrenz schaut nervös auf deine Zahlen.' },
    { ab: 640, name: 'Konzernlenker', text: 'Ein Imperium auf mehreren Kontinenten.' },
    { ab: 800, name: 'Fahrrad-Kaiser', text: 'Die Welt fährt deine Räder – du hast Golden Spoke vom Thron gestoßen.' },
  ],
};
