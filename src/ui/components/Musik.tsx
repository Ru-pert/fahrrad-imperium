import { useEffect, useState } from 'react';
import type { GameState } from '../../engine';
import { useGame } from '../../store/gameStore';
import { musik, musikAn, STIMMUNGEN, type Stimmung } from '../musik';
import { Icon } from './ui';

/** Lage des Unternehmens → Musikstimmung */
export function stimmungVon(s: GameState): Stimmung {
  const k = s.kpiHistorie;
  const l = k[k.length - 1];
  const v = k[k.length - 2];
  if (!s.endlos && s.quartal >= 52) return 'endspurt';
  if (s.krise || s.rettungsangebot || (l && l.ebit < 0) || s.finanzen.kontokorrent > 0) return 'krise';
  if (l && v && v.umsatz > 0 && l.umsatz / v.umsatz > 1.08 && l.ebit > 0) return 'boom';
  return 'ruhig';
}

/** Schalter für die Hintergrundmusik in der Kopfzeile */
export function MusikSteuerung() {
  const state = useGame((s) => s.state);
  const [an, setAn] = useState(musikAn);
  const stimmung = state ? stimmungVon(state) : 'ruhig';

  useEffect(() => {
    musik.setzeStimmung(stimmung);
  }, [stimmung]);

  // Browser erlauben Ton erst nach einer Nutzeraktion: beim ersten Klick starten, falls eingeschaltet
  useEffect(() => {
    if (!an) return;
    const los = () => musik.start();
    window.addEventListener('pointerdown', los, { once: true });
    window.addEventListener('keydown', los, { once: true });
    return () => {
      window.removeEventListener('pointerdown', los);
      window.removeEventListener('keydown', los);
    };
  }, [an]);

  const umschalten = () => {
    const neu = !an;
    setAn(neu);
    try {
      localStorage.setItem('fi-musik', neu ? '1' : '0');
    } catch {
      /* egal */
    }
    if (neu) musik.start();
    else musik.stop();
  };

  return (
    <button
      className={`ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition ${an ? 'border-brand-600/40 bg-brand-600/10 text-brand-700 dark:text-brand-300' : 'border-[var(--line)] text-[var(--muted)] hover:bg-black/5'}`}
      onClick={umschalten}
      aria-pressed={an}
      title={an ? `Musik aus (Stimmung: ${STIMMUNGEN[stimmung].name})` : 'Hintergrundmusik einschalten'}
    >
      <Icon name={an ? 'musik' : 'musikAus'} className="h-4 w-4" />
      {an && <span className="hidden md:inline">{STIMMUNGEN[stimmung].name}</span>}
      {an && (
        <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
          {[0, 1, 2].map((i) => <span key={i} className="musik-balken w-[3px] rounded-sm bg-current" style={{ animationDelay: `${i * 0.18}s` }} />)}
        </span>
      )}
    </button>
  );
}
