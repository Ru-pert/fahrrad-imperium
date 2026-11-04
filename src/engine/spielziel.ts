/** Spielziel: Endabrechnung nach 15 Jahren mit Punkten und Rangstufe. */
import { SPIELZIEL } from './config/spielziel';
import { REGION_IDS } from './config/markets';
import type { GameState } from './types';

export interface WertungBaustein {
  id: 'wert' | 'rang' | 'maerkte' | 'erfolge' | 'image';
  name: string;
  punkte: number;
  max: number;
  text: string;
}

export interface Wertung {
  quartal: number;
  punkte: number;
  stufe: string;
  stufenText: string;
  naechsteStufe?: { name: string; ab: number };
  bausteine: WertungBaustein[];
  pleite: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Wertung des aktuellen Stands (auch zwischendurch als Prognose nutzbar) */
export function wertung(s: GameState): Wertung {
  const P = SPIELZIEL.punkte;
  const k = s.kpiHistorie[s.kpiHistorie.length - 1];
  const eigenerWert = Math.max(0, (k?.unternehmenswert ?? 0) * (1 - (s.finanzen.investorAnteil ?? 0)));
  const wertPunkte = eigenerWert > P.wertVon ? P.wertMax * clamp01(Math.log10(eigenerWert / P.wertVon) / Math.log10(P.wertBis / P.wertVon)) : 0;
  const rang = k?.weltrang ?? 8;
  const rangPunkte = P.rang[Math.min(P.rang.length - 1, Math.max(0, rang - 1))];
  const regionen = REGION_IDS.filter((r) => s.regionen[r]?.aktiv).length;
  const erfolge = (s.erfolge ?? []).length;
  const imageWert = (s.unternehmen.image + s.unternehmen.nachhaltigkeit) / 2;
  const fmtMio = (x: number) => (x >= 1e9 ? `${(x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mrd. €` : `${(x / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`);
  const bausteine: WertungBaustein[] = [
    { id: 'wert', name: 'Unternehmenswert', punkte: wertPunkte, max: P.wertMax, text: `${fmtMio(eigenerWert)} (dein Anteil)` },
    { id: 'rang', name: 'Weltrangliste', punkte: rangPunkte, max: P.rang[0], text: `Platz ${rang} nach Quartalsumsatz` },
    { id: 'maerkte', name: 'Märkte', punkte: regionen * P.region, max: REGION_IDS.length * P.region, text: `${regionen} von ${REGION_IDS.length} Regionen` },
    { id: 'erfolge', name: 'Erfolge', punkte: Math.min(100, erfolge * P.erfolg), max: 100, text: `${erfolge} Abzeichen` },
    { id: 'image', name: 'Image & Nachhaltigkeit', punkte: P.imageMax * clamp01(imageWert / 100), max: P.imageMax, text: `Ø ${Math.round(imageWert)} von 100` },
  ];
  const pleite = !!s.spielende;
  let punkte = bausteine.reduce((a, b) => a + b.punkte, 0);
  if (pleite) punkte *= P.pleiteFaktor;
  punkte = Math.round(punkte);
  const stufen = SPIELZIEL.stufen;
  const idx = stufen.reduce((best, x, i) => (punkte >= x.ab ? i : best), 0);
  const naechste = stufen[idx + 1];
  return {
    quartal: s.quartal - 1,
    punkte,
    stufe: pleite ? 'Pleitier' : stufen[idx].name,
    stufenText: pleite ? 'Das Abenteuer endete in der Insolvenz – aber jede Garage ist ein Neuanfang.' : stufen[idx].text,
    naechsteStufe: !pleite && naechste ? { name: naechste.name, ab: naechste.ab } : undefined,
    bausteine,
    pleite,
  };
}

/** Quartale bis zur Endabrechnung (0 = sie steht an) */
export const restQuartaleBisZiel = (s: GameState): number => Math.max(0, SPIELZIEL.quartale - s.quartal);
