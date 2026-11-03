/** Datenmodell der Engine. Reine Datentypen, keine React-Abhängigkeit. */

export type ProductId = 'stadtrad' | 'ebike' | 'mountainbike' | 'lastenrad' | 'rennrad' | 'emtb';
export type RegionId = 'DE' | 'EU' | 'NA' | 'AS' | 'RW';
export type SupplierLevel = 'billig' | 'standard' | 'premium';
export type Komponente = 'rahmen' | 'akku' | 'antrieb';
export type LinienTyp = 'A' | 'B' | 'C';
export type Wartung = 'keiner' | 'basis' | 'voll';
export type Schwierigkeit = 'leicht' | 'normal' | 'schwer';

export type PerProduct<T> = Partial<Record<ProductId, T>>;
export type PerRegion<T> = Partial<Record<RegionId, T>>;

// ---------------------------------------------------------------- Zustand

export interface Linie {
  id: string;
  typ: LinienTyp;
  status: 'bau' | 'aktiv';
  /** Quartale bis zur Fertigstellung (nur im Bau) */
  bauRest: number;
  /** Verbleibende Abschreibungsdauer in Quartalen (0 = abgeschrieben, läuft weiter) */
  restlaufzeit: number;
  anschaffung: number;
  buchwert: number;
  verfuegbarkeit: number;
  umweltindex: number;
}

export interface Werk {
  id: string;
  name: string;
  region: RegionId;
  lohnIndex: number;
  gebaeudeBuchwert: number;
  gebaeudeRestlaufzeit: number;
  linien: Linie[];
  mitarbeitende: number;
  motivation: number;
  kompetenz: number;
  wartung: Wartung;
}

export interface Lager {
  stueck: number;
  /** Durchschnittliche Herstellkosten je Stück */
  hk: number;
}

export interface ProduktZustand {
  freigeschaltet: boolean;
  /** F&E-Stock */
  fe: number;
  kumMenge: number;
  lager: Lager;
  materialSets: number;
  materialWert: number;
  /** Letzte Herstellkosten je Stück (Anzeige) */
  letzteHk: number;
}

export interface Kredit {
  id: string;
  restbetrag: number;
  tilgung: number;
  zins: number;
}

export interface Finanzen {
  kasse: number;
  kontokorrent: number;
  kredite: Kredit[];
  forderungen: number;
  verbindlichkeiten: number;
  gezeichnetesKapital: number;
  kapitalruecklage: number;
  gewinnruecklagen: number;
  /** Steuerlicher Verlustvortrag (positiver Betrag) */
  verlustvortrag: number;
  /** Zuletzt berechnetes Rating */
  rating: string;
  ratingScore: number;
  /** Anzahl Quartale in Folge mit Kontokorrent über Limit / negativem Eigenkapital */
  kritischZaehler: number;
}

export interface Firmensitz {
  stufe: number;
  extras: string[];
  /** Buchwert und Restlaufzeit der aktivierten Ausbauten */
  buchwert: number;
  anschaffung: number;
}

export interface MarktSegmentZustand {
  /** Restmarkt-Attraktivität beim Spielstart (schrumpft um 1 %/Quartal) */
  a0Start: number;
  /** Absatzanteile des Vorquartals je Anbieter (inkl. "rest") – Gewichte für Ø-Preis und Ø-Technik */
  anteile: Record<string, number>;
  durchschnittspreis: number;
  tBar: number;
  tRest: number;
  volumen: number;
}

export interface KonkurrentProduktZustand {
  fe: number;
  kumMenge: number;
  lager: number;
  hk: number;
  letzterAbsatz: number;
  letzterPreis: number;
  letztesMarketing: number;
  letzteProduktion: number;
}

export interface KonkurrentZustand {
  id: string;
  name: string;
  farbe: string;
  status: 'aktiv' | 'pleite';
  pleiteZaehler: number;
  kasse: number;
  linien: number;
  /** Linien im Bau (fertig im nächsten Quartal) */
  linienImBau: number;
  produkte: PerProduct<KonkurrentProduktZustand>;
  bekanntheit: PerRegion<number>;
  image: number;
  qualitaet: number;
  lieferant: SupplierLevel;
  letzterUmsatz: number;
  letztesEbit: number;
  letzteAuslastung: number;
  bilanzsumme: number;
}

export interface KonkurrentPlanProdukt {
  preis: PerRegion<number>;
  marketing: PerRegion<number>;
  fe: number;
  produktion: number;
}

export interface KonkurrentPlan {
  produkte: PerProduct<KonkurrentPlanProdukt>;
  neueLinien: number;
}

export interface KpiPunkt {
  quartal: number;
  umsatz: number;
  ebit: number;
  ueberschuss: number;
  kasse: number;
  marktanteil: number;
  unternehmenswert: number;
  image: number;
  absatz: number;
}

export interface Einstellungen {
  schwierigkeit: Schwierigkeit;
  profi: boolean;
  seed: number;
}

export interface Unternehmen {
  name: string;
  rechtsform: 'GmbH' | 'AG';
  farbe: string;
  image: number;
  nachhaltigkeit: number;
  umweltindex: number;
  planungsqualitaet: number;
  zufriedenheit: Record<string, number>;
  vertrieb: PerRegion<number>;
  firmensitz: Firmensitz;
}

export interface AktivesEreignis {
  id: string;
  /** Verbleibende Quartale inkl. des aktuellen */
  rest: number;
  /** Erst für das kommende Quartal angekündigt (für die Zeitung) */
  neu: boolean;
  werkId?: string;
}

export interface Vorfall {
  art: 'rueckruf' | 'testsieg' | 'influencer' | 'lieferantenausfall' | 'stoerung' | 'pleite';
  firma: string;
  produkt?: ProductId;
  text: string;
}

export interface ZeitungsArtikel {
  rubrik: string;
  titel: string;
  text: string;
  wirkung?: string;
}

export interface Zeitung {
  quartal: number;
  ausgabe: string;
  schlagzeile: string;
  unterzeile: string;
  sonderausgabe?: string;
  artikel: ZeitungsArtikel[];
  kurzmeldungen: string[];
  leserbrief: string;
  glosse: { titel: string; text: string };
  testmagazin: { produkt: ProductId; eintraege: { name: string; ti: number; farbe: string; eigen: boolean }[] }[];
  konditionen: { basiszins: number; darlehen: number; kontokorrent: number; rating: string };
  branchenbericht: { name: string; umsatz: number; ebit: number; bilanzsumme: number; farbe: string; eigen: boolean }[];
}

export interface GameState {
  version: number;
  /** Index des Quartals, für das gerade entschieden wird (0 = Q1 2027) */
  quartal: number;
  rngState: number;
  einstellungen: Einstellungen;
  unternehmen: Unternehmen;
  finanzen: Finanzen;
  regionen: PerRegion<{ aktiv: boolean; bekanntheit: number; marktanteil: number }>;
  produkte: PerProduct<ProduktZustand>;
  werke: Werk[];
  markt: PerRegion<PerProduct<MarktSegmentZustand>>;
  konkurrenten: Record<string, KonkurrentZustand>;
  /** Pläne der Konkurrenz für das aktuelle Quartal (vor der Spielereingabe festgelegt) */
  konkurrenzPlaene: Record<string, KonkurrentPlan>;
  /** Pläne, die im Vorquartal ausgeführt wurden (Grundlage für Schätzungen) */
  konkurrenzVorquartal: Record<string, KonkurrentPlan>;
  /** Marktanteils-Änderung des Spielers im Vorquartal je Produkt (für die Konkurrenz-Reaktion) */
  spielerAnteilDelta: PerProduct<number>;
  letzteEntscheidungen: Decisions;
  ebitdaHistorie: number[];
  umsatzHistorie: number[];
  ebitHistorie: number[];
  kpiHistorie: KpiPunkt[];
  /** Zum Quartalsbeginn bekannte Kreditkonditionen */
  zinsen: { basiszins: number };
  spielende: null | { grund: string; quartal: number };
  ereignisse: AktivesEreignis[];
  /** EU-Nachhaltigkeitsgesetz in Kraft (Umweltabgabe +10 Punkte) */
  euGesetz: boolean;
  /** Aktuelle Ausgabe des Kettenblatt-Kuriers */
  zeitung: Zeitung | null;
}

// ------------------------------------------------------------ Entscheidungen

export interface WerkEntscheidung {
  linienKaufen: { typ: LinienTyp; anzahl: number }[];
  linienVerkaufen: string[];
  wartung: Wartung;
  /** Einstellen (+) / Entlassen (−) */
  personalAenderung: number;
  schulungProKopf: number;
}

export interface Decisions {
  quartal: number;
  preis: PerProduct<PerRegion<number>>;
  marketing: PerProduct<PerRegion<number>>;
  produktion: PerProduct<Record<string, number>>;
  fe: PerProduct<number>;
  werke: Record<string, WerkEntscheidung>;
  lieferanten: Record<Komponente, SupplierLevel>;
  nachhaltigkeitsbudget: number;
  finanzen: { darlehenNeu: number; tilgungExtra: number; dividende: number };
  firmensitz: { kaufen: string[] };
}

// ---------------------------------------------------------------- Bericht

export interface GuV {
  umsatz: number;
  herstellkosten: number;
  logistik: number;
  deckungsbeitrag: number;
  marketing: number;
  fe: number;
  nachhaltigkeit: number;
  marktforschung: number;
  fertigungsgemeinkosten: number;
  personal: number;
  vertrieb: number;
  verwaltung: number;
  sonstigeErtraege: number;
  sonstigerAufwand: number;
  abschreibungen: number;
  ebit: number;
  ebitda: number;
  zinsen: number;
  ebt: number;
  steuern: number;
  ueberschuss: number;
}

export interface Bilanz {
  sachanlagen: number;
  vorraeteFertig: number;
  vorraeteMaterial: number;
  forderungen: number;
  kasse: number;
  aktiva: number;
  gezeichnetesKapital: number;
  kapitalruecklage: number;
  gewinnruecklagen: number;
  eigenkapital: number;
  darlehen: number;
  kontokorrent: number;
  verbindlichkeiten: number;
  passiva: number;
}

export interface Kapitalfluss {
  ueberschuss: number;
  abschreibungen: number;
  /** Buchverlust/-gewinn aus Linienverkäufen (nicht zahlungswirksam) */
  ergebnisAnlagenabgang: number;
  veraenderungForderungen: number;
  veraenderungVorraete: number;
  veraenderungVerbindlichkeiten: number;
  operativ: number;
  investitionen: number;
  desinvestitionen: number;
  investition: number;
  darlehenNeu: number;
  tilgung: number;
  kontokorrent: number;
  dividende: number;
  finanzierung: number;
  gesamt: number;
  kasseAnfang: number;
  kasseEnde: number;
}

export interface AngebotBericht {
  produkt: ProductId;
  region: RegionId;
  preis: number;
  marketing: number;
  nachfrage: number;
  absatz: number;
  unbedient: number;
  marktanteil: number;
  umsatz: number;
  attraktivitaet: number;
  technik: number;
  technikIndex: number;
  qualitaet: number;
}

export interface SegmentBericht {
  region: RegionId;
  produkt: ProductId;
  volumen: number;
  durchschnittspreis: number;
  tBar: number;
  /** Absatzanteile inkl. Restmarkt (Summe = 1) */
  anteile: Record<string, number>;
  /** Absatz je Anbieter (Stück) */
  absatz: Record<string, number>;
  preise: Record<string, number>;
  marketing: Record<string, number>;
  /** Technikindex laut Testmagazin „Rad & Tat“ je Anbieter */
  technikIndex: Record<string, number>;
  /** Qualität je Anbieter */
  qualitaet: Record<string, number>;
}

export interface WerkBericht {
  id: string;
  name: string;
  maschinenStunden: number;
  personalStundenRegulaer: number;
  maxStunden: number;
  benoetigteStunden: number;
  ueberstunden: number;
  auslastung: number;
  auslastungLinien: number;
  auslastungPersonal: number;
  produktivitaetI: number;
  motivation: number;
  kompetenz: number;
  einarbeitung: number;
  mitarbeitende: number;
  lohnkosten: number;
  leerkosten: number;
  gekuerzt: boolean;
}

export interface ProduktBericht {
  produkt: ProductId;
  produziert: number;
  geplant: number;
  absatz: number;
  umsatz: number;
  hkProStueck: number;
  lernkurve: number;
  stueckkostenAbsatz: number;
  nacharbeitsquote: number;
  lagerEnde: number;
  technik: number;
  technikIndex: number;
  umweltindex: number;
  qualitaet: number;
}

export interface QuarterReport {
  quartal: number;
  guv: GuV;
  bilanz: Bilanz;
  kapitalfluss: Kapitalfluss;
  angebote: AngebotBericht[];
  segmente: SegmentBericht[];
  werke: WerkBericht[];
  produkte: ProduktBericht[];
  kennzahlen: {
    umsatz4Q: number;
    ebitda4Q: number;
    ebit4Q: number;
    kreditlimit: number;
    rating: string;
    ratingScore: number;
    unternehmenswert: number;
    eigenkapitalwert: number;
    marktanteil: number;
    absatz: number;
    nettofinanzschulden: number;
    image: number;
    nachhaltigkeit: number;
  };
  konkurrenz: {
    id: string;
    name: string;
    farbe: string;
    status: 'aktiv' | 'pleite';
    umsatz: number;
    ebit: number;
    bilanzsumme: number;
    image: number;
    qualitaet: number;
    bekanntheit: number;
  }[];
  warnungen: string[];
  meldungen: string[];
  vorfaelle: Vorfall[];
  zeitung: Zeitung | null;
}

export interface PreviewResult {
  report: QuarterReport;
}
