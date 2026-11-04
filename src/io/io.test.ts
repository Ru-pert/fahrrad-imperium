import { describe, expect, it } from 'vitest';
import { neuesSpiel, simulateQuarter, standardEntscheidungen } from '../engine';
import { entscheidungenAlsJson } from './decisionsJson';
import { extrahiereJson, importiereEntscheidungen } from './importDecisions';
import { lagebericht } from './exportState';

const spiel = (profi = false) => neuesSpiel({ firmenname: 'Test GmbH', farbe: '#000', schwierigkeit: 'normal', profi, seed: 9, startProdukte: ['stadtrad', 'ebike'] });

describe('Austausch mit Claude', () => {
  it('erkennt JSON mit Codezäunen und Begleittext', () => {
    const text = 'Hier mein Vorschlag:\n\n```json\n{ "format": "fahrrad-imperium/entscheidungen", "begruendung": "Preis {runter}" }\n```\nViel Erfolg!';
    const r = extrahiereJson(text);
    expect('json' in r && (r.json as { begruendung: string }).begruendung).toBe('Preis {runter}');
  });
  it('repariert typografische Anführungszeichen und Kommas am Ende', () => {
    const r = extrahiereJson('{ „a“: 1, }');
    expect('json' in r && r.json).toEqual({ a: 1 });
  });
  it('Export → Import ergibt dieselben Entscheidungen', () => {
    const s = spiel();
    const d = standardEntscheidungen(s);
    d.preis.stadtrad = { DE: 620 };
    d.fe.ebike = 120_000;
    const text = JSON.stringify(entscheidungenAlsJson(d));
    const r = importiereEntscheidungen(text, s, standardEntscheidungen(s));
    expect(r.ok).toBe(true);
    expect(r.entscheidungen).toEqual(d);
    expect(r.aenderungen.map((a) => a.feld)).toContain('Preis Stadtrad (DE)');
  });
  it('meldet Bereichsfehler, statt still zu korrigieren', () => {
    const s = spiel();
    const json = {
      format: 'fahrrad-imperium/entscheidungen', quartal: 'Q1 2027',
      produkte: { stadtrad: { produktion: { 'DE-1': 9000 }, maerkte: { DE: { preis: 100 } } } },
      werke: { 'DE-1': { personalAenderung: 50 } },
      finanzen: { darlehenNeu: 99_000_000 },
    };
    const r = importiereEntscheidungen(JSON.stringify(json), s, standardEntscheidungen(s));
    expect(r.ok).toBe(false);
    expect(r.fehler.some((f) => f.includes('Preis Stadtrad'))).toBe(true);
    expect(r.fehler.some((f) => f.includes('Einstellungslimit'))).toBe(true);
    expect(r.fehler.some((f) => f.includes('Kreditlimit'))).toBe(true);
  });
  it('meldet Kapazitätsüberschreitung mit Höchstmenge', () => {
    const s = spiel();
    const r = importiereEntscheidungen(JSON.stringify({ produkte: { stadtrad: { produktion: { 'DE-1': 4000 } } } }), s, standardEntscheidungen(s));
    expect(r.ok).toBe(false);
    expect(r.fehler[0]).toMatch(/Kapazität .* max\./);
  });
  it('warnt bei falschem Quartal, unbekannten und gesperrten Feldern, übernimmt aber den Rest', () => {
    const s = spiel();
    const json = {
      quartal: 'Q3 2027', foo: 1, vertrieb: { DE: 5 },
      lieferanten: { akku: 'premium' },
      produkte: { stadtrad: { fe: 30000 }, emtb: { fe: 1 } },
    };
    const r = importiereEntscheidungen(JSON.stringify(json), s, standardEntscheidungen(s));
    expect(r.ok).toBe(true);
    expect(r.warnungen.join(' ')).toMatch(/Q3 2027/);
    expect(r.warnungen.join(' ')).toMatch(/„foo“/);
    expect(r.warnungen.join(' ')).toMatch(/Vertrieb/);
    expect(r.warnungen.join(' ')).toMatch(/Lieferanten sind erst ab Q3/);
    expect(r.warnungen.join(' ')).toMatch(/E-MTB ist noch nicht freigeschaltet/);
    expect(r.entscheidungen!.fe.stadtrad).toBe(30000);
    expect(r.entscheidungen!.lieferanten.akku).toBe('standard');
  });
  it('Lagebericht enthält Vorlage, Konkurrenz ohne Geheimwerte und ist JSON-serialisierbar', () => {
    let s = spiel();
    const res = simulateQuarter(s, standardEntscheidungen(s));
    s = res.nextState;
    const lb = lagebericht(s, res.report, standardEntscheidungen(s), false);
    const text = JSON.stringify(lb);
    expect(lb.format).toBe('fahrrad-imperium/lagebericht');
    expect(lb.naechstesQuartal).toBe('Q2 2027');
    expect(lb.entscheidungsVorlage.format).toBe('fahrrad-imperium/entscheidungen');
    expect(text).not.toMatch(/"preise"|marketingBudget/);
    // Vorlage lässt sich ohne Fehler wieder importieren
    const r = importiereEntscheidungen(JSON.stringify(lb.entscheidungsVorlage), s, standardEntscheidungen(s));
    expect(r.ok).toBe(true);
    expect(r.aenderungen).toHaveLength(0);
  });
});
