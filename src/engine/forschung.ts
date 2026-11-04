/** Forschung & Entwicklung neuer Produkte (Forschungsbaum). */
import { FORSCHUNG, FORSCHUNG_BALANCE, type ForschungsProjekt } from './config/research';
import { FEATURES, FEATURE_BALANCE, type FeatureProjekt, type FeatureWirkung } from './config/features';
import { PRODUKTE } from './config/products';
import { herstellkosten, lernkurve } from './production';
import type { Decisions, GameState, ProductId } from './types';

export interface ProjektStatus<P = ForschungsProjekt> {
  projekt: P;
  investiert: number;
  quartale: number;
  fertig: boolean;
  /** Voraussetzungen erfüllt */
  offen: boolean;
  /** Fortschritt 0–1 (Budget) */
  anteil: number;
}

/** Ist ein Projekt (Produkt oder Feature) abgeschlossen? Produkte im Programm gelten als erforscht. */
export function istErforscht(s: GameState, id: string): boolean {
  if (s.forschung?.[id]?.fertigIm !== undefined) return true;
  const pp = FORSCHUNG.find((x) => x.id === id);
  return !!pp && !!s.produkte[pp.produkt];
}

/** Name eines beliebigen Forschungsprojekts */
export const projektName = (id: string): string => FORSCHUNG.find((x) => x.id === id)?.name ?? FEATURES.find((x) => x.id === id)?.name ?? id;

export function projektStatus(s: GameState, p: ForschungsProjekt): ProjektStatus {
  const f = s.forschung?.[p.id];
  const fertig = istErforscht(s, p.id);
  const offen = p.voraussetzungen.every((v) => istErforscht(s, v));
  const investiert = fertig ? Math.max(f?.investiert ?? 0, p.kosten) : f?.investiert ?? 0;
  return { projekt: p, investiert, quartale: f?.quartale ?? 0, fertig, offen, anteil: Math.min(1, investiert / p.kosten) };
}

export const alleProjekte = (s: GameState): ProjektStatus[] => FORSCHUNG.map((p) => projektStatus(s, p));

export function featureStatus(s: GameState, p: FeatureProjekt): ProjektStatus<FeatureProjekt> {
  const f = s.forschung?.[p.id];
  const fertig = istErforscht(s, p.id);
  const offen = p.voraussetzungen.every((v) => istErforscht(s, v));
  const investiert = fertig ? Math.max(f?.investiert ?? 0, p.kosten) : f?.investiert ?? 0;
  return { projekt: p, investiert, quartale: f?.quartale ?? 0, fertig, offen, anteil: Math.min(1, investiert / p.kosten) };
}

export const alleFeatures = (s: GameState): ProjektStatus<FeatureProjekt>[] => FEATURES.map((p) => featureStatus(s, p));

/** Fertige Features, die für ein Produkt gelten */
export const featuresFuer = (s: GameState, p: ProductId): FeatureProjekt[] => FEATURES.filter((f) => f.fuer.includes(p) && istErforscht(s, f.id));

/** Summe der Feature-Wirkungen für ein Produkt (Nachfrage und Material multiplikativ) */
export function featureWirkung(s: GameState, p: ProductId): Required<Pick<FeatureWirkung, 'technik' | 'qualitaet'>> & { nachfrage: number; material: number } {
  let technik = 0;
  let qualitaet = 0;
  let nachfrage = 1;
  let material = 1;
  for (const f of featuresFuer(s, p)) {
    technik += f.wirkung.technik ?? 0;
    qualitaet += f.wirkung.qualitaet ?? 0;
    nachfrage *= 1 + (f.wirkung.nachfrage ?? 0);
    material *= 1 + (f.wirkung.material ?? 0);
  }
  return { technik, qualitaet, nachfrage, material };
}

/** Unternehmensweite Wirkungen fertiger Features (Image, Nachhaltigkeit) */
export function featureUnternehmen(s: GameState): { image: number; nachhaltigkeit: number } {
  let image = 0;
  let nachhaltigkeit = 0;
  for (const f of FEATURES) {
    if (!istErforscht(s, f.id)) continue;
    image += f.wirkung.image ?? 0;
    nachhaltigkeit += f.wirkung.nachhaltigkeit ?? 0;
  }
  return { image: Math.min(image, FEATURE_BALANCE.imageMax), nachhaltigkeit };
}

type IrgendeinProjekt = ForschungsProjekt | FeatureProjekt;
const findeProjekt = (id: string): IrgendeinProjekt | undefined => FORSCHUNG.find((x) => x.id === id) ?? FEATURES.find((x) => x.id === id);

/** Quartale bis zum Abschluss bei gleichbleibendem Budget (∞ ohne Budget) */
export function restQuartale(st: ProjektStatus<ForschungsProjekt | FeatureProjekt>, budget: number): number {
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
    const p = findeProjekt(id);
    if (!p || !betrag || betrag <= 0) continue;
    if (istErforscht(s, id)) continue;
    const st = { investiert: s.forschung?.[id]?.investiert ?? 0, offen: p.voraussetzungen.every((v) => istErforscht(s, v)) };
    if (!st.offen) {
      warn.push(`Forschung „${p.name}“: Voraussetzungen fehlen noch (${p.voraussetzungen.filter((v) => !istErforscht(s, v)).map(projektName).join(', ')}).`);
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

/** Bucht die Forschung eines Quartals; gibt fertige Projekte zurück (Produkte und Features). */
export function forscheQuartal(s: GameState, budgets: Record<string, number>, t: number): { produkte: ForschungsProjekt[]; features: FeatureProjekt[] } {
  s.forschung ??= {};
  const fertig: ForschungsProjekt[] = [];
  const features: FeatureProjekt[] = [];
  for (const p of FEATURES) {
    const betrag = budgets[p.id] ?? 0;
    const f = s.forschung[p.id];
    const vollFinanziert = !!f && f.investiert >= p.kosten - 0.5 && f.fertigIm === undefined;
    if (betrag <= 0 && !vollFinanziert) continue;
    const g = (s.forschung[p.id] ??= { investiert: 0, quartale: 0 });
    g.investiert += betrag;
    g.quartale += 1;
    if (g.fertigIm === undefined && g.investiert >= p.kosten - 0.5 && g.quartale >= p.mindestQuartale) {
      g.fertigIm = t;
      features.push(p);
    }
  }
  for (const p of FORSCHUNG) {
    const betrag = budgets[p.id] ?? 0;
    const f = s.forschung[p.id];
    const vollFinanziert = !!f && f.investiert >= p.kosten - 0.5 && f.fertigIm === undefined;
    if (betrag <= 0 && !vollFinanziert) continue;
    const g = (s.forschung[p.id] ??= { investiert: 0, quartale: 0 });
    g.investiert += betrag;
    g.quartale += 1;
    const f2 = g;
    if (f2.fertigIm === undefined && f2.investiert >= p.kosten - 0.5 && f2.quartale >= p.mindestQuartale && !s.produkte[p.produkt]) {
      f2.fertigIm = t;
      neuesProdukt(s, p.produkt, p.kosten * FORSCHUNG_BALANCE.feStockAnteil);
      fertig.push(p);
    }
  }
  return { produkte: fertig, features };
}
