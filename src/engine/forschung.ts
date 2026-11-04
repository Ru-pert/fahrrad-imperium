/** Forschung & Entwicklung neuer Produkte (Forschungsbaum). */
import { FORSCHUNG, FORSCHUNG_BALANCE, type ForschungsProjekt } from './config/research';
import { PRODUKTE } from './config/products';
import { herstellkosten, lernkurve } from './production';
import type { Decisions, GameState, ProductId } from './types';

export interface ProjektStatus {
  projekt: ForschungsProjekt;
  investiert: number;
  quartale: number;
  fertig: boolean;
  /** Voraussetzungen erfüllt */
  offen: boolean;
  /** Fortschritt 0–1 (Budget) */
  anteil: number;
}

export function projektStatus(s: GameState, p: ForschungsProjekt): ProjektStatus {
  const f = s.forschung?.[p.id];
  // Produkte, die schon im Programm sind (z. B. Startprodukte), gelten als erforscht
  const fertig = f?.fertigIm !== undefined || !!s.produkte[p.produkt];
  const offen = p.voraussetzungen.every((v) => {
    const vp = FORSCHUNG.find((x) => x.id === v)!;
    return s.forschung?.[v]?.fertigIm !== undefined || !!s.produkte[vp.produkt];
  });
  const investiert = fertig ? Math.max(f?.investiert ?? 0, p.kosten) : f?.investiert ?? 0;
  return { projekt: p, investiert, quartale: f?.quartale ?? 0, fertig, offen, anteil: Math.min(1, investiert / p.kosten) };
}

export const alleProjekte = (s: GameState): ProjektStatus[] => FORSCHUNG.map((p) => projektStatus(s, p));

/** Quartale bis zum Abschluss bei gleichbleibendem Budget (∞ ohne Budget) */
export function restQuartale(st: ProjektStatus, budget: number): number {
  if (st.fertig) return 0;
  const nachMindest = Math.max(1, st.projekt.mindestQuartale - st.quartale);
  if (budget <= 0) return Infinity;
  const nachBudget = Math.ceil(Math.max(0, st.projekt.kosten - st.investiert) / budget);
  return Math.max(nachMindest, nachBudget, 1);
}

/** Prüft die Forschungsbudgets; nur offene, nicht fertige Projekte erhalten Geld. */
export function normalisiereForschung(s: GameState, dec: Decisions, warn: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, betrag] of Object.entries(dec.forschung ?? {})) {
    const p = FORSCHUNG.find((x) => x.id === id);
    if (!p || !betrag || betrag <= 0) continue;
    const st = projektStatus(s, p);
    if (st.fertig) continue;
    if (!st.offen) {
      warn.push(`Forschung „${p.name}“: Voraussetzungen fehlen noch (${p.voraussetzungen.map((v) => FORSCHUNG.find((x) => x.id === v)?.name).join(', ')}).`);
      continue;
    }
    // Nicht mehr als nötig investieren
    const rest = Math.max(0, p.kosten - st.investiert);
    if (rest > 0) out[id] = Math.min(betrag, rest);
  }
  return out;
}

/** Legt ein neu entwickeltes Produkt an (verkaufsbereit ab dem nächsten Quartal). */
export function neuesProdukt(s: GameState, p: ProductId, feStart: number): void {
  const w = s.werke[0];
  const lk = lernkurve(FORSCHUNG_BALANCE.startKumMenge);
  const hk = w ? herstellkosten(p, w, 1, lk).hk : PRODUKTE[p].material;
  s.produkte[p] = {
    freigeschaltet: false,
    status: 'vorlauf',
    fe: feStart,
    kumMenge: FORSCHUNG_BALANCE.startKumMenge,
    lager: { stueck: 0, hk },
    materialSets: 0,
    materialWert: 0,
    letzteHk: hk,
  };
}

/** Bucht die Forschung eines Quartals; gibt fertige Projekte zurück. */
export function forscheQuartal(s: GameState, budgets: Record<string, number>, t: number): ForschungsProjekt[] {
  s.forschung ??= {};
  const fertig: ForschungsProjekt[] = [];
  for (const p of FORSCHUNG) {
    const betrag = budgets[p.id] ?? 0;
    const f = s.forschung[p.id];
    const vollFinanziert = !!f && f.investiert >= p.kosten - 0.5 && f.fertigIm === undefined;
    if (betrag <= 0 && !vollFinanziert) continue;
    const g = (s.forschung[p.id] ??= { investiert: 0, quartale: 0 });
    g.investiert += betrag;
    g.quartale += 1;
    const f2 = g;
    const id = p.id;
    void id;
    if (f2.fertigIm === undefined && f2.investiert >= p.kosten - 0.5 && f2.quartale >= p.mindestQuartale && !s.produkte[p.produkt]) {
      f2.fertigIm = t;
      neuesProdukt(s, p.produkt, p.kosten * FORSCHUNG_BALANCE.feStockAnteil);
      fertig.push(p);
    }
  }
  return fertig;
}
