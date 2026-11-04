/** Bestenliste abgeschlossener Spiele (nur in diesem Browser) */
import type { GameState } from '../engine';
import type { Wertung } from '../engine/spielziel';

export interface BestenlistenEintrag {
  firma: string;
  farbe: string;
  punkte: number;
  stufe: string;
  pleite: boolean;
  datum: string;
  schwierigkeit: string;
  seed: number;
}

const SCHLUESSEL = 'fi-bestenliste';

export function ladeBestenliste(): BestenlistenEintrag[] {
  try {
    const v = localStorage.getItem(SCHLUESSEL);
    return v ? (JSON.parse(v) as BestenlistenEintrag[]) : [];
  } catch {
    return [];
  }
}

export function trageInBestenlisteEin(s: GameState, w: Wertung): void {
  const liste = ladeBestenliste();
  // Ein Spiel (gleicher Seed und Name) nur einmal eintragen
  if (liste.some((e) => e.seed === s.einstellungen.seed && e.firma === s.unternehmen.name && e.punkte === w.punkte)) return;
  liste.push({ firma: s.unternehmen.name, farbe: s.unternehmen.farbe, punkte: w.punkte, stufe: w.stufe, pleite: w.pleite, datum: new Date().toISOString(), schwierigkeit: s.einstellungen.schwierigkeit, seed: s.einstellungen.seed });
  liste.sort((a, b) => b.punkte - a.punkte);
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(liste.slice(0, 20)));
  } catch {
    /* egal */
  }
}
