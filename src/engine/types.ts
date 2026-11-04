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
  /** Standort-Code (DE, PL, US, MX, VN, BR) */
  standort?: string;
  /** Werk im Bau */
  status?: 'bau' | 'aktiv';
  bauRest?: number;
  /** Linienplätze in der Halle */
  hallenPlaetze?: number;
  /** Quartale bis die Hallenerweiterung fertig ist (0 = keine im Bau) */
  halleImBau?: number;
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
  /** Einführung läuft (1 Quartal Vorlauf) */
  status?: 'vorlauf' | 'aktiv';
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
  /** Rettungsangebot bereits angenommen (nur einmal möglich) */
  rettungGenutzt?: boolean;
  /** Anteil eines Investors nach der Rettung (0–1) */
  investorAnteil?: number;
  /** Quartal, in dem die Rettung angenommen wurde */
  rettungQuartal?: number;
  /** Firmenwert aus Übernahmen */
  geschaeftswert?: number;
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
  /** Absatz und Preis des Vorquartals je Region */
  absatzR?: PerRegion<number>;
  preisR?: PerRegion<number>;
}

export interface KonkurrentZustand {
  /** Quartal einer Übernahme durch den Spieler */
  uebernommen?: number;
  /** Schwund der Marktstärke (nur alternde Riesen), 1 = voll */
  alterung?: number;
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
  /** Regionen, in denen verkauft wird */
  regionen?: RegionId[];
  /** Kalibrierte Stärke (Händlernetz) je „Region:Produkt“ */
  staerke?: Record<string, number>;
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
  /** Platz in der Weltrangliste nach Quartalsumsatz */
  weltrang?: number;
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
  art: 'rueckruf' | 'testsieg' | 'influencer' | 'lieferantenausfall' | 'stoerung' | 'pleite' | 'spionage';
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
  regionen: PerRegion<{ aktiv: boolean; bekanntheit: number; marktanteil: number; freigeschaltet?: boolean; aktivSeit?: number }>;
  /** Reihenfolge der Markteintritte (Lieferreihenfolge) */
  regionenReihenfolge?: RegionId[];
  /** Produkte, deren Freischaltbedingung erfüllt ist (einführbar) */
  produkteVerfuegbar?: ProductId[];
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
  /** Erreichte Erfolge */
  erfolge?: { id: string; quartal: number }[];
  /** Forschungsprojekte: investiertes Budget, Quartale mit Forschung, Abschlussquartal */
  forschung?: Record<string, { investiert: number; quartale: number; fertigIm?: number }>;
  /** Offene Sonderabsatz-Angebote für das aktuelle Quartal */
  angebote?: { grossabnehmer: Grossabnehmer[]; ausschreibungen: Ausschreibung[] };
  /** Rettungsangebot eines Investors (statt sofortiger Insolvenz) */
  rettungsangebot?: { quartal: number; kapital: number; anteil: number } | null;
  /** Gewähltes Szenario und Quartal, in dem dessen Etappenziel erreicht wurde */
  szenario?: string;
  szenarioErreicht?: number;
  /** Börse (ab dem IPO bzw. für die Aktionärsstruktur) */
  boerse?: import('./boerse').BoerseZustand;
  /** Beteiligungen an börsennotierten Konkurrenten (zu Anschaffungskosten) */
  beteiligungen?: Record<string, { anteil: number; buchwert: number }>;
  /** Effizienzabschlag nach einer Übernahme bis einschließlich Quartal */
  integrationBis?: number;
  /** Integrationskosten, die im nächsten Quartal anfallen */
  integrationKosten?: number;
  /** Endabrechnung (nach 15 Jahren oder bei Insolvenz) */
  endwertung?: import('./spielziel').Wertung | null;
  /** Nach der Endabrechnung weiterspielen (ohne Wertung) */
  endlos?: boolean;
  /** Quartale, in denen spioniert wurde (für das Entdeckungsrisiko) */
  spionageQuartale?: number[];
  /** Konkurrenten, die nach einer entdeckten Spionage Preise senken: id → bis einschließlich Quartal */
  rache?: Record<string, number>;
}

export interface Grossabnehmer {
  id: string;
  kunde: string;
  region: RegionId;
  produkt: ProductId;
  /** Festpreis je Stück */
  preis: number;
  hoechstmenge: number;
}

export interface Ausschreibung {
  id: string;
  behoerde: string;
  region: RegionId;
  produkt: ProductId;
  menge: number;
  minTechnikindex: number;
  /** Bestes Konkurrenzgebot (verdeckt – nicht in Oberfläche/Export zeigen) */
  konkurrenzGebot: number;
}

export interface MarktforschungKauf {
  marktbericht?: RegionId[];
  branchenanalyse?: RegionId[];
  kundenbefragung?: boolean;
  /** IDs der ausspionierten Konkurrenten */
  spionage?: string[];
}

// ------------------------------------------------------------ Entscheidungen

export interface WerkEntscheidung {
  linienKaufen: { typ: LinienTyp; anzahl: number }[];
  linienVerkaufen: string[];
  /** Halle um weitere Linienplätze erweitern */
  halleErweitern?: boolean;
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
  expansion?: { maerkteBetreten: RegionId[]; produkteEinfuehren: ProductId[]; werkeBauen: string[] };
  /** Forschungsbudget je Projekt und Quartal */
  forschung?: Record<string, number>;
  /** Vorausbestellte Material-Sets je Produkt (Mengenrabatt) */
  einkauf?: PerProduct<number>;
  /** Liefermengen an Großabnehmer je Angebot */
  grossabnehmer?: { angebotId: string; menge: number }[];
  /** Gebote für Ausschreibungen (Stückpreis) */
  ausschreibungen?: { id: string; stueckpreis: number }[];
  marktforschung?: MarktforschungKauf;
  /** Antwort auf ein Rettungsangebot */
  rettung?: 'annehmen' | 'ablehnen';
  /** Börse: IPO, Kapitalerhöhung/Rückkauf (Anteil neuer bzw. zurückgekaufter Aktien), Aktienkäufe */
  boerse?: { ipo?: { anteil: number; preis: number }; kapitalerhoehung?: number; rueckkauf?: number; aktienKauf?: { konkurrent: string; anteil: number }[] };
  /** Nicht börsennotierten Konkurrenten übernehmen */
  uebernahme?: string;
  /** Regionale Marke zukaufen */
  markeZukaufen?: RegionId[];
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
  /** Koordinationskosten durch Größe (Werke, Märkte, Produkte) */
  koordination?: number;
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
  /** Beteiligungen an Konkurrenten */
  finanzanlagen?: number;
  /** Firmenwert aus Übernahmen */
  geschaeftswert?: number;
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
  /** Einlage eines Investors (Rettungsangebot) */
  kapitalerhoehung?: number;
  finanzierung: number;
  gesamt: number;
  kasseAnfang: number;
  kasseEnde: number;
}

export interface AngebotBericht {
  produkt: ProductId;
  region: RegionId;
  /** Kundenzufriedenheit nach dem Quartal (0–100) */
  zufriedenheit?: number;
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

export interface SonderabsatzBericht {
  art: 'grossabnehmer' | 'ausschreibung';
  id: string;
  kunde: string;
  produkt: ProductId;
  region: RegionId;
  menge: number;
  preis: number;
  umsatz: number;
  /** Ausschreibung: gewonnen / verloren; Gebote */
  gewonnen?: boolean;
  gebot?: number;
  konkurrenzGebot?: number;
  text: string;
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
  /** Großabnehmer-Lieferungen und Ausschreibungsergebnisse */
  sonderabsatz?: SonderabsatzBericht[];
  /** Material-Einkauf je Produkt */
  einkauf?: { produkt: ProductId; bestellt: number; ausLager: number; nachgekauft: number; rabatt: number; ersparnis: number; lagerEnde: number }[];
  /** Endabrechnung, falls in diesem Quartal fällig */
  endwertung?: import('./spielziel').Wertung;
  /** Spionage-Ergebnisse */
  spionage?: { konkurrent: string; erwischt: boolean; strafe: number }[];
  zeitung: Zeitung | null;
  /** Etappenziel des Szenarios in diesem Quartal erreicht */
  szenarioErreicht?: boolean;
  /** Börse: IPO in diesem Quartal, Übernahmen */
  boerse?: { ipo?: { aktien: number; preis: number; quote: number }; uebernahmen: string[]; kurs?: number };
  /** In diesem Quartal neu erreichte Erfolge */
  neueErfolge: string[];
  /** Neu freigeschaltete Regionen und Produkte */
  freischaltungen: { art: 'region' | 'produkt' | 'feature'; id: string }[];
}

export interface PreviewResult {
  report: QuarterReport;
}
