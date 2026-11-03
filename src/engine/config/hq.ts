export interface HqStufe {
  id: string;
  name: string;
  kosten: number;
  imageBonus: number;
  optik: string;
}

export const HQ_STUFEN: HqStufe[] = [
  { id: 'garage', name: 'Garage', kosten: 0, imageBonus: 0, optik: 'Garage mit Werkbank und Kaffeemaschine' },
  { id: 'hinterhofbuero', name: 'Hinterhofbüro', kosten: 50_000, imageBonus: 0.5, optik: 'Büro über der Werkstatt, Firmenschild' },
  { id: 'bueroHaus', name: 'Bürohaus', kosten: 500_000, imageBonus: 1, optik: 'Zweistöckiges Gebäude mit Logo' },
  { id: 'villa', name: 'Villa mit Park', kosten: 3_000_000, imageBonus: 2, optik: 'Gründerzeitvilla, Kiesweg' },
  { id: 'glaspalast', name: 'Glaspalast', kosten: 25_000_000, imageBonus: 3, optik: 'Glasfassade, Vorplatz mit Fahnen' },
  { id: 'campus', name: 'Campus', kosten: 150_000_000, imageBonus: 4, optik: 'Mehrere Gebäude, Teich, Rooftop-Garten' },
  { id: 'wolkenkratzer', name: 'Wolkenkratzer', kosten: 1_000_000_000, imageBonus: 5, optik: 'Turm mit Heliport und Leuchtschrift' },
];

export const HQ_EXTRAS: { id: string; name: string; kosten: number }[] = [
  { id: 'brunnen', name: 'Brunnen', kosten: 20_000 },
  { id: 'espressobar', name: 'Espressobar', kosten: 50_000 },
  { id: 'parkhaus', name: 'Fahrradparkhaus', kosten: 400_000 },
  { id: 'teststrecke', name: 'Teststrecke', kosten: 2_000_000 },
  { id: 'statue', name: 'Goldene Gründerstatue', kosten: 5_000_000 },
  { id: 'hubschrauber', name: 'Hubschrauber', kosten: 30_000_000 },
  { id: 'museum', name: 'Fahrradmuseum', kosten: 50_000_000 },
];

/** Extras geben zusammen höchstens diesen Image-Bonus. */
export const HQ_EXTRAS_MAX_BONUS = 2;
