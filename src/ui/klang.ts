/**
 * Dezente Spielklänge, direkt im Browser erzeugt (Web Audio, keine Dateien).
 * Abschaltbar in den Einstellungen (localStorage „fi-ton“).
 */
let ctx: AudioContext | null = null;

export const tonAn = (): boolean => {
  try {
    return localStorage.getItem('fi-ton') !== '0';
  } catch {
    return true;
  }
};

function audio(): AudioContext | null {
  if (!tonAn()) return null;
  try {
    ctx ??= new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Ein Ton mit weicher Hüllkurve */
function ton(a: AudioContext, freq: number, start: number, dauer: number, lautstaerke = 0.12, typ: OscillatorType = 'sine', bis?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = typ;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (bis) o.frequency.exponentialRampToValueAtTime(bis, a.currentTime + start + dauer);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(lautstaerke, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dauer);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dauer + 0.05);
}

export const klang = {
  /** Fahrradklingel: zwei helle Pings */
  klingel() {
    const a = audio();
    if (!a) return;
    for (const t of [0, 0.16]) {
      ton(a, 2350, t, 0.45, 0.07);
      ton(a, 3530, t, 0.3, 0.03);
    }
  },
  /** Kasse: kurzes Klacken und heller Glockenton */
  kasse() {
    const a = audio();
    if (!a) return;
    ton(a, 180, 0, 0.06, 0.08, 'square', 90);
    ton(a, 1568, 0.07, 0.5, 0.07);
    ton(a, 2093, 0.13, 0.6, 0.06);
  },
  /** Plopp für Konfetti und Kaufen */
  plopp() {
    const a = audio();
    if (!a) return;
    ton(a, 700, 0, 0.12, 0.1, 'sine', 180);
  },
  /** Erfolg: kleine Dur-Fanfare */
  erfolg() {
    const a = audio();
    if (!a) return;
    [523, 659, 784, 1047].forEach((f, i) => ton(a, f, i * 0.09, 0.35, 0.07, 'triangle'));
  },
  /** Wisch für Seitenwechsel in Szenen */
  wusch() {
    const a = audio();
    if (!a) return;
    ton(a, 300, 0, 0.25, 0.04, 'sawtooth', 900);
  },
};
