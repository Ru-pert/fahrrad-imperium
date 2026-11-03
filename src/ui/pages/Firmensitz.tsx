import { useState } from 'react';
import { HQ_EXTRAS, HQ_STUFEN, quartalLabel } from '../../engine';
import { hqImageBonus } from '../../engine/simulate';
import { useGame } from '../../store/gameStore';
import { eur, eurKompakt, fmt1 } from '../format';
import { Card } from '../components/ui';
import { Hauptquartier } from '../iso/Hauptquartier';

export function Firmensitz() {
  const state = useGame((s) => s.state)!;
  const historie = useGame((s) => s.historie);
  const entwurf = useGame((s) => s.entwurf)!;
  const aendere = useGame((s) => s.aendereEntwurf);
  const fs = state.unternehmen.firmensitz;
  const [ansicht, setAnsicht] = useState<number | null>(null);
  const vorher = historie[historie.length - 1]?.stateVor.unternehmen.firmensitz;
  const neu = !!vorher && vorher.stufe !== fs.stufe;
  const vorgemerkt = entwurf.firmensitz.kaufen;
  const naechste = HQ_STUFEN[fs.stufe + 1];
  const kostenVorgemerkt = vorgemerkt.reduce((s, id) => s + (HQ_STUFEN.find((x) => x.id === id)?.kosten ?? HQ_EXTRAS.find((x) => x.id === id)?.kosten ?? 0), 0);

  const umschalten = (id: string) =>
    aendere((d) => {
      d.firmensitz.kaufen = d.firmensitz.kaufen.includes(id) ? d.firmensitz.kaufen.filter((x) => x !== id) : [...d.firmensitz.kaufen, id];
    });

  const zeigeStufe = ansicht ?? fs.stufe;
  const zeigeExtras = ansicht === null ? [...fs.extras, ...vorgemerkt.filter((id) => HQ_EXTRAS.some((x) => x.id === id))] : fs.extras;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Firmensitz</h1>
        <p className="muted text-sm">
          Reine Prestige-Belohnung mit kleinem Imagebonus. Jede Stufe setzt die vorherige voraus, wird als Investition aktiviert (Abschreibung 80 Quartale) und kostet 1 % ihres Werts je Quartal Unterhalt.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card
          titel={ansicht !== null ? `Vorschau: ${HQ_STUFEN[ansicht].name}` : `${HQ_STUFEN[fs.stufe].name} – ${HQ_STUFEN[fs.stufe].optik}`}
          aktion={ansicht !== null ? <button className="btn-ghost" onClick={() => setAnsicht(null)}>Zurück zu meinem Firmensitz</button> : undefined}
        >
          <Hauptquartier stufe={zeigeStufe} extras={zeigeExtras} firma={state.unternehmen.name} farbe={state.unternehmen.farbe} neu={ansicht === null && neu} />
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div><div className="muted text-xs">Buchwert</div><strong className="tnum">{eur(fs.buchwert)}</strong></div>
            <div><div className="muted text-xs">Unterhalt je Quartal</div><strong className="tnum">{eur(fs.buchwert * 0.01)}</strong></div>
            <div><div className="muted text-xs">Imagebonus</div><strong className="tnum">+{fmt1(hqImageBonus(state))} Punkte</strong></div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card titel="Ausbaustufen">
            <ol className="space-y-2">
              {HQ_STUFEN.map((s, i) => {
                const erreicht = i <= fs.stufe;
                const istNaechste = i === fs.stufe + 1;
                const markiert = vorgemerkt.includes(s.id);
                return (
                  <li key={s.id} className={`rounded-xl border p-2.5 text-sm ${markiert ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-[var(--line)]'} ${!erreicht && !istNaechste ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{erreicht ? '✓ ' : ''}{s.name}</div>
                        <div className="muted text-xs">{s.optik}</div>
                      </div>
                      <div className="tnum text-right text-xs">
                        <div className="font-semibold">{s.kosten ? eurKompakt(s.kosten) : 'Start'}</div>
                        <div className="muted">Image +{s.imageBonus.toString().replace('.', ',')}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button className="btn-ghost flex-1 text-xs" onClick={() => setAnsicht(i)}>Ansehen</button>
                      {istNaechste && (
                        <button className={`btn flex-1 text-xs ${markiert ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => umschalten(s.id)}>
                          {markiert ? '✓ Vorgemerkt' : 'Kaufen'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {!naechste && <p className="muted mt-2 text-sm">Höchste Stufe erreicht – Glückwunsch!</p>}
          </Card>

          <Card titel="Extras">
            <p className="muted mb-2 text-xs">Beliebig kombinierbar; zusammen höchstens +2 Image.</p>
            <div className="grid grid-cols-2 gap-2">
              {HQ_EXTRAS.map((x) => {
                const besitz = fs.extras.includes(x.id);
                const markiert = vorgemerkt.includes(x.id);
                return (
                  <button
                    key={x.id}
                    disabled={besitz}
                    onClick={() => umschalten(x.id)}
                    className={`rounded-xl border p-2 text-left text-xs ${besitz ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : markiert ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-[var(--line)] hover:bg-black/5'}`}
                  >
                    <div className="font-semibold">{besitz ? '✓ ' : markiert ? '🛒 ' : ''}{x.name}</div>
                    <div className="tnum muted">{eurKompakt(x.kosten)}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          {vorgemerkt.length > 0 && (
            <div className={`rounded-xl border p-3 text-sm ${kostenVorgemerkt > state.finanzen.kasse ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'}`}>
              Vorgemerkt für {quartalLabel(state.quartal)}: <strong>{eurKompakt(kostenVorgemerkt)}</strong> – wird beim Quartalsabschluss gekauft.
              {kostenVorgemerkt > state.finanzen.kasse && ' Achtung: mehr als in der Kasse ist!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
