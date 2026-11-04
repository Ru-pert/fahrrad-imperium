/**
 * Import des Entscheidungs-JSON: toleranter Parser, Zod-Prüfung, Bereichsprüfung,
 * Warnungen und Vergleich Alt → Neu. Werte außerhalb der Bereiche werden nicht still korrigiert.
 */
import {
  BALANCE,
  HQ_EXTRAS,
  HQ_STUFEN,
  KOMPONENTEN,
  PRODUKTE,
  REGIONEN,
  aktiveProdukte,
  aktiveRegionen,
  komplexitaetsStufe,
  kreditlimit,
  previewQuarter,
  quartalLabel,
  referenzPreis,
  schuldenGesamt,
  type Decisions,
  type GameState,
  type LinienTyp,
  type ProductId,
  type RegionId,
} from '../engine';
import { hallenPlaetze, lernkurve } from '../engine/production';
import { ereignisEffekte } from '../engine/events';
import { einstellungsLimit, werkBaubar } from '../engine/expansion';
import { alleFeatures, alleProjekte } from '../engine/forschung';
import { BEKANNT, SPAETERE_FELDER, entscheidungsSchema } from './schemas';

export interface Aenderung {
  feld: string;
  alt: string;
  neu: string;
}

export interface ImportErgebnis {
  ok: boolean;
  fehler: string[];
  warnungen: string[];
  entscheidungen: Decisions | null;
  aenderungen: Aenderung[];
  begruendung?: string;
}

const de = (x: number) => Math.round(x).toLocaleString('de-DE');

/**
 * Holt das JSON-Objekt aus einem Text: entfernt Markdown-Codezäune und Begleittext
 * vor und nach dem JSON (sucht die erste vollständige {...}-Struktur).
 */
export function extrahiereJson(text: string): { json: unknown } | { fehler: string } {
  const ohneZaun = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
  const start = ohneZaun.indexOf('{');
  if (start < 0) return { fehler: 'Kein JSON gefunden – der Text enthält keine geschweifte Klammer „{“.' };
  let tiefe = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < ohneZaun.length; i++) {
    const c = ohneZaun[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') tiefe++;
    else if (c === '}') {
      tiefe--;
      if (tiefe === 0) {
        const roh = ohneZaun.slice(start, i + 1);
        try {
          return { json: JSON.parse(roh) };
        } catch (e) {
          // häufige Chat-Artefakte: typografische Anführungszeichen, Kommas am Ende
          try {
            const repariert = roh.replace(/[„“”]/g, '"').replace(/,\s*([}\]])/g, '$1');
            return { json: JSON.parse(repariert) };
          } catch {
            return { fehler: `Das JSON ist fehlerhaft: ${(e as Error).message}` };
          }
        }
      }
    }
  }
  return { fehler: 'Das JSON ist unvollständig – es fehlt mindestens eine schließende Klammer „}“.' };
}

function unbekannteSchluessel(obj: unknown, bekannt: string[], pfad: string, warn: string[]) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const k of Object.keys(obj)) {
    if (bekannt.includes(k)) continue;
    if (!pfad && SPAETERE_FELDER[k]) warn.push(`„${k}“ (${SPAETERE_FELDER[k]}) gibt es im Spiel noch nicht – wird ignoriert.`);
    else warn.push(`Unbekanntes Feld „${pfad ? pfad + '.' : ''}${k}“ wird ignoriert.`);
  }
}

/** Flache, lesbare Sicht auf Entscheidungen für den Vergleich */
export function flach(state: GameState, d: Decisions): Map<string, string> {
  const m = new Map<string, string>();
  const werkName = (id: string) => state.werke.find((w) => w.id === id)?.name ?? id;
  for (const p of aktiveProdukte(state)) {
    const n = PRODUKTE[p].name;
    for (const r of aktiveRegionen(state)) {
      m.set(`Preis ${n} (${r})`, `${de(d.preis[p]?.[r] ?? 0)} €`);
      m.set(`Marketing ${n} (${r})`, `${de(d.marketing[p]?.[r] ?? 0)} €`);
    }
    for (const w of state.werke) m.set(`Produktion ${n} (${werkName(w.id)})`, `${de(d.produktion[p]?.[w.id] ?? 0)} Stück`);
    m.set(`F&E ${n}`, `${de(d.fe[p] ?? 0)} €`);
  }
  for (const [id, w] of Object.entries(d.werke)) {
    const n = werkName(id);
    m.set(`Personal ${n}`, `${w.personalAenderung > 0 ? '+' : ''}${w.personalAenderung}`);
    m.set(`Schulung ${n}`, `${de(w.schulungProKopf)} €/Kopf`);
    m.set(`Wartung ${n}`, w.wartung);
    m.set(`Linienkauf ${n}`, w.linienKaufen.length ? w.linienKaufen.map((k) => `${k.anzahl}× Typ ${k.typ}`).join(', ') : '–');
    m.set(`Linienverkauf ${n}`, w.linienVerkaufen.length ? w.linienVerkaufen.join(', ') : '–');
    m.set(`Hallenerweiterung ${n}`, w.halleErweitern ? 'ja' : 'nein');
  }
  for (const k of KOMPONENTEN) m.set(`Lieferant ${k}`, d.lieferanten[k]);
  m.set('Nachhaltigkeitsbudget', `${de(d.nachhaltigkeitsbudget)} €`);
  m.set('Darlehen neu', `${de(d.finanzen.darlehenNeu)} €`);
  m.set('Sondertilgung', `${de(d.finanzen.tilgungExtra)} €`);
  m.set('Dividende', `${de(d.finanzen.dividende)} €`);
  m.set('Firmensitz-Käufe', d.firmensitz.kaufen.length ? d.firmensitz.kaufen.join(', ') : '–');
  m.set('Markteintritte', d.expansion?.maerkteBetreten.length ? d.expansion.maerkteBetreten.join(', ') : '–');
  m.set('Produkteinführungen', d.expansion?.produkteEinfuehren.length ? d.expansion.produkteEinfuehren.join(', ') : '–');
  m.set('Werksbau', d.expansion?.werkeBauen.length ? d.expansion.werkeBauen.join(', ') : '–');
  for (const st of [...alleProjekte(state), ...alleFeatures(state)]) if (!st.fertig && (st.offen || (d.forschung?.[st.projekt.id] ?? 0) > 0)) m.set(`Forschung ${st.projekt.name}`, `${de(d.forschung?.[st.projekt.id] ?? 0)} €`);
  return m;
}

export function importiereEntscheidungen(text: string, state: GameState, basis: Decisions): ImportErgebnis {
  const fehler: string[] = [];
  const warn: string[] = [];
  const leer = (f: string): ImportErgebnis => ({ ok: false, fehler: [f], warnungen: [], entscheidungen: null, aenderungen: [] });

  const ex = extrahiereJson(text);
  if ('fehler' in ex) return leer(ex.fehler);
  const roh = ex.json as Record<string, unknown>;
  const geprueft = entscheidungsSchema.safeParse(roh);
  if (!geprueft.success) {
    return {
      ok: false,
      fehler: geprueft.error.issues.map((i) => `${i.path.join('.') || 'JSON'}: ${i.message}`),
      warnungen: [],
      entscheidungen: null,
      aenderungen: [],
    };
  }
  const e = geprueft.data;

  // Struktur-Warnungen
  if (e.format && e.format !== 'fahrrad-imperium/entscheidungen') warn.push(`Unerwartetes Format „${e.format}“ – es wird trotzdem versucht, die Werte zu lesen.`);
  unbekannteSchluessel(roh, BEKANNT.oben, '', warn);
  for (const [p, v] of Object.entries((roh.produkte as Record<string, unknown>) ?? {})) {
    unbekannteSchluessel(v, BEKANNT.produkt, `produkte.${p}`, warn);
    for (const [r, m] of Object.entries(((v as Record<string, unknown>)?.maerkte as Record<string, unknown>) ?? {})) unbekannteSchluessel(m, BEKANNT.markt, `produkte.${p}.maerkte.${r}`, warn);
  }
  for (const [w, v] of Object.entries((roh.werke as Record<string, unknown>) ?? {})) unbekannteSchluessel(v, BEKANNT.werk, `werke.${w}`, warn);
  unbekannteSchluessel(roh.finanzen, BEKANNT.finanzen, 'finanzen', warn);
  unbekannteSchluessel(roh.lieferanten, BEKANNT.lieferanten, 'lieferanten', warn);
  unbekannteSchluessel(roh.firmensitz, BEKANNT.firmensitz, 'firmensitz', warn);
  if (e.quartal && e.quartal.trim() !== quartalLabel(state.quartal)) {
    warn.push(`Das JSON ist für „${e.quartal}“, aktuell wird über ${quartalLabel(state.quartal)} entschieden. Die Werte werden trotzdem übernommen.`);
  }

  const d = structuredClone(basis);
  const stufe = komplexitaetsStufe(state);
  const produkte = aktiveProdukte(state);
  const regionen = aktiveRegionen(state);

  // Produkte
  for (const [pid, pe] of Object.entries(e.produkte ?? {})) {
    const p = pid as ProductId;
    if (!(p in PRODUKTE)) {
      fehler.push(`Unbekanntes Produkt „${pid}“. Erlaubt: ${produkte.join(', ')}.`);
      continue;
    }
    const name = PRODUKTE[p].name;
    if (!produkte.includes(p)) {
      warn.push(`${name} ist noch nicht freigeschaltet – Angaben dazu werden ignoriert.`);
      continue;
    }
    for (const [wid, menge] of Object.entries(pe.produktion ?? {})) {
      if (!state.werke.some((w) => w.id === wid)) {
        fehler.push(`Produktion ${name}: Werk „${wid}“ gibt es nicht. Vorhanden: ${state.werke.map((w) => w.id).join(', ')}.`);
        continue;
      }
      if (menge < 0 || !Number.isInteger(menge)) fehler.push(`Produktion ${name} ${wid}: ${menge} ist keine gültige Stückzahl (ganze Zahl ≥ 0).`);
      else d.produktion[p] = { ...d.produktion[p], [wid]: menge };
    }
    if (pe.fe !== undefined) {
      if (pe.fe < 0) fehler.push(`F&E ${name}: ${de(pe.fe)} € ist negativ.`);
      else d.fe[p] = pe.fe;
    }
    for (const [rid, m] of Object.entries(pe.maerkte ?? {})) {
      const r = rid as RegionId;
      if (!(r in REGIONEN)) {
        fehler.push(`${name}: unbekannter Markt „${rid}“. Erlaubt: ${regionen.join(', ')}.`);
        continue;
      }
      if (!regionen.includes(r)) {
        warn.push(`${name}: Markt ${REGIONEN[r].name} ist noch nicht freigeschaltet – ignoriert.`);
        continue;
      }
      if (m.preis !== undefined) {
        const ref = referenzPreis(r, p);
        if (m.preis < 0.5 * ref || m.preis > 3 * ref) fehler.push(`Preis ${name} ${r}: ${de(m.preis)} € liegt außerhalb von 50–300 % des Referenzpreises (${de(0.5 * ref)}–${de(3 * ref)} €).`);
        else d.preis[p] = { ...d.preis[p], [r]: m.preis };
      }
      if (m.marketing !== undefined) {
        if (m.marketing < 0) fehler.push(`Marketing ${name} ${r}: ${de(m.marketing)} € ist negativ.`);
        else d.marketing[p] = { ...d.marketing[p], [r]: m.marketing };
      }
    }
  }

  // Werke
  const einstellFaktor = ereignisEffekte(state).einstellung;
  for (const [wid, we] of Object.entries(e.werke ?? {})) {
    const w = state.werke.find((x) => x.id === wid);
    if (!w) {
      fehler.push(`Werk „${wid}“ gibt es nicht. Vorhanden: ${state.werke.map((x) => x.id).join(', ')}.`);
      continue;
    }
    const z = d.werke[wid];
    if (we.personalAenderung !== undefined) {
      const maxPlus = einstellungsLimit(w, einstellFaktor);
      const maxMinus = Math.floor(w.mitarbeitende * BALANCE.personal.maxEntlassung);
      if (!Number.isInteger(we.personalAenderung)) fehler.push(`Personal ${w.name}: ${we.personalAenderung} ist keine ganze Zahl.`);
      else if (we.personalAenderung > maxPlus) fehler.push(`Personal ${w.name}: +${we.personalAenderung} übersteigt das Einstellungslimit von +${maxPlus}.`);
      else if (-we.personalAenderung > maxMinus) fehler.push(`Personal ${w.name}: ${we.personalAenderung} übersteigt das Entlassungslimit von −${maxMinus}.`);
      else z.personalAenderung = we.personalAenderung;
    }
    if (we.schulungProKopf !== undefined) {
      if (we.schulungProKopf < 0 || we.schulungProKopf > BALANCE.personal.schulungMax) fehler.push(`Schulung ${w.name}: ${de(we.schulungProKopf)} € liegt außerhalb von 0–2.000 € je Kopf.`);
      else z.schulungProKopf = we.schulungProKopf;
    }
    if (we.wartung !== undefined) {
      if (stufe < 2) warn.push(`Wartung ist erst ab Q3 wählbar – „${we.wartung}“ wird ignoriert.`);
      else z.wartung = we.wartung;
    }
    let kaeufe: { typ: LinienTyp; anzahl: number }[] | undefined = we.linienKaufen;
    if (we.neueLinien !== undefined && !kaeufe) kaeufe = we.neueLinien > 0 ? [{ typ: 'B', anzahl: we.neueLinien }] : [];
    if (kaeufe) {
      const erlaubt = kaeufe.filter((k) => {
        if (stufe < 3 && k.typ !== 'B') {
          warn.push(`Linientyp ${k.typ} ist erst ab Q5 verfügbar – Kauf wird ignoriert.`);
          return false;
        }
        if (!Number.isInteger(k.anzahl) || k.anzahl < 0) {
          fehler.push(`Linienkauf ${w.name}: Anzahl ${k.anzahl} ist ungültig.`);
          return false;
        }
        return true;
      });
      const summe = erlaubt.reduce((s, k) => s + k.anzahl, 0);
      const verkauf = (we.linienVerkaufen ?? z.linienVerkaufen).length;
      const frei = hallenPlaetze(w) - w.linien.length + (stufe >= 3 ? verkauf : 0);
      if (summe > BALANCE.produktion.maxNeueLinienProQuartal) fehler.push(`Linienkauf ${w.name}: höchstens ${BALANCE.produktion.maxNeueLinienProQuartal} neue Linien je Quartal (angefragt ${summe}).`);
      else if (summe > frei) fehler.push(`Linienkauf ${w.name}: nur ${frei} freie Hallenplätze (angefragt ${summe}).`);
      else z.linienKaufen = erlaubt.filter((k) => k.anzahl > 0);
    }
    if (we.linienVerkaufen !== undefined) {
      if (stufe < 3 && we.linienVerkaufen.length) warn.push('Linienverkauf ist erst ab Q5 möglich – wird ignoriert.');
      else {
        const unbekannt = we.linienVerkaufen.filter((id) => !w.linien.some((l) => l.id === id && l.status === 'aktiv'));
        if (unbekannt.length) fehler.push(`Linienverkauf ${w.name}: unbekannte oder nicht laufende Linien ${unbekannt.join(', ')}. Vorhanden: ${w.linien.map((l) => l.id).join(', ')}.`);
        else if (w.linien.length - we.linienVerkaufen.length < 1) fehler.push(`Linienverkauf ${w.name}: Mindestens eine Linie muss bleiben.`);
        else z.linienVerkaufen = we.linienVerkaufen;
      }
    }
    if (we.halleErweitern !== undefined) {
      if (we.halleErweitern && w.linien.length < hallenPlaetze(w)) fehler.push(`Hallenerweiterung ${w.name}: erst möglich, wenn alle ${hallenPlaetze(w)} Plätze belegt sind (aktuell ${w.linien.length}).`);
      else z.halleErweitern = we.halleErweitern;
    }
  }

  // Lieferanten, Nachhaltigkeit
  if (e.lieferanten) {
    if (stufe < 2) warn.push('Lieferanten sind erst ab Q3 wählbar – Angaben werden ignoriert.');
    else for (const k of KOMPONENTEN) if (e.lieferanten[k]) d.lieferanten[k] = e.lieferanten[k]!;
  }
  if (e.nachhaltigkeitsbudget !== undefined) {
    if (stufe < 3) warn.push('Das Nachhaltigkeitsbudget ist erst ab Q5 wählbar – wird ignoriert.');
    else if (e.nachhaltigkeitsbudget < 0) fehler.push('Nachhaltigkeitsbudget ist negativ.');
    else d.nachhaltigkeitsbudget = e.nachhaltigkeitsbudget;
  }

  // Finanzen
  if (e.finanzen) {
    const f = e.finanzen;
    const frei = Math.max(0, kreditlimit(state) - schuldenGesamt(state.finanzen));
    const offen = state.finanzen.kredite.reduce((s, k) => s + k.restbetrag, 0);
    if (f.darlehenNeu !== undefined) {
      if (f.darlehenNeu < 0) fehler.push('Darlehen neu ist negativ.');
      else if (f.darlehenNeu > frei + 0.5) fehler.push(`Darlehen: ${de(f.darlehenNeu)} € übersteigen das freie Kreditlimit von ${de(frei)} €.`);
      else d.finanzen.darlehenNeu = f.darlehenNeu;
    }
    if (f.tilgungExtra !== undefined) {
      if (f.tilgungExtra < 0 || f.tilgungExtra > offen + 0.5) fehler.push(`Sondertilgung: ${de(f.tilgungExtra)} € – erlaubt sind 0 bis ${de(offen)} € (offene Darlehen).`);
      else d.finanzen.tilgungExtra = f.tilgungExtra;
    }
    if (f.dividende !== undefined) {
      const max = Math.max(0, state.finanzen.gewinnruecklagen);
      if (f.dividende < 0 || f.dividende > max + 0.5) fehler.push(`Dividende: ${de(f.dividende)} € – erlaubt sind 0 bis ${de(max)} € (Gewinnrücklagen).`);
      else d.finanzen.dividende = f.dividende;
    }
  }

  // Firmensitz
  if (e.firmensitz?.kaufen) {
    let stufeHq = state.unternehmen.firmensitz.stufe;
    const ok: string[] = [];
    for (const id of e.firmensitz.kaufen) {
      const idx = HQ_STUFEN.findIndex((s) => s.id === id);
      const extra = HQ_EXTRAS.find((x) => x.id === id);
      if (idx >= 0) {
        if (idx !== stufeHq + 1) fehler.push(`Firmensitz „${HQ_STUFEN[idx].name}“: Als Nächstes ist nur „${HQ_STUFEN[stufeHq + 1]?.name ?? '–'}“ möglich.`);
        else {
          ok.push(id);
          stufeHq = idx;
        }
      } else if (extra) {
        if (state.unternehmen.firmensitz.extras.includes(id)) warn.push(`„${extra.name}“ ist bereits vorhanden – wird ignoriert.`);
        else ok.push(id);
      } else {
        fehler.push(`Firmensitz: unbekannter Eintrag „${id}“. Erlaubt: ${[...HQ_STUFEN.slice(1).map((s) => s.id), ...HQ_EXTRAS.map((x) => x.id)].join(', ')}.`);
      }
    }
    d.firmensitz = { kaufen: ok };
  }

  // Expansion
  if (e.expansion) {
    const x = e.expansion;
    if (x.uebernahmen?.length) warn.push('Übernahmen gibt es im Spiel noch nicht – werden ignoriert.');
    const neu = { maerkteBetreten: [] as RegionId[], produkteEinfuehren: [] as ProductId[], werkeBauen: [] as string[] };
    for (const r of x.maerkteBetreten ?? []) {
      if (!(r in REGIONEN)) fehler.push(`Markteintritt: unbekannte Region „${r}“ (erlaubt: EU, NA, AS, RW).`);
      else if (state.regionen[r as RegionId]?.aktiv) warn.push(`${REGIONEN[r as RegionId].name} ist bereits aktiv.`);
      else if (!state.regionen[r as RegionId]?.freigeschaltet) fehler.push(`Markteintritt ${REGIONEN[r as RegionId].name}: noch nicht freigeschaltet.`);
      else neu.maerkteBetreten.push(r as RegionId);
    }
    for (const p of x.produkteEinfuehren ?? []) {
      if (!(p in PRODUKTE)) fehler.push(`Produkteinführung: unbekanntes Produkt „${p}“.`);
      else if (state.produkte[p as ProductId]) warn.push(`${PRODUKTE[p as ProductId].name} ist bereits im Programm.`);
      else if (!(state.produkteVerfuegbar ?? []).includes(p as ProductId)) fehler.push(`Produkteinführung ${PRODUKTE[p as ProductId].name}: noch nicht freigeschaltet.`);
      else neu.produkteEinfuehren.push(p as ProductId);
    }
    for (const c of x.werkeBauen ?? []) {
      const ok = werkBaubar(state, c);
      if (!ok.ok) fehler.push(`Werksbau „${c}“: ${ok.grund}.`);
      else neu.werkeBauen.push(c);
    }
    d.expansion = neu;
  }

  // Forschung
  if (e.forschung && Object.keys(e.forschung).length) {
    const neu: Record<string, number> = { ...(d.forschung ?? {}) };
    for (const [id, betrag] of Object.entries(e.forschung)) {
      const alle = [...alleProjekte(state), ...alleFeatures(state)];
      const st = alle.find((x) => x.projekt.id === id);
      if (!st) {
        fehler.push(`Forschung: unbekanntes Projekt „${id}“ (erlaubt: ${alle.map((x) => x.projekt.id).join(', ')}).`);
        continue;
      }
      if (betrag < 0) fehler.push(`Forschung ${st.projekt.name}: Budget ist negativ.`);
      else if (st.fertig) warn.push(`${st.projekt.name} ist bereits erforscht – Budget wird ignoriert.`);
      else if (!st.offen && betrag > 0) warn.push(`${st.projekt.name}: Voraussetzungen fehlen noch – Budget wird ignoriert.`);
      else neu[id] = betrag;
    }
    d.forschung = neu;
  }

  // Kapazität je Werk (nicht still kürzen, sondern melden)
  if (!fehler.length) {
    const vorschau = previewQuarter(state, d);
    for (const w of state.werke) {
      const wr = vorschau.werke.find((x) => x.id === w.id);
      if (!wr) continue;
      let noetig = 0;
      for (const p of produkte) noetig += (d.produktion[p]?.[w.id] ?? 0) * PRODUKTE[p].montageStunden * lernkurve(state.produkte[p]!.kumMenge);
      if (noetig > wr.maxStunden + 0.5) {
        const details = produkte
          .filter((p) => (d.produktion[p]?.[w.id] ?? 0) > 0)
          .map((p) => {
            const stunden = PRODUKTE[p].montageStunden * lernkurve(state.produkte[p]!.kumMenge);
            const andere = noetig - (d.produktion[p]?.[w.id] ?? 0) * stunden;
            const max = Math.max(0, Math.floor((wr.maxStunden - andere) / stunden));
            return `${PRODUKTE[p].name} ${de(d.produktion[p]?.[w.id] ?? 0)} Stück (bei sonst gleicher Planung max. ${de(max)})`;
          })
          .join(', ');
        fehler.push(`Produktion ${w.name}: ${de(noetig)} Std. benötigt, Kapazität ${de(wr.maxStunden)} Std. – ${details}.`);
      }
    }
  }

  const alt = flach(state, basis);
  const neu = flach(state, d);
  const aenderungen: Aenderung[] = [];
  for (const [k, v] of neu) if (alt.get(k) !== v) aenderungen.push({ feld: k, alt: alt.get(k) ?? '–', neu: v });

  return { ok: fehler.length === 0, fehler, warnungen: warn, entscheidungen: fehler.length ? null : d, aenderungen, begruendung: e.begruendung };
}
