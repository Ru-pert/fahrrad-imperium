/** Kurzanleitung für Claude – zum Kopieren in einen neuen Chat. */
export const ANLEITUNG_FUER_CLAUDE = `Du hilfst mir beim Unternehmensplanspiel „Fahrrad-Imperium“. Eine Runde = ein Quartal.
Ich schicke dir die Zeitung (Text) und einen Lagebericht (JSON, format "fahrrad-imperium/lagebericht").
Bitte analysiere die Lage, erkläre deine Überlegungen kurz und liefere am Ende GENAU EIN JSON im folgenden Format.

ENTSCHEIDUNGS-JSON (format "fahrrad-imperium/entscheidungen", version 1):
{
  "format": "fahrrad-imperium/entscheidungen",
  "version": 1,
  "quartal": "<naechstesQuartal aus dem Lagebericht>",
  "produkte": {
    "<produkt-id>": {
      "produktion": { "<werk-id>": <Stück, ganze Zahl ≥ 0> },
      "fe": <F&E-Budget € ≥ 0>,
      "maerkte": { "DE": { "preis": <€>, "marketing": <€ ≥ 0> } }
    }
  },
  "werke": {
    "<werk-id>": {
      "personalAenderung": <ganze Zahl, max. +50 % / −20 % des Bestands>,
      "schulungProKopf": <0–2000 €>,
      "linienKaufen": [ { "typ": "A" | "B" | "C", "anzahl": <n> } ],
      "linienVerkaufen": [ "<linien-id>" ],
      "wartung": "keiner" | "basis" | "voll",
      "halleErweitern": true | false
    }
  },
  "lieferanten": { "rahmen": "billig|standard|premium", "akku": "…", "antrieb": "…" },
  "nachhaltigkeitsbudget": <€>,
  "finanzen": { "darlehenNeu": <€ bis freiesKreditlimit>, "tilgungExtra": <€>, "dividende": <€ ≤ Gewinnrücklagen> },
  "firmensitz": { "kaufen": [ "<nächste Stufe oder Extra-id>" ] },
  "forschung": { "<projekt-id>": <€ je Quartal> },
  "expansion": { "maerkteBetreten": [ "EU" | "NA" | "AS" | "RW" ], "produkteEinfuehren": [ "<produkt-id>" ], "werkeBauen": [ "DE" | "PL" | "US" | "MX" | "VN" | "BR" ] },
  "begruendung": "<1–3 Sätze>"
}
Fehlende Felder = Wert aus dem Vorquartal. Am einfachsten: „entscheidungsVorlage“ aus dem Lagebericht nehmen und ändern.

WERTEBEREICHE UND REGELN
- Preis: 50–300 % des Referenzpreises (siehe produkte.<p>.maerkte.DE.referenzpreis).
- Produktion: Summe aus Menge × montageStundenJeStueck × lernkurve je Werk ≤ werke.<w>.stundenKapazitaetNaechstesQuartal.
  Kapazität = min(Maschinenstunden, Personalstunden × 1,15). Überstunden (über Personalstunden) kosten +50 % Lohn, 20.000 € Schichtkosten, Qualität −0,03.
- Neue Linien: Bauzeit 1 Quartal, max. 4 je Quartal, nur auf freien Hallenplätzen; Halle erweitern erst, wenn alle Plätze belegt (5 Mio. €).
- Gesperrte Bereiche stehen in optionen.gesperrt (Komplexitätsstufe) – Werte dort werden ignoriert.
- Forschung: Neue Produkte entstehen nur über Forschungsprojekte (optionen.forschung: Kosten, Mindestdauer, Voraussetzungen). Das Budget läuft weiter, bis es geändert wird; fertig, wenn Kosten erreicht UND Mindestdauer vorbei. Märkte entwickeln sich unterschiedlich (optionen.marktTrends).
- Expansion: nur freigeschaltete Regionen (siehe optionen). Markteintritt kostet einmalig (EU 2 Mio., NA 15 Mio., AS 40 Mio., RW 100 Mio. €), Verkauf ab Folgequartal. Produkteinführung 500.000 €, 1 Quartal Vorlauf. Werke: 2–3 Quartale Bauzeit, starten leer (Linien kaufen, Personal einstellen).
- Darlehen: 8 Quartale lineare Tilgung, Zins = konditionen.darlehenszinsNeu. Kontokorrent (12 %) springt automatisch ein.

WIRKUNGEN (kurz)
- Nachfrage hängt ab von: Markenbekanntheit^0,6, Preis relativ zum Markt (Elastizität je Produkt), Technik (F&E-Stock veraltet 5 %/Q), Marketing mit abnehmendem Grenzertrag, Qualität und Image.
- Unbediente Nachfrage wandert zur Konkurrenz. Ist die Ware knapp, wird sie anteilig zur Nachfrage auf deine Märkte verteilt. Lager kostet 2 % der Herstellkosten je Quartal.
- Saison: Q1 ×0,75, Q2 ×1,30, Q3 ×1,15, Q4 ×0,80. Marktpreise sinken langsam; die Erfahrungskurve senkt die Kosten.
- „wirkungsabschaetzung“ im Lagebericht zeigt, was einzelne Hebel kurzfristig bringen (Schätzung ohne Zufall).
- Ereignisse unter „ereignisseAktiv“ wirken im kommenden Quartal.

Antworte auf Deutsch. Gib das JSON in einem einzigen Codeblock aus.`;
