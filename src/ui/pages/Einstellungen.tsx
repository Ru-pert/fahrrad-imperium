import { useEffect, useRef, useState } from 'react';
import { hashSeed, quartalLabel, type Schwierigkeit } from '../../engine';
import { useGame } from '../../store/gameStore';
import { SLOT_ANZAHL, loeschen, slotListe, type SlotInfo } from '../../store/saveSlots';
import { Card, Icon } from '../components/ui';

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

      <Card titel="Darstellung">
        <div className="space-y-1">
          <button className="flex min-h-[44px] w-full items-center justify-between" onClick={() => setDunkel(!dunkel)} role="switch" aria-checked={dunkel}>
            <span className="flex items-center gap-2 text-sm"><Icon name={dunkel ? 'moon' : 'sun'} /> Dunkelmodus</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${dunkel ? 'bg-brand-600 text-white' : 'bg-black/10'}`}>{dunkel ? 'an' : 'aus'}</span>
          </button>
          <button className="flex min-h-[44px] w-full items-center justify-between" onClick={() => setReduziert(!reduziert)} role="switch" aria-checked={reduziert}>
            <span className="text-sm">Animationen reduzieren</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${reduziert ? 'bg-brand-600 text-white' : 'bg-black/10'}`}>{reduziert ? 'an' : 'aus'}</span>
          </button>
        </div>
      </Card>

      <Card titel="Spielstände" aktion={<span className="muted text-xs">Autosave nach jedem Quartal</span>}>
        <ul className="divide-y divide-[var(--line)]">
          {slots.map((s) => (
            <li key={String(s.slot)} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{s.slot === 'auto' ? 'Autosave' : `Platz ${s.slot}`}</div>
                <div className="muted truncate text-xs">
                  {s.belegt ? `${s.firma} · ${quartalLabel(s.quartal ?? 0)} · ${s.gespeichert ? new Date(s.gespeichert).toLocaleString('de-DE') : ''}` : 'leer'}
                </div>
              </div>
              <div className="flex gap-2">
                {s.slot !== 'auto' && (
                  <button className="btn-ghost" onClick={async () => { await speichereSlot(s.slot, `${state.unternehmen.name} – ${quartalLabel(state.quartal)}`); lade(); }}>Speichern</button>
                )}
                <button className="btn-ghost" disabled={!s.belegt} onClick={async () => { if (window.confirm('Aktuellen Spielstand durch diesen ersetzen?')) await ladeSlot(s.slot); }}>Laden</button>
                {s.slot !== 'auto' && s.belegt && (
                  <button className="btn-ghost" aria-label="Spielstand löschen" onClick={async () => { await loeschen(s.slot); lade(); }}>×</button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="muted mt-2 text-xs">{SLOT_ANZAHL} Speicherplätze liegen lokal in diesem Browser. Zum Übertragen auf ein anderes Gerät nutze den Datei-Export.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={exportieren}>Als Datei exportieren</button>
          <button className="btn-ghost" onClick={() => datei.current?.click()}>Datei importieren</button>
          <input ref={datei} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void importieren(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </Card>

      <Card titel="Historie – zurückspringen">
        {historie.length === 0 ? (
          <p className="muted text-sm">Noch keine abgeschlossenen Quartale.</p>
        ) : (
          <>
            <p className="muted mb-2 text-xs">Springt zu einem früheren Quartal und startet dort einen neuen Zweig – ideal, um riskante Strategien auszuprobieren.</p>
            <div className="flex flex-wrap gap-2">
              {historie.map((h, i) => (
                <button key={i} className="btn-ghost" onClick={() => { if (window.confirm(`Zurück zu ${quartalLabel(h.report.quartal)}? Spätere Quartale gehen im aktuellen Zweig verloren (Spielstand vorher speichern).`)) zurueck(i); }}>
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
