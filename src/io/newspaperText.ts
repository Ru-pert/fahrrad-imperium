import { PRODUKTE, quartalLabel, type GameState, type Zeitung } from '../engine';

const eur = (x: number) => `${Math.round(x).toLocaleString('de-DE')} €`;
const pz = (x: number, d = 1) => `${(x * 100).toLocaleString('de-DE', { maximumFractionDigits: d })} %`;

/** Zeitung als reiner, gut vorlesbarer Text (Schlagzeilen in Großbuchstaben, keine Tabellen). */
export function zeitungAlsText(z: Zeitung, state?: GameState, lageInZahlen = false): string {
  const t: string[] = [];
  t.push('DER KETTENBLATT-KURIER');
  t.push(`Fachblatt für angewandte Zweiradökonomie. ${z.ausgabe}. Preis: 1 Speiche.`);
  if (z.sonderausgabe) t.push(`SONDERAUSGABE: ${z.sonderausgabe.toUpperCase()}`);
  t.push('');
  t.push(z.schlagzeile.toUpperCase());
  if (z.unterzeile) t.push(z.unterzeile);
  for (const a of z.artikel) {
    t.push('');
    t.push(`${a.rubrik.toUpperCase()}: ${a.titel.toUpperCase()}`);
    t.push(a.text);
    if (a.wirkung) t.push(`Auswirkung: ${a.wirkung}.`);
  }
  if (z.kurzmeldungen.length) {
    t.push('');
    t.push('KURZMELDUNGEN');
    for (const k of z.kurzmeldungen) t.push(`- ${k}`);
  }
  t.push('');
  t.push('TESTMAGAZIN „RAD & TAT“');
  for (const tm of z.testmagazin) {
    const reihe = tm.eintraege.map((e) => `${e.name} ${Math.round(e.ti)} Punkte`).join(', ');
    t.push(`${PRODUKTE[tm.produkt].name}: ${reihe}. Testsieger: ${tm.eintraege[0]?.name ?? '–'}.`);
  }
  t.push('');
  t.push('KONDITIONEN');
  t.push(`Basiszins ${pz(z.konditionen.basiszins)}, Darlehen für Ihr Rating ${z.konditionen.rating} ${pz(z.konditionen.darlehen)}, Kontokorrent ${pz(z.konditionen.kontokorrent, 0)}.`);
  t.push('');
  t.push('BRANCHENBERICHT');
  for (const b of z.branchenbericht) t.push(`${b.name}: Umsatz ${eur(b.umsatz)}, EBIT ${eur(b.ebit)}, Bilanzsumme ${eur(b.bilanzsumme)}.`);
  t.push('');
  t.push(`GLOSSE: ${z.glosse.titel.toUpperCase()}`);
  t.push(z.glosse.text);
  t.push('');
  t.push('LESERBRIEF');
  t.push(z.leserbrief);

  if (lageInZahlen && state) {
    const k = state.kpiHistorie[state.kpiHistorie.length - 1];
    t.push('');
    t.push(`LAGE IN ZAHLEN (vor ${quartalLabel(state.quartal)})`);
    t.push(`Kasse ${eur(state.finanzen.kasse)}, Rating ${state.finanzen.rating}.`);
    if (k) t.push(`Letztes Quartal: Umsatz ${eur(k.umsatz)}, EBIT ${eur(k.ebit)}, Marktanteil DE ${pz(k.marktanteil, 2)}.`);
    for (const [p, z2] of Object.entries(state.produkte)) if (z2) t.push(`Lager ${PRODUKTE[p as keyof typeof PRODUKTE].name}: ${z2.lager.stueck} Stück.`);
    for (const w of state.werke) t.push(`Werk ${w.name}: ${w.linien.length} Linien, ${w.mitarbeitende} Mitarbeitende.`);
  }
  return t.join('\n');
}
