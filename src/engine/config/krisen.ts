/**
 * Krisen mit Entscheidungen: Zwischen zwei Quartalen tritt ein Dilemma auf,
 * die Antwort wird im nächsten Quartal wirksam. Kosten in Anteilen des Quartalsumsatzes.
 * Platzhalter in Texten: {firma}, {produkt}, {werk}, {konkurrent}.
 */
import type { GameState } from '../types';

export interface KrisenWirkung {
  /** Einmalige Kosten als Anteil des Bezugsumsatzes (mindestens kostenMin) */
  kosten?: number;
  kostenMin?: number;
  /** Einmaliger Ertrag als Anteil des Bezugsumsatzes */
  ertrag?: number;
  image?: number;
  /** Bekanntheit in allen aktiven Regionen (absolut, z. B. 0,03 = +3 Punkte) */
  bekanntheit?: number;
  /** Motivation in allen Werken (absolut) */
  motivation?: number;
  /** Kundenzufriedenheit in allen Segmenten (Punkte) */
  zufriedenheit?: number;
  nachhaltigkeit?: number;
  /** Nachfragefaktor für n Quartale (ab dem laufenden); nurProdukt = nur das betroffene Rad */
  nachfrage?: { faktor: number; quartale: number; nurProdukt?: boolean };
  /** Kapazitätsfaktor für n Quartale; nurWerk = nur das betroffene Werk */
  kapazitaet?: { faktor: number; quartale: number; nurWerk?: boolean };
  /** Materialkostenfaktor für n Quartale */
  material?: { faktor: number; quartale: number };
  /** Der betroffene Konkurrent senkt n Quartale lang aus Rache die Preise */
  rache?: number;
}

export interface KrisenOption {
  id: string;
  label: string;
  /** Was absehbar passiert (für die Entscheidung) */
  hinweis: string;
  wirkung: KrisenWirkung;
  /** Unsicherer Ausgang: Wahrscheinlichkeit, Wirkung und Text */
  risiko?: { chance: number | ((s: GameState) => number); wirkung: KrisenWirkung; text: string; glueck?: KrisenWirkung };
  /** Text, wenn alles gut geht */
  erfolg: string;
  /** Gilt, wenn nichts gewählt wird */
  standard?: boolean;
}

export interface KrisenDef {
  id: string;
  titel: string;
  text: string;
  icon: string;
  /** Relative Häufigkeit */
  gewicht: number;
  abQuartal?: number;
  kontext?: 'produkt' | 'werk' | 'konkurrent';
  bedingung?: (s: GameState) => boolean;
  optionen: KrisenOption[];
}

export const KRISE = {
  /** Wahrscheinlichkeit einer neuen Krise je Quartal (frühestens 2 Quartale nach der letzten) */
  wahrscheinlichkeit: 0.32,
  abstand: 2,
  /** Dieselbe Krise frühestens nach so vielen Quartalen erneut */
  wiederholung: 14,
  /** Bezugsumsatz mindestens */
  bezugMin: 2_000_000,
};

const zufriedenheitMittel = (s: GameState): number => {
  const w = Object.values(s.unternehmen.zufriedenheit ?? {});
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 60;
};

export const KRISEN: KrisenDef[] = [
  {
    id: 'bremsen',
    titel: 'Mangelhafte Bremsen entdeckt',
    text: 'Die Qualitätsprüfung hat bei einer Charge {produkt}s fehlerhafte Bremsen gefunden. Noch hat niemand etwas gemerkt – noch.',
    icon: 'rueckruf',
    gewicht: 1.2,
    kontext: 'produkt',
    optionen: [
      { id: 'rueckruf', label: 'Freiwilliger Rückruf', hinweis: 'Kostet rund 4 % eines Quartalsumsatzes, bringt Image +3 und zufriedenere Kundschaft.', wirkung: { kosten: 0.04, kostenMin: 60_000, image: 3, zufriedenheit: 6 }, erfolg: 'Ehrlich währt am längsten: Die Kundschaft lobt den offenen Umgang mit dem Fehler.' },
      { id: 'still', label: 'Still bei der Inspektion tauschen', hinweis: 'Günstiger (1,5 %), aber etwa jedes dritte Mal plaudert jemand.', wirkung: { kosten: 0.015, kostenMin: 25_000 }, risiko: { chance: 0.35, wirkung: { image: -12, zufriedenheit: -10, nachfrage: { faktor: 0.9, quartale: 2, nurProdukt: true } }, text: 'Ein Mechaniker plaudert: „{firma} vertuscht Bremsmängel!“ Image −12, die Nachfrage nach dem {produkt} sinkt zwei Quartale lang.' }, erfolg: 'Niemand hat etwas gemerkt. Puh.' },
      { id: 'nichts', label: 'Abwarten und Tee trinken', hinweis: 'Kostet nichts – wenn es gut geht. Mehr als die Hälfte der Fälle geht nicht gut.', wirkung: {}, risiko: { chance: 0.6, wirkung: { kosten: 0.06, kostenMin: 80_000, image: -18, zufriedenheit: -15, nachfrage: { faktor: 0.85, quartale: 2, nurProdukt: true } }, text: 'Unfälle, Schlagzeilen, Zwangsrückruf: Kosten von 6 % eines Quartalsumsatzes, Image −18, Nachfrage nach dem {produkt} −15 %.' }, erfolg: 'Glück gehabt – die Bremsen hielten. Diesmal.', standard: true },
    ],
  },
  {
    id: 'containerschiff',
    titel: 'Containerschiff steckt fest',
    text: 'Ein Frachter mit euren Schaltungen und Naben hat sich in einem Kanal quergestellt. Die Teile fehlen für das ganze Quartal.',
    icon: 'schiff',
    gewicht: 1,
    optionen: [
      { id: 'luftfracht', label: 'Teile per Luftfracht holen', hinweis: 'Teuer (rund 3 % eines Quartalsumsatzes), aber die Bänder laufen weiter.', wirkung: { kosten: 0.03, kostenMin: 40_000, nachhaltigkeit: -2 }, erfolg: 'Die Flieger landen pünktlich – die Bänder laufen. Die Ökobilanz leidet ein wenig.' },
      { id: 'drosseln', label: 'Produktion drosseln', hinweis: 'Kostet nichts extra, aber die Werke schaffen ein Quartal lang nur 80 %.', wirkung: { kapazitaet: { faktor: 0.8, quartale: 1 } }, erfolg: 'Die Werke fahren ein Quartal auf Sparflamme.', standard: true },
      { id: 'haendler', label: 'Teile beim Großhändler zukaufen', hinweis: 'Material 12 % teurer für ein Quartal – und die Qualität ist nicht immer top.', wirkung: { material: { faktor: 1.12, quartale: 1 } }, risiko: { chance: 0.3, wirkung: { zufriedenheit: -6 }, text: 'Die Ersatzteile quietschen: Die Kundschaft ist etwas weniger zufrieden.' }, erfolg: 'Der Großhändler liefert solide Ware – teuer, aber problemlos.' },
    ],
  },
  {
    id: 'gewerkschaft',
    titel: 'Gewerkschaft fordert mehr Lohn',
    text: 'Die Belegschaft verlangt eine Einmalzahlung als Inflationsausgleich. Vor dem Werkstor stehen schon die ersten Transparente.',
    icon: 'streik',
    gewicht: 1,
    abQuartal: 3,
    optionen: [
      { id: 'zahlen', label: 'Forderung erfüllen', hinweis: 'Rund 2 % eines Quartalsumsatzes, dafür deutlich motiviertere Teams.', wirkung: { kosten: 0.02, kostenMin: 30_000, motivation: 0.08 }, erfolg: 'Jubel in der Montagehalle – die Teams legen sich richtig ins Zeug.' },
      { id: 'kompromiss', label: 'Kompromiss anbieten', hinweis: 'Halbe Kosten, etwas mehr Motivation – kleines Streikrisiko.', wirkung: { kosten: 0.01, kostenMin: 15_000, motivation: 0.02 }, risiko: { chance: 0.2, wirkung: { kapazitaet: { faktor: 0.85, quartale: 1 } }, text: 'Ein Teil der Belegschaft legt trotzdem die Arbeit nieder: 15 % weniger Kapazität.' }, erfolg: 'Händeschütteln vor dem Werkstor – man hat sich geeinigt.' },
      { id: 'ablehnen', label: 'Ablehnen', hinweis: 'Kostet nichts, drückt aber die Stimmung – und oft folgt ein Streik.', wirkung: { motivation: -0.06 }, risiko: { chance: 0.5, wirkung: { kapazitaet: { faktor: 0.7, quartale: 1 }, image: -4 }, text: 'Streik! Die Werke schaffen ein Quartal lang nur 70 %, und die Zeitung ist auch nicht begeistert.' }, erfolg: 'Die Belegschaft murrt, arbeitet aber weiter.', standard: true },
    ],
  },
  {
    id: 'influencerin',
    titel: '@PedalPaula will kooperieren',
    text: 'Die Rad-Influencerin mit 2,4 Millionen Followern möchte das {produkt} von {firma} ein Jahr lang fahren – gegen Bezahlung natürlich.',
    icon: 'viral',
    gewicht: 1,
    kontext: 'produkt',
    optionen: [
      { id: 'deal', label: 'Bezahlte Kooperation', hinweis: 'Rund 1,5 % eines Quartalsumsatzes, Bekanntheit +5 Punkte. Influencer sind manchmal … unberechenbar.', wirkung: { kosten: 0.015, kostenMin: 50_000, bekanntheit: 0.05 }, risiko: { chance: 0.2, wirkung: { image: -8 }, text: 'Peinlich: Paula fährt euer {produkt} live in einen Teich. Image −8 (die Bekanntheit steigt trotzdem).' }, erfolg: 'Paulas Videos gehen viral: Alle Welt kennt jetzt euer {produkt}.' },
      { id: 'gratis', label: 'Nur ein Gratis-Rad schicken', hinweis: 'Fast kostenlos – vielleicht postet sie trotzdem etwas.', wirkung: { kosten: 0.001, kostenMin: 3_000 }, risiko: { chance: 0.5, wirkung: {}, glueck: { bekanntheit: 0.02 }, text: 'Paula bedankt sich höflich – und postet nichts.' }, erfolg: 'Paula mag das Rad und postet ein Foto: Bekanntheit +2 Punkte.' },
      { id: 'ablehnen', label: 'Ablehnen', hinweis: 'Kein Risiko, keine Wirkung.', wirkung: {}, erfolg: 'Paula fährt jetzt für die Konkurrenz. Na gut.', standard: true },
    ],
  },
  {
    id: 'fahrradstrassen',
    titel: 'Die Stadt baut Fahrradstraßen',
    text: 'Die Stadtverwaltung plant ein großes Netz aus Fahrradstraßen und sucht einen Hauptsponsor für die Eröffnung.',
    icon: 'strasse',
    gewicht: 0.9,
    optionen: [
      { id: 'sponsor', label: 'Hauptsponsor werden', hinweis: 'Rund 3 % eines Quartalsumsatzes, Image +6 und ein Jahr lang 5 % mehr Nachfrage.', wirkung: { kosten: 0.03, kostenMin: 50_000, image: 6, nachfrage: { faktor: 1.05, quartale: 4 } }, erfolg: 'Euer Logo prangt auf jedem Radweg-Schild. Die Leute radeln – und kaufen.' },
      { id: 'leihraeder', label: 'Leihräder für die Eröffnung stellen', hinweis: 'Günstig (1 %), Bekanntheit +2 Punkte.', wirkung: { kosten: 0.01, kostenMin: 15_000, bekanntheit: 0.02 }, erfolg: 'Hunderte Gäste testen eure Räder bei der Eröffnung.' },
      { id: 'raushalten', label: 'Raushalten', hinweis: 'Keine Kosten, keine Wirkung.', wirkung: {}, erfolg: 'Der Bürgermeister eröffnet die Straßen ohne euch.', standard: true },
    ],
  },
  {
    id: 'hacker',
    titel: 'Erpresser legen die Server lahm',
    text: 'Eine Schadsoftware hat alle Rechner von {firma} verschlüsselt. Auf dem Bildschirm: eine Lösegeldforderung und ein grinsender Totenkopf.',
    icon: 'schloss',
    gewicht: 0.8,
    abQuartal: 4,
    optionen: [
      { id: 'zahlen', label: 'Lösegeld zahlen', hinweis: 'Rund 2 % eines Quartalsumsatzes. Ob der Schlüssel funktioniert?', wirkung: { kosten: 0.02, kostenMin: 40_000 }, risiko: { chance: 0.3, wirkung: { kapazitaet: { faktor: 0.8, quartale: 1 }, image: -3 }, text: 'Die Erpresser schicken einen falschen Schlüssel. Geld weg, Werke trotzdem ein Quartal auf 80 %.' }, erfolg: 'Der Schlüssel funktioniert. Die IT schwört: nie wieder.' },
      { id: 'experten', label: 'IT-Notfallteam holen', hinweis: 'Rund 3 % eines Quartalsumsatzes, die Werke laufen fast normal (95 %).', wirkung: { kosten: 0.03, kostenMin: 50_000, kapazitaet: { faktor: 0.95, quartale: 1 } }, erfolg: 'Das Notfallteam putzt die Rechner in Rekordzeit.' },
      { id: 'backup', label: 'Aus der Sicherung im Keller neu aufsetzen', hinweis: 'Kostenlos, aber die Werke schaffen ein Quartal nur 75 % – vielleicht gehen Bestellungen verloren.', wirkung: { kapazitaet: { faktor: 0.75, quartale: 1 } }, risiko: { chance: 0.3, wirkung: { zufriedenheit: -6 }, text: 'Die Sicherung war von 2019: Bestellungen gingen verloren, die Kundschaft ist verärgert.' }, erfolg: 'Die alte Sicherung klappt – nach einem Quartal Handarbeit ist alles wieder da.', standard: true },
    ],
  },
  {
    id: 'abwasser',
    titel: 'Lieferant verschmutzt einen Fluss',
    text: 'Reporter haben herausgefunden, dass euer Rahmenlieferant Lackreste in einen Fluss leitet.',
    icon: 'wasser',
    gewicht: 0.9,
    optionen: [
      { id: 'wechseln', label: 'Sofort den Lieferanten wechseln', hinweis: 'Material zwei Quartale 6 % teurer, dafür Nachhaltigkeit +4 und Image +2.', wirkung: { material: { faktor: 1.06, quartale: 2 }, nachhaltigkeit: 4, image: 2 }, erfolg: 'Klare Kante: Die Umweltverbände loben {firma}.' },
      { id: 'audit', label: 'Audit und Nachbesserung verlangen', hinweis: 'Rund 1 % eines Quartalsumsatzes; jedes vierte Mal reicht das der Öffentlichkeit nicht.', wirkung: { kosten: 0.01, kostenMin: 15_000 }, risiko: { chance: 0.25, wirkung: { image: -6 }, text: '„Zu wenig, zu spät“, schreibt die Presse. Image −6.' }, erfolg: 'Der Lieferant baut eine Kläranlage. Die Sache ist erledigt.' },
      { id: 'ignorieren', label: 'Ignorieren', hinweis: 'Kostet nichts – aber die Geschichte kann groß werden.', wirkung: {}, risiko: { chance: 0.55, wirkung: { image: -12, nachhaltigkeit: -6 }, text: 'Die Geschichte macht die Runde: Image −12, Nachhaltigkeit −6.' }, erfolg: 'Die Meldung geht im Nachrichtenstrom unter.', standard: true },
    ],
  },
  {
    id: 'fernsehtest',
    titel: 'TV-Show „Härtetest“ will euer Rad zerlegen',
    text: 'Die beliebteste Technik-Sendung des Landes möchte das {produkt} von {firma} vor laufender Kamera an seine Grenzen bringen.',
    icon: 'tv',
    gewicht: 0.9,
    kontext: 'produkt',
    optionen: [
      { id: 'zusagen', label: 'Zusagen', hinweis: 'Hält das Rad, gibt es Bekanntheit +6 und Image +4. Je zufriedener eure Kundschaft, desto besser die Chancen.', wirkung: {}, risiko: { chance: (s) => Math.min(0.6, Math.max(0.1, 0.85 - zufriedenheitMittel(s) / 100)), wirkung: { image: -10, nachfrage: { faktor: 0.92, quartale: 2, nurProdukt: true } }, glueck: { bekanntheit: 0.06, image: 4 }, text: 'Der Rahmen knackt live im Fernsehen. Image −10, das {produkt} verkauft sich zwei Quartale schlechter.' }, erfolg: 'Das {produkt} übersteht alles – sogar den Sprung von der Laderampe. Bekanntheit +6, Image +4.' },
      { id: 'absagen', label: 'Höflich absagen', hinweis: 'Kein Risiko, keine Wirkung.', wirkung: {}, erfolg: 'Die Sendung testet stattdessen ein Rad der Konkurrenz.', standard: true },
    ],
  },
  {
    id: 'hochwasser',
    titel: 'Hochwasser bedroht das Werk {werk}',
    text: 'Der Fluss neben dem Werk {werk} steigt und steigt. Die Feuerwehr rechnet mit Überschwemmungen in den nächsten Tagen.',
    icon: 'wasser',
    gewicht: 0.8,
    kontext: 'werk',
    optionen: [
      { id: 'sandsaecke', label: 'Sandsäcke und Nachtschicht', hinweis: 'Rund 1,5 % eines Quartalsumsatzes – das Team hält zusammen (Motivation +3 Punkte).', wirkung: { kosten: 0.015, kostenMin: 20_000, motivation: 0.03 }, erfolg: 'Die Belegschaft schleppt die ganze Nacht Sandsäcke. Das Werk bleibt trocken.' },
      { id: 'pausieren', label: 'Maschinen hochstellen, Werk pausieren', hinweis: 'Keine Kosten, aber das Werk schafft ein Quartal nur 60 %.', wirkung: { kapazitaet: { faktor: 0.6, quartale: 1, nurWerk: true } }, erfolg: 'Alle Maschinen stehen sicher. Nach dem Hochwasser geht es weiter.' },
      { id: 'hoffen', label: 'Hoffen, dass der Damm hält', hinweis: 'Kostet nichts. Hält der Damm nicht, wird es teuer.', wirkung: {}, risiko: { chance: 0.45, wirkung: { kapazitaet: { faktor: 0.35, quartale: 1, nurWerk: true }, kosten: 0.025, kostenMin: 40_000 }, text: 'Der Damm bricht: Das Werk {werk} steht unter Wasser, nur 35 % Kapazität und teure Reparaturen.' }, erfolg: 'Der Damm hält. Glück gehabt.', standard: true },
    ],
  },
  {
    id: 'kartell',
    titel: 'Ein heimliches Angebot von {konkurrent}',
    text: 'Bei einem Glas Wein schlägt die Chefin von {konkurrent} vor, die Preise „ein bisschen abzustimmen“. Alle würden mehr verdienen …',
    icon: 'handschlag',
    gewicht: 0.7,
    abQuartal: 6,
    kontext: 'konkurrent',
    optionen: [
      { id: 'mitmachen', label: 'Heimlich mitmachen', hinweis: 'Bringt rund 3 % eines Quartalsumsatzes extra. Das Kartellamt schläft nicht immer.', wirkung: { ertrag: 0.03 }, risiko: { chance: 0.3, wirkung: { kosten: 0.12, kostenMin: 150_000, image: -20 }, text: 'Razzia! Das Kartellamt verhängt ein Bußgeld von 12 % eines Quartalsumsatzes, Image −20.' }, erfolg: 'Die Absprache bleibt geheim – die Kasse klingelt. Ein mulmiges Gefühl bleibt.' },
      { id: 'anzeigen', label: 'Beim Kartellamt melden', hinweis: 'Image +5 – aber {konkurrent} wird sich mit Kampfpreisen rächen.', wirkung: { image: 5, rache: 2 }, erfolg: 'Das Kartellamt dankt. {konkurrent} schäumt vor Wut und senkt die Preise.' },
      { id: 'ablehnen', label: 'Freundlich ablehnen', hinweis: 'Keine Wirkung.', wirkung: {}, erfolg: 'Man trinkt den Wein aus und geht getrennte Wege.', standard: true },
    ],
  },
  {
    id: 'kita',
    titel: 'Die Belegschaft wünscht sich eine Betriebskita',
    text: 'Viele junge Eltern arbeiten bei {firma}. Der Betriebsrat bittet um eine Kita direkt am Werk.',
    icon: 'kita',
    gewicht: 0.8,
    abQuartal: 4,
    optionen: [
      { id: 'bauen', label: 'Kita bauen', hinweis: 'Rund 2 % eines Quartalsumsatzes, Motivation +7 Punkte, Image +3.', wirkung: { kosten: 0.02, kostenMin: 40_000, motivation: 0.07, image: 3 }, erfolg: 'Die Kita „Kleine Speichen“ eröffnet – mit Laufrad-Parcours.' },
      { id: 'zuschuss', label: 'Zuschuss zu Kita-Plätzen', hinweis: 'Rund 0,7 % eines Quartalsumsatzes, Motivation +3 Punkte.', wirkung: { kosten: 0.007, kostenMin: 10_000, motivation: 0.03 }, erfolg: 'Die Eltern freuen sich über den Zuschuss.' },
      { id: 'ablehnen', label: 'Ablehnen', hinweis: 'Keine Kosten, Motivation −3 Punkte.', wirkung: { motivation: -0.03 }, erfolg: 'Der Betriebsrat ist enttäuscht.', standard: true },
    ],
  },
  {
    id: 'promi',
    titel: 'Ein Filmstar will ein Sondermodell',
    text: 'Ein berühmter Schauspieler wünscht sich ein vergoldetes {produkt} – und möchte es öffentlich präsentieren.',
    icon: 'stern',
    gewicht: 0.6,
    kontext: 'produkt',
    optionen: [
      { id: 'bauen', label: 'Goldrad bauen', hinweis: 'Rund 1 % eines Quartalsumsatzes, Bekanntheit +4 Punkte. Manche finden Goldräder protzig.', wirkung: { kosten: 0.01, kostenMin: 20_000, bekanntheit: 0.04 }, risiko: { chance: 0.25, wirkung: { nachhaltigkeit: -3, image: -3 }, text: 'Die Presse lästert über das „Protzrad“: Image −3, Nachhaltigkeit −3.' }, erfolg: 'Der Star posiert auf dem roten Teppich mit eurem goldenen {produkt}.' },
      { id: 'bambus', label: 'Ein Öko-Modell aus Bambus anbieten', hinweis: 'Rund 1 % eines Quartalsumsatzes, Image +3, Nachhaltigkeit +2 – falls er es mag.', wirkung: { kosten: 0.01, kostenMin: 20_000 }, risiko: { chance: 0.4, wirkung: {}, glueck: { image: 3, nachhaltigkeit: 2, bekanntheit: 0.02 }, text: 'Der Star findet Bambus „irgendwie nicht glamourös“ und lehnt ab.' }, erfolg: 'Der Star ist begeistert vom Bambusrad – und erzählt es jedem.' },
      { id: 'ablehnen', label: 'Ablehnen', hinweis: 'Keine Wirkung.', wirkung: {}, erfolg: 'Der Star kauft sich ein Rad bei der Konkurrenz.', standard: true },
    ],
  },
];
