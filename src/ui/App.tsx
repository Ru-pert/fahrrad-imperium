import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BALANCE, quartalLabel } from '../engine';
import { useGame, type Seite } from '../store/gameStore';
import { eur, eurKompakt, fmt0, pct } from './format';
import { ERFOLGE } from '../engine/achievements';
import { usePreview, useLetzterBericht } from './hooks';
import { Badge, Icon, Toasts } from './components/ui';
import { Auswertung } from './components/Auswertung';
import { GaragenSzene } from './components/Startbild';
import { Endabrechnung } from './components/Endabrechnung';
import { Tutorial } from './components/Tutorial';
import { Cockpit } from './pages/Cockpit';
import { Bericht } from './pages/Bericht';
import { Zeitung } from './pages/Zeitung';
import { Entscheidungen } from './pages/Entscheidungen';
import { Markt } from './pages/Markt';
import { Expansion } from './pages/Expansion';
import { Finanzen } from './pages/Finanzen';
import { Werke } from './pages/Werke';
import { Garage } from './pages/Garage';
import { Marktforschung } from './pages/Marktforschung';
import { Boerse, IpoFeier } from './pages/Boerse';
import { Firmensitz } from './pages/Firmensitz';
import { Erfolge } from './pages/Erfolge';
import { Austausch } from './pages/Austausch';
import { Einstellungen, NeuesSpielForm } from './pages/Einstellungen';

const NAV: { id: Seite; label: string; kurz: string; icon: string }[] = [
  { id: 'cockpit', label: 'Cockpit', kurz: 'Cockpit', icon: 'cockpit' },
  { id: 'zeitung', label: 'Zeitung', kurz: 'Zeitung', icon: 'zeitung' },
  { id: 'bericht', label: 'Quartalsbericht', kurz: 'Bericht', icon: 'bericht' },
  { id: 'entscheidungen', label: 'Entscheidungen', kurz: 'Entscheiden', icon: 'entscheidungen' },
  { id: 'markt', label: 'Markt', kurz: 'Markt', icon: 'markt' },
  { id: 'expansion', label: 'Expansion & Weltkarte', kurz: 'Welt', icon: 'expansion' },
  { id: 'finanzen', label: 'Finanzen', kurz: 'Finanzen', icon: 'finanzen' },
  { id: 'werke', label: 'Werke', kurz: 'Werke', icon: 'werke' },
  { id: 'garage', label: 'Garage', kurz: 'Garage', icon: 'rad' },
  { id: 'marktforschung', label: 'Marktforschung', kurz: 'Forschung', icon: 'ziel' },
  { id: 'boerse', label: 'Börse & Übernahmen', kurz: 'Börse', icon: 'wert' },
  { id: 'firmensitz', label: 'Firmensitz', kurz: 'Firmensitz', icon: 'firmensitz' },
  { id: 'erfolge', label: 'Erfolge', kurz: 'Erfolge', icon: 'erfolge' },
  { id: 'austausch', label: 'Mit Claude planen', kurz: 'Claude', icon: 'austausch' },
  { id: 'einstellungen', label: 'Einstellungen & Speichern', kurz: 'Einstellungen', icon: 'einstellungen' },
];
const GRUPPEN: { titel: string; seiten: Seite[] }[] = [
  { titel: 'Überblick', seiten: ['cockpit', 'zeitung', 'bericht'] },
  { titel: 'Steuern', seiten: ['entscheidungen', 'austausch'] },
  { titel: 'Unternehmen', seiten: ['markt', 'marktforschung', 'expansion', 'boerse', 'finanzen', 'werke', 'garage', 'firmensitz'] },
  { titel: 'Spiel', seiten: ['erfolge', 'einstellungen'] },
];
const JAHRESZEIT = [
  { name: 'Winter', icon: 'schnee' },
  { name: 'Frühling', icon: 'bluete' },
  { name: 'Sommer', icon: 'sun' },
  { name: 'Herbst', icon: 'laub' },
];
const MOBIL_HAUPT: Seite[] = ['cockpit', 'zeitung', 'entscheidungen', 'markt'];

function Seiteninhalt({ seite }: { seite: Seite }) {
  switch (seite) {
    case 'cockpit': return <Cockpit />;
    case 'zeitung': return <Zeitung />;
    case 'bericht': return <Bericht />;
    case 'entscheidungen': return <Entscheidungen />;
    case 'markt': return <Markt />;
    case 'expansion': return <Expansion />;
    case 'finanzen': return <Finanzen />;
    case 'werke': return <Werke />;
    case 'garage': return <Garage />;
    case 'marktforschung': return <Marktforschung />;
    case 'boerse': return <Boerse />;
    case 'firmensitz': return <Firmensitz />;
    case 'erfolge': return <Erfolge />;
    case 'austausch': return <Austausch />;
    case 'einstellungen': return <Einstellungen />;
  }
}

function Kopfzeile() {
  const state = useGame((s) => s.state)!;
  const abschliessen = useGame((s) => s.abschliessen);
  const vorschau = usePreview();
  const klick = () => {
    if (vorschau && vorschau.warnungen.length > 0) {
      const ok = window.confirm(`Es gibt ${vorschau.warnungen.length} Warnung(en):\n\n• ${vorschau.warnungen.slice(0, 5).join('\n• ')}\n\nQuartal trotzdem abschließen?`);
      if (!ok) return;
    }
    abschliessen();
  };
  const bericht = useLetzterBericht();
  const jz = JAHRESZEIT[state.quartal % 4];
  const chips: { icon: string; label: string; wert: string; warn?: boolean }[] = bericht
    ? [
        { icon: 'umsatz', label: 'Umsatz', wert: eurKompakt(bericht.guv.umsatz) },
        { icon: 'ebit', label: 'EBIT', wert: eurKompakt(bericht.guv.ebit), warn: bericht.guv.ebit < 0 },
        { icon: 'marktanteil', label: 'Anteil DE', wert: pct(bericht.kennzahlen.marktanteil ?? 0, 2) },
        { icon: 'image', label: 'Image', wert: fmt0(state.unternehmen.image) },
      ]
    : [];
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--card)]/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-100 to-sky-100 text-amber-600 sm:grid dark:from-slate-700 dark:to-slate-800" title={jz.name}>
            <Icon name={jz.icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold sm:text-lg">{quartalLabel(state.quartal)}</span>
              <span className="muted hidden text-xs sm:inline">{jz.name}</span>
              <Badge farbe={(BALANCE.finanzen.ratingStufen as readonly string[]).indexOf(state.finanzen.rating) <= 4 ? 'green' : 'amber'}>{state.finanzen.rating}</Badge>
            </div>
            <div className="muted tnum truncate text-xs sm:text-sm">
              Kasse <strong className="text-[var(--ink)]">{eurKompakt(state.finanzen.kasse)}</strong>
              <span className="hidden sm:inline"> · {state.unternehmen.name}</span>
            </div>
          </div>
        </div>
        <div className="hidden flex-1 items-center justify-center gap-2 xl:flex">
          {chips.map((c) => (
            <div key={c.label} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 px-2.5 py-1">
              <Icon name={c.icon} className="h-4 w-4 text-brand-600" />
              <div className="leading-tight">
                <div className="muted text-[10px] uppercase tracking-wide">{c.label}</div>
                <div className={`tnum text-sm font-semibold ${c.warn ? 'text-rose-600' : ''}`}>{c.wert}</div>
              </div>
            </div>
          ))}
        </div>
        <button data-tour="abschliessen" className="btn-primary ml-auto shadow-md shadow-brand-600/25" onClick={klick} disabled={!!state.spielende}>
          <span className="hidden sm:inline">Quartal abschließen</span>
          <span className="sm:hidden">Abschließen</span>
          <Icon name="chevron" className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function Seitenleiste() {
  const seite = useGame((s) => s.seite);
  const gehe = useGame((s) => s.gehe);
  const state = useGame((s) => s.state)!;
  const erfolge = state.erfolge?.length ?? 0;
  return (
    <nav className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-[#0f3b38] via-[#0c2f2d] to-[#0a2322] p-3 text-teal-50 lg:flex" aria-label="Hauptnavigation">
      <div className="mb-3 flex items-center gap-2.5 px-2 pt-2">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-10 w-10 rounded-xl shadow-lg shadow-black/30 ring-1 ring-white/10" />
        <div className="leading-tight">
          <div className="font-bold tracking-tight text-white">Fahrrad-Imperium</div>
          <div className="flex items-center gap-1.5 text-xs text-teal-200/80">
            <span className="h-2 w-2 rounded-full" style={{ background: state.unternehmen.farbe }} />
            {state.unternehmen.name}
          </div>
        </div>
      </div>
      {GRUPPEN.map((g) => (
        <div key={g.titel} className="mt-3">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-300/60">{g.titel}</div>
          {g.seiten.map((id) => {
            const n = NAV.find((x) => x.id === id)!;
            const aktiv = seite === n.id;
            return (
              <button
                key={n.id}
                onClick={() => gehe(n.id)}
                aria-current={aktiv ? 'page' : undefined}
                className={`relative flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors ${aktiv ? 'text-[#0c2f2d]' : 'text-teal-50/85 hover:bg-white/[0.07] hover:text-white'}`}
              >
                {aktiv && <motion.span layoutId="nav-aktiv" className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-200 to-emerald-100 shadow-md shadow-black/20" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative flex items-center gap-3"><Icon name={n.icon} className="h-[18px] w-[18px]" />{n.label}</span>
                {n.id === 'erfolge' && <span className="relative ml-auto rounded-full bg-amber-400/90 px-1.5 text-[10px] font-bold text-amber-950">{erfolge}</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div className="mt-auto rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
        <div className="flex items-center justify-between text-xs text-teal-200/80">
          <span>Jahr {Math.min(15, Math.floor(state.quartal / 4) + 1)} von 15{state.endlos ? ' (frei)' : ''}</span>
          <span>{erfolge}/{ERFOLGE.length} Erfolge</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${(erfolge / ERFOLGE.length) * 100}%` }} />
        </div>
      </div>
    </nav>
  );
}

function MobilNav() {
  const seite = useGame((s) => s.seite);
  const gehe = useGame((s) => s.gehe);
  const [mehr, setMehr] = useState(false);
  const mehrAktiv = !MOBIL_HAUPT.includes(seite);
  const btn = (aktiv: boolean) => `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${aktiv ? 'text-brand-600 dark:text-brand-500' : 'muted'}`;
  return (
    <>
      <AnimatePresence>
        {mehr && (
          <motion.div className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMehr(false)}>
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[var(--card)] p-4 pb-24"
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/20" />
              {NAV.filter((n) => !MOBIL_HAUPT.includes(n.id)).map((n) => (
                <button
                  key={n.id}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium hover:bg-black/5"
                  onClick={() => {
                    setMehr(false);
                    gehe(n.id);
                  }}
                >
                  <Icon name={n.icon} />
                  {n.label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[var(--line)] bg-[var(--card)] lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Hauptnavigation">
        {NAV.filter((n) => MOBIL_HAUPT.includes(n.id)).map((n) => (
          <button key={n.id} className={btn(seite === n.id)} onClick={() => gehe(n.id)} aria-current={seite === n.id ? 'page' : undefined}>
            <Icon name={n.icon} />
            {n.kurz}
          </button>
        ))}
        <button className={btn(mehrAktiv)} onClick={() => setMehr((m) => !m)} aria-expanded={mehr}>
          <Icon name="mehr" />
          Mehr
        </button>
      </nav>
    </>
  );
}

function Startbildschirm() {
  const [vorschau, setVorschau] = useState({ name: 'Rupert Rad GmbH', farbe: '#0d9488' });
  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 p-6 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-14 w-14 rounded-2xl shadow-lg" />
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Fahrrad-Imperium</h1>
            <p className="muted mt-1">Vom Garagenbetrieb zum größten Fahrradhersteller der Welt.</p>
          </div>
        </motion.div>
        <GaragenSzene name={vorschau.name} farbe={vorschau.farbe} />
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          {[
            { icon: 'werke', text: 'Werke bauen' },
            { icon: 'fe', text: 'Abgedrehte Features erforschen' },
            { icon: 'expansion', text: 'Die Welt erobern' },
          ].map((x) => (
            <div key={x.text} className="card flex flex-col items-center gap-1 p-3">
              <span className="text-brand-600"><Icon name={x.icon} className="h-6 w-6" /></span>
              {x.text}
            </div>
          ))}
        </div>
      </div>
      <div>
        <NeuesSpielForm onVorschau={(name, farbe) => setVorschau({ name, farbe })} />
      </div>
      <Toasts />
    </div>
  );
}

export function App() {
  const bereit = useGame((s) => s.bereit);
  const start = useGame((s) => s.start);
  const state = useGame((s) => s.state);
  const seite = useGame((s) => s.seite);
  const letzter = useLetzterBericht();
  useEffect(() => {
    void start();
  }, [start]);

  if (!bereit) return <div className="grid min-h-screen place-items-center muted">Lade …</div>;
  if (!state) return <Startbildschirm />;
  void letzter;
  void eur;
  return (
    <div className="flex min-h-screen">
      <Seitenleiste />
      <div className="min-w-0 flex-1">
        <Kopfzeile />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div key={seite} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              <Seiteninhalt seite={seite} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobilNav />
      <Auswertung />
      <Endabrechnung />
      <IpoFeier />
      <Tutorial />
      <Toasts />
    </div>
  );
}
