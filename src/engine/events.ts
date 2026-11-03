import { EREIGNISKATALOG, type EreignisDef } from './config/events';
import { KOMPONENTEN_GEWICHT_EBIKE, KOMPONENTEN_GEWICHT_STANDARD, PRODUKTE } from './config/products';
import type { AktivesEreignis, GameState, ProductId } from './types';
import type { Rng } from './rng';

export const ereignisDef = (id: string): EreignisDef | undefined => EREIGNISKATALOG.find((e) => e.id === id);

export interface Effekte {
  /** Nachfragefaktor je Produkt */
  nachfrage: (p: ProductId) => number;
  /** Preisfaktor auf das Material eines Produkts (Stahlpreis wirkt auf den Rahmenanteil) */
  material: (p: ProductId) => number;
  /** Maximaler Produktionsanteil für E-Modelle */
  akku: number;
  energie: number;
  einstellung: number;
  /** Kapazitätsfaktor je Werk (Streik) */
  streik: (werkId: string) => number;
}

/** Neutrale Effekte (keine Ereignisse) */
export const KEINE_EFFEKTE: Effekte = {
  nachfrage: () => 1,
  material: () => 1,
  akku: 1,
  energie: 1,
  einstellung: 1,
  streik: () => 1,
};

/** Wirkungen der aktiven Ereignisse für das aktuelle Quartal. */
export function ereignisEffekte(state: Pick<GameState, 'ereignisse'>): Effekte {
  const aktiv = state.ereignisse ?? [];
  if (!aktiv.length) return KEINE_EFFEKTE;
  let akku = 1;
  let energie = 1;
  let einstellung = 1;
  let rahmen = 1;
  const nachfrage: { faktor: number; produkte?: string[] }[] = [];
  const streik: Record<string, number> = {};
  for (const a of aktiv) {
    const d = ereignisDef(a.id);
    if (!d) continue;
    const e = d.effekt;
    switch (e.art) {
      case 'nachfrage':
        nachfrage.push({ faktor: e.faktor, produkte: e.produkte });
        break;
      case 'boom':
        nachfrage.push({ faktor: a.rest >= d.dauer ? 1.4 : 0.9 });
        break;
      case 'material':
        rahmen *= e.faktor;
        break;
      case 'akku':
        akku = Math.min(akku, e.maxProduktion);
        break;
      case 'energie':
        energie *= e.faktor;
        break;
      case 'einstellung':
        einstellung *= e.faktor;
        break;
      case 'streik':
        if (a.werkId) streik[a.werkId] = Math.min(streik[a.werkId] ?? 1, e.kapazitaet);
        break;
      default:
        break;
    }
  }
  return {
    nachfrage: (p) => nachfrage.reduce((f, n) => (n.produkte && !n.produkte.includes(p) ? f : f * n.faktor), 1),
    material: (p) => {
      const g = PRODUKTE[p].istEBike ? KOMPONENTEN_GEWICHT_EBIKE.rahmen : KOMPONENTEN_GEWICHT_STANDARD.rahmen;
      return 1 + g * (rahmen - 1);
    },
    akku,
    energie,
    einstellung,
    streik: (id) => streik[id] ?? 1,
  };
}

/**
 * Lässt laufende Ereignisse ablaufen und würfelt neue für das kommende Quartal.
 * `zusatzStreik` erhöht das Streikrisiko (wenig Schulung, viele Überstunden).
 */
export function naechsteEreignisse(
  state: GameState,
  rng: Rng,
  ctx: { produkte: ProductId[]; regionen: string[]; zusatzStreik: number; naechstesQuartal: number },
): AktivesEreignis[] {
  const bleibende = (state.ereignisse ?? [])
    .map((e) => ({ ...e, rest: e.rest - 1, neu: false }))
    .filter((e) => e.rest > 0);
  const neu: AktivesEreignis[] = [];
  const qImJahr = (ctx.naechstesQuartal % 4) + 1;
  for (const d of EREIGNISKATALOG) {
    if (bleibende.some((e) => e.id === d.id)) continue;
    if (d.id === 'eugesetz' && state.euGesetz) continue;
    if (d.id === 'zinswende' && state.zinsen.basiszins >= 0.07) continue;
    if (d.nurQuartale && !d.nurQuartale.includes(qImJahr)) continue;
    if (d.abQuartal !== undefined && ctx.naechstesQuartal < d.abQuartal) continue;
    if (d.brauchtProdukt && !d.brauchtProdukt.some((p) => ctx.produkte.includes(p as ProductId))) continue;
    if (d.brauchtRegion && !ctx.regionen.includes(d.brauchtRegion)) continue;
    // Gegensätzliche Wetterlagen schließen sich aus
    if (d.id === 'regenrekord' && neu.some((e) => e.id === 'hitzesommer')) continue;
    const p = d.wahrscheinlichkeit + (d.id === 'streik' ? ctx.zusatzStreik : 0);
    if (!rng.chance(p)) continue;
    if (neu.length >= 2) continue;
    const e: AktivesEreignis = { id: d.id, rest: d.dauer, neu: true };
    if (d.effekt.art === 'streik') e.werkId = state.werke[Math.floor(rng.next() * state.werke.length)]?.id;
    neu.push(e);
  }
  return [...bleibende, ...neu];
}
