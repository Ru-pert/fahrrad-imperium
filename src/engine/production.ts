import { BALANCE } from './config/balance';
import {
  KOMPONENTEN_GEWICHT_EBIKE,
  KOMPONENTEN_GEWICHT_STANDARD,
  LIEFERANTEN,
  LINIENTYPEN,
  PRODUKTE,
  WARTUNG,
} from './config/products';
import type { Decisions, Komponente, Linie, ProductId, SupplierLevel, Werk } from './types';
import { clamp } from './util';

export const KOMPONENTEN: Komponente[] = ['rahmen', 'akku', 'antrieb'];

/** Erfahrungskurve LK (6) */
export function lernkurve(kumMenge: number): number {
  const P = BALANCE.produktion;
  return Math.max(P.lernkurveMin, Math.pow(Math.max(kumMenge, 1) / P.lernkurveBasis, P.lernkurveExponent));
}

function gewichte(p: ProductId) {
  return PRODUKTE[p].istEBike ? KOMPONENTEN_GEWICHT_EBIKE : KOMPONENTEN_GEWICHT_STANDARD;
}

/** Gewichteter Lieferantenfaktor L_f (Kosten) */
export function lieferantenKostenFaktor(p: ProductId, l: Record<Komponente, SupplierLevel>): number {
  const g = gewichte(p);
  return KOMPONENTEN.reduce((s, k) => s + g[k] * LIEFERANTEN[l[k]].kosten, 0);
}

/** Mittelwert der Qualitätsfaktoren der für das Produkt relevanten Komponenten */
export function lieferantenQualitaet(p: ProductId, l: Record<Komponente, SupplierLevel>): number {
  const g = gewichte(p);
  const ks = KOMPONENTEN.filter((k) => g[k] > 0);
  return ks.reduce((s, k) => s + LIEFERANTEN[l[k]].qualitaet, 0) / ks.length;
}

export function lieferantenUmwelt(p: ProductId, l: Record<Komponente, SupplierLevel>): number {
  const g = gewichte(p);
  const ks = KOMPONENTEN.filter((k) => g[k] > 0);
  return ks.reduce((s, k) => s + LIEFERANTEN[l[k]].umwelt, 0) / ks.length;
}

export function lohnProMitarbeiter(w: Pick<Werk, 'lohnIndex'>): number {
  const P = BALANCE.personal;
  return P.lohnBrutto * (1 + P.nebenkosten + P.betriebsrente) * w.lohnIndex;
}

export const lohnProStunde = (w: Pick<Werk, 'lohnIndex'>): number => lohnProMitarbeiter(w) / BALANCE.personal.stundenProMitarbeiter;

/** Herstellkosten je Stück: Material (inkl. Lieferant, Ereignis, Lernkurve) + Fertigungslohn */
export function herstellkosten(p: ProductId, werk: Werk, lf: number, lk: number, ePreis = 1): { material: number; lohn: number; hk: number } {
  const cfg = PRODUKTE[p];
  const material = cfg.material * lf * ePreis * lk;
  const lohn = cfg.montageStunden * lk * lohnProStunde(werk);
  return { material, lohn, hk: material + lohn };
}

/** Qualität Q (5.6) */
export function qualitaet(p: ProductId, l: Record<Komponente, SupplierLevel>, schulung: number, ueberstunden: boolean): number {
  const Q = BALANCE.qualitaet;
  const bonus = Q.schulungBonusMax * clamp(schulung / Q.schulungBonusBei, 0, 1);
  return clamp(lieferantenQualitaet(p, l) + bonus - (ueberstunden ? Q.ueberstundenAbzug : 0), Q.min, Q.max);
}

/** Nacharbeitsquote (6.2) */
export function nacharbeitsquote(technik: number, auslastung: number, menge: number): number {
  const N = BALANCE.produktion.nacharbeit;
  const mengenFaktor = Math.max(0.1, 1 + N.mengeKoeffizient * Math.log(Math.max(menge, 1) / N.mengeBasis));
  return N.basis * Math.exp(N.technik * technik) * (1 + N.ueberauslastung * Math.max(0, auslastung - 1)) * mengenFaktor;
}

/** Verfügbarkeit der Linien zu Quartalsbeginn je Wartungsvertrag (6.1) */
export function neueVerfuegbarkeit(alt: number, wartung: Decisions['werke'][string]['wartung']): number {
  const P = BALANCE.produktion;
  if (wartung === 'keiner') return Math.max(P.verfuegbarkeitOhneWartung.min, alt - P.verfuegbarkeitOhneWartung.abnahme);
  if (wartung === 'basis') return alt >= P.verfuegbarkeitBasis ? P.verfuegbarkeitBasis : Math.min(P.verfuegbarkeitBasis, alt + P.verfuegbarkeitErholung);
  return Math.min(1, alt + P.verfuegbarkeitErholung);
}

export function wartungsKosten(wartung: keyof typeof WARTUNG): number {
  return WARTUNG[wartung].kosten;
}

/** Abschreibung einer Linie in diesem Quartal (linear über die Restlaufzeit). */
export function linienAfa(l: Linie): number {
  return l.status === 'aktiv' && l.restlaufzeit > 0 ? l.buchwert / l.restlaufzeit : 0;
}

export function neueLinie(id: string, typ: keyof typeof LINIENTYPEN): Linie {
  const t = LINIENTYPEN[typ];
  return {
    id,
    typ,
    status: 'bau',
    bauRest: BALANCE.produktion.linienBauzeit,
    restlaufzeit: t.lebensdauer,
    anschaffung: t.preis,
    buchwert: t.preis,
    verfuegbarkeit: 1,
    umweltindex: t.umwelt,
  };
}

/** Linienplätze eines Werks (Halle) */
export const hallenPlaetze = (w: Werk): number => w.hallenPlaetze ?? BALANCE.produktion.maxLinienProHalle;

export const aktiveLinien = (w: Werk): Linie[] => w.linien.filter((l) => l.status === 'aktiv');
