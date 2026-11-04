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
  forschung: Record<string, number>;
  einkauf?: Partial<Record<ProductId, number>>;
  grossabnehmer?: { angebotId: string; menge: number }[];
  ausschreibungen?: { id: string; stueckpreis: number }[];
  marktforschung?: { marktbericht?: RegionId[]; branchenanalyse?: RegionId[]; kundenbefragung?: boolean; spionage?: string[] };
  rettung?: 'annehmen' | 'ablehnen';
  boerse?: Decisions['boerse'];
  uebernahme?: string;
  markeZukaufen?: RegionId[];
  krise?: string;
  fuehrung?: Decisions['fuehrung'];
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
    forschung: Object.fromEntries(Object.entries(d.forschung ?? {}).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => [k, Math.round(v ?? 0)])),
    ...(Object.values(d.einkauf ?? {}).some((v) => (v ?? 0) > 0) ? { einkauf: Object.fromEntries(Object.entries(d.einkauf ?? {}).filter(([, v]) => (v ?? 0) > 0)) } : {}),
    ...(d.grossabnehmer?.length ? { grossabnehmer: d.grossabnehmer.map((g) => ({ ...g })) } : {}),
    ...(d.ausschreibungen?.length ? { ausschreibungen: d.ausschreibungen.map((g) => ({ ...g })) } : {}),
    ...(d.marktforschung && Object.values(d.marktforschung).some((v) => (Array.isArray(v) ? v.length > 0 : !!v)) ? { marktforschung: structuredClone(d.marktforschung) } : {}),
    ...(d.rettung ? { rettung: d.rettung } : {}),
    ...(d.boerse && Object.keys(d.boerse).length ? { boerse: structuredClone(d.boerse) } : {}),
    ...(d.uebernahme ? { uebernahme: d.uebernahme } : {}),
    ...(d.markeZukaufen?.length ? { markeZukaufen: [...d.markeZukaufen] } : {}),
    ...(d.krise ? { krise: d.krise } : {}),
    ...(d.fuehrung && Object.values(d.fuehrung).some((v) => (v?.length ?? 0) > 0) ? { fuehrung: structuredClone(d.fuehrung) } : {}),
    ...(begruendung ? { begruendung } : {}),
  };
}
