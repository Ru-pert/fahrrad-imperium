import { BALANCE } from './config/balance';
import { KONKURRENT_BALANCE as KB, KONKURRENTEN } from './config/competitors';
import { LIEFERANTEN, PRODUKTE } from './config/products';
import type {
  GameState,
  KonkurrentPlan,
  KonkurrentPlanProdukt,
  KonkurrentProduktZustand,
  KonkurrentZustand,
  ProductId,
  RegionId,
} from './types';
import type { Rng } from './rng';
import type { Anbieter } from './market';
import { referenzPreis, technikAusStock } from './market';
import { lernkurve } from './production';
import { clamp, saison, stk } from './util';

/** Segmente, in denen Konkurrenten in Stufe 1 aktiv sind. */
export const KONKURRENZ_PRODUKTE: ProductId[] = ['stadtrad', 'ebike'];

export const profilVon = (id: string) => KONKURRENTEN.find((k) => k.id === id)!;

function effizienzFaktor(state: GameState): number {
  // Leicht: Effizienz −10 % → Kosten höher; Schwer: +10 % → Kosten niedriger
  return 1 / (1 + BALANCE.schwierigkeit[state.einstellungen.schwierigkeit].effizienz);
}

export function stueckHk(k: KonkurrentZustand, p: ProductId, kum: number, effizienz: number): number {
  const lk = lernkurve(kum);
  const cfg = PRODUKTE[p];
  const material = cfg.material * LIEFERANTEN[k.lieferant].kosten * lk;
  const lohn = cfg.montageStunden * lk * KB.lohnProStunde;
  return (material + lohn) * effizienz;
}

/** Entscheidungsregeln der Konkurrenz (9): Plan für das Quartal `state.quartal`, vor der Spielereingabe. */
export function planKonkurrenten(state: GameState, rng: Rng): Record<string, KonkurrentPlan> {
  const plaene: Record<string, KonkurrentPlan> = {};
  const t = state.quartal;
  const schwierig = BALANCE.schwierigkeit[state.einstellungen.schwierigkeit];
  for (const profil of KONKURRENTEN) {
    const k = state.konkurrenten[profil.id];
    if (!k || k.status === 'pleite') continue;
    const plan: KonkurrentPlan = { produkte: {}, neueLinien: 0 };
    const umsatzGesamt = Math.max(k.letzterUmsatz, 1);
    for (const p of KONKURRENZ_PRODUKTE) {
      const pz = k.produkte[p];
      const mz = state.markt.DE?.[p];
      if (!pz || !mz) continue;
      const ref = referenzPreis('DE', p);
      let preis = profil.preisFaktor * mz.durchschnittspreis * (1 + rng.range(-KB.rauschen, KB.rauschen));
      if (profil.preisSprung > 0) preis *= 1 + rng.range(-profil.preisSprung, profil.preisSprung);
      const delta = state.spielerAnteilDelta[p] ?? 0;
      const reagiert = rng.chance(clamp(profil.aggressivitaet * schwierig.reaktion, 0, 0.95));
      const senkung = rng.range(KB.senkungMin, KB.senkungMax);
      if (delta > 0 && reagiert) preis *= 1 - senkung;
      preis = clamp(preis, 0.5 * ref, 3 * ref);

      const umsatzProdukt = Math.max(pz.letzterAbsatz * pz.letzterPreis, 1);
      const anteilUmsatz = umsatzProdukt / umsatzGesamt;
      const marketing = Math.max(KB.mindestMarketing, profil.marketingAnteil * umsatzGesamt * profil.start.marketingSplit[p] * (1 + rng.range(-KB.rauschen, KB.rauschen)));
      const fe = profil.feAnteil * umsatzGesamt * clamp(anteilUmsatz, 0, 1) * (1 + rng.range(-KB.rauschen, KB.rauschen));

      const wachstum = (1 + PRODUKTE[p].wachstum) * (saison(t) / saison(t - 1));
      const prognose = pz.letzterAbsatz * wachstum * (1 + rng.range(-KB.rauschen, KB.rauschen));
      const produktion = Math.max(0, stk(prognose * KB.produktionsAufschlag - pz.lager));
      const eintrag: KonkurrentPlanProdukt = { preis: { DE: preis }, marketing: { DE: marketing }, fe, produktion };
      plan.produkte[p] = eintrag;
    }
    if (k.letzteAuslastung > KB.ausbauAuslastung && k.kasse > KB.linienKosten * (1.2 - 0.6 * profil.expansionsRisiko)) plan.neueLinien = 1;
    plaene[profil.id] = plan;
  }
  return plaene;
}

export interface KonkurrentProduktion {
  produziert: Partial<Record<ProductId, number>>;
  kosten: number;
  stunden: number;
}

/** Produktion eines Konkurrenten nach Plan; begrenzt durch die Linienkapazität. Verändert Lager und Erfahrung. */
export function produziereKonkurrent(state: GameState, k: KonkurrentZustand, plan: KonkurrentPlan): KonkurrentProduktion {
  const eff = effizienzFaktor(state);
  const kapazitaet = k.linien * KB.linieStunden;
  let noetig = 0;
  for (const p of KONKURRENZ_PRODUKTE) {
    const pp = plan.produkte[p];
    const pz = k.produkte[p];
    if (pp && pz) noetig += pp.produktion * PRODUKTE[p].montageStunden * lernkurve(pz.kumMenge);
  }
  const faktor = noetig > kapazitaet && noetig > 0 ? kapazitaet / noetig : 1;
  const out: KonkurrentProduktion = { produziert: {}, kosten: 0, stunden: 0 };
  for (const p of KONKURRENZ_PRODUKTE) {
    const pp = plan.produkte[p];
    const pz = k.produkte[p];
    if (!pp || !pz) continue;
    const menge = Math.floor(pp.produktion * faktor);
    const hk = stueckHk(k, p, pz.kumMenge, eff);
    const neuLager = pz.lager + menge;
    pz.hk = neuLager > 0 ? (pz.lager * pz.hk + menge * hk) / neuLager : hk;
    pz.lager = neuLager;
    pz.kumMenge += menge;
    out.produziert[p] = menge;
    out.kosten += menge * hk;
    out.stunden += menge * PRODUKTE[p].montageStunden * lernkurve(pz.kumMenge);
  }
  k.letzteAuslastung = kapazitaet > 0 ? Math.min(1.2, out.stunden / kapazitaet) : 0;
  return out;
}

export function konkurrentAnbieter(k: KonkurrentZustand, plan: KonkurrentPlan, p: ProductId, region: RegionId): Anbieter | null {
  const pz = k.produkte[p];
  const pp = plan.produkte[p];
  if (!pz || !pp || k.status === 'pleite') return null;
  return {
    id: k.id,
    preis: pp.preis[region] ?? 0,
    marketing: pp.marketing[region] ?? 0,
    bekanntheit: k.bekanntheit[region] ?? 0.01,
    technik: technikAusStock(pz.fe),
    qualitaet: k.qualitaet,
    image: k.image,
    kapazitaet: pz.lager,
  };
}

export interface KonkurrentErgebnis {
  umsatz: number;
  ebit: number;
}

/** Vereinfachte Finanzrechnung und Zustandsfortschreibung eines Konkurrenten. */
export function buchungKonkurrent(
  k: KonkurrentZustand,
  plan: KonkurrentPlan,
  produktion: KonkurrentProduktion,
  absatz: Partial<Record<ProductId, number>>,
  anteilRegion: number,
  mStarVerhaeltnis: number,
): KonkurrentErgebnis {
  let umsatz = 0;
  let cogs = 0;
  let marketing = 0;
  let fe = 0;
  for (const p of KONKURRENZ_PRODUKTE) {
    const pz = k.produkte[p];
    const pp = plan.produkte[p];
    if (!pz || !pp) continue;
    const verkauft = Math.min(absatz[p] ?? 0, pz.lager);
    const preis = pp.preis.DE ?? 0;
    umsatz += verkauft * preis;
    cogs += verkauft * pz.hk;
    pz.lager -= verkauft;
    pz.letzterAbsatz = verkauft;
    pz.letzterPreis = preis;
    pz.letztesMarketing = pp.marketing.DE ?? 0;
    pz.letzteProduktion = produktion.produziert[p] ?? 0;
    marketing += pp.marketing.DE ?? 0;
    fe += pp.fe;
    pz.fe = (1 - BALANCE.technik.veralterung) * pz.fe + pp.fe;
  }
  const logistik = BALANCE.logistik.innerhalb * umsatz;
  const fix = k.linien * KB.fixkostenProLinie;
  const ebit = umsatz - cogs - logistik - marketing - fe - fix;
  const steuer = Math.max(0, ebit) * KB.steuersatz;
  let capex = 0;
  k.linien += k.linienImBau;
  k.linienImBau = 0;
  if (plan.neueLinien > 0 && k.kasse > KB.linienKosten) {
    k.linienImBau = plan.neueLinien;
    capex = plan.neueLinien * KB.linienKosten;
  }
  k.kasse += umsatz - produktion.kosten - logistik - marketing - fe - fix - steuer - capex;
  k.letzterUmsatz = umsatz;
  k.letztesEbit = ebit;
  const lagerWert = KONKURRENZ_PRODUKTE.reduce((s, p) => s + (k.produkte[p] ? k.produkte[p]!.lager * k.produkte[p]!.hk : 0), 0);
  k.bilanzsumme = Math.max(0, k.kasse) + k.linien * KB.linienKosten * 0.6 + lagerWert;

  // Markenbekanntheit (5.4)
  const B = BALANCE.marke;
  const b0 = k.bekanntheit.DE ?? 0.01;
  k.bekanntheit.DE = clamp(
    b0 * (1 - B.vergessen) + (1 - b0) * (B.werbewirkung * (1 - Math.exp(-B.werbeSkala * mStarVerhaeltnis)) + B.mundpropaganda * anteilRegion),
    0.001,
    0.95,
  );
  if (k.kasse < 0) k.pleiteZaehler += 1;
  else k.pleiteZaehler = 0;
  if (k.pleiteZaehler >= KB.pleiteQuartale) k.status = 'pleite';
  return { umsatz, ebit };
}

export function neuerKonkurrent(profilId: string): KonkurrentZustand {
  const profil = profilVon(profilId);
  const produkte: Partial<Record<ProductId, KonkurrentProduktZustand>> = {};
  for (const p of KONKURRENZ_PRODUKTE) {
    produkte[p] = {
      fe: profil.start.feStock[p],
      kumMenge: KB.startKumProduktion,
      lager: 0,
      hk: 0,
      letzterAbsatz: 0,
      letzterPreis: 0,
      letztesMarketing: 0,
      letzteProduktion: 0,
    };
  }
  return {
    id: profil.id,
    name: profil.name,
    farbe: profil.farbe,
    status: 'aktiv',
    pleiteZaehler: 0,
    kasse: profil.start.kasse,
    linien: profil.start.linien,
    linienImBau: 0,
    produkte,
    bekanntheit: { [profil.heimat]: profil.start.bekanntheit },
    image: profil.start.image,
    qualitaet: LIEFERANTEN[profil.lieferant].qualitaet,
    lieferant: profil.lieferant,
    letzterUmsatz: 0,
    letztesEbit: 0,
    letzteAuslastung: 0.7,
    bilanzsumme: 0,
  };
}
