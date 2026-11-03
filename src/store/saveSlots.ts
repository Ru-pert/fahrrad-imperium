import { get, set, del } from 'idb-keyval';
import type { Decisions, GameState, QuarterReport } from '../engine';

export interface HistorieEintrag {
  /** Zustand zu Beginn des Quartals */
  stateVor: GameState;
  decisions: Decisions;
  report: QuarterReport;
}

export interface Spielstand {
  format: 'fahrrad-imperium/spielstand';
  version: 1;
  name: string;
  gespeichert: string;
  state: GameState;
  historie: HistorieEintrag[];
  entwurf: Decisions;
}

export const SLOT_ANZAHL = 10;
const key = (slot: number | 'auto') => `fi-save-${slot}`;

export interface SlotInfo {
  slot: number | 'auto';
  belegt: boolean;
  name?: string;
  gespeichert?: string;
  quartal?: number;
  firma?: string;
}

export async function speichern(slot: number | 'auto', stand: Spielstand): Promise<void> {
  await set(key(slot), stand);
}
export async function laden(slot: number | 'auto'): Promise<Spielstand | undefined> {
  return get<Spielstand>(key(slot));
}
export async function loeschen(slot: number | 'auto'): Promise<void> {
  await del(key(slot));
}
export async function slotListe(): Promise<SlotInfo[]> {
  const out: SlotInfo[] = [];
  const slots: (number | 'auto')[] = ['auto', ...Array.from({ length: SLOT_ANZAHL }, (_, i) => i + 1)];
  for (const slot of slots) {
    try {
      const s = await laden(slot);
      out.push(s ? { slot, belegt: true, name: s.name, gespeichert: s.gespeichert, quartal: s.state.quartal, firma: s.state.unternehmen.name } : { slot, belegt: false });
    } catch {
      out.push({ slot, belegt: false });
    }
  }
  return out;
}

export function istSpielstand(x: unknown): x is Spielstand {
  const o = x as Spielstand;
  return !!o && o.format === 'fahrrad-imperium/spielstand' && !!o.state && Array.isArray(o.historie) && !!o.entwurf;
}
