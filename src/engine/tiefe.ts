/**
 * Spieltiefe: Kundenzufriedenheit, Sonderabsatz-Angebote, Marktforschung & Spionage.
 * Reine Funktionen auf dem Spielzustand.
 */
import { BALANCE } from './config/balance';
import { PRODUKTE, PRODUKT_IDS } from './config/products';
import { REGION_IDS } from './config/markets';
import { AUSSCHREIBUNG, GROSSABNEHMER, MARKTFORSCHUNG, ZUFRIEDENHEIT } from './config/tiefe';
import { aktiveProdukte, komplexitaetsStufe } from './decisions';
import { Rng, hashSeed } from './rng';
import type { AngebotBericht, Ausschreibung, GameState, Grossabnehmer, MarktforschungKauf, ProductId, RegionId, SegmentBericht } from './types';

/** Kundenzufriedenheit (0–100) je Region und Produkt */
export function zufriedenheitVon(s: GameState, r: RegionId, p: ProductId): number {
  const z = s.unternehmen.zufriedenheit ?? {};
  return z[`${r}:${p}`] ?? z[p] ?? ZUFRIEDENHEIT.start;
}

/** Kosten der gekauften Marktforschung (nur gültige Positionen) */
export function marktforschungKosten(s: GameState, mf: MarktforschungKauf): number {
  const M = MARKTFORSCHUNG;
  const regionen = (x?: RegionId[]) => [...new Set(x ?? [])].filter((r) => REGION_IDS.includes(r)).length;
  const spione = [...new Set(mf.spionage ?? [])].filter((id) => s.konkurrenten[id]?.status === 'aktiv').length;
  return regionen(mf.marktbericht) * M.marktbericht.preis + regionen(mf.branchenanalyse) * M.branchenanalyse.preis + (mf.kundenbefragung ? M.kundenbefragung.preis : 0) + spione * M.spionage.preis;
}

const angebotsId = (prefix: string, quartal: number, n: number) => `${prefix}-${2027 + Math.floor(quartal / 4)}Q${(quartal % 4) + 1}-${n}`;
const runde = (x: number, auf: number) => Math.max(auf, Math.round(x / auf) * auf);

/** Erzeugt Großabnehmer-Angebote und Ausschreibungen für das (bereits fortgeschriebene) Quartal s.quartal */
export function generiereAngebote(s: GameState, rng: Rng, segmente: SegmentBericht[], angebote: AngebotBericht[]): NonNullable<GameState['angebote']> {
  const out: NonNullable<GameState['angebote']> = { grossabnehmer: [], ausschreibungen: [] };
  const stufe = komplexitaetsStufe(s);
  const produkte = aktiveProdukte(s).filter((p) => s.produkte[p]?.status !== 'vorlauf');
  const regionen = REGION_IDS.filter((r) => s.regionen[r]?.aktiv);
  if (!produkte.length || !regionen.length || stufe < 2) return out;
  const pBar = (r: RegionId, p: ProductId) => segmente.find((x) => x.region === r && x.produkt === p)?.durchschnittspreis ?? s.markt[r]?.[p]?.durchschnittspreis ?? PRODUKTE[p].referenzpreis;
  const G = GROSSABNEHMER;
  let n = 1;
  for (const r of regionen) {
    for (let i = 0; i < G.maxJeRegion; i++) {
      if (!rng.chance(G.wahrscheinlichkeit)) continue;
      const p = produkte[Math.floor(rng.next() * produkte.length)];
      const absatz = angebote.filter((a) => a.produkt === p && a.region === r).reduce((x, a) => x + a.absatz, 0);
      const g: Grossabnehmer = {
        id: angebotsId('GA', s.quartal, n++),
        kunde: G.kunden[Math.floor(rng.next() * G.kunden.length)],
        region: r,
        produkt: p,
        preis: Math.round(pBar(r, p) * rng.range(G.preisMin, G.preisMax)),
        hoechstmenge: runde(Math.max(G.mindestMenge, absatz * rng.range(G.mengeMin, G.mengeMax)), 10),
      };
      out.grossabnehmer.push(g);
    }
  }
  const A = AUSSCHREIBUNG;
  if (stufe >= 3 && rng.chance(A.wahrscheinlichkeit)) {
    const r = regionen[Math.floor(rng.next() * regionen.length)];
    const p = produkte[Math.floor(rng.next() * produkte.length)];
    const a: Ausschreibung = {
      id: angebotsId('AS', s.quartal, 1),
      behoerde: A.behoerden[Math.floor(rng.next() * A.behoerden.length)],
      region: r,
      produkt: p,
      menge: runde(rng.range(A.mengeMin, A.mengeMax), 50),
      minTechnikindex: Math.round(rng.range(A.minTechnikMin, A.minTechnikMax)),
      konkurrenzGebot: Math.round(pBar(r, p) * rng.range(A.konkurrenzMin, A.konkurrenzMax)),
    };
    out.ausschreibungen.push(a);
  }
  return out;
}

// ---------------------------------------------------------------- Marktforschung

/** Geschätzter Wert mit multiplikativem Rauschen; deterministisch je Quartal und Bericht */
function rauschen(s: GameState, schluessel: string) {
  const rng = new Rng(hashSeed(`${s.einstellungen.seed}|${s.quartal}|${schluessel}`));
  return (wert: number, sigma: number) => {
    const x = Math.max(0, wert * (1 + sigma * rng.normal()));
    return x >= 100 ? Math.round(x) : Math.round(x * 10_000) / 10_000;
  };
}

const anbieterName = (s: GameState, id: string) => (id === 'rest' ? 'Restmarkt (kleine Anbieter)' : id === 'spieler' || id === '__spieler' ? s.unternehmen.name : s.konkurrenten[id]?.name ?? s.unternehmen.name);

export interface MarktberichtAkte {
  art: 'marktbericht';
  region: RegionId;
  genauigkeit: { anteile: number; preise: number };
  segmente: { produkt: ProductId; volumen: number; durchschnittspreis: number; anteile: { id: string; name: string; anteil: number }[] }[];
}

export function marktbericht(s: GameState, r: RegionId): MarktberichtAkte {
  const M = MARKTFORSCHUNG.marktbericht;
  const z = rauschen(s, `mb-${r}`);
  const segmente = PRODUKT_IDS.flatMap((p) => {
    const m = s.markt[r]?.[p];
    if (!m) return [];
    const roh = Object.entries(m.anteile).map(([id, a]) => ({ id, name: anbieterName(s, id), anteil: z(a, M.sigmaAnteile) }));
    const summe = roh.reduce((x, a) => x + a.anteil, 0) || 1;
    return [{ produkt: p, volumen: z(m.volumen, M.sigmaAnteile / 2), durchschnittspreis: z(m.durchschnittspreis, M.sigmaPreise), anteile: roh.map((a) => ({ ...a, anteil: Math.round((a.anteil / summe) * 100_000) / 100_000 })).sort((a, b) => b.anteil - a.anteil) }];
  });
  return { art: 'marktbericht', region: r, genauigkeit: { anteile: M.sigmaAnteile, preise: M.sigmaPreise }, segmente };
}

export interface BranchenanalyseAkte {
  art: 'branchenanalyse';
  region: RegionId;
  genauigkeit: { preise: number; budgets: number };
  konkurrenten: { id: string; name: string; farbe: string; bekanntheit: number; produkte: { produkt: ProductId; preis: number; marketing: number; fe: number; kapazitaet: number }[] }[];
}

export function branchenanalyse(s: GameState, r: RegionId): BranchenanalyseAkte {
  const M = MARKTFORSCHUNG.branchenanalyse;
  const z = rauschen(s, `ba-${r}`);
  const konkurrenten = Object.values(s.konkurrenten)
    .filter((k) => k.status === 'aktiv')
    .flatMap((k) => {
      const plan = s.konkurrenzVorquartal?.[k.id];
      if (!plan) return [];
      const produkte = PRODUKT_IDS.flatMap((p) => {
        const pp = plan.produkte[p];
        const preis = pp?.preis[r] ?? 0;
        if (!pp || !(preis > 0)) return [];
        return [{ produkt: p, preis: z(preis, M.sigmaPreise), marketing: z(pp.marketing[r] ?? 0, M.sigmaBudgets), fe: z(pp.fe, M.sigmaBudgets), kapazitaet: z(pp.produktion, M.sigmaBudgets) }];
      });
      if (!produkte.length) return [];
      return [{ id: k.id, name: k.name, farbe: k.farbe, bekanntheit: z(k.bekanntheit[r] ?? 0, M.sigmaBudgets), produkte }];
    });
  return { art: 'branchenanalyse', region: r, genauigkeit: { preise: M.sigmaPreise, budgets: M.sigmaBudgets }, konkurrenten };
}

export interface KundenbefragungAkte {
  art: 'kundenbefragung';
  genauigkeit: number;
  segmente: { produkt: ProductId; preis: number; marketing: number; technik: number; zufriedenheit: { region: RegionId; wert: number }[] }[];
}

/** Sensitivitäten als Index (100 = durchschnittlich) und eigene Zufriedenheit je Markt */
export function kundenbefragung(s: GameState): KundenbefragungAkte {
  const sigma = MARKTFORSCHUNG.kundenbefragung.sigma;
  const z = rauschen(s, 'kb');
  const mittel = (f: (p: ProductId) => number) => PRODUKT_IDS.reduce((x, p) => x + f(p), 0) / PRODUKT_IDS.length;
  const epsM = mittel((p) => PRODUKTE[p].epsilon);
  const tauM = mittel((p) => PRODUKTE[p].tau);
  const regionen = REGION_IDS.filter((r) => s.regionen[r]?.aktiv);
  const segmente = aktiveProdukte(s).map((p) => ({
    produkt: p,
    preis: z((100 * PRODUKTE[p].epsilon) / epsM, sigma),
    // Marketing wirkt dort stärker, wo der Preis weniger zählt
    marketing: z(100 * BALANCE.attraktivitaet.mu * Math.sqrt(epsM / PRODUKTE[p].epsilon), sigma),
    technik: z((100 * PRODUKTE[p].tau) / tauM, sigma),
    zufriedenheit: regionen.map((r) => ({ region: r, wert: Math.min(100, z(zufriedenheitVon(s, r, p), sigma / 2)) })),
  }));
  return { art: 'kundenbefragung', genauigkeit: sigma, segmente };
}

export interface SpionageAkte {
  art: 'spionage';
  konkurrent: string;
  name: string;
  farbe: string;
  neueLinien: number;
  produkte: { produkt: ProductId; preise: Partial<Record<RegionId, number>>; marketing: Partial<Record<RegionId, number>>; fe: number; produktion: number }[];
}

/** Die für das laufende Quartal geplanten Entscheidungen eines Konkurrenten (exakt) */
export function spionageAkte(s: GameState, id: string): SpionageAkte | null {
  const k = s.konkurrenten[id];
  const plan = s.konkurrenzPlaene?.[id];
  if (!k || !plan) return null;
  const rabatt = (s.rache?.[id] ?? -1) >= s.quartal ? 1 - MARKTFORSCHUNG.spionage.racheRabatt : 1;
  const produkte = PRODUKT_IDS.flatMap((p) => {
    const pp = plan.produkte[p];
    if (!pp) return [];
    const preise = Object.fromEntries(Object.entries(pp.preis).filter(([, v]) => (v ?? 0) > 0).map(([r, v]) => [r, Math.round((v ?? 0) * rabatt)])) as Partial<Record<RegionId, number>>;
    const marketing = Object.fromEntries(Object.entries(pp.marketing).map(([r, v]) => [r, Math.round(v ?? 0)])) as Partial<Record<RegionId, number>>;
    return [{ produkt: p, preise, marketing, fe: Math.round(pp.fe), produktion: Math.round(pp.produktion) }];
  });
  return { art: 'spionage', konkurrent: id, name: k.name, farbe: k.farbe, neueLinien: plan.neueLinien, produkte };
}

/** Entdeckungsrisiko für die nächste Spionage */
export function spionageRisiko(s: GameState, zusaetzlich = 0): number {
  const M = MARKTFORSCHUNG.spionage;
  const frueher = (s.spionageQuartale ?? []).filter((q) => q >= s.quartal - 4).length + zusaetzlich;
  return M.grundrisiko + M.jeWeitere * frueher + (s.einstellungen.schwierigkeit === 'schwer' ? M.schwerZuschlag : 0);
}
