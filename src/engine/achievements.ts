/** Erfolge (Abschnitt 13). Die Prüfung läuft nach jedem Quartal in der Engine. */
import type { GameState, QuarterReport } from './types';
import { SPIELER_ID } from './util';

export interface ErfolgDef {
  id: string;
  name: string;
  bedingung: string;
  icon: string;
  farbe: string;
  /** In der aktuellen Ausbaustufe des Spiels noch nicht erreichbar */
  spaeter?: boolean;
  pruefe?: (s: GameState, r: QuarterReport) => boolean;
}

export const ERFOLGE: ErfolgDef[] = [
  { id: 'erste_schritte', name: 'Erste Schritte', bedingung: 'Erstes Quartal abgeschlossen', icon: 'rad', farbe: '#0d9488', pruefe: () => true },
  { id: 'tausendfuessler', name: 'Tausendfüßler', bedingung: '1.000 Räder verkauft (kumuliert)', icon: 'lager', farbe: '#2563eb', pruefe: (s) => s.kpiHistorie.reduce((a, k) => a + k.absatz, 0) >= 1000 },
  { id: 'millionaer', name: 'Millionär', bedingung: '1 Mio. € Umsatz in einem Quartal', icon: 'umsatz', farbe: '#ca8a04', pruefe: (_s, r) => r.guv.umsatz >= 1_000_000 },
  {
    id: 'schwarze_zahlen', name: 'Schwarze Zahlen', bedingung: 'Erstes positives Jahres-EBIT', icon: 'ebit', farbe: '#16a34a',
    pruefe: (s) => s.kpiHistorie.length >= 4 && s.kpiHistorie.slice(-4).reduce((a, k) => a + k.ebit, 0) > 0,
  },
  { id: 'garagenromantik', name: 'Garagenromantik ade', bedingung: 'Erste Firmensitz-Ausbaustufe gekauft', icon: 'firmensitz', farbe: '#b45309', pruefe: (s) => s.unternehmen.firmensitz.stufe >= 1 },
  {
    id: 'preisbrecher', name: 'Preisbrecher', bedingung: 'Günstigster Anbieter in einem Segment mit positivem Deckungsbeitrag', icon: 'preis', farbe: '#e11d48',
    pruefe: (_s, r) =>
      r.segmente.some((seg) => {
        const eigen = seg.preise[SPIELER_ID];
        if (!eigen) return false;
        const guenstigster = Object.entries(seg.preise).every(([id, p]) => id === SPIELER_ID || p > eigen);
        const prod = r.produkte.find((p) => p.produkt === seg.produkt);
        return guenstigster && !!prod && prod.absatz > 0 && eigen > prod.stueckkostenAbsatz * 1.03;
      }),
  },
  {
    id: 'tech_pionier', name: 'Tech-Pionier', bedingung: 'Technik-Platz 1 in einem Segment', icon: 'fe', farbe: '#7c3aed',
    pruefe: (_s, r) => r.segmente.some((seg) => Object.entries(seg.technikIndex).every(([id, v]) => id === SPIELER_ID || v < (seg.technikIndex[SPIELER_ID] ?? -1))),
  },
  { id: 'gruener_daumen', name: 'Grüner Daumen', bedingung: 'Nachhaltigkeit ≥ 80', icon: 'laub', farbe: '#15803d', pruefe: (s) => s.unternehmen.nachhaltigkeit >= 80 },
  { id: 'wolkenkratzer', name: 'Wolkenkratzer', bedingung: 'Höchste Firmensitz-Stufe', icon: 'firmensitz', farbe: '#0284c7', pruefe: (s) => s.unternehmen.firmensitz.stufe >= 6 },
  { id: 'europaeer', name: 'Europäer', bedingung: 'Europa freigeschaltet', icon: 'ziel', farbe: '#2563eb', spaeter: true },
  { id: 'go_west', name: 'Go West', bedingung: 'Nordamerika freigeschaltet', icon: 'ziel', farbe: '#dc2626', spaeter: true },
  { id: 'seidenstrasse', name: 'Seidenstraße', bedingung: 'Asien freigeschaltet', icon: 'ziel', farbe: '#ca8a04', spaeter: true },
  { id: 'globetrotter', name: 'Globetrotter', bedingung: 'Alle Regionen aktiv', icon: 'ziel', farbe: '#0d9488', spaeter: true },
  { id: 'ding_dong', name: 'Ding Dong', bedingung: 'Börsengang', icon: 'stern', farbe: '#7c3aed', spaeter: true },
  { id: 'fressen', name: 'Fressen und gefressen werden', bedingung: 'Erste Übernahme', icon: 'rakete', farbe: '#b91c1c', spaeter: true },
  { id: 'james_bond', name: 'James Bond auf dem Klapprad', bedingung: 'Bei Spionage erwischt', icon: 'viral', farbe: '#334155', spaeter: true },
  { id: 'pleitegeier', name: 'Pleitegeier verjagt', bedingung: 'Rettungsangebot angenommen und überlebt', icon: 'warn', farbe: '#64748b', spaeter: true },
  { id: 'milliardaer', name: 'Milliardär', bedingung: 'Jahresumsatz ≥ 1 Mrd. €', icon: 'wert', farbe: '#ca8a04', pruefe: (s) => s.kpiHistorie.slice(-4).reduce((a, k) => a + k.umsatz, 0) >= 1e9 },
  { id: 'marktfuehrer_europa', name: 'Marktführer Europa', bedingung: 'Platz 1 in Europa nach Umsatz', icon: 'testsieg', farbe: '#2563eb', spaeter: true },
  { id: 'imperator', name: 'Imperator', bedingung: 'Weltmarktführer (4 Quartale Platz 1)', icon: 'testsieg', farbe: '#a16207', spaeter: true },
];

/** Prüft nach einem Quartal und gibt neu erreichte Erfolge zurück (verändert `s.erfolge`). */
export function pruefeErfolge(s: GameState, r: QuarterReport): string[] {
  s.erfolge ??= [];
  const neu: string[] = [];
  for (const e of ERFOLGE) {
    if (!e.pruefe || s.erfolge.some((x) => x.id === e.id)) continue;
    if (e.pruefe(s, r)) {
      s.erfolge.push({ id: e.id, quartal: r.quartal });
      neu.push(e.id);
    }
  }
  return neu;
}
