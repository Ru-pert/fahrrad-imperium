/**
 * Führungskräfte mit Gesichtern: je Ressort eine Person mit Können (Stufe), Gehalt, Macke und Loyalität.
 * Eigener Zufallsstrom (Seed + Quartal), damit die übrige Simulation unverändert bleibt.
 */
import { FUEHRUNG, MACKEN, NACHNAMEN, RESSORTS, RESSORT_IDS, VORNAMEN_M, VORNAMEN_W, mackeVon } from './config/fuehrung';
import { KONKURRENTEN } from './config/competitors';
import { Rng, hashSeed } from './rng';
import type { Decisions, Fuehrungskraft, FuehrungZustand, GameState, QuarterReport } from './types';
import { clamp } from './util';

type Personalie = NonNullable<QuarterReport['fuehrung']>[number];

const rngFuer = (s: GameState, t: number, art: string): Rng => new Rng(hashSeed(`${s.einstellungen.seed}:${t}:${art}`));
const runde = (x: number): number => Math.round(x / 1000) * 1000;
const bezug = (s: GameState): number => s.kpiHistorie[s.kpiHistorie.length - 1]?.umsatz ?? 0;

/** Marktübliches Gehalt je Quartal für eine Stufe */
export function marktGehalt(s: GameState, stufe: number): number {
  const G = FUEHRUNG.gehalt;
  return runde(Math.pow(stufe, G.exponent) * Math.max(G.min, G.umsatzAnteil * bezug(s)));
}

export const titelVon = (p: Fuehrungskraft): string => RESSORTS[p.ressort].titel[Math.min(2, p.befoerdert)];
export const mackeName = (p: Fuehrungskraft): string => mackeVon(p.macke).name[p.weiblich ? 0 : 1];

/** Drei Bewerbungen für ein Quartal (deterministisch aus Seed und Quartal) */
export function generiereBewerber(s: GameState, t: number): Fuehrungskraft[] {
  const rng = rngFuer(s, t, 'bewerber');
  const team = s.fuehrung?.team ?? [];
  const frei = RESSORT_IDS.filter((r) => !team.some((p) => p.ressort === r));
  const konkurrenten = KONKURRENTEN.map((k) => s.konkurrenten[k.id]).filter((k) => k && k.status === 'aktiv' && k.uebernommen === undefined);
  const liste: Fuehrungskraft[] = [];
  for (let i = 0; i < FUEHRUNG.bewerber; i++) {
    const pool = frei.length && rng.chance(0.75) ? frei : RESSORT_IDS;
    const ressort = pool[Math.floor(rng.next() * pool.length)];
    let x = rng.next();
    let stufe = 1;
    for (let j = 0; j < FUEHRUNG.stufenGewicht.length; j++) {
      x -= FUEHRUNG.stufenGewicht[j];
      if (x <= 0) {
        stufe = j + 1;
        break;
      }
      stufe = j + 1;
    }
    const weiblich = rng.chance(0.5);
    const vornamen = weiblich ? VORNAMEN_W : VORNAMEN_M;
    const macke = MACKEN[Math.floor(rng.next() * MACKEN.length)];
    const vonKonkurrenz = konkurrenten.length > 0 && rng.chance(FUEHRUNG.konkurrentAnteil);
    if (vonKonkurrenz) stufe = Math.min(5, stufe + 1);
    let gehalt = runde(marktGehalt(s, stufe) * (macke.gehalt ?? 1) * (0.9 + 0.2 * rng.next()) * (vonKonkurrenz ? 1.15 : 1));
    gehalt = Math.max(gehalt, 5000);
    const p: Fuehrungskraft = {
      id: `B${t}-${i}`,
      name: `${vornamen[Math.floor(rng.next() * vornamen.length)]} ${NACHNAMEN[Math.floor(rng.next() * NACHNAMEN.length)]}`,
      weiblich,
      alter: 29 + Math.floor(rng.next() * 30),
      ressort,
      stufe,
      gehalt,
      macke: macke.id,
      gesicht: Math.floor(rng.next() * 1e9),
      loyalitaet: FUEHRUNG.loyalitaet.start,
      befoerdert: 0,
    };
    if (vonKonkurrenz) {
      const k = konkurrenten[Math.floor(rng.next() * konkurrenten.length)]!;
      p.herkunft = k.id;
      p.abloese = runde(gehalt * FUEHRUNG.abloese);
    }
    liste.push(p);
  }
  return liste;
}

export function fuehrungVon(s: GameState): FuehrungZustand {
  return s.fuehrung ?? { team: [], bewerber: generiereBewerber(s, s.quartal), abwerbung: [] };
}

/** Effektive Wirkung einer Person in einem Quartal (0 bei Ausfall) */
export function personWirkung(s: GameState, p: Fuehrungskraft, t: number): number {
  if (p.ausfallBis !== undefined && p.ausfallBis >= t) return 0;
  const m = mackeVon(p.macke);
  let w = FUEHRUNG.wirkungJeStufe * p.stufe * (1 + FUEHRUNG.befoerderungBonus * p.befoerdert) * (m.wirkung ?? 1);
  if (m.schwankung) {
    const r = rngFuer(s, t, `chaos-${p.id}`).next();
    w *= m.schwankung[0] + (m.schwankung[1] - m.schwankung[0]) * r;
  }
  return w;
}

export interface FuehrungsWirkung {
  kapazitaet: number;
  nachfrage: number;
  forschung: number;
  werbung: number;
  verwaltung: number;
  zins: number;
  qualitaet: number;
  image: number;
  bekanntheit: number;
  nachhaltigkeit: number;
  motivation: number;
}

export const KEINE_FUEHRUNG: FuehrungsWirkung = { kapazitaet: 1, nachfrage: 1, forschung: 1, werbung: 1, verwaltung: 1, zins: 1, qualitaet: 0, image: 0, bekanntheit: 0, nachhaltigkeit: 0, motivation: 0 };

/** Prozentuale Hauptwirkung einer Person (für die Anzeige) */
export const hauptwirkung = (s: GameState, p: Fuehrungskraft, t: number): number => personWirkung(s, p, t) * FUEHRUNG.hebel[p.ressort];

export function fuehrungsWirkung(s: GameState, t: number): FuehrungsWirkung {
  const team = s.fuehrung?.team ?? [];
  if (!team.length) return KEINE_FUEHRUNG;
  const w = { ...KEINE_FUEHRUNG };
  for (const p of team) {
    if (p.ausfallBis !== undefined && p.ausfallBis >= t) continue;
    const x = hauptwirkung(s, p, t);
    if (p.ressort === 'produktion') w.kapazitaet *= 1 + x;
    if (p.ressort === 'vertrieb') w.nachfrage *= 1 + x;
    if (p.ressort === 'forschung') w.forschung *= 1 + x;
    if (p.ressort === 'marketing') w.werbung *= 1 + x;
    if (p.ressort === 'finanzen') {
      w.verwaltung *= Math.max(0.5, 1 - x);
      w.zins *= Math.max(0.5, 1 - x);
    }
    const m = mackeVon(p.macke);
    w.qualitaet += m.qualitaet ?? 0;
    w.image += m.image ?? 0;
    w.bekanntheit += m.bekanntheit ?? 0;
    w.nachhaltigkeit += m.nachhaltigkeit ?? 0;
    w.motivation += m.motivation ?? 0;
  }
  return w;
}

export const gehaelter = (s: GameState): number => (s.fuehrung?.team ?? []).reduce((a, p) => a + p.gehalt, 0);

/** Personalentscheidungen zu Beginn des Quartals. Gibt einmalige Kosten (Prämie, Abfindung, Ablöse) zurück. */
export function fuehrungsBeschluesse(s: GameState, dec: Decisions, t: number, warn: string[]): { kosten: number; bericht: Personalie[] } {
  const F = FUEHRUNG;
  const z = (s.fuehrung ??= { team: [], bewerber: generiereBewerber(s, t), abwerbung: [] });
  z.abwerbung ??= [];
  const e = dec.fuehrung ?? {};
  const bericht: Personalie[] = [];
  let kosten = 0;
  const raus = (p: Fuehrungskraft, grund: 'abgeworben' | 'entlassen', zu?: string) => {
    z.team = z.team.filter((x) => x.id !== p.id);
    z.ehemalige = [...(z.ehemalige ?? []), { name: p.name, ressort: p.ressort, grund, quartal: t, zu }].slice(-20);
  };
  // Abwerbeversuche aus dem Vorquartal
  for (const a of z.abwerbung) {
    const p = z.team.find((x) => x.id === a.personId);
    if (!p) continue;
    const kName = s.konkurrenten[a.konkurrent]?.name ?? 'die Konkurrenz';
    if ((e.gegenangebot ?? []).includes(p.id)) {
      p.gehalt = a.forderung;
      p.loyalitaet = clamp(p.loyalitaet + 20, 0, 100);
      bericht.push({ art: 'geblieben', name: p.name, ressort: p.ressort, text: `${p.name} bleibt dank deines Gegenangebots (neues Gehalt ${a.forderung.toLocaleString('de-DE')} € je Quartal).` });
    } else {
      raus(p, 'abgeworben', a.konkurrent);
      const k = s.konkurrenten[a.konkurrent];
      if (k) k.image = Math.min(100, k.image + 2);
      bericht.push({ art: 'abgeworben', name: p.name, ressort: p.ressort, text: `${p.name} (${RESSORTS[p.ressort].name}) wechselt zu ${kName}.` });
    }
  }
  z.abwerbung = [];
  // Entlassen
  for (const id of e.entlassen ?? []) {
    const p = z.team.find((x) => x.id === id);
    if (!p) continue;
    kosten += F.abfindung * p.gehalt;
    raus(p, 'entlassen');
    bericht.push({ art: 'entlassen', name: p.name, ressort: p.ressort, text: `${p.name} verlässt das Unternehmen (Abfindung ${(F.abfindung * p.gehalt).toLocaleString('de-DE')} €).` });
  }
  // Befördern
  for (const id of e.befoerdern ?? []) {
    const p = z.team.find((x) => x.id === id);
    if (!p) continue;
    if (!kannBefoerdern(p, t)) {
      warn.push(`${p.name} kann gerade nicht befördert werden.`);
      continue;
    }
    p.befoerdert += 1;
    p.letzteBefoerderung = t;
    p.gehalt = runde(p.gehalt * F.befoerderung.gehalt);
    p.loyalitaet = clamp(p.loyalitaet + F.befoerderung.loyalitaet, 0, 100);
    bericht.push({ art: 'befoerdert', name: p.name, ressort: p.ressort, text: `${p.name} ist jetzt ${titelVon(p)}.` });
  }
  // Einstellen
  const bewerber = z.bewerber?.length ? z.bewerber : generiereBewerber(s, t);
  for (const id of e.einstellen ?? []) {
    const b = bewerber.find((x) => x.id === id);
    if (!b) continue;
    if (z.team.some((x) => x.ressort === b.ressort)) {
      warn.push(`${RESSORTS[b.ressort].name} ist schon besetzt – ${b.name} wurde nicht eingestellt.`);
      continue;
    }
    const p: Fuehrungskraft = { ...b, id: `F${t}-${b.id}`, seit: t };
    kosten += F.anwerbePraemie * p.gehalt + (p.abloese ?? 0);
    z.team.push(p);
    const von = p.herkunft ? ` – abgeworben von ${s.konkurrenten[p.herkunft]?.name ?? 'der Konkurrenz'}` : '';
    bericht.push({ art: 'eingestellt', name: p.name, ressort: p.ressort, text: `${p.name} übernimmt die ${titelVon(p)}${von}.` });
  }
  z.bewerber = bewerber.filter((b) => !z.team.some((x) => x.id === `F${t}-${b.id}`));
  return { kosten, bericht };
}

export const kannBefoerdern = (p: Fuehrungskraft, t: number): boolean =>
  p.befoerdert < FUEHRUNG.befoerderung.max && t - (p.letzteBefoerderung ?? p.seit ?? -99) >= FUEHRUNG.befoerderung.abstand;

/** Einmalige Kosten der geplanten Personalentscheidungen (für die Vorschau in der Oberfläche) */
export function geplanteKosten(s: GameState, e: Decisions['fuehrung']): number {
  const z = fuehrungVon(s);
  let k = 0;
  for (const id of e?.entlassen ?? []) k += FUEHRUNG.abfindung * (z.team.find((p) => p.id === id)?.gehalt ?? 0);
  for (const id of e?.einstellen ?? []) {
    const b = z.bewerber.find((p) => p.id === id);
    if (b) k += FUEHRUNG.anwerbePraemie * b.gehalt + (b.abloese ?? 0);
  }
  return k;
}

/** Quartalsende: Loyalität, Burn-out, Abwerbeversuche und neue Bewerbungen. */
export function fuehrungQuartalsende(s: GameState, t: number, ebit: number): Personalie[] {
  const F = FUEHRUNG;
  const z = (s.fuehrung ??= { team: [], bewerber: [], abwerbung: [] });
  const rng = rngFuer(s, t, 'fuehrung-ende');
  const bericht: Personalie[] = [];
  const konkurrenten = KONKURRENTEN.map((k) => s.konkurrenten[k.id]).filter((k) => k && k.status === 'aktiv' && k.uebernommen === undefined);
  for (const p of z.team) {
    const m = mackeVon(p.macke);
    const markt = marktGehalt(s, p.stufe) * (m.gehalt ?? 1);
    // Tarifanpassung: Das Gehalt fällt nie unter 90 % des Marktgehalts
    if (p.gehalt < F.gehalt.mindestAnteilMarkt * markt) p.gehalt = runde(F.gehalt.mindestAnteilMarkt * markt);
    const gehaltEffekt = clamp((p.gehalt / Math.max(1, markt) - 1) * F.loyalitaet.gehaltFaktor, -F.loyalitaet.gehaltMax, F.loyalitaet.gehaltMax);
    p.loyalitaet = clamp(p.loyalitaet + F.loyalitaet.jeQuartal + (m.loyalitaet ?? 0) + gehaltEffekt + (ebit < 0 ? F.loyalitaet.verlust : 0), F.loyalitaet.min, F.loyalitaet.max);
    if (m.burnout && (p.ausfallBis === undefined || p.ausfallBis < t) && rng.chance(m.burnout)) {
      p.ausfallBis = t + 1;
      bericht.push({ art: 'burnout', name: p.name, ressort: p.ressort, text: `${p.name} hat sich übernommen: Burn-out, fällt im nächsten Quartal aus.` });
    }
    const dabei = t - (p.seit ?? t);
    const faktor = m.abwerbung ?? 1;
    if (faktor > 0 && dabei >= F.abwerbung.sperre - 1 && konkurrenten.length) {
      const chance = F.abwerbung.basis * Math.pow(1 - p.loyalitaet / 100, 2) * faktor * (p.stufe >= 4 ? F.abwerbung.topZuschlag : 1);
      if (rng.chance(chance)) {
        const k = konkurrenten[Math.floor(rng.next() * konkurrenten.length)]!;
        const forderung = runde(Math.max(p.gehalt * F.abwerbung.aufschlag, marktGehalt(s, p.stufe) * F.abwerbung.forderung));
        z.abwerbung.push({ personId: p.id, konkurrent: k.id, forderung });
        bericht.push({ art: 'abwerbeversuch', name: p.name, ressort: p.ressort, text: `${k.name} will ${p.name} abwerben! Halte ${p.weiblich ? 'sie' : 'ihn'} mit einem Gegenangebot von ${forderung.toLocaleString('de-DE')} € je Quartal.` });
      }
    }
  }
  z.bewerber = generiereBewerber(s, t + 1);
  return bericht;
}
