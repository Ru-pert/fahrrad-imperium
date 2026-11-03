import { useEffect, useState } from 'react';
import {
  PRODUKTE,
  Rng,
  aktiveProdukte,
  simulateQuarter,
  standardEntscheidungen,
  type Decisions,
  type GameState,
  type ProductId,
} from '../engine';

/** Ergebnis einer Hebel-Probe: Unterschiede gegenüber den aktuellen Entscheidungen */
export interface HebelWirkung {
  id: string;
  gruppe: 'preis' | 'produktion' | 'marketing' | 'fe' | 'personal';
  produkt?: ProductId;
  label: string;
  /** Veränderung des Absatzes im aktuellen Quartal (Stück) */
  absatz: number;
  /** EBIT-Veränderung im aktuellen Quartal */
  ebitJetzt: number;
  /** EBIT-Veränderung im Folgequartal (Spätwirkung: Marke, Technik, Lager, Personal) */
  ebitNaechstes: number;
}

const OPTS = { konkurrenzModus: 'wiederholung' as const, zufall: false };

/** Simuliert das aktuelle und das folgende Quartal mit gleichbleibenden Entscheidungen. */
function zweiQuartale(state: GameState, d: Decisions) {
  const a = simulateQuarter(state, d, new Rng(1), OPTS);
  const folge = standardEntscheidungen(a.nextState);
  // gleiche laufende Werte, aber keine einmaligen Aktionen wiederholen
  folge.preis = structuredClone(d.preis);
  folge.marketing = structuredClone(d.marketing);
  folge.fe = structuredClone(d.fe);
  folge.produktion = structuredClone(d.produktion);
  const b = simulateQuarter(a.nextState, folge, new Rng(1), OPTS);
  return { jetzt: a.report, naechstes: b.report };
}

export function berechneHebel(state: GameState, basis: Decisions): HebelWirkung[] {
  const ref = zweiQuartale(state, basis);
  const absatz = (r: typeof ref.jetzt, p?: ProductId) => r.produkte.filter((x) => !p || x.produkt === p).reduce((s, x) => s + x.absatz, 0);
  const out: HebelWirkung[] = [];
  const probe = (h: Omit<HebelWirkung, 'absatz' | 'ebitJetzt' | 'ebitNaechstes'>, fn: (d: Decisions) => void) => {
    const d = structuredClone(basis);
    fn(d);
    const r = zweiQuartale(state, d);
    out.push({
      ...h,
      absatz: absatz(r.jetzt, h.produkt) - absatz(ref.jetzt, h.produkt),
      ebitJetzt: r.jetzt.guv.ebit - ref.jetzt.guv.ebit,
      ebitNaechstes: r.naechstes.guv.ebit - ref.naechstes.guv.ebit,
    });
  };
  const werk = state.werke[0];
  for (const p of aktiveProdukte(state)) {
    const n = PRODUKTE[p].name;
    probe({ id: `preis-${p}`, gruppe: 'preis', produkt: p, label: `${n}: Preis −5 %` }, (d) => {
      d.preis[p] = { DE: (d.preis[p]?.DE ?? 0) * 0.95 };
    });
    probe({ id: `preis+${p}`, gruppe: 'preis', produkt: p, label: `${n}: Preis +5 %` }, (d) => {
      d.preis[p] = { DE: (d.preis[p]?.DE ?? 0) * 1.05 };
    });
    if (werk) {
      probe({ id: `prod-${p}`, gruppe: 'produktion', produkt: p, label: `${n}: +100 Stück produzieren` }, (d) => {
        d.produktion[p] = { ...d.produktion[p], [werk.id]: (d.produktion[p]?.[werk.id] ?? 0) + 100 };
      });
    }
    probe({ id: `mkt-${p}`, gruppe: 'marketing', produkt: p, label: `${n}: +10.000 € Marketing` }, (d) => {
      d.marketing[p] = { DE: (d.marketing[p]?.DE ?? 0) + 10_000 };
    });
    probe({ id: `fe-${p}`, gruppe: 'fe', produkt: p, label: `${n}: +10.000 € F&E` }, (d) => {
      d.fe[p] = (d.fe[p] ?? 0) + 10_000;
    });
  }
  if (werk) {
    probe({ id: 'personal', gruppe: 'personal', label: '+2 Mitarbeitende einstellen' }, (d) => {
      d.werke[werk.id].personalAenderung = (d.werke[werk.id].personalAenderung ?? 0) + 2;
    });
  }
  return out;
}

/** Berechnet die Hebelwirkungen verzögert (nicht bei jedem Reglerschritt). */
export function useHebel(state: GameState | null, entwurf: Decisions | null): HebelWirkung[] | null {
  const [wert, setWert] = useState<HebelWirkung[] | null>(null);
  useEffect(() => {
    if (!state || !entwurf) return;
    const t = setTimeout(() => {
      try {
        setWert(berechneHebel(state, entwurf));
      } catch (e) {
        console.error(e);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [state, entwurf]);
  return wert;
}
