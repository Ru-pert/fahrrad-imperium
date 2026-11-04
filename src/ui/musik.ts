/**
 * Generative Hintergrundmusik (Web Audio, keine Dateien): Akkordfolgen, Bass, Flächen und Arpeggios,
 * passend zur Lage des Unternehmens. Abschaltbar, standardmäßig aus (localStorage „fi-musik“).
 */
export type Stimmung = 'ruhig' | 'boom' | 'krise' | 'endspurt';

interface StimmungDef {
  tempo: number;
  /** Akkorde als Halbtonabstände zum Grundton (Wurzel, Terz, Quinte, ggf. Septime) */
  akkorde: number[][];
  grundton: number;
  arpeggio: number[];
  welle: OscillatorType;
  schlag: boolean;
  lautstaerke: number;
}

const DUR = [0, 4, 7];
const MOLL = [0, 3, 7];
const add = (a: number[], x: number) => a.map((n) => n + x);

export const STIMMUNGEN: Record<Stimmung, StimmungDef & { name: string }> = {
  // C – G – Am – F: freundlich, entspannt
  ruhig: { name: 'Gelassen', tempo: 88, grundton: 48, akkorde: [DUR, add(DUR, 7), add(MOLL, 9), add(DUR, 5)], arpeggio: [0, 1, 2, 1], welle: 'triangle', schlag: false, lautstaerke: 0.5 },
  // D – A – Bm – G, schneller und mit leichtem Beat
  boom: { name: 'Aufbruch', tempo: 112, grundton: 50, akkorde: [[0, 4, 7, 11], add(DUR, 7), add(MOLL, 9), add([0, 4, 7, 11], 5)], arpeggio: [0, 1, 2, 3, 2, 1], welle: 'triangle', schlag: true, lautstaerke: 0.55 },
  // Am – F – C – E: nachdenklich, langsam
  krise: { name: 'Gegenwind', tempo: 70, grundton: 45, akkorde: [MOLL, add(DUR, 8), add(DUR, 3), add(DUR, 7)], arpeggio: [0, 2, 1], welle: 'sine', schlag: false, lautstaerke: 0.45 },
  // Em – C – G – D: treibend fürs Finale
  endspurt: { name: 'Endspurt', tempo: 124, grundton: 52, akkorde: [MOLL, add(DUR, 8), add(DUR, 3), add(DUR, 10)], arpeggio: [0, 1, 2, 1, 2, 1, 0, 2], welle: 'sawtooth', schlag: true, lautstaerke: 0.4 },
};

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export const musikAn = (): boolean => {
  try {
    return localStorage.getItem('fi-musik') === '1';
  } catch {
    return false;
  }
};

class Musik {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private timer: number | null = null;
  private naechsterTakt = 0;
  private takt = 0;
  stimmung: Stimmung = 'ruhig';
  laeuft = false;

  private init(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2400;
      this.master.connect(this.filter).connect(this.ctx.destination);
      return this.ctx;
    } catch {
      return null;
    }
  }

  start() {
    const a = this.init();
    if (!a || !this.master) return;
    if (a.state === 'suspended') void a.resume();
    if (this.laeuft) return;
    this.laeuft = true;
    this.naechsterTakt = a.currentTime + 0.1;
    this.master.gain.cancelScheduledValues(a.currentTime);
    this.master.gain.setTargetAtTime(0.16 * STIMMUNGEN[this.stimmung].lautstaerke, a.currentTime, 1.2);
    this.timer = window.setInterval(() => this.planen(), 200);
  }

  stop() {
    if (!this.ctx || !this.master) return;
    this.laeuft = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  setzeStimmung(s: Stimmung) {
    if (s === this.stimmung) return;
    this.stimmung = s;
    if (this.ctx && this.master && this.laeuft) {
      // Sanfter Übergang: kurz leiser, dann neue Lautstärke
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(0.03, t, 0.5);
      this.master.gain.setTargetAtTime(0.16 * STIMMUNGEN[s].lautstaerke, t + 1.5, 1);
      this.filter?.frequency.setTargetAtTime(s === 'krise' ? 1200 : 2400, t, 1);
    }
  }

  /** Plant die Takte etwas im Voraus (Look-ahead) */
  private planen() {
    const a = this.ctx;
    if (!a || !this.laeuft) return;
    while (this.naechsterTakt < a.currentTime + 0.6) {
      this.spieleTakt(this.naechsterTakt);
      const d = STIMMUNGEN[this.stimmung];
      this.naechsterTakt += (60 / d.tempo) * 4;
      this.takt++;
    }
  }

  private ton(start: number, f: number, dauer: number, laut: number, typ: OscillatorType, angriff = 0.02) {
    const a = this.ctx!;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = typ;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(laut, start + angriff);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    o.connect(g).connect(this.master!);
    o.start(start);
    o.stop(start + dauer + 0.05);
  }

  private klopfen(start: number, laut: number) {
    const a = this.ctx!;
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.setValueAtTime(140, start);
    o.frequency.exponentialRampToValueAtTime(45, start + 0.12);
    g.gain.setValueAtTime(laut, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
    o.connect(g).connect(this.master!);
    o.start(start);
    o.stop(start + 0.2);
  }

  private spieleTakt(t0: number) {
    const d = STIMMUNGEN[this.stimmung];
    const schlag = 60 / d.tempo;
    const akkord = d.akkorde[this.takt % d.akkorde.length];
    const g = d.grundton;
    // Fläche (Pad)
    for (const n of akkord.slice(0, 3)) this.ton(t0, freq(g + 12 + n), schlag * 4.2, 0.05, 'sine', 0.4);
    // Bass auf 1 und 3
    this.ton(t0, freq(g - 12 + akkord[0]), schlag * 1.8, 0.16, 'triangle');
    this.ton(t0 + schlag * 2, freq(g - 12 + akkord[0] + (this.takt % 2 ? 7 : 0)), schlag * 1.8, 0.12, 'triangle');
    // Arpeggio in Achteln
    const n = d.arpeggio.length;
    const schritt = (schlag * 4) / Math.max(4, n);
    d.arpeggio.forEach((idx, i) => {
      const ton = akkord[idx % akkord.length] + 24 + (i >= n / 2 && this.takt % 4 === 3 ? 12 : 0);
      this.ton(t0 + i * schritt, freq(g + ton), schritt * 1.6, d.welle === 'sawtooth' ? 0.025 : 0.045, d.welle);
    });
    // Leichter Puls
    if (d.schlag) for (let i = 0; i < 4; i++) this.klopfen(t0 + i * schlag, i % 2 ? 0.08 : 0.14);
    // Kleine Glocke alle vier Takte
    if (this.takt % 4 === 0) this.ton(t0 + schlag * 3.5, freq(g + 36 + akkord[2]), 1.4, 0.025, 'sine');
  }
}

export const musik = new Musik();
