/**
 * Zentrale Balancing-Parameter. Alle Werte sind Spielwerte und ohne Codeänderung
 * in der Engine justierbar. Quellen: SPEZIFIKATION.md (Abschnittsnummern in Klammern).
 */
export const BALANCE = {
  startjahr: 2027,
  /** Saisonfaktoren Q1..Q4 (5.1) */
  saison: [0.75, 1.3, 1.15, 0.8],
  /** Marktpreiselastizität η (5.1) */
  marktPreisElastizitaet: 0.5,

  /** Attraktivität (5.2, 5.7) */
  attraktivitaet: {
    markeExponent: 0.6,
    mu: 1.0,
    /** M* = Anteil am Segmentumsatz je Quartal */
    mStarAnteil: 0.0005,
    kappa: 1.5,
    imageSpanne: 0.3,
    /** Preiskorridor: ±2 % um den Durchschnitt wirkt nur k × Elastizität */
    korridorBreite: 0.02,
    korridorFaktor: 0.3,
    plvExponent: 0.5,
  },

  /** Restmarkt (5.3, 5.5) */
  restmarkt: {
    startAnteil: 0.003,
    schrumpfungProQuartal: 0.01,
    technikWachstumProQuartal: 0.015,
    /** Technik-Startwert des Restmarkts je Segment (so, dass TI Stadtrad ≈ 105, E-Bike ≈ 104) */
    technikStart: { stadtrad: 0.405, ebike: 0.49, mountainbike: 0.45, lastenrad: 0.45, rennrad: 0.45, emtb: 0.5 },
  },

  /** Markenbekanntheit (5.4) */
  marke: {
    vergessen: 0.06,
    werbewirkung: 0.25,
    mundpropaganda: 0.5,
    eintrittStart: 0.01,
    eintrittAnteilHoechste: 0.1,
    /** Skalierung des Werbebudgets in der Bekanntheitsgleichung (Feinjustage für das Tempo des Markenaufbaus) */
    werbeSkala: 0.35,
  },

  /** Technologie (5.5) */
  technik: {
    veralterung: 0.05,
    fStern: 200_000,
    tiBasis: 105,
    tiSteigung: 12,
    marktfaehigAb: 100,
    phiNichtMarktfaehig: 0.2,
  },

  /** Qualität (5.6) */
  qualitaet: {
    schulungBonusMax: 0.05,
    schulungBonusBei: 1500,
    ueberstundenAbzug: 0.03,
    min: 0.8,
    max: 1.2,
  },

  /** Personal (6, 6.4) */
  personal: {
    lohnBrutto: 8500,
    nebenkosten: 0.3,
    betriebsrente: 0.05,
    stundenProMitarbeiter: 480,
    einstellKosten: 3000,
    entlassKosten: 6000,
    entlassKostenZusatz: 8000,
    entlassSchwelle: 0.2,
    maxEinstellung: 0.5,
    maxEntlassung: 0.2,
    imageProZehnProzentAbbau: 1,
    fluktuation: 0.03,
    ueberstundenMax: 0.15,
    ueberstundenZuschlag: 0.5,
    schichtkosten: 20_000,
    schulungMax: 2000,
    motivation: { min: 0.7, max: 1.2, anpassung: 0.3, optimaleAuslastung: 0.8, schulungsEffektBei: 500, entlassungsEffekt: 0.5 },
    kompetenz: { anpassung: 0.2, basis: 0.9, bonus: 0.25, schulungBei: 800 },
    einarbeitungsAbschlag: 0.5,
    verwaltungGehalt: 10_000,
    vertriebGehalt: 9500,
  },

  /** Produktion (6, 6.2) */
  produktion: {
    lernkurveExponent: -0.15,
    lernkurveBasis: 2000,
    lernkurveMin: 0.6,
    energieProStunde: 2,
    lagerKostenSatz: 0.02,
    materialLagerSatz: 0.015,
    nacharbeit: { basis: 0.02, technik: 0.3, ueberauslastung: 3, mengeBasis: 2000, mengeKoeffizient: 0.1, kostenanteil: 0.4 },
    lieferantenAusfallProduktion: 0.6,
    stoerungswahrscheinlichkeitOhneWartung: 0.05,
    stoerungsVerfuegbarkeit: 0.5,
    verfuegbarkeitOhneWartung: { abnahme: 0.03, min: 0.7 },
    verfuegbarkeitBasis: 0.95,
    verfuegbarkeitErholung: 0.05,
    maxLinienProHalle: 4,
    maxNeueLinienProQuartal: 4,
    linienBauzeit: 1,
  },

  /** Logistik (6) */
  logistik: { innerhalb: 0.03 },

  /** Finanzen (7, 7.1) */
  finanzen: {
    steuersatz: 0.3,
    basiszins: 0.03,
    darlehenLaufzeit: 8,
    kontokorrentZins: 0.12,
    mindestkasse: 50_000,
    forderungenAnteil: 0.15,
    verbindlichkeitenAnteil: 0.2,
    verwaltungSachkosten: 50_000,
    hqUnterhaltSatz: 0.01,
    abschreibungWerkQuartale: 40,
    abschreibungHqQuartale: 80,
    kreditlimitEbitdaFaktor: 3,
    kreditlimitSachanlagen: 0.5,
    /** Rating-Aufschläge AAA..D (p. a.) */
    ratingAufschlag: [0.005, 0.015, 0.025, 0.035, 0.045, 0.055, 0.065, 0.075, 0.09, 0.12],
    ratingStufen: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'],
    /** Insolvenz: so viele Quartale in Folge Kontokorrent > Limit bzw. negatives Eigenkapital */
    insolvenzQuartale: 2,
  },

  /** Verwaltung (6.4): MA_Verw = 4·(U/2,5 Mio)^0,7 */
  verwaltung: { basisVerwaltung: 4, basisEinkauf: 1, umsatzBasis: 2_500_000, exponent: 0.7 },

  /** Nachhaltigkeit & Image (13) */
  nachhaltigkeit: {
    anpassung: 0.2,
    umweltfaktor: 0.8,
    budgetMax: 25,
    nbSternAnteil: 0.005,
    nbSternMin: 20_000,
    umweltabgabe: { schwelleHoch: 125_000, mitte: 45_000, stuetzpunkte: [30, 40, 50] },
  },
  image: { anpassung: 0.25, basis: 20, nachhaltigkeitsFaktor: 0.4, qualitaetsFaktor: 30 },

  /** Unternehmenswert (12) */
  unternehmenswert: { basisMultiplikator: 6, wachstumsFaktor: 20, imageFaktor: 0.05, min: 4, max: 25, umsatzFaktorNegativ: 0.5 },

  /** Schwierigkeitsgrade (9) */
  schwierigkeit: {
    leicht: { reaktion: 0.5, effizienz: -0.1 },
    normal: { reaktion: 1, effizienz: 0 },
    schwer: { reaktion: 1.5, effizienz: 0.1 },
  },
} as const;

/** Startwerte (Abschnitt 3) */
export const START = {
  kasse: 1_500_000,
  gezeichnetesKapital: 1_000_000,
  darlehen: { betrag: 1_000_000, zins: 0.05, laufzeit: 8 },
  werk: {
    id: 'DE-1',
    name: 'Darmstadt',
    region: 'DE' as const,
    gebaeudeBuchwert: 900_000,
    gebaeudeRestlaufzeit: 30,
    linien: [
      { typ: 'B' as const, restlaufzeit: 6, umwelt: 40 },
      { typ: 'B' as const, restlaufzeit: 14, umwelt: 45 },
    ],
    mitarbeitende: 24,
    wartung: 'voll' as const,
  },
  lagerFertig: 300,
  lagerMaterialSets: 400,
  bekanntheit: 0.02,
  nachhaltigkeit: 40,
  image: 50,
  feStock: 100_000,
  motivation: 1.0,
  kompetenz: 1.0,
  zufriedenheit: 52,
  technikIndex: { stadtrad: 105, ebike: 104 },
  kumProduktion: 2000,
  /** Fiktive Vorjahresquartale zur Berechnung von EBITDA/Umsatz der letzten 4 Quartale */
  historieEbitda: [80_000, 80_000, 80_000, 80_000],
  historieUmsatz: [2_000_000, 2_000_000, 2_000_000, 2_000_000],
  vertriebDE: 4,
  planungsqualitaet: 60,
  /** Standardentscheidungen des ersten Quartals */
  entscheidungen: {
    preis: { stadtrad: 650, ebike: 2800 },
    marketing: { stadtrad: 30_000, ebike: 80_000 },
    produktion: { stadtrad: 1000, ebike: 800 },
    fe: { stadtrad: 20_000, ebike: 90_000 },
    schulung: 500,
  },
} as const;
