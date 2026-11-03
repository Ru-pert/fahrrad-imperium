/** Geseedeter Zufallsgenerator (mulberry32) mit speicherbarem Zustand. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  /** Gleichverteilt in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Gleichverteilt in [a, b). */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  /** Standardnormalverteilt (Box-Muller, verbraucht immer zwei Ziehungen). */
  normal(): number {
    const u1 = Math.max(this.next(), 1e-12);
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  getState(): number {
    return this.s;
  }
  setState(s: number): void {
    this.s = s >>> 0;
  }
  static fromState(s: number): Rng {
    return new Rng(s);
  }
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
