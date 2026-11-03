import { BALANCE } from './config/balance';
import { PRODUKTE } from './config/products';
import { aktiveProdukte, standardEntscheidungen } from './decisions';
import { kreditlimit, schuldenGesamt } from './finance';
import { referenzPreis } from './market';
import { lernkurve } from './production';
import type { Decisions, GameState, ProductId, QuarterReport } from './types';
import { saison } from './util';

export interface BotOptionen {
  /** Preis relativ zum Marktdurchschnitt */
  preisFaktor: number;
  /** Marketing und F&E als Anteil am Vorquartalsumsatz */
  marketingAnteil: number;
  feAnteil: number;
  /** Linien ausbauen */
  ausbau: boolean;
}

export const STANDARD_BOT: BotOptionen = { preisFaktor: 0.98, marketingAnteil: 0.05, feAnteil: 0.04, ausbau: true };

/**
 * Einfacher Balancing-Bot mit „vernünftiger Standardstrategie“:
 * Preis knapp unter Markt, Marketing/F&E als Umsatzanteil, Produktion nach Nachfrage, Personal und Linien bedarfsgerecht.
 */
export function botEntscheidungen(state: GameState, letzter: QuarterReport | null, opt: BotOptionen = STANDARD_BOT): Decisions {
  const d = standardEntscheidungen(state);
  const umsatz = letzter?.guv.umsatz ?? 2_400_000;
  const werk = state.werke[0];
  const produkte = aktiveProdukte(state);
  const umsatzAnteil: Partial<Record<ProductId, number>> = {};
  const gesamt = letzter ? Math.max(1, letzter.produkte.reduce((s, p) => s + p.umsatz, 0)) : 1;
  for (const p of produkte) umsatzAnteil[p] = letzter ? (letzter.produkte.find((x) => x.produkt === p)?.umsatz ?? 0) / gesamt : 1 / produkte.length;

  let stundenBedarf = 0;
  for (const p of produkte) {
    const z = state.markt.DE?.[p];
    const ref = referenzPreis('DE', p);
    const preis = Math.min(1.3 * ref, Math.max(0.6 * ref, (z?.durchschnittspreis ?? ref) * opt.preisFaktor));
    d.preis[p] = { DE: Math.round(preis) };
    d.marketing[p] = { DE: Math.round(Math.max(10_000, umsatz * opt.marketingAnteil * (umsatzAnteil[p] ?? 0.5))) };
    d.fe[p] = Math.round(Math.max(5_000, umsatz * opt.feAnteil * (umsatzAnteil[p] ?? 0.5)));
    // Nachfrage des Vorquartals, saisonbereinigt fortgeschrieben
    const ang = letzter?.angebote.find((a) => a.produkt === p);
    const basis = ang ? Math.max(ang.nachfrage, ang.absatz) : 800;
    const ziel = Math.round(basis * (saison(state.quartal) / saison(state.quartal - 1)) * 1.02);
    const lager = state.produkte[p]!.lager.stueck;
    const menge = Math.max(0, ziel - Math.round(lager * 0.5));
    d.produktion[p] = { [werk.id]: menge };
    stundenBedarf += menge * PRODUKTE[p].montageStunden * lernkurve(state.produkte[p]!.kumMenge);
  }

  // Kapazität: Linien ausbauen, Personal anpassen
  const aktive = werk.linien.filter((l) => l.status === 'aktiv');
  const imBau = werk.linien.filter((l) => l.status === 'bau').length;
  const maschStd = aktive.reduce((s, l) => s + (l.typ === 'A' ? 9000 : l.typ === 'B' ? 6000 : 4000) * l.verfuegbarkeit, 0);
  const e = d.werke[werk.id];
  if (opt.ausbau && stundenBedarf > maschStd * 0.95 && imBau === 0 && werk.linien.length < BALANCE.produktion.maxLinienProHalle) {
    const kosten = 600_000;
    if (state.finanzen.kasse > kosten * 2) e.linienKaufen = [{ typ: 'B', anzahl: 1 }];
  }
  const hoursPerMa = BALANCE.personal.stundenProMitarbeiter * werk.motivation * werk.kompetenz;
  const zielMa = Math.ceil(Math.min(stundenBedarf, maschStd * 1.1) / (hoursPerMa * 0.97)) + 1;
  const diff = zielMa - werk.mitarbeitende;
  e.personalAenderung = diff > 0 ? Math.min(diff, Math.floor(werk.mitarbeitende * 0.5)) : diff < -3 ? Math.max(diff, -Math.floor(werk.mitarbeitende * 0.2)) : 0;
  e.schulungProKopf = 500;

  // Liquidität
  const f = state.finanzen;
  if (f.kasse < 300_000) {
    const frei = Math.max(0, kreditlimit(state) - schuldenGesamt(f));
    d.finanzen.darlehenNeu = Math.min(500_000, frei);
  }
  return d;
}
