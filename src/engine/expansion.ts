/**
 * Expansion (Abschnitt 8): Freischaltung von Regionen und Produkten über Meilensteine,
 * Markteintritt, Produkteinführung und Werksbau.
 */
import { BALANCE } from './config/balance';
import { PRODUKTE, PRODUKT_IDS } from './config/products';
import { REGIONEN, REGION_IDS, WERK_STANDORTE } from './config/markets';
import { herstellkosten, lernkurve } from './production';
import { technikAusStock } from './market';
import type { Decisions, GameState, ProductId, RegionId, Werk } from './types';

export interface Bedingung {
  text: string;
  ist: number;
  ziel: number;
  einheit: 'eur' | 'prozent' | 'punkte' | 'anzahl' | 'ja';
  erfuellt: boolean;
}

export const EXPANSION = {
  produktEinfuehrung: 500_000,
  produktVorlauf: 1,
  /** F&E-Stock eines neuen Produkts = 50 % der Einführungskosten */
  produktFeStart: 250_000,
  produktKumStart: 1000,
  markteintrittBekanntheit: 0.01,
  markteintrittAnteilHoechste: 0.1,
  /** Mindest-Einstellungslimit für neue oder kleine Werke */
  mindestEinstellung: 20,
};

const umsatz4Q = (s: GameState) => s.kpiHistorie.slice(-4).reduce((a, k) => a + k.umsatz, 0);
const anteilDE = (s: GameState) => s.kpiHistorie[s.kpiHistorie.length - 1]?.marktanteil ?? 0;
const werkAusserhalbDE = (s: GameState) => s.werke.some((w) => w.region !== 'DE' && (w.status ?? 'aktiv') === 'aktiv');

/** Meilenstein-Bedingungen einer Region */
export function regionBedingungen(s: GameState, r: RegionId): Bedingung[] {
  const u = umsatz4Q(s);
  const b = (text: string, ist: number, ziel: number, einheit: Bedingung['einheit']): Bedingung => ({ text, ist, ziel, einheit, erfuellt: ist >= ziel });
  switch (r) {
    case 'EU':
      return [b('Umsatz der letzten 4 Quartale', u, 10_000_000, 'eur'), b('Marktanteil Deutschland', anteilDE(s), 0.01, 'prozent')];
    case 'NA':
      return [b('Umsatz der letzten 4 Quartale', u, 60_000_000, 'eur'), b('Nachhaltigkeit', s.unternehmen.nachhaltigkeit, 45, 'punkte')];
    case 'AS':
      return [b('Umsatz der letzten 4 Quartale', u, 250_000_000, 'eur'), b('Werk außerhalb Deutschlands', werkAusserhalbDE(s) ? 1 : 0, 1, 'ja')];
    case 'RW':
      return [b('Umsatz der letzten 4 Quartale', u, 1_000_000_000, 'eur')];
    default:
      return [];
  }
}

/** Freischalt-Bedingungen eines Produkts (Abschnitt 3) */
export function produktBedingungen(s: GameState, p: ProductId): Bedingung[] {
  const b = (text: string, ist: number, ziel: number, einheit: Bedingung['einheit']): Bedingung => ({ text, ist, ziel, einheit, erfuellt: ist >= ziel });
  switch (p) {
    case 'mountainbike': {
      const fe = Object.values(s.produkte).reduce((a, x) => a + (x?.fe ?? 0), 0);
      return [b('F&E-Gesamtstock', fe, 1_000_000, 'eur')];
    }
    case 'lastenrad':
      return [b('Umsatz der letzten 4 Quartale', umsatz4Q(s), 15_000_000, 'eur')];
    case 'rennrad':
      return [b('Europa freigeschaltet', s.regionen.EU?.freigeschaltet ? 1 : 0, 1, 'ja')];
    case 'emtb': {
      const eb = s.produkte.ebike;
      const vorsprung = eb ? technikAusStock(eb.fe) - (s.markt.DE?.ebike?.tBar ?? 0) : 0;
      return [b('E-Bike-Technik über Marktdurchschnitt', vorsprung, 0.5, 'punkte')];
    }
    default:
      return [];
  }
}

/** Prüft nach dem Quartal, ob neue Regionen oder Produkte freigeschaltet werden. */
export function pruefeFreischaltungen(s: GameState): { art: 'region' | 'produkt'; id: string }[] {
  const neu: { art: 'region' | 'produkt'; id: string }[] = [];
  for (const r of REGION_IDS) {
    const reg = s.regionen[r];
    if (!reg || reg.freigeschaltet) continue;
    const bed = regionBedingungen(s, r);
    if (bed.length && bed.every((x) => x.erfuellt)) {
      reg.freigeschaltet = true;
      neu.push({ art: 'region', id: r });
    }
  }
  s.produkteVerfuegbar ??= [];
  for (const p of PRODUKT_IDS) {
    if (s.produkte[p] || s.produkteVerfuegbar.includes(p)) continue;
    const bed = produktBedingungen(s, p);
    if (bed.length && bed.every((x) => x.erfuellt)) {
      s.produkteVerfuegbar.push(p);
      neu.push({ art: 'produkt', id: p });
    }
  }
  return neu;
}

export function werkBaubar(s: GameState, code: string): { ok: boolean; grund?: string } {
  const st = WERK_STANDORTE[code];
  if (!st) return { ok: false, grund: 'Unbekannter Standort' };
  if (code !== 'DE' && s.werke.some((w) => w.standort === code)) return { ok: false, grund: 'Hier steht bereits ein Werk' };
  if (st.braucht && !s.regionen[st.braucht]?.freigeschaltet) return { ok: false, grund: `Erst nach Freischaltung von ${REGIONEN[st.braucht].name}` };
  return { ok: true };
}

/** Prüft Expansionsentscheidungen und gibt die gültigen zurück. */
export function normalisiereExpansion(s: GameState, dec: Decisions, warn: string[]): NonNullable<Decisions['expansion']> {
  const e = dec.expansion ?? { maerkteBetreten: [], produkteEinfuehren: [], werkeBauen: [] };
  const maerkte = [...new Set(e.maerkteBetreten ?? [])].filter((r) => {
    const reg = s.regionen[r];
    if (!reg) return false;
    if (reg.aktiv) return false;
    if (!reg.freigeschaltet) {
      warn.push(`${REGIONEN[r].name} ist noch nicht freigeschaltet.`);
      return false;
    }
    return true;
  });
  const produkte = [...new Set(e.produkteEinfuehren ?? [])].filter((p) => {
    if (s.produkte[p]) return false;
    if (!(s.produkteVerfuegbar ?? []).includes(p)) {
      warn.push(`${PRODUKTE[p].name} ist noch nicht freigeschaltet.`);
      return false;
    }
    return true;
  });
  const werke: string[] = [];
  for (const code of e.werkeBauen ?? []) {
    const ok = werkBaubar(s, code);
    if (!ok.ok || (code !== 'DE' && werke.includes(code))) {
      if (ok.grund) warn.push(`Werk ${WERK_STANDORTE[code]?.name ?? code}: ${ok.grund}.`);
      continue;
    }
    werke.push(code);
  }
  return { maerkteBetreten: maerkte, produkteEinfuehren: produkte, werkeBauen: werke };
}

export interface ExpansionWirkung {
  aufwand: number;
  capex: number;
  meldungen: string[];
}

/** Führt Expansionsentscheidungen zu Quartalsbeginn aus (Kosten, neue Werke, Produkte im Vorlauf). */
export function starteExpansion(s: GameState, e: NonNullable<Decisions['expansion']>, t: number): ExpansionWirkung {
  const out: ExpansionWirkung = { aufwand: 0, capex: 0, meldungen: [] };
  for (const r of e.maerkteBetreten) {
    out.aufwand += REGIONEN[r].eintritt;
    s.regionen[r]!.aktivSeit = t + 1;
    out.meldungen.push(`Markteintritt ${REGIONEN[r].name} vorbereitet (${(REGIONEN[r].eintritt / 1e6).toLocaleString('de-DE')} Mio. €) – Verkauf ab nächstem Quartal.`);
  }
  for (const p of e.produkteEinfuehren) {
    out.aufwand += EXPANSION.produktEinfuehrung;
    const w = s.werke[0];
    const lk = lernkurve(EXPANSION.produktKumStart);
    const hk = w ? herstellkosten(p, w, 1, lk).hk : PRODUKTE[p].material;
    s.produkte[p] = {
      freigeschaltet: false,
      status: 'vorlauf',
      fe: EXPANSION.produktFeStart,
      kumMenge: EXPANSION.produktKumStart,
      lager: { stueck: 0, hk },
      materialSets: 0,
      materialWert: 0,
      letzteHk: hk,
    };
    out.meldungen.push(`Entwicklung ${PRODUKTE[p].name} gestartet (500.000 €) – im Verkauf ab nächstem Quartal.`);
  }
  for (const code of e.werkeBauen) {
    const st = WERK_STANDORTE[code];
    const nr = s.werke.filter((w) => (w.standort ?? 'DE') === code).length + 1;
    const werk: Werk = {
      id: `${code}-${code === 'DE' ? nr + 0 : nr}`,
      name: code === 'DE' ? `${st.ort}` : `${st.name} (${st.ort})`,
      region: st.region,
      lohnIndex: st.lohnIndex,
      gebaeudeBuchwert: st.baukosten,
      gebaeudeRestlaufzeit: BALANCE.finanzen.abschreibungWerkQuartale,
      linien: [],
      mitarbeitende: 0,
      motivation: 1,
      kompetenz: 1,
      wartung: 'voll',
      standort: code,
      status: 'bau',
      bauRest: st.bauzeit,
      hallenPlaetze: BALANCE.produktion.maxLinienProHalle,
    };
    if (s.werke.some((w) => w.id === werk.id)) werk.id = `${code}-${s.werke.length + 1}`;
    s.werke.push(werk);
    out.capex += st.baukosten;
    out.meldungen.push(`Werksbau ${werk.name} begonnen (${(st.baukosten / 1e6).toLocaleString('de-DE')} Mio. €, ${st.bauzeit} Quartale Bauzeit).`);
  }
  return out;
}

/** Zum Quartalsende: Markteintritte aktivieren, Produkte aus dem Vorlauf holen, Werksbau fortschreiben. */
export function schliesseExpansionAb(s: GameState, t: number): string[] {
  const meldungen: string[] = [];
  const hoechste = Math.max(0, ...REGION_IDS.map((r) => (s.regionen[r]?.aktiv ? s.regionen[r]!.bekanntheit : 0)));
  for (const r of REGION_IDS) {
    const reg = s.regionen[r];
    if (!reg || reg.aktiv || reg.aktivSeit !== t + 1) continue;
    reg.aktiv = true;
    reg.bekanntheit = EXPANSION.markteintrittBekanntheit + EXPANSION.markteintrittAnteilHoechste * hoechste;
    reg.marktanteil = 0;
    s.regionenReihenfolge = [...(s.regionenReihenfolge ?? ['DE']), r];
    meldungen.push(`Willkommen in ${REGIONEN[r].name}! Ab sofort kannst du dort verkaufen.`);
  }
  for (const p of PRODUKT_IDS) {
    const pz = s.produkte[p];
    if (pz?.status === 'vorlauf') {
      pz.status = 'aktiv';
      pz.freigeschaltet = true;
      meldungen.push(`${PRODUKTE[p].name} ist fertig entwickelt und kann ab sofort produziert werden.`);
    }
  }
  for (const w of s.werke) {
    if (w.status !== 'bau') continue;
    w.bauRest = (w.bauRest ?? 1) - 1;
    if (w.bauRest <= 0) {
      w.status = 'aktiv';
      meldungen.push(`Werk ${w.name} ist fertig – jetzt Linien kaufen und Personal einstellen.`);
    }
  }
  return meldungen;
}

/** Einstellungslimit eines Werks (mindestens 20 Personen, damit neue Werke anlaufen können) */
export function einstellungsLimit(w: Werk, faktor = 1): number {
  if ((w.status ?? 'aktiv') === 'bau') return 0;
  return Math.floor(Math.max(w.mitarbeitende * BALANCE.personal.maxEinstellung, EXPANSION.mindestEinstellung) * faktor);
}
