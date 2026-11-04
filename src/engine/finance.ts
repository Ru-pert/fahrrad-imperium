import { BALANCE } from './config/balance';
import type { Bilanz, Finanzen, GameState } from './types';
import { clamp, sum } from './util';

export const schuldenGesamt = (f: Finanzen): number => sum(f.kredite.map((k) => k.restbetrag)) + f.kontokorrent;

export function sachanlagen(s: Pick<GameState, 'werke' | 'unternehmen'>): number {
  let v = s.unternehmen.firmensitz.buchwert;
  for (const w of s.werke) {
    v += w.gebaeudeBuchwert;
    for (const l of w.linien) v += l.buchwert;
  }
  return v;
}

export const ebitda4Q = (s: Pick<GameState, 'ebitdaHistorie'>): number => sum(s.ebitdaHistorie.slice(-4));
export const umsatz4Q = (s: Pick<GameState, 'umsatzHistorie'>): number => sum(s.umsatzHistorie.slice(-4));
export const ebit4Q = (s: Pick<GameState, 'ebitHistorie'>): number => sum(s.ebitHistorie.slice(-4));

/** Kreditlimit = 3 × EBITDA(4Q) + 50 % des Sachanlagevermögens (7) */
export function kreditlimit(s: GameState): number {
  const B = BALANCE.finanzen;
  return Math.max(0, B.kreditlimitEbitdaFaktor * ebitda4Q(s) + B.kreditlimitSachanlagen * sachanlagen(s));
}

export function ratingAufschlag(rating: string): number {
  const i = BALANCE.finanzen.ratingStufen.indexOf(rating as never);
  return BALANCE.finanzen.ratingAufschlag[i < 0 ? 4 : i];
}

export function bilanzSumme(b: Bilanz): { aktiva: number; passiva: number } {
  return { aktiva: b.aktiva, passiva: b.passiva };
}

/**
 * Rating-Score 0–100 aus Eigenkapitalquote, Verschuldung (Nettoschulden/EBITDA) und Ergebnis (EBIT-Marge).
 * Je 10 Punkte eine Stufe (AAA … D). Erweiterte Faktoren folgen in Stufe 5.
 */
export function berechneRating(p: {
  eigenkapital: number;
  bilanzsumme: number;
  nettoschulden: number;
  ebitda4Q: number;
  ebit4Q: number;
  umsatz4Q: number;
}): { score: number; stufe: string } {
  const quote = p.bilanzsumme > 0 ? p.eigenkapital / p.bilanzsumme : 0;
  const verschuldung = p.nettoschulden <= 0 ? 0 : p.ebitda4Q > 0 ? p.nettoschulden / p.ebitda4Q : 99;
  const marge = p.umsatz4Q > 0 ? p.ebit4Q / p.umsatz4Q : 0;
  const score =
    35 * clamp(quote / 0.5, 0, 1) +
    35 * (1 - clamp(verschuldung / 6, 0, 1)) +
    30 * clamp(marge / 0.08, 0, 1);
  const idx = clamp(Math.floor((100 - score) / 10), 0, 9);
  return { score, stufe: BALANCE.finanzen.ratingStufen[idx] };
}

/** Umweltabgabe je Werk (13): linear zwischen den Stützpunkten, skaliert mit Linienzahl / 2. */
export function umweltabgabe(durchschnittsIndex: number, linien: number): number {
  const u = BALANCE.nachhaltigkeit.umweltabgabe;
  const [s30, s40, s50] = u.stuetzpunkte;
  let basis: number;
  if (durchschnittsIndex <= s30) basis = u.schwelleHoch;
  else if (durchschnittsIndex <= s40) basis = u.schwelleHoch + ((u.mitte - u.schwelleHoch) * (durchschnittsIndex - s30)) / (s40 - s30);
  else if (durchschnittsIndex < s50) basis = (u.mitte * (s50 - durchschnittsIndex)) / (s50 - s40);
  else basis = 0;
  return (basis * linien) / 2;
}

/** Unternehmenswert (12) */
export function unternehmenswert(s: GameState, nettoschulden: number): { ev: number; eigenkapitalwert: number } {
  const B = BALANCE.unternehmenswert;
  const e = ebitda4Q(s);
  const u = umsatz4Q(s);
  let ev: number;
  if (e <= 0) ev = B.umsatzFaktorNegativ * u;
  else {
    const vorher = sum(s.umsatzHistorie.slice(-8, -4));
    const g = vorher > 0 ? u / vorher - 1 : 0;
    const k = clamp(B.basisMultiplikator + B.wachstumsFaktor * g + B.imageFaktor * (s.unternehmen.image - 50), B.min, B.max);
    ev = e * k;
  }
  const beteiligungen = sum(Object.values(s.beteiligungen ?? {}).map((b) => b.buchwert));
  return { ev, eigenkapitalwert: ev - nettoschulden + beteiligungen };
}

export function baueBilanz(s: GameState): Bilanz {
  const f = s.finanzen;
  const fertig = sum(Object.values(s.produkte).map((p) => (p ? p.lager.stueck * p.lager.hk : 0)));
  const material = sum(Object.values(s.produkte).map((p) => (p ? p.materialWert : 0)));
  const sach = sachanlagen(s);
  const finanzanlagen = sum(Object.values(s.beteiligungen ?? {}).map((b) => b.buchwert));
  const geschaeftswert = f.geschaeftswert ?? 0;
  const aktiva = sach + finanzanlagen + geschaeftswert + fertig + material + f.forderungen + f.kasse;
  const darlehen = sum(f.kredite.map((k) => k.restbetrag));
  const eigenkapital = f.gezeichnetesKapital + f.kapitalruecklage + f.gewinnruecklagen;
  const passiva = eigenkapital + darlehen + f.kontokorrent + f.verbindlichkeiten;
  return {
    sachanlagen: sach,
    finanzanlagen,
    geschaeftswert,
    vorraeteFertig: fertig,
    vorraeteMaterial: material,
    forderungen: f.forderungen,
    kasse: f.kasse,
    aktiva,
    gezeichnetesKapital: f.gezeichnetesKapital,
    kapitalruecklage: f.kapitalruecklage,
    gewinnruecklagen: f.gewinnruecklagen,
    eigenkapital,
    darlehen,
    kontokorrent: f.kontokorrent,
    verbindlichkeiten: f.verbindlichkeiten,
    passiva,
  };
}
