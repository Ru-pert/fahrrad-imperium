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
import { regionBedingungen, werkBaubar } from '../engine/expansion';
import { alleFeatures, alleProjekte } from '../engine/forschung';
import { branchenanalyse, kundenbefragung, marktbericht, spionageAkte, spionageRisiko, zufriedenheitVon } from '../engine/tiefe';
import { EINKAUF, MARKTFORSCHUNG } from '../engine/config/tiefe';
import { KOMPLEXITAET, SPIELZIEL } from '../engine/config/spielziel';
import { restQuartaleBisZiel, wertung } from '../engine/spielziel';
import { krisenAnsicht } from '../engine/krisen';
import { fuehrungVon, hauptwirkung, kannBefoerdern } from '../engine/fuehrung';
import { FUEHRUNG, mackeVon } from '../engine/config/fuehrung';
import { aktienKaufPreis, boerseVon, fundamentalJeAktie, gruenderAnteil, ipoBedingungen, ipoFairerPreis, istBoersennotiert, markenPreis, uebernahmeMoeglich, uebernahmePreis } from '../engine/boerse';
import { EPOCHEN } from '../engine/config/features';
import { segmentWachstum, volumenFaktor } from '../engine/market';
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
    spielziel: (() => {
      const w = wertung(state);
      return {
        beschreibung: `Endabrechnung nach ${SPIELZIEL.quartale} Quartalen (15 Jahre): Punkte aus Unternehmenswert, Weltrang, Regionen, Erfolgen, Image/Nachhaltigkeit. Stufen: ${SPIELZIEL.stufen.map((x) => `${x.name} ab ${x.ab}`).join(', ')}.`,
        restQuartale: restQuartaleBisZiel(state),
        punkteStandJetzt: w.punkte,
        stufeStandJetzt: w.stufe,
        bausteine: w.bausteine.map((b) => ({ baustein: b.name, punkte: Math.round(b.punkte), max: b.max, info: b.text })),
        endwertung: state.endwertung ? { punkte: state.endwertung.punkte, stufe: state.endwertung.stufe } : null,
      };
    })(),
    boerse: (() => {
      const b = boerseVon(state);
      return {
        notiert: b.notiert,
        aktienGesamt: b.aktienGesamt,
        anteilGruender: r4(gruenderAnteil(state)),
        kurs: b.notiert ? r2(b.kurs) : null,
        stimmung: b.notiert ? r2(b.stimmung) : null,
        fundamentalJeAktie: r2(fundamentalJeAktie(state)),
        ipoBedingungen: b.notiert ? null : ipoBedingungen(state),
        ipoFairerPreis: b.notiert ? null : r2(ipoFairerPreis(state)),
        regeln: 'IPO: 10–40 % neue Aktien, Preis ±15 % um den fundamentalen Wert; zu hoher Preis → Teilplatzierung; 5 % Kosten. Danach: Kapitalerhöhung ≤ 20 %/Q (5 % Abschlag, 3 % Kosten), Rückkauf ≤ 10 %/Q (+2 %).',
      };
    })(),
    beteiligungen: Object.entries(state.beteiligungen ?? {}).map(([id, b]) => ({ konkurrent: id, anteil: r4(b.anteil), buchwert: r0(b.buchwert) })),
    uebernahmeKandidaten: Object.values(state.konkurrenten).filter((k) => k.status === 'aktiv').map((k) => ({
      id: k.id, name: k.name, boersennotiert: istBoersennotiert(k.id), moeglich: uebernahmeMoeglich(state, k.id).ok, grund: uebernahmeMoeglich(state, k.id).grund ?? null,
      kaufpreis: istBoersennotiert(k.id) ? null : r0(uebernahmePreis(state, k.id)), preisFuer10ProzentAktien: istBoersennotiert(k.id) ? r0(aktienKaufPreis(state, k.id, 0.1)) : null,
    })),
    markeZukaufen: Object.fromEntries((['EU', 'NA', 'AS', 'RW'] as RegionId[]).filter((r) => state.regionen[r]?.aktiv).map((r) => [r, r0(markenPreis(state, r))])),
    koordinationskosten: { anteilVomUmsatz: letzter && letzter.guv.umsatz > 0 ? r4((letzter.guv.koordination ?? 0) / letzter.guv.umsatz) : 0, regel: `+${KOMPLEXITAET.jeWeiteresWerk * 100} % je weiteres Werk, +${KOMPLEXITAET.jeWeitereRegion * 100} % je weitere Region, +${KOMPLEXITAET.jeWeiteresProdukt * 100} % je weiteres Produkt (max. ${KOMPLEXITAET.max * 100} %)` },
    konkurrenzVerhalten: 'Konkurrenten, deren Umsatz du zur Hälfte erreichst, senken in deinen Märkten dauerhaft die Preise (−5 %) und werben mehr. Deine Features werden nach 4 Quartalen zu 60 % nachgebaut. Golden Spoke altert ab 2029: weniger Zugkraft und Kapazität.',
    kundenzufriedenheit: Object.fromEntries(regionen.map((r) => [r, Object.fromEntries(produkte.map((p) => [p, r2(zufriedenheitVon(state, r, p))]))])),
    offeneAngebote: {
      grossabnehmer: (state.angebote?.grossabnehmer ?? []).map((g) => ({ id: g.id, kunde: g.kunde, region: g.region, produkt: g.produkt, festpreis: g.preis, hoechstmenge: g.hoechstmenge })),
      ausschreibungen: (state.angebote?.ausschreibungen ?? []).map((a) => ({ id: a.id, behoerde: a.behoerde, region: a.region, produkt: a.produkt, menge: a.menge, minTechnikindex: a.minTechnikindex })),
      hinweis: 'Großabnehmer: Festpreis, sofortige Zahlung, keine Logistik, Lieferung vor dem Markt. Ausschreibung: niedrigstes Gebot gewinnt (Konkurrenz bietet etwa 55–75 % des Ø-Marktpreises), Zahlung im Folgequartal.',
    },
    ergebnisseSonderabsatz: (letzter?.sonderabsatz ?? []).map((x) => ({ id: x.id, art: x.art, menge: x.menge, preis: x.preis, gewonnen: x.gewonnen, konkurrenzGebot: x.konkurrenzGebot })),
    materiallager: Object.fromEntries(produkte.map((p) => [p, state.produkte[p]?.materialSets ?? 0])),
    rettungsangebot: state.rettungsangebot ? { kapital: state.rettungsangebot.kapital, anteilInvestor: state.rettungsangebot.anteil, hinweis: 'Ablehnen beendet das Spiel (Insolvenz).' } : null,
    investorAnteil: state.finanzen.investorAnteil ?? 0,
    krise: (() => {
      const k = krisenAnsicht(state);
      return k ? { titel: k.titel, text: k.text, optionen: k.optionen.map((o) => ({ id: o.id, label: o.label, hinweis: o.hinweis, kosten: r0(o.kosten), ertrag: r0(o.ertrag), risikoProzent: o.risiko, standard: o.standard })), hinweis: 'Antwort mit "krise": "<id>". Ohne Antwort gilt die Standard-Option. Die Wirkung tritt in diesem Quartal ein.' } : null;
    })(),
    fuehrungsteam: (() => {
      const z = fuehrungVon(state);
      const person = (p: (typeof z.team)[number]) => ({
        id: p.id, name: p.name, ressort: p.ressort, stufe: p.stufe, macke: mackeVon(p.macke).id, mackeText: mackeVon(p.macke).text, gehaltJeQuartal: p.gehalt,
        wirkung: r4(hauptwirkung(state, p, state.quartal)), loyalitaet: Math.round(p.loyalitaet), befoerdert: p.befoerdert, kannBefoerdern: kannBefoerdern(p, state.quartal), faelltAus: p.ausfallBis !== undefined && p.ausfallBis >= state.quartal,
      });
      return {
        team: z.team.map(person),
        bewerber: z.bewerber.map((b) => ({ ...person(b), antrittskosten: r0(FUEHRUNG.anwerbePraemie * b.gehalt + (b.abloese ?? 0)), vonKonkurrent: b.herkunft ?? null })),
        abwerbeversuche: z.abwerbung.map((a) => ({ personId: a.personId, konkurrent: a.konkurrent, gehaltsforderung: a.forderung })),
        regeln: 'Je Ressort eine Person. Wirkung = 2 % × Stufe × (1 + 0,15 × Beförderungen) × Macke; Forschung/Marketing ×3, Finanzen ×2. Produktion: Kapazität, Vertrieb: Nachfrage, Forschung: F&E-Wirkung, Marketing: Werbewirkung, Finanzen: Verwaltung und Kreditzinsen. Einstellen: 1 Quartalsgehalt Prämie (+ Ablöse bei Konkurrenz-Leuten), Entlassen: 2 Gehälter Abfindung, Befördern: +25 % Gehalt, +25 Loyalität (alle 4 Quartale, max. 2×). Abwerbeversuch: ohne Gegenangebot geht die Person.',
      };
    })(),
    marktforschungGekauft: (() => {
      const mf = entwurf.marktforschung ?? {};
      return {
        marktberichte: (mf.marktbericht ?? []).map((r) => marktbericht(state, r)),
        branchenanalysen: (mf.branchenanalyse ?? []).map((r) => branchenanalyse(state, r)),
        kundenbefragung: mf.kundenbefragung ? kundenbefragung(state) : null,
        spionage: (mf.spionage ?? []).map((id) => spionageAkte(state, id)),
        hinweis: 'Geschätzte Werte (Rauschen siehe „genauigkeit“), Stand Vorquartal; Spionage = exakte Pläne für das kommende Quartal.',
      };
    })(),
    saison: { naechstesQuartal: SAISON_TEXT[state.quartal % 4], faktor: saison(state.quartal) },
    optionen: {
      einkaufStaffeln: EINKAUF.staffeln.map((x) => ({ abMenge: x.ab, rabatt: x.rabatt })),
      marktforschung: {
        marktbericht: { preisJeRegion: MARKTFORSCHUNG.marktbericht.preis, inhalt: 'Volumen, Ø-Preise, Marktanteile aller Anbieter', genauigkeit: '±15 % Anteile, ±8 % Preise' },
        branchenanalyse: { preisJeRegion: MARKTFORSCHUNG.branchenanalyse.preis, inhalt: 'Preise, Werbung, F&E, Kapazität je Konkurrent', genauigkeit: '±5 % Preise, ±15 % Budgets' },
        kundenbefragung: { preis: MARKTFORSCHUNG.kundenbefragung.preis, inhalt: 'Preis-/Werbe-/Techniksensitivität, eigene Zufriedenheit', genauigkeit: '±20 %' },
        spionage: { preisJeKonkurrent: MARKTFORSCHUNG.spionage.preis, entdeckungsrisiko: r2(spionageRisiko(state)), folgen: 'Strafe 750.000 €, Image −15, Konkurrent senkt 2 Quartale die Preise', konkurrenten: Object.values(state.konkurrenten).filter((k) => k.status === 'aktiv').map((k) => k.id) },
      },
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
      forschung: alleProjekte(state).map((st) => ({
        projekt: st.projekt.id, name: st.projekt.name, ergibtProdukt: st.projekt.produkt, kosten: st.projekt.kosten, investiert: r0(st.investiert),
        quartaleBisher: st.quartale, mindestQuartale: st.projekt.mindestQuartale, voraussetzungen: st.projekt.voraussetzungen, fertig: st.fertig, moeglich: st.offen,
      })),
      featureForschung: alleFeatures(state).map((st) => ({
        projekt: st.projekt.id, name: st.projekt.name, epoche: `${st.projekt.epoche} – ${EPOCHEN[st.projekt.epoche].name}`, beschreibung: st.projekt.beschreibung,
        giltFuer: st.projekt.fuer, wirkung: st.projekt.wirkung, kosten: st.projekt.kosten, investiert: r0(st.investiert),
        quartaleBisher: st.quartale, mindestQuartale: st.projekt.mindestQuartale, voraussetzungen: st.projekt.voraussetzungen, fertig: st.fertig, moeglich: st.offen,
      })),
      marktTrends: Object.fromEntries(PRODUKT_IDS.map((p) => [p, { trend: PRODUKTE[p].lebenszyklus.text, wachstumDiesesQuartal: r4(segmentWachstum(p, state.quartal)), in10Jahren: r2(volumenFaktor(p, 'DE', state.quartal + 40) / volumenFaktor(p, 'DE', state.quartal)) }])),
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
