import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useGame, type Seite } from '../../store/gameStore';
import { SpeicheAvatar } from './Beraterin';
import { Icon } from './ui';

interface Schritt {
  seite: Seite;
  /** data-tour-Attribut des hervorgehobenen Elements (fehlt → Blase in der Mitte) */
  ziel?: string;
  titel: string;
  text: string;
  /** Bereich auf der Entscheidungsseite vorwählen */
  bereich?: number;
}

const SCHRITTE: Schritt[] = [
  { seite: 'cockpit', titel: 'Willkommen in deiner Garage!', text: 'Ich bin Prof. Ulrike Speiche und begleite dich. In diesem Spiel baust du aus einer kleinen Fahrradwerkstatt in 15 Jahren ein Weltunternehmen auf. Jede Runde ist ein Quartal: Du entscheidest – dann rechnet die Welt.' },
  { seite: 'cockpit', ziel: 'ziel', titel: 'Dein Ziel', text: 'Nach 60 Quartalen gibt es die Endabrechnung: Punkte für Unternehmenswert, Weltrang, Märkte, Erfolge und Image. Vom Garagenbastler bis zum Fahrrad-Kaiser ist alles drin.' },
  { seite: 'cockpit', ziel: 'imperium', titel: 'Deine Welt', text: 'Hier siehst du dein Imperium: deine Märkte, Lieferrouten und die Konkurrenz. Neue Regionen schaltest du über Meilensteine frei – zuerst Europa.' },
  { seite: 'entscheidungen', ziel: 'bereiche', bereich: 0, titel: 'Deine Entscheidungen', text: 'Alles, was du steuerst, ist in Bereiche sortiert: Preise, Produktion, Marketing, Aufträge, Forschung, Personal, Werke, Lieferkette und Finanzen. Du musst nicht alles anfassen – nicht geänderte Werte gelten weiter.' },
  { seite: 'entscheidungen', ziel: 'preise', bereich: 0, titel: 'Der Preis ist dein stärkster Hebel', text: 'Günstiger als der Markt bringt Nachfrage, kostet aber Marge. Vorsicht mit großen Preiserhöhungen: Das Gesicht zeigt die Kundenzufriedenheit – sie sinkt bei Preissprüngen und Lieferengpässen.' },
  { seite: 'entscheidungen', ziel: 'vorschau', bereich: 1, titel: 'Die Live-Vorschau', text: 'Jede Änderung wird sofort durchgerechnet: Umsatz, EBIT, Kasse und Auslastung. Gelbe Hinweise zeigen Engpässe – etwa wenn die Werke nicht genug Räder bauen können.' },
  { seite: 'entscheidungen', ziel: 'hebel', bereich: 1, titel: 'Was bringt welcher Hebel?', text: 'Hier rechne ich vor, wie viel EBIT ein kleiner Schritt bei Preis, Produktion, Marketing oder Forschung bringt – jetzt und im nächsten Quartal. Mein Tipp steht ganz oben.' },
  { seite: 'entscheidungen', ziel: 'abschliessen', titel: 'Quartal abschließen', text: 'Wenn alles passt, schließt du hier das Quartal ab. Dann laufen die Bänder, die Räder werden ausgeliefert und die Zeitung berichtet. Keine Sorge: Fehler gehören dazu – du kannst jederzeit zu früheren Quartalen zurückspringen.' },
  { seite: 'cockpit', titel: 'Ein letzter Tipp', text: 'Forschung bringt neue Räder und verrückte Features, Expansion neue Märkte. Und wenn du mal nicht weiterweißt: Unter „Mit Claude planen“ kannst du deine Lage mit Claude besprechen. Viel Erfolg – ich bin im Cockpit, wenn du mich brauchst!' },
];

/** Geführte Einführung mit Spotlight und Sprechblase */
export function Tutorial() {
  const schritt = useGame((s) => s.tutorialSchritt);
  const setze = useGame((s) => s.setzeTutorial);
  const gehe = useGame((s) => s.gehe);
  const seite = useGame((s) => s.seite);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const akt = schritt !== null ? SCHRITTE[schritt] : null;

  useEffect(() => {
    if (!akt) return;
    if (akt.bereich !== undefined) {
      try {
        localStorage.setItem('entscheidungen-bereich', String(akt.bereich));
      } catch {
        /* egal */
      }
    }
    if (seite !== akt.seite) gehe(akt.seite);
  }, [akt, seite, gehe]);

  useLayoutEffect(() => {
    if (!akt?.ziel) {
      setRect(null);
      return;
    }
    let lauf = true;
    const messe = () => {
      const el = document.querySelector(`[data-tour="${akt.ziel}"]`) as HTMLElement | null;
      if (!el || !lauf) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        setRect(null);
        return;
      }
      if (r.top < 70 || r.bottom > window.innerHeight - 40) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      }
      setRect(el.getBoundingClientRect());
    };
    const t = setTimeout(messe, 350);
    window.addEventListener('resize', messe);
    window.addEventListener('scroll', messe, true);
    return () => {
      lauf = false;
      clearTimeout(t);
      window.removeEventListener('resize', messe);
      window.removeEventListener('scroll', messe, true);
    };
  }, [akt, seite]);

  if (!akt || schritt === null) return null;
  const letzter = schritt === SCHRITTE.length - 1;
  const pad = 8;
  // Blase unter oder über dem Ziel, sonst mittig
  const breite = Math.min(380, window.innerWidth - 24);
  let blase: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: breite };
  if (rect) {
    const unten = rect.bottom + 16 + 220 < window.innerHeight;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - breite / 2), window.innerWidth - breite - 12);
    blase = unten ? { left, top: rect.bottom + pad + 12, width: breite } : { left, bottom: window.innerHeight - rect.top + pad + 12, width: breite };
  }
  return (
    <AnimatePresence>
      <motion.div key="tour" className="fixed inset-0 z-[90]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-live="polite">
        {rect ? (
          <motion.div
            className="pointer-events-none absolute rounded-2xl ring-4 ring-amber-300"
            initial={false}
            animate={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{ boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900/60" />
        )}
        <motion.div key={schritt} role="dialog" aria-label={akt.titel} className="card absolute p-4 shadow-2xl" style={blase} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }}>
          <div className="flex items-start gap-3">
            <SpeicheAvatar className="h-14 w-14 shrink-0" />
            <div className="min-w-0">
              <div className="muted text-[11px] font-semibold uppercase tracking-wide">Einführung {schritt + 1} / {SCHRITTE.length}</div>
              <div className="font-display text-base font-bold leading-tight">{akt.titel}</div>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{akt.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <button className="muted text-xs underline-offset-2 hover:underline" onClick={() => setze(null)}>Überspringen</button>
            <div className="ml-auto flex gap-2">
              {schritt > 0 && <button className="btn-ghost min-h-[36px] px-3 text-sm" onClick={() => setze(schritt - 1)}>Zurück</button>}
              <button className="btn-primary min-h-[36px] px-3 text-sm" onClick={() => setze(letzter ? null : schritt + 1)}>
                {letzter ? 'Los geht’s!' : 'Weiter'} <Icon name="chevron" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
