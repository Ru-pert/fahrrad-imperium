import { BALANCE, START } from './config/balance';
import { KONKURRENTEN, KONKURRENT_BALANCE as KB } from './config/competitors';
import { LINIENTYPEN, PRODUKTE, PRODUKT_IDS, STARTPRODUKTE } from './config/products';
import { REGION_IDS } from './config/markets';
import { Rng } from './rng';
import type { GameState, Kredit, Linie, Schwierigkeit, Werk } from './types';
import { konkurrentProdukte, neuerKonkurrent, planKonkurrenten, profilVon, stueckHk } from './competitors';
import { startEntscheidungen } from './decisions';
import { baueBilanz } from './finance';
import { kalibriereSegment, referenzPreis, startVolumen, technikAusStock, type Anbieter } from './market';
import { herstellkosten, lernkurve } from './production';
import { saison } from './util';
import { erzeugeStartZeitung } from './zeitung';

export interface NeuesSpielOptionen {
  firmenname: string;
  farbe: string;
  schwierigkeit: Schwierigkeit;
  profi: boolean;
  seed: number;
}

export { SPIELER_ID } from './util';
import { SPIELER_ID } from './util';
export const STAND_VERSION = 1;

export function neuesSpiel(opt: NeuesSpielOptionen): GameState {
  const rng = new Rng(opt.seed);
  const sw = START.werk;
  const linien: Linie[] = sw.linien.map((l, i) => {
    const typ = LINIENTYPEN[l.typ];
    return {
      id: `${sw.id}-L${i + 1}`,
      typ: l.typ,
      status: 'aktiv',
      bauRest: 0,
      restlaufzeit: l.restlaufzeit,
      anschaffung: typ.preis,
      buchwert: (typ.preis * l.restlaufzeit) / typ.lebensdauer,
      verfuegbarkeit: 1,
      umweltindex: l.umwelt,
    };
  });
  const werk: Werk = {
    id: sw.id,
    name: sw.name,
    region: sw.region,
    lohnIndex: 1,
    gebaeudeBuchwert: sw.gebaeudeBuchwert,
    gebaeudeRestlaufzeit: sw.gebaeudeRestlaufzeit,
    linien,
    mitarbeitende: sw.mitarbeitende,
    motivation: START.motivation,
    kompetenz: START.kompetenz,
    wartung: sw.wartung,
  };

  const produkte: GameState['produkte'] = {};
  for (const p of STARTPRODUKTE) {
    const lk = lernkurve(START.kumProduktion);
    const hk = herstellkosten(p, werk, 1, lk).hk;
    produkte[p] = {
      freigeschaltet: true,
      fe: START.feStock,
      kumMenge: START.kumProduktion,
      lager: { stueck: START.lagerFertig, hk },
      materialSets: START.lagerMaterialSets,
      materialWert: START.lagerMaterialSets * PRODUKTE[p].material * BALANCE.produktion.materialFaktor * lk,
      letzteHk: hk,
    };
  }

  const kredit: Kredit = {
    id: 'K0',
    restbetrag: START.darlehen.betrag,
    tilgung: START.darlehen.betrag / START.darlehen.laufzeit,
    zins: START.darlehen.zins,
  };

  const konkurrenten: GameState['konkurrenten'] = {};
  for (const prof of KONKURRENTEN) konkurrenten[prof.id] = neuerKonkurrent(prof.id);

  const state: GameState = {
    version: STAND_VERSION,
    quartal: 0,
    rngState: 0,
    einstellungen: { schwierigkeit: opt.schwierigkeit, profi: opt.profi, seed: opt.seed },
    unternehmen: {
      name: opt.firmenname,
      rechtsform: 'GmbH',
      farbe: opt.farbe,
      image: START.image,
      nachhaltigkeit: START.nachhaltigkeit,
      umweltindex: 45.5,
      planungsqualitaet: START.planungsqualitaet,
      zufriedenheit: { stadtrad: START.zufriedenheit, ebike: START.zufriedenheit },
      vertrieb: { DE: START.vertriebDE },
      firmensitz: { stufe: 0, extras: [], buchwert: 0, anschaffung: 0 },
    },
    finanzen: {
      kasse: START.kasse,
      kontokorrent: 0,
      kredite: [kredit],
      forderungen: 0,
      verbindlichkeiten: 0,
      gezeichnetesKapital: START.gezeichnetesKapital,
      kapitalruecklage: 0,
      gewinnruecklagen: 0,
      verlustvortrag: 0,
      rating: 'A',
      ratingScore: 75,
      kritischZaehler: 0,
    },
    regionen: Object.fromEntries(
      REGION_IDS.map((r) => [r, r === 'DE' ? { aktiv: true, freigeschaltet: true, aktivSeit: 0, bekanntheit: START.bekanntheit, marktanteil: BALANCE.restmarkt.startAnteil } : { aktiv: false, freigeschaltet: false, bekanntheit: 0, marktanteil: 0 }]),
    ),
    regionenReihenfolge: ['DE'],
    produkteVerfuegbar: [],
    produkte,
    werke: [werk],
    markt: { DE: {} },
    konkurrenten,
    konkurrenzPlaene: {},
    konkurrenzVorquartal: {},
    spielerAnteilDelta: {},
    letzteEntscheidungen: startEntscheidungen(),
    ebitdaHistorie: [...START.historieEbitda],
    umsatzHistorie: [...START.historieUmsatz],
    ebitHistorie: START.historieEbitda.map((x) => x * 0.5),
    kpiHistorie: [],
    zinsen: { basiszins: BALANCE.finanzen.basiszins },
    spielende: null,
    ereignisse: [],
    euGesetz: false,
    zeitung: null,
    erfolge: [],
  };

  // Eröffnungsbilanz: Kapitalrücklage als Ausgleichsposten
  const bil = baueBilanz(state);
  state.finanzen.kapitalruecklage = bil.aktiva - bil.passiva;

  // Marktkalibrierung je Region und Segment. Der Spieler (bzw. ein gedachter Neuling mit Startwerten)
  // erhält 0,3 % Anteil; große Konkurrenten werden über ihre „Stärke“ auf ihren Zielanteil kalibriert.
  const eff = 1;
  const startUmsatzDE = 2_400_000;
  for (const r of REGION_IDS) {
    state.markt[r] = {};
    for (const p of PRODUKT_IDS) {
      const ref = referenzPreis(r, p);
      const v0 = startVolumen(r, p);
      const e = START.entscheidungen;
      const istStart = r === 'DE' && (p === 'stadtrad' || p === 'ebike');
      const spieler: Anbieter = {
        id: SPIELER_ID,
        preis: istStart ? e.preis[p as 'stadtrad' | 'ebike'] : ref,
        marketing: istStart ? e.marketing[p as 'stadtrad' | 'ebike'] : 0.35 * BALANCE.attraktivitaet.mStarAnteil * v0 * saison(0) * ref,
        bekanntheit: START.bekanntheit,
        technik: technikAusStock(START.feStock),
        qualitaet: 1,
        image: START.image,
        kapazitaet: 1e12,
      };
      const anbieter: Anbieter[] = [spieler];
      const ziele: Record<string, number> = {};
      for (const prof of KONKURRENTEN) {
        if (!prof.produkte.includes(p) || !prof.regionen.includes(r)) continue;
        const k = state.konkurrenten[prof.id];
        const ziel = prof.zielAnteil?.[r];
        const zielP = ziel !== undefined ? Math.min(0.45, ziel * (prof.fokus?.[p] ?? 1)) : undefined;
        if (zielP !== undefined) ziele[prof.id] = zielP;
        const umsatzErwartet = zielP !== undefined ? zielP * v0 * saison(0) * ref : startUmsatzDE * 0.5;
        anbieter.push({
          id: prof.id,
          preis: prof.preisFaktor * ref,
          marketing: Math.max(KB.mindestMarketing, prof.marketingAnteil * umsatzErwartet),
          bekanntheit: prof.start.bekanntheit[r] ?? 0.01,
          technik: technikAusStock(k.produkte[p]!.fe),
          qualitaet: k.qualitaet,
          image: k.image,
          kapazitaet: 1e12,
        });
      }
      const kal = kalibriereSegment(r, p, anbieter, SPIELER_ID, BALANCE.restmarkt.technikStart[p], BALANCE.restmarkt.startAnteil, ziele);
      // Der Spieler ist nur in DE mit seinen Startprodukten am Markt
      if (!istStart) {
        const { [SPIELER_ID]: _weg, ...rest } = kal.zustand.anteile;
        void _weg;
        kal.zustand.anteile = rest;
      }
      state.markt[r]![p] = kal.zustand;
      for (const a of anbieter) {
        if (a.id === SPIELER_ID) continue;
        const prof = profilVon(a.id);
        const k = state.konkurrenten[a.id];
        const pz = k.produkte[p]!;
        if (kal.staerke[a.id] !== undefined) k.staerke![`${r}:${p}`] = kal.staerke[a.id];
        const absatz = Math.round(((kal.ergebnis.nachfrage[a.id] ?? 0) * saison(-1)) / saison(0));
        pz.absatzR![r] = absatz;
        pz.preisR![r] = prof.preisFaktor * ref;
        pz.letzterAbsatz += absatz;
        k.letzterUmsatz += absatz * prof.preisFaktor * ref;
      }
    }
  }
  for (const prof of KONKURRENTEN) {
    const k = state.konkurrenten[prof.id];
    let stunden = 0;
    for (const p of konkurrentProdukte(k)) {
      const pz = k.produkte[p]!;
      pz.letzterPreis = pz.letzterAbsatz > 0 ? Object.entries(pz.absatzR ?? {}).reduce((s, [r, a]) => s + (a ?? 0) * (pz.preisR?.[r as keyof typeof pz.preisR] ?? 0), 0) / pz.letzterAbsatz : 0;
      pz.hk = stueckHk(k, p, pz.kumMenge, eff);
      pz.lager = Math.round(pz.letzterAbsatz * prof.start.lagerFaktor);
      stunden += pz.letzterAbsatz * 1.3 * PRODUKTE[p].montageStunden * lernkurve(pz.kumMenge);
    }
    if (prof.start.linien === undefined) k.linien = Math.max(2, Math.ceil((stunden / KB.linieStunden) * KB.startKapazitaetsReserve));
    k.bilanzsumme = k.kasse + k.linien * KB.linienKosten * 0.6;
    k.letztesEbit = k.letzterUmsatz * 0.05;
  }
  state.konkurrenzPlaene = planKonkurrenten(state, rng);
  state.konkurrenzVorquartal = structuredClone(state.konkurrenzPlaene);
  state.rngState = rng.getState();
  state.zeitung = erzeugeStartZeitung(state);
  return state;
}
