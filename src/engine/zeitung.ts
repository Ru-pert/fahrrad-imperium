/**
 * „Der Kettenblatt-Kurier – Fachblatt für angewandte Zweiradökonomie“ (Abschnitt 10).
 * Erzeugt die Ausgabe deterministisch aus Zustand und Bericht; eigener Zufallsstrom,
 * damit die Zeitung die Simulation nicht beeinflusst.
 */
import { BALANCE } from './config/balance';
import { EREIGNISKATALOG, VORFAELLE } from './config/events';
import { PRODUKTE } from './config/products';
import { REGIONEN } from './config/markets';
import { ratingAufschlag } from './finance';
import { technikAusStock, technikIndex } from './market';
import { Rng, hashSeed } from './rng';
import type { GameState, ProductId, QuarterReport, Vorfall, Zeitung, ZeitungsArtikel } from './types';
import { quartalLabel, saison } from './util';
import { SPIELER_ID } from './util';

const de0 = (x: number) => Math.round(x).toLocaleString('de-DE');
const mio = (x: number) => {
  const a = Math.abs(x);
  const s = x < 0 ? 'minus ' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mrd. €`;
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio. €`;
  return `${s}${de0(a / 1000)} Tsd. €`;
};
const prozent = (x: number, d = 1) => `${(x * 100).toLocaleString('de-DE', { maximumFractionDigits: d })} %`;

function fuelle(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? `{${k}}`);
}

const SAISON_TEXT = [
  'Das erste Quartal ist traditionell die ruhigste Zeit – Händler rechnen mit rund 25 % weniger Kundschaft als im Jahresmittel.',
  'Das zweite Quartal ist Hochsaison: Die Nachfrage liegt typischerweise 30 % über dem Jahresmittel. Volle Lager zahlen sich jetzt aus.',
  'Im dritten Quartal hält die Saison an – rund 15 % mehr Nachfrage als im Jahresmittel.',
  'Im vierten Quartal wird es kühler: Die Nachfrage sinkt auf etwa 80 % des Jahresmittels.',
];

const LESERBRIEFE = [
  'Horst aus Wanne-Eickel schreibt: „Früher hatte ein Fahrrad zwei Räder und einen Sattel. Heute hat es eine App. Ich will mein Rad nicht updaten, ich will es fahren!“',
  'Horst aus Wanne-Eickel schreibt: „Mein Nachbar hat sich ein E-Bike gekauft und behauptet jetzt, er sei sportlich. Ich bitte um eine Gegendarstellung.“',
  'Horst aus Wanne-Eickel schreibt: „Ich habe gelesen, dass Fahrräder teurer werden. Ich habe meins seit 1987. Bin ich jetzt Investor?“',
  'Horst aus Wanne-Eickel schreibt: „Warum heißt es Lastenrad, wenn meine Frau damit die Einkäufe fährt und ich die Last bin?“',
  'Horst aus Wanne-Eickel schreibt: „Bitte drucken Sie mehr über Klingeln. Niemand spricht mehr über Klingeln.“',
  'Horst aus Wanne-Eickel schreibt: „Ich habe Ihre Zeitung zum Abdecken meines Sattels benutzt. Endlich trocken. Danke!“',
];

const GLOSSEN = [
  { titel: 'Die Speiche der Woche', text: 'Ein Unternehmensberater hat errechnet, dass Fahrräder mit drei Rädern 50 % mehr Umsatz bringen. Die Branche prüft. Die Physik lehnt ab.' },
  { titel: 'Aus der Werkstatt', text: 'Eine Umfrage unter Fahrradmonteuren ergab: 98 % halten den Inbusschlüssel für die größte Erfindung der Menschheit. Die übrigen 2 % suchten ihn gerade.' },
  { titel: 'Hebels Börsenweisheit', text: 'Börsenguru Hanno Hebel rät: „Kaufen Sie nie ein Fahrrad, dessen Hersteller mehr Geld für Werbung ausgibt als für Bremsen.“ Wir haben nachgemessen. Es betrifft mehr Firmen, als uns lieb ist.' },
  { titel: 'Pedalogie für Anfänger', text: 'Prof. Dr. Ulrike Speiche erinnert daran, dass ein Fahrrad im Keller eine Rendite von exakt null Prozent erwirtschaftet. Auf der Straße ist sie unbezahlbar – sagt jedenfalls ihr Sportarzt.' },
  { titel: 'Kurz notiert', text: 'In einer Kleinstadt wurde ein Fahrrad gefunden, das seit 1974 an derselben Laterne steht. Es gilt inzwischen als denkmalgeschützt und ist damit das wertbeständigste Investment der Region.' },
  { titel: 'Der Wurm im Ventil', text: 'Ein Start-up will Fahrräder abonnieren lassen – „Mobility as a Service“. Kritiker merken an, dass man dafür früher „Fahrrad leihen“ sagte. Das Start-up hat 40 Millionen eingesammelt.' },
];

const KLATSCH_GUT = [
  '{name} feiert ein glänzendes Quartal – die Firmenfeier soll so laut gewesen sein, dass drei Nachbarn eine Klingel gegen Lärm beantragten.',
  'Bei {name} knallen die Sektkorken: {umsatz} Umsatz im Quartal. Der Chef ließ sich angeblich ein vergoldetes Schutzblech montieren.',
  '{name} wächst und wächst. Insider berichten, das Management denke bereits über ein zweites Kaffeemaschinen-Werk nach.',
];
const KLATSCH_SCHLECHT = [
  '{name}-Chef posiert mit Leasing-Ferrari – die Bank posiert mit Mahnung. Das Quartal endete mit einem EBIT von {ebit}.',
  'Bei {name} hängt der Haussegen schief: {ebit} EBIT. Gerüchten zufolge wurde der Firmenparkplatz bereits an einen Carsharing-Anbieter untervermietet.',
  'Stille Nacht bei {name}: Nach einem EBIT von {ebit} soll die Weihnachtsfeier in diesem Jahr im Fahrradkeller stattfinden.',
];
const KLATSCH_PROFIL: Record<string, string[]> = {
  drahtesel: ['Drahtesel & Söhne bleibt sich treu: billig, billiger, Drahtesel. Ein Testfahrer berichtet, der Sattel sei „im Preis inbegriffen, aber nicht im Lieferumfang“.'],
  veloveritas: ['Velo Veritas stellt eine neue Schaltung vor, die angeblich die Gedanken des Fahrers liest. Erste Tester schalten seither nur noch in den Feierabend.'],
  kettenreaktion: ['Kettenreaktion GmbH hat ihr Werbebudget erneut erhöht. Inzwischen hängt ihr Logo an jeder dritten Bushaltestelle – nur Busse fahren dort keine mehr.'],
};

function speicheZitat(rng: Rng, fuehrer: string, produkt: string): string {
  const v = [
    `Prof. Dr. Ulrike Speiche (Institut für angewandte Pedalogie): „Beim ${produkt} hat ${fuehrer} technisch die Nase vorn. Wer nicht forscht, fährt bald hinterher.“`,
    `Prof. Dr. Ulrike Speiche lobt ${fuehrer}: „Das ${produkt} ist derzeit das technisch beste am Markt. Ich bin fast ein bisschen gerührt.“`,
    `„Technik ist kein Zufall“, sagt Prof. Dr. Ulrike Speiche mit Blick auf ${fuehrer}, Spitzenreiter beim ${produkt}.`,
  ];
  return v[Math.floor(rng.next() * v.length)];
}

function testmagazin(state: GameState, report: QuarterReport | null): Zeitung['testmagazin'] {
  const produkte = (Object.keys(state.produkte) as ProductId[]).filter((p) => state.produkte[p]?.freigeschaltet);
  return produkte.map((p) => {
    const seg = report?.segmente.find((s) => s.produkt === p && s.region === 'DE');
    const tBar = state.markt.DE?.[p]?.tBar ?? 0.45;
    const eintraege = [
      {
        name: state.unternehmen.name,
        ti: seg?.technikIndex[SPIELER_ID] ?? technikIndex(technikAusStock(state.produkte[p]!.fe), tBar),
        farbe: state.unternehmen.farbe,
        eigen: true,
      },
      ...Object.values(state.konkurrenten)
        .filter((k) => k.status === 'aktiv' && k.produkte[p])
        .map((k) => ({
          name: k.name,
          ti: seg?.technikIndex[k.id] ?? technikIndex(technikAusStock(k.produkte[p]!.fe), tBar),
          farbe: k.farbe,
          eigen: false,
        })),
    ].sort((a, b) => b.ti - a.ti);
    return { produkt: p, eintraege };
  });
}

function konditionen(state: GameState): Zeitung['konditionen'] {
  return {
    basiszins: state.zinsen.basiszins,
    darlehen: state.zinsen.basiszins + ratingAufschlag(state.finanzen.rating),
    kontokorrent: BALANCE.finanzen.kontokorrentZins,
    rating: state.finanzen.rating,
  };
}

function ereignisArtikel(state: GameState, rng: Rng): ZeitungsArtikel[] {
  const out: ZeitungsArtikel[] = [];
  for (const e of (state.ereignisse ?? []).filter((x) => x.neu)) {
    const d = EREIGNISKATALOG.find((x) => x.id === e.id);
    if (!d) continue;
    const werk = state.werke.find((w) => w.id === e.werkId);
    const vars = { firma: state.unternehmen.name, werk: werk?.name ?? 'Darmstadt', produkt: 'E-Bike', wert: '' };
    out.push({
      rubrik: 'Ereignis',
      titel: fuelle(d.schlagzeilen[Math.floor(rng.next() * d.schlagzeilen.length)], vars),
      text: fuelle(d.texte[Math.floor(rng.next() * d.texte.length)], vars),
      wirkung: d.wirkung,
    });
  }
  return out;
}

function stufenHinweis(state: GameState): ZeitungsArtikel | null {
  if (state.einstellungen.profi) return null;
  if (state.quartal === 2)
    return { rubrik: 'In eigener Sache', titel: 'Neue Hebel freigeschaltet', text: 'Ab diesem Quartal kannst du Lieferanten (Billig, Standard, Premium) und Wartungsverträge selbst wählen. Bisher hat die Engine hier Standardwerte gesetzt.' };
  if (state.quartal === 4)
    return { rubrik: 'In eigener Sache', titel: 'Mehr Werkzeuge im Werkzeugkasten', text: 'Ab sofort stehen weitere Linientypen (Hochleistung, Öko-Kompakt), der Verkauf alter Linien und ein Nachhaltigkeitsbudget zur Wahl.' };
  return null;
}

/** Gründungsausgabe zum Spielstart */
export function erzeugeStartZeitung(state: GameState): Zeitung {
  const rng = new Rng(hashSeed(`${state.einstellungen.seed}-zeitung-start`));
  const firma = state.unternehmen.name;
  return {
    quartal: state.quartal,
    ausgabe: `Ausgabe ${quartalLabel(state.quartal)}`,
    schlagzeile: `Neu in der Garage: ${firma} greift nach dem Weltmarkt`,
    unterzeile: 'Ein kleines Werk in Darmstadt, zwei Modelle, große Pläne – die Branche lächelt noch.',
    artikel: [
      {
        rubrik: 'Unternehmen',
        titel: `${firma}: Zwei Linien, 24 Leute und ein Traum`,
        text: `${firma} startet mit einem Werk in Darmstadt (zwei Fertigungslinien, 24 Mitarbeitende), 1,5 Mio. € in der Kasse und einem Bankdarlehen über 1 Mio. €. Im Programm: ein Stadtrad für 650 € und ein E-Bike für 2.800 €. Der Marktanteil liegt bei bescheidenen 0,3 % – der Rest des Marktes gehört etablierten Herstellern und vielen kleinen Anbietern.`,
      },
      {
        rubrik: 'Markt',
        titel: 'Eine Million Räder im Quartal',
        text: `In Deutschland werden pro Quartal rund eine Million Fahrräder verkauft, davon etwa 35 % Stadträder und 30 % E-Bikes. ${SAISON_TEXT[state.quartal % 4]} Für das E-Bike-Segment erwarten Fachleute 2 % Wachstum pro Quartal.`,
      },
      {
        rubrik: 'Konkurrenz',
        titel: 'Die Platzhirsche',
        text: 'Drahtesel & Söhne gilt als Preisbrecher, Velo Veritas als Technikschmiede mit hohem F&E-Budget, und die Kettenreaktion GmbH gibt Geld für Werbung aus, als gäbe es kein Morgen. Alle drei sind ähnlich groß wie der Neuling – noch.',
      },
      {
        rubrik: 'Ratgeber',
        titel: 'Prof. Speiches drei Regeln für Neugründer',
        text: 'Erstens: Produziere so viel, wie du verkaufen kannst – leere Regale schicken Kunden zur Konkurrenz. Zweitens: Werbung wirkt, aber jeder weitere Euro bringt weniger. Drittens: Wer nicht forscht, dessen Technik veraltet um 5 % pro Quartal.',
      },
    ],
    kurzmeldungen: [
      'Die Bank gewährt Neugründern Darlehen mit 8 Quartalen Laufzeit.',
      'Das Testmagazin „Rad & Tat“ veröffentlicht ab sofort jedes Quartal den Technikindex aller Räder.',
    ],
    leserbrief: LESERBRIEFE[Math.floor(rng.next() * LESERBRIEFE.length)],
    glosse: GLOSSEN[Math.floor(rng.next() * GLOSSEN.length)],
    testmagazin: testmagazin(state, null),
    konditionen: konditionen(state),
    branchenbericht: [
      { name: firma, umsatz: 0, ebit: 0, bilanzsumme: 0, farbe: state.unternehmen.farbe, eigen: true },
      ...Object.values(state.konkurrenten).map((k) => ({ name: k.name, umsatz: k.letzterUmsatz, ebit: k.letztesEbit, bilanzsumme: k.bilanzsumme, farbe: k.farbe, eigen: false })),
    ],
  };
}

/** Ausgabe nach einem abgeschlossenen Quartal. `state` ist der Zustand danach (neue Ereignisse angekündigt). */
export function erzeugeZeitung(state: GameState, report: QuarterReport, vorher: QuarterReport | null): Zeitung {
  const rng = new Rng(hashSeed(`${state.einstellungen.seed}-zeitung-${report.quartal}`));
  const pick = <T,>(a: T[]): T => a[Math.floor(rng.next() * a.length)];
  const firma = state.unternehmen.name;
  const g = report.guv;
  const ereignisse = ereignisArtikel(state, rng);
  const artikel: ZeitungsArtikel[] = [];
  const kurz: string[] = [];
  let schlagzeile = '';
  let unterzeile = '';
  let sonderausgabe: string | undefined;

  const wachstum = vorher && vorher.guv.umsatz > 0 ? g.umsatz / vorher.guv.umsatz - 1 : 0;
  const pleiten = report.konkurrenz.filter((k) => k.status === 'pleite' && report.meldungen.some((m) => m.startsWith(k.name)));
  const testsieg = report.vorfaelle.find((v) => v.art === 'testsieg' && v.firma === firma);
  const unbedient = report.angebote.reduce((s, a) => s + a.unbedient, 0);

  if (state.spielende) {
    sonderausgabe = 'Nachruf';
    schlagzeile = `Abgefahren: ${firma} ist insolvent`;
    unterzeile = 'Die Kette ist gerissen. Ein Nachruf auf einen Traum auf zwei Rädern.';
    artikel.push({
      rubrik: 'Nachruf',
      titel: `In stillem Gedenken an ${firma}`,
      text: `${firma} hat den Kampf gegen Kontokorrent und Kassenebbe verloren. Hinterlassen werden ${de0(report.produkte.reduce((s, p) => s + p.lagerEnde, 0))} Räder im Lager und ein Firmenschild in der Garage. Prof. Speiche: „Zu wenig Marge, zu viel Hoffnung.“ Wer mag, lädt einen früheren Spielstand und tritt erneut an.`,
    });
  } else if ((report.freischaltungen ?? []).some((f) => f.art === 'region')) {
    const r = report.freischaltungen.find((f) => f.art === 'region')!.id as keyof typeof REGIONEN;
    sonderausgabe = 'Neue Märkte';
    schlagzeile = pick([`Tor nach ${REGIONEN[r].name} aufgestoßen: ${firma} darf expandieren`, `${firma} greift nach ${REGIONEN[r].name}`, `Grenzenlos radeln: ${REGIONEN[r].name} wartet auf ${firma}`]);
    unterzeile = `Der Meilenstein ist geschafft. Der Markteintritt kostet ${(REGIONEN[r].eintritt / 1e6).toLocaleString('de-DE')} Mio. € – Prof. Speiche rät: „Erst Kapazität, dann Koffer packen.“`;
  } else if (pleiten.length) {
    schlagzeile = `Pleite! ${pleiten[0].name} rollt ins Aus`;
    unterzeile = 'Die Konkurrenz lichtet sich – Kunden suchen neue Hersteller.';
  } else if (ereignisse.length) {
    schlagzeile = ereignisse[0].titel;
    unterzeile = ereignisse[0].wirkung ? `Was das bedeutet: ${ereignisse[0].wirkung}.` : '';
  } else if (testsieg) {
    schlagzeile = fuelle(pick(VORFAELLE.testsieg.schlagzeilen), { firma, produkt: testsieg.produkt ? PRODUKTE[testsieg.produkt].name : 'Rad' });
    unterzeile = testsieg.text;
  } else if (wachstum > 0.25) {
    schlagzeile = pick([`${firma} rollt davon: Umsatz +${prozent(wachstum, 0)}`, `Rückenwind für ${firma}: Umsatz steigt um ${prozent(wachstum, 0)}`, `${firma} tritt in die Pedale – ${prozent(wachstum, 0)} mehr Umsatz`]);
    unterzeile = `Der Umsatz klettert auf ${mio(g.umsatz)}.`;
  } else if (g.ebit < 0) {
    schlagzeile = pick([`Gegenwind für ${firma}: Rote Zahlen`, `${firma} im Rückwärtsgang`, `Platten bei ${firma}: EBIT ${mio(g.ebit)}`]);
    unterzeile = 'Die Kosten laufen dem Umsatz davon – jetzt ist Kalkulation gefragt.';
  } else {
    schlagzeile = pick(['Die Branche kurbelt weiter', 'Ruhige Fahrt im Fahrradmarkt', 'Kette rechts, Kurs gehalten']);
    unterzeile = `Marktbericht für ${quartalLabel(report.quartal)} – und was das nächste Quartal bringt.`;
  }

  // Unternehmensartikel
  const absatzText = report.produkte.map((p) => `${de0(p.absatz)} ${PRODUKTE[p.produkt].name}${p.absatz === 1 ? '' : 's'}`.replace('Stadtrads', 'Stadträder').replace('E-Bikes', 'E-Bikes')).join(' und ');
  artikel.push({
    rubrik: 'Unternehmen',
    titel: `${firma}: ${mio(g.umsatz)} Umsatz, EBIT ${mio(g.ebit)}`,
    text:
      `${firma} hat im ${quartalLabel(report.quartal)} ${absatzText} verkauft. ` +
      `Der Umsatz lag bei ${mio(g.umsatz)}${vorher ? ` (Vorquartal ${mio(vorher.guv.umsatz)})` : ''}, das EBIT bei ${mio(g.ebit)}. ` +
      `Der Marktanteil in Deutschland beträgt ${prozent(report.kennzahlen.marktanteil, 2)}. ` +
      (unbedient > 10
        ? `Allerdings standen Kunden vor leeren Regalen: Rund ${de0(unbedient)} Räder hätte ${firma} zusätzlich verkaufen können – diese Kundschaft ist größtenteils zur Konkurrenz abgewandert.`
        : 'Die Lager reichten aus, um alle Kunden zu bedienen.'),
  });

  // Marktbericht
  const segTexte = report.segmente
    .filter((s) => s.region === 'DE')
    .map((s) => `${PRODUKTE[s.produkt].name}: ${de0(s.volumen)} Stück zu durchschnittlich ${de0(s.durchschnittspreis)} €`)
    .join('; ');
  const nq = state.quartal % 4;
  const saisonWechsel = saison(state.quartal) / saison(state.quartal - 1);
  artikel.push({
    rubrik: 'Markt',
    titel: saisonWechsel > 1.2 ? 'Die Saison beginnt – Händler füllen die Lager' : saisonWechsel < 0.85 ? 'Die Saison klingt aus' : 'Marktbericht',
    text: `Im ${quartalLabel(report.quartal)} wurden in Deutschland verkauft – ${segTexte}. Ausblick auf ${quartalLabel(state.quartal)}: ${SAISON_TEXT[nq]}`,
  });

  artikel.push(...ereignisse.filter((e) => e.titel !== schlagzeile || true));

  // Konkurrenz-Klatsch
  const aktiveK = report.konkurrenz.filter((k) => k.status === 'aktiv');
  if (aktiveK.length) {
    const schlecht = [...aktiveK].sort((a, b) => a.ebit - b.ebit)[0];
    const gut = [...aktiveK].sort((a, b) => b.umsatz - a.umsatz)[0];
    const r = rng.next();
    let text: string;
    let name: string;
    if (schlecht.ebit < 0 && r < 0.6) {
      name = schlecht.name;
      text = fuelle(pick(KLATSCH_SCHLECHT), { name: schlecht.name.split(' ')[0], ebit: mio(schlecht.ebit) });
    } else if (r < 0.75) {
      name = gut.name;
      text = fuelle(pick(KLATSCH_GUT), { name: gut.name, umsatz: mio(gut.umsatz) });
    } else {
      const k = pick(aktiveK);
      name = k.name;
      text = pick(KLATSCH_PROFIL[k.id] ?? KLATSCH_GUT).replace('{name}', k.name).replace('{umsatz}', mio(k.umsatz));
    }
    artikel.push({ rubrik: 'Konkurrenz-Klatsch', titel: `Gesehen bei ${name}`, text });
  }
  for (const k of pleiten) {
    artikel.push({ rubrik: 'Konkurrenz', titel: `${k.name} meldet Insolvenz an`, text: `Nach drei Quartalen ohne Geld in der Kasse ist ${k.name} am Ende. Die Kundschaft sucht sich neue Hersteller – eine Chance für alle, die liefern können.` });
  }

  const stufe = stufenHinweis(state);
  if (stufe) artikel.push(stufe);

  // Kurzmeldungen
  for (const v of report.vorfaelle) kurz.push(v.text);
  const tm = testmagazin(state, report);
  for (const t of tm) {
    const top = t.eintraege[0];
    if (top) kurz.push(speicheZitat(rng, top.name, PRODUKTE[t.produkt].name));
    const schwach = t.eintraege.filter((e) => e.ti < 100);
    for (const e of schwach) kurz.push(`„Rad & Tat“ warnt: Das ${PRODUKTE[t.produkt].name} von ${e.name} ist mit ${de0(e.ti)} Punkten nicht mehr marktfähig.`);
  }
  if (report.meldungen.some((m) => m.includes('Lieferant'))) kurz.push(`Lieferprobleme bei ${firma}: Ein Zulieferer ist ausgefallen, die Bänder liefen nur mit angezogener Handbremse.`);

  return {
    quartal: state.quartal,
    ausgabe: `Ausgabe ${quartalLabel(state.quartal)}`,
    schlagzeile,
    unterzeile,
    sonderausgabe,
    artikel,
    kurzmeldungen: kurz.slice(0, 6),
    leserbrief: pick(LESERBRIEFE),
    glosse: pick(GLOSSEN),
    testmagazin: tm,
    konditionen: konditionen(state),
    branchenbericht: [
      { name: firma, umsatz: g.umsatz, ebit: g.ebit, bilanzsumme: report.bilanz.aktiva, farbe: state.unternehmen.farbe, eigen: true },
      ...report.konkurrenz.map((k) => ({ name: k.name + (k.status === 'pleite' ? ' (insolvent)' : ''), umsatz: k.umsatz, ebit: k.ebit, bilanzsumme: k.bilanzsumme, farbe: k.farbe, eigen: false })),
    ].sort((a, b) => b.umsatz - a.umsatz),
  };
}

export type { Vorfall };
