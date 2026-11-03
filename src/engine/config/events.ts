/**
 * Ereigniskatalog (Abschnitt 10). Wahrscheinlichkeiten je Quartal, Dauer in Quartalen.
 * Texte mit Platzhaltern: {firma}, {produkt}, {wert}, {region}.
 * Jedes Ereignis hat mindestens drei Varianten für Schlagzeile und Text.
 */
export type EreignisEffekt =
  | { art: 'nachfrage'; faktor: number; produkte?: string[] }
  | { art: 'material'; komponente: 'rahmen'; faktor: number }
  | { art: 'akku'; maxProduktion: number }
  | { art: 'energie'; faktor: number }
  | { art: 'einstellung'; faktor: number }
  | { art: 'streik'; kapazitaet: number }
  | { art: 'zins'; plus: number }
  | { art: 'boom' }
  | { art: 'gesetz' };

export interface EreignisDef {
  id: string;
  name: string;
  wahrscheinlichkeit: number;
  dauer: number;
  effekt: EreignisEffekt;
  /** Wirkung in Kurzform für Lagebericht und Zeitung */
  wirkung: string;
  /** Nur in diesen Quartalen des Jahres (1–4) */
  nurQuartale?: number[];
  /** Erst ab diesem Quartalsindex */
  abQuartal?: number;
  /** Nur wenn eines dieser Produkte aktiv ist */
  brauchtProdukt?: string[];
  /** Nur wenn diese Region aktiv ist */
  brauchtRegion?: string;
  einmalig?: boolean;
  schlagzeilen: string[];
  texte: string[];
}

export const EREIGNISKATALOG: EreignisDef[] = [
  {
    id: 'kaufpraemie', name: 'E-Bike-Kaufprämie', wahrscheinlichkeit: 0.06, dauer: 4,
    effekt: { art: 'nachfrage', faktor: 1.25, produkte: ['ebike', 'emtb'] }, wirkung: 'E-Bike/E-MTB-Nachfrage +25 % für 4 Quartale', brauchtProdukt: ['ebike', 'emtb'],
    schlagzeilen: ['Vater Staat steigt aufs Rad – und zahlt die Batterie', 'Prämie unter Strom: Berlin fördert E-Bikes', 'Akku-Abwrackprämie: Jetzt wird elektrisch geradelt'],
    texte: [
      'Die Bundesregierung beschließt eine Kaufprämie für Elektroräder. Händler rechnen für das kommende Jahr mit rund 25 % mehr Nachfrage nach E-Bikes. Prof. Dr. Ulrike Speiche vom Institut für angewandte Pedalogie: „Ein Geschenk für alle, die liefern können.“',
      'Wer ein E-Bike kauft, bekommt Geld vom Staat – vier Quartale lang. Branchenkenner erwarten ein Plus von etwa 25 % bei Elektrorädern. Horst aus Wanne-Eickel hat bereits einen Antrag für sein Mofa gestellt. Abgelehnt.',
      'Förderprogramm „Strom statt Stau“ gestartet: Für ein Jahr gibt es Zuschüsse auf E-Bikes. Die Nachfrage dürfte um ein Viertel steigen – sofern die Fabriken mitkommen.',
    ],
  },
  {
    id: 'stahlpreis', name: 'Stahlpreisschock', wahrscheinlichkeit: 0.08, dauer: 2,
    effekt: { art: 'material', komponente: 'rahmen', faktor: 1.15 }, wirkung: 'Rahmenkosten +15 % für 2 Quartale',
    schlagzeilen: ['Stahl so teuer, dass Diebe jetzt Rahmen statt Räder klauen', 'Stahlpreis im Steilhang', 'Rahmenbedingungen verschlechtert: Stahl wird teurer'],
    texte: [
      'Die Hütten melden Lieferengpässe. Experten erwarten Preissteigerungen bei Stahlrahmen um rund 15 % – für die nächsten zwei Quartale. Börsenguru Hanno Hebel rät zu „Carbon, Bambus oder Beten“.',
      'Ein Hochofen-Streik in Übersee treibt den Stahlpreis. Fahrradhersteller müssen mit etwa 15 % höheren Rahmenkosten rechnen. Da ist der Wurm im Ventil.',
      'Rohstoffhändler sprechen von einem „Stahlgewitter“: Rahmen werden zwei Quartale lang rund 15 % teurer. Wer jetzt knapp kalkuliert, sollte nachrechnen.',
    ],
  },
  {
    id: 'akkuengpass', name: 'Akku-Engpass', wahrscheinlichkeit: 0.07, dauer: 2,
    effekt: { art: 'akku', maxProduktion: 0.7 }, wirkung: 'E-Modelle maximal 70 % der geplanten Produktion, 2 Quartale', brauchtProdukt: ['ebike', 'emtb', 'lastenrad'],
    schlagzeilen: ['Akku leer – auch in der Lieferkette', 'Zellen knapp, Nerven auch', 'Strom da, Akku weg'],
    texte: [
      'Ein Brand in einer Zellfabrik legt die Akkuversorgung lahm. Hersteller von E-Bikes können voraussichtlich nur rund 70 % ihrer geplanten Menge bauen – für zwei Quartale.',
      'Die Akku-Lieferanten rationieren: E-Modelle laufen nur noch zu etwa 70 % vom Band. Prof. Speiche empfiehlt „Muskelkraft als Übergangstechnologie“.',
      'Engpass bei Lithium-Zellen: Die Branche rechnet mit rund 30 % weniger E-Bike-Produktion. Wer Stadträder im Programm hat, lacht sich ins Pedal.',
    ],
  },
  {
    id: 'hitzesommer', name: 'Hitzesommer', wahrscheinlichkeit: 0.15, dauer: 1, nurQuartale: [2, 3],
    effekt: { art: 'nachfrage', faktor: 1.1 }, wirkung: 'Nachfrage +10 % für 1 Quartal',
    schlagzeilen: ['Deutschland schwitzt – und tritt in die Pedale', 'Sonne satt: Radhändler im Ausnahmezustand', 'Hitzewelle rollt auf zwei Rädern'],
    texte: [
      'Meteorologen kündigen einen Rekordsommer an. Der Handel erwartet rund 10 % mehr Fahrradkäufe. Eisdielen melden ebenfalls Bedarf an Lastenrädern.',
      'Wochenlang über 30 Grad: Wer kann, steigt aufs Rad. Die Branche rechnet mit etwa 10 % mehr Nachfrage in diesem Quartal.',
      'Freibäder überfüllt, Radwege auch: Ein heißer Sommer dürfte die Nachfrage um rund ein Zehntel steigern.',
    ],
  },
  {
    id: 'regenrekord', name: 'Regenrekord', wahrscheinlichkeit: 0.1, dauer: 1,
    effekt: { art: 'nachfrage', faktor: 0.9 }, wirkung: 'Nachfrage −10 % für 1 Quartal',
    schlagzeilen: ['Horst aus Wanne-Eickel: Ich fahr jetzt Kanu', 'Land unter – Sättel nass', 'Regen ohne Ende: Fahrradhandel säuft ab'],
    texte: [
      'Der Wetterdienst sagt das nasseste Quartal seit Beginn der Aufzeichnungen voraus. Händler erwarten rund 10 % weniger Kundschaft.',
      'Dauerregen über ganz Deutschland. Die Branche rechnet mit etwa einem Zehntel weniger Verkäufen. Schutzblech-Hersteller jubeln.',
      'Die Radwege werden zu Wasserstraßen: Bis zu 10 % weniger Nachfrage erwartet. Horst aus Wanne-Eickel hat sein Rad gegen ein Schlauchboot getauscht.',
    ],
  },
  {
    id: 'radsport', name: 'Radsport-Fieber', wahrscheinlichkeit: 0.05, dauer: 2,
    effekt: { art: 'nachfrage', faktor: 1.3, produkte: ['rennrad'] }, wirkung: 'Rennrad-Nachfrage +30 % für 2 Quartale', brauchtProdukt: ['rennrad'],
    schlagzeilen: ['Ganz Europa im Lycra-Rausch', 'Tour-Fieber: Rennräder ausverkauft', 'Wadenrasur wieder in Mode'],
    texte: [
      'Nach einem spektakulären Rundfahrt-Sommer wollen alle aufs Rennrad. Plus 30 % Nachfrage, sagen die Händler.',
      'Rennräder sind das Accessoire der Saison. Die Nachfrage dürfte zwei Quartale lang um rund 30 % steigen.',
      'Die Nation trägt Lycra: Rennrad-Verkäufe ziehen um etwa 30 % an.',
    ],
  },
  {
    id: 'lastenradhype', name: 'Lastenrad-Hype', wahrscheinlichkeit: 0.05, dauer: 4,
    effekt: { art: 'nachfrage', faktor: 1.3, produkte: ['lastenrad'] }, wirkung: 'Lastenrad-Nachfrage +30 % für 4 Quartale', brauchtProdukt: ['lastenrad'],
    schlagzeilen: ['SUV war gestern: Eltern rüsten auf', 'Kinder, Kisten, Kurbeln', 'Das Lastenrad ist das neue Familienauto'],
    texte: [
      'Eltern in den Großstädten entdecken das Lastenrad. Plus 30 % Nachfrage für ein Jahr.',
      'Lieferdienste und Familien kaufen Lastenräder wie verrückt – rund 30 % mehr Nachfrage.',
      'Der Trend ist da: Lastenräder werden ein Jahr lang etwa 30 % stärker nachgefragt.',
    ],
  },
  {
    id: 'zinswende', name: 'Zinswende', wahrscheinlichkeit: 0.06, dauer: 1, einmalig: true,
    effekt: { art: 'zins', plus: 0.02 }, wirkung: 'Basiszins dauerhaft +2 Prozentpunkte',
    schlagzeilen: ['Bank entdeckt Zinsen wieder', 'Zinsen im Bergsprint', 'Geld kostet wieder Geld'],
    texte: [
      'Die Zentralbank erhöht den Leitzins deutlich. Der Basiszins für Unternehmenskredite steigt um 2 Prozentpunkte – dauerhaft. Hanno Hebel: „Wer jetzt Schulden hat, sollte schneller treten.“',
      'Paukenschlag aus Frankfurt: Kredite werden 2 Prozentpunkte teurer. Bestehende Darlehen behalten ihren Zins.',
      'Die Ära des billigen Geldes ist vorbei. Neue Darlehen kosten ab sofort rund 2 Prozentpunkte mehr.',
    ],
  },
  {
    id: 'streik', name: 'Streik', wahrscheinlichkeit: 0.04, dauer: 1,
    effekt: { art: 'streik', kapazitaet: 0.75 }, wirkung: 'Kapazität −25 % in einem Werk für 1 Quartal',
    schlagzeilen: ['Bänder stehen still – nur die Kaffeemaschine läuft', 'Streik bei {firma}: Schraubenschlüssel fallen gelassen', 'Arbeitskampf in der Montagehalle'],
    texte: [
      'Die Belegschaft von {firma} kündigt Warnstreiks an. Das Werk {werk} dürfte im kommenden Quartal rund ein Viertel weniger leisten.',
      'Bei {firma} gärt es: Die Gewerkschaft ruft zum Streik auf. Die Kapazität im Werk {werk} sinkt voraussichtlich um 25 %.',
      'Streikposten vor dem Werkstor in {werk}: {firma} muss mit rund 25 % weniger Produktion rechnen. Prof. Speiche: „Schulung hätte geholfen.“',
    ],
  },
  {
    id: 'energiepreis', name: 'Energiepreisschock', wahrscheinlichkeit: 0.05, dauer: 2,
    effekt: { art: 'energie', faktor: 1.5 }, wirkung: 'Energiekosten +50 % für 2 Quartale',
    schlagzeilen: ['Strompreis tritt kräftig in die Pedale', 'Energie wird zum Luxusgut', 'Fabriken zittern vor der Stromrechnung'],
    texte: [
      'Die Energiepreise steigen sprunghaft. Für die Produktion bedeutet das rund 50 % höhere Energiekosten in den kommenden zwei Quartalen.',
      'Gas knapp, Strom teuer: Fabriken zahlen etwa die Hälfte mehr für Energie.',
      'Die Stromrechnung explodiert: +50 % Energiekosten je Montagestunde erwartet.',
    ],
  },
  {
    id: 'fachkraefte', name: 'Fachkräftemangel', wahrscheinlichkeit: 0.05, dauer: 2,
    effekt: { art: 'einstellung', faktor: 0.5 }, wirkung: 'Einstellungslimit halbiert für 2 Quartale',
    schlagzeilen: ['Monteure gesucht – dringend', 'Arbeitsmarkt leergefegt', 'Wer schrauben kann, kann sich den Job aussuchen'],
    texte: [
      'Der Arbeitsmarkt ist leergefegt. Fahrradfabriken können in den nächsten zwei Quartalen nur halb so viele Leute einstellen wie sonst.',
      'Zweiradmechaniker sind Mangelware. Neueinstellungen gelingen nur noch zur Hälfte.',
      'Fachkräftemangel erreicht die Fahrradbranche: Das Einstellungslimit halbiert sich für zwei Quartale.',
    ],
  },
  {
    id: 'fahrradboom', name: 'Fahrradboom', wahrscheinlichkeit: 0.01, dauer: 3,
    effekt: { art: 'boom' }, wirkung: 'Nachfrage +40 %, danach 2 Quartale −10 %',
    schlagzeilen: ['Alle wollen Rad – Händler verkaufen sogar Ausstellungsstücke', 'Der große Fahrradrausch', 'Boom! Die Nation radelt'],
    texte: [
      'Ein beispielloser Fahrradboom erfasst das Land: +40 % Nachfrage im kommenden Quartal. Danach dürfte der Markt zwei Quartale lang um 10 % schwächeln.',
      'Händler melden leere Lager: Die Nachfrage steigt um 40 %. Experten warnen vor dem Kater danach (−10 % für zwei Quartale).',
      'Fahrräder sind ausverkauft. Ein Quartal lang +40 %, dann eine Delle von −10 %.',
    ],
  },
  {
    id: 'eugesetz', name: 'EU-Nachhaltigkeitsgesetz', wahrscheinlichkeit: 0.35, dauer: 1, abQuartal: 15, einmalig: true,
    effekt: { art: 'gesetz' }, wirkung: 'Schwellenwerte der Umweltabgabe steigen dauerhaft um 10 Punkte',
    schlagzeilen: ['Brüssel will grüne Speichen', 'EU zieht die Umweltschrauben an', 'Grün oder teuer: Neues EU-Gesetz'],
    texte: [
      'Das EU-Parlament beschließt strengere Umweltauflagen: Die Umweltabgabe greift künftig schon ab einem Umweltindex von 60 statt 50.',
      'Brüssel verschärft die Regeln: Werke mit alten, schmutzigen Linien zahlen künftig deutlich mehr Umweltabgabe.',
      'Ab sofort gilt: Die Stützpunkte der Umweltabgabe steigen um 10 Punkte. Öko-Linien lohnen sich mehr denn je.',
    ],
  },
];

/** Vorfälle, die während eines Quartals passieren (Abschnitt 10: Rückruf, Testsieg, Influencer) */
export const VORFAELLE = {
  rueckruf: {
    wahrscheinlichkeitJeBilligKomponente: 0.03,
    kostenAnteilUmsatz: 0.05,
    image: -10,
    schlagzeilen: ['{firma}: Wenn die Bremse zum Überraschungsei wird', 'Rückruf bei {firma}: {produkt} muss in die Werkstatt', 'Schrauben locker bei {firma}'],
  },
  testsieg: {
    wahrscheinlichkeit: 0.2,
    bekanntheit: 0.05,
    image: 5,
    schlagzeilen: ['Testsieger! Prof. Speiche weint vor Freude', '„Rad & Tat“ kürt {firma} zum Testsieger', 'Goldmedaille für das {produkt} von {firma}'],
  },
  influencer: {
    wahrscheinlichkeit: 0.05,
    bekanntheit: 0.08,
    schlagzeilen: ['Fitness-Influencerin fährt {produkt} – Follower fahren mit', 'Viral auf zwei Rädern: {firma} im Netz-Hype', 'Ein Video, eine Million Klicks: {firma} ist plötzlich bekannt'],
  },
};
