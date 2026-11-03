# Spezifikation: Fahrrad-Imperium – Unternehmensplanspiel

Nov 3, 2026 · @Rupert

## 1. Überblick & Spielidee

„Fahrrad-Imperium“ ist ein rundenbasiertes Unternehmensplanspiel für eine Person: Man startet als kleine Fahrradmanufaktur in Deutschland und soll zum größten Fahrradhersteller der Welt werden. Eine Runde entspricht einem Quartal. Das Spiel hat kein festes Ende, gespielt wird, solange es Spaß macht.

**Ablauf einer Runde**

1. Die Zeitung erscheint mit den Ergebnissen des Vorquartals, Zufallsereignissen und Klatsch über die Konkurrenz.
2. Der Spieler analysiert das Cockpit, Berichte und gekaufte Marktforschung.
3. Optional exportiert er Zeitung und Spielstand als Text/JSON, bespricht die Lage mit Claude und importiert das von Claude gelieferte Entscheidungs-JSON.
4. Der Spieler prüft und ändert die Entscheidungen in der Oberfläche und schließt das Quartal ab.
5. Die Engine berechnet Markt, Produktion, Finanzen, Konkurrenz und Ereignisse; Erfolge und Freischaltungen werden mit Animationen gefeiert.

Rundenablauf: Zeitung erscheint → Lage analysieren → Prüfen und anpassen → Quartal abschließen → Engine rechnet → nächste Zeitung. Optionale Schleife zwischen „Lage analysieren“ und „Prüfen und anpassen“: Lage exportieren (Zeitung als Text, Lagebericht als JSON) → mit Claude planen → Entscheidungs-JSON importieren.

Die obere Reihe ist der normale Ablauf; die farbige Schleife ist der optionale Weg über Claude.

**Wachstumskurve:** Der Start ist bewusst bedächtig, mit wenigen Tausend Rädern pro Quartal und einem Umsatz im einstelligen Millionenbereich pro Jahr. Neue Märkte, neue Produkte, Erfahrungskurveneffekte, Werke im Ausland und Übernahmen sorgen dafür, dass das Wachstum später exponentiell wird. Balancing-Ziel: Bei gutem Spiel wird Europa um Quartal 6–10 freigeschaltet, Nordamerika um Q14–20, Asien um Q24–32, und die Weltmarktführerschaft ist um Q40–60 erreichbar.

**Gestaltungsprinzipien:** Ein nachvollziehbares, aber nicht triviales Marktmodell, eine ansehnliche grafische Oberfläche, Humor in der Zeitung und ein vollständiger Text/JSON-Kreislauf, damit man jede Runde gemeinsam mit Claude planen kann.

## 2. Technik & Architektur

Die App ist eine reine Browser-Anwendung ohne Server: Vite + React + TypeScript, lokal per `npm run dev` startbar und als statischer Build auslieferbar.

| Baustein | Wahl | Zweck |
| --- | --- | --- |
| Framework | React 18 + TypeScript (strict) | UI |
| Build | Vite | Dev-Server, statischer Build |
| Styling | Tailwind CSS, Hell-/Dunkelmodus | Modernes, aufgeräumtes Design |
| Zustand | Zustand (Store) | UI-Zustand, aktueller Spielstand |
| Charts | Recharts | Linien-, Balken-, Donut-Diagramme |
| Animation | Framer Motion | Freischaltungen, IPO-Feier, Zahlen-Hochzählen |
| Karten | d3-geo + world-atlas (TopoJSON) | Weltkarte mit Regionen |
| Validierung | Zod | JSON-Import prüfen |
| Speicher | IndexedDB (via idb-keyval) | Spielstände, Historie |
| Tests | Vitest | Engine-Tests, Bilanzprüfung |
| Vorlesen | Web Speech API (de-DE) | Zeitung vorlesen |

**Architekturregeln**

- Die Spiellogik liegt in `src/engine/` als reine Funktionen ohne React-Abhängigkeit. Kernfunktion: `simulateQuarter(state, decisions, rng) → { nextState, report }`.
- Alle Zufallszahlen kommen aus einem geseedeten Generator (z. B. mulberry32). Gleicher Seed + gleiche Entscheidungen = gleiches Ergebnis.
- Sämtliche Balancing-Parameter stehen zentral in `src/engine/config/` (Märkte, Produkte, Ereignisse, Kosten), damit man sie ohne Codeänderung justieren kann.
- Zahlen- und Datumsformat de-DE (1.234.567 €, „Q2 2027“). Die gesamte Oberfläche ist auf Deutsch.
- Responsiv: vollständig spielbar auf Smartphone (ab 360 px Breite), Tablet und Desktop (Details in Abschnitt 14). Installierbar als PWA (vite-plugin-pwa) und offline spielbar, veröffentlicht über GitHub Pages.

**Ordnerstruktur (Vorschlag)**

```
src/
  engine/        simulateQuarter, market, production, finance, competitors,
                 events, research, stock, achievements, rng
  engine/config/ balance.ts, markets.ts, products.ts, events.ts, hq.ts
  io/            exportState.ts, importDecisions.ts, newspaperText.ts, schemas.ts
  store/         gameStore.ts, saveSlots.ts
  ui/pages/      Cockpit, Zeitung, Entscheidungen, Markt, Finanzen, Werke,
                 Firmensitz, Boerse, Marktforschung, Erfolge, Austausch, Einstellungen
  ui/components/ KpiTile, Charts, WorldMap, IsoFactory, HqBuilding, Newspaper
  assets/        SVG-Sprites (Fahrräder, Gebäudemodule)
```

## 3. Startsituation & Produkte

Das Spiel beginnt in Q1 2027 mit einer GmbH in einer Garage, einem kleinen Werk in Deutschland und zwei Modellen: Stadtrad und E-Bike. Alle Werte sind Spielwerte, grob an der Realität orientiert, und in `config/` justierbar.

**Startwerte**

| Größe | Wert |
| --- | --- |
| Kasse | 1.500.000 € |
| Gezeichnetes Kapital | 1.000.000 € (100 % beim Gründer) |
| Bankdarlehen | 1.000.000 €, 5 % p. a., 8 Quartale |
| Werk „Darmstadt“ | 2 Fertigungslinien à 6.000 Std./Quartal, Buchwert 1.200.000 € |
| Personal Fertigung | 24 Mitarbeitende |
| Lager | je 300 Stück Stadtrad und E-Bike |
| Markenbekanntheit DE | 2 % |
| Nachhaltigkeit / Image | 40 / 50 (Skala 0–100) |
| F&E-Stock | 100.000 € je Startprodukt |
| Lieferanten | überall „Standard“ |
| Firmensitz | Garage |

Ergänzende Startwerte: Die beiden Linien sind vom Typ B (Abschnitt 6) mit 6 bzw. 14 Quartalen Restlaufzeit und Umweltindex 40 bzw. 45. Wartungsvertrag „Voll“. Vertrieb DE: 4 Mitarbeitende. Einkauf und Verwaltung werden automatisch besetzt (Start 1 bzw. 4). Motivation 1,00, Kompetenz 1,00, Kundenzufriedenheit 52 je Produkt, Materiallager je 400 Sets, Technikindex laut Testmagazin: Stadtrad 105, E-Bike 104.

**Produktlinien** (Preise und Kosten in € je Stück, Wachstum = Marktwachstum des Segments pro Quartal)

| Produkt | Freischaltung | Referenzpreis | Material | Montage (Std.) | Preiselastizität ε | Technik-Sensitivität τ | Wachstum/Q |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stadtrad | Start | 650 | 260 | 4 | 2,5 | 0,15 | 0,3 % |
| E-Bike | Start | 2.800 | 1.350 | 7 | 1,4 | 0,45 | 2,0 % |
| Mountainbike | F&E-Gesamtstock ≥ 1 Mio. € | 1.100 | 450 | 5 | 1,8 | 0,30 | 1,0 % |
| Lastenrad | Umsatz 4Q ≥ 15 Mio. € | 4.200 | 2.100 | 10 | 1,2 | 0,35 | 3,5 % |
| Rennrad | Europa freigeschaltet | 1.900 | 800 | 6 | 1,1 | 0,50 | 0,8 % |
| E-MTB | E-Bike-Technik ≥ Marktdurchschnitt + 0,5 | 4.500 | 2.200 | 9 | 1,0 | 0,55 | 2,5 % |

Die Einführung eines neuen Produkts kostet einmalig 500.000 € Entwicklung plus 1 Quartal Vorlauf; der F&E-Stock des neuen Produkts startet bei 50 % der Einführungskosten. Später können als Langzeitziel „Smart-Bike“ und „Carbon-Luxus“ folgen (Platzhalter in der Konfiguration).

## 4. Entscheidungen pro Quartal

Jede Runde setzt der Spieler die folgenden Hebel. Nicht veränderte Werte werden aus dem Vorquartal übernommen, damit eine Runde auch mit wenigen Klicks spielbar bleibt.

| Bereich | Entscheidung | Ebene | Wertebereich / Einheit |
| --- | --- | --- | --- |
| Absatz | Verkaufspreis | Produkt × Markt | 50–300 % des Referenzpreises, € |
| Absatz | Marketingbudget | Produkt × Markt | 0–beliebig, €/Quartal |
| Produktion | Produktionsmenge | Produkt × Werk | Stück, begrenzt durch Kapazität inkl. max. 15 % Überstunden |
| Produktion | Neue Fertigungslinien | Werk | 0–4 je Quartal, Typ A/B/C (Abschnitt 6), 1 Quartal Bauzeit; Verkauf alter Linien |
| Personal | Einstellen / Entlassen | Werk | max. +50 % bzw. −20 % des Bestands je Quartal |
| Personal | Schulungsbudget | Werk | € je Mitarbeitende/n und Quartal (0–2.000) |
| Lieferkette | Lieferantenstufe | Komponente (Rahmen, Akku, Antrieb) | Billig / Standard / Premium |
| F&E | F&E-Budget | Produkt | €/Quartal |
| Nachhaltigkeit | Nachhaltigkeitsbudget | Unternehmen | €/Quartal |
| Finanzen | Darlehen aufnehmen / tilgen | Unternehmen | €, bis Kreditlimit |
| Finanzen | Dividende | Unternehmen | €, nur bei Gewinnrücklagen > 0 |
| Marktforschung | Berichte / Spionage kaufen | Region bzw. Konkurrent | siehe Abschnitt 11 |
| Expansion | Markt betreten, Produkt einführen, Werk bauen, Übernahme | Unternehmen | siehe Abschnitt 8 |
| Börse | IPO, Kapitalerhöhung, Rückkauf, Beteiligungen | Unternehmen | siehe Abschnitt 12 |
| Firmensitz | Ausbaustufen und Extras kaufen | Unternehmen | siehe Abschnitt 14 |

Die Eingabemaske zeigt bei jeder Entscheidung eine Live-Vorschau: geschätzte Kapazitätsauslastung, Stückkosten, Liquidität am Quartalsende (ohne Absatzrisiko) und Warnungen, zum Beispiel „Produktion übersteigt Kapazität“ oder „Kasse droht negativ zu werden“.

**Zusätzliche Entscheidungen** (Details in den genannten Abschnitten)

| Bereich | Entscheidung | Ebene | Abschnitt |
| --- | --- | --- | --- |
| Vertrieb | Zahl der Vertriebsmitarbeitenden | Markt | 5.7 |
| Kommunikation | Corporate-Identity-Budget (langfristige Marke) | Unternehmen | 5.7 |
| Sonderabsatz | Liefermenge an Großabnehmer, Gebotspreis bei Ausschreibungen | Angebot | 5.8 |
| Produktion | Wartungsvertrag (Keiner / Basis / Voll) | Werk | 6.1 |
| Einkauf | Bestellmenge Material-Sets | Produkt | 6.3 |
| Finanzen | Kurzfristkredit, Langfristdarlehen, Finanzanlage | Unternehmen | 7 |
| Planung | Absatzprognose je Produkt und Markt, Umsatz- und EBIT-Prognose | Produkt × Markt | 4.2 |

**4.1 Wachsende Komplexität**

Damit der Einstieg leicht bleibt, werden Entscheidungen schrittweise freigeschaltet. Bis zur Freischaltung setzt die Engine sinnvolle Standardwerte, und die Zeitung kündigt jede neue Stufe an. Im Profimodus (beim Spielstart wählbar) ist alles ab Q1 offen.

| Stufe | Ab | Neu verfügbar |
| --- | --- | --- |
| 1 | Q1 | Preis, Produktion, Werbung, F&E, Produktionspersonal, Darlehen, Firmensitz |
| 2 | Q3 | Vertrieb, Corporate Identity, Lieferanten, Wartung, Großabnehmer, Absatzprognose |
| 3 | Q5 | Linientypen und Verkauf, Einkauf mit Mengenstaffeln, Ausschreibungen, Nachhaltigkeit, Marktforschung, Planungsrechner, Finanzanlagen, Kostenrechnung |
| 4 | Meilensteine | Neue Märkte, Produkte, Werke, Übernahmen, Börse, Spionage |

**4.2 Planungsqualität**

Vor jedem Quartalsabschluss gibt der Spieler eine Absatzprognose je Produkt und Markt sowie eine Umsatz- und EBIT-Prognose ab. Die Planungsqualität (0–100) misst die Treffsicherheit, geglättet über 4 Quartale:

```latex
PQ_t = 0.75\,PQ_{t-1} + 0.25\cdot\max\left(0,\;100\cdot\left(1 - 2\cdot\text{wMAPE}_t\right)\right)
```

wMAPE ist der absatzgewichtete mittlere absolute Prognosefehler. Start: PQ = 60. Wirkung: PQ fließt ins Rating und in die Börsenstimmung ein (±0,05 je 10 Punkte Abweichung von 60), und die Zeitung lobt oder tadelt die „Planungsgüte“.

**4.3 Planungsrechner (Was-wäre-wenn)**

- Eigene Seite mit bis zu 5 Szenarien. Jedes Szenario startet als Kopie der aktuellen Entscheidungen, kann frei verändert werden und bekommt Annahmen: Absatz je Produkt und Markt, wahlweise „Engine schätzt“.
- Bei „Engine schätzt“ gilt: Die Konkurrenz wiederholt ihre Vorquartalsentscheidungen, und es gibt keine neuen Zufallsereignisse. Echte Konkurrenzpläne fließen nie ein, damit der Rechner die Spionage nicht ersetzt.
- Ergebnis: Kennzahlen (Umsatz, DB, EBIT, Kasse, Auslastung, Stückkosten) und die vollständigen Berichte; Vergleichstabelle aller Szenarien nebeneinander; Button „Als Entscheidung übernehmen“.
- Kosten je Berechnung: 50.000 € (Konfiguration; im Schwierigkeitsgrad „Leicht“ kostenlos). Szenarien lassen sich als Entscheidungs-JSON exportieren.

## 5. Marktmodell (Mathematik)

Die Nachfrage folgt einem Attraktivitätsmodell (Multiplicative Competitive Interaction, üblich in Planspielen): Jedes Angebot hat pro Markt und Segment eine Attraktivität, und die Nachfrage verteilt sich proportional dazu. Ein „Restmarkt“ aus vielen kleinen Anbietern sorgt dafür, dass ein Neuling klein startet und Marktanteile erst erkämpfen muss.

**5.1 Marktvolumen** je Markt m, Segment s, Quartal t (Stück):

```latex
V_{m,s,t} = V_{m,s,0}\,(1+g_s)^{t}\; S_{q(t)}\; E_{m,s,t}\; \left(\frac{\bar P_{m,s,t}}{P^{ref}_{m,s}}\right)^{-\eta}
```

- V₀ = Startvolumen (Abschnitt 8), g = Segmentwachstum (Abschnitt 3), E = Ereignisfaktor (Abschnitt 10, Standard 1).
- Saisonfaktor S: Q1 0,75 · Q2 1,30 · Q3 1,15 · Q4 0,80.
- Marktpreiselastizität η = 0,5: Senken alle die Preise, wächst der Gesamtmarkt etwas.
- P^ref je Markt = Referenzpreis × Kaufkraftindex der Region.

**5.2 Attraktivität** des Anbieters i:

```latex
A_{i} = B_{i,m}^{\,0.6}\cdot\left(\frac{P_{i}}{\bar P_{m,s}}\right)^{-\varepsilon_s}\cdot e^{\tau_s\,(T_{i,s}-\bar T_{s})}\cdot\left(1+\mu\left(1-e^{-M_{i}/M^{*}_{m,s}}\right)\right)\cdot Q_i^{\kappa}\cdot\left(1+0.3\,\tfrac{I_i-50}{50}\right)
```

| Faktor | Bedeutung | Parameter |
| --- | --- | --- |
| B^0,6 | Markenbekanntheit in der Region (0–1), wirkt unterproportional | Exponent 0,6 |
| (P/P̄)^−ε | Preis relativ zum absatzgewichteten Durchschnittspreis inkl. Restmarkt | ε je Segment: Stadtrad 2,5 (preissensibel) bis E-MTB 1,0 (Premium) |
| e^{τ(T−T̄)} | Technikvorsprung gegenüber dem Branchendurchschnitt | τ je Segment, 0,15–0,55 |
| 1+μ(1−e^{−M/M\*}) | Aktuelles Marketing mit abnehmendem Grenzertrag | μ = 1,0; M\* = 0,05 % des Segmentumsatzes im Markt |
| Q^κ | Produktqualität (0,8–1,2) | κ = 1,5 |
| Image-Faktor | Image 0–100, neutral bei 50 | ±30 % |

**5.3 Nachfrage und Marktanteil**

```latex
D_{i,m,s} = V_{m,s,t}\cdot\frac{A_{i}}{A^{0}_{m,s}+\sum_{j} A_{j}}
```

A⁰ ist der Restmarkt. Er wird beim Spielstart so kalibriert, dass ein Anbieter mit Startwerten 0,3 % Marktanteil im Segment erhält. A⁰ schrumpft um 1 % je Quartal (Konsolidierung) und zusätzlich durch Zukäufe regionaler Marken. Kann ein Anbieter nicht liefern, wandern 80 % der unbedienten Nachfrage anteilig zur Konkurrenz, der Rest verfällt; kann auch der Empfänger nicht liefern, wird nicht erneut umverteilt.

**5.4 Markenbekanntheit** (Bestandsgröße je Region, baut sich langsam auf und ab):

```latex
B_{t} = B_{t-1}(1-\delta) + (1-B_{t-1})\left[\lambda\left(1-e^{-M_t/M^{*}}\right) + \omega\, \text{MA}_{t-1}\right]
```

δ = 0,06 (Vergessen), λ = 0,25 (Werbewirkung), ω = 0,5 (Mundpropaganda, MA = eigener Marktanteil). Beim Eintritt in eine neue Region startet B bei 1 % plus 10 % der höchsten bisherigen Bekanntheit.

**5.5 Technologie** (F&E-Stock je Produkt, mit Veralterung):

```latex
F_{t} = 0.95\,F_{t-1} + \text{F\&E}_t,\qquad T = \ln\left(1+\frac{F_t}{F^{*}}\right),\quad F^{*}=200\,000\ \text{€}
```

T̄ ist der Durchschnitt aller Anbieter inklusive eines Restmarkt-Werts, der um 1,5 % je Quartal steigt. Wer nicht forscht, fällt also zurück.

**5.6 Qualität**: Q = Mittelwert der Lieferantenfaktoren (Billig 0,90 · Standard 1,00 · Premium 1,10) + Schulungsbonus (bis +0,05 bei 1.500 €/Kopf) − 0,03 bei Überstunden, begrenzt auf 0,8–1,2.

**Plausibilitätscheck für das Balancing**: 5 % unter dem Durchschnittspreis bringen beim Stadtrad etwa +14 % Attraktivität, beim E-MTB nur +5 %. Eine Verdopplung des Marketings von 0,5·M\* auf M\* erhöht den Marketingfaktor nur von 1,39 auf 1,63. Ein Technikvorsprung von 1,0 bringt beim E-Bike +57 %.

**5.7 Erweiterungen der Attraktivität**

Die Formel aus 5.2 wird um drei Faktoren erweitert, und zwei bestehende Faktoren werden präzisiert:

```latex
A_i^{erw} = A_i \cdot \underbrace{\text{clamp}\left(\left(\frac{\tilde V_{i,m}}{V^{ref}_{i,m}}\right)^{0.3},\,0.5,\,1.3\right)}_{\text{Vertrieb}} \cdot \underbrace{\left(\frac{Z_{i,m,s}}{50}\right)^{0.5}}_{\text{Kundenzufriedenheit}} \cdot \underbrace{\phi(TI_{i,s})}_{\text{Marktfähigkeit}}
```

| Baustein | Regel |
| --- | --- |
| Vertrieb | Ṽ = geglättete Vertriebsstärke (0,6 × aktuell + 0,4 × Vorquartal), V^ref = Absatz des Vorquartals ÷ 400 Räder je Vertriebskraft. Gehalt 9.500 € brutto je Quartal. Für einen Markteintritt sind mindestens 3 Vertriebsleute nötig. |
| Kundenzufriedenheit Z (0–100) | Z\_t = Z\_{t−1} + 0,3 · (Z^Ziel − Z\_{t−1}); Z^Ziel = 50 + 25 · (Q − 1)/0,2 + 0,2 · (Umweltindex − 50) − 150 · Preiserhöhung (Anteil) − 40 · Fehlmengenquote des Vorquartals + 0,1 · (Image − 50). Preissenkungen zählen nicht negativ. |
| Marktfähigkeit φ | Technikindex laut Testmagazin TI = 105 + 12 · (T − T̄). φ = 1 bei TI ≥ 100; darunter gilt das Produkt als nicht marktfähig, φ = 0,2. |
| Preiskorridor (präzisiert) | Innerhalb von ±2 % um P̄ wirkt nur 30 % der Elastizität (unelastischer Bereich), außerhalb die volle; die Funktion bleibt stetig (siehe unten). |
| Werbung (präzisiert) | μ wird mit dem Preis-Leistungs-Verhältnis gewichtet: μ\_eff = μ · PLV^0,5 mit PLV = e^{τ(T−T̄)} · Q ÷ (P/P̄). M\* ist mindestens das durchschnittliche Werbebudget der Konkurrenz im Segment, sodass relative Budgets zählen. |
| Corporate Identity | Eigener Bestand G\_t = 0,97 · G\_{t−1} + CI\_t. In der Bekanntheitsgleichung (5.4) kommt der Term λ\_CI · (1 − e^{−G/G\*}) mit λ\_CI = 0,08 und G\* = 0,5 % des Jahresumsatzes (mind. 100.000 €) hinzu. CI wirkt in allen Regionen und für alle Produkte, aber langsamer als Werbung. |

Preisfunktion mit Korridor (r = P/P̄, k = 0,3):

```latex
f(r)=\begin{cases} r^{-k\varepsilon} & |r-1|\le 0.02\\ 1.02^{-k\varepsilon}\,(r/1.02)^{-\varepsilon} & r>1.02\\ 0.98^{-k\varepsilon}\,(r/0.98)^{-\varepsilon} & r<0.98\end{cases}
```

**5.8 Sonderabsatz und Lieferreihenfolge**

- **Großabnehmer**: Je Quartal und freigeschalteter Region erscheinen 0–2 Angebote (z. B. Leasingfirma, Lieferdienst, Hotelkette) mit Produkt, Festpreis (60–85 % von P̄) und Höchstmenge. Der Spieler wählt die Liefermenge (0 bis Höchstmenge). Es fallen keine Logistikkosten an, die Zahlung kommt sofort, und der reguläre Absatz wird nicht berührt.
- **Öffentliche Ausschreibungen**: Gelegentlich (15 %/Quartal) schreibt eine Behörde eine Menge aus, z. B. Diensträder für die Polizei, mit Mindest-Technikindex. Der Spieler gibt einen Stückpreis ab, und das niedrigste Gebot gewinnt. Bei Gleichstand entscheidet der höhere Technikindex. Die Konkurrenz bietet etwa HK × (1,05–1,25). Die Zahlung kommt im Folgequartal, Logistikkosten fallen nicht an.
- **Lieferreihenfolge bei Knappheit**: 1. Ausschreibungen, 2. Großabnehmer, 3. Heimatmarkt, 4. Auslandsmärkte (in der Reihenfolge der Freischaltung).
- Angebote stehen in der Zeitung und im Lagebericht-JSON (mit ID).

## 6. Produktion, Personal, Lieferkette, Kosten

Die Produktion ist durch Maschinenstunden und Personalstunden begrenzt; der Engpass bestimmt die maximale Menge.

**Kapazität je Werk**

```latex
\text{Std}_{max} = \min\left(\sum_{Linien} \text{Kap}_{Typ}\cdot \text{Verfügbarkeit},\; 480 \cdot \text{MA} \cdot \text{Prod}_{I} \cdot 1.15\right)
```

Bis 100 % der regulären Personalstunden gilt normaler Lohn, die bis zu 15 % Überstunden kosten +50 %. Benötigte Stunden = Σ Menge × Montagestunden × Lernkurve.

**Herstellkosten je Stück**

```latex
HK = \text{Material}_s \cdot L_f \cdot E_{Preis} \cdot LK + \text{Std}_s \cdot LK \cdot \frac{\text{Lohn}_{Werk}}{480}
```

```latex
LK = \max\left(0.6,\; \left(\frac{X_{kum,s}}{2\,000}\right)^{-0.15}\right)
```

- L\_f = Lieferantenfaktor (Billig 0,85 · Standard 1,00 · Premium 1,15), gewichtet: Rahmen 30 %, Antrieb 30 %, Akku 40 % des Materials bei E-Modellen; ohne Akku 50/50.
- E\_Preis = Ereignisfaktor, z. B. Stahlpreisschock.
- LK = Erfahrungskurve über die kumulierte Produktionsmenge X\_kum je Produkt (jede Verdopplung spart rund 10 %, Untergrenze 60 %). Sie ist ein zentraler Motor für das spätere Turbowachstum.

**Personal**

| Größe | Wert |
| --- | --- |
| Lohn je MA und Quartal (DE) | 8.500 € brutto zzgl. 30 % Personalnebenkosten und 5 % Betriebsrente (≈ 11.500 € gesamt); Länderindex: Polen 0,5 · USA 1,1 · Vietnam 0,3 · Mexiko 0,4 |
| Einstellungskosten | 3.000 € je Person |
| Entlassungskosten | 6.000 € je Person (Abfindung), Image −1 je 10 % Abbau |
| Fluktuation | 3 % × (2 − Motivation) je Quartal (siehe 6.4) |
| Streikrisiko | steigt bei Schulung < 300 €/Kopf und hoher Überstundenquote |

Verwaltungspersonal wird nicht einzeln geplant, sondern steckt in den Verwaltungskosten (Abschnitt 7).

**Lieferkette**

| Stufe | Kostenfaktor | Qualität | Ausfallrisiko/Quartal | Nachhaltigkeit |
| --- | --- | --- | --- | --- |
| Billig | 0,85 | 0,90 | 8 % | −5 Punkte |
| Standard | 1,00 | 1,00 | 3 % | ±0 |
| Premium | 1,15 | 1,10 | 1 % | +5 Punkte |

Fällt ein Lieferant aus, können alle Produkte mit dieser Komponente in dem Quartal nur zu 60 % produziert werden. Billig-Lieferanten erhöhen außerdem das Rückrufrisiko (Abschnitt 10).

**Lager und Logistik**: Lagerhaltung kostet 2 % der Herstellkosten je Stück und Quartal. Das Lager wird mit Durchschnittskosten bewertet. Verkauft wird aus einem gemeinsamen Pool je Produkt; die Engine beliefert jeden Markt vom günstigsten Werk. Logistik kostet innerhalb der Region 3 % des Preises, regionsübergreifend 8 % zuzüglich Zoll (Nordamerika 10 %, Asien 15 %, Rest der Welt 12 %).

**6.1 Linientypen und Wartung**

| Typ | Kaufpreis | Lebensdauer | Kapazität (Std./Q) | Sonstige Fixkosten/Q | Umweltindex | Restwert bei Verkauf |
| --- | --- | --- | --- | --- | --- | --- |
| A – Hochleistung | 900.000 € | 40 Q | 9.000 | 25.000 € | 45 | 30 % vom Buchwert |
| B – Standard | 600.000 € | 40 Q | 6.000 | 15.000 € | 60 | 40 % vom Buchwert |
| C – Öko-Kompakt | 450.000 € | 32 Q | 4.000 | 8.000 € | 85 | 20 % vom Buchwert |

Abgeschriebene Linien dürfen weiterlaufen, verlieren aber ohne Wartung schneller an Verfügbarkeit. Je Werk muss mindestens eine Linie bleiben. Beim Verkauf werden der Restbuchwert als sonstiger Aufwand und der Erlös als sonstiger Ertrag gebucht. Neue Linientypen können später per Zeitung angekündigt werden (z. B. „Roboterzelle“).

| Wartungsvertrag | Kosten je Linie/Q | Verfügbarkeit |
| --- | --- | --- |
| Keiner | 0 € | sinkt um 3 Prozentpunkte je Quartal (kumulativ, min. 70 %), 5 % Störungsrisiko je Linie |
| Basis | 4.000 € | 95 % |
| Voll | 7.000 € | 100 %, Verfügbarkeit erholt sich um 5 Prozentpunkte je Quartal |

**6.2 Überstunden, Nacharbeit, Energie**

- Überstunden (bis 15 %) lösen zusätzlich zum Lohnzuschlag sprungfixe Schichtkosten von 20.000 € je Werk und Quartal aus.
- Nacharbeitsquote je Produkt:

```latex
r = 0.02\cdot e^{\,0.3\,T}\cdot\left(1+3\max(0,\,U-1)\right)\cdot\left(1+0.1\ln\tfrac{\text{Menge}}{2\,000}\right),\qquad \text{Kosten} = r\cdot \text{Menge}\cdot 0.4\cdot HK
```

U ist die Auslastung (Linien oder Personal, der höhere Wert). Höhere Technik macht die Produkte komplexer und erhöht damit die Nacharbeit, ein Gegengewicht zu „immer mehr F&E“.

- Energie: 2 € je Montagestunde, beeinflussbar durch das Ereignis „Energiepreisschock“.

**6.3 Einkauf mit Mengenstaffeln**

Je Produkt bestellt der Spieler Material-Sets (ein Set = alle Komponenten für ein Rad, Preis laut Lieferantenstufe). Fehlende Sets werden automatisch per Just-in-time zu +20 % geliefert. Lagerkosten für Material: 1,5 % des Materialwerts je Quartal.

| Bestellmenge je Produkt und Quartal | Rabatt |
| --- | --- |
| unter 1.000 | 0 % |
| 1.000–4.999 | 3 % |
| 5.000–19.999 | 6 % |
| 20.000–99.999 | 10 % |
| ab 100.000 | 13 % |

**6.4 Abteilungen, Motivation, Produktivität**

- Abteilungen: Produktion (geplant je Werk), Vertrieb (geplant je Markt), F&E (im Budget enthalten), Einkauf und Verwaltung (automatisch nach Umsatz: MA\_Verw = 4 · (Umsatz\_Q / 2,5 Mio. €)^0,7, MA\_Eink = 1 · (Umsatz\_Q / 2,5 Mio. €)^0,7 · (1 + 0,2 · T̄\_eigen), Gehalt je 10.000 € brutto/Q).
- Wer in einem Quartal mehr als 20 % einer Abteilung entlässt, zahlt je weiterer Entlassung zusätzlich 8.000 €. Neueinstellungen sind durch den Arbeitsmarkt begrenzt (Ereignis „Fachkräftemangel“ halbiert das Limit).
- Motivation M (0,7–1,2): M\_t = M\_{t−1} + 0,3 · (M^Ziel − M\_{t−1}) mit M^Ziel = 1 − 1,5 · (U − 0,8)² + 0,1 · (1 − e^{−Schulung/500}) − 0,5 · Entlassungsquote. Die beste Auslastung liegt bei rund 80 %.
- Kompetenz K: K\_t = K\_{t−1} + 0,2 · (K^Ziel − K\_{t−1}) mit K^Ziel = 0,9 + 0,25 · (1 − e^{−Schulung/800}). Bei 500 €/Kopf bleibt K etwa bei 1,0.
- Einarbeitung E = 1 − 0,5 · Anteil der Neueinstellungen im Quartal.
- Produktivitätsindex I = E · K · M (wirkt auf die Personalstunden). Produktivitätsindex II ist die Erfahrungskurve LK aus Abschnitt 6 (wirkt auf die Montagestunden je Rad). Beide Indizes erscheinen im Produktionsbericht.

## 7. Finanzen: GuV, Bilanz, Cashflow, Kredite, Insolvenz

Jedes Quartal erzeugt die Engine eine vollständige GuV (Umsatzkostenverfahren), Bilanz und Kapitalflussrechnung. Aktiva = Passiva muss in jedem Quartal exakt aufgehen; ein Test prüft das.

**GuV-Schema**

| Position | Berechnung |
| --- | --- |
| Umsatzerlöse | Σ Absatz × Preis |
| − Herstellkosten des Umsatzes | Absatz × durchschnittliche HK (Material + Fertigungslöhne) |
| − Logistik & Zölle | Abschnitt 6 |
| = Deckungsbeitrag |  |
| − Marketing, F&E, Nachhaltigkeit, Marktforschung | Entscheidungen |
| − Personalnebenkosten | Einstellung, Entlassung, Schulung, Überstundenzuschlag, Lagerkosten |
| − Verwaltung | Gehälter Einkauf und Verwaltung (6.4) + 50.000 € Sachkosten + 1 % je Quartal auf den Wert des Firmensitzes + Umweltabgabe (13) |
| − Abschreibungen | Linien und Werke linear 40 Quartale, Firmensitz 80 Quartale |
| = EBIT |  |
| − Zinsen | Darlehen + Kontokorrent |
| = EBT |  |
| − Steuern | 30 % auf positives EBT, mit Verlustvortrag |
| = Jahres-/Quartalsüberschuss |  |

**Bilanz**: Aktiva sind Sachanlagen (Werke, Linien, Firmensitz), Beteiligungen, Vorräte, Forderungen (siehe Zahlungsverhalten), Finanzanlagen und Kasse. Passiva sind Eigenkapital (gezeichnetes Kapital, Kapitalrücklage, Gewinnrücklagen inkl. Verlustvortrag), Darlehen, Kontokorrent und Verbindlichkeiten aus Lieferungen (20 % des Materialaufwands).

**Kapitalflussrechnung** (indirekt): Operativer Cashflow, Investitions-Cashflow und Finanzierungs-Cashflow, jeweils als Wasserfalldiagramm darstellbar.

**Kredite und Rating**

| Instrument | Konditionen |
| --- | --- |
| Darlehen | Laufzeit 8 Quartale, lineare Tilgung, Zins = Basiszins 3 % + Rating-Aufschlag |
| Kontokorrent | springt automatisch ein, wenn die Kasse negativ wird; 12 % p. a. |
| Kreditlimit | 3 × EBITDA der letzten 4 Quartale + 50 % des Sachanlagevermögens |

Das Rating (AAA bis C) hängt von Verschuldungsgrad (Netto-Schulden / EBITDA) und Eigenkapitalquote ab. Aufschläge reichen von 0,5 % (AAA) bis 9 % (C).

**Insolvenz**: Liegt das Kontokorrent zwei Quartale in Folge über dem Kreditlimit oder ist das Eigenkapital zwei Quartale negativ, kommt einmalig ein „Rettungsangebot“ eines Investors (frisches Kapital gegen 40 % der Anteile). Wird es abgelehnt oder tritt der Fall erneut ein, ist das Spiel vorbei: Die Zeitung druckt einen Nachruf, und der Spieler kann einen früheren Spielstand laden.

**7.1 Zahlungsverhalten, Kredite, Finanzanlagen**

| Thema | Regel |
| --- | --- |
| Kundenzahlungen | 85 % des Umsatzes im Quartal, 15 % im Folgequartal (Forderungen). Großabnehmer zahlen sofort, Ausschreibungen im Folgequartal. |
| Kurzfristkredit | Laufzeit 1 Quartal, wird automatisch zurückgezahlt, Zins = Basiszins + 2 % + Rating-Aufschlag |
| Darlehen | wie oben: 8 Quartale, lineare Tilgung |
| Langfristdarlehen | 40 Quartale endfällig, fester Zins bei Abschluss (Basiszins + 1 % + Rating-Aufschlag), nicht vorzeitig tilgbar |
| Kontokorrent | sichert eine Mindestkasse von 50.000 €, wird im Folgequartal automatisch zurückgeführt |
| Finanzanlage | Festgeld für 1 Quartal, Zins = Basiszins − 1 %, Rückzahlung automatisch |

**Rating-Faktoren**: Ergebnis, Eigenkapital, Eigenkapitalquote, Produktqualität, Planungsqualität (4.2), Produktivitätsindex I, Kundenzufriedenheit, Free Cashflow im Verhältnis zu den Verbindlichkeiten, Nutzung des Kontokorrents. Daraus wird ein Score von 0–100 gebildet, und je 10 Punkte gilt eine Ratingstufe (AAA bis D). Die Zinskonditionen ändern sich ab dem Folgequartal (außer bei laufenden Langfristdarlehen).

**7.2 Kostenrechnung**

- Kostenartenrechnung: Material, Energie, Löhne und Gehälter, Nebenkosten, Rente, Abschreibungen, Wartung, Nacharbeit, Marketing, CI, F&E, Logistik, Zinsen, Sonstiges.
- Kostenstellenrechnung: Einkauf, Produktion, F&E, Vertrieb, Verwaltung. Die Gebäude-Abschreibung der Werke wird zu 5 / 70 / 5 / 5 / 15 % verteilt, die Verwaltungskosten werden nach Umsatzanteil auf die Produkte umgelegt.
- Kostenträgerrechnung: Herstellkosten und Selbstkosten je Produkt und Stück.
- Mehrstufige Deckungsbeitragsrechnung je Produkt und Markt: DB I = Umsatz − variable Kosten (Material, Energie, Logistik, Nacharbeit); DB II = DB I − produktfixe Kosten (Werbung, F&E, Fertigungslöhne); DB III = DB II − marktfixe Kosten (Vertrieb); Betriebsergebnis = Σ DB III − Unternehmensfixkosten (CI, Verwaltung, Firmensitz).
- Lagerbericht mit Bestandsentwicklung und Durchschnittskosten (Anfangsbestand + Zugang − Abgang = Endbestand) für Fertigräder und Material-Sets.

## 8. Expansion: Märkte, Werke, Übernahmen

Wachstum entsteht stufenweise: Jede neue Region vervielfacht das erreichbare Marktvolumen, muss aber durch Meilensteine freigeschaltet und mit einer Eintrittsinvestition (Vertrieb, Händlernetz, Zulassung) erkauft werden.

**Regionen** (Volumen = alle Segmente zusammen, Stück je Quartal zu Spielbeginn; Segmentmix in der Reihenfolge Stadtrad / E-Bike / MTB / Rennrad / Lastenrad / E-MTB)

| Region | Startvolumen/Q | Zusatzwachstum/Q | Kaufkraftindex | Segmentmix % | Freischaltung | Eintritt |
| --- | --- | --- | --- | --- | --- | --- |
| Deutschland | 1,0 Mio. | 0 % | 1,00 | 35/30/15/7/5/8 | Start | – |
| Europa (übrige EU, UK, CH) | 4,0 Mio. | 0 % | 0,95 | 45/25/12/8/4/6 | Umsatz 4Q ≥ 10 Mio. € und Marktanteil DE ≥ 1 % | 2 Mio. € |
| Nordamerika | 4,5 Mio. | 0,3 % | 1,10 | 30/20/25/10/5/10 | Umsatz 4Q ≥ 60 Mio. € und Nachhaltigkeit ≥ 45 | 15 Mio. € |
| Asien | 15 Mio. | 1,0 % | 0,55 | 70/18/5/3/2/2 | Umsatz 4Q ≥ 250 Mio. € und ein Werk außerhalb DE | 40 Mio. € |
| Rest der Welt | 8 Mio. | 1,5 % | 0,50 | 65/12/12/4/4/3 | Umsatz 4Q ≥ 1 Mrd. € | 100 Mio. € |

Das Zusatzwachstum kommt zum Segmentwachstum hinzu. Innerhalb einer Region gibt es keine Länder-Unterteilung; die Weltkarte färbt aber die zugehörigen Länder ein.

**Werke**

| Standort | Region | Lohnindex | Baukosten | Bauzeit | Besonderheit |
| --- | --- | --- | --- | --- | --- |
| Deutschland (weiteres Werk) | DE | 1,00 | 12 Mio. € | 2 Q | keine |
| Polen | Europa | 0,50 | 8 Mio. € | 2 Q | erfordert Europa |
| USA | Nordamerika | 1,10 | 15 Mio. € | 2 Q | spart US-Zoll |
| Mexiko | Nordamerika | 0,40 | 10 Mio. € | 2 Q | Nachhaltigkeit −3 |
| Vietnam | Asien | 0,30 | 10 Mio. € | 3 Q | Qualität −0,03, Nachhaltigkeit −5 |
| Brasilien | Rest der Welt | 0,45 | 12 Mio. € | 3 Q | erfordert Rest der Welt |

Ein neues Werk bietet Hallen für 4 Fertigungslinien; eine Hallenerweiterung für +4 Linien kostet 5 Mio. €. Linien und Personal werden separat beschafft. Ausnahme: Ein Werk darf schon vor der Freischaltung seiner Region gebaut werden, wenn es für die Asien-Bedingung nötig ist (Polen, USA, Mexiko).

**Übernahmen**

- Kaufbar ist jeder Konkurrent, dessen Umsatz höchstens halb so groß ist wie der eigene. Ist er börsennotiert, muss man über die Börse mehr als 50 % der Aktien erwerben (Abschnitt 12).
- Kaufpreis = Unternehmenswert × 1,3 (Kontrollprämie). Zahlung in bar, per Darlehen oder nach dem IPO auch in eigenen Aktien.
- Effekt: Werke, Linien, Personal und Lager werden übernommen. Die Markenbekanntheit wird zu max(B\_eigen, B\_fremd) + 0,5 × min(…), der F&E-Stock addiert sich. Integrationskosten betragen einmalig 10 % des Kaufpreises, und 2 Quartale lang gilt ein Effizienzabschlag von 5 %.
- „Regionale Marke zukaufen“ (ab Europa): kauft ein Stück Restmarkt, A⁰ der Region sinkt um 3 %, die Bekanntheit steigt um 2 Prozentpunkte. Preis = 0,15 % des Jahresmarktumsatzes der Region.

## 9. Konkurrenten (KI-Strategien)

Die Konkurrenten laufen durch dasselbe Marktmodell wie der Spieler, aber mit vereinfachter Finanzrechnung (Umsatz, Marge, Kasse, Kapazität). Jeder folgt einem Strategieprofil mit Zufallsrauschen von ±5 % auf alle Entscheidungen.

| Name | Heimat | Start | Profil | Verhalten |
| --- | --- | --- | --- | --- |
| Drahtesel & Söhne | DE | ähnlich groß wie der Spieler | Kostenführer | Preis 8–12 % unter Durchschnitt, Billig-Lieferanten, wenig F&E |
| Velo Veritas | DE | ähnlich groß | Technik/Premium | Preis +15 %, F&E 8 % vom Umsatz, Premium-Lieferanten |
| Kettenreaktion GmbH | DE | etwas größer | Marketing-Rakete | Marketing 15 % vom Umsatz, sprunghafte Preise, riskante Expansion (kann pleitegehen) |
| Pedalo Italiano | Europa | 5× Spieler | Design/Image | hohe Bekanntheit, Rennrad-Fokus |
| Fietsfabriek NL | Europa | 8× Spieler | Lastenrad-Spezialist | stark bei Lastenrädern, Nachhaltigkeit 75 |
| Freedom Wheels Inc. | Nordamerika | 300 Mio. € Umsatz/Jahr | MTB-Riese | aggressiv bei Preissenkungen gegen Neueinsteiger |
| Golden Spoke Corp. | Asien | 6 Mrd. € Umsatz/Jahr | amtierender Weltmarktführer | wächst 1 % je Quartal, reagiert spät, aber hart |

Konkurrenten außerhalb der freigeschalteten Regionen werden im Hintergrund mitsimuliert und sind in Zeitung und Weltrangliste sichtbar.

**Entscheidungsregeln je Quartal** (in `engine/competitors.ts`)

1. Preis = Zielpreis des Profils × Durchschnittspreis. Hat der Spieler im Vorquartal Marktanteile gewonnen, wird mit Wahrscheinlichkeit „Aggressivität“ (0,2–0,8) um 3–8 % gesenkt (Reaktion mit 1 Quartal Verzögerung).
2. Marketing und F&E = fester Prozentsatz vom Vorquartalsumsatz laut Profil.
3. Kapazität +1 Linie bei Auslastung > 90 %, Produktion = Absatzprognose × 1,1.
4. Expansion in neue Regionen nach Profil-Schwellen; Insolvenz bei Kasse < 0 über 3 Quartale. Ein pleite gegangener Konkurrent wird zur Zeitungsmeldung und kann günstig übernommen werden (Preis × 0,6).

**Schwierigkeitsgrade**: Leicht (Reaktionen halbiert, Effizienz −10 %), Normal, Schwer (Reaktionen sofort, Effizienz +10 %, Spionage-Abwehr höher).

**Weltrangliste**: Eine Tabelle aller Hersteller nach Jahresumsatz weltweit. Das Spielziel „Weltmarktführer“ ist erreicht, wenn der Spieler vier Quartale in Folge Platz 1 belegt.

## 10. Zeitung & Zufallsereignisse

Jede Runde beginnt mit einer Ausgabe von **„Der Kettenblatt-Kurier – Fachblatt für angewandte Zweiradökonomie“**. Die Zeitung transportiert Ergebnisse, Ereignisse und Stimmung mit einem augenzwinkernden Ton.

**Aufbau einer Ausgabe**

- Titelseite: Schlagzeile zum wichtigsten Ereignis oder Ergebnis, Datum („Ausgabe Q3 2027“), Preis „1 Speiche“.
- 1 Marktbericht zum Vorquartal (Branchenzahlen, nicht die geheimen Werte der Konkurrenz).
- 1–2 Ereignisartikel, die sich auf die kommende Runde auswirken. Der Effekt wird im Text erkennbar angedeutet („Experten erwarten Preissteigerungen bei Stahlrahmen um rund 15 %“).
- 1 Konkurrenz-Klatsch, z. B. „Kettenreaktion-Chef posiert mit Leasing-Ferrari – Bank posiert mit Mahnung“.
- Kurzmeldungen und eine Glosse, später ein Börsenteil nach dem IPO.
- Sonderausgaben: Markteintritt, IPO, Übernahme, Weltmarktführerschaft, Insolvenz (Nachruf).

**Humor-Leitlinien**: Wiederkehrende erfundene Figuren wie Prof. Dr. Ulrike Speiche (Institut für angewandte Pedalogie), Börsenguru Hanno Hebel und Leserbriefschreiber Horst aus Wanne-Eickel. Dazu kommen Wortspiele rund ums Rad („Da ist der Wurm im Ventil“) und gutmütige Seitenhiebe auf Konkurrenten und auf den Spieler selbst. Je Ereignis gibt es mindestens 3 Textvarianten mit Platzhaltern (`{firma}`, `{produkt}`, `{wert}`), damit sich die Zeitung nicht wiederholt.

**Ereigniskatalog (Auszug, erweiterbar in `config/events.ts`)**

| Ereignis | Wahrsch./Q | Wirkung | Dauer | Beispiel-Schlagzeile |
| --- | --- | --- | --- | --- |
| E-Bike-Kaufprämie | 6 % | E-Bike/E-MTB-Nachfrage +25 % in einer Region | 4 Q | „Vater Staat steigt aufs Rad – und zahlt die Batterie“ |
| Stahlpreisschock | 8 % | Rahmenkosten +15 % | 2 Q | „Stahl so teuer, dass Diebe jetzt Rahmen statt Räder klauen“ |
| Akku-Engpass | 7 % | E-Modelle max. 70 % Produktion | 2 Q | „Akku leer – auch in der Lieferkette“ |
| Hitzesommer (nur Q2/Q3) | 15 % | Nachfrage +10 % | 1 Q | „Deutschland schwitzt – und tritt in die Pedale“ |
| Regenrekord | 10 % | Nachfrage −10 % | 1 Q | „Horst aus Wanne-Eickel: Ich fahr jetzt Kanu“ |
| Radsport-Fieber | 5 % | Rennrad +30 % | 2 Q | „Ganz Europa im Lycra-Rausch“ |
| Lastenrad-Hype | 5 % | Lastenrad +30 %, dauerhaft +0,5 %/Q Wachstum | 4 Q | „SUV war gestern: Eltern rüsten auf“ |
| Zollstreit | 5 % (ab NA) | Zoll NA +15 Prozentpunkte | 4 Q | „Handelskrieg: Jetzt rollen die Retourkutschen“ |
| Zinswende | 6 % | Basiszins +2 Prozentpunkte | dauerhaft | „Bank entdeckt Zinsen wieder“ |
| Streik | 4 % (+ Risiko aus Abschnitt 6) | Kapazität −25 % in einem Werk | 1 Q | „Bänder stehen still – nur die Kaffeemaschine läuft“ |
| Rückruf | 3 % je Billig-Komponente | Kosten 5 % Umsatz des Produkts, Image −10 | 1 Q | „{firma}: Wenn die Bremse zum Überraschungsei wird“ |
| Testsieg | bei Technik-Platz 1: 20 % | Bekanntheit +5 Pkt., Image +5 | einmalig | „Testsieger! Prof. Speiche weint vor Freude“ |
| Influencer-Hype | 5 % | zufälliges Unternehmen: Bekanntheit +8 Pkt. | einmalig | „Fitness-Influencerin fährt {produkt} – Follower fahren mit“ |
| Fahrradboom | 1 % | Nachfrage +40 %, danach 2 Q −10 % | 3 Q | „Alle wollen Rad – Händler verkaufen sogar Ausstellungsstücke“ |
| EU-Nachhaltigkeitsgesetz | einmalig ab Q16 | Schwellenwert der Umweltabgabe (13) steigt von 50 auf 60 | dauerhaft | „Brüssel will grüne Speichen“ |

Die Wahrscheinlichkeiten sind so abgestimmt, dass pro Quartal im Mittel 1–2 Ereignisse eintreten. Ereignisse wirken stets ab dem Quartal, für das gerade entschieden wird, und werden daher vor der Entscheidung bekannt gegeben.

Weitere Ereignisse: „Energiepreisschock“ (5 %, Energie +50 %, 2 Q), „Fachkräftemangel“ (5 %, Einstellungslimit halbiert, 2 Q) sowie Ankündigungen neuer Linientypen, Wartungskonditionen und Zinssätze.

**Feste Rubriken in jeder Ausgabe**

- **Testmagazin „Rad & Tat“**: veröffentlicht Technikindex und Umweltindex aller Produkte am Markt (eigene und fremde). Produkte unter 100 Punkten werden als „nicht marktfähig“ gebrandmarkt (5.7), der Spitzenreiter bekommt den Testsieg (Ereignis oben).
- **Angebote**: Großabnehmer-Anfragen und Ausschreibungen des Quartals mit Produkt, Menge, Preis bzw. Mindest-Technikindex (5.8).
- **Konditionen**: Basiszins, Zinssätze für alle Kreditarten und Finanzanlagen, Rating des Spielers.
- **Branchenbericht** (kostenlos): Umsatz, EBIT und Bilanzsumme aller Konkurrenten des Vorquartals sowie Marktvolumen je Region. Detailwerte zu Preisen und Budgets gibt es weiterhin nur über Marktforschung (11).

**Text-Export und Vorlesen**

- Button „Zeitung kopieren“: Kopiert die Ausgabe als reinen, gut vorlesbaren Text (Schlagzeilen in Großbuchstaben, Absätze, keine Tabellen) in die Zwischenablage. Optional hängt er einen Block „Lage in Zahlen“ an (Kasse, Umsatz, EBIT, Marktanteile, Lager, Kapazität).
- Button „Vorlesen“: Liest die Ausgabe per Web Speech API (de-DE) vor, mit Pause/Weiter und wählbarer Stimme und Geschwindigkeit.

## 11. Marktforschung & Spionage

Ohne gekaufte Informationen sieht der Spieler nur seine eigenen Zahlen und die groben Branchenwerte aus der Zeitung. Mehr Wissen kostet Geld, und je billiger die Quelle, desto ungenauer sind die Zahlen. Die Ungenauigkeit wird als multiplikatives Rauschen umgesetzt: Wert × (1 + N(0, σ)), geseedet.

| Produkt | Preis je Region | Lieferzeitpunkt | Inhalt | Genauigkeit σ |
| --- | --- | --- | --- | --- |
| Marktbericht | 20.000 € | sofort (Vorquartal) | Marktvolumen je Segment, Marktanteile aller Anbieter, Durchschnittspreise | 15 % Anteile, 8 % Preise |
| Branchenanalyse | 80.000 € | sofort (Vorquartal) | Preise, Marketing, F&E-Budget, Kapazität und Bekanntheit je Konkurrent | 5 % Preise, 15 % Budgets |
| Kundenbefragung | 50.000 € | sofort | Geschätzte Preis-, Marketing- und Techniksensitivität je Segment, Zufriedenheit mit eigenen Produkten | 20 % |
| Industriespionage | 250.000 € je Konkurrent | sofort | Die **geplanten** Entscheidungen des Konkurrenten für das kommende Quartal (Preise, Budgets, Expansion) | exakt |

**Wichtig für die Spionage**: Die Konkurrenz-KI legt ihre Entscheidungen zu Quartalsbeginn fest (vor der Spielereingabe), damit Spionage echte Vorteile bringt. Mit 10 % Wahrscheinlichkeit ändert der Konkurrent seinen Plan trotzdem noch leicht.

**Erwischt werden**

- Entdeckungsrisiko: 15 % Grundrisiko, +5 Prozentpunkte für jede weitere Spionage in den letzten 4 Quartalen, +10 Prozentpunkte bei Schwierigkeit „Schwer“.
- Folgen: Strafe = 3 × Spionagekosten, Image −15, der ausspionierte Konkurrent senkt für 2 Quartale aggressiv die Preise. Die Zeitung berichtet hämisch („James Bond auf dem Klapprad: {firma} beim Schnüffeln erwischt“).
- Die Information wird trotzdem geliefert.

**Darstellung**: Berichte erscheinen als „Akten“ mit Stempel („VERTRAULICH“, bei Spionage „STRENG GEHEIM“) und Diagrammen. Gekaufte Werte fließen in den JSON-Export (Abschnitt 15) und sind dort mit ihrer Genauigkeit gekennzeichnet. Geschätzte Werte zeigt die Oberfläche mit „\~“ und Schwankungsbreite an.

## 12. Börse: Unternehmenswert, IPO, Aktien

Der Unternehmenswert ist von Beginn an sichtbar. Ab einer gewissen Größe kann das Unternehmen an die Börse gehen, frisches Kapital einsammeln und mit Aktien handeln.

**Unternehmenswert (vor und nach IPO, fundamental)**

```latex
EV = \text{EBITDA}_{4Q}\cdot k,\qquad k = \text{clamp}\left(6 + 20\cdot g_{Umsatz,yoy} + 0.05\,(I-50),\; 4,\; 25\right)
```

```latex
\text{Eigenkapitalwert} = EV - \text{Nettofinanzschulden} + \text{Beteiligungen}
```

Bei negativem EBITDA gilt ersatzweise EV = 0,5 × Umsatz der letzten 4 Quartale. Angezeigt werden außerdem der Anteil des Gründers und dessen „Privatvermögen“ (Anteil × Eigenkapitalwert) als Spaßkennzahl.

**Börsengang (IPO)**

- Voraussetzungen: Umsatz der letzten 4 Quartale ≥ 50 Mio. €, 2 Quartale in Folge positives EBIT, Rating mindestens BB.
- Ablauf: Der Spieler wählt den Anteil neuer Aktien (10–40 %) und eine Preisspanne (±15 % um den fundamentalen Wert je Aktie). Die Nachfrage der Anleger hängt von Wachstum und Stimmung ab; ein zu hoch angesetzter Preis führt zu einer Teilplatzierung. IPO-Kosten: 5 % des Emissionserlöses.
- Feier: Vollbild-Animation mit Börsenglocke, Konfetti und hochzählendem Kurs, eine Sonderausgabe der Zeitung und das Erfolgsabzeichen „Ding Dong“.
- Aus der GmbH wird eine AG; der Firmenname bekommt den Zusatz „AG“.

**Aktienkurs nach dem IPO** (je Quartal):

```latex
K_t = \frac{\text{Eigenkapitalwert}_t}{\text{Aktien}_t}\cdot S_t,\qquad S_t = \text{clamp}\left(S_{t-1}^{\,0.7}\cdot e^{\,0.8\,(\text{EPS}_t/\text{EPS}^{erw}_t-1) + N(0,\,0.08)},\; 0.5,\; 2.0\right)
```

S ist die Marktstimmung. EPS^erw ist die Analystenerwartung (Trend der letzten 4 Quartale). Ereignisse wie „Börsencrash“ (2 %/Q) setzen S kurzfristig um 30 % herab. Zusätzlich wird ein Kursverlauf mit 12 Zwischenpunkten je Quartal für das Chart erzeugt (Brownsche Brücke zwischen den Quartalswerten).

**Aktionen nach dem IPO**

| Aktion | Regel |
| --- | --- |
| Kapitalerhöhung | bis 20 % neue Aktien je Quartal, Ausgabe mit 5 % Abschlag zum Kurs, Kosten 3 % |
| Aktienrückkauf | zum aktuellen Kurs + 2 %, max. 10 % der Aktien je Quartal |
| Dividende | € je Aktie; stabile Dividenden heben die Stimmung leicht |
| Aktien von Konkurrenten kaufen | nur börsennotierte Konkurrenten; Kurs steigt mit Kaufvolumen (+1 % je 1 % erworbener Anteil). Ab 50 % erfolgt die Übernahme (Abschnitt 8), Beteiligungen bis dahin werden zum Kurs bilanziert. |

Konkurrenten können ebenfalls an die Börse gehen; Golden Spoke, Freedom Wheels und Pedalo Italiano sind von Anfang an notiert. Die Börsenseite zeigt Kurscharts, Marktkapitalisierungen im Vergleich und eine Aktionärsstruktur als Donut.

## 13. Nachhaltigkeit, Image, Erfolge

**Nachhaltigkeitsindex (0–100, Start 40)** – eine Bestandsgröße, die sich langsam bewegt:

```latex
N_t = N_{t-1} + 0.2\,(N^{Ziel}_t - N_{t-1}),\quad N^{Ziel} = 0.8\,U_{Unt} + 25\left(1-e^{-NB_t/NB^{*}}\right) + \Delta_{Werke}
```

NB = Nachhaltigkeitsbudget je Quartal, NB\* = 0,5 % des Quartalsumsatzes (mindestens 20.000 €). Δ-Werte stammen aus den Abschnitten 6 und 8. Mögliche Maßnahmen werden im UI als Pakete angeboten (Solardach, Recyclingprogramm, Lastenrad-Fuhrpark, CO₂-neutrale Logistik), die rechnerisch einfach Budget sind, aber auf dem Werksgelände sichtbar werden.

Wirkung: fließt ins Image, ist Bedingung für Nordamerika und für das EU-Gesetz (Abschnitt 10) und hebt den Börsenmultiplikator über das Image.

**Umweltindex und Umweltabgabe**

- Umweltindex je Produkt = 0,6 × Ø Umweltindex der produzierenden Linien (6.1) + 0,4 × Umweltindex der Lieferanten (Billig 35 · Standard 50 · Premium 70; ersetzt die ±5-Punkte-Spalte in Abschnitt 6). U\_Unt ist der absatzgewichtete Mittelwert über alle Produkte. Der Umweltindex wirkt auf die Kundenzufriedenheit (5.7) und über N auf das Image.
- Umweltabgabe für Werke in Deutschland und Europa je Quartal, abhängig vom Ø Umweltindex der Linien und linear zwischen den Stützpunkten:

| Ø Umweltindex der Linien | Abgabe je Werk und Quartal |
| --- | --- |
| 30 oder weniger | 125.000 € |
| 40 | 45.000 € |
| 50 oder mehr | 0 € |

Die Abgabe skaliert mit der Werksgröße (× Linienzahl / 2). Nach dem EU-Gesetz (10) verschieben sich alle Stützpunkte um +10.

**Image (0–100, Start 50)**

```latex
I_t = I_{t-1} + 0.25\,(I^{Ziel} - I_{t-1}) + \text{Schocks},\quad I^{Ziel} = 20 + 0.4\,N + 30\,(Q-0.8)/0.4 + \text{Firmensitz-Bonus}
```

Schocks sind Rückrufe, aufgeflogene Spionage, Entlassungen und Testsiege. Der Firmensitz-Bonus liegt bei 0 bis 5 Punkten (Abschnitt 14).

**Erfolge** (Abzeichen mit Icon, Datum und Toast-Animation; Sammlung auf eigener Seite)

| Erfolg | Bedingung |
| --- | --- |
| Erste Schritte | erstes Quartal abgeschlossen |
| Tausendfüßler | 1.000 Räder verkauft (kumuliert) |
| Millionär | 1 Mio. € Umsatz in einem Quartal |
| Schwarze Zahlen | erstes positives Jahres-EBIT |
| Garagenromantik ade | erste Firmensitz-Ausbaustufe gekauft |
| Europäer | Europa freigeschaltet |
| Go West | Nordamerika freigeschaltet |
| Seidenstraße | Asien freigeschaltet |
| Globetrotter | alle Regionen aktiv |
| Ding Dong | Börsengang |
| Fressen und gefressen werden | erste Übernahme |
| Preisbrecher | günstigster Anbieter in einem Segment mit positivem DB |
| Tech-Pionier | Technik-Platz 1 in einem Segment |
| Grüner Daumen | Nachhaltigkeit ≥ 80 |
| James Bond auf dem Klapprad | bei Spionage erwischt |
| Pleitegeier verjagt | Rettungsangebot angenommen und überlebt |
| Milliardär | Jahresumsatz ≥ 1 Mrd. € |
| Marktführer Europa | Platz 1 in Europa nach Umsatz |
| Wolkenkratzer | höchste Firmensitz-Stufe |
| Imperator | Weltmarktführer (4 Quartale Platz 1) |

## 14. Visualisierung & Oberfläche

Die Oberfläche soll ansehnlich und auf einen Blick verständlich sein: modernes, ruhiges Design, Hell- und Dunkelmodus, eine einheitliche Farbpalette (eine Farbe je Unternehmen, überall gleich) und sanfte Animationen. Alle Grafiken werden als SVG im Code gezeichnet, ohne externe Bilddateien, damit der Stil einheitlich bleibt.

**Navigation (Seitenleiste)**: Cockpit · Zeitung · Entscheidungen · Planungsrechner · Markt · Finanzen (inkl. Kostenrechnung) · Werke · Firmensitz · Börse · Marktforschung · Erfolge · Austausch (JSON) · Einstellungen. Oben stehen fest Quartal, Kasse, Rating und der Button „Quartal abschließen“.

**Seiten und Darstellungen**

| Seite | Inhalte |
| --- | --- |
| Cockpit | KPI-Kacheln (Umsatz, EBIT, Kasse, Marktanteil, Unternehmenswert, Image) mit Trendpfeil und Sparkline; Liniendiagramm Umsatz/EBIT über alle Quartale; Mini-Weltkarte; nächster Meilenstein mit Fortschrittsbalken |
| Markt | Donut der Marktanteile je Region und Segment (Restmarkt grau), Balkenvergleich Preis/Marketing/Technik mit Konkurrenten (soweit bekannt), Marktvolumen-Verlauf, Weltrangliste |
| Finanzen | GuV- und Bilanztabellen mit Vorquartalsvergleich, Cashflow-Wasserfall, gestapelte Bilanzstruktur, Rating-Verlauf mit Score-Faktoren; Kostenrechnung mit Kostenstellen und DB-Stufen je Produkt und Markt |
| Werke | Isometrisches Werksgelände je Werk (Tabs), Auslastungsanzeige, Linienübersicht mit Typ, Alter, Verfügbarkeit und Umweltindex, Motivations- und Produktivitätsindizes, Stückkosten-Verlauf mit Erfahrungskurve |
| Firmensitz | Isometrische Ansicht des Hauptquartiers, Ausbau-Shop |
| Börse | Kurschart, Marktkapitalisierung im Vergleich, Aktionärsstruktur, Aktionen |
| Weltkarte | Regionen leuchten in der Firmenfarbe auf, wenn freigeschaltet; Werke als Pins; Konkurrenz-Hauptsitze als graue Pins; Tooltip mit Marktanteil |

**Werksgelände (isometrisch, im Stil eines Aufbauspiels)**

- Ein Raster aus isometrischen Kacheln. Das Gelände wächst von 6×6 auf bis zu 24×24 Kacheln, je nach Zahl der Linien und Hallen.
- Module als SVG-Sprites: Werkstatt (Start), Montagehalle (je Linie), Hochregallager (wächst mit Lagerbestand), Lkw-Rampe, Parkplatz (wächst mit Personal), Solardach und Recyclinghof (aus Nachhaltigkeitspaketen), Teststrecke, Kantine und Bahnanschluss ab großen Werken.
- Die Module werden deterministisch platziert (feste Reihenfolge der Bauplätze), damit das Gelände organisch und nicht zufällig wirkt. Neue Module erscheinen mit einer kurzen Bau-Animation (Kran, Staubwolke).
- Kleine animierte Lkw fahren vom Gelände ab; ihre Anzahl entspricht der Produktionsmenge. Ein Zähler zeigt die Stückzahl des Quartals.
- Jedes Werk hat einen landestypischen Hintergrund (Darmstadt mit Hochzeitsturm-Silhouette, USA mit Wasserturm, Vietnam mit Reisfeldern).

**Firmensitz (Prestige-Ausbau)**: Das Gebäude ist rein grafische Belohnung mit kleinem Imagebonus. Jede Stufe setzt die vorherige voraus und wird als Investition aktiviert (Abschreibung 80 Quartale, Unterhalt laut Abschnitt 7).

| Stufe | Kosten | Image-Bonus | Optik |
| --- | --- | --- | --- |
| Garage | Start | 0 | Garage mit Werkbank und Kaffeemaschine |
| Hinterhofbüro | 50.000 € | +0,5 | Büro über der Werkstatt, Firmenschild |
| Bürohaus | 500.000 € | +1 | zweistöckiges Gebäude mit Logo |
| Villa mit Park | 3 Mio. € | +2 | Gründerzeitvilla, Kiesweg |
| Glaspalast | 25 Mio. € | +3 | Glasfassade, Vorplatz mit Fahnen |
| Campus | 150 Mio. € | +4 | mehrere Gebäude, Teich, Rooftop-Garten |
| Wolkenkratzer | 1 Mrd. € | +5 | Turm mit Heliport und Leuchtschrift |

Extras (beliebig kombinierbar, mit eigener Grafik): Brunnen 20.000 € · Espressobar 50.000 € · Fahrradparkhaus 400.000 € · Teststrecke 2 Mio. € · goldene Gründerstatue 5 Mio. € · Hubschrauber 30 Mio. € · Fahrradmuseum 50 Mio. €. Extras geben zusammen höchstens +2 Image.

**Animationen und Feedback**: Zahlen zählen beim Quartalswechsel hoch. Freischaltungen von Regionen zeigen die Weltkarte mit Lichtwelle und Fanfare (abschaltbar). Erfolge erscheinen als Toast mit Abzeichen, und der Börsengang bekommt eine Vollbildfeier. Jedes Fahrradmodell hat ein eigenes SVG-Symbolbild.

**Handy-Ansicht (Pflicht, gleichwertig zum Desktop)**

| Bereich | Umsetzung auf dem Smartphone |
| --- | --- |
| Navigation | Untere Leiste mit 5 Symbolen (Cockpit, Zeitung, Entscheiden, Markt, Mehr); „Mehr“ öffnet die übrigen Seiten. Die Kopfzeile zeigt Quartal, Kasse und Rating kompakt |
| Entscheidungen | Ein Assistent mit wischbaren Karten je Bereich (Preise, Produktion, Marketing, F&E, Personal, Finanzen, Expansion). Große Schieberegler mit +/−-Tasten und direkter Zahleneingabe; Live-Vorschau als einklappbare Leiste am unteren Rand; am Ende eine Zusammenfassung mit „Quartal abschließen“ |
| Kennzahlen und Charts | KPI-Kacheln zweispaltig, Charts in voller Breite und nacheinander, Tooltips per Antippen; breite Tabellen (GuV, Bilanz) mit fixierter erster Spalte und horizontalem Scrollen |
| Zeitung | Einspaltiges Layout mit großer Schrift; die Buttons „Kopieren“ und „Vorlesen“ bleiben beim Scrollen sichtbar |
| Werksgelände und Firmensitz | Isometrische Ansicht mit Zwei-Finger-Zoom und Verschieben, „Auf Gelände zentrieren“-Button; Animationen auf schwachen Geräten reduziert (prefers-reduced-motion) |
| Weltkarte | Vollbreite, antippbare Regionen öffnen ein Infoblatt von unten |
| JSON-Austausch | Große Buttons „Lagebericht kopieren“ und „Zeitung kopieren“; Import über „Aus Zwischenablage einfügen“ (Clipboard API) statt Tippen in ein Textfeld |

Alle Bedienelemente haben mindestens 44 × 44 px Tippfläche. Spielstände liegen lokal im jeweiligen Browser; der Datei-Export (Abschnitt 16) dient zum Übertragen zwischen Handy und Rechner.

## 15. JSON-Austausch mit Claude

Der Kreislauf besteht aus drei Formaten: Zeitung als Text (Abschnitt 10), Lagebericht als JSON (Export) und Entscheidungen als JSON (Import). Die Seite „Austausch“ bündelt alle drei mit Kopier-Buttons und einem großen Eingabefeld.

**Export „Lagebericht“** (Button „Für Claude kopieren“): enthält alles, was der Spieler wissen darf, aber keine geheimen Konkurrenzwerte ohne gekaufte Marktforschung. Kompakt gehalten: aktuelles Quartal vollständig, Vorquartale nur als Kennzahlenreihe.

```json
{
  "format": "fahrrad-imperium/lagebericht",
  "version": 1,
  "quartal": "Q2 2027",
  "naechstesQuartal": "Q3 2027",
  "unternehmen": { "name": "Rupert Rad GmbH", "rechtsform": "GmbH", "kasse": 1184000, "rating": "BB",
    "kreditlimit": 1600000, "bekanntheit": { "DE": 0.031 }, "image": 51, "nachhaltigkeit": 41 },
  "kennzahlen": [ { "quartal": "Q1 2027", "umsatz": 1730000, "ebit": -212000, "marktanteilDE": 0.0029 } ],
  "guv": { "umsatz": 2410000, "herstellkosten": 1550000, "marketing": 90000, "fe": 100000, "ebit": 35000, "ueberschuss": 9000 },
  "produkte": {
    "stadtrad": { "herstellkosten": 488, "lager": 120, "technik": 0.41, "technikMarkt": 0.45,
      "maerkte": { "DE": { "preis": 649, "marketing": 30000, "absatz": 1140, "nachfrage": 1260, "marktanteil": 0.0033 } } },
    "ebike": { "...": "analog" }
  },
  "werke": { "DE-1": { "linien": 2, "mitarbeitende": 24, "stundenKapazitaet": 11520, "auslastung": 0.94 } },
  "lieferanten": { "rahmen": "standard", "akku": "standard", "antrieb": "standard" },
  "konkurrenz": [ { "name": "Drahtesel & Söhne", "quelle": "marktbericht", "genauigkeit": 0.15,
    "marktanteilDE": 0.004, "preise": { "stadtrad": 589 } } ],
  "ereignisseAktiv": [ { "id": "stahlpreisschock", "wirkung": "Rahmenkosten +15 %", "restQuartale": 2 } ],
  "optionen": { "freischaltbar": ["mountainbike"], "naechsterMeilenstein": "Europa: Umsatz 4Q 6,9 / 10 Mio. €",
    "ipoMoeglich": false, "firmensitzNaechsteStufe": { "stufe": "Hinterhofbüro", "kosten": 50000 } },
  "letzteEntscheidungen": { "...": "Entscheidungs-JSON des Vorquartals" }
}
```

**Import „Entscheidungen“** (Claude liefert dieses Format, der Spieler fügt es ein):

```json
{
  "format": "fahrrad-imperium/entscheidungen",
  "version": 1,
  "quartal": "Q3 2027",
  "produkte": {
    "stadtrad": { "produktion": { "DE-1": 1300 }, "fe": 20000,
      "maerkte": { "DE": { "preis": 629, "marketing": 45000 } } },
    "ebike": { "produktion": { "DE-1": 700 }, "fe": 90000,
      "maerkte": { "DE": { "preis": 2690, "marketing": 80000 } } }
  },
  "werke": { "DE-1": { "neueLinien": 1, "personalAenderung": 8, "schulungProKopf": 500 } },
  "lieferanten": { "rahmen": "standard", "akku": "premium", "antrieb": "standard" },
  "nachhaltigkeitsbudget": 15000,
  "finanzen": { "darlehenNeu": 500000, "tilgungExtra": 0, "dividende": 0 },
  "marktforschung": [ { "typ": "marktbericht", "region": "DE" } ],
  "expansion": { "maerkteBetreten": [], "produkteEinfuehren": ["mountainbike"], "werkeBauen": [], "uebernahmen": [] },
  "boerse": { "ipo": null, "kapitalerhoehung": 0, "rueckkauf": 0, "aktienKaufen": [] },
  "firmensitz": { "kaufen": ["hinterhofbuero"] },
  "begruendung": "Preis leicht senken, Akku-Qualität hoch, Kapazität für die Saison aufbauen."
}
```

**Zusatzfelder für die neuen Entscheidungen** (gleiche Ebene wie oben; `neueLinien` wird durch `linienKaufen` ersetzt):

```json
{
  "vertrieb": { "DE": 5 },
  "corporateIdentity": 30000,
  "werke": { "DE-1": { "linienKaufen": [ { "typ": "C", "anzahl": 1 } ], "linienVerkaufen": ["DE-1-L1"],
    "wartung": "voll", "personalAenderung": 8, "schulungProKopf": 500 } },
  "einkauf": { "stadtrad": 1500, "ebike": 1000 },
  "grossabnehmer": [ { "angebotId": "GA-2027Q3-1", "menge": 400 } ],
  "ausschreibungen": [ { "id": "AS-2027Q3-1", "stueckpreis": 590 } ],
  "finanzen": { "darlehenNeu": 0, "kurzfristkredit": 200000, "langfristdarlehen": 0, "finanzanlage": 0, "tilgungExtra": 0, "dividende": 0 },
  "prognose": { "absatz": { "stadtrad": { "DE": 1250 }, "ebike": { "DE": 820 } }, "umsatz": 3100000, "ebit": 120000 }
}
```

Der Lagebericht wird entsprechend erweitert um: Kundenzufriedenheit je Produkt und Markt, Technik- und Umweltindex laut Testmagazin, Motivation, Kompetenz, Produktivitätsindizes, Linien (ID, Typ, Alter, Verfügbarkeit, Umweltindex), Wartungsvertrag, Materiallager, offene Angebote (Großabnehmer und Ausschreibungen mit ID), Konditionen, Planungsqualität mit Prognosefehler des Vorquartals, freigeschaltete Komplexitätsstufe und DB-Rechnung je Produkt. Entscheidungen einer noch nicht freigeschalteten Stufe werden mit Hinweis ignoriert.

**Import-Regeln**

- Validierung mit einem Zod-Schema. Fehlende Felder bedeuten „Wert aus Vorquartal übernehmen“, unbekannte Felder werden mit Warnung ignoriert.
- Werte außerhalb der erlaubten Bereiche werden nicht still korrigiert, sondern als Fehlerliste angezeigt („Produktion Stadtrad DE-1: 1.300 Stück übersteigen die Kapazität von 1.180“).
- Vor dem Übernehmen zeigt eine Vergleichsansicht Alt → Neu für alle geänderten Felder. Erst nach Bestätigung werden die Regler gesetzt; abgeschlossen wird das Quartal weiterhin manuell.
- Stimmt `quartal` nicht mit dem aktuellen Quartal überein, erscheint eine Warnung, aber kein Abbruch.
- Toleranter Parser: Er entfernt Markdown-Codezäune (\`\`\`json) und Text vor und nach dem JSON automatisch, weil Antworten aus dem Chat oft so eingefügt werden.
- Auf der Austausch-Seite liegt eine kurze „Anleitung für Claude“ zum Kopieren: Sie beschreibt beide Formate, Wertebereiche und Spielregeln in Kurzform, damit Claude in einem neuen Chat sofort korrekte Entscheidungen liefern kann.

## 16. Speichern, Umsetzungsreihenfolge & Akzeptanzkriterien

**Speichern**

- 10 benannte Speicherplätze plus Autosave nach jedem Quartal in IndexedDB.
- Jeder Spielstand enthält die komplette Historie (Zustand und Entscheidungen je Quartal). „Zurückspringen“ lädt ein früheres Quartal als neuen Zweig, damit man riskante Strategien ausprobieren kann.
- Export und Import eines kompletten Spielstands als `.json`-Datei (Backup, Umzug auf einen anderen Rechner).
- Neues Spiel: Firmenname, Firmenfarbe, Schwierigkeitsgrad, optional Seed.

**Umsetzungsreihenfolge für Claude Code** (jede Stufe lauffähig und getestet, bevor die nächste beginnt)

1. Engine-Kern: Datenmodell, RNG, Markt (nur DE, 2 Produkte), Produktion, GuV/Bilanz/Cashflow, 3 deutsche Konkurrenten; Vitest-Tests.
2. Basis-UI (von Anfang an responsiv für Handy und Desktop) inkl. Veröffentlichung auf GitHub Pages: Entscheidungsmaske mit Live-Vorschau, Cockpit mit KPI-Kacheln und Charts, Quartalsabschluss, Speichern.
3. Austausch: Lagebericht-Export, Entscheidungs-Import mit Validierung und Vergleichsansicht, Anleitung für Claude.
4. Zeitung: Ereigniskatalog, Textvarianten, Zeitungslayout, Text-Export, Vorlesen.
5. Tiefe: Komplexitätsstufen, Planungsrechner und Planungsqualität, Vertrieb, Corporate Identity, Kundenzufriedenheit, Testmagazin, Großabnehmer und Ausschreibungen, Linientypen, Wartung, Nacharbeit, Einkauf, Motivation und Produktivität, Kostenrechnung, Lieferkette, Personal-Details, Kredite/Rating, Insolvenz, Nachhaltigkeit, Image.
6. Expansion: Regionen, Meilensteine, neue Produkte, Werke, weitere Konkurrenten, Weltkarte, Weltrangliste.
7. Aufbau-Grafik: isometrisches Werksgelände und Firmensitz mit Shop.
8. Börse, Übernahmen, Marktforschung und Spionage.
9. Erfolge, Animationen, Feinschliff, Balancing-Durchläufe.

**Akzeptanzkriterien**

- [ ] Gleicher Seed und gleiche Entscheidungen erzeugen ein identisches Ergebnis.
- [ ] Aktiva = Passiva in jedem Quartal (Test über 100 simulierte Quartale).
- [ ] Summe der Marktanteile inklusive Restmarkt = 100 % je Markt und Segment; kein Absatz über Lagerbestand plus Produktion.
- [ ] Ein automatischer Balancing-Bot mit einer vernünftigen Standardstrategie erreicht Europa zwischen Q6 und Q10, Nordamerika zwischen Q14 und Q20 und überlebt 60 Quartale. Ein Bot mit „Preis 40 % unter Markt“ geht innerhalb von 12 Quartalen pleite.
- [ ] Preissenkung um 5 % erhöht den Absatz beim Stadtrad spürbar stärker als beim E-MTB (Test der Elastizitäten).
- [ ] Ein von Claude geliefertes Entscheidungs-JSON (auch mit Codezäunen und Begleittext) wird korrekt erkannt, validiert und übernommen.
- [ ] Die Zeitung lässt sich als reiner Text kopieren und im Browser vorlesen.
- [ ] Eine Runde ist ohne Import in unter 2 Minuten spielbar; ein Quartalsabschluss rechnet in unter 1 Sekunde, auch nach 100 Quartalen.
- [ ] Werksgelände und Firmensitz wachsen sichtbar mit Kapazität bzw. Käufen.

* [ ] Eine komplette Runde inklusive JSON-Import ist auf einem Smartphone mit 360 px Breite ohne Zoomen spielbar; die App lässt sich als PWA installieren und startet offline.

- [ ] Der Planungsrechner liefert bei „Engine schätzt“ exakt das reale Ergebnis, wenn Konkurrenz und Ereignisse tatsächlich unverändert bleiben (Test mit eingefrorener Konkurrenz).
- [ ] Die DB-Rechnung summiert sich exakt zum EBIT der GuV; die Kostenstellen summieren sich zu den Gesamtkosten.
- [ ] Ein Produkt mit Technikindex unter 100 verliert sichtbar Absatz; Preissprünge senken die Kundenzufriedenheit messbar.
- [ ] Bis zur Freischaltung einer Komplexitätsstufe sind deren Felder ausgeblendet und mit Standardwerten belegt.
