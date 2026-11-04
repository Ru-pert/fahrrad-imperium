/**
 * Szenarien: unterschiedliche Startbedingungen mit eigenem Etappenziel (Bonuspunkte in der Endabrechnung).
 */
import { LINIENTYPEN } from './config/products';
import type { GameState, ProductId } from './types';

export interface SzenarioZiel {
  text: string;
  /** Quartal, bis zu dem das Ziel erreicht sein muss (Index, exklusiv) */
  frist: number;
  bonus: number;
  pruefe: (s: GameState) => boolean;
  /** Fortschritt 0–1 für die Anzeige */
  fortschritt: (s: GameState) => number;
}

export interface Szenario {
  id: string;
  name: string;
  untertitel: string;
  geschichte: string;
  icon: string;
  farbe: string;
  startProdukte?: ProductId[];
  anwenden?: (s: GameState) => void;
  ziel?: SzenarioZiel;
}

const umsatz4Q = (s: GameState) => s.kpiHistorie.slice(-4).reduce((a, k) => a + k.umsatz, 0);

export const SZENARIEN: Szenario[] = [
  {
    id: 'frei',
    name: 'Freies Spiel',
    untertitel: 'Die klassische Garage',
    geschichte: 'Zwei alte Fertigungslinien, ein Stadtrad und ein großer Traum. Alles Weitere liegt bei dir.',
    icon: 'rad',
    farbe: '#0d9488',
  },
  {
    id: 'traditionshaus',
    name: 'Rette das Traditionshaus',
    untertitel: 'Schulden, alte Maschinen, treue Kundschaft',
    geschichte: 'Die Fahrradmanufaktur deines Großvaters steckt in der Krise: wenig Geld, ein drückender Kredit, müde Maschinen. Dafür kennt man den Namen – und die Kundschaft ist treu.',
    icon: 'firmensitz',
    farbe: '#b45309',
    startProdukte: ['stadtrad'],
    anwenden: (s) => {
      const f = s.finanzen;
      const kredit = 2_000_000;
      f.kredite.push({ id: 'Altkredit', restbetrag: kredit, tilgung: kredit / 12, zins: 0.07 });
      // Krise: Der Altkredit hat die Rücklagen aufgezehrt – kaum Geld in der Kasse
      f.kasse += kredit - 2_900_000;
      f.gewinnruecklagen -= 2_900_000;
      s.unternehmen.image = 64;
      for (const r of Object.keys(s.regionen)) if (s.regionen[r as keyof typeof s.regionen]?.aktiv) s.regionen[r as keyof typeof s.regionen]!.bekanntheit *= 1.6;
      for (const w of s.werke) {
        w.motivation = 0.85;
        for (const l of w.linien) {
          l.verfuegbarkeit = 0.85;
          l.restlaufzeit = Math.min(l.restlaufzeit, 4);
        }
      }
      for (const k of Object.keys(s.unternehmen.zufriedenheit)) s.unternehmen.zufriedenheit[k] = 62;
    },
    ziel: {
      text: 'Bis Ende 2030: 4 Quartale in Folge positives EBIT und alle Altschulden getilgt',
      frist: 16,
      bonus: 100,
      pruefe: (s) => s.kpiHistorie.slice(-4).length === 4 && s.kpiHistorie.slice(-4).every((k) => k.ebit > 0) && !s.finanzen.kredite.some((k) => k.id === 'Altkredit'),
      fortschritt: (s) => Math.min(1, s.kpiHistorie.slice(-4).filter((k) => k.ebit > 0).length / 4),
    },
  },
  {
    id: 'eboom',
    name: 'E-Bike-Fieber',
    untertitel: 'Mit dem E-Bike in den Boom',
    geschichte: 'Du startest mit einem fertigen E-Bike und etwas mehr Kapital, mitten im Boom. Doch die Konkurrenz schläft nicht – und Kapazität ist knapp.',
    icon: 'rakete',
    farbe: '#6366f1',
    startProdukte: ['stadtrad', 'ebike'],
    anwenden: (s) => {
      s.finanzen.kasse += 2_000_000;
      s.finanzen.kapitalruecklage += 2_000_000;
    },
    ziel: {
      text: 'Bis Ende 2031: 50 Mio. € Umsatz in vier Quartalen',
      frist: 20,
      bonus: 100,
      pruefe: (s) => umsatz4Q(s) >= 50_000_000,
      fortschritt: (s) => Math.min(1, umsatz4Q(s) / 50_000_000),
    },
  },
  {
    id: 'startup',
    name: 'Start-up mit Wagniskapital',
    untertitel: 'Viel Geld, aber nicht dein eigenes',
    geschichte: 'Ein Wagniskapitalgeber hat 8 Mio. € investiert und hält 30 % der Firma. Er erwartet schnelles Wachstum – und einen Börsengang.',
    icon: 'geld',
    farbe: '#7c3aed',
    anwenden: (s) => {
      s.finanzen.kasse += 8_000_000;
      s.finanzen.kapitalruecklage += 8_000_000;
      s.finanzen.investorAnteil = 0.3;
    },
    ziel: {
      text: 'Bis Ende 2032: Börsengang',
      frist: 24,
      bonus: 120,
      pruefe: (s) => !!s.boerse?.notiert,
      fortschritt: (s) => Math.min(0.95, umsatz4Q(s) / 50_000_000),
    },
  },
  {
    id: 'gruen',
    name: 'Grüner Pionier',
    untertitel: 'Nachhaltig zum Erfolg',
    geschichte: 'Deine Firma ist die grünste der Branche: Premium-Lieferanten, Öko-Linie, ein gutes Gewissen. Das kostet Marge – bringt aber Image.',
    icon: 'nachhaltigkeit',
    farbe: '#16a34a',
    anwenden: (s) => {
      s.unternehmen.nachhaltigkeit = 62;
      s.unternehmen.image = 58;
      s.letzteEntscheidungen.lieferanten = { rahmen: 'premium', akku: 'premium', antrieb: 'premium' };
      s.letzteEntscheidungen.nachhaltigkeitsbudget = 40_000;
      const w = s.werke[0];
      if (w?.linien[0]) w.linien[0].umweltindex = LINIENTYPEN.C.umwelt;
    },
    ziel: {
      text: 'Am Ende: Nachhaltigkeit und Image jeweils mindestens 80',
      frist: 60,
      bonus: 100,
      pruefe: (s) => s.quartal >= 59 && s.unternehmen.nachhaltigkeit >= 80 && s.unternehmen.image >= 80,
      fortschritt: (s) => Math.min(1, Math.min(s.unternehmen.nachhaltigkeit, s.unternehmen.image) / 80),
    },
  },
];

export const szenarioVon = (s: GameState): Szenario => SZENARIEN.find((x) => x.id === (s.szenario ?? 'frei')) ?? SZENARIEN[0];

/** Nach jedem Quartal: Etappenziel erreicht? (nur einmal, innerhalb der Frist) */
export function pruefeSzenario(s: GameState, t: number): boolean {
  const z = szenarioVon(s).ziel;
  if (!z || s.szenarioErreicht !== undefined || t >= z.frist) return false;
  if (z.pruefe(s)) {
    s.szenarioErreicht = t;
    return true;
  }
  return false;
}
