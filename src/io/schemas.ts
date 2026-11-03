/** Zod-Schema für das Entscheidungs-JSON. Fehlende Felder = Wert aus Vorquartal übernehmen. */
import { z } from 'zod';

const zahl = z.number({ error: 'muss eine Zahl sein' }).finite();
const lieferant = z.enum(['billig', 'standard', 'premium'], { error: 'erlaubt: billig, standard, premium' });

export const marktSchema = z.object({ preis: zahl.optional(), marketing: zahl.optional() });
export const produktSchema = z.object({
  produktion: z.record(z.string(), zahl).optional(),
  fe: zahl.optional(),
  maerkte: z.record(z.string(), marktSchema).optional(),
});
export const werkSchema = z.object({
  linienKaufen: z.array(z.object({ typ: z.enum(['A', 'B', 'C'], { error: 'Linientyp muss A, B oder C sein' }), anzahl: zahl })).optional(),
  linienVerkaufen: z.array(z.string()).optional(),
  /** älteres Format: Anzahl neuer Linien vom Typ B */
  neueLinien: zahl.optional(),
  wartung: z.enum(['keiner', 'basis', 'voll'], { error: 'erlaubt: keiner, basis, voll' }).optional(),
  personalAenderung: zahl.optional(),
  schulungProKopf: zahl.optional(),
  halleErweitern: z.boolean().optional(),
});

export const entscheidungsSchema = z.object({
  format: z.string().optional(),
  version: z.number().optional(),
  quartal: z.string().optional(),
  produkte: z.record(z.string(), produktSchema).optional(),
  werke: z.record(z.string(), werkSchema).optional(),
  lieferanten: z.object({ rahmen: lieferant.optional(), akku: lieferant.optional(), antrieb: lieferant.optional() }).optional(),
  nachhaltigkeitsbudget: zahl.optional(),
  finanzen: z
    .object({ darlehenNeu: zahl.optional(), tilgungExtra: zahl.optional(), dividende: zahl.optional() })
    .optional(),
  firmensitz: z.object({ kaufen: z.array(z.string()).optional() }).optional(),
  begruendung: z.string().optional(),
});

export type EntscheidungsEingabe = z.infer<typeof entscheidungsSchema>;

/** Bekannte Schlüssel je Ebene – alles andere wird mit Warnung ignoriert */
export const BEKANNT = {
  oben: ['format', 'version', 'quartal', 'produkte', 'werke', 'lieferanten', 'nachhaltigkeitsbudget', 'finanzen', 'firmensitz', 'begruendung'],
  produkt: ['produktion', 'fe', 'maerkte'],
  markt: ['preis', 'marketing'],
  werk: ['linienKaufen', 'linienVerkaufen', 'neueLinien', 'wartung', 'personalAenderung', 'schulungProKopf', 'halleErweitern'],
  finanzen: ['darlehenNeu', 'tilgungExtra', 'dividende'],
  lieferanten: ['rahmen', 'akku', 'antrieb'],
  firmensitz: ['kaufen'],
};

/** Felder aus der Spezifikation, die es im Spiel noch nicht gibt */
export const SPAETERE_FELDER: Record<string, string> = {
  vertrieb: 'Vertrieb',
  corporateIdentity: 'Corporate Identity',
  einkauf: 'Einkauf mit Mengenstaffeln',
  grossabnehmer: 'Großabnehmer',
  ausschreibungen: 'Ausschreibungen',
  prognose: 'Absatzprognose',
  marktforschung: 'Marktforschung',
  expansion: 'Expansion',
  boerse: 'Börse',
};
