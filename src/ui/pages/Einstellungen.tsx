import { useEffect, useRef, useState } from 'react';
import { hashSeed, quartalLabel, type Schwierigkeit } from '../../engine';
import { Leer } from '../components/Leer';
import { useGame } from '../../store/gameStore';
import { SLOT_ANZAHL, loeschen, slotListe, type SlotInfo } from '../../store/saveSlots';
import { Card, Icon } from '../components/ui';
import { klang, tonAn } from '../klang';

const FARBEN = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#ca8a04'];

export function NeuesSpielForm({ abbrechen }: { abbrechen?: () => void }) {
  const neu = useGame((s) => s.neu);
  const [name, setName] = useState('Rupert Rad GmbH');
  const [farbe, setFarbe] = useState(FARBEN[0]);
  const [schwierigkeit, setSchwierigkeit] = useState<Schwierigkeit>('normal');
  const [profi, setProfi] = useState(false);
  const [seedText, setSeedText] = useState('');
  const start = () => {
    const seed = seedText.trim() === '' ? Math.floor(Math.random() * 2 ** 31) : /^\d+$/.test(seedText.trim()) ? Number(seedText.trim()) : hashSeed(seedText.trim());
    neu({ firmenname: name.trim() || 'Fahrrad GmbH', farbe, schwierigkeit, profi, seed });
  };
  return (
    <Card titel="Neues Spiel">
      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Firmenname
          <input className="mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div>
          <div className="mb-1 text-sm font-medium">Firmenfarbe</div>
          <div className="flex flex-wrap gap-2">
            {FARBEN.map((f) => (
              <button key={f} aria-label={`Farbe ${f}`} aria-pressed={farbe === f} onClick={() => setFarbe(f)} className={`h-11 w-11 rounded-full border-2 ${farbe === f ? 'border-[var(--ink)]' : 'border-transparent'}`} style={{ background: f }} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-sm font-medium">Schwierigkeitsgrad</div>
          <div className="grid grid-cols-3 gap-2">
            {(['leicht', 'normal', 'schwer'] as Schwierigkeit[]).map((s) => (
              <button key={s} onClick={() => setSchwierigkeit(s)} aria-pressed={schwierigkeit === s} className={`btn capitalize ${schwierigkeit === s ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`}>{s}</button>
            ))}
          </div>
        </div>
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={profi} onChange={(e) => setProfi(e.target.checked)} />
          <span><strong>Profimodus</strong> – alle Entscheidungen ab Q1 offen</span>
        </label>
        <label className="block text-sm font-medium">
          Seed (optional)
          <input className="mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3" placeholder="zufällig" value={seedText} onChange={(e) => setSeedText(e.target.value)} />
          <span className="muted text-xs font-normal">Gleicher Seed und gleiche Entscheidungen ergeben denselben Spielverlauf.</span>
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={start}>Spiel starten</button>
          {abbrechen && <button className="btn-ghost" onClick={abbrechen}>Abbrechen</button>}
        </div>
      </div>
    </Card>
  );
}

export function Einstellungen() {
  const dunkel = useGame((s) => s.dunkel);
  const setDunkel = useGame((s) => s.setDunkel);
  const reduziert = useGame((s) => s.reduziert);
  const setReduziert = useGame((s) => s.setReduziert);
  const state = useGame((s) => s.state)!;
  const historie = useGame((s) => s.historie);
  const speichereSlot = useGame((s) => s.speichereSlot);
  const ladeSlot = useGame((s) => s.ladeSlot);
  const ladeStand = useGame((s) => s.ladeStand);
  const stand = useGame((s) => s.stand);
  const zurueck = useGame((s) => s.zurueckspringen);
  const hinweis = useGame((s) => s.hinweis);
  const [neuesSpiel, setNeuesSpiel] = useState(false);
  const [ton, setTon] = useState(tonAn());
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const datei = useRef<HTMLInputElement>(null);
  const lade = () => void slotListe().then(setSlots);
  useEffect(lade, []);

  const exportieren = () => {
    const s = stand();
    if (!s) return;
    const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fahrrad-imperium-${state.unternehmen.name.replace(/\W+/g, '-')}-${quartalLabel(state.quartal).replace(' ', '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importieren = async (f: File | undefined) => {
    if (!f) return;
    try {
      ladeStand(JSON.parse(await f.text()));
    } catch {
      hinweis('Datei konnte nicht gelesen werden.');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="h-page">Einstellungen & Speichern</h1>

      <Card titel="Darstellung" icon="sun" farbe="#f59e0b">
        <div className="space-y-1">
          <button className="flex min-h-[44px] w-full items-center justify-between" onClick={() => setDunkel(!dunkel)} role="switch" aria-checked={dunkel}>
            <span className="flex items-center gap-2 text-sm"><Icon name={dunkel ? 'moon' : 'sun'} /> Dunkelmodus</span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${dunkel ? 'bg-brand-600' : 'bg-black/15 dark:bg-white/20'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dunkel ? 'left-[22px]' : 'left-0.5'}`} /></span>
          </button>
          <button className="flex min-h-[44px] w-full items-center justify-between" onClick={() => { const n = !ton; try { localStorage.setItem('fi-ton', n ? '1' : '0'); } catch { /* egal */ } setTon(n); if (n) klang.klingel(); }} role="switch" aria-checked={ton}>
            <span className="flex items-center gap-2 text-sm"><Icon name="vorlesen" /> Klänge (Klingel, Kasse, Fanfare)</span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${ton ? 'bg-brand-600' : 'bg-black/15 dark:bg-white/20'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${ton ? 'left-[22px]' : 'left-0.5'}`} /></span>
          </button>
          <button className="flex min-h-[44px] w-full items-center justify-between" onClick={() => setReduziert(!reduziert)} role="switch" aria-checked={reduziert}>
            <span className="flex items-center gap-2 text-sm"><Icon name="rakete" /> Animationen reduzieren</span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${reduziert ? 'bg-brand-600' : 'bg-black/15 dark:bg-white/20'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${reduziert ? 'left-[22px]' : 'left-0.5'}`} /></span>
          </button>
        </div>
      </Card>

      <Card titel="Spielstände" icon="lager" aktion={<span className="muted text-xs">Autosave nach jedem Quartal</span>}>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4">
          {slots.map((s) => {
            const auto = s.slot === 'auto';
            return (
              <div key={String(s.slot)} className={`group relative rounded-xl border p-3 transition ${s.belegt ? 'border-[var(--line)] bg-[var(--card)] hover:shadow-md' : 'border-dashed border-[var(--line)] bg-black/[0.015] dark:bg-white/[0.02]'} ${auto ? 'ring-1 ring-brand-500/40' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.belegt ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100' : 'bg-black/5 text-slate-400 dark:bg-white/5'}`}>
                    <Icon name={auto ? 'kalender' : s.belegt ? 'rad' : 'plus'} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{auto ? 'Autosave' : `Platz ${s.slot}`}</div>
                    <div className="muted truncate text-xs">{s.belegt ? `${s.firma} · ${quartalLabel(s.quartal ?? 0)}` : 'frei'}</div>
                  </div>
                  {!auto && s.belegt && (
                    <button className="muted ml-auto grid h-7 w-7 place-items-center rounded-md opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" aria-label="Spielstand löschen" onClick={async () => { await loeschen(s.slot); lade(); }}>×</button>
                  )}
                </div>
                {s.belegt && s.gespeichert && <div className="muted mt-1 text-[11px]">{new Date(s.gespeichert).toLocaleString('de-DE')}</div>}
                <div className="mt-2 flex gap-1.5">
                  {!auto && (
                    <button className="btn-ghost min-h-[34px] flex-1 px-2 text-xs" onClick={async () => { await speichereSlot(s.slot, `${state.unternehmen.name} – ${quartalLabel(state.quartal)}`); lade(); }}>Speichern</button>
                  )}
                  <button className="btn-ghost min-h-[34px] flex-1 px-2 text-xs" disabled={!s.belegt} onClick={async () => { if (window.confirm('Aktuellen Spielstand durch diesen ersetzen?')) await ladeSlot(s.slot); }}>Laden</button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted mt-2 text-xs">{SLOT_ANZAHL} Speicherplätze liegen lokal in diesem Browser. Zum Übertragen auf ein anderes Gerät nutze den Datei-Export.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={exportieren}>Als Datei exportieren</button>
          <button className="btn-ghost" onClick={() => datei.current?.click()}>Datei importieren</button>
          <input ref={datei} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void importieren(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </Card>

      <Card titel="Historie – zurückspringen" icon="kalender" farbe="#6366f1">
        {historie.length === 0 ? (
          <Leer titel="Noch keine Geschichte">Nach dem ersten Quartal kannst du hier zu früheren Ständen zurückspringen.</Leer>
        ) : (
          <>
            <p className="muted mb-2 text-xs">Springt zu einem früheren Quartal und startet dort einen neuen Zweig – ideal, um riskante Strategien auszuprobieren.</p>
            <div className="flex flex-wrap gap-1.5">
              {historie.map((h, i) => (
                <button key={i} className="btn-ghost min-h-[34px] px-3 text-xs" onClick={() => { if (window.confirm(`Zurück zu ${quartalLabel(h.report.quartal)}? Spätere Quartale gehen im aktuellen Zweig verloren (Spielstand vorher speichern).`)) zurueck(i); }}>
                  {quartalLabel(h.report.quartal)}
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      {neuesSpiel ? (
        <NeuesSpielForm abbrechen={() => setNeuesSpiel(false)} />
      ) : (
        <button className="btn-ghost w-full" onClick={() => setNeuesSpiel(true)}>Neues Spiel beginnen …</button>
      )}
      <p className="muted text-center text-xs">Version vom {new Date(__BUILD_ZEIT__).toLocaleString('de-DE')}</p>
      <p className="muted text-center text-xs">Seed dieses Spiels: {state.einstellungen.seed} · {state.einstellungen.schwierigkeit}{state.einstellungen.profi ? ' · Profimodus' : ''}</p>
    </div>
  );
}
