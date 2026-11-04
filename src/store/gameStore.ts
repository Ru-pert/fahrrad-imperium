import { klang } from '../ui/klang';
import { trageInBestenlisteEin } from './bestenliste';
import { create } from 'zustand';
import {
  neuesSpiel,
  simulateQuarter,
  standardEntscheidungen,
  type Decisions,
  type GameState,
  type NeuesSpielOptionen,
  type QuarterReport,
  type RegionId,
} from '../engine';
import { istSpielstand, laden, speichern, type HistorieEintrag, type Spielstand } from './saveSlots';

export type Seite = 'cockpit' | 'zeitung' | 'bericht' | 'entscheidungen' | 'markt' | 'expansion' | 'finanzen' | 'werke' | 'garage' | 'marktforschung' | 'boerse' | 'firmensitz' | 'erfolge' | 'austausch' | 'einstellungen';
export const SEITEN: Seite[] = ['cockpit', 'zeitung', 'bericht', 'entscheidungen', 'markt', 'expansion', 'finanzen', 'werke', 'garage', 'marktforschung', 'boerse', 'firmensitz', 'erfolge', 'austausch', 'einstellungen'];

interface Hinweis {
  id: number;
  text: string;
}

interface Store {
  bereit: boolean;
  state: GameState | null;
  historie: HistorieEintrag[];
  entwurf: Decisions | null;
  seite: Seite;
  hinweise: Hinweis[];
  dunkel: boolean;
  reduziert: boolean;
  /** Aktueller Schritt der Einführung (null = aus) */
  tutorialSchritt: number | null;
  starteTutorial: () => void;
  setzeTutorial: (n: number | null) => void;
  /** Endabrechnung, die gerade gezeigt wird */
  endabrechnung: import('../engine/spielziel').Wertung | null;
  zeigeEndabrechnung: (w: import('../engine/spielziel').Wertung | null) => void;
  weiterspielen: () => void;
  /** Region, die die Markt-Seite beim Öffnen zeigt */
  marktRegion: RegionId | null;
  zeigeMarkt: (r: RegionId) => void;
  /** Bericht, der nach Quartalsabschluss gerade präsentiert wird */
  frischerBericht: QuarterReport | null;
  /** true direkt nach dem Abschluss (mit Rechen-Animation) */
  auswertungFrisch: boolean;

  start: () => Promise<void>;
  neu: (opt: NeuesSpielOptionen) => void;
  gehe: (s: Seite) => void;
  aendereEntwurf: (fn: (d: Decisions) => void) => void;
  entwurfZuruecksetzen: () => void;
  abschliessen: () => QuarterReport | null;
  frischerBerichtSchliessen: () => void;
  zeigeAuswertung: (r: QuarterReport) => void;
  speicherstand: (name: string) => Spielstand | null;
  stand: () => Spielstand | null;
  speichereSlot: (slot: number | 'auto', name: string) => Promise<void>;
  ladeSlot: (slot: number | 'auto') => Promise<boolean>;
  ladeStand: (s: unknown) => boolean;
  zurueckspringen: (index: number) => void;
  setDunkel: (d: boolean) => void;
  setReduziert: (r: boolean) => void;
  hinweis: (text: string) => void;
}

let hinweisId = 0;
const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignorieren */
  }
};

function seiteAusHash(): Seite {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  return (SEITEN as string[]).includes(h) ? (h as Seite) : 'cockpit';
}

export const useGame = create<Store>((set, get) => ({
  bereit: false,
  state: null,
  historie: [],
  entwurf: null,
  seite: seiteAusHash(),
  hinweise: [],
  dunkel: document.documentElement.classList.contains('dark'),
  reduziert: lsGet('fi-reduced') === '1',
  marktRegion: null,
  endabrechnung: null,
  tutorialSchritt: null,
  starteTutorial() {
    set({ tutorialSchritt: 0 });
  },
  setzeTutorial(n) {
    if (n === null) {
      try {
        localStorage.setItem('fi-tutorial-fertig', '1');
      } catch {
        /* egal */
      }
    }
    set({ tutorialSchritt: n });
  },
  zeigeEndabrechnung(w) {
    set({ endabrechnung: w });
  },
  weiterspielen() {
    const { state } = get();
    if (!state) return;
    set({ state: { ...state, endlos: true }, endabrechnung: null });
    void get().speichereSlot('auto', 'Autosave');
  },
  zeigeMarkt(r) {
    set({ marktRegion: r });
    get().gehe('markt');
  },
  frischerBericht: null,
  auswertungFrisch: false,

  async start() {
    window.addEventListener('hashchange', () => set({ seite: seiteAusHash() }));
    if (lsGet('fi-reduced') === '1') document.documentElement.classList.add('reduce-motion');
    try {
      const auto = await laden('auto');
      if (auto && istSpielstand(auto)) {
        set({ state: auto.state, historie: auto.historie, entwurf: auto.entwurf });
      }
    } catch {
      /* kein Autosave */
    }
    set({ bereit: true });
  },

  neu(opt) {
    const state = neuesSpiel(opt);
    const entwurf = standardEntscheidungen(state);
    set({ state, historie: [], entwurf, frischerBericht: null, seite: 'cockpit' });
    window.location.hash = '#/cockpit';
    void get().speichereSlot('auto', 'Autosave');
  },

  gehe(s) {
    window.location.hash = `#/${s}`;
    set({ seite: s });
    window.scrollTo?.({ top: 0 });
  },

  aendereEntwurf(fn) {
    const { entwurf } = get();
    if (!entwurf) return;
    const kopie = structuredClone(entwurf);
    fn(kopie);
    set({ entwurf: kopie });
  },

  entwurfZuruecksetzen() {
    const { state, entwurf } = get();
    if (!state) return;
    const neu = standardEntscheidungen(state);
    // Bereits gekaufte Marktforschung bleibt gekauft
    if (entwurf?.marktforschung) neu.marktforschung = entwurf.marktforschung;
    set({ entwurf: neu });
  },

  abschliessen() {
    const { state, entwurf, historie } = get();
    if (!state || !entwurf || state.spielende) return null;
    const vorher = historie.length ? historie[historie.length - 1].report : null;
    const { nextState, report } = simulateQuarter(state, entwurf, undefined, { vorherBericht: vorher });
    klang.klingel();
    const eintrag: HistorieEintrag = { stateVor: state, decisions: entwurf, report };
    const neueHistorie = [...historie, eintrag];
    set({
      state: nextState,
      historie: neueHistorie,
      entwurf: standardEntscheidungen(nextState),
      frischerBericht: report,
      auswertungFrisch: true,
      endabrechnung: report.endwertung ?? null,
    });
    if (report.endwertung) trageInBestenlisteEin(nextState, report.endwertung);
    void get().speichereSlot('auto', 'Autosave');
    return report;
  },

  frischerBerichtSchliessen() {
    set({ frischerBericht: null });
  },

  zeigeAuswertung(r) {
    set({ frischerBericht: r, auswertungFrisch: false });
  },

  stand() {
    return get().speicherstand('Spielstand');
  },

  speicherstand(name) {
    const { state, historie, entwurf } = get();
    if (!state || !entwurf) return null;
    return { format: 'fahrrad-imperium/spielstand', version: 1, name, gespeichert: new Date().toISOString(), state, historie, entwurf };
  },

  async speichereSlot(slot, name) {
    const s = get().speicherstand(name);
    if (!s) return;
    try {
      await speichern(slot, s);
      if (slot !== 'auto') get().hinweis(`Gespeichert: ${name}`);
    } catch {
      get().hinweis('Speichern fehlgeschlagen (Browser-Speicher nicht verfügbar).');
    }
  },

  async ladeSlot(slot) {
    const s = await laden(slot);
    if (!s || !istSpielstand(s)) return false;
    return get().ladeStand(s);
  },

  ladeStand(x) {
    if (!istSpielstand(x)) {
      get().hinweis('Datei ist kein gültiger Spielstand.');
      return false;
    }
    set({ state: x.state, historie: x.historie, entwurf: x.entwurf, frischerBericht: null });
    get().hinweis('Spielstand geladen.');
    return true;
  },

  zurueckspringen(index) {
    const { historie } = get();
    const h = historie[index];
    if (!h) return;
    set({ state: h.stateVor, historie: historie.slice(0, index), entwurf: structuredClone(h.decisions), frischerBericht: null });
    get().hinweis(`Zurückgesprungen – neuer Zweig ab Quartal ${index + 1}.`);
    void get().speichereSlot('auto', 'Autosave');
  },

  setDunkel(d) {
    document.documentElement.classList.toggle('dark', d);
    lsSet('fi-theme', d ? 'dark' : 'light');
    set({ dunkel: d });
  },

  setReduziert(r) {
    document.documentElement.classList.toggle('reduce-motion', r);
    lsSet('fi-reduced', r ? '1' : '0');
    set({ reduziert: r });
  },

  hinweis(text) {
    const id = ++hinweisId;
    set((st) => ({ hinweise: [...st.hinweise, { id, text }] }));
    setTimeout(() => set((st) => ({ hinweise: st.hinweise.filter((h) => h.id !== id) })), 3500);
  },
}));
