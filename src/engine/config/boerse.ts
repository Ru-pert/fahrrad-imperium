/** Börse und Übernahmen (Spezifikation 8 und 12) */
export const BOERSE = {
  aktienStart: 10_000_000,
  ipo: {
    mindestUmsatz4Q: 50_000_000,
    positiveEbitQuartale: 2,
    /** Rating mindestens BB */
    mindestRating: 'BB',
    anteilMin: 0.1,
    anteilMax: 0.4,
    spanne: 0.15,
    kosten: 0.05,
    /** Anleger zahlen bis zu (1 + x) × fairem Wert; darüber sinkt die Platzierung */
    toleranz: 0.05,
    /** Platzierungsquote fällt um diesen Faktor je 100 % Überbewertung */
    abfall: 4,
  },
  stimmung: { traegheit: 0.7, epsFaktor: 0.8, rauschen: 0.08, min: 0.5, max: 2, crashWahrscheinlichkeit: 0.02, crashFaktor: 0.7 },
  kapitalerhoehung: { max: 0.2, abschlag: 0.05, kosten: 0.03 },
  rueckkauf: { max: 0.1, aufschlag: 0.02 },
  /** Kurs der Konkurrenzaktie steigt je 1 % erworbenen Anteil um 1 % */
  aktienKaufAufschlag: 1,
};

export const UEBERNAHME = {
  /** Konkurrent darf höchstens diesen Anteil des eigenen Umsatzes haben */
  maxUmsatzVerhaeltnis: 0.5,
  kontrollpraemie: 1.3,
  integrationskosten: 0.1,
  effizienzAbschlag: 0.05,
  abschlagQuartale: 2,
  /** Bewertung von Konkurrenten: EV = max(umsatzFaktor × Jahresumsatz, ebitMultiple × Jahres-EBIT) */
  umsatzFaktor: 0.5,
  ebitMultiple: 8,
  /** Übernommene Linien höchstens (große Konzerne werden „verschlankt“) */
  maxLinien: 24,
  linienBuchwert: 300_000,
  gebaeudeWert: 4_000_000,
  /** Regionale Marke zukaufen */
  marke: { preisAnteilJahresmarkt: 0.0015, a0Senkung: 0.03, bekanntheit: 0.02 },
};
