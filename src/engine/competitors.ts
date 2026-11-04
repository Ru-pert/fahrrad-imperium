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

export const profilVon = (id: string) => KONKURRENTEN.find((k) => k.id === id)!;
export const konkurrentProdukte = (k: KonkurrentZustand): ProductId[] => Object.keys(k.produkte) as ProductId[];
export const konkurrentRegionen = (k: KonkurrentZustand): RegionId[] => k.regionen ?? ['DE'];

function effizienzFaktor(state: GameState): number {
  // Leicht: Effizienz −10 % → Kosten höher; Schwer: +10 % → Kosten niedriger
  return 1 / (1 + BALANCE.schwierigkeit[state.einstellungen.schwierigkeit].effizienz);
}

export function stueckHk(k: KonkurrentZustand, p: ProductId, kum: number, effizienz: number): number {
  const lk = lernkurve(kum);
  const cfg = PRODUKTE[p];
  const material = cfg.material * BALANCE.produktion.materialFaktor * LIEFERANTEN[k.lieferant].kosten * lk;
  const lohn = cfg.montageStunden * lk * KB.lohnProStunde;
  return (material + lohn) * effizienz;
}

/** Entscheidungsregeln der Konkurrenz (9): Plan für das Quartal `state.quartal`, vor der Spielereingabe. */
export function planKonkurrenten(state: GameState, rng: Rng): Record<string, KonkurrentPlan> {
  const plaene: Record<string, KonkurrentPlan> = {};
  const t = state.quartal;
  const schwierig = BALANCE.schwierigkeit[state.einstellungen.schwierigkeit];
  const spielerJahresumsatz = state.kpiHistorie.slice(-4).reduce((s, k) => s + k.umsatz, 0);
  const spielerRegionen = (Object.keys(state.regionen) as RegionId[]).filter((r) => state.regionen[r]?.aktiv);
  for (const profil of KONKURRENTEN) {
    const k = state.konkurrenten[profil.id];
    if (!k || k.status === 'pleite') continue;
    const plan: KonkurrentPlan = { produkte: {}, neueLinien: 0 };
    const umsatzGesamt = Math.max(k.letzterUmsatz, 1);
    const reaktionAktiv = !profil.reaktionAbUmsatz || spielerJahresumsatz >= profil.reaktionAbUmsatz;
    for (const p of konkurrentProdukte(k)) {
      const pz = k.produkte[p]!;
      const eintrag: KonkurrentPlanProdukt = { preis: {}, marketing: {}, fe: 0, produktion: 0 };
      let prognoseGesamt = 0;
      let umsatzProdukt = 0;
      const wachstum = (1 + PRODUKTE[p].wachstum) * (saison(t) / saison(t - 1));
      for (const r of konkurrentRegionen(k)) {
        const mz = state.markt[r]?.[p];
        if (!mz) continue;
        const ref = referenzPreis(r, p);
        let preis = profil.preisFaktor * mz.durchschnittspreis * (1 + rng.range(-KB.rauschen, KB.rauschen));
        if (profil.preisSprung > 0) preis *= 1 + rng.range(-profil.preisSprung, profil.preisSprung);
        const delta = state.spielerAnteilDelta[p] ?? 0;
        const reagiert = rng.chance(clamp(profil.aggressivitaet * schwierig.reaktion, 0, 0.95));
        const senkung = rng.range(KB.senkungMin, KB.senkungMax);
        if (reaktionAktiv && delta > 0 && reagiert && spielerRegionen.includes(r)) preis *= 1 - senkung * (profil.reaktionAbUmsatz ? 1.5 : 1);
        eintrag.preis[r] = clamp(preis, 0.5 * ref, 3 * ref);

        const absatz = pz.absatzR?.[r] ?? 0;
        const umsatzR = absatz * (pz.preisR?.[r] ?? preis);
        umsatzProdukt += umsatzR;
        eintrag.marketing[r] = Math.max(KB.mindestMarketing, profil.marketingAnteil * umsatzR * (1 + rng.range(-KB.rauschen, KB.rauschen)));
        prognoseGesamt += absatz * wachstum;
      }
      eintrag.fe = Math.min(KB.feMaxProProdukt, profil.feAnteil * umsatzProdukt) * (1 + rng.range(-KB.rauschen, KB.rauschen));
      const prognose = prognoseGesamt * (1 + rng.range(-KB.rauschen, KB.rauschen));
      eintrag.produktion = Math.max(0, stk(prognose * KB.produktionsAufschlag - pz.lager));
      plan.produkte[p] = eintrag;
    }
    void umsatzGesamt;
    if (k.letzteAuslastung > KB.ausbauAuslastung && k.kasse > KB.linienKosten * (1.2 - 0.6 * profil.expansionsRisiko)) {
      // große Hersteller bauen proportional zu ihrer Größe aus
      plan.neueLinien = Math.max(1, Math.round(k.linien * 0.05));
    }
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
  for (const p of konkurrentProdukte(k)) {
    const pp = plan.produkte[p];
    const pz = k.produkte[p];
    if (pp && pz) noetig += pp.produktion * PRODUKTE[p].montageStunden * lernkurve(pz.kumMenge);
  }
  const faktor = noetig > kapazitaet && noetig > 0 ? kapazitaet / noetig : 1;
  const out: KonkurrentProduktion = { produziert: {}, kosten: 0, stunden: 0 };
  for (const p of konkurrentProdukte(k)) {
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

/** Angebot eines Konkurrenten in einem Segment; `kapazitaet` = noch verfügbares Lager */
export function konkurrentAnbieter(k: KonkurrentZustand, plan: KonkurrentPlan, p: ProductId, region: RegionId, verfuegbar: number): Anbieter | null {
  const pz = k.produkte[p];
  const pp = plan.produkte[p];
  if (!pz || !pp || k.status === 'pleite' || !konkurrentRegionen(k).includes(region)) return null;
  const preis = pp.preis[region];
  if (!preis) return null;
  return {
    id: k.id,
    preis,
    marketing: pp.marketing[region] ?? 0,
    bekanntheit: k.bekanntheit[region] ?? 0.01,
    technik: technikAusStock(pz.fe),
    qualitaet: k.qualitaet,
    image: k.image,
    kapazitaet: verfuegbar,
    staerke: k.staerke?.[`${region}:${p}`] ?? 1,
  };
}

export interface KonkurrentRegionErgebnis {
  absatz: Partial<Record<ProductId, number>>;
  preis: Partial<Record<ProductId, number>>;
  marketing: number;
  mStar: number;
  eigen: number;
  gesamt: number;
}

/** Vereinfachte Finanzrechnung und Zustandsfortschreibung eines Konkurrenten. */
export function buchungKonkurrent(
  k: KonkurrentZustand,
  plan: KonkurrentPlan,
  produktion: KonkurrentProduktion,
  regionen: Partial<Record<RegionId, KonkurrentRegionErgebnis>>,
): { umsatz: number; ebit: number } {
  let umsatz = 0;
  let cogs = 0;
  let marketing = 0;
  let fe = 0;
  for (const p of konkurrentProdukte(k)) {
    const pz = k.produkte[p]!;
    const pp = plan.produkte[p];
    if (!pp) continue;
    let verkauft = 0;
    let erloes = 0;
    pz.absatzR = {};
    pz.preisR = {};
    for (const [r, e] of Object.entries(regionen) as [RegionId, KonkurrentRegionErgebnis][]) {
      const a = Math.min(e.absatz[p] ?? 0, pz.lager - verkauft);
      if (a <= 0 && !(p in e.absatz)) continue;
      pz.absatzR[r] = a;
      pz.preisR[r] = e.preis[p] ?? 0;
      verkauft += a;
      erloes += a * (e.preis[p] ?? 0);
    }
    umsatz += erloes;
    cogs += verkauft * pz.hk;
    pz.lager -= verkauft;
    pz.letzterAbsatz = verkauft;
    pz.letzterPreis = verkauft > 0 ? erloes / verkauft : pz.letzterPreis;
    pz.letztesMarketing = Object.values(pp.marketing).reduce((s, x) => s + (x ?? 0), 0);
    pz.letzteProduktion = produktion.produziert[p] ?? 0;
    marketing += pz.letztesMarketing;
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
  if (plan.neueLinien > 0 && k.kasse > KB.linienKosten * plan.neueLinien) {
    k.linienImBau = plan.neueLinien;
    capex = plan.neueLinien * KB.linienKosten;
  }
  k.kasse += umsatz - produktion.kosten - logistik - marketing - fe - fix - steuer - capex;
  k.letzterUmsatz = umsatz;
  k.letztesEbit = ebit;
  const lagerWert = konkurrentProdukte(k).reduce((s, p) => s + k.produkte[p]!.lager * k.produkte[p]!.hk, 0);
  k.bilanzsumme = Math.max(0, k.kasse) + k.linien * KB.linienKosten * 0.6 + lagerWert;

  // Markenbekanntheit je Region (5.4)
  const B = BALANCE.marke;
  const profil = profilVon(k.id);
  for (const [r, e] of Object.entries(regionen) as [RegionId, KonkurrentRegionErgebnis][]) {
    // Etablierte Marken (kalibrierte Großhersteller) halten ihre Bekanntheit im Gleichgewicht
    if (profil.zielAnteil?.[r] !== undefined) continue;
    const b0 = k.bekanntheit[r] ?? 0.01;
    const verh = e.mStar > 0 ? e.marketing / e.mStar : 0;
    const anteil = e.gesamt > 0 ? e.eigen / e.gesamt : 0;
    k.bekanntheit[r] = clamp(b0 * (1 - B.vergessen) + (1 - b0) * (B.werbewirkung * (1 - Math.exp(-B.werbeSkala * verh)) + B.mundpropaganda * anteil), 0.001, 0.95);
  }
  if (k.kasse < 0) k.pleiteZaehler += 1;
  else k.pleiteZaehler = 0;
  if (k.pleiteZaehler >= KB.pleiteQuartale) k.status = 'pleite';
  return { umsatz, ebit };
}

export function neuerKonkurrent(profilId: string): KonkurrentZustand {
  const profil = profilVon(profilId);
  const gross = !!profil.zielAnteil;
  const produkte: Partial<Record<ProductId, KonkurrentProduktZustand>> = {};
  for (const p of profil.produkte) {
    produkte[p] = {
      fe: profil.start.feStock[p] ?? KB.feStockStandard,
      kumMenge: gross ? KB.startKumGross : KB.startKumProduktion,
      lager: 0,
      hk: 0,
      letzterAbsatz: 0,
      letzterPreis: 0,
      letztesMarketing: 0,
      letzteProduktion: 0,
      absatzR: {},
      preisR: {},
    };
  }
  return {
    id: profil.id,
    name: profil.name,
    farbe: profil.farbe,
    status: 'aktiv',
    pleiteZaehler: 0,
    kasse: profil.start.kasse,
    linien: profil.start.linien ?? 2,
    linienImBau: 0,
    produkte,
    bekanntheit: { ...profil.start.bekanntheit },
    image: profil.start.image,
    qualitaet: LIEFERANTEN[profil.lieferant].qualitaet,
    lieferant: profil.lieferant,
    letzterUmsatz: 0,
    letztesEbit: 0,
    letzteAuslastung: 0.7,
    bilanzsumme: 0,
    regionen: [...profil.regionen],
    staerke: {},
  };
}
