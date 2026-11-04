import { BALANCE } from './config/balance';
import { LINIENTYPEN, PRODUKTE } from './config/products';
import { REGIONEN, WERK_STANDORTE } from './config/markets';
import { aktiveProdukte, aktiveRegionen, standardEntscheidungen } from './decisions';
import { einstellungsLimit, werkBaubar } from './expansion';
import { alleProjekte } from './forschung';
import { kreditlimit, schuldenGesamt } from './finance';
import { referenzPreis } from './market';
import { hallenPlaetze, lernkurve } from './production';
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
  /** Märkte, Produkte und Werke erschließen */
  expansion?: boolean;
}

export const STANDARD_BOT: BotOptionen = { preisFaktor: 0.98, marketingAnteil: 0.05, feAnteil: 0.04, ausbau: true, expansion: true };

/**
 * Balancing-Bot mit „vernünftiger Standardstrategie“: Preis knapp unter Markt, Marketing/F&E als Umsatzanteil,
 * Produktion nach Nachfrage, Personal und Linien bedarfsgerecht, Expansion sobald finanzierbar.
 */
export function botEntscheidungen(state: GameState, letzter: QuarterReport | null, opt: BotOptionen = STANDARD_BOT): Decisions {
  const d = standardEntscheidungen(state);
  const umsatz = letzter?.guv.umsatz ?? 2_400_000;
  const produkte = aktiveProdukte(state);
  const regionen = aktiveRegionen(state);
  const aktiveWerke = state.werke.filter((w) => (w.status ?? 'aktiv') === 'aktiv');
  let kasse = state.finanzen.kasse;

  const umsatzAnteil = (p: ProductId) => {
    if (!letzter) return 1 / produkte.length;
    const ges = Math.max(1, letzter.produkte.reduce((s, x) => s + x.umsatz, 0));
    const u = letzter.produkte.find((x) => x.produkt === p)?.umsatz ?? 0;
    return u > 0 ? u / ges : 0.5 / produkte.length;
  };

  // Preise, Marketing, F&E, Produktionsbedarf
  const bedarf: Partial<Record<ProductId, number>> = {};
  for (const p of produkte) {
    let basis = 0;
    for (const r of regionen) {
      const z = state.markt[r]?.[p];
      const ref = referenzPreis(r, p);
      const ang = letzter?.angebote.find((a) => a.produkt === p && a.region === r);
      let preis = Math.min(1.3 * ref, Math.max(0.6 * ref, (z?.durchschnittspreis ?? ref) * opt.preisFaktor));
      // Bei deutlicher Übernachfrage Preis schrittweise anheben (Knappheit nutzen, Auslandsmärkte nicht aushungern)
      const bisher = state.letzteEntscheidungen.preis[p]?.[r];
      if (ang && bisher && ang.nachfrage > ang.absatz * 1.25) preis = Math.min(1.6 * ref, Math.max(preis, bisher * 1.05));
      d.preis[p] = { ...d.preis[p], [r]: Math.round(preis) };
      const neuImMarkt = !ang;
      d.marketing[p] = { ...d.marketing[p], [r]: Math.round(Math.max(neuImMarkt ? 60_000 : 10_000, (ang?.umsatz ?? 0) * opt.marketingAnteil * 1.2)) };
      basis += ang ? Math.max(ang.nachfrage, ang.absatz) : neuImMarkt ? 600 : 0;
    }
    d.fe[p] = Math.round(Math.max(5_000, umsatz * opt.feAnteil * umsatzAnteil(p)));
    const ziel = Math.round(basis * (saison(state.quartal) / saison(state.quartal - 1)) * 1.02);
    bedarf[p] = Math.max(0, ziel - Math.round(state.produkte[p]!.lager.stueck * 0.5));
  }

  // Produktion auf Werke verteilen (nach Maschinenkapazität, günstige Werke zuerst gefüllt)
  const kap = aktiveWerke.map((w) => w.linien.filter((l) => l.status === 'aktiv').reduce((s, l) => s + LINIENTYPEN[l.typ].kapazitaet * l.verfuegbarkeit, 0));
  const kapSumme = Math.max(1, kap.reduce((a, b) => a + b, 0));
  const stundenBedarfWerk = aktiveWerke.map(() => 0);
  for (const p of produkte) {
    const stunden = PRODUKTE[p].montageStunden * lernkurve(state.produkte[p]!.kumMenge);
    aktiveWerke.forEach((w, i) => {
      const menge = Math.round(((bedarf[p] ?? 0) * kap[i]) / kapSumme);
      d.produktion[p] = { ...d.produktion[p], [w.id]: menge };
      stundenBedarfWerk[i] += menge * stunden;
    });
  }

  // Linien, Halle und Personal je Werk
  aktiveWerke.forEach((w, i) => {
    const e = d.werke[w.id];
    const imBau = w.linien.filter((l) => l.status === 'bau').length;
    if (opt.ausbau && imBau === 0 && (stundenBedarfWerk[i] > kap[i] * 0.95 || w.linien.length === 0)) {
      if (w.linien.length < hallenPlaetze(w) && kasse > 1_500_000) {
        e.linienKaufen = [{ typ: 'B', anzahl: w.linien.length === 0 ? 2 : 1 }];
        kasse -= 600_000 * (w.linien.length === 0 ? 2 : 1);
      } else if (w.linien.length >= hallenPlaetze(w) && !(w.halleImBau ?? 0) && kasse > BALANCE.produktion.hallenErweiterung.kosten * 1.8) {
        e.halleErweitern = true;
        kasse -= BALANCE.produktion.hallenErweiterung.kosten;
      }
    }
    const hoursPerMa = BALANCE.personal.stundenProMitarbeiter * w.motivation * w.kompetenz;
    const zielStunden = w.linien.length ? Math.max(Math.min(stundenBedarfWerk[i], kap[i] * 1.1), kap[i] * 0.6) : 0;
    const zielMa = Math.ceil(zielStunden / (hoursPerMa * 0.97)) + (w.linien.length ? 1 : 0);
    const diff = zielMa - w.mitarbeitende;
    e.personalAenderung = diff > 0 ? Math.min(diff, einstellungsLimit(w)) : diff < -3 ? Math.max(diff, -Math.floor(w.mitarbeitende * 0.2)) : 0;
    e.schulungProKopf = 500;
  });

  // Expansion
  if (opt.expansion) {
    const ex = { maerkteBetreten: [] as GameState['regionenReihenfolge'] & string[], produkteEinfuehren: [] as ProductId[], werkeBauen: [] as string[] };
    for (const r of ['EU', 'NA', 'AS', 'RW'] as const) {
      const reg = state.regionen[r];
      if (reg?.freigeschaltet && !reg.aktiv && reg.aktivSeit === undefined && kasse > REGIONEN[r].eintritt * 1.5) {
        ex.maerkteBetreten.push(r);
        kasse -= REGIONEN[r].eintritt;
      }
    }
    // Forschung: nacheinander die offenen Projekte finanzieren
    const reihenfolge = ['elektro', 'federung', 'lastenrahmen', 'emtb', 'leichtbau'];
    d.forschung = {};
    let projekte = 0;
    for (const id of reihenfolge) {
      const st = alleProjekte(state).find((x) => x.projekt.id === id)!;
      if (st.fertig || !st.offen || st.investiert >= st.projekt.kosten) continue;
      const budget = Math.min(st.projekt.kosten / st.projekt.mindestQuartale, st.projekt.kosten - st.investiert);
      if (kasse < budget + 400_000 || projekte >= (kasse > 5_000_000 ? 2 : 1)) break;
      d.forschung[id] = Math.round(budget);
      kasse -= budget;
      projekte++;
    }
    const u4 = state.kpiHistorie.slice(-4).reduce((s, k) => s + k.umsatz, 0);
    const alleHallenVoll = aktiveWerke.every((w) => w.linien.length >= hallenPlaetze(w));
    const imBau = state.werke.some((w) => w.status === 'bau');
    if (!imBau && alleHallenVoll && u4 > 30_000_000) {
      const reihenfolge = ['PL', 'MX', 'US', 'VN', 'BR', 'DE'];
      const code = reihenfolge.find((c) => werkBaubar(state, c).ok && kasse > WERK_STANDORTE[c].baukosten * 1.4);
      if (code) {
        ex.werkeBauen.push(code);
        kasse -= WERK_STANDORTE[code].baukosten;
      }
    }
    d.expansion = ex;
  }

  // Nachhaltigkeit (Voraussetzung für Nordamerika)
  d.nachhaltigkeitsbudget = Math.round(Math.max(20_000, umsatz * 0.008));

  // Liquidität
  const f = state.finanzen;
  if (kasse < 500_000) {
    const frei = Math.max(0, kreditlimit(state) - schuldenGesamt(f));
    d.finanzen.darlehenNeu = Math.min(Math.max(500_000, -kasse + 800_000), frei);
  }
  return d;
}
