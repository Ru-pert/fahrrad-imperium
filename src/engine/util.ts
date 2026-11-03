import { BALANCE } from './config/balance';

export const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
export const sum = (xs: Iterable<number>): number => {
  let s = 0;
  for (const x of xs) s += x;
  return s;
};

/** Quartal-Index → „Q1 2027“ */
export function quartalLabel(t: number): string {
  const q = ((t % 4) + 4) % 4;
  return `Q${q + 1} ${BALANCE.startjahr + Math.floor(t / 4)}`;
}

export function saison(t: number): number {
  return BALANCE.saison[((t % 4) + 4) % 4];
}

/** Rundet auf ganze Zahlen (Stückzahlen). */
export const stk = (x: number): number => Math.max(0, Math.round(x));
