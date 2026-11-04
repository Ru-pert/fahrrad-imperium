import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { neuesSpiel, simulateQuarter, previewQuarter, standardEntscheidungen, SPIELER_ID } from './index';
import type { Decisions, GameState, QuarterReport } from './index';
import { botEntscheidungen, STANDARD_BOT } from './bot';
import { berechneSegment, preisFunktion, technikAusStock } from './market';
import { lernkurve } from './production';
import { PRODUKTE } from './config/products';
import { sachanlagen } from './finance';

const neu = (seed = 42): GameState =>
  neuesSpiel({ firmenname: 'Test GmbH', farbe: '#0d9488', schwierigkeit: 'normal', profi: false, seed, startProdukte: ['stadtrad', 'ebike'] });

function spiele(
  start: GameState,
  quartale: number,
  fn: (s: GameState, r: QuarterReport | null) => Decisions,
  jedesQuartal?: (s: GameState, r: QuarterReport, vorher: GameState) => void,
): { state: GameState; report: QuarterReport | null } {
  let s = start;
  let r: QuarterReport | null = null;
  for (let i = 0; i < quartale; i++) {
    const d = fn(s, r);
    const res = simulateQuarter(s, d);
    jedesQuartal?.(res.nextState, res.report, s);
    s = res.nextState;
    r = res.report;
    if (s.spielende) break;
  }
  return { state: s, report: r };
}

const bot = (s: GameState, r: QuarterReport | null) => botEntscheidungen(s, r);

describe('RNG', () => {
  it('ist deterministisch und speicherbar', () => {
    const a = new Rng(7);
    const b = new Rng(7);
    expect([a.next(), a.next(), a.normal()]).toEqual([b.next(), b.next(), b.normal()]);
    const state = a.getState();
    const x = a.next();
    expect(Rng.fromState(state).next()).toBe(x);
  });
});

describe('Startzustand', () => {
  it('entspricht den Startwerten der Spezifikation', () => {
    const s = neu();
    expect(s.finanzen.kasse).toBe(1_500_000);
    expect(s.finanzen.gezeichnetesKapital).toBe(1_000_000);
    expect(s.finanzen.kredite[0].restbetrag).toBe(1_000_000);
    expect(s.werke[0].linien).toHaveLength(2);
    expect(s.werke[0].mitarbeitende).toBe(24);
    expect(s.produkte.stadtrad!.lager.stueck).toBe(300);
    expect(s.produkte.ebike!.fe).toBe(100_000);
    expect(sachanlagen(s)).toBeCloseTo(1_200_000, 0);
  });
  it('kalibriert den Spieler auf 0,3 % Marktanteil je Segment', () => {
    const s = neu();
    for (const p of ['stadtrad', 'ebike'] as const) {
      expect(s.markt.DE![p]!.anteile[SPIELER_ID]).toBeCloseTo(0.003, 4);
    }
  });
  it('Eröffnungsbilanz geht auf', () => {
    const s = neu();
    const r = previewQuarter(s, standardEntscheidungen(s));
    expect(Math.abs(r.bilanz.aktiva - r.bilanz.passiva)).toBeLessThan(1e-6);
  });
});

describe('Determinismus', () => {
  it('gleicher Seed + gleiche Entscheidungen = gleiches Ergebnis', () => {
    const a = spiele(neu(5), 12, bot);
    const b = spiele(neu(5), 12, bot);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(JSON.stringify(a.report)).toBe(JSON.stringify(b.report));
  });
  it('anderer Seed führt zu anderem Verlauf', () => {
    const a = spiele(neu(5), 12, bot);
    const b = spiele(neu(6), 12, bot);
    expect(JSON.stringify(a.state)).not.toBe(JSON.stringify(b.state));
  });
  it('simulateQuarter verändert den Eingangszustand nicht', () => {
    const s = neu();
    const snap = JSON.stringify(s);
    simulateQuarter(s, standardEntscheidungen(s));
    previewQuarter(s, standardEntscheidungen(s));
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('Buchhaltung', () => {
  it('Aktiva = Passiva und Kapitalfluss stimmt in 100 Quartalen', () => {
    let maxAbw = 0;
    let maxCf = 0;
    let n = 0;
    spiele(neu(11), 100, bot, (_s, r) => {
      n++;
      maxAbw = Math.max(maxAbw, Math.abs(r.bilanz.aktiva - r.bilanz.passiva));
      maxCf = Math.max(maxCf, Math.abs(r.kapitalfluss.gesamt - (r.kapitalfluss.kasseEnde - r.kapitalfluss.kasseAnfang)));
    });
    expect(n).toBe(100);
    expect(maxAbw).toBeLessThan(0.01);
    expect(maxCf).toBeLessThan(0.01);
  });
  it('Aktiva = Passiva auch mit Kredit, Dividende, Linienverkauf und Firmensitz', () => {
    let s = neu(3);
    const aktionen: ((d: Decisions) => void)[] = [
      (d) => { d.finanzen.darlehenNeu = 400_000; },
      (d) => { d.werke['DE-1'].linienKaufen = [{ typ: 'B', anzahl: 1 }]; d.firmensitz.kaufen = ['hinterhofbuero']; },
      (d) => { d.finanzen.tilgungExtra = 100_000; d.finanzen.dividende = 50_000; },
      (d) => { d.werke['DE-1'].personalAenderung = -3; },
    ];
    for (let i = 0; i < 20; i++) {
      const d = standardEntscheidungen(s);
      aktionen[i]?.(d);
      const { nextState, report } = simulateQuarter(s, d);
      expect(Math.abs(report.bilanz.aktiva - report.bilanz.passiva)).toBeLessThan(0.01);
      expect(Math.abs(report.kapitalfluss.gesamt - (report.kapitalfluss.kasseEnde - report.kapitalfluss.kasseAnfang))).toBeLessThan(0.01);
      s = nextState;
    }
  });
  it('Linienverkauf bucht Restbuchwert als Aufwand und Erlös als Ertrag', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    d.werke['DE-1'].linienVerkaufen = ['DE-1-L2'];
    // Stufe 3 erforderlich → Profimodus
    const p = neuesSpiel({ firmenname: 'P', farbe: '#000', schwierigkeit: 'normal', profi: true, seed: 1, startProdukte: ['stadtrad', 'ebike'] });
    const dp = standardEntscheidungen(p);
    dp.werke['DE-1'].linienVerkaufen = ['DE-1-L2'];
    const { report } = simulateQuarter(p, dp);
    expect(report.guv.sonstigerAufwand).toBeCloseTo(210_000, 0);
    expect(report.guv.sonstigeErtraege).toBeCloseTo(210_000 * 0.4, 0);
    void d;
  });
});

describe('Markt', () => {
  it('Anteile inklusive Restmarkt summieren sich zu 100 %, Absatz ≤ Lager + Produktion', () => {
    spiele(neu(8), 30, bot, (_n, r, vorher) => {
      for (const seg of r.segmente) {
        const total = Object.values(seg.anteile).reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(1, 9);
      }
      for (const p of r.produkte) {
        const lagerVor = vorher.produkte[p.produkt]!.lager.stueck;
        expect(p.absatz).toBeLessThanOrEqual(lagerVor + p.produziert);
        expect(p.lagerEnde).toBeGreaterThanOrEqual(0);
      }
    });
  });

  const segment = (preisFaktor: number, produkt: 'stadtrad' | 'emtb') => {
    const zustand = {
      a0Start: 40, anteile: { rest: 0.97, spieler: 0.01, x: 0.02 }, durchschnittspreis: PRODUKTE[produkt].referenzpreis,
      tBar: 0.5, tRest: 0.5, volumen: 300_000,
    };
    const ref = PRODUKTE[produkt].referenzpreis;
    const mk = (pf: number) => berechneSegment({
      region: 'DE', produkt, t: 0, zustand,
      anbieter: [
        { id: 'spieler', preis: ref * pf, marketing: 50_000, bekanntheit: 0.05, technik: 0.5, qualitaet: 1, image: 50, kapazitaet: 1e9 },
        { id: 'x', preis: ref, marketing: 50_000, bekanntheit: 0.05, technik: 0.5, qualitaet: 1, image: 50, kapazitaet: 1e9 },
      ],
    });
    return mk(preisFaktor).nachfrage.spieler / mk(1).nachfrage.spieler;
  };

  it('5 % Preissenkung wirkt beim Stadtrad deutlich stärker als beim E-MTB', () => {
    const stadt = segment(0.9, 'stadtrad');
    const emtb = segment(0.9, 'emtb');
    expect(stadt).toBeGreaterThan(1);
    expect(emtb).toBeGreaterThan(1);
    expect(stadt - 1).toBeGreaterThan((emtb - 1) * 1.5);
  });

  it('Preisfunktion ist stetig am Korridorrand und monoton fallend', () => {
    for (const eps of [1, 2.5]) {
      expect(preisFunktion(1.02 + 1e-9, eps)).toBeCloseTo(preisFunktion(1.02 - 1e-9, eps), 6);
      expect(preisFunktion(0.98 - 1e-9, eps)).toBeCloseTo(preisFunktion(0.98 + 1e-9, eps), 6);
      let last = Infinity;
      for (let r = 0.5; r <= 1.5; r += 0.01) {
        const f = preisFunktion(r, eps);
        expect(f).toBeLessThanOrEqual(last + 1e-12);
        last = f;
      }
    }
  });

  it('Kann ein Anbieter nicht liefern, wandern Anteile zur Konkurrenz (max. 80 %)', () => {
    const zustand = { a0Start: 40, anteile: { rest: 0.97, spieler: 0.01, x: 0.02 }, durchschnittspreis: 650, tBar: 0.5, tRest: 0.5, volumen: 300_000 };
    const mk = (kap: number) => berechneSegment({
      region: 'DE', produkt: 'stadtrad', t: 0, zustand,
      anbieter: [
        { id: 'spieler', preis: 650, marketing: 50_000, bekanntheit: 0.2, technik: 0.5, qualitaet: 1, image: 50, kapazitaet: kap },
        { id: 'x', preis: 650, marketing: 50_000, bekanntheit: 0.05, technik: 0.5, qualitaet: 1, image: 50, kapazitaet: 1e9 },
      ],
    });
    const voll = mk(1e9);
    const knapp = mk(100);
    expect(knapp.absatz.spieler).toBe(100);
    expect(knapp.absatz.x + knapp.restAbsatz).toBeGreaterThan(voll.absatz.x + voll.restAbsatz);
    const verlust = voll.absatz.spieler - 100;
    const zusatz = knapp.absatz.x + knapp.restAbsatz - (voll.absatz.x + voll.restAbsatz);
    expect(zusatz).toBeLessThanOrEqual(verlust * 0.8 + 3);
  });

  it('Produkt unter Technikindex 100 verliert sichtbar Absatz', () => {
    const base = { a0Start: 40, anteile: { rest: 0.97, spieler: 0.01, x: 0.02 }, durchschnittspreis: 2800, tBar: 1.0, tRest: 1.0, volumen: 300_000 };
    const mk = (technik: number) => berechneSegment({
      region: 'DE', produkt: 'ebike', t: 0, zustand: base,
      anbieter: [
        { id: 'spieler', preis: 2800, marketing: 50_000, bekanntheit: 0.05, technik, qualitaet: 1, image: 50, kapazitaet: 1e9 },
        { id: 'x', preis: 2800, marketing: 50_000, bekanntheit: 0.05, technik: 1.0, qualitaet: 1, image: 50, kapazitaet: 1e9 },
      ],
    });
    const gut = mk(1.0).absatz.spieler;
    const schlecht = mk(0.6).absatz.spieler; // TI = 105 + 12·(−0,4) ≈ 100,2 → knapp markttauglich
    const unmarktfaehig = mk(0.4).absatz.spieler; // TI ≈ 97,8 < 100
    expect(schlecht).toBeLessThan(gut);
    expect(unmarktfaehig).toBeLessThan(schlecht * 0.4);
  });
});

describe('Produktion', () => {
  it('Erfahrungskurve: Verdopplung spart rund 10 %, Untergrenze 60 %', () => {
    expect(lernkurve(2000)).toBeCloseTo(1, 9);
    expect(lernkurve(4000)).toBeCloseTo(0.901, 2);
    expect(lernkurve(1e12)).toBe(0.6);
  });
  it('Produktion über Kapazität wird gekürzt und gewarnt', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    d.produktion.stadtrad!['DE-1'] = 50_000;
    const { report } = simulateQuarter(s, d);
    expect(report.warnungen.some((w) => w.includes('Kapazität'))).toBe(true);
    expect(report.werke[0].benoetigteStunden).toBeLessThanOrEqual(report.werke[0].maxStunden + 1e-6);
  });
  it('Überstunden kosten Zuschlag und Schichtkosten', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    d.produktion.stadtrad!['DE-1'] = 1500;
    d.produktion.ebike!['DE-1'] = 900;
    const { report } = simulateQuarter(s, d);
    expect(report.werke[0].ueberstunden).toBeGreaterThan(0);
    const d2 = standardEntscheidungen(s);
    const r2 = simulateQuarter(s, d2).report;
    expect(report.guv.fertigungsgemeinkosten - r2.guv.fertigungsgemeinkosten).toBeGreaterThan(20_000);
  });
  it('Einstellungen sind auf +50 % (mindestens 20), Entlassungen auf −20 % begrenzt', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    d.werke['DE-1'].personalAenderung = 100;
    const r = simulateQuarter(s, d);
    expect(r.report.werke[0].mitarbeitende).toBe(44);
    expect(r.report.warnungen.some((w) => w.includes('Limit'))).toBe(true);
  });
  it('Teurere Lieferanten erhöhen Herstellkosten und Qualität', () => {
    const s = neuesSpiel({ firmenname: 'P', farbe: '#000', schwierigkeit: 'normal', profi: true, seed: 1, startProdukte: ['stadtrad', 'ebike'] });
    const d = standardEntscheidungen(s);
    const d2 = standardEntscheidungen(s);
    d2.lieferanten = { rahmen: 'premium', akku: 'premium', antrieb: 'premium' };
    const a = simulateQuarter(s, d, new Rng(1), { zufall: false }).report;
    const b = simulateQuarter(s, d2, new Rng(1), { zufall: false }).report;
    expect(b.produkte[1].hkProStueck).toBeGreaterThan(a.produkte[1].hkProStueck);
    expect(b.produkte[1].qualitaet).toBeGreaterThan(a.produkte[1].qualitaet);
  });
  it('Komplexitätsstufen: Lieferanten sind in Q1 gesperrt und werden auf Standard gesetzt', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    d.lieferanten = { rahmen: 'premium', akku: 'premium', antrieb: 'premium' };
    const { nextState } = simulateQuarter(s, d);
    expect(nextState.letzteEntscheidungen.lieferanten.akku).toBe('standard');
  });
});

describe('Finanzen', () => {
  it('Darlehen wird linear über 8 Quartale getilgt', () => {
    let s = neu();
    for (let i = 0; i < 8; i++) {
      const { nextState } = simulateQuarter(s, standardEntscheidungen(s));
      s = nextState;
    }
    expect(s.finanzen.kredite.reduce((a, k) => a + k.restbetrag, 0)).toBeLessThan(1);
  });
  it('Darlehen über dem Kreditlimit wird begrenzt', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    d.finanzen.darlehenNeu = 50_000_000;
    const { report } = simulateQuarter(s, d);
    expect(report.warnungen.some((w) => w.includes('Kreditlimit'))).toBe(true);
  });
  it('Dividende ist nur bei Gewinnrücklagen > 0 möglich', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    d.finanzen.dividende = 100_000;
    const { report, nextState } = simulateQuarter(s, d);
    expect(report.kapitalfluss.dividende === 0).toBe(true);
    expect(nextState.finanzen.gewinnruecklagen).toBeCloseTo(report.guv.ueberschuss, 6);
  });
  it('Kontokorrent sichert die Mindestkasse', () => {
    const s = neu();
    s.finanzen.kasse = 10_000;
    const { nextState } = simulateQuarter(s, standardEntscheidungen(s));
    expect(nextState.finanzen.kasse).toBeGreaterThanOrEqual(50_000 - 1e-6);
  });
  it('Steuer: 30 % auf positives EBT mit Verlustvortrag', () => {
    const s = neu();
    s.finanzen.verlustvortrag = 0;
    const { report } = simulateQuarter(s, standardEntscheidungen(s));
    if (report.guv.ebt > 0) expect(report.guv.steuern).toBeCloseTo(report.guv.ebt * 0.3, 6);
  });
});

describe('Balancing-Bots', () => {
  it('Standardbot überlebt 60 Quartale', () => {
    const { state } = spiele(neu(21), 60, bot);
    expect(state.spielende).toBeNull();
    expect(state.quartal).toBe(60);
  });
  it('Bot mit „Preis 40 % unter Markt“ geht innerhalb von 12 Quartalen pleite', () => {
    const { state } = spiele(neu(21), 12, (s, r) => botEntscheidungen(s, r, { ...STANDARD_BOT, preisFaktor: 0.6 }));
    expect(state.spielende).not.toBeNull();
  });
});

describe('Leistung', () => {
  it('ein Quartalsabschluss dauert nach 100 Quartalen deutlich unter 1 Sekunde', () => {
    const { state, report } = spiele(neu(2), 100, bot);
    const t0 = performance.now();
    simulateQuarter(state, botEntscheidungen(state, report));
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

describe('Vorschau', () => {
  it('Vorschau ist reproduzierbar und liefert Auslastung, Stückkosten und Kasse', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    const a = previewQuarter(s, d);
    const b = previewQuarter(s, d);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.werke[0].auslastung).toBeGreaterThan(0);
    expect(a.produkte[0].hkProStueck).toBeGreaterThan(0);
    expect(a.bilanz.kasse).toBeGreaterThan(0);
  });
  it('Technik wächst mit F&E: T = ln(1 + F/200.000)', () => {
    expect(technikAusStock(100_000)).toBeCloseTo(Math.log(1.5), 9);
  });
});

describe('Ereignisse und Zeitung', () => {
  it('Ereignisse treten auf, Bilanz bleibt ausgeglichen, jede Runde gibt es eine Zeitung', () => {
    const ids = new Set<string>();
    let s = neu(77);
    expect(s.zeitung?.schlagzeile).toBeTruthy();
    let r: QuarterReport | null = null;
    for (let i = 0; i < 60 && !s.spielende; i++) {
      const res = simulateQuarter(s, botEntscheidungen(s, r), undefined, { vorherBericht: r });
      for (const e of res.nextState.ereignisse) ids.add(e.id);
      expect(Math.abs(res.report.bilanz.aktiva - res.report.bilanz.passiva)).toBeLessThan(0.01);
      expect(res.report.zeitung?.artikel.length).toBeGreaterThan(1);
      s = res.nextState;
      r = res.report;
    }
    expect(ids.size).toBeGreaterThanOrEqual(4);
  });
  it('Akku-Engpass begrenzt die E-Bike-Produktion auf 70 %', () => {
    const s = neu();
    s.ereignisse = [{ id: 'akkuengpass', rest: 2, neu: true }];
    const d = standardEntscheidungen(s);
    const r = simulateQuarter(s, d, new Rng(1), { zufall: false }).report;
    const e = r.produkte.find((p) => p.produkt === 'ebike')!;
    expect(e.produziert).toBe(Math.round(800 * 0.7));
  });
  it('Kaufprämie erhöht die E-Bike-Nachfrage', () => {
    const s = neu();
    const d = standardEntscheidungen(s);
    const ohne = previewQuarter(s, d).angebote.find((a) => a.produkt === 'ebike')!.nachfrage;
    s.ereignisse = [{ id: 'kaufpraemie', rest: 4, neu: true }];
    const mit = previewQuarter(s, d).angebote.find((a) => a.produkt === 'ebike')!.nachfrage;
    expect(mit / ohne).toBeGreaterThan(1.15);
  });
});

describe('Hallenerweiterung', () => {
  it('ist erst bei voller Halle möglich und bringt 4 Plätze', () => {
    let s = neuesSpiel({ firmenname: 'P', farbe: '#000', schwierigkeit: 'normal', profi: true, seed: 3, startProdukte: ['stadtrad', 'ebike'] });
    s.finanzen.kasse += 18_500_000;
    s.finanzen.kapitalruecklage += 18_500_000;
    let d = standardEntscheidungen(s);
    d.werke['DE-1'].halleErweitern = true;
    let r = simulateQuarter(s, d);
    expect(r.report.warnungen.some((w) => w.includes('erst erweitert'))).toBe(true);
    d = standardEntscheidungen(r.nextState);
    d.werke['DE-1'].linienKaufen = [{ typ: 'B', anzahl: 2 }];
    r = simulateQuarter(r.nextState, d);
    s = r.nextState;
    d = standardEntscheidungen(s);
    d.werke['DE-1'].halleErweitern = true;
    r = simulateQuarter(s, d);
    expect(Math.abs(r.report.bilanz.aktiva - r.report.bilanz.passiva)).toBeLessThan(0.01);
    expect(r.nextState.werke[0].hallenPlaetze).toBe(8);
  });
});

describe('Balancing: Strategien', () => {
  const lauf = (fn: (s: GameState, r: QuarterReport | null) => Decisions, n = 20) => {
    let s = neu(1);
    let r: QuarterReport | null = null;
    let ebit = 0;
    for (let i = 0; i < n && !s.spielende; i++) {
      const res = simulateQuarter(s, fn(s, r), undefined, { vorherBericht: r });
      s = res.nextState;
      r = res.report;
      ebit += r.guv.ebit;
    }
    return { ebit, pleite: !!s.spielende };
  };
  it('gute Strategie schlägt Nichtstun deutlich, Ausmaxen führt in die Pleite', () => {
    const gut = lauf((s, r) => botEntscheidungen(s, r));
    const nichts = lauf((s) => ({ ...standardEntscheidungen(s) }));
    const maximal = lauf((s, r) => {
      const d = botEntscheidungen(s, r, { ...STANDARD_BOT, preisFaktor: 0.85 });
      for (const p of ['stadtrad', 'ebike'] as const) {
        d.marketing[p] = { DE: 300_000 };
        d.fe[p] = 300_000;
      }
      return d;
    });
    expect(gut.pleite).toBe(false);
    expect(gut.ebit).toBeGreaterThan(nichts.ebit * 3);
    expect(maximal.pleite).toBe(true);
  });
});

describe('Firmensitz', () => {
  it('Stufen und Extras werden aktiviert, Bilanz bleibt ausgeglichen, Extras-Bonus gedeckelt', () => {
    let s = neu(4);
    const d = standardEntscheidungen(s);
    d.firmensitz.kaufen = ['hinterhofbuero', 'brunnen', 'espressobar', 'brunnen'];
    const r = simulateQuarter(s, d);
    s = r.nextState;
    expect(s.unternehmen.firmensitz.stufe).toBe(1);
    expect(s.unternehmen.firmensitz.extras).toEqual(['brunnen', 'espressobar']);
    expect(r.report.kapitalfluss.investitionen).toBeCloseTo(-(50_000 + 20_000 + 50_000), 6);
    expect(Math.abs(r.report.bilanz.aktiva - r.report.bilanz.passiva)).toBeLessThan(0.01);
  });
});

describe('Expansion', () => {
  const reich = (seed = 31) => {
    const s = neu(seed);
    s.finanzen.kasse += 30_000_000;
    s.finanzen.kapitalruecklage += 30_000_000;
    return s;
  };
  it('Markteintritt: Europa ist ab dem Folgequartal aktiv und verkauft', () => {
    let s = reich();
    s.regionen.EU!.freigeschaltet = true;
    let d = standardEntscheidungen(s);
    d.expansion = { maerkteBetreten: ['EU'], produkteEinfuehren: [], werkeBauen: [] };
    let r = simulateQuarter(s, d);
    expect(r.report.guv.sonstigerAufwand).toBeGreaterThanOrEqual(2_000_000);
    expect(Math.abs(r.report.bilanz.aktiva - r.report.bilanz.passiva)).toBeLessThan(0.01);
    s = r.nextState;
    expect(s.regionen.EU!.aktiv).toBe(true);
    d = standardEntscheidungen(s);
    expect(d.preis.stadtrad!.EU).toBeGreaterThan(0);
    d.marketing.stadtrad!.EU = 50_000;
    r = simulateQuarter(s, d);
    const eu = r.report.angebote.find((a) => a.region === 'EU' && a.produkt === 'stadtrad')!;
    expect(eu.nachfrage).toBeGreaterThan(0);
    // Bei Knappheit wird anteilig zur Nachfrage verteilt – auch der neue Markt bekommt Ware
    expect(eu.absatz).toBeGreaterThan(0);
  });
  it('Forschung führt zum neuen Produkt, Werksbau mit Bauzeit, Bilanz bleibt ausgeglichen', () => {
    let s = reich();
    let d = standardEntscheidungen(s);
    d.forschung = { federung: 600_000 };
    d.expansion = { maerkteBetreten: [], produkteEinfuehren: [], werkeBauen: ['PL'] };
    for (let i = 0; i < 3; i++) {
      const r = simulateQuarter(s, d);
      expect(Math.abs(r.report.bilanz.aktiva - r.report.bilanz.passiva)).toBeLessThan(0.01);
      s = r.nextState;
      if (i === 0) {
        // voll finanziert, aber Mindestdauer 2 Quartale noch nicht erreicht
        expect(s.produkte.mountainbike).toBeUndefined();
        expect(s.werke.find((w) => w.standort === 'PL')?.status).toBe('bau');
      }
      if (i === 1) {
        expect(s.produkte.mountainbike?.freigeschaltet).toBe(true);
        expect(r.report.freischaltungen.some((f) => f.id === 'mountainbike')).toBe(true);
      }
      d = standardEntscheidungen(s);
    }
    const pl = s.werke.find((w) => w.standort === 'PL')!;
    expect(pl.status).toBe('aktiv');
    d.werke[pl.id].linienKaufen = [{ typ: 'B', anzahl: 2 }];
    d.werke[pl.id].personalAenderung = 20;
    const r = simulateQuarter(s, d);
    expect(r.nextState.werke.find((w) => w.id === pl.id)!.mitarbeitende).toBeGreaterThan(15);
  });
  it('Standardbot erschließt mehrere Regionen und überlebt 60 Quartale', () => {
    const { state } = spiele(neu(5), 60, bot);
    expect(state.spielende).toBeNull();
    expect(state.regionen.EU!.aktiv).toBe(true);
    expect(state.regionen.NA!.freigeschaltet).toBe(true);
  });
});

describe('Forschung und Marktlebenszyklen', () => {
  it('ein neues Spiel startet nur mit dem Stadtrad', () => {
    const s = neuesSpiel({ firmenname: 'T', farbe: '#000', schwierigkeit: 'normal', profi: false, seed: 1 });
    expect(Object.keys(s.produkte)).toEqual(['stadtrad']);
    expect(s.markt.DE!.stadtrad!.anteile[SPIELER_ID]).toBeCloseTo(0.0075, 4);
  });
  it('Projekte brauchen Voraussetzungen, Budget und Mindestdauer', () => {
    let s = neuesSpiel({ firmenname: 'T', farbe: '#000', schwierigkeit: 'normal', profi: false, seed: 1 });
    let d = standardEntscheidungen(s);
    d.forschung = { lastenrahmen: 500_000, elektro: 400_000 };
    let r = simulateQuarter(s, d);
    expect(r.report.warnungen.some((w) => w.includes('Voraussetzungen'))).toBe(true);
    expect(r.report.guv.fe).toBeGreaterThanOrEqual(400_000);
    s = r.nextState;
    expect(s.forschung?.elektro?.investiert).toBe(400_000);
    expect(s.forschung?.lastenrahmen).toBeUndefined();
    // Budget wird übernommen, bis das Projekt fertig ist (1,2 Mio. € in 3 Quartalen)
    for (let i = 0; i < 2; i++) {
      d = standardEntscheidungen(s);
      r = simulateQuarter(s, d);
      s = r.nextState;
    }
    expect(s.produkte.ebike?.freigeschaltet).toBe(true);
    expect(s.produkte.ebike?.fe).toBeCloseTo(360_000, 0);
  });
  it('Segmente entwickeln sich unterschiedlich: Stadtrad schrumpft, E-Bike boomt, Lastenrad kommt später', async () => {
    const { volumenFaktor } = await import('./market');
    expect(volumenFaktor('stadtrad', 'DE', 40)).toBeLessThan(1);
    expect(volumenFaktor('ebike', 'DE', 20)).toBeGreaterThan(1.6);
    const lastenFrueh = volumenFaktor('lastenrad', 'DE', 12) / volumenFaktor('lastenrad', 'DE', 0);
    const lastenSpaet = volumenFaktor('lastenrad', 'DE', 32) / volumenFaktor('lastenrad', 'DE', 20);
    expect(lastenSpaet).toBeGreaterThan(lastenFrueh);
  });
});

describe('Feature-Forschung', () => {
  it('Features wirken nach Abschluss auf Nachfrage, Qualität und Material der passenden Räder', () => {
    let s = neuesSpiel({ firmenname: 'T', farbe: '#000', schwierigkeit: 'normal', profi: false, seed: 3 });
    // Voraussetzung fehlt → Warnung
    let d = standardEntscheidungen(s);
    d.forschung = { 'f-gps': 100_000, 'f-licht': 250_000, 'f-scheibenbremsen': 350_000 };
    let r = simulateQuarter(s, d);
    expect(r.report.warnungen.some((w) => w.includes('GPS') && w.includes('Voraussetzungen'))).toBe(true);
    s = r.nextState;
    expect(s.forschung?.['f-licht']?.fertigIm).toBe(0);
    expect(r.report.freischaltungen.some((f) => f.art === 'feature' && f.id === 'f-licht')).toBe(true);
    // Scheibenbremsen brauchen 2 Quartale
    expect(s.forschung?.['f-scheibenbremsen']?.fertigIm).toBeUndefined();
    d = standardEntscheidungen(s);
    expect(d.forschung?.['f-licht']).toBeUndefined();
    r = simulateQuarter(s, d);
    s = r.nextState;
    expect(s.forschung?.['f-scheibenbremsen']?.fertigIm).toBe(1);

    // Vergleich mit/ohne Features bei gleichen Entscheidungen
    const ohne: GameState = structuredClone(s);
    ohne.forschung = {};
    const dd = standardEntscheidungen(s);
    dd.forschung = {};
    const mit = previewQuarter(s, dd);
    const basis = previewQuarter(ohne, dd);
    const a = (x: QuarterReport) => x.angebote.find((y) => y.produkt === 'stadtrad' && y.region === 'DE')!;
    expect(a(mit).nachfrage).toBeGreaterThan(a(basis).nachfrage * 1.03);
    expect(a(mit).qualitaet).toBeCloseTo(a(basis).qualitaet + 0.03, 5);
    expect(mit.produkte.find((p) => p.produkt === 'stadtrad')!.hkProStueck).toBeGreaterThan(basis.produkte.find((p) => p.produkt === 'stadtrad')!.hkProStueck);
    expect(Math.abs(mit.bilanz.aktiva - mit.bilanz.passiva)).toBeLessThan(1e-6);
  });
  it('Feature-Wirkungen gelten nur für passende Produkte', async () => {
    const { featureWirkung } = await import('./forschung');
    const s = neuesSpiel({ firmenname: 'T', farbe: '#000', schwierigkeit: 'normal', profi: false, seed: 3 });
    s.forschung = { 'f-carbon': { investiert: 900_000, quartale: 3, fertigIm: 0 } };
    expect(featureWirkung(s, 'rennrad').technik).toBeCloseTo(0.15);
    expect(featureWirkung(s, 'stadtrad').technik).toBe(0);
  });
});
