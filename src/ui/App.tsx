import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BALANCE, quartalLabel } from '../engine';
import { useGame, type Seite } from '../store/gameStore';
import { eur, eurKompakt } from './format';
import { usePreview, useLetzterBericht } from './hooks';
import { Badge, Icon, Toasts } from './components/ui';
import { Auswertung } from './components/Auswertung';
import { Cockpit } from './pages/Cockpit';
import { Bericht } from './pages/Bericht';
import { Zeitung } from './pages/Zeitung';
import { Entscheidungen } from './pages/Entscheidungen';
import { Markt } from './pages/Markt';
import { Finanzen } from './pages/Finanzen';
import { Werke } from './pages/Werke';
import { Firmensitz } from './pages/Firmensitz';
import { Einstellungen, NeuesSpielForm } from './pages/Einstellungen';

const NAV: { id: Seite; label: string; kurz: string; icon: string }[] = [
  { id: 'cockpit', label: 'Cockpit', kurz: 'Cockpit', icon: 'cockpit' },
  { id: 'zeitung', label: 'Zeitung', kurz: 'Zeitung', icon: 'bericht' },
  { id: 'bericht', label: 'Quartalsbericht', kurz: 'Bericht', icon: 'cockpit' },
  { id: 'entscheidungen', label: 'Entscheidungen', kurz: 'Entscheiden', icon: 'entscheidungen' },
  { id: 'markt', label: 'Markt', kurz: 'Markt', icon: 'markt' },
  { id: 'finanzen', label: 'Finanzen', kurz: 'Finanzen', icon: 'finanzen' },
  { id: 'werke', label: 'Werke', kurz: 'Werke', icon: 'werke' },
  { id: 'firmensitz', label: 'Firmensitz', kurz: 'Firmensitz', icon: 'firmensitz' },
  { id: 'einstellungen', label: 'Einstellungen & Speichern', kurz: 'Einstellungen', icon: 'einstellungen' },
];
const MOBIL_HAUPT: Seite[] = ['cockpit', 'zeitung', 'entscheidungen', 'markt'];

function Seiteninhalt({ seite }: { seite: Seite }) {
  switch (seite) {
    case 'cockpit': return <Cockpit />;
    case 'zeitung': return <Zeitung />;
    case 'bericht': return <Bericht />;
    case 'entscheidungen': return <Entscheidungen />;
    case 'markt': return <Markt />;
    case 'finanzen': return <Finanzen />;
    case 'werke': return <Werke />;
    case 'firmensitz': return <Firmensitz />;
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
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--card)]/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold sm:text-lg">{quartalLabel(state.quartal)}</span>
            <Badge farbe={(BALANCE.finanzen.ratingStufen as readonly string[]).indexOf(state.finanzen.rating) <= 4 ? 'green' : 'amber'}>{state.finanzen.rating}</Badge>
          </div>
          <div className="muted tnum truncate text-xs sm:text-sm">
            Kasse <strong className="text-[var(--ink)]">{eurKompakt(state.finanzen.kasse)}</strong>
            <span className="hidden sm:inline"> · {state.unternehmen.name}{state.unternehmen.rechtsform === 'AG' ? '' : ''}</span>
          </div>
        </div>
        <button className="btn-primary" onClick={klick} disabled={!!state.spielende}>
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
  return (
    <nav className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--card)] p-3 lg:flex" aria-label="Hauptnavigation">
      <div className="mb-4 flex items-center gap-2 px-2 pt-2">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-9 w-9 rounded-lg" />
        <div className="leading-tight">
          <div className="font-bold">Fahrrad-Imperium</div>
          <div className="muted text-xs">{state.unternehmen.name}</div>
        </div>
      </div>
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => gehe(n.id)}
          aria-current={seite === n.id ? 'page' : undefined}
          className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${seite === n.id ? 'bg-brand-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
          <Icon name={n.icon} />
          {n.label}
        </button>
      ))}
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
  if (!state) {
    return (
      <div className="mx-auto max-w-lg p-4 pt-10">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="mb-4 h-16 w-16 rounded-2xl" />
        <h1 className="text-3xl font-bold">Fahrrad-Imperium</h1>
        <p className="muted mb-6 mt-1">Vom Garagenbetrieb zum größten Fahrradhersteller der Welt – ein Unternehmensplanspiel.</p>
        <NeuesSpielForm />
        <Toasts />
      </div>
    );
  }
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
      <Toasts />
    </div>
  );
}
