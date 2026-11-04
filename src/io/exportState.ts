/**
 * Lagebericht als JSON (Abschnitt 15): alles, was der Spieler wissen darf –
 * keine geheimen Konkurrenzwerte. Aktuelles Quartal vollständig, Vorquartale als Kennzahlenreihe.
 */
import {
  BALANCE,
  HQ_STUFEN,
  LINIENTYPEN,
  PRODUKTE,
  PRODUKT_IDS,
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
  type QuarterReport,
  type RegionId,
} from '../engine';
import { ratingAufschlag } from '../engine/finance';
import { produktBedingungen, regionBedingungen, werkBaubar } from '../engine/expansion';
import { WERK_STANDORTE } from '../engine/config/markets';
import { ereignisDef } from '../engine/events';
import { hallenPlaetze } from '../engine/production';
import { saison } from '../engine/util';
import { berechneHebel } from '../ui/hebel';
import { entscheidungenAlsJson } from './decisionsJson';

const r0 = (x: number) => Math.round(x);
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

const SAISON_TEXT = ['Q1: ruhig, Nachfrage ×0,75', 'Q2: Hochsaison, Nachfrage ×1,30', 'Q3: Saison, Nachfrage ×1,15', 'Q4: kühl, Nachfrage ×0,80'];

export function lagebericht(state: GameState, letzter: QuarterReport | null, entwurf: Decisions, mitHebeln = true) {
  const vorschau = previewQuarter(state, entwurf);
  const produkte = aktiveProdukte(state);
  const regionen = aktiveRegionen(state);
  const stufe = komplexitaetsStufe(state);
  const umsatz4Q = state.kpiHistorie.slice(-4).reduce((s, k) => s + k.umsatz, 0);
  const anteilDE = letzter?.kennzahlen.marktanteil ?? 0;

  return {
    format: 'fahrrad-imperium/lagebericht',
    version: 1,
    quartal: letzter ? quartalLabel(letzter.quartal) : null,
    naechstesQuartal: quartalLabel(state.quartal),
    hinweis: 'Werte in Euro bzw. Stück je Quartal. „naechstesQuartal“ ist das Quartal, für das entschieden wird.',
    unternehmen: {
      name: state.unternehmen.name,
      rechtsform: state.unternehmen.rechtsform,
      kasse: r0(state.finanzen.kasse),
      kontokorrent: r0(state.finanzen.kontokorrent),
      rating: state.finanzen.rating,
      kreditlimit: r0(kreditlimit(state)),
      freiesKreditlimit: r0(Math.max(0, kreditlimit(state) - schuldenGesamt(state.finanzen))),
      darlehen: state.finanzen.kredite.map((k) => ({ restbetrag: r0(k.restbetrag), tilgungProQuartal: r0(Math.min(k.tilgung, k.restbetrag)), zins: r4(k.zins) })),
      gewinnruecklagen: r0(state.finanzen.gewinnruecklagen),
      bekanntheit: Object.fromEntries(regionen.map((r) => [r, r4(state.regionen[r]?.bekanntheit ?? 0)])),
      image: r2(state.unternehmen.image),
      nachhaltigkeit: r2(state.unternehmen.nachhaltigkeit),
      firmensitz: HQ_STUFEN[state.unternehmen.firmensitz.stufe].name,
    },
    kennzahlen: state.kpiHistorie.map((k) => ({
      quartal: quartalLabel(k.quartal), umsatz: r0(k.umsatz), ebit: r0(k.ebit), kasse: r0(k.kasse), marktanteilDE: r4(k.marktanteil), absatz: k.absatz,
    })),
    guv: letzter
      ? Object.fromEntries(Object.entries(letzter.guv).map(([k, v]) => [k, r0(v)]))
      : null,
    bilanz: letzter ? Object.fromEntries(Object.entries(letzter.bilanz).map(([k, v]) => [k, r0(v)])) : null,
    produkte: Object.fromEntries(
      produkte.map((p) => {
        const pz = state.produkte[p]!;
        const pb = letzter?.produkte.find((x) => x.produkt === p);
        const vb = vorschau.produkte.find((x) => x.produkt === p);
        return [
          p,
          {
            name: PRODUKTE[p].name,
            herstellkostenProStueck: r0(vb?.hkProStueck ?? pz.letzteHk),
            lager: pz.lager.stueck,
            feStock: r0(pz.fe),
            technik: r2(pb?.technik ?? 0),
            technikIndex: r0(pb?.technikIndex ?? 0),
            qualitaet: r2(pb?.qualitaet ?? 1),
            umweltindex: r0(pb?.umweltindex ?? 0),
            lernkurve: r2(vb?.lernkurve ?? 1),
            kumulierteMenge: pz.kumMenge,
            preisElastizitaet: PRODUKTE[p].epsilon,
            technikSensitivitaet: PRODUKTE[p].tau,
            montageStundenJeStueck: PRODUKTE[p].montageStunden,
            maerkte: Object.fromEntries(
              regionen.map((r) => {
                const a = letzter?.angebote.find((x) => x.produkt === p && x.region === r);
                const seg = letzter?.segmente.find((x) => x.produkt === p && x.region === r);
                return [
                  r,
                  {
                    preis: r0(a?.preis ?? entwurf.preis[p]?.[r] ?? 0),
                    referenzpreis: r0(referenzPreis(r, p)),
                    marketing: r0(a?.marketing ?? 0),
                    absatz: a?.absatz ?? 0,
                    nachfrage: r0(a?.nachfrage ?? 0),
                    unbedienteNachfrage: r0(a?.unbedient ?? 0),
                    marktanteil: r4(a?.marktanteil ?? 0),
                    durchschnittspreisMarkt: r0(seg?.durchschnittspreis ?? 0),
                    marktvolumen: r0(seg?.volumen ?? 0),
                  },
                ];
              }),
            ),
          },
        ];
      }),
    ),
    werke: Object.fromEntries(
      state.werke.map((w) => {
        const wr = letzter?.werke.find((x) => x.id === w.id);
        const vw = vorschau.werke.find((x) => x.id === w.id);
        return [
          w.id,
          {
            name: w.name,
            mitarbeitende: w.mitarbeitende,
            motivation: r2(w.motivation),
            kompetenz: r2(w.kompetenz),
            produktivitaetI: r2(wr?.produktivitaetI ?? 1),
            wartung: w.wartung,
            hallenPlaetze: hallenPlaetze(w),
            stundenKapazitaetNaechstesQuartal: r0(vw?.maxStunden ?? 0),
            maschinenStunden: r0(vw?.maschinenStunden ?? 0),
            personalStundenRegulaer: r0(vw?.personalStundenRegulaer ?? 0),
            auslastungLetztesQuartal: r2(wr?.auslastung ?? 0),
            linien: w.linien.map((l) => ({
              id: l.id, typ: l.typ, status: l.status, alterQuartale: LINIENTYPEN[l.typ].lebensdauer - l.restlaufzeit,
              verfuegbarkeit: r2(l.verfuegbarkeit), umweltindex: l.umweltindex, buchwert: r0(l.buchwert), verkaufserloes: r0(LINIENTYPEN[l.typ].restwert * l.buchwert),
            })),
          },
        ];
      }),
    ),
    lieferanten: { ...entwurf.lieferanten },
    konkurrenz: (letzter?.konkurrenz ?? []).map((k) => ({
      name: k.name, status: k.status, quelle: 'branchenbericht', genauigkeit: 0,
      umsatzVorquartal: r0(k.umsatz), ebitVorquartal: r0(k.ebit), bilanzsumme: r0(k.bilanzsumme),
      technikIndex: Object.fromEntries((letzter?.segmente ?? []).filter((s) => s.region === 'DE').map((s) => [s.produkt, r0(s.technikIndex[k.id] ?? 0)])),
    })),
    ereignisseAktiv: (state.ereignisse ?? []).map((e) => {
      const d = ereignisDef(e.id);
      return { id: e.id, name: d?.name ?? e.id, wirkung: d?.wirkung ?? '', restQuartale: e.rest, neu: e.neu };
    }),
    konditionen: {
      basiszins: r4(state.zinsen.basiszins),
      darlehenszinsNeu: r4(state.zinsen.basiszins + ratingAufschlag(state.finanzen.rating)),
      kontokorrent: BALANCE.finanzen.kontokorrentZins,
      darlehenLaufzeitQuartale: BALANCE.finanzen.darlehenLaufzeit,
    },
    saison: { naechstesQuartal: SAISON_TEXT[state.quartal % 4], faktor: saison(state.quartal) },
    optionen: {
      komplexitaetsStufe: stufe,
      gesperrt: stufe < 2 ? ['lieferanten', 'wartung', 'linientypen A/C', 'linienVerkaufen', 'nachhaltigkeitsbudget'] : stufe < 3 ? ['linientypen A/C', 'linienVerkaufen', 'nachhaltigkeitsbudget'] : [],
      naechsterMeilenstein: `Europa: Umsatz 4Q ${(umsatz4Q / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} / 10 Mio. € und Marktanteil DE ${(anteilDE * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} / 1 %`,
      firmensitzNaechsteStufe: HQ_STUFEN[state.unternehmen.firmensitz.stufe + 1]
        ? { stufe: HQ_STUFEN[state.unternehmen.firmensitz.stufe + 1].id, name: HQ_STUFEN[state.unternehmen.firmensitz.stufe + 1].name, kosten: HQ_STUFEN[state.unternehmen.firmensitz.stufe + 1].kosten }
        : null,
      hallenErweiterung: { kosten: BALANCE.produktion.hallenErweiterung.kosten, moeglich: state.werke.map((w) => ({ werk: w.id, moeglich: w.linien.length >= hallenPlaetze(w) && !(w.halleImBau ?? 0) })) },
      linientypen: Object.fromEntries(Object.entries(LINIENTYPEN).map(([t, c]) => [t, { preis: c.preis, kapazitaetStunden: c.kapazitaet, lebensdauer: c.lebensdauer, fixkosten: c.fixkosten, umweltindex: c.umwelt }])),
      regionen: Object.fromEntries(
        Object.entries(REGIONEN).map(([r, c]) => [
          r,
          {
            aktiv: !!state.regionen[r as RegionId]?.aktiv,
            freigeschaltet: !!state.regionen[r as RegionId]?.freigeschaltet,
            eintrittKosten: c.eintritt,
            bedingungen: regionBedingungen(state, r as RegionId).map((b) => ({ text: b.text, ist: r2(b.ist), ziel: b.ziel, erfuellt: b.erfuellt })),
          },
        ]),
      ),
      produkteEinfuehrbar: state.produkteVerfuegbar ?? [],
      produkteGesperrt: PRODUKT_IDS.filter((p) => !state.produkte[p] && !(state.produkteVerfuegbar ?? []).includes(p)).map((p) => ({
        produkt: p, bedingungen: produktBedingungen(state, p).map((b) => ({ text: b.text, ist: r2(b.ist), ziel: b.ziel })),
      })),
      werkStandorte: Object.fromEntries(Object.entries(WERK_STANDORTE).map(([c, st]) => [c, { name: st.name, baukosten: st.baukosten, bauzeit: st.bauzeit, lohnIndex: st.lohnIndex, baubar: werkBaubar(state, c).ok }])),
    },
    vorschauMitEntwurf: {
      umsatz: r0(vorschau.guv.umsatz), ebit: r0(vorschau.guv.ebit), kasseEnde: r0(vorschau.bilanz.kasse),
      warnungen: vorschau.warnungen,
      annahme: 'Konkurrenz wiederholt das Vorquartal, keine Zufallsereignisse',
    },
    wirkungsabschaetzung: mitHebeln
      ? berechneHebel(state, entwurf).map((h) => ({ hebel: h.label, absatzDelta: h.absatz, ebitDieses: r0(h.ebitJetzt), ebitNaechstes: r0(h.ebitNaechstes) }))
      : undefined,
    entscheidungsVorlage: entscheidungenAlsJson(entwurf),
  };
}
