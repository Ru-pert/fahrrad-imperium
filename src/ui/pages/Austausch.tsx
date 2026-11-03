import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { quartalLabel } from '../../engine';
import { erzeugeStartZeitung } from '../../engine/zeitung';
import { ANLEITUNG_FUER_CLAUDE } from '../../io/anleitung';
import { entscheidungenAlsJson } from '../../io/decisionsJson';
import { lagebericht } from '../../io/exportState';
import { importiereEntscheidungen, type ImportErgebnis } from '../../io/importDecisions';
import { zeitungAlsText } from '../../io/newspaperText';
import { useGame } from '../../store/gameStore';
import { Card, Icon, IconBadge } from '../components/ui';
import { useLetzterBericht } from '../hooks';

function Schritt({ nr, titel, text, children }: { nr: number; titel: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{nr}</div>
      <div className="flex-1">
        <div className="font-semibold">{titel}</div>
        <div className="muted text-sm">{text}</div>
        {children && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function Austausch() {
  const state = useGame((s) => s.state)!;
  const entwurf = useGame((s) => s.entwurf)!;
  const aendere = useGame((s) => s.aendereEntwurf);
  const gehe = useGame((s) => s.gehe);
  const hinweis = useGame((s) => s.hinweis);
  const letzter = useLetzterBericht();
  const [text, setText] = useState('');
  const [ergebnis, setErgebnis] = useState<ImportErgebnis | null>(null);
  const [vorschau, setVorschau] = useState<'lagebericht' | 'zeitung' | 'anleitung' | null>(null);

  const zeitung = state.zeitung ?? erzeugeStartZeitung(state);
  const lageText = useMemo(() => JSON.stringify(lagebericht(state, letzter, entwurf), null, 2), [state, letzter, entwurf]);
  const zeitungText = useMemo(() => zeitungAlsText(zeitung, state, true), [zeitung, state]);

  const kopiere = async (inhalt: string, was: string) => {
    try {
      await navigator.clipboard.writeText(inhalt);
      hinweis(`${was} kopiert – jetzt im Chat mit Claude einfügen.`);
    } catch {
      hinweis('Kopieren nicht möglich – der Browser hat den Zugriff verweigert.');
    }
  };
  const allesKopieren = () =>
    kopiere(`${ANLEITUNG_FUER_CLAUDE}\n\n--- ZEITUNG ---\n${zeitungText}\n\n--- LAGEBERICHT ---\n\`\`\`json\n${lageText}\n\`\`\``, 'Anleitung, Zeitung und Lagebericht');

  const einfuegen = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      setErgebnis(importiereEntscheidungen(t, state, entwurf));
    } catch {
      hinweis('Zugriff auf die Zwischenablage verweigert – bitte mit ⌘V in das Feld einfügen.');
    }
  };
  const pruefen = () => setErgebnis(importiereEntscheidungen(text, state, entwurf));
  const uebernehmen = () => {
    if (!ergebnis?.entscheidungen) return;
    const neu = ergebnis.entscheidungen;
    aendere((d) => Object.assign(d, neu));
    hinweis(`${ergebnis.aenderungen.length} Änderungen übernommen – prüfe sie in den Entscheidungen und schließe dann das Quartal ab.`);
    setErgebnis(null);
    setText('');
    gehe('entscheidungen');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Austausch mit Claude</h1>
        <p className="muted text-sm">Plane deine Runde gemeinsam mit Claude: Lage kopieren, im Chat besprechen, Claudes Entscheidungs-JSON hier einfügen.</p>
      </div>

      <Card titel="So funktioniert's" icon="info">
        <div className="space-y-4">
          <Schritt nr={1} titel="Lage an Claude geben" text="Kopiert die Anleitung, die aktuelle Zeitung und den Lagebericht in einem Rutsch. In einem neuen Chat einfach einfügen – in einem laufenden Chat reichen Zeitung und Lagebericht.">
            <button className="btn-primary" onClick={allesKopieren}><Icon name="kopieren" className="h-4 w-4" />Alles für Claude kopieren</button>
            <button className="btn-ghost" onClick={() => kopiere(lageText, 'Lagebericht')}>Nur Lagebericht</button>
            <button className="btn-ghost" onClick={() => kopiere(zeitungText, 'Zeitung')}>Nur Zeitung</button>
            <button className="btn-ghost" onClick={() => kopiere(ANLEITUNG_FUER_CLAUDE, 'Anleitung')}>Nur Anleitung</button>
          </Schritt>
          <Schritt nr={2} titel="Mit Claude besprechen" text="Frag nach einer Empfehlung, lass dir die Hebel erklären oder diskutiere Alternativen. Claude antwortet am Ende mit einem Entscheidungs-JSON." />
          <Schritt nr={3} titel="Antwort einfügen und prüfen" text="Die ganze Antwort darf eingefügt werden – Text und Codezäune drumherum werden automatisch entfernt.">
            <button className="btn-primary" onClick={einfuegen}><Icon name="lager" className="h-4 w-4" />Aus Zwischenablage einfügen</button>
          </Schritt>
          <Schritt nr={4} titel="Vergleichen und übernehmen" text={`Du siehst alle Änderungen Alt → Neu. Erst nach deiner Bestätigung werden die Regler gesetzt; abgeschlossen wird ${quartalLabel(state.quartal)} weiterhin von dir.`} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card titel="Antwort von Claude" icon="kopieren">
          <textarea
            className="h-72 w-full rounded-xl border border-[var(--line)] bg-transparent p-3 font-mono text-xs"
            placeholder="Hier die Antwort von Claude einfügen (⌘V) …"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setErgebnis(null);
            }}
          />
          <div className="mt-2 flex gap-2">
            <button className="btn-primary" onClick={pruefen} disabled={!text.trim()}>Prüfen</button>
            <button className="btn-ghost" onClick={() => { setText(''); setErgebnis(null); }} disabled={!text}>Leeren</button>
          </div>
        </Card>

        <Card titel="Prüfergebnis" icon={ergebnis ? (ergebnis.ok ? 'check' : 'warn') : 'qualitaet'} farbe={ergebnis ? (ergebnis.ok ? '#16a34a' : '#dc2626') : undefined}>
          {!ergebnis ? (
            <p className="muted text-sm">Noch nichts geprüft. Füge eine Antwort ein und klicke auf „Prüfen“.</p>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {ergebnis.begruendung && (
                <div className="rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-900/20">
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Begründung von Claude</div>
                  {ergebnis.begruendung}
                </div>
              )}
              {ergebnis.fehler.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-rose-700"><IconBadge name="warn" farbe="#dc2626" groesse="sm" />{ergebnis.fehler.length} Fehler – bitte Claude um Korrektur</div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-rose-800 dark:text-rose-300">{ergebnis.fehler.map((f) => <li key={f}>{f}</li>)}</ul>
                  <button className="btn-ghost mt-2 text-xs" onClick={() => kopiere(`Das JSON hat folgende Fehler, bitte korrigieren:\n- ${ergebnis.fehler.join('\n- ')}`, 'Fehlerliste')}>Fehlerliste für Claude kopieren</button>
                </div>
              )}
              {ergebnis.warnungen.length > 0 && (
                <div>
                  <div className="mb-1 text-sm font-semibold text-amber-700">Hinweise</div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-300">{ergebnis.warnungen.map((w) => <li key={w}>{w}</li>)}</ul>
                </div>
              )}
              {ergebnis.ok && (
                <>
                  <div className="text-sm font-semibold">{ergebnis.aenderungen.length ? `${ergebnis.aenderungen.length} Änderungen` : 'Keine Änderungen gegenüber dem aktuellen Entwurf'}</div>
                  {ergebnis.aenderungen.length > 0 && (
                    <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--line)]">
                      <table className="tnum w-full text-sm">
                        <thead className="sticky top-0 bg-[var(--card)]">
                          <tr className="muted text-left text-xs"><th className="p-2">Feld</th><th className="p-2 text-right">Alt</th><th className="p-2" /><th className="p-2">Neu</th></tr>
                        </thead>
                        <tbody>
                          {ergebnis.aenderungen.map((a) => (
                            <tr key={a.feld} className="border-t border-[var(--line)]">
                              <td className="p-2">{a.feld}</td>
                              <td className="muted p-2 text-right line-through">{a.alt}</td>
                              <td className="p-2 text-brand-600">→</td>
                              <td className="p-2 font-semibold">{a.neu}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button className="btn-primary w-full" onClick={uebernehmen}><Icon name="check" className="h-4 w-4" />Übernehmen und zu den Entscheidungen</button>
                </>
              )}
            </motion.div>
          )}
        </Card>
      </div>

      <Card titel="Was wird kopiert?" icon="bericht" aktion={<button className="btn-ghost text-xs" onClick={() => kopiere(JSON.stringify(entscheidungenAlsJson(entwurf), null, 2), 'Aktueller Entwurf als JSON')}>Aktuellen Entwurf als JSON kopieren</button>}>
        <div className="mb-2 flex gap-2">
          {(['lagebericht', 'zeitung', 'anleitung'] as const).map((v) => (
            <button key={v} className={`btn ${vorschau === v ? 'bg-brand-600 text-white' : 'border border-[var(--line)]'}`} onClick={() => setVorschau(vorschau === v ? null : v)}>
              {v === 'lagebericht' ? 'Lagebericht (JSON)' : v === 'zeitung' ? 'Zeitung (Text)' : 'Anleitung für Claude'}
            </button>
          ))}
        </div>
        {vorschau && (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">
            {vorschau === 'lagebericht' ? lageText : vorschau === 'zeitung' ? zeitungText : ANLEITUNG_FUER_CLAUDE}
          </pre>
        )}
      </Card>
    </div>
  );
}
