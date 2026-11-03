import { BALANCE } from './config/balance';
import { KONKURRENTEN } from './config/competitors';
import { HQ_EXTRAS, HQ_EXTRAS_MAX_BONUS, HQ_STUFEN } from './config/hq';
import { LIEFERANTEN, LINIENTYPEN, PRODUKTE } from './config/products';
import { LOGISTIK, REGIONEN } from './config/markets';
import { Rng } from './rng';
import type {
  AngebotBericht,
  Bilanz,
  Decisions,
  GameState,
  GuV,
  Kapitalfluss,
  Komponente,
  Kredit,
  ProduktBericht,
  ProductId,
  QuarterReport,
  RegionId,
  SegmentBericht,
  Werk,
  WerkBericht,
} from './types';
import {
  buchungKonkurrent,
  konkurrentAnbieter,
  planKonkurrenten,
  produziereKonkurrent,
  KONKURRENZ_PRODUKTE,
  type KonkurrentProduktion,
} from './competitors';
import { aktiveProdukte, aktiveRegionen, normalisiere } from './decisions';
import {
  baueBilanz,
  berechneRating,
  ebit4Q,
  ebitda4Q,
  kreditlimit,
  ratingAufschlag,
  sachanlagen,
  umsatz4Q,
  umweltabgabe,
  unternehmenswert,
} from './finance';
import { berechneSegment, technikAusStock, type Anbieter, type SegmentOutput } from './market';
import {
  KOMPONENTEN,
  herstellkosten,
  lernkurve,
  lieferantenKostenFaktor,
  lieferantenUmwelt,
  linienAfa,
  lohnProMitarbeiter,
  lohnProStunde,
  nacharbeitsquote,
  neueLinie,
  neueVerfuegbarkeit,
  qualitaet,
  wartungsKosten,
} from './production';
import { clamp, stk, sum } from './util';
import { SPIELER_ID } from './init';

export interface SimOptionen {
  /** 'plan': echte Konkurrenzpläne, 'wiederholung': Konkurrenz wiederholt das Vorquartal (Vorschau, Planungsrechner) */
  konkurrenzModus?: 'plan' | 'wiederholung';
  /** Zufallsereignisse (Lieferantenausfall, Störungen, Fluktuation) und neue Konkurrenzpläne */
  zufall?: boolean;
}

export interface SimulationErgebnis {
  nextState: GameState;
  report: QuarterReport;
}

interface WerkRes {
  werk: Werk;
  hired: number;
  fired: number;
  maOhneFluktuation: number;
  maschStd: number;
  regStd: number;
  maxStd: number;
  noetig: number;
  ueberstd: number;
  uLinien: number;
  uPersonal: number;
  einarbeitung: number;
  prodI: number;
  gekuerzt: boolean;
  staffWage: number;
  laborCash: number;
  leer: number;
  premium: number;
  energie: number;
  linienFix: number;
  wartung: number;
  schicht: number;
  hireFireTrain: number;
  schulungProKopf: number;
  qty: Partial<Record<ProductId, number>>;
  rate: number;
}

const naechsteLinienNr = (w: Werk): number =>
  1 + Math.max(0, ...w.linien.map((l) => Number(/-L(\d+)$/.exec(l.id)?.[1] ?? 0)));

export function hqImageBonus(s: GameState): number {
  const stufe = HQ_STUFEN[s.unternehmen.firmensitz.stufe]?.imageBonus ?? 0;
  const extras = Math.min(
    HQ_EXTRAS_MAX_BONUS,
    s.unternehmen.firmensitz.extras.reduce((a, id) => a + (HQ_EXTRAS.some((e) => e.id === id) ? 0.5 : 0), 0),
  );
  return stufe + extras;
}

/**
 * Kernfunktion: berechnet ein Quartal. Reine Funktion – der Eingangszustand wird nicht verändert.
 * Gleicher Seed (rng-Zustand) + gleiche Entscheidungen = gleiches Ergebnis.
 */
export function simulateQuarter(
  state: GameState,
  eingabe: Decisions,
  rng: Rng = Rng.fromState(state.rngState),
  opts: SimOptionen = {},
): SimulationErgebnis {
  const s = structuredClone(state);
  const t = s.quartal;
  const zufall = opts.zufall !== false;
  const { dec, warnungen } = normalisiere(s, eingabe);
  const warn = [...warnungen];
  const meldungen: string[] = [];
  const plaene = opts.konkurrenzModus === 'wiederholung' ? structuredClone(s.konkurrenzVorquartal) : structuredClone(s.konkurrenzPlaene);
  const fin = s.finanzen;
  const B = BALANCE;

  const kasseAnfang = fin.kasse;
  const forderungenAnfang = fin.forderungen;
  const verbindlichkeitenAnfang = fin.verbindlichkeiten;
  const vorraeteAnfang = sum(Object.values(s.produkte).map((p) => (p ? p.lager.stueck * p.lager.hk + p.materialWert : 0)));
  const kontokorrentAlt = fin.kontokorrent;
  const rating = fin.rating;

  let capex = 0;
  let desinv = 0;
  let sonstErtrag = 0;
  let sonstAufwand = 0;
  let imageSchock = 0;

  // ------------------------------------------------------------ Firmensitz
  for (const id of dec.firmensitz.kaufen) {
    const idx = HQ_STUFEN.findIndex((x) => x.id === id);
    const kosten = HQ_STUFEN[idx].kosten;
    capex += kosten;
    s.unternehmen.firmensitz.stufe = idx;
    s.unternehmen.firmensitz.buchwert += kosten;
    s.unternehmen.firmensitz.anschaffung += kosten;
    meldungen.push(`Firmensitz ausgebaut: ${HQ_STUFEN[idx].name}`);
  }

  // ------------------------------------------------------------ Kredite
  let tilgungExtra = dec.finanzen.tilgungExtra;
  for (const k of fin.kredite) {
    const x = Math.min(k.restbetrag, tilgungExtra);
    k.restbetrag -= x;
    tilgungExtra -= x;
  }
  const tilgungExtraGezahlt = dec.finanzen.tilgungExtra - tilgungExtra;
  let darlehenNeu = dec.finanzen.darlehenNeu;
  if (darlehenNeu > 0) {
    const neu: Kredit = {
      id: `K${t + 1}`,
      restbetrag: darlehenNeu,
      tilgung: darlehenNeu / B.finanzen.darlehenLaufzeit,
      zins: B.finanzen.basiszins + ratingAufschlag(rating),
    };
    fin.kredite.push(neu);
  }
  darlehenNeu = Math.max(0, darlehenNeu);
  const zinsDarlehen = sum(fin.kredite.map((k) => (k.restbetrag * k.zins) / 4));
  const zinsKontokorrent = (kontokorrentAlt * B.finanzen.kontokorrentZins) / 4;

  // ------------------------------------------------------------ Lieferantenausfälle
  const ausfall: Record<Komponente, boolean> = { rahmen: false, akku: false, antrieb: false };
  if (zufall) {
    for (const k of KOMPONENTEN) ausfall[k] = rng.chance(LIEFERANTEN[dec.lieferanten[k]].ausfall);
  }
  for (const k of KOMPONENTEN) if (ausfall[k]) meldungen.push(`Lieferant für ${k} ist ausgefallen: Produktion nur zu 60 %.`);
  const betroffen = (p: ProductId): boolean => {
    const ebike = PRODUKTE[p].istEBike;
    return ausfall.rahmen || ausfall.antrieb || (ebike && ausfall.akku);
  };

  // ------------------------------------------------------------ Werke & Produktion
  const produkte = aktiveProdukte(s);
  const regionen = aktiveRegionen(s);
  const lf: Record<string, number> = {};
  const lk: Record<string, number> = {};
  for (const p of produkte) {
    lf[p] = lieferantenKostenFaktor(p, dec.lieferanten);
    lk[p] = lernkurve(s.produkte[p]!.kumMenge);
  }
  const werkRes: WerkRes[] = [];
  const prodMenge: Partial<Record<ProductId, number>> = {};
  const prodKostenMat: Partial<Record<ProductId, number>> = {};
  const prodKostenLohn: Partial<Record<ProductId, number>> = {};
  const prodNacharbeit: Partial<Record<ProductId, number>> = {};
  const prodGeplant: Partial<Record<ProductId, number>> = {};
  let nacharbeitGesamt = 0;
  let hoursNacharbeitNenner: Partial<Record<ProductId, number>> = {};
  const uUndMengen: { p: ProductId; menge: number; u: number }[] = [];

  for (const w of s.werke) {
    const e = dec.werke[w.id];
    // Linien verkaufen
    for (const id of e.linienVerkaufen) {
      const idx = w.linien.findIndex((l) => l.id === id);
      if (idx < 0) continue;
      const l = w.linien[idx];
      const erloes = LINIENTYPEN[l.typ].restwert * l.buchwert;
      desinv += erloes;
      sonstErtrag += erloes;
      sonstAufwand += l.buchwert;
      w.linien.splice(idx, 1);
      meldungen.push(`Linie ${id} verkauft (Erlös ${Math.round(erloes).toLocaleString('de-DE')} €).`);
    }
    // Linien kaufen
    for (const k of e.linienKaufen) {
      for (let i = 0; i < k.anzahl; i++) {
        const nr = naechsteLinienNr(w);
        w.linien.push(neueLinie(`${w.id}-L${nr}`, k.typ));
        capex += LINIENTYPEN[k.typ].preis;
      }
    }
    w.wartung = e.wartung;

    // Personal
    const maAlt = w.mitarbeitende;
    const hired = Math.max(0, e.personalAenderung);
    const fired = Math.max(0, -e.personalAenderung);
    const ma = maAlt + e.personalAenderung;
    if (fired > 0) imageSchock -= (fired / Math.max(1, maAlt) / 0.1) * B.personal.imageProZehnProzentAbbau;
    const hireFireTrain = hired * B.personal.einstellKosten + fired * B.personal.entlassKosten + e.schulungProKopf * ma;

    // Verfügbarkeit und Maschinenstunden
    let maschStd = 0;
    for (const l of w.linien) {
      if (l.status !== 'aktiv') continue;
      l.verfuegbarkeit = neueVerfuegbarkeit(l.verfuegbarkeit, w.wartung);
      let v = l.verfuegbarkeit;
      if (w.wartung === 'keiner' && zufall && rng.chance(B.produktion.stoerungswahrscheinlichkeitOhneWartung)) {
        v *= B.produktion.stoerungsVerfuegbarkeit;
        meldungen.push(`Störung an Linie ${l.id}: nur halbe Leistung.`);
      }
      maschStd += LINIENTYPEN[l.typ].kapazitaet * v;
    }
    const einarbeitung = ma > 0 ? 1 - B.personal.einarbeitungsAbschlag * (hired / ma) : 1;
    const prodI = einarbeitung * w.kompetenz * w.motivation;
    const regStd = B.personal.stundenProMitarbeiter * ma * prodI;
    const maxStd = Math.min(maschStd, regStd * (1 + B.personal.ueberstundenMax));

    // Produktionsmengen
    const qty: Partial<Record<ProductId, number>> = {};
    let noetig = 0;
    for (const p of produkte) {
      let q = dec.produktion[p]?.[w.id] ?? 0;
      prodGeplant[p] = (prodGeplant[p] ?? 0) + q;
      if (q > 0 && betroffen(p)) q = stk(q * B.produktion.lieferantenAusfallProduktion);
      qty[p] = q;
      noetig += q * PRODUKTE[p].montageStunden * lk[p];
    }
    let gekuerzt = false;
    if (noetig > maxStd + 1e-6) {
      const f = noetig > 0 ? maxStd / noetig : 0;
      noetig = 0;
      for (const p of produkte) {
        qty[p] = Math.floor((qty[p] ?? 0) * f);
        noetig += (qty[p] ?? 0) * PRODUKTE[p].montageStunden * lk[p];
      }
      gekuerzt = true;
      warn.push(`Produktion ${w.name}: Kapazität reicht nur für ${Math.round(maxStd).toLocaleString('de-DE')} Std. – Mengen wurden gekürzt.`);
    }
    const ueberstd = Math.max(0, noetig - regStd);
    const uLinien = maschStd > 0 ? noetig / maschStd : 0;
    const uPersonal = regStd > 0 ? noetig / regStd : 0;
    const u = Math.max(uLinien, uPersonal);
    const rate = lohnProStunde(w);
    const staffWage = ma * lohnProMitarbeiter(w);
    const premium = ueberstd * rate * B.personal.ueberstundenZuschlag;
    const laborCash = staffWage + ueberstd * rate + premium;
    const leer = staffWage - Math.min(noetig, regStd) * rate;
    const aktiv = w.linien.filter((l) => l.status === 'aktiv');
    const linienFix = sum(aktiv.map((l) => LINIENTYPEN[l.typ].fixkosten));
    const wartung = aktiv.length * wartungsKosten(w.wartung);
    const schicht = ueberstd > 0 ? B.personal.schichtkosten : 0;
    const energie = noetig * B.produktion.energieProStunde;

    // Kosten je Produkt
    for (const p of produkte) {
      const q = qty[p] ?? 0;
      if (q <= 0) continue;
      const hk = herstellkosten(p, w, lf[p], lk[p]);
      prodMenge[p] = (prodMenge[p] ?? 0) + q;
      prodKostenMat[p] = (prodKostenMat[p] ?? 0) + q * hk.material;
      prodKostenLohn[p] = (prodKostenLohn[p] ?? 0) + q * hk.lohn;
      const tP = technikAusStock(s.produkte[p]!.fe);
      const r = nacharbeitsquote(tP, u, q);
      const kosten = r * q * B.produktion.nacharbeit.kostenanteil * hk.hk;
      prodNacharbeit[p] = (prodNacharbeit[p] ?? 0) + kosten;
      nacharbeitGesamt += kosten;
      hoursNacharbeitNenner[p] = r;
      uUndMengen.push({ p, menge: q, u });
    }
    werkRes.push({
      werk: w, hired, fired, maOhneFluktuation: ma, maschStd, regStd, maxStd, noetig, ueberstd, uLinien, uPersonal, einarbeitung, prodI,
      gekuerzt, staffWage, laborCash, leer, premium, energie, linienFix, wartung, schicht, hireFireTrain,
      schulungProKopf: e.schulungProKopf, qty, rate,
    });
    w.mitarbeitende = ma;
  }
  hoursNacharbeitNenner = { ...hoursNacharbeitNenner };

  // Lager: Zugang mit Durchschnittskosten
  const produziert: Partial<Record<ProductId, number>> = {};
  for (const p of produkte) {
    const pz = s.produkte[p]!;
    const menge = prodMenge[p] ?? 0;
    const kosten = (prodKostenMat[p] ?? 0) + (prodKostenLohn[p] ?? 0);
    const neu = pz.lager.stueck + menge;
    const hkNeu = menge > 0 ? kosten / menge : pz.lager.hk;
    pz.lager.hk = neu > 0 ? (pz.lager.stueck * pz.lager.hk + kosten) / neu : hkNeu;
    pz.lager.stueck = neu;
    pz.letzteHk = hkNeu;
    produziert[p] = menge;
  }

  // ------------------------------------------------------------ Qualität, Technik
  const maxUeberstd = werkRes.some((r) => r.ueberstd > 0);
  const maTotal = sum(werkRes.map((r) => r.maOhneFluktuation));
  const schulungMittel = maTotal > 0 ? sum(werkRes.map((r) => r.schulungProKopf * r.maOhneFluktuation)) / maTotal : 0;
  const qP: Partial<Record<ProductId, number>> = {};
  const tP: Partial<Record<ProductId, number>> = {};
  for (const p of produkte) {
    qP[p] = qualitaet(p, dec.lieferanten, schulungMittel, maxUeberstd);
    tP[p] = technikAusStock(s.produkte[p]!.fe);
  }

  // ------------------------------------------------------------ Konkurrenz produziert
  const kProd: Record<string, KonkurrentProduktion> = {};
  for (const prof of KONKURRENTEN) {
    const k = s.konkurrenten[prof.id];
    const plan = plaene[prof.id];
    if (!k || k.status === 'pleite' || !plan) continue;
    kProd[prof.id] = produziereKonkurrent(s, k, plan);
  }

  // ------------------------------------------------------------ Markt
  const reihenfolge = regionen;
  const segmente: SegmentBericht[] = [];
  const angebote: AngebotBericht[] = [];
  const outs: Partial<Record<RegionId, Partial<Record<ProductId, SegmentOutput>>>> = {};
  const verkauft: Partial<Record<ProductId, number>> = {};
  const umsatzP: Partial<Record<ProductId, number>> = {};
  let umsatz = 0;
  let logistik = 0;
  const heimat = s.werke[0]?.region ?? 'DE';
  const regionSummen: Partial<Record<RegionId, { eigen: number; gesamt: number; marketing: number; mStar: number; umsatzEigen: number; umsatzGesamt: number }>> = {};
  const kRegion: Record<string, { eigen: number; gesamt: number; marketing: number; mStar: number; absatz: Partial<Record<ProductId, number>> }> = {};

  const restSupply: Partial<Record<ProductId, number>> = {};
  for (const p of produkte) restSupply[p] = s.produkte[p]!.lager.stueck;

  for (const r of reihenfolge) {
    outs[r] = {};
    regionSummen[r] = { eigen: 0, gesamt: 0, marketing: 0, mStar: 0, umsatzEigen: 0, umsatzGesamt: 0 };
    for (const p of produkte) {
      const zustand = s.markt[r]?.[p];
      if (!zustand) continue;
      const preis = dec.preis[p]?.[r] ?? 0;
      const marketing = dec.marketing[p]?.[r] ?? 0;
      const anbieter: Anbieter[] = [
        {
          id: SPIELER_ID,
          preis,
          marketing,
          bekanntheit: s.regionen[r]!.bekanntheit,
          technik: tP[p]!,
          qualitaet: qP[p]!,
          image: s.unternehmen.image,
          kapazitaet: restSupply[p] ?? 0,
        },
      ];
      for (const prof of KONKURRENTEN) {
        const k = s.konkurrenten[prof.id];
        const plan = plaene[prof.id];
        if (!k || !plan) continue;
        const a = konkurrentAnbieter(k, plan, p, r);
        if (a && a.preis > 0) anbieter.push(a);
      }
      const out = berechneSegment({ region: r, produkt: p, t, anbieter, zustand });
      outs[r]![p] = out;
      const absatz = out.absatz[SPIELER_ID] ?? 0;
      restSupply[p] = (restSupply[p] ?? 0) - absatz;
      verkauft[p] = (verkauft[p] ?? 0) + absatz;
      const erloes = absatz * preis;
      umsatzP[p] = (umsatzP[p] ?? 0) + erloes;
      umsatz += erloes;
      const logSatz = r === heimat ? LOGISTIK.innerhalb : LOGISTIK.uebergreifend + REGIONEN[r].zoll;
      logistik += erloes * logSatz;

      const rs = regionSummen[r]!;
      const gesamtStk = sum(Object.values(out.absatz)) + out.restAbsatz;
      rs.eigen += absatz;
      rs.gesamt += gesamtStk;
      rs.marketing += marketing;
      rs.mStar += out.mStar;
      rs.umsatzEigen += erloes;
      rs.umsatzGesamt += gesamtStk * out.pBar;
      for (const prof of KONKURRENTEN) {
        if (!(prof.id in out.absatz)) continue;
        const kr = (kRegion[prof.id] ??= { eigen: 0, gesamt: 0, marketing: 0, mStar: 0, absatz: {} });
        kr.eigen += out.absatz[prof.id];
        kr.gesamt += gesamtStk;
        kr.marketing += anbieter.find((x) => x.id === prof.id)?.marketing ?? 0;
        kr.mStar += out.mStar;
        kr.absatz[p] = (kr.absatz[p] ?? 0) + out.absatz[prof.id];
      }

      const preise: Record<string, number> = {};
      const mark: Record<string, number> = {};
      for (const a of anbieter) {
        preise[a.id] = a.preis;
        mark[a.id] = a.marketing;
      }
      segmente.push({
        region: r, produkt: p, volumen: out.volumen, durchschnittspreis: out.pBar, tBar: out.tBar,
        anteile: out.anteile, absatz: { ...out.absatz, rest: out.restAbsatz }, preise, marketing: mark,
      });
      angebote.push({
        produkt: p, region: r, preis, marketing, nachfrage: out.nachfrage[SPIELER_ID] ?? 0, absatz,
        unbedient: out.unbedient[SPIELER_ID] ?? 0, marktanteil: out.anteile[SPIELER_ID] ?? 0, umsatz: erloes,
        attraktivitaet: out.a[SPIELER_ID] ?? 0, technik: tP[p]!, technikIndex: out.technikIndex[SPIELER_ID] ?? 0, qualitaet: qP[p]!,
      });
      if (absatz < (out.nachfrage[SPIELER_ID] ?? 0) - 1) {
        warn.push(`${PRODUKTE[p].name} (${r}): Nachfrage ${Math.round(out.nachfrage[SPIELER_ID]).toLocaleString('de-DE')} Stück, aber nur ${absatz.toLocaleString('de-DE')} lieferbar.`);
      }
    }
  }

  // Lager nach Verkauf, Herstellkosten des Umsatzes
  let herstellkostenUmsatz = 0;
  let lagerKosten = 0;
  const produktBerichte: ProduktBericht[] = [];
  const umweltProdukt: Partial<Record<ProductId, number>> = {};
  for (const p of produkte) {
    const pz = s.produkte[p]!;
    const absatz = verkauft[p] ?? 0;
    const cogs = absatz * pz.lager.hk;
    herstellkostenUmsatz += cogs;
    pz.lager.stueck -= absatz;
    lagerKosten += pz.lager.stueck * pz.lager.hk * B.produktion.lagerKostenSatz + pz.materialWert * B.produktion.materialLagerSatz;
    // Umweltindex
    const produzierende = werkRes.filter((r) => (r.qty[p] ?? 0) > 0);
    const linienAlle = (produzierende.length ? produzierende : werkRes).flatMap((r) => r.werk.linien.filter((l) => l.status === 'aktiv'));
    const linienUmwelt = linienAlle.length ? sum(linienAlle.map((l) => l.umweltindex)) / linienAlle.length : 50;
    umweltProdukt[p] = 0.6 * linienUmwelt + 0.4 * lieferantenUmwelt(p, dec.lieferanten);
    const firstSeg = regionen.map((r) => outs[r]?.[p]).find(Boolean);
    const menge = prodMenge[p] ?? 0;
    produktBerichte.push({
      produkt: p,
      produziert: menge,
      geplant: prodGeplant[p] ?? 0,
      absatz,
      umsatz: umsatzP[p] ?? 0,
      hkProStueck: menge > 0 ? ((prodKostenMat[p] ?? 0) + (prodKostenLohn[p] ?? 0)) / menge : pz.letzteHk,
      lernkurve: lk[p],
      stueckkostenAbsatz: pz.lager.hk,
      nacharbeitsquote: hoursNacharbeitNenner[p] ?? 0,
      lagerEnde: pz.lager.stueck,
      technik: tP[p]!,
      technikIndex: firstSeg?.technikIndex[SPIELER_ID] ?? 105,
      umweltindex: umweltProdukt[p]!,
      qualitaet: qP[p]!,
    });
  }

  // ------------------------------------------------------------ GuV
  const marketingSumme = sum(produkte.flatMap((p) => regionen.map((r) => dec.marketing[p]?.[r] ?? 0)));
  const feSumme = sum(produkte.map((p) => dec.fe[p] ?? 0));
  const nbBudget = dec.nachhaltigkeitsbudget;
  const personalKosten = sum(werkRes.map((r) => r.hireFireTrain + r.leer + r.premium));
  const fgk =
    sum(werkRes.map((r) => r.energie + r.linienFix + r.wartung + r.schicht)) + nacharbeitGesamt + lagerKosten;
  const vertriebKosten = sum(regionen.map((r) => (s.unternehmen.vertrieb[r] ?? 0) * B.personal.vertriebGehalt));
  const skala = umsatz > 0 ? Math.pow(umsatz / B.verwaltung.umsatzBasis, B.verwaltung.exponent) : 0;
  const tEigen = produkte.length ? sum(produkte.map((p) => tP[p]!)) / produkte.length : 0;
  const maVerw = B.verwaltung.basisVerwaltung * skala;
  const maEink = B.verwaltung.basisEinkauf * skala * (1 + 0.2 * tEigen);
  const abgabe = sum(
    werkRes
      .filter((r) => r.werk.region === 'DE' || r.werk.region === 'EU')
      .map((r) => {
        const aktiv = r.werk.linien.filter((l) => l.status === 'aktiv');
        if (!aktiv.length) return 0;
        return umweltabgabe(sum(aktiv.map((l) => l.umweltindex)) / aktiv.length, aktiv.length);
      }),
  );
  const hqUnterhalt = s.unternehmen.firmensitz.buchwert * B.finanzen.hqUnterhaltSatz;
  const verwaltung = (maVerw + maEink) * B.personal.verwaltungGehalt + B.finanzen.verwaltungSachkosten + hqUnterhalt + abgabe;

  // Abschreibungen
  let afa = 0;
  for (const w of s.werke) {
    if (w.gebaeudeRestlaufzeit > 0) afa += w.gebaeudeBuchwert / w.gebaeudeRestlaufzeit;
    for (const l of w.linien) afa += linienAfa(l);
  }
  const hqAfa = Math.min(s.unternehmen.firmensitz.buchwert, s.unternehmen.firmensitz.anschaffung / B.finanzen.abschreibungHqQuartale);
  afa += hqAfa;

  const deckungsbeitrag = umsatz - herstellkostenUmsatz - logistik;
  const ebit =
    deckungsbeitrag - marketingSumme - feSumme - nbBudget - personalKosten - fgk - vertriebKosten - verwaltung - afa + sonstErtrag - sonstAufwand;
  const zinsen = zinsDarlehen + zinsKontokorrent;
  const ebt = ebit - zinsen;
  let steuern = 0;
  if (ebt > 0) {
    const zuVersteuern = Math.max(0, ebt - fin.verlustvortrag);
    fin.verlustvortrag = Math.max(0, fin.verlustvortrag - ebt);
    steuern = zuVersteuern * B.finanzen.steuersatz;
  } else {
    fin.verlustvortrag += -ebt;
  }
  const ueberschuss = ebt - steuern;
  const guv: GuV = {
    umsatz, herstellkosten: herstellkostenUmsatz, logistik, deckungsbeitrag, marketing: marketingSumme, fe: feSumme,
    nachhaltigkeit: nbBudget, marktforschung: 0, fertigungsgemeinkosten: fgk, personal: personalKosten, vertrieb: vertriebKosten,
    verwaltung, sonstigeErtraege: sonstErtrag, sonstigerAufwand: sonstAufwand, abschreibungen: afa, ebit, ebitda: ebit + afa,
    zinsen, ebt, steuern, ueberschuss,
  };

  // ------------------------------------------------------------ Zahlungen
  const forderungenEnde = umsatz * B.finanzen.forderungenAnteil;
  const einzahlungKunden = umsatz - forderungenEnde + forderungenAnfang;
  const materialKauf = sum(produkte.map((p) => prodKostenMat[p] ?? 0));
  const verbindlichkeitenEnde = materialKauf * B.finanzen.verbindlichkeitenAnteil;
  const auszahlungMaterial = materialKauf - verbindlichkeitenEnde + verbindlichkeitenAnfang;
  const laborCash = sum(werkRes.map((r) => r.laborCash));
  const hireFireTrain = sum(werkRes.map((r) => r.hireFireTrain));
  const periodenKosten =
    sum(werkRes.map((r) => r.energie + r.linienFix + r.wartung + r.schicht)) + nacharbeitGesamt + lagerKosten + logistik +
    marketingSumme + feSumme + nbBudget + vertriebKosten + verwaltung;
  const operativAuszahlung = auszahlungMaterial + laborCash + hireFireTrain + periodenKosten + zinsen + steuern;
  const regTilgung = sum(fin.kredite.map((k) => Math.min(k.tilgung, k.restbetrag)));
  const dividende = dec.finanzen.dividende;

  let cash = kasseAnfang + einzahlungKunden - operativAuszahlung - capex + desinv + darlehenNeu - tilgungExtraGezahlt - regTilgung - dividende;
  cash -= kontokorrentAlt;
  let kontokorrentNeu = 0;
  if (cash < B.finanzen.mindestkasse) {
    kontokorrentNeu = B.finanzen.mindestkasse - cash;
    cash = B.finanzen.mindestkasse;
  }

  // ------------------------------------------------------------ Zustand fortschreiben
  for (const k of fin.kredite) k.restbetrag = Math.max(0, k.restbetrag - Math.min(k.tilgung, k.restbetrag));
  fin.kredite = fin.kredite.filter((k) => k.restbetrag > 0.005);
  fin.kasse = cash;
  fin.kontokorrent = kontokorrentNeu;
  fin.forderungen = forderungenEnde;
  fin.verbindlichkeiten = verbindlichkeitenEnde;
  fin.gewinnruecklagen += ueberschuss - dividende;

  for (const w of s.werke) {
    if (w.gebaeudeRestlaufzeit > 0) {
      w.gebaeudeBuchwert -= w.gebaeudeBuchwert / w.gebaeudeRestlaufzeit;
      w.gebaeudeRestlaufzeit -= 1;
      if (w.gebaeudeRestlaufzeit === 0) w.gebaeudeBuchwert = 0;
    }
    for (const l of w.linien) {
      if (l.status === 'aktiv' && l.restlaufzeit > 0) {
        l.buchwert -= l.buchwert / l.restlaufzeit;
        l.restlaufzeit -= 1;
        if (l.restlaufzeit === 0) l.buchwert = 0;
      } else if (l.status === 'bau') {
        l.bauRest -= 1;
        if (l.bauRest <= 0) l.status = 'aktiv';
      }
    }
  }
  s.unternehmen.firmensitz.buchwert -= hqAfa;

  // Personal, Motivation, Kompetenz
  const werkBerichte: WerkBericht[] = [];
  for (const r of werkRes) {
    const w = r.werk;
    const U = clamp(Math.max(r.uLinien, r.uPersonal), 0, 1.3);
    const M = B.personal.motivation;
    const entlassQuote = r.maOhneFluktuation + r.fired > 0 ? r.fired / (r.maOhneFluktuation + r.fired) : 0;
    const mZiel =
      1 - 1.5 * Math.pow(U - M.optimaleAuslastung, 2) + 0.1 * (1 - Math.exp(-r.schulungProKopf / M.schulungsEffektBei)) - M.entlassungsEffekt * entlassQuote;
    const mNeu = clamp(w.motivation + M.anpassung * (mZiel - w.motivation), M.min, M.max);
    const K = B.personal.kompetenz;
    const kZiel = K.basis + K.bonus * (1 - Math.exp(-r.schulungProKopf / K.schulungBei));
    const kNeu = w.kompetenz + K.anpassung * (kZiel - w.kompetenz);
    werkBerichte.push({
      id: w.id, name: w.name, maschinenStunden: r.maschStd, personalStundenRegulaer: r.regStd, maxStunden: r.maxStd,
      benoetigteStunden: r.noetig, ueberstunden: r.ueberstd, auslastung: Math.max(r.uLinien, r.uPersonal),
      auslastungLinien: r.uLinien, auslastungPersonal: r.uPersonal, produktivitaetI: r.prodI, motivation: w.motivation,
      kompetenz: w.kompetenz, einarbeitung: r.einarbeitung, mitarbeitende: r.maOhneFluktuation, lohnkosten: r.laborCash,
      leerkosten: r.leer, gekuerzt: r.gekuerzt,
    });
    w.motivation = mNeu;
    w.kompetenz = kNeu;
    // Fluktuation
    const erwartet = w.mitarbeitende * B.personal.fluktuation * (2 - mNeu);
    const abgang = zufall ? Math.floor(erwartet + rng.next()) : Math.round(erwartet);
    w.mitarbeitende = Math.max(1, w.mitarbeitende - abgang);
  }

  // Produkte: Erfahrung, Technik
  for (const p of produkte) {
    const pz = s.produkte[p]!;
    pz.kumMenge += prodMenge[p] ?? 0;
    pz.fe = (1 - B.technik.veralterung) * pz.fe + (dec.fe[p] ?? 0);
  }

  // Marke (5.4) und Marktzustand
  for (const r of reihenfolge) {
    const rs = regionSummen[r]!;
    const reg = s.regionen[r]!;
    const verh = rs.mStar > 0 ? rs.marketing / rs.mStar : 0;
    const b0 = reg.bekanntheit;
    reg.bekanntheit = clamp(
      b0 * (1 - B.marke.vergessen) +
        (1 - b0) * (B.marke.werbewirkung * (1 - Math.exp(-B.marke.werbeSkala * verh)) + B.marke.mundpropaganda * reg.marktanteil),
      0.001,
      0.95,
    );
    reg.marktanteil = rs.gesamt > 0 ? rs.eigen / rs.gesamt : 0;
    for (const p of produkte) {
      const out = outs[r]?.[p];
      const z = s.markt[r]?.[p];
      if (!out || !z) continue;
      const alt = z.anteile[SPIELER_ID] ?? 0;
      s.spielerAnteilDelta[p] = (out.anteile[SPIELER_ID] ?? 0) - alt;
      z.anteile = out.anteile;
      z.durchschnittspreis = out.pBar;
      z.tBar = out.tBar;
      z.volumen = out.volumen;
      z.tRest *= 1 + B.restmarkt.technikWachstumProQuartal;
    }
  }

  // Nachhaltigkeit und Image (13)
  const gewichtUmsatz = sum(produkte.map((p) => verkauft[p] ?? 0));
  const uUnt = gewichtUmsatz > 0
    ? sum(produkte.map((p) => (umweltProdukt[p] ?? 0) * (verkauft[p] ?? 0))) / gewichtUmsatz
    : sum(produkte.map((p) => umweltProdukt[p] ?? 0)) / Math.max(1, produkte.length);
  const nbStern = Math.max(B.nachhaltigkeit.nbSternAnteil * umsatz, B.nachhaltigkeit.nbSternMin);
  const nZiel = B.nachhaltigkeit.umweltfaktor * uUnt + B.nachhaltigkeit.budgetMax * (1 - Math.exp(-nbBudget / nbStern));
  const nNeu = clamp(s.unternehmen.nachhaltigkeit + B.nachhaltigkeit.anpassung * (nZiel - s.unternehmen.nachhaltigkeit), 0, 100);
  const qMittel = gewichtUmsatz > 0
    ? sum(produkte.map((p) => (qP[p] ?? 1) * (verkauft[p] ?? 0))) / gewichtUmsatz
    : sum(produkte.map((p) => qP[p] ?? 1)) / Math.max(1, produkte.length);
  const iZiel = B.image.basis + B.image.nachhaltigkeitsFaktor * nNeu + (B.image.qualitaetsFaktor * (qMittel - 0.8)) / 0.4 + hqImageBonus(s);
  s.unternehmen.image = clamp(s.unternehmen.image + B.image.anpassung * (iZiel - s.unternehmen.image) + imageSchock, 0, 100);
  s.unternehmen.nachhaltigkeit = nNeu;
  s.unternehmen.umweltindex = uUnt;

  // Konkurrenz buchen
  const konkurrenzBericht: QuarterReport['konkurrenz'] = [];
  for (const prof of KONKURRENTEN) {
    const k = s.konkurrenten[prof.id];
    const plan = plaene[prof.id];
    if (!k) continue;
    if (k.status === 'aktiv' && plan && kProd[prof.id]) {
      const kr = kRegion[prof.id] ?? { eigen: 0, gesamt: 1, marketing: 0, mStar: 1, absatz: {} };
      const wasAktiv = k.status === 'aktiv';
      buchungKonkurrent(k, plan, kProd[prof.id], kr.absatz, kr.gesamt > 0 ? kr.eigen / kr.gesamt : 0, kr.mStar > 0 ? kr.marketing / kr.mStar : 0);
      if (wasAktiv && (k.status as string) === 'pleite') meldungen.push(`${k.name} ist insolvent!`);
    }
    konkurrenzBericht.push({
      id: k.id, name: k.name, farbe: k.farbe, status: k.status, umsatz: k.letzterUmsatz, ebit: k.letztesEbit, bilanzsumme: k.bilanzsumme,
    });
  }

  // ------------------------------------------------------------ Bilanz, Rating, Kennzahlen
  s.ebitdaHistorie.push(guv.ebitda);
  s.umsatzHistorie.push(umsatz);
  s.ebitHistorie.push(ebit);
  const bilanz: Bilanz = baueBilanz(s);
  const nettoschulden = bilanz.darlehen + bilanz.kontokorrent - bilanz.kasse;
  const rt = berechneRating({
    eigenkapital: bilanz.eigenkapital,
    bilanzsumme: bilanz.aktiva,
    nettoschulden,
    ebitda4Q: ebitda4Q(s),
    ebit4Q: ebit4Q(s),
    umsatz4Q: umsatz4Q(s),
  });
  fin.rating = rt.stufe;
  fin.ratingScore = rt.score;
  const limit = kreditlimit(s);
  const uw = unternehmenswert(s, nettoschulden);

  const vorraeteEnde = bilanz.vorraeteFertig + bilanz.vorraeteMaterial;
  const operativ = ueberschuss + afa + (sonstAufwand - sonstErtrag) - (forderungenEnde - forderungenAnfang) - (vorraeteEnde - vorraeteAnfang) + (verbindlichkeitenEnde - verbindlichkeitenAnfang);
  const investition = -capex + desinv;
  const finanzierung = darlehenNeu - tilgungExtraGezahlt - regTilgung + (kontokorrentNeu - kontokorrentAlt) - dividende;
  const kapitalfluss: Kapitalfluss = {
    ueberschuss, abschreibungen: afa, ergebnisAnlagenabgang: sonstAufwand - sonstErtrag,
    veraenderungForderungen: -(forderungenEnde - forderungenAnfang), veraenderungVorraete: -(vorraeteEnde - vorraeteAnfang),
    veraenderungVerbindlichkeiten: verbindlichkeitenEnde - verbindlichkeitenAnfang, operativ,
    investitionen: -capex, desinvestitionen: desinv, investition, darlehenNeu, tilgung: -(tilgungExtraGezahlt + regTilgung),
    kontokorrent: kontokorrentNeu - kontokorrentAlt, dividende: -dividende, finanzierung,
    gesamt: operativ + investition + finanzierung, kasseAnfang, kasseEnde: cash,
  };

  // Insolvenz
  const kritisch = fin.kontokorrent > limit + 0.5 || bilanz.eigenkapital < 0;
  fin.kritischZaehler = kritisch ? fin.kritischZaehler + 1 : 0;
  if (kritisch) warn.push('Achtung: Kontokorrent über dem Kreditlimit bzw. negatives Eigenkapital!');
  if (!s.spielende && fin.kritischZaehler >= B.finanzen.insolvenzQuartale) {
    s.spielende = { grund: 'Insolvenz: Das Unternehmen ist zahlungsunfähig bzw. überschuldet.', quartal: t };
    meldungen.push('INSOLVENZ – das Spiel ist vorbei.');
  }

  // Marktanteil gesamt (umsatzbasiert)
  const sumEigen = sum(regionen.map((r) => regionSummen[r]!.umsatzEigen));
  const sumGesamt = sum(regionen.map((r) => regionSummen[r]!.umsatzGesamt));
  const marktanteil = sumGesamt > 0 ? sumEigen / sumGesamt : 0;

  s.kpiHistorie.push({
    quartal: t, umsatz, ebit, ueberschuss, kasse: cash, marktanteil, unternehmenswert: uw.eigenkapitalwert,
    image: s.unternehmen.image, absatz: sum(produkte.map((p) => verkauft[p] ?? 0)),
  });

  // ------------------------------------------------------------ Nächstes Quartal
  s.letzteEntscheidungen = dec;
  s.quartal = t + 1;
  s.konkurrenzVorquartal = plaene;
  if (zufall) {
    s.konkurrenzPlaene = planKonkurrenten(s, rng);
  }
  s.rngState = rng.getState();

  const report: QuarterReport = {
    quartal: t,
    guv,
    bilanz,
    kapitalfluss,
    angebote,
    segmente,
    werke: werkBerichte,
    produkte: produktBerichte,
    kennzahlen: {
      umsatz4Q: umsatz4Q(s), ebitda4Q: ebitda4Q(s), ebit4Q: ebit4Q(s), kreditlimit: limit, rating: rt.stufe, ratingScore: rt.score,
      unternehmenswert: uw.ev, eigenkapitalwert: uw.eigenkapitalwert, marktanteil, absatz: sum(produkte.map((p) => verkauft[p] ?? 0)),
      nettofinanzschulden: nettoschulden, image: s.unternehmen.image, nachhaltigkeit: s.unternehmen.nachhaltigkeit,
    },
    konkurrenz: konkurrenzBericht,
    warnungen: warn,
    meldungen,
  };
  void KONKURRENZ_PRODUKTE;
  void sachanlagen;
  void uUndMengen;
  return { nextState: s, report };
}

/** Live-Vorschau: Konkurrenz wiederholt das Vorquartal, keine Zufallsereignisse. */
export function previewQuarter(state: GameState, dec: Decisions): QuarterReport {
  return simulateQuarter(state, dec, new Rng(0), { konkurrenzModus: 'wiederholung', zufall: false }).report;
}
