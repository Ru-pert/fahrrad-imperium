import { motion } from 'framer-motion';
import {
  BALANCE,
  PRODUKTE,
  SPIELER_ID,
  aktiveProdukte,
  technikAusStock,
  type GameState,
  type ProductId,
  type QuarterReport,
  type WerkBericht,
} from '../../engine';
import { lernkurve, lohnProMitarbeiter } from '../../engine/production';
import { eur, fmt0, pct } from '../format';
import { BikeIcon, PRODUKT_FARBE } from './BikeIcon';
import { Aufklapper, Info } from './ui';

/** Wie viele Räder eines Typs passen in eine Stundenmenge? */
export function raederFuerStunden(state: GameState, p: ProductId, stunden: number): number {
  const lk = lernkurve(state.produkte[p]!.kumMenge);
  return Math.floor(stunden / (PRODUKTE[p].montageStunden * lk));
}

function Balken({ label, wert, max, farbe, schraffiert, extra }: { label: string; wert: number; max: number; farbe: string; schraffiert?: number; extra?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tnum muted">{fmt0(wert)} Std.{extra ? ` ${extra}` : ''}</span>
      </div>
      <div className="relative mt-1 h-4 overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
        <motion.div className="absolute inset-y-0 left-0 rounded-md" style={{ background: farbe }} initial={false} animate={{ width: `${(wert / max) * 100}%` }} transition={{ duration: 0.4 }} />
        {schraffiert !== undefined && (
          <motion.div
            className="absolute inset-y-0 rounded-r-md opacity-70"
            style={{ background: `repeating-linear-gradient(45deg, ${farbe}, ${farbe} 4px, transparent 4px, transparent 8px)` }}
            initial={false}
            animate={{ left: `${(wert / max) * 100}%`, width: `${((schraffiert - wert) / max) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Bild der Werkskapazität: Maschinenstunden und Personalstunden; der kleinere Wert ist der Engpass.
 * Überstunden (bis +15 %) sind schraffiert, die benötigten Stunden als Linie eingezeichnet.
 */
export function KapazitaetsGrafik({ state, wr }: { state: GameState; wr: WerkBericht }) {
  const mitUeber = wr.personalStundenRegulaer * (1 + BALANCE.personal.ueberstundenMax);
  const max = Math.max(wr.maschinenStunden, mitUeber, wr.benoetigteStunden) * 1.08 || 1;
  const engpassPersonal = mitUeber < wr.maschinenStunden;
  const status: 'ok' | 'ueber' | 'voll' = wr.gekuerzt ? 'voll' : wr.ueberstunden > 0 ? 'ueber' : 'ok';
  const farbe = { ok: 'bg-emerald-500', ueber: 'bg-amber-500', voll: 'bg-rose-500' }[status];
  const produkte = aktiveProdukte(state);
  const auslastung = wr.maxStunden > 0 ? wr.benoetigteStunden / wr.maxStunden : 0;
  return (
    <Aufklapper
      merken="kapazitaet"
      standardOffen={status !== 'ok'}
      icon={<span className={`h-3 w-3 shrink-0 rounded-full ${farbe}`} />}
      titel={status === 'ok' ? 'Kapazität reicht ohne Überstunden' : status === 'ueber' ? `Überstunden nötig: ${fmt0(wr.ueberstunden)} Std.` : 'Kapazität überschritten – Produktion wird gekürzt!'}
      zusammenfassung={`Auslastung ${pct(auslastung, 0)} · Engpass ${engpassPersonal ? 'Personal' : 'Maschinen'}`}
    >
      <div className="space-y-2.5 pt-1">
        <Balken label="Maschinen (Fertigungslinien)" wert={wr.maschinenStunden} max={max} farbe="#64748b" />
        <Balken label="Personal" wert={wr.personalStundenRegulaer} schraffiert={mitUeber} max={max} farbe="#0d9488" extra={`(+${fmt0(mitUeber - wr.personalStundenRegulaer)} Überstunden)`} />
        <div>
          <div className="flex justify-between text-xs">
            <span className="font-medium">Benötigt für deine Produktion</span>
            <span className="tnum muted">{fmt0(wr.benoetigteStunden)} Std.</span>
          </div>
          <div className="relative mt-1 h-4 rounded-md bg-black/5 dark:bg-white/10">
            <motion.div className={`absolute inset-y-0 left-0 rounded-md ${farbe}`} initial={false} animate={{ width: `${Math.min(100, (wr.benoetigteStunden / max) * 100)}%` }} transition={{ duration: 0.4 }} />
            <div className="absolute inset-y-[-4px] w-0.5 bg-[var(--ink)]" style={{ left: `${(wr.maxStunden / max) * 100}%` }} title="Grenze" />
          </div>
          <div className="muted mt-0.5 flex items-center gap-1 text-[11px]">Strich = nutzbare Grenze ({fmt0(wr.maxStunden)} Std.)
            <Info titel="Wie entsteht die Kapazität?">
              <p>Produzieren kannst du nur so viel, wie <strong>Maschinen</strong> (Fertigungslinien) und <strong>Personal</strong> gleichzeitig hergeben – der kleinere Wert ist der Engpass.</p>
              <p className="mt-1">Überstunden (schraffiert, bis +15 %) kosten 50 % Lohnzuschlag und 20.000 € Schichtkosten, senken die Qualität um 0,03 und erhöhen die Nacharbeit. Reicht auch das nicht, kürzt die Engine die Produktion anteilig.</p>
            </Info>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-black/5 p-2 text-xs dark:bg-white/5">
        <strong>{engpassPersonal ? 'Mehr Personal erhöht die Kapazität.' : 'Mehr Personal hilft nicht – du brauchst zusätzliche Fertigungslinien.'}</strong>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Maximal möglich:</span>
          {produkte.map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && <span className="muted">oder</span>}
              <BikeIcon produkt={p} className="h-4 w-6" />
              <strong className="tnum">{fmt0(raederFuerStunden(state, p, wr.maxStunden))}</strong> {PRODUKTE[p].name}
            </span>
          ))}
        </div>
      </div>
    </Aufklapper>
  );
}

/** Was bringt eine weitere Person in der Produktion? */
export function PersonalErklaerung({ state, wr }: { state: GameState; wr?: WerkBericht }) {
  const w = state.werke[0];
  const stundenProKopf = BALANCE.personal.stundenProMitarbeiter * (wr?.produktivitaetI ?? w.motivation * w.kompetenz);
  const mitUeber = (wr?.personalStundenRegulaer ?? 0) * (1 + BALANCE.personal.ueberstundenMax);
  const engpassPersonal = wr ? mitUeber < wr.maschinenStunden : true;
  const p0 = aktiveProdukte(state)[0];
  return (
    <Aufklapper
      merken="personal-erklaerung"
      className="my-2"
      titel="Was bringt eine Person mehr?"
      zusammenfassung={p0 ? `≈ ${fmt0(raederFuerStunden(state, p0, stundenProKopf))} ${PRODUKTE[p0].name} je Quartal` : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>≈ <strong className="tnum">{fmt0(stundenProKopf)} Std.</strong> je Quartal =</span>
        {aktiveProdukte(state).map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && <span className="muted">oder</span>}
            <BikeIcon produkt={p} className="h-4 w-6" />
            <strong className="tnum">{fmt0(raederFuerStunden(state, p, stundenProKopf))}</strong>
          </span>
        ))}
      </div>
      <div className="muted mt-1 text-xs">Kosten: {eur(lohnProMitarbeiter(w))} Lohn je Quartal + 3.000 € einmalig.</div>
      <div className={`mt-1 text-xs font-semibold ${engpassPersonal ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
        {engpassPersonal ? '→ Personal ist dein Engpass: Einstellen erhöht die Kapazität.' : '→ Die Maschinen sind voll: Mehr Personal bringt erst mit neuen Linien etwas.'}
      </div>
    </Aufklapper>
  );
}

/** Technikvergleich je Produkt und Wirkung des F&E-Budgets */
export function TechnikVergleich({ state, p, fe, vorschau }: { state: GameState; p: ProductId; fe: number; vorschau: QuarterReport | null }) {
  const seg = vorschau?.segmente.find((s) => s.produkt === p && s.region === 'DE');
  if (!seg) return null;
  const firmen = [
    { id: SPIELER_ID, name: 'Du', farbe: state.unternehmen.farbe },
    ...Object.values(state.konkurrenten).filter((k) => k.status === 'aktiv').map((k) => ({ id: k.id, name: k.name.replace(' GmbH', '').replace(' & Söhne', ''), farbe: k.farbe })),
  ].filter((f) => seg.technikIndex[f.id] !== undefined);
  const werte = firmen.map((f) => ({ ...f, ti: seg.technikIndex[f.id] }));
  const eigen = seg.technikIndex[SPIELER_ID] ?? 105;
  const stock = state.produkte[p]!.fe;
  const tJetzt = technikAusStock(stock);
  const tNeu = technikAusStock((1 - BALANCE.technik.veralterung) * stock + fe);
  const tiNeu = eigen + BALANCE.technik.tiSteigung * (tNeu - tJetzt);
  const min = 85;
  const max = Math.max(...werte.map((w) => w.ti), tiNeu) + 3;
  const pos = (x: number) => `${((x - min) / (max - min)) * 100}%`;
  const erhalt = Math.round(BALANCE.technik.veralterung * stock);
  const platz = [...werte].sort((a, b) => b.ti - a.ti).findIndex((w) => w.id === SPIELER_ID) + 1;
  return (
    <Aufklapper
      merken="technikvergleich"
      className="mt-1"
      icon={<BikeIcon produkt={p} className="h-4 w-6" />}
      titel={`Technikvergleich ${PRODUKTE[p].name}`}
      zusammenfassung={<>Index {fmt0(eigen)} → <strong className={tiNeu < eigen ? 'text-rose-600' : 'text-emerald-600'}>{fmt0(tiNeu)}</strong> · Platz {platz} von {werte.length}</>}
    >
      <div className="space-y-1 text-xs">
        {[...werte.map((w) => ({ ...w, neu: false })), { id: 'neu', name: 'Du (nächstes Q.)', farbe: state.unternehmen.farbe, ti: tiNeu, neu: true }]
          .sort((a, b) => b.ti - a.ti)
          .map((w) => (
            <div key={w.id} className="grid grid-cols-[92px_1fr_32px] items-center gap-2">
              <span className={`truncate ${w.id === SPIELER_ID ? 'font-bold' : ''}`}>{w.name}</span>
              <div className="relative h-3 rounded bg-black/5 dark:bg-white/10">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded"
                  style={w.neu ? { background: `repeating-linear-gradient(45deg, ${w.farbe}, ${w.farbe} 3px, transparent 3px, transparent 6px)`, border: `1px dashed ${w.farbe}` } : { background: w.farbe }}
                  initial={false}
                  animate={{ width: pos(w.ti) }}
                  transition={{ duration: 0.3 }}
                />
                <div className="absolute inset-y-[-3px] w-0.5 bg-rose-500" style={{ left: pos(100) }} />
              </div>
              <strong className="tnum text-right">{fmt0(w.ti)}</strong>
            </div>
          ))}
        <div className="muted flex items-center gap-1 text-[11px]">Roter Strich = 100 Punkte (Grenze der Marktfähigkeit)
          <Info titel="Was bringt Technik?">
            Bessere Technik als der Durchschnitt erhöht die Nachfrage – beim {PRODUKTE[p].name} um rund {pct(Math.exp(PRODUKTE[p].tau / BALANCE.technik.tiSteigung * 10) - 1, 0)} je 10 Punkte Vorsprung. Unter 100 Punkten gilt das Rad als veraltet, der Absatz bricht ein. Der Markt verbessert sich jedes Quartal; wer nicht forscht, fällt zurück.
          </Info>
        </div>
      </div>
      <div className="mt-2 text-xs">
        Mit diesem Budget: Technikindex nächstes Quartal ≈ <strong className="tnum">{fmt0(tiNeu)}</strong> (schraffierter Balken).{' '}
        {fe < erhalt ? <span className="text-rose-600 dark:text-rose-400">Unter {eur(erhalt)} veraltet deine Technik.</span> : <span>Zum Halten reichen etwa {eur(erhalt)}.</span>}
      </div>
      <span className="hidden" style={{ color: PRODUKT_FARBE[p] }} />
    </Aufklapper>
  );
}
