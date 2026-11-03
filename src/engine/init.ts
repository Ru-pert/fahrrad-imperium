import { BALANCE, START } from './config/balance';
import { KONKURRENTEN, KONKURRENT_BALANCE as KB } from './config/competitors';
import { LINIENTYPEN, PRODUKTE, STARTPRODUKTE } from './config/products';
import { Rng } from './rng';
import type { GameState, Kredit, Linie, Schwierigkeit, Werk } from './types';
import { KONKURRENZ_PRODUKTE, neuerKonkurrent, planKonkurrenten, profilVon, stueckHk } from './competitors';
import { startEntscheidungen } from './decisions';
import { baueBilanz } from './finance';
import { kalibriereSegment, referenzPreis, technikAusStock } from './market';
import { herstellkosten, lernkurve } from './production';
import { saison } from './util';

export interface NeuesSpielOptionen {
  firmenname: string;
  farbe: string;
  schwierigkeit: Schwierigkeit;
  profi: boolean;
  seed: number;
}

export const SPIELER_ID = 'spieler';
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
      materialWert: START.lagerMaterialSets * PRODUKTE[p].material * lk,
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
    regionen: { DE: { aktiv: true, bekanntheit: START.bekanntheit, marktanteil: BALANCE.restmarkt.startAnteil } },
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
  };

  // Eröffnungsbilanz: Kapitalrücklage als Ausgleichsposten
  const bil = baueBilanz(state);
  state.finanzen.kapitalruecklage = bil.aktiva - bil.passiva;

  // Marktkalibrierung je Segment
  const eff = 1;
  const startUmsatz = 2_400_000;
  for (const p of STARTPRODUKTE) {
    const ref = referenzPreis('DE', p);
    const e = START.entscheidungen;
    const anbieter = [
      {
        id: SPIELER_ID,
        preis: e.preis[p as 'stadtrad' | 'ebike'],
        marketing: e.marketing[p as 'stadtrad' | 'ebike'],
        bekanntheit: START.bekanntheit,
        technik: technikAusStock(START.feStock),
        qualitaet: 1,
        image: START.image,
        kapazitaet: 1e12,
      },
      ...KONKURRENTEN.map((prof) => {
        const k = state.konkurrenten[prof.id];
        return {
          id: prof.id,
          preis: prof.preisFaktor * ref,
          marketing: Math.max(KB.mindestMarketing, prof.marketingAnteil * startUmsatz * prof.start.marketingSplit[p]),
          bekanntheit: prof.start.bekanntheit,
          technik: technikAusStock(k.produkte[p]!.fe),
          qualitaet: k.qualitaet,
          image: k.image,
          kapazitaet: 1e12,
        };
      }),
    ];
    const kal = kalibriereSegment('DE', p, anbieter, SPIELER_ID, BALANCE.restmarkt.technikStart[p], BALANCE.restmarkt.startAnteil);
    state.markt.DE![p] = kal.zustand;
    for (const prof of KONKURRENTEN) {
      const k = state.konkurrenten[prof.id];
      const pz = k.produkte[p]!;
      const nachfrage = kal.ergebnis.nachfrage[prof.id] ?? 0;
      pz.letzterAbsatz = Math.round((nachfrage * saison(-1)) / saison(0));
      pz.letzterPreis = prof.preisFaktor * ref;
      pz.letztesMarketing = anbieter.find((x) => x.id === prof.id)!.marketing;
      pz.hk = stueckHk(k, p, pz.kumMenge, eff);
      pz.lager = Math.round(pz.letzterAbsatz * profilVon(prof.id).start.lagerFaktor);
      k.letzterUmsatz += pz.letzterAbsatz * pz.letzterPreis;
    }
  }
  for (const prof of KONKURRENTEN) {
    const k = state.konkurrenten[prof.id];
    k.bilanzsumme = k.kasse + k.linien * KB.linienKosten * 0.6;
    k.letztesEbit = k.letzterUmsatz * 0.05;
  }
  void KONKURRENZ_PRODUKTE;
  state.konkurrenzPlaene = planKonkurrenten(state, rng);
  state.konkurrenzVorquartal = structuredClone(state.konkurrenzPlaene);
  state.rngState = rng.getState();
  return state;
}
