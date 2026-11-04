import { ERFOLGE, quartalLabel } from '../../engine';
import { useGame } from '../../store/gameStore';
import { Abzeichen } from '../components/Abzeichen';
import { ladeBestenliste } from '../../store/bestenliste';
import { Rangmedaille, stufenIndex } from '../components/Endabrechnung';
import { Card } from '../components/ui';
import { Leer } from '../components/Leer';
import { fmt0 } from '../format';

function Bestenliste() {
  const liste = ladeBestenliste();
  return (
    <Card titel="Bestenliste abgeschlossener Spiele" icon="erfolge" farbe="#ca8a04">
      {liste.length === 0 ? (
        <Leer titel="Noch kein Spiel gewertet">Nach 15 Spieljahren (60 Quartalen) gibt es die Endabrechnung mit Punkten und Rangstufe – sie landet dann hier.</Leer>
      ) : (
        <ol className="space-y-1.5">
          {liste.map((e, i) => (
            <li key={`${e.datum}-${i}`} className="grid grid-cols-[28px_40px_1fr_auto_70px] items-center gap-3 rounded-lg px-2 py-1 text-sm odd:bg-black/[0.02] dark:odd:bg-white/[0.03]">
              <span className="muted tnum">{i + 1}.</span>
              <Rangmedaille index={stufenIndex(e.punkte)} pleite={e.pleite} className="h-9 w-9" />
              <span className="flex items-center gap-2 truncate font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: e.farbe }} />{e.firma}</span>
              <span className="muted text-xs">{e.stufe} · {e.schwierigkeit} · {new Date(e.datum).toLocaleDateString('de-DE')}</span>
              <span className="tnum text-right font-bold">{fmt0(e.punkte)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function Erfolge() {
  const state = useGame((s) => s.state)!;
  const erreicht = new Map((state.erfolge ?? []).map((e) => [e.id, e.quartal]));
  const anzahl = erreicht.size;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Erfolge</h1>
        <p className="muted text-sm">{anzahl} von {ERFOLGE.length} Abzeichen gesammelt.</p>
        <div className="mt-2 h-3 w-full max-w-md overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all" style={{ width: `${(anzahl / ERFOLGE.length) * 100}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {ERFOLGE.map((e) => {
          const q = erreicht.get(e.id);
          const hat = q !== undefined;
          return (
            <div key={e.id} className={`card flex flex-col items-center p-4 text-center transition hover:-translate-y-1 hover:shadow-md ${hat ? '' : 'opacity-70'}`}>
              <Abzeichen e={e} erreicht={hat} groesse={84} />
              <div className="mt-2 font-bold">{e.name}</div>
              <div className="muted text-xs">{e.bedingung}</div>
              <div className={`mt-2 rounded-full px-2 py-0.5 text-xs font-semibold ${hat ? 'bg-emerald-100 text-emerald-900' : e.spaeter ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'}`}>
                {hat ? `erreicht in ${quartalLabel(q)}` : e.spaeter ? 'kommt in einer späteren Ausbaustufe' : 'noch offen'}
              </div>
            </div>
          );
        })}
      </div>
      <Bestenliste />
    </div>
  );
}
