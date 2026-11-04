/**
 * Krisen mit Entscheidungen: Auswahl zwischen zwei Quartalen, Auflösung zu Beginn des Folgequartals.
 * Eigener Zufallsstrom (Seed + Quartal), damit der Hauptstrom der Simulation unverändert bleibt.
 */
import { KRISE, KRISEN, type KrisenDef, type KrisenOption, type KrisenWirkung } from './config/krisen';
import { PRODUKTE } from './config/products';
import { aktiveProdukte, aktiveRegionen } from './decisions';
import { Rng, hashSeed } from './rng';
import type { GameState, KrisenEffekt, OffeneKrise, ProductId } from './types';
import { clamp } from './util';

export const krisenDef = (id: string): KrisenDef | undefined => KRISEN.find((k) => k.id === id);

export const krisenRng = (s: GameState, t: number, art: string): Rng => new Rng(hashSeed(`${s.einstellungen.seed}:${t}:${art}`));

/** Umsatz, auf den sich Krisenkosten beziehen */
export const krisenBezug = (s: GameState): number => Math.max(KRISE.bezugMin, s.kpiHistorie[s.kpiHistorie.length - 1]?.umsatz ?? 0);

export const standardOption = (d: KrisenDef): KrisenOption => d.optionen.find((o) => o.standard) ?? d.optionen[d.optionen.length - 1];

/** Text mit Platzhaltern füllen */
export function krisenText(text: string, s: GameState, k: Pick<OffeneKrise, 'produkt' | 'werkId' | 'konkurrent'>): string {
  return text
    .replace(/\{firma\}/g, s.unternehmen.name)
    .replace(/\{produkt\}/g, k.produkt ? PRODUKTE[k.produkt].name : 'Rad')
    .replace(/\{werk\}/g, s.werke.find((w) => w.id === k.werkId)?.name ?? 'Stammwerk')
    .replace(/\{konkurrent\}/g, (k.konkurrent && s.konkurrenten[k.konkurrent]?.name) || 'der Konkurrenz');
}

export const risikoChance = (o: KrisenOption, s: GameState): number => {
  if (!o.risiko) return 0;
  return typeof o.risiko.chance === 'function' ? o.risiko.chance(s) : o.risiko.chance;
};

/** Kosten einer Wirkung in Euro */
export const wirkungKosten = (w: KrisenWirkung, bezug: number): number => (w.kosten ? Math.max(w.kostenMin ?? 0, w.kosten * bezug) : 0);

export interface KrisenAuswirkung {
  kosten: number;
  ertrag: number;
  image: number;
}

/** Wendet eine Wirkung auf den Zustand an (Motivation, Bekanntheit, Zufriedenheit, Nachhaltigkeit, Dauerwirkungen). */
function wendeAn(s: GameState, w: KrisenWirkung, k: OffeneKrise, t: number, bezug: number, sum: KrisenAuswirkung) {
  sum.kosten += wirkungKosten(w, bezug);
  if (w.ertrag) sum.ertrag += w.ertrag * bezug;
  if (w.image) sum.image += w.image;
  if (w.motivation) for (const werk of s.werke) werk.motivation = clamp(werk.motivation + w.motivation, 0.5, 1.2);
  if (w.bekanntheit) for (const r of aktiveRegionen(s)) s.regionen[r]!.bekanntheit = clamp(s.regionen[r]!.bekanntheit + w.bekanntheit, 0.001, 0.95);
  if (w.zufriedenheit) for (const key of Object.keys(s.unternehmen.zufriedenheit)) s.unternehmen.zufriedenheit[key] = clamp(s.unternehmen.zufriedenheit[key] + w.zufriedenheit, 0, 100);
  if (w.nachhaltigkeit) s.unternehmen.nachhaltigkeit = clamp(s.unternehmen.nachhaltigkeit + w.nachhaltigkeit, 0, 100);
  const eff = (s.krisenEffekte ??= []);
  if (w.nachfrage) eff.push({ art: 'nachfrage', faktor: w.nachfrage.faktor, bis: t + w.nachfrage.quartale - 1, produkt: w.nachfrage.nurProdukt ? k.produkt : undefined });
  if (w.kapazitaet) eff.push({ art: 'kapazitaet', faktor: w.kapazitaet.faktor, bis: t + w.kapazitaet.quartale - 1, werkId: w.kapazitaet.nurWerk ? k.werkId : undefined });
  if (w.material) eff.push({ art: 'material', faktor: w.material.faktor, bis: t + w.material.quartale - 1 });
  if (w.rache && k.konkurrent) s.rache = { ...(s.rache ?? {}), [k.konkurrent]: t + w.rache - 1 };
}

/**
 * Löst die offene Krise mit der gewählten Option auf (zu Beginn des Quartals).
 * Ohne Zufall (Vorschau) tritt kein Risiko ein.
 */
export function loeseKrise(s: GameState, wahl: string | undefined, t: number, zufall: boolean) {
  const k = s.krise;
  s.krise = null;
  s.krisenEffekte = (s.krisenEffekte ?? []).filter((e) => e.bis >= t);
  if (!k) return null;
  const d = krisenDef(k.id);
  if (!d) return null;
  const o = d.optionen.find((x) => x.id === wahl) ?? standardOption(d);
  const bezug = krisenBezug(s);
  const sum: KrisenAuswirkung = { kosten: 0, ertrag: 0, image: 0 };
  wendeAn(s, o.wirkung, k, t, bezug, sum);
  let pech = false;
  if (o.risiko) {
    pech = zufall && krisenRng(s, t, 'krise-ausgang').chance(risikoChance(o, s));
    if (pech) wendeAn(s, o.risiko.wirkung, k, t, bezug, sum);
    else if (o.risiko.glueck) wendeAn(s, o.risiko.glueck, k, t, bezug, sum);
  }
  const text = krisenText(pech && o.risiko ? o.risiko.text : o.erfolg, s, k);
  if (zufall) s.krisenVerlauf = [...(s.krisenVerlauf ?? []), { id: d.id, quartal: t, wahl: o.id, pech, text }];
  return { id: d.id, titel: krisenText(d.titel, s, k), wahl: o.id, label: o.label, pech, text, ...sum };
}

/** Faktor der laufenden Krisenwirkungen */
export function krisenFaktor(s: Pick<GameState, 'krisenEffekte'>, t: number, art: KrisenEffekt['art'], ziel: { produkt?: ProductId; werkId?: string } = {}): number {
  let f = 1;
  for (const e of s.krisenEffekte ?? []) {
    if (e.art !== art || e.bis < t) continue;
    if (e.produkt && ziel.produkt && e.produkt !== ziel.produkt) continue;
    if (e.werkId && ziel.werkId && e.werkId !== ziel.werkId) continue;
    if (e.werkId && !ziel.werkId) continue;
    f *= e.faktor;
  }
  return f;
}

/** Würfelt am Quartalsende eine neue Krise für das kommende Quartal aus. */
export function naechsteKrise(s: GameState, tNeu: number): OffeneKrise | null {
  if (s.spielende || s.endwertung) return null;
  const verlauf = s.krisenVerlauf ?? [];
  const letzte = verlauf[verlauf.length - 1]?.quartal ?? -99;
  if (tNeu - letzte < KRISE.abstand || tNeu < 2) return null;
  const rng = krisenRng(s, tNeu, 'krise-neu');
  if (!rng.chance(KRISE.wahrscheinlichkeit)) return null;
  const produkte = aktiveProdukte(s);
  const werke = s.werke.filter((w) => (w.status ?? 'aktiv') === 'aktiv');
  const konkurrenten = Object.values(s.konkurrenten).filter((k) => k.status === 'aktiv' && k.uebernommen === undefined);
  const kandidaten = KRISEN.filter((d) => {
    if (d.abQuartal !== undefined && tNeu < d.abQuartal) return false;
    if (verlauf.some((v) => v.id === d.id && tNeu - v.quartal < KRISE.wiederholung)) return false;
    if (d.kontext === 'produkt' && !produkte.length) return false;
    if (d.kontext === 'werk' && !werke.length) return false;
    if (d.kontext === 'konkurrent' && !konkurrenten.length) return false;
    return !d.bedingung || d.bedingung(s);
  });
  if (!kandidaten.length) return null;
  const summe = kandidaten.reduce((a, d) => a + d.gewicht, 0);
  let x = rng.next() * summe;
  let d = kandidaten[0];
  for (const c of kandidaten) {
    x -= c.gewicht;
    if (x <= 0) {
      d = c;
      break;
    }
  }
  const k: OffeneKrise = { id: d.id, quartal: tNeu };
  if (d.kontext === 'produkt') k.produkt = produkte[Math.floor(rng.next() * produkte.length)];
  if (d.kontext === 'werk') k.werkId = werke[Math.floor(rng.next() * werke.length)].id;
  if (d.kontext === 'konkurrent') k.konkurrent = konkurrenten[Math.floor(rng.next() * konkurrenten.length)].id;
  return k;
}

/** Beschreibung der offenen Krise mit Kosten in Euro (für Oberfläche und Export) */
export function krisenAnsicht(s: GameState) {
  const k = s.krise;
  const d = k ? krisenDef(k.id) : undefined;
  if (!k || !d) return null;
  const bezug = krisenBezug(s);
  return {
    id: d.id,
    icon: d.icon,
    titel: krisenText(d.titel, s, k),
    text: krisenText(d.text, s, k),
    optionen: d.optionen.map((o) => ({
      id: o.id,
      label: o.label,
      hinweis: krisenText(o.hinweis, s, k),
      kosten: wirkungKosten(o.wirkung, bezug),
      ertrag: o.wirkung.ertrag ? o.wirkung.ertrag * bezug : 0,
      risiko: o.risiko ? Math.round(risikoChance(o, s) * 100) : 0,
      standard: o === standardOption(d),
    })),
  };
}
