import { useEffect, useMemo, useRef, useState } from 'react';
import { PRODUKTE, quartalLabel, type Zeitung as ZeitungTyp } from '../../engine';
import { erzeugeStartZeitung } from '../../engine/zeitung';
import { zeitungAlsText } from '../../io/newspaperText';
import { useGame } from '../../store/gameStore';
import { eurKompakt, fmt0, pct } from '../format';
import { BikeIcon } from '../components/BikeIcon';

const papier = 'bg-[#fbf7ee] text-[#1c1917] dark:bg-[#1f1c17] dark:text-[#f1ece2]';
const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };

function Vorlesen({ text }: { text: string }) {
  const [status, setStatus] = useState<'aus' | 'laeuft' | 'pause'>('aus');
  const [stimmen, setStimmen] = useState<SpeechSynthesisVoice[]>([]);
  const [stimme, setStimme] = useState('');
  const [tempo, setTempo] = useState(1);
  const verfuegbar = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!verfuegbar) return;
    const laden = () => {
      const v = window.speechSynthesis.getVoices().filter((x) => x.lang.toLowerCase().startsWith('de'));
      setStimmen(v);
      if (v.length && !stimme) setStimme(v[0].name);
    };
    laden();
    window.speechSynthesis.addEventListener('voiceschanged', laden);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', laden);
      window.speechSynthesis.cancel();
    };
  }, [verfuegbar, stimme]);

  if (!verfuegbar) return <span className="muted text-xs">Vorlesen wird von diesem Browser nicht unterstützt.</span>;

  const start = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = tempo;
    const v = stimmen.find((x) => x.name === stimme);
    if (v) u.voice = v;
    u.onend = () => setStatus('aus');
    window.speechSynthesis.speak(u);
    setStatus('laeuft');
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'aus' && <button className="btn-ghost" onClick={start}>▶ Vorlesen</button>}
      {status === 'laeuft' && <button className="btn-ghost" onClick={() => { window.speechSynthesis.pause(); setStatus('pause'); }}>❚❚ Pause</button>}
      {status === 'pause' && <button className="btn-ghost" onClick={() => { window.speechSynthesis.resume(); setStatus('laeuft'); }}>▶ Weiter</button>}
      {status !== 'aus' && <button className="btn-ghost" onClick={() => { window.speechSynthesis.cancel(); setStatus('aus'); }}>■ Stopp</button>}
      {stimmen.length > 1 && (
        <select className="h-11 rounded-xl border border-[var(--line)] bg-transparent px-2 text-sm" value={stimme} onChange={(e) => setStimme(e.target.value)} aria-label="Stimme">
          {stimmen.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
        </select>
      )}
      <label className="flex items-center gap-1 text-sm">
        Tempo
        <select className="h-11 rounded-xl border border-[var(--line)] bg-transparent px-2" value={tempo} onChange={(e) => setTempo(Number(e.target.value))}>
          {[0.8, 0.9, 1, 1.1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r.toLocaleString('de-DE')}×</option>)}
        </select>
      </label>
    </div>
  );
}

function Kasten({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="border-t-4 border-double border-current pt-2">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em]">{titel}</h3>
      {children}
    </section>
  );
}

function Blatt({ z }: { z: ZeitungTyp }) {
  const [haupt, ...rest] = z.artikel;
  const ereignisse = rest.filter((a) => a.rubrik === 'Ereignis');
  const sonst = rest.filter((a) => a.rubrik !== 'Ereignis');
  return (
    <article className={`mx-auto max-w-6xl rounded-sm px-10 py-8 shadow-xl ${papier}`} style={serif}>
      {/* Kopf */}
      <header className="border-b-4 border-double border-current pb-3 text-center">
        <div className="flex items-end justify-between text-xs uppercase tracking-widest">
          <span>{z.ausgabe}</span>
          <span>Preis: 1 Speiche</span>
        </div>
        <h1 className="my-2 text-6xl font-black tracking-tight" style={{ fontFamily: '"Old English Text MT", Georgia, serif' }}>Der Kettenblatt-Kurier</h1>
        <div className="text-sm italic">Fachblatt für angewandte Zweiradökonomie · seit 1887 · gegründet in einer Garage</div>
        {z.sonderausgabe && <div className="mt-2 inline-block bg-rose-700 px-3 py-1 text-sm font-bold uppercase tracking-widest text-white">Sonderausgabe: {z.sonderausgabe}</div>}
      </header>

      {/* Schlagzeile */}
      <div className="border-b border-current py-5 text-center">
        <h2 className="text-5xl font-black leading-tight">{z.schlagzeile}</h2>
        {z.unterzeile && <p className="mt-2 text-xl italic">{z.unterzeile}</p>}
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-8 pt-5">
        <div>
          {haupt && (
            <section className="mb-5">
              <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">{haupt.rubrik}</div>
              <h3 className="mb-2 text-3xl font-bold leading-tight">{haupt.titel}</h3>
              <p className="text-lg leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8]">{haupt.text}</p>
            </section>
          )}
          {ereignisse.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-5">
              {ereignisse.map((a) => (
                <section key={a.titel} className="border-2 border-current p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">Achtung, wirkt im kommenden Quartal</div>
                  <h3 className="mt-1 text-2xl font-bold leading-tight">{a.titel}</h3>
                  <p className="mt-2 leading-relaxed">{a.text}</p>
                  {a.wirkung && <p className="mt-2 bg-black/10 px-2 py-1 text-sm font-bold dark:bg-white/10">Auswirkung: {a.wirkung}</p>}
                </section>
              ))}
            </div>
          )}
          <div className="columns-2 gap-8 [column-rule:1px_solid_currentColor]">
            {sonst.map((a) => (
              <section key={a.titel} className="mb-5 break-inside-avoid">
                <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">{a.rubrik}</div>
                <h3 className="mb-1 text-xl font-bold leading-snug">{a.titel}</h3>
                <p className="leading-relaxed">{a.text}</p>
                {a.wirkung && <p className="mt-1 text-sm font-bold">Auswirkung: {a.wirkung}</p>}
              </section>
            ))}
            {z.kurzmeldungen.length > 0 && (
              <section className="mb-5 break-inside-avoid">
                <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">Kurzmeldungen</div>
                <ul className="mt-1 space-y-2">
                  {z.kurzmeldungen.map((k) => <li key={k} className="border-b border-dotted border-current pb-2 leading-snug">{k}</li>)}
                </ul>
              </section>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-6 border-t border-current pt-4">
            <section>
              <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">Glosse</div>
              <h3 className="text-xl font-bold italic">{z.glosse.titel}</h3>
              <p className="italic leading-relaxed">{z.glosse.text}</p>
            </section>
            <section>
              <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">Leserbrief</div>
              <p className="leading-relaxed">{z.leserbrief}</p>
            </section>
          </div>
        </div>

        <aside className="space-y-6 border-l border-current pl-6">
          <Kasten titel="Testmagazin „Rad & Tat“">
            {z.testmagazin.map((t) => (
              <div key={t.produkt} className="mb-4">
                <div className="mb-1 flex items-center gap-2 font-bold"><BikeIcon produkt={t.produkt} className="h-6 w-9" farbe="currentColor" /> {PRODUKTE[t.produkt].name}</div>
                <table className="w-full text-sm">
                  <tbody>
                    {t.eintraege.map((e, i) => (
                      <tr key={e.name} className={`${e.eigen ? 'font-bold' : ''} ${e.ti < 100 ? 'text-rose-700 dark:text-rose-400' : ''}`}>
                        <td className="w-5">{i + 1}.</td>
                        <td className="truncate">{e.name}{i === 0 ? ' 🏆' : ''}</td>
                        <td className="text-right tabular-nums">{fmt0(e.ti)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="text-xs italic">Technikindex; unter 100 Punkten gilt ein Rad als nicht marktfähig.</p>
          </Kasten>
          <Kasten titel="Konditionen">
            <table className="w-full text-sm tabular-nums">
              <tbody>
                <tr><td>Basiszins</td><td className="text-right">{pct(z.konditionen.basiszins, 1)}</td></tr>
                <tr><td>Darlehen (Ihr Rating {z.konditionen.rating})</td><td className="text-right">{pct(z.konditionen.darlehen, 1)}</td></tr>
                <tr><td>Kontokorrent</td><td className="text-right">{pct(z.konditionen.kontokorrent, 0)}</td></tr>
              </tbody>
            </table>
          </Kasten>
          <Kasten titel="Branchenbericht">
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-xs"><th className="text-left">Firma</th><th className="text-right">Umsatz</th><th className="text-right">EBIT</th></tr></thead>
              <tbody>
                {z.branchenbericht.map((b) => (
                  <tr key={b.name} className={b.eigen ? 'font-bold' : ''}>
                    <td className="max-w-[110px] truncate pr-1">{b.name}</td>
                    <td className="text-right">{eurKompakt(b.umsatz).replace(' €', '')}</td>
                    <td className={`text-right ${b.ebit < 0 ? 'text-rose-700 dark:text-rose-400' : ''}`}>{eurKompakt(b.ebit).replace(' €', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs italic">Werte des Vorquartals in €.</p>
          </Kasten>
        </aside>
      </div>
    </article>
  );
}

export function Zeitung() {
  const state = useGame((s) => s.state)!;
  const historie = useGame((s) => s.historie);
  const gehe = useGame((s) => s.gehe);
  const hinweis = useGame((s) => s.hinweis);
  const [lage, setLage] = useState(true);
  // Archiv: alle bisherigen Ausgaben
  const ausgaben = useMemo(() => {
    const liste: ZeitungTyp[] = [];
    const start = historie[0]?.stateVor.zeitung ?? (historie.length === 0 ? state.zeitung : null);
    if (start) liste.push(start);
    for (const h of historie) if (h.report.zeitung) liste.push(h.report.zeitung);
    if (!liste.length || liste[liste.length - 1].quartal !== state.quartal) {
      liste.push(state.zeitung ?? erzeugeStartZeitung(state));
    }
    return liste;
  }, [historie, state]);
  const [index, setIndex] = useState(ausgaben.length - 1);
  const oben = useRef<HTMLDivElement>(null);
  useEffect(() => setIndex(ausgaben.length - 1), [ausgaben.length]);
  const z = ausgaben[Math.min(index, ausgaben.length - 1)];
  const text = useMemo(() => zeitungAlsText(z, state, lage), [z, state, lage]);

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(text);
      hinweis('Zeitung als Text kopiert.');
    } catch {
      hinweis('Kopieren nicht möglich – der Browser hat den Zugriff verweigert.');
    }
  };

  return (
    <div className="space-y-4" ref={oben}>
      <div className="sticky top-[57px] z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--bg)]/95 px-4 py-2 backdrop-blur">
        <div className="mr-auto flex items-center gap-2">
          <button className="btn-ghost" disabled={index <= 0} onClick={() => setIndex(index - 1)} aria-label="Ältere Ausgabe">‹</button>
          <span className="text-sm font-semibold">{z.ausgabe}{index < ausgaben.length - 1 ? ' (Archiv)' : ' – aktuell'}</span>
          <button className="btn-ghost" disabled={index >= ausgaben.length - 1} onClick={() => setIndex(index + 1)} aria-label="Neuere Ausgabe">›</button>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={lage} onChange={(e) => setLage(e.target.checked)} /> „Lage in Zahlen“ anhängen
        </label>
        <button className="btn-ghost" onClick={kopieren}>Zeitung kopieren</button>
        <Vorlesen text={text} />
        <button className="btn-primary" onClick={() => gehe('entscheidungen')}>Zu den Entscheidungen für {quartalLabel(state.quartal)}</button>
      </div>
      <Blatt z={z} />
    </div>
  );
}
