# Fahrrad-Imperium – Projektstand

Diese Datei hält fest, was umgesetzt ist, wo das Spiel bewusst von der [Spezifikation](../SPEZIFIKATION.md) abweicht und was offen ist. Sie ist die Anknüpfungsstelle für neue Arbeitssitzungen.

## Umgesetzt (Stufen aus Abschnitt 16)

| Stufe | Inhalt | Stand |
| --- | --- | --- |
| 1 | Engine-Kern: Datenmodell, RNG, Markt, Produktion, GuV/Bilanz/Cashflow, Konkurrenz, Tests | fertig |
| 2 | Basis-UI, Speichern, GitHub Pages, PWA | fertig (Fokus PC; Handy-Grundlayout vorhanden) |
| 3 | Austausch mit Claude: Lagebericht, Entscheidungs-Import mit Prüfung, Anleitung | fertig |
| 4 | Zeitung mit Ereigniskatalog, Text-Export, Vorlesen | fertig |
| 5 | Tiefe (Vertrieb, CI, Kundenzufriedenheit, Großabnehmer, Planungsrechner …) | **größtenteils** – zusätzlich Kundenzufriedenheit, Großabnehmer, Ausschreibungen, Einkauf mit Mengenstaffeln, Rettungsangebot; offen: Vertrieb (Wirkung), Corporate Identity, Planungsrechner/-qualität, Kostenrechnung |
| 6 | Expansion: Regionen, Meilensteine, Werke, weitere Konkurrenten, Weltkarte, Weltrangliste | fertig |
| 7 | Isometrisches Werksgelände, Firmensitz mit Shop | fertig |
| 8 | Börse, Übernahmen, Marktforschung, Spionage | teilweise – Marktforschung (4 Produkte) und Spionage fertig; Börse und Übernahmen offen |
| 9 | Erfolge, Animationen, Feinschliff, Balancing | teilweise (Erfolge, Animationen, eigene Symbolsprache, Klänge, Quartalswechsel-Szene, Beraterin, Garage, Startbildschirm; Balancing offen) |

## Bewusste Abweichungen von der Spezifikation

- **Start nur mit dem Stadtrad.** Alle anderen Produkte (auch das E-Bike) entstehen über einen **Forschungsbaum** (`src/engine/config/research.ts`): Budget je Quartal, Mindestdauer, Voraussetzungen. Die Spec-Freischaltbedingungen und die Einführung für 500.000 € entfallen. Startanteil Stadtrad 0,75 % (`START.anteilNurStadtrad`).
- **Feature-Forschung** (`src/engine/config/features.ts`): 19 Ausstattungsmerkmale in 5 Epochen von realistisch (Nabenschaltung, Scheibenbremsen) bis völlig irre (Anti-Schwerkraft, Fluxkompensator). Gleiche Mechanik wie der Produktbaum (Budget, Mindestdauer, Voraussetzungen, auch Produkt-Projekte). Wirkung ab dem Folgequartal, dauerhaft, je passendem Produkt: Technik/Qualität additiv, Nachfrage als Faktor auf die Attraktivität (`staerke`), Material als Kostenfaktor; Image (gedeckelt +6) und Nachhaltigkeit unternehmensweit. Konkurrenten haben keine Features.
- **Marktlebenszyklen:** Statt fester Segmentwachstumsraten hat jedes Segment eine Kurve (Basis + Boom + Welle, `PRODUKTE[p].lebenszyklus`): Stadtrad schrumpft langsam, E-Bike boomt früh, Lastenrad später, E-MTB spät, Rennrad/MTB wellenförmig.
- **Lieferung bei Knappheit anteilig zur Nachfrage** statt „Heimatmarkt zuerst“ (`BALANCE.lieferreihenfolge`), weil sonst neue Märkte dauerhaft leer ausgingen.
- **Balancing (Stand Testrunde 2):** Materialfaktor 1,35, Preisverfall des Restmarkts 0,8 %/Q, Werbewirkung in der Bekanntheit skaliert (`marke.werbeSkala` 0,12), Verwaltungs-Sachkosten 100.000 €.
- **GuV:** zusätzliche Zeile „Fertigungsgemeinkosten“ (Energie, Linienfixkosten, Wartung, Nacharbeit, Lager); Leerkosten des Personals unter „Personal“.
- **Eröffnungsbilanz:** Kapitalrücklage als Ausgleichsposten; Werk-Buchwert 1,2 Mio. € = 900.000 € Gebäude + 300.000 € Linien.
- **Kontokorrent** nach 7.1 (Mindestkasse 50.000 €); **Insolvenz** sofort nach 2 kritischen Quartalen (Rettungsangebot fehlt noch).
- **Großkonkurrenten** werden beim Start über eine „Stärke“ auf Zielanteile kalibriert; ihre Bekanntheit bleibt konstant, F&E je Produkt ist gedeckelt, Golden Spoke/Freedom Wheels haben einen Kostenvorteil (`kostenFaktor`).
- **Neue Werke** starten leer; Einstellungslimit mindestens 20 Personen.
- **Hallenerweiterung** (+4 Plätze, 5 Mio. €) auch für das Startwerk.
- **Firmensitz-Extras:** je +0,5 Image, zusammen max. +2.

## Spieltiefe (`src/engine/tiefe.ts`, Parameter `config/tiefe.ts`)

- **Kundenzufriedenheit** je Region und Produkt (Schlüssel `R:p` in `unternehmen.zufriedenheit`), Formel nach 5.7; Faktor (Z/50)^0,5 auf die Spieler-Attraktivität. Fehlmenge aus dem laufenden Quartal (wirkt ab dem nächsten).
- **Einkauf**: Abweichung – nicht bestellte Sets werden **ohne Aufschlag** nachgekauft (statt Just-in-time +20 %), Rabatt nur auf Vorausbestellungen; Materiallager wird zuerst verbraucht.
- **Großabnehmer/Ausschreibungen** werden zum Quartalsende für das Folgequartal erzeugt (`state.angebote`), Lieferung vor dem Markt; Ausschreibungen zahlen über die Forderungen im Folgequartal. Das Konkurrenzgebot ist verdeckt (nicht im Export).
- **Rettungsangebot** statt sofortiger Insolvenz (einmalig); ohne Antwort gilt „annehmen“.
- **Marktforschung** wird sofort angezeigt (Daten des Vorquartals mit Rauschen, geseedet je Quartal), gebucht beim Abschluss; Spionage zeigt `konkurrenzPlaene` exakt, 10 % Planänderung, Entdeckung mit Strafe, Image −15 und Rache-Preisen.

## Balancing-Stand (Standard-Bot, `src/engine/bot.ts`)

- E-Bike erforscht ≈ Q7, weitere Produkte bis ≈ Q16; Features ab ≈ Q12, Fluxkompensator ≈ Q39.
- Europa ≈ Q7–Q20 (je nach Verlauf), Nordamerika ≈ Q15–Q20, Asien ≈ Q24–Q33, Rest der Welt ≈ Q36–Q44.
- Offen: Margen bei großer Skalierung zu hoch; Weltmarktführerschaft gegen Golden Spoke kaum erreichbar; „Alles maximal“ führt zur Pleite (gewollt).

## Wichtige Dateien

- Engine: `src/engine/` (simulate, market, competitors, expansion, forschung, zeitung, achievements), Balancing in `src/engine/config/`.
- Austausch: `src/io/`.
- Oberfläche: `src/ui/pages/`, Grafiken in `src/ui/components/` und `src/ui/iso/`. Eigene Symbole: `components/Illus.tsx` (Duotone, über `Icon` automatisch), Klänge: `ui/klang.ts` (Web Audio, abschaltbar), Beraterin: `components/Beraterin.tsx`, Quartalswechsel: `components/Quartalswechsel.tsx`.
- Tests: `src/engine/engine.test.ts`, `src/io/io.test.ts` (`npm test`).
- Deployment: `.github/workflows/deploy.yml` → GitHub Pages bei Push auf `main`.

## Offene Wünsche / nächste Schritte

- Stufe 5 vervollständigen (siehe oben), Stufe 8 (Börse, Übernahmen, Marktforschung).
- Balancing-Durchläufe (Stufe 9).
- Handy-Ansicht für die neuen Grafiken optimieren (bisher bewusst nur PC).
