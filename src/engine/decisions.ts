import { BALANCE, START } from './config/balance';
import { LINIENTYPEN, PRODUKTE } from './config/products';
import { REGION_IDS } from './config/markets';
import { HQ_EXTRAS, HQ_STUFEN } from './config/hq';
import type { Decisions, GameState, LinienTyp, ProductId, RegionId, Wartung, WerkEntscheidung } from './types';
import { clamp, quartalLabel } from './util';
import { kreditlimit, sachanlagen, schuldenGesamt } from './finance';
import { referenzPreis } from './market';
import { ereignisEffekte } from './events';
import { einstellungsLimit } from './expansion';

import { KOMPONENTEN, hallenPlaetze } from './production';
export { KOMPONENTEN };

/** Komplexitätsstufe (4.1): 1 ab Q1, 2 ab Q3, 3 ab Q5; im Profimodus gilt immer Stufe 3. */
export function komplexitaetsStufe(state: Pick<GameState, 'quartal' | 'einstellungen'>): 1 | 2 | 3 {
  if (state.einstellungen.profi) return 3;
  if (state.quartal >= 4) return 3;
  if (state.quartal >= 2) return 2;
  return 1;
}

export function aktiveProdukte(state: GameState): ProductId[] {
  return (Object.keys(state.produkte) as ProductId[]).filter((p) => state.produkte[p]?.freigeschaltet);
}

export function aktiveRegionen(state: GameState): RegionId[] {
  return REGION_IDS.filter((r) => state.regionen[r]?.aktiv);
}

export function leereWerkEntscheidung(w: { wartung: Wartung }, schulung: number): WerkEntscheidung {
  return { linienKaufen: [], linienVerkaufen: [], wartung: w.wartung, personalAenderung: 0, schulungProKopf: schulung };
}

/** Entscheidungen des Startquartals. */
export function startEntscheidungen(startProdukte: ProductId[] = ['stadtrad']): Decisions {
  const e = START.entscheidungen;
  const nurStadtrad = startProdukte.length === 1;
  const d: Decisions = {
    quartal: 0,
    preis: {},
    marketing: {},
    produktion: {},
    fe: {},
    werke: { [START.werk.id]: { linienKaufen: [], linienVerkaufen: [], wartung: START.werk.wartung, personalAenderung: 0, schulungProKopf: e.schulung } },
    lieferanten: { rahmen: 'standard', akku: 'standard', antrieb: 'standard' },
    nachhaltigkeitsbudget: 0,
    finanzen: { darlehenNeu: 0, tilgungExtra: 0, dividende: 0 },
    firmensitz: { kaufen: [] },
  };
  for (const p of startProdukte as ('stadtrad' | 'ebike')[]) {
    d.preis[p] = { DE: e.preis[p] };
    d.marketing[p] = { DE: nurStadtrad ? START.marketingNurStadtrad : e.marketing[p] };
    d.produktion[p] = { [START.werk.id]: nurStadtrad ? START.produktionNurStadtrad : e.produktion[p] };
    d.fe[p] = e.fe[p];
  }
  return d;
}

/**
 * Vorbelegung: Nicht veränderte Werte werden aus dem Vorquartal übernommen,
 * einmalige Aktionen (Bau, Kredit, Einstellungen) werden zurückgesetzt.
 */
export function standardEntscheidungen(state: GameState): Decisions {
  const alt = structuredClone(state.letzteEntscheidungen);
  alt.quartal = state.quartal;
  for (const w of state.werke) {
    const e = alt.werke[w.id] ?? leereWerkEntscheidung(w, START.entscheidungen.schulung);
    alt.werke[w.id] = { ...e, linienKaufen: [], linienVerkaufen: [], personalAenderung: 0, wartung: e.wartung, halleErweitern: false };
  }
  alt.finanzen = { darlehenNeu: 0, tilgungExtra: 0, dividende: 0 };
  alt.firmensitz = { kaufen: [] };
  alt.expansion = { maerkteBetreten: [], produkteEinfuehren: [], werkeBauen: [] };
  // Abgeschlossene Forschung braucht kein Budget mehr
  if (alt.forschung) alt.forschung = Object.fromEntries(Object.entries(alt.forschung).filter(([id]) => state.forschung?.[id]?.fertigIm === undefined));
  // Fehlende Felder für aktive Produkte/Regionen auffüllen
  for (const p of aktiveProdukte(state)) {
    alt.preis[p] ??= {};
    alt.marketing[p] ??= {};
    alt.produktion[p] ??= {};
    for (const r of aktiveRegionen(state)) {
      alt.preis[p]![r] ??= Math.round(referenzPreis(r, p));
      alt.marketing[p]![r] ??= 0;
    }
    for (const w of state.werke) alt.produktion[p]![w.id] ??= 0;
    alt.fe[p] ??= 0;
  }
  return alt;
}

export interface NormalisierteEntscheidung {
  dec: Decisions;
  warnungen: string[];
}

/**
 * Prüft und begrenzt Entscheidungen. Werte außerhalb der Bereiche werden hier
 * (für die Berechnung) begrenzt und als Warnung gemeldet; die Oberfläche zeigt sie vorher an.
 * Entscheidungen noch nicht freigeschalteter Stufen werden auf Standardwerte gesetzt.
 */
export function normalisiere(state: GameState, eingabe: Decisions): NormalisierteEntscheidung {
  const warn: string[] = [];
  const dec = structuredClone(eingabe);
  const stufe = komplexitaetsStufe(state);
  const basis = standardEntscheidungen(state);
  dec.quartal = state.quartal;

  for (const p of aktiveProdukte(state)) {
    dec.preis[p] ??= {};
    dec.marketing[p] ??= {};
    dec.produktion[p] ??= {};
    for (const r of aktiveRegionen(state)) {
      const ref = referenzPreis(r, p);
      let preis = dec.preis[p]![r] ?? basis.preis[p]?.[r] ?? ref;
      if (!Number.isFinite(preis) || preis <= 0) preis = ref;
      const lo = 0.5 * ref;
      const hi = 3 * ref;
      if (preis < lo || preis > hi) warn.push(`Preis ${PRODUKTE[p].name}: ${Math.round(preis)} € liegt außerhalb von 50–300 % des Referenzpreises und wird auf ${Math.round(clamp(preis, lo, hi))} € begrenzt.`);
      dec.preis[p]![r] = clamp(preis, lo, hi);
      dec.marketing[p]![r] = Math.max(0, dec.marketing[p]![r] ?? 0);
    }
    for (const w of state.werke) dec.produktion[p]![w.id] = (w.status ?? 'aktiv') === 'bau' ? 0 : Math.max(0, Math.round(dec.produktion[p]![w.id] ?? 0));
    dec.fe[p] = Math.max(0, dec.fe[p] ?? 0);
  }

  for (const w of state.werke) {
    const e = (dec.werke[w.id] ??= leereWerkEntscheidung(w, START.entscheidungen.schulung));
    if ((w.status ?? 'aktiv') === 'bau') {
      Object.assign(e, { personalAenderung: 0, linienKaufen: [], linienVerkaufen: [], halleErweitern: false });
      continue;
    }
    e.schulungProKopf = clamp(e.schulungProKopf ?? 0, 0, BALANCE.personal.schulungMax);
    const maxPlus = einstellungsLimit(w, ereignisEffekte(state).einstellung);
    const maxMinus = Math.floor(w.mitarbeitende * BALANCE.personal.maxEntlassung);
    const aend = Math.round(e.personalAenderung ?? 0);
    if (aend > maxPlus) warn.push(`Personal ${w.name}: Einstellung von ${aend} übersteigt das Limit von +${maxPlus}.`);
    if (-aend > maxMinus) warn.push(`Personal ${w.name}: Entlassung von ${-aend} übersteigt das Limit von −${maxMinus} (20 %).`);
    e.personalAenderung = clamp(aend, -maxMinus, maxPlus);
    if (stufe < 2) e.wartung = w.wartung;
    if (stufe < 3) {
      e.linienKaufen = (e.linienKaufen ?? []).map((k) => ({ ...k, typ: 'B' as LinienTyp }));
      e.linienVerkaufen = [];
    }
    let frei = BALANCE.produktion.maxNeueLinienProQuartal;
    const platz = hallenPlaetze(w) - (w.linien.length - (e.linienVerkaufen?.length ?? 0));
    const kaufen: { typ: LinienTyp; anzahl: number }[] = [];
    let gesamtPlatz = Math.max(0, platz);
    for (const k of e.linienKaufen ?? []) {
      if (!(k.typ in LINIENTYPEN)) continue;
      const n = Math.max(0, Math.min(Math.round(k.anzahl), frei, gesamtPlatz));
      if (n < Math.round(k.anzahl)) warn.push(`${w.name}: Es können höchstens 4 neue Linien je Quartal gebaut werden, und die Halle hat ${hallenPlaetze(w)} Plätze.`);
      if (n > 0) kaufen.push({ typ: k.typ, anzahl: n });
      frei -= n;
      gesamtPlatz -= n;
    }
    e.linienKaufen = kaufen;
    // Hallenerweiterung nur, wenn die Halle voll ist und gerade keine Erweiterung läuft
    if (e.halleErweitern && ((w.halleImBau ?? 0) > 0 || w.linien.length < hallenPlaetze(w))) {
      warn.push(`${w.name}: Die Halle kann erst erweitert werden, wenn alle ${hallenPlaetze(w)} Plätze belegt sind.`);
      e.halleErweitern = false;
    }
    e.linienVerkaufen = (e.linienVerkaufen ?? []).filter((id) => w.linien.some((l) => l.id === id && l.status === 'aktiv'));
    if (w.linien.length - e.linienVerkaufen.length < 1) {
      e.linienVerkaufen = e.linienVerkaufen.slice(0, Math.max(0, w.linien.length - 1));
      warn.push(`${w.name}: Mindestens eine Linie muss bleiben.`);
    }
  }
  for (const id of Object.keys(dec.werke)) if (!state.werke.some((w) => w.id === id)) delete dec.werke[id];

  if (stufe < 2) dec.lieferanten = { rahmen: 'standard', akku: 'standard', antrieb: 'standard' };
  for (const k of KOMPONENTEN) dec.lieferanten[k] ??= 'standard';
  dec.nachhaltigkeitsbudget = stufe < 3 ? 0 : Math.max(0, dec.nachhaltigkeitsbudget ?? 0);

  // Finanzen
  const f = dec.finanzen;
  const limitFrei = Math.max(0, kreditlimit(state) - schuldenGesamt(state.finanzen));
  f.darlehenNeu = Math.max(0, f.darlehenNeu ?? 0);
  if (f.darlehenNeu > limitFrei + 0.5) {
    warn.push(`Darlehen: ${Math.round(f.darlehenNeu).toLocaleString('de-DE')} € übersteigen das freie Kreditlimit von ${Math.round(limitFrei).toLocaleString('de-DE')} €.`);
    f.darlehenNeu = Math.floor(limitFrei);
  }
  const offen = state.finanzen.kredite.reduce((s, k) => s + k.restbetrag, 0);
  f.tilgungExtra = clamp(f.tilgungExtra ?? 0, 0, offen);
  f.dividende = Math.max(0, f.dividende ?? 0);
  if (f.dividende > Math.max(0, state.finanzen.gewinnruecklagen)) {
    if (f.dividende > 0) warn.push('Dividende nur bei Gewinnrücklagen > 0 und höchstens in deren Höhe möglich.');
    f.dividende = Math.max(0, Math.floor(state.finanzen.gewinnruecklagen));
  }

  // Firmensitz: nur die nächste Stufe, in Reihenfolge
  const gewuenscht = dec.firmensitz?.kaufen ?? [];
  let stufeHq = state.unternehmen.firmensitz.stufe;
  const gekauft: string[] = [];
  for (const id of gewuenscht) {
    const idx = HQ_STUFEN.findIndex((s) => s.id === id);
    if (idx === stufeHq + 1) {
      gekauft.push(id);
      stufeHq = idx;
    } else if (idx >= 0) {
      warn.push(`Firmensitz „${HQ_STUFEN[idx].name}“ setzt die vorherige Stufe voraus.`);
    } else {
      // Extras: beliebig kombinierbar, jedes nur einmal
      const extra = HQ_EXTRAS.find((x) => x.id === id);
      if (extra && !state.unternehmen.firmensitz.extras.includes(id) && !gekauft.includes(id)) gekauft.push(id);
    }
  }
  dec.firmensitz = { kaufen: gekauft };
  void sachanlagen;
  return { dec, warnungen: warn };
}

export function entscheidungsLabel(d: Decisions): string {
  return quartalLabel(d.quartal);
}
