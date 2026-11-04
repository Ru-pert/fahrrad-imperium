/**
 * Börse und Übernahmen (Spezifikation 8 und 12): IPO, Aktienkurs mit Marktstimmung,
 * Kapitalerhöhung, Rückkauf, Beteiligungen an Konkurrenten, Übernahmen, regionale Marken.
 */
import { BALANCE } from './config/balance';
import { BOERSE, UEBERNAHME } from './config/boerse';
import { KONKURRENTEN } from './config/competitors';
import { LINIENTYPEN, PRODUKT_IDS } from './config/products';
import { REGIONEN } from './config/markets';
import { Rng } from './rng';
import type { Decisions, GameState, KonkurrentZustand, Linie, RegionId, Werk } from './types';

export interface BoerseZustand {
  notiert: boolean;
  ipoQuartal?: number;
  aktienGesamt: number;
  aktienGruender: number;
  aktienInvestor: number;
  stimmung: number;
  kurs: number;
  /** Je Quartal: Schlusskurs und 12 Zwischenpunkte für das Chart */
  verlauf: { quartal: number; kurs: number; punkte: number[] }[];
  epsHistorie: number[];
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function boerseVon(s: GameState): BoerseZustand {
  if (s.boerse) return s.boerse;
  const gesamt = BOERSE.aktienStart;
  const inv = Math.round(gesamt * (s.finanzen.investorAnteil ?? 0));
  return { notiert: false, aktienGesamt: gesamt, aktienGruender: gesamt - inv, aktienInvestor: inv, stimmung: 1, kurs: 0, verlauf: [], epsHistorie: [] };
}

/** Anteil des Gründers (Spieler) am Unternehmen */
export const gruenderAnteil = (s: GameState): number => {
  const b = boerseVon(s);
  return b.aktienGesamt > 0 ? b.aktienGruender / b.aktienGesamt : 1;
};

/** Fundamentaler Wert je Aktie aus dem Eigenkapitalwert des letzten Quartals */
export function fundamentalJeAktie(s: GameState): number {
  const k = s.kpiHistorie[s.kpiHistorie.length - 1];
  return Math.max(0, (k?.unternehmenswert ?? 0) / boerseVon(s).aktienGesamt);
}

export function ipoBedingungen(s: GameState): { text: string; erfuellt: boolean }[] {
  const I = BOERSE.ipo;
  const u4 = s.kpiHistorie.slice(-4).reduce((a, k) => a + k.umsatz, 0);
  const ebit = s.kpiHistorie.slice(-I.positiveEbitQuartale);
  const stufen = BALANCE.finanzen.ratingStufen as readonly string[];
  return [
    { text: `Umsatz der letzten 4 Quartale ≥ ${I.mindestUmsatz4Q / 1e6} Mio. €`, erfuellt: u4 >= I.mindestUmsatz4Q },
    { text: `${I.positiveEbitQuartale} Quartale in Folge positives EBIT`, erfuellt: ebit.length === I.positiveEbitQuartale && ebit.every((k) => k.ebit > 0) },
    { text: `Rating mindestens ${I.mindestRating}`, erfuellt: stufen.indexOf(s.finanzen.rating) <= stufen.indexOf(I.mindestRating) },
  ];
}

export const ipoMoeglich = (s: GameState): boolean => !boerseVon(s).notiert && ipoBedingungen(s).every((b) => b.erfuellt);

/** Fairer Ausgabepreis aus Sicht der Anleger (Wachstum hebt die Stimmung) */
export function ipoFairerPreis(s: GameState): number {
  const u4 = s.kpiHistorie.slice(-4).reduce((a, k) => a + k.umsatz, 0);
  const vorher = s.kpiHistorie.slice(-8, -4).reduce((a, k) => a + k.umsatz, 0);
  const g = vorher > 0 ? u4 / vorher - 1 : 0;
  return fundamentalJeAktie(s) * clamp(1 + 0.5 * g, 0.8, 1.4);
}

/** Platzierungsquote (0–1) für einen Ausgabepreis */
export function ipoPlatzierung(s: GameState, preis: number): number {
  const fair = ipoFairerPreis(s);
  if (!(fair > 0)) return 0;
  const ueber = preis / fair - 1 - BOERSE.ipo.toleranz;
  return clamp(1 - Math.max(0, ueber) * BOERSE.ipo.abfall, 0, 1);
}

// ---------------------------------------------------------------- Konkurrenten bewerten und übernehmen

export function konkurrentWert(k: KonkurrentZustand): number {
  return Math.max(UEBERNAHME.umsatzFaktor * 4 * k.letzterUmsatz, UEBERNAHME.ebitMultiple * 4 * k.letztesEbit, 0) + Math.max(0, k.kasse) * 0.5;
}

export const istBoersennotiert = (id: string): boolean => !!KONKURRENTEN.find((p) => p.id === id)?.boersennotiert;

export function uebernahmeMoeglich(s: GameState, id: string): { ok: boolean; grund?: string } {
  const k = s.konkurrenten[id];
  if (!k || k.status !== 'aktiv') return { ok: false, grund: 'nicht mehr am Markt' };
  const eigen = s.kpiHistorie[s.kpiHistorie.length - 1]?.umsatz ?? 0;
  if (k.letzterUmsatz > UEBERNAHME.maxUmsatzVerhaeltnis * eigen) return { ok: false, grund: `zu groß – höchstens halb so viel Umsatz wie du (${Math.round((k.letzterUmsatz / Math.max(1, eigen)) * 100)} %)` };
  return { ok: true };
}

export const uebernahmePreis = (s: GameState, id: string): number => UEBERNAHME.kontrollpraemie * konkurrentWert(s.konkurrenten[id]);

/** Preis für einen weiteren Aktienanteil an einem börsennotierten Konkurrenten */
export function aktienKaufPreis(s: GameState, id: string, anteil: number): number {
  const k = s.konkurrenten[id];
  if (!k) return 0;
  const schon = s.beteiligungen?.[id]?.anteil ?? 0;
  const mittel = schon + anteil / 2;
  return anteil * konkurrentWert(k) * (1 + BOERSE.aktienKaufAufschlag * mittel);
}

const STANDORT_JE_REGION: Record<RegionId, { code: string; lohn: number }> = {
  DE: { code: 'DE', lohn: 1 }, EU: { code: 'PL', lohn: 0.6 }, NA: { code: 'US', lohn: 1.1 }, AS: { code: 'VN', lohn: 0.35 }, RW: { code: 'BR', lohn: 0.45 },
};

/** Übernimmt einen Konkurrenten: Werk, Linien, Personal, Lager, Marke, F&E. Gibt den Wert der übernommenen Vermögenswerte zurück. */
export function uebernimm(s: GameState, id: string, t: number, neueWerke?: Werk[]): { sachwert: number; lagerwert: number; text: string } {
  const k = s.konkurrenten[id];
  const profil = KONKURRENTEN.find((p) => p.id === id)!;
  const region = profil.heimat;
  const st = STANDORT_JE_REGION[region];
  const anzahl = Math.max(1, Math.min(UEBERNAHME.maxLinien, Math.round(k.linien)));
  const linien: Linie[] = Array.from({ length: anzahl }, (_, i) => ({
    id: `UE-${id}-L${i + 1}`,
    typ: 'B',
    status: 'aktiv',
    bauRest: 0,
    restlaufzeit: Math.round(LINIENTYPEN.B.lebensdauer / 2),
    anschaffung: LINIENTYPEN.B.preis,
    buchwert: UEBERNAHME.linienBuchwert,
    verfuegbarkeit: 0.95,
    umweltindex: LINIENTYPEN.B.umwelt,
  }));
  const werk: Werk = {
    id: `UE-${id}`,
    name: `${k.name.replace(/ (GmbH|Inc\.|Corp\.)$/, '')} (übernommen)`,
    region,
    lohnIndex: st.lohn,
    gebaeudeBuchwert: UEBERNAHME.gebaeudeWert,
    gebaeudeRestlaufzeit: BALANCE.finanzen.abschreibungWerkQuartale,
    linien,
    mitarbeitende: Math.round((anzahl * 6000) / BALANCE.personal.stundenProMitarbeiter),
    motivation: 0.9,
    kompetenz: 1,
    wartung: 'voll',
    standort: st.code,
    status: 'aktiv',
    hallenPlaetze: Math.ceil(anzahl / 4) * 4,
  };
  // Das Werk kommt erst nach den Abschreibungen des Quartals hinzu (sonst Abschreibung ohne GuV-Buchung)
  if (neueWerke) neueWerke.push(werk);
  else s.werke.push(werk);
  // Lager und F&E für Produkte im eigenen Programm
  let lagerwert = 0;
  for (const p of PRODUKT_IDS) {
    const kp = k.produkte[p];
    const ep = s.produkte[p];
    if (!kp || !ep) continue;
    const menge = Math.max(0, Math.round(kp.lager));
    if (menge > 0) {
      const wert = menge * kp.hk;
      const neu = ep.lager.stueck + menge;
      ep.lager.hk = neu > 0 ? (ep.lager.stueck * ep.lager.hk + wert) / neu : ep.lager.hk;
      ep.lager.stueck = neu;
      lagerwert += wert;
    }
    ep.fe += kp.fe;
  }
  // Marke: max(B_eigen, B_fremd) + 0,5 × min(…)
  for (const r of Object.keys(k.bekanntheit) as RegionId[]) {
    const reg = s.regionen[r];
    if (!reg) continue;
    const a = reg.bekanntheit;
    const b = k.bekanntheit[r] ?? 0;
    reg.bekanntheit = Math.min(0.95, Math.max(a, b) + 0.5 * Math.min(a, b));
  }
  k.status = 'pleite';
  k.uebernommen = t;
  s.integrationBis = t + UEBERNAHME.abschlagQuartale;
  const sachwert = werk.gebaeudeBuchwert + linien.reduce((a, l) => a + l.buchwert, 0);
  return { sachwert, lagerwert, text: `Übernahme: ${k.name} gehört jetzt dir – mit ${anzahl} Fertigungslinien in ${REGIONEN[region].name}.` };
}

export interface BoerseWirkung {
  /** Netto-Kapitalzufluss (IPO, Kapitalerhöhung − Rückkauf) – Finanzierung */
  kapital: number;
  /** Investitionen (Beteiligungen, Übernahmen ohne Lager) */
  investition: number;
  /** Aufwand (Integrationskosten, Markenzukauf) */
  aufwand: number;
  meldungen: string[];
  ipo?: { aktien: number; preis: number; quote: number };
  uebernahmen: string[];
  neueWerke: Werk[];
}

/** Kapitalmaßnahmen zu Quartalsbeginn (IPO, Kapitalerhöhung, Rückkauf, Marke) */
export function kapitalmassnahmen(s: GameState, dec: Decisions, warn: string[]): BoerseWirkung {
  const out: BoerseWirkung = { kapital: 0, investition: 0, aufwand: 0, meldungen: [], uebernahmen: [], neueWerke: [] };
  const b = structuredClone(boerseVon(s));
  const bd = dec.boerse ?? {};
  // Ausstehende Integrationskosten aus dem Vorquartal
  if (s.integrationKosten) {
    out.aufwand += s.integrationKosten;
    s.integrationKosten = 0;
  }
  if (bd.ipo && !b.notiert) {
    if (!ipoMoeglich(s)) warn.push('Börsengang: Die Voraussetzungen sind noch nicht erfüllt.');
    else {
      const anteil = clamp(bd.ipo.anteil, BOERSE.ipo.anteilMin, BOERSE.ipo.anteilMax);
      const fund = fundamentalJeAktie(s);
      const preis = clamp(bd.ipo.preis, fund * (1 - BOERSE.ipo.spanne), fund * (1 + BOERSE.ipo.spanne));
      const quote = ipoPlatzierung(s, preis);
      const neue = Math.round(((b.aktienGesamt * anteil) / (1 - anteil)) * quote);
      const erloes = neue * preis;
      const netto = erloes * (1 - BOERSE.ipo.kosten);
      b.aktienGesamt += neue;
      b.notiert = true;
      b.ipoQuartal = s.quartal;
      b.kurs = preis;
      b.stimmung = 1;
      b.verlauf.push({ quartal: s.quartal - 1, kurs: preis, punkte: Array(12).fill(preis) });
      s.finanzen.gezeichnetesKapital += neue;
      s.finanzen.kapitalruecklage += netto - neue;
      out.kapital += netto;
      out.ipo = { aktien: neue, preis, quote };
      if (!s.unternehmen.name.endsWith(' AG')) s.unternehmen.name = `${s.unternehmen.name.replace(/ GmbH$/, '')} AG`;
      s.unternehmen.rechtsform = 'AG';
      out.meldungen.push(`Ding Dong! Börsengang: ${neue.toLocaleString('de-DE')} Aktien zu ${preis.toFixed(2).replace('.', ',')} € platziert (${Math.round(quote * 100)} % der angebotenen Menge), Erlös ${Math.round(netto).toLocaleString('de-DE')} €.`);
    }
  }
  if (b.notiert && (bd.kapitalerhoehung ?? 0) > 0 && b.ipoQuartal !== s.quartal) {
    const K = BOERSE.kapitalerhoehung;
    const anteil = Math.min(K.max, bd.kapitalerhoehung!);
    const neue = Math.round(b.aktienGesamt * anteil);
    const preis = b.kurs * (1 - K.abschlag);
    const netto = neue * preis * (1 - K.kosten);
    b.aktienGesamt += neue;
    s.finanzen.gezeichnetesKapital += neue;
    s.finanzen.kapitalruecklage += netto - neue;
    out.kapital += netto;
    b.stimmung = clamp(b.stimmung * 0.97, BOERSE.stimmung.min, BOERSE.stimmung.max);
    out.meldungen.push(`Kapitalerhöhung: ${neue.toLocaleString('de-DE')} neue Aktien, Erlös ${Math.round(netto).toLocaleString('de-DE')} €.`);
  }
  if (b.notiert && (bd.rueckkauf ?? 0) > 0) {
    const R = BOERSE.rueckkauf;
    const anteil = Math.min(R.max, bd.rueckkauf!);
    const streubesitz = b.aktienGesamt - b.aktienGruender - b.aktienInvestor;
    const zurueck = Math.min(streubesitz, Math.round(b.aktienGesamt * anteil));
    const kosten = zurueck * b.kurs * (1 + R.aufschlag);
    if (zurueck > 0 && kosten < s.finanzen.kasse) {
      b.aktienGesamt -= zurueck;
      s.finanzen.kapitalruecklage -= kosten;
      out.kapital -= kosten;
      b.stimmung = clamp(b.stimmung * 1.03, BOERSE.stimmung.min, BOERSE.stimmung.max);
      out.meldungen.push(`Aktienrückkauf: ${zurueck.toLocaleString('de-DE')} Aktien für ${Math.round(kosten).toLocaleString('de-DE')} € zurückgekauft.`);
    } else if (zurueck > 0) warn.push('Aktienrückkauf: Dafür reicht die Kasse nicht.');
  }
  // Regionale Marke zukaufen
  for (const r of [...new Set(dec.markeZukaufen ?? [])]) {
    const reg = s.regionen[r];
    if (!reg?.aktiv || r === 'DE') {
      warn.push(`Marke zukaufen ${REGIONEN[r]?.name ?? r}: nur in aktiven Auslandsregionen möglich.`);
      continue;
    }
    const preis = markenPreis(s, r);
    for (const p of PRODUKT_IDS) {
      const m = s.markt[r]?.[p];
      if (m) m.a0Start *= 1 - UEBERNAHME.marke.a0Senkung;
    }
    reg.bekanntheit = Math.min(0.95, reg.bekanntheit + UEBERNAHME.marke.bekanntheit);
    out.aufwand += preis;
    out.meldungen.push(`Regionale Marke in ${REGIONEN[r].name} zugekauft (${Math.round(preis).toLocaleString('de-DE')} €): Bekanntheit +2 Punkte, der Restmarkt schrumpft.`);
  }
  if (bd.ipo || b.notiert || s.boerse) s.boerse = b;
  return out;
}

/** Preis einer regionalen Marke: 0,15 % des Jahresmarktumsatzes der Region */
export function markenPreis(s: GameState, r: RegionId): number {
  let summe = 0;
  for (const p of PRODUKT_IDS) {
    const m = s.markt[r]?.[p];
    if (m) summe += m.volumen * m.durchschnittspreis * 4;
  }
  return summe * UEBERNAHME.marke.preisAnteilJahresmarkt;
}

/**
 * Aktienkäufe und Übernahmen (am Quartalsende, vor den Zahlungen).
 * `out.investition` enthält nur Zahlungen; zurückgegeben wird der übernommene Lagerwert (nicht zahlungswirksame Vorratsmehrung).
 */
export function fuehreUebernahmenAus(s: GameState, dec: Decisions, t: number, warn: string[], out: BoerseWirkung): number {
  let lagerZugang = 0;
  s.beteiligungen ??= {};
  for (const kauf of dec.boerse?.aktienKauf ?? []) {
    const k = s.konkurrenten[kauf.konkurrent];
    if (!k || k.status !== 'aktiv' || !istBoersennotiert(kauf.konkurrent)) {
      warn.push(`Aktienkauf ${kauf.konkurrent}: nur bei börsennotierten, aktiven Konkurrenten.`);
      continue;
    }
    const schon = s.beteiligungen[kauf.konkurrent]?.anteil ?? 0;
    const anteil = clamp(kauf.anteil, 0, 1 - schon);
    if (anteil <= 0) continue;
    const preis = aktienKaufPreis(s, kauf.konkurrent, anteil);
    const b = (s.beteiligungen[kauf.konkurrent] ??= { anteil: 0, buchwert: 0 });
    b.anteil += anteil;
    b.buchwert += preis;
    out.investition += preis;
    out.meldungen.push(`${Math.round(anteil * 100)} % der ${k.name}-Aktien für ${Math.round(preis).toLocaleString('de-DE')} € gekauft (jetzt ${Math.round(b.anteil * 100)} %).`);
    if (b.anteil > 0.5) {
      const m = uebernahmeMoeglich(s, kauf.konkurrent);
      if (!m.ok) {
        warn.push(`${k.name}: Mehrheit erreicht, aber Übernahme nicht möglich (${m.grund}). Die Beteiligung bleibt bestehen.`);
        continue;
      }
      // Beteiligung geht in die Übernahme auf
      const res = uebernimm(s, kauf.konkurrent, t, out.neueWerke);
      lagerZugang += res.lagerwert;
      // Die Beteiligung wird (ohne Zahlung) zu Sachanlagen, Lager und Firmenwert umgebucht
      s.finanzen.geschaeftswert = (s.finanzen.geschaeftswert ?? 0) + (b.buchwert - res.sachwert - res.lagerwert);
      s.integrationKosten = (s.integrationKosten ?? 0) + UEBERNAHME.integrationskosten * b.buchwert;
      delete s.beteiligungen[kauf.konkurrent];
      out.uebernahmen.push(kauf.konkurrent);
      out.meldungen.push(res.text);
    }
  }
  const id = dec.uebernahme;
  if (id) {
    const m = uebernahmeMoeglich(s, id);
    if (istBoersennotiert(id)) warn.push(`${s.konkurrenten[id]?.name ?? id} ist börsennotiert – übernehmen nur über Aktienkäufe (über 50 %).`);
    else if (!m.ok) warn.push(`Übernahme ${s.konkurrenten[id]?.name ?? id}: ${m.grund}.`);
    else {
      const preis = uebernahmePreis(s, id);
      const res = uebernimm(s, id, t, out.neueWerke);
      lagerZugang += res.lagerwert;
      // Kaufpreis mindestens Substanzwert; der Rest ist Firmenwert
      const gezahlt = Math.max(preis, res.sachwert + res.lagerwert);
      out.investition += gezahlt;
      s.integrationKosten = (s.integrationKosten ?? 0) + UEBERNAHME.integrationskosten * gezahlt;
      s.finanzen.geschaeftswert = (s.finanzen.geschaeftswert ?? 0) + (gezahlt - res.sachwert - res.lagerwert);
      out.uebernahmen.push(id);
      out.meldungen.push(`${res.text} Kaufpreis ${Math.round(gezahlt).toLocaleString('de-DE')} € (Integrationskosten folgen im nächsten Quartal).`);
    }
  }
  return lagerZugang;
}

/** Aktienkurs nach dem Quartal (Stimmung, EPS-Überraschung, Crash) */
export function aktualisiereKurs(s: GameState, rng: Rng, ueberschuss: number, eigenkapitalwert: number, zufall: boolean): string | null {
  const b = s.boerse;
  if (!b?.notiert) return null;
  const S = BOERSE.stimmung;
  const eps = ueberschuss / b.aktienGesamt;
  const hist = b.epsHistorie.slice(-4);
  const erwartet = hist.length ? hist.reduce((a, x) => a + x, 0) / hist.length : eps;
  const ueberraschung = erwartet > 0 ? clamp(eps / erwartet - 1, -1, 1) : eps > 0 ? 0.2 : -0.2;
  let stimmung = Math.pow(b.stimmung, S.traegheit) * Math.exp(S.epsFaktor * ueberraschung + (zufall ? S.rauschen * rng.normal() : 0));
  let meldung: string | null = null;
  if (zufall && rng.chance(S.crashWahrscheinlichkeit)) {
    stimmung *= S.crashFaktor;
    meldung = 'Börsencrash! Die Kurse rauschen in den Keller – auch deine Aktie verliert kräftig.';
  }
  b.stimmung = clamp(stimmung, S.min, S.max);
  const alt = b.kurs;
  const neu = Math.max(0.01, (Math.max(0, eigenkapitalwert) / b.aktienGesamt) * b.stimmung);
  // Brownsche Brücke mit 12 Zwischenpunkten
  const punkte: number[] = [];
  let w = 0;
  const schritte: number[] = [];
  for (let i = 0; i < 12; i++) {
    w += zufall ? rng.normal() * 0.02 : 0;
    schritte.push(w);
  }
  for (let i = 0; i < 12; i++) {
    const anteil = (i + 1) / 12;
    const bruecke = schritte[i] - anteil * schritte[11];
    punkte.push(Math.max(0.01, (alt + (neu - alt) * anteil) * (1 + bruecke)));
  }
  b.kurs = neu;
  b.epsHistorie = [...b.epsHistorie, eps].slice(-8);
  b.verlauf = [...b.verlauf, { quartal: s.quartal, kurs: neu, punkte }].slice(-60);
  return meldung;
}
