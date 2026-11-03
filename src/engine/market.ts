import { BALANCE } from './config/balance';
import { PRODUKTE } from './config/products';
import { REGIONEN } from './config/markets';
import type { MarktSegmentZustand, ProductId, RegionId } from './types';
import { clamp, saison } from './util';

export interface Anbieter {
  id: string;
  preis: number;
  marketing: number;
  bekanntheit: number;
  technik: number;
  qualitaet: number;
  image: number;
  /** Maximal lieferbare Menge in diesem Segment (Lager + Produktion) */
  kapazitaet: number;
}

export interface SegmentInput {
  region: RegionId;
  produkt: ProductId;
  t: number;
  anbieter: Anbieter[];
  zustand: MarktSegmentZustand;
  eventFaktor?: number;
  /** Überschreibt die Restmarkt-Attraktivität (Kalibrierung) */
  a0?: number;
}

export interface SegmentOutput {
  volumen: number;
  pRef: number;
  pBar: number;
  tBar: number;
  mStar: number;
  a0: number;
  a: Record<string, number>;
  nachfrage: Record<string, number>;
  absatz: Record<string, number>;
  unbedient: Record<string, number>;
  restNachfrage: number;
  restAbsatz: number;
  /** Absatzanteile inkl. "rest", Summe = 1 */
  anteile: Record<string, number>;
  technikIndex: Record<string, number>;
}

/** Preisfunktion mit Korridor (5.7). r = P/P̄ */
export function preisFunktion(r: number, eps: number): number {
  const { korridorBreite: w, korridorFaktor: k } = BALANCE.attraktivitaet;
  if (Math.abs(r - 1) <= w) return Math.pow(r, -k * eps);
  const rand = r > 1 ? 1 + w : 1 - w;
  return Math.pow(rand, -k * eps) * Math.pow(r / rand, -eps);
}

/** Technikwert aus dem F&E-Stock (5.5) */
export const technikAusStock = (f: number): number => Math.log(1 + Math.max(0, f) / BALANCE.technik.fStern);

export const technikIndex = (t: number, tBar: number): number =>
  BALANCE.technik.tiBasis + BALANCE.technik.tiSteigung * (t - tBar);

export const marktfaehigkeit = (ti: number): number =>
  ti >= BALANCE.technik.marktfaehigAb ? 1 : BALANCE.technik.phiNichtMarktfaehig;

export function referenzPreis(region: RegionId, produkt: ProductId): number {
  return PRODUKTE[produkt].referenzpreis * REGIONEN[region].kaufkraft;
}

/** Ausgangsvolumen V₀ (Stück/Quartal) eines Segments in einer Region */
/** Preis des Restmarkts: Referenzpreis mit langsamem Preisverfall */
export function restPreis(region: RegionId, produkt: ProductId, t: number): number {
  return referenzPreis(region, produkt) * Math.pow(1 - BALANCE.restmarkt.preisVerfallProQuartal, Math.max(0, t));
}

export function startVolumen(region: RegionId, produkt: ProductId): number {
  const r = REGIONEN[region];
  return (r.startvolumen * r.mix[produkt]) / 100;
}

export function a0Aktuell(a0Start: number, t: number): number {
  return a0Start * Math.pow(1 - BALANCE.restmarkt.schrumpfungProQuartal, t);
}

function gewicht(z: MarktSegmentZustand, id: string): number {
  return Math.max(z.anteile[id] ?? 0, 1e-4);
}

/** Attraktivitäten aller Anbieter (ohne Restmarkt) */
function attraktivitaeten(inp: SegmentInput, volumen: number, pBar: number, tBar: number) {
  const p = PRODUKTE[inp.produkt];
  const B = BALANCE.attraktivitaet;
  const aktive = inp.anbieter.filter((x) => x.preis > 0);
  const mittelMarketing = aktive.length ? aktive.reduce((s, x) => s + x.marketing, 0) / aktive.length : 0;
  const mStar = Math.max(B.mStarAnteil * volumen * pBar, mittelMarketing, 1);
  const a: Record<string, number> = {};
  const ti: Record<string, number> = {};
  for (const x of aktive) {
    const r = x.preis / pBar;
    const techF = Math.exp(p.tau * (x.technik - tBar));
    const plv = (techF * x.qualitaet) / r;
    const werbung = 1 + B.mu * Math.pow(plv, B.plvExponent) * (1 - Math.exp(-x.marketing / mStar));
    const index = technikIndex(x.technik, tBar);
    ti[x.id] = index;
    a[x.id] =
      Math.pow(Math.max(x.bekanntheit, 1e-6), B.markeExponent) *
      preisFunktion(r, p.epsilon) *
      techF *
      werbung *
      Math.pow(x.qualitaet, B.kappa) *
      (1 + B.imageSpanne * ((x.image - 50) / 50)) *
      marktfaehigkeit(index);
  }
  return { a, mStar, ti };
}

/** Gewichtete Durchschnitte (Ø-Preis, Ø-Technik) mit den Absatzanteilen des Vorquartals inkl. Restmarkt */
function durchschnitte(inp: SegmentInput) {
  let sw = 0;
  let sp = 0;
  let st = 0;
  let sumAnbieter = 0;
  for (const x of inp.anbieter) {
    if (!(x.preis > 0)) continue;
    const w = gewicht(inp.zustand, x.id);
    sumAnbieter += w;
    sw += w;
    sp += w * x.preis;
    st += w * x.technik;
  }
  const wRest = Math.max(inp.zustand.anteile['rest'] ?? 1 - sumAnbieter, 0.05);
  sw += wRest;
  sp += wRest * restPreis(inp.region, inp.produkt, inp.t);
  st += wRest * inp.zustand.tRest;
  return { pBar: sp / sw, tBar: st / sw };
}

/** Berechnet Nachfrage, Lieferung und Marktanteile eines Segments (5.1–5.3). */
export function berechneSegment(inp: SegmentInput): SegmentOutput {
  const p = PRODUKTE[inp.produkt];
  const reg = REGIONEN[inp.region];
  const ref = referenzPreis(inp.region, inp.produkt);
  const { pBar, tBar } = durchschnitte(inp);
  const v0 = startVolumen(inp.region, inp.produkt);
  const volumen =
    v0 *
    Math.pow(1 + p.wachstum + reg.zusatzwachstum, inp.t) *
    saison(inp.t) *
    (inp.eventFaktor ?? 1) *
    Math.pow(pBar / ref, -BALANCE.marktPreisElastizitaet);
  const { a, mStar, ti } = attraktivitaeten(inp, volumen, pBar, tBar);
  const a0 = inp.a0 ?? a0Aktuell(inp.zustand.a0Start, inp.t);
  const aSum = Object.values(a).reduce((s, x) => s + x, 0);
  const nenner = a0 + aSum;

  const nachfrage: Record<string, number> = {};
  for (const id of Object.keys(a)) nachfrage[id] = (volumen * a[id]) / nenner;
  const restNachfrage = (volumen * a0) / nenner;

  // Lieferung begrenzt durch Kapazität; 80 % der unbedienten Nachfrage wandern anteilig zur Konkurrenz
  const absatz: Record<string, number> = {};
  const unbedient: Record<string, number> = {};
  for (const x of inp.anbieter) {
    if (!(x.preis > 0)) continue;
    absatz[x.id] = Math.min(nachfrage[x.id], Math.max(0, x.kapazitaet));
    unbedient[x.id] = nachfrage[x.id] - absatz[x.id];
  }
  const ids = Object.keys(absatz);
  const zusatz: Record<string, number> = {};
  let restZusatz = 0;
  for (const i of ids) {
    const pool = 0.8 * unbedient[i];
    if (pool <= 0) continue;
    const gewichte = ids.filter((j) => j !== i).map((j) => [j, a[j]] as const);
    const gesamt = gewichte.reduce((s, [, g]) => s + g, 0) + a0;
    for (const [j, g] of gewichte) zusatz[j] = (zusatz[j] ?? 0) + (pool * g) / gesamt;
    restZusatz += (pool * a0) / gesamt;
  }
  for (const j of ids) {
    const frei = Math.max(0, inp.anbieter.find((x) => x.id === j)!.kapazitaet - absatz[j]);
    absatz[j] += Math.min(zusatz[j] ?? 0, frei);
  }
  for (const j of ids) absatz[j] = Math.min(Math.round(absatz[j]), Math.floor(Math.max(0, inp.anbieter.find((x) => x.id === j)!.kapazitaet)));
  const restAbsatz = Math.round(restNachfrage + restZusatz);
  const gesamtAbsatz = restAbsatz + ids.reduce((s, i) => s + absatz[i], 0);
  const anteile: Record<string, number> = { rest: gesamtAbsatz > 0 ? restAbsatz / gesamtAbsatz : 1 };
  for (const i of ids) anteile[i] = gesamtAbsatz > 0 ? absatz[i] / gesamtAbsatz : 0;

  return { volumen, pRef: ref, pBar, tBar, mStar, a0, a, nachfrage, absatz, unbedient, restNachfrage, restAbsatz, anteile, technikIndex: ti };
}

/**
 * Kalibriert A⁰ so, dass der Spieler mit Startwerten den Zielanteil im Segment erhält (5.3).
 * Die Gewichte für Ø-Preis/Ø-Technik werden iterativ verfeinert.
 */
export function kalibriereSegment(
  region: RegionId,
  produkt: ProductId,
  anbieter: Anbieter[],
  spielerId: string,
  tRestStart: number,
  zielAnteil: number,
): { zustand: MarktSegmentZustand; ergebnis: SegmentOutput } {
  const ref = referenzPreis(region, produkt);
  let zustand: MarktSegmentZustand = {
    a0Start: 1,
    anteile: { rest: 0.97, ...Object.fromEntries(anbieter.map((x) => [x.id, 0.01])) },
    durchschnittspreis: ref,
    tBar: tRestStart,
    tRest: tRestStart,
    volumen: startVolumen(region, produkt),
  };
  let out = berechneSegment({ region, produkt, t: 0, anbieter, zustand });
  for (let i = 0; i < 12; i++) {
    const aSum = Object.values(out.a).reduce((s, x) => s + x, 0);
    const a0 = out.a[spielerId] / zielAnteil - aSum;
    zustand = { ...zustand, a0Start: Math.max(a0, 1e-9), anteile: out.anteile };
    out = berechneSegment({ region, produkt, t: 0, anbieter, zustand });
  }
  zustand = {
    ...zustand,
    anteile: out.anteile,
    durchschnittspreis: out.pBar,
    tBar: out.tBar,
    volumen: out.volumen,
  };
  return { zustand, ergebnis: out };
}

export { clamp };
