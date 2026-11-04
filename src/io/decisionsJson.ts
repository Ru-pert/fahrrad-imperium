/** Umwandlung zwischen internen Entscheidungen und dem Entscheidungs-JSON (Abschnitt 15). */
import { quartalLabel, type Decisions, type Komponente, type LinienTyp, type ProductId, type RegionId, type SupplierLevel, type Wartung } from '../engine';

export const ENTSCHEIDUNGS_FORMAT = 'fahrrad-imperium/entscheidungen';

export interface EntscheidungsJson {
  format: typeof ENTSCHEIDUNGS_FORMAT;
  version: 1;
  quartal: string;
  produkte: Partial<Record<ProductId, { produktion?: Record<string, number>; fe?: number; maerkte?: Partial<Record<RegionId, { preis?: number; marketing?: number }>> }>>;
  werke: Record<string, { linienKaufen?: { typ: LinienTyp; anzahl: number }[]; linienVerkaufen?: string[]; wartung?: Wartung; personalAenderung?: number; schulungProKopf?: number; halleErweitern?: boolean }>;
  lieferanten: Partial<Record<Komponente, SupplierLevel>>;
  nachhaltigkeitsbudget: number;
  finanzen: { darlehenNeu: number; tilgungExtra: number; dividende: number };
  firmensitz: { kaufen: string[] };
  expansion: { maerkteBetreten: RegionId[]; produkteEinfuehren: ProductId[]; werkeBauen: string[] };
  begruendung?: string;
}

export function entscheidungenAlsJson(d: Decisions, begruendung?: string): EntscheidungsJson {
  const produkte: EntscheidungsJson['produkte'] = {};
  const ids = new Set<ProductId>([...Object.keys(d.preis), ...Object.keys(d.produktion), ...Object.keys(d.fe)] as ProductId[]);
  for (const p of ids) {
    const maerkte: Partial<Record<RegionId, { preis?: number; marketing?: number }>> = {};
    for (const r of Object.keys(d.preis[p] ?? {}) as RegionId[]) {
      maerkte[r] = { preis: Math.round(d.preis[p]?.[r] ?? 0), marketing: Math.round(d.marketing[p]?.[r] ?? 0) };
    }
    produkte[p] = { produktion: { ...(d.produktion[p] ?? {}) }, fe: Math.round(d.fe[p] ?? 0), maerkte };
  }
  const werke: EntscheidungsJson['werke'] = {};
  for (const [id, w] of Object.entries(d.werke)) {
    werke[id] = {
      linienKaufen: w.linienKaufen,
      linienVerkaufen: w.linienVerkaufen,
      wartung: w.wartung,
      personalAenderung: w.personalAenderung,
      schulungProKopf: w.schulungProKopf,
      halleErweitern: !!w.halleErweitern,
    };
  }
  return {
    format: ENTSCHEIDUNGS_FORMAT,
    version: 1,
    quartal: quartalLabel(d.quartal),
    produkte,
    werke,
    lieferanten: { ...d.lieferanten },
    nachhaltigkeitsbudget: Math.round(d.nachhaltigkeitsbudget),
    finanzen: { ...d.finanzen },
    firmensitz: { kaufen: [...d.firmensitz.kaufen] },
    expansion: { maerkteBetreten: [...(d.expansion?.maerkteBetreten ?? [])], produkteEinfuehren: [...(d.expansion?.produkteEinfuehren ?? [])], werkeBauen: [...(d.expansion?.werkeBauen ?? [])] },
    ...(begruendung ? { begruendung } : {}),
  };
}
