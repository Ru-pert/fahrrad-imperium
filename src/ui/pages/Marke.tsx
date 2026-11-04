import { motion } from 'framer-motion';
import { useState } from 'react';
import { PRODUKT_IDS, type CorporateIdentity } from '../../engine';
import { useGame } from '../../store/gameStore';
import { BikeBild } from '../components/BikeIcon';
import { CI_FARBEN, CI_FARBEN2, FirmenLogo, LOGO_FORMEN, LOGO_SYMBOLE, SLOGANS, ciVon } from '../components/FirmenLogo';
import { Card, Icon } from '../components/ui';
import { klang } from '../klang';

const FORM_NAME: Record<CorporateIdentity['form'], string> = { kreis: 'Kreis', schild: 'Wappen', raute: 'Raute', quadrat: 'Kachel', sechseck: 'Sechseck' };

function Auswahl({ aktiv, onClick, children, label }: { aktiv: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} aria-pressed={aktiv} title={label} className={`grid min-w-0 place-items-center rounded-xl border-2 p-1 transition ${aktiv ? 'border-brand-600 bg-brand-600/10 shadow-sm' : 'border-transparent hover:border-[var(--line)]'}`}>
      {children}
    </button>
  );
}

/** Corporate Identity: Logo, Firmenfarben und Slogan – mit Vorschau auf Rad, Laden und Visitenkarte */
export function Marke() {
  const state = useGame((s) => s.state)!;
  const setzeCI = useGame((s) => s.setzeCI);
  const ci = ciVon(state);
  const name = state.unternehmen.name;
  const [slogan, setSlogan] = useState(ci.slogan);
  const aendere = (teil: Partial<CorporateIdentity>) => {
    setzeCI({ ...ci, ...teil });
    klang.plopp();
  };
  const produkt = PRODUKT_IDS.find((p) => state.produkte[p]) ?? 'stadtrad';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-page">Marke & Logo</h1>
        <p className="muted text-sm">Gib deinem Unternehmen ein Gesicht. Logo, Farben und Slogan erscheinen auf deinen Rädern, in der Zeitung, an der Börse und im Cockpit. Änderungen sind kostenlos und wirken sofort.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        {/* Vorschau */}
        <div className="min-w-0 space-y-4">
          <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${ci.farbe}, ${ci.farbe}cc 55%, #0f172a)` }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-20" style={{ background: ci.farbe2 }} />
            <div className="flex items-center gap-4">
              <motion.div key={`${ci.symbol}-${ci.form}-${ci.farbe}-${ci.farbe2}`} initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
                <FirmenLogo ci={ci} name={name} className="h-24 w-24 drop-shadow-xl sm:h-28 sm:w-28" />
              </motion.div>
              <div className="min-w-0">
                <div className="font-display break-words text-2xl font-extrabold leading-tight sm:text-3xl">{name}</div>
                <div className="mt-1 text-lg italic opacity-90">„{ci.slogan}“</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card titel="Auf dem Rad" icon="rad" farbe={ci.farbe}>
              <div className="grid place-items-center rounded-xl bg-gradient-to-b from-slate-50 to-slate-200 py-2 dark:from-slate-800 dark:to-slate-900">
                <BikeBild produkt={produkt} className="h-32 w-52" farbe={ci.rahmenInFirmenfarbe ? ci.farbe : undefined} logo={ci} firma={name} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={!!ci.rahmenInFirmenfarbe} onChange={(e) => aendere({ rahmenInFirmenfarbe: e.target.checked })} />
                Alle Räder in der Firmenfarbe lackieren
              </label>
            </Card>
            <Card titel="Ladenschild" icon="firmensitz" farbe={ci.farbe}>
              <svg viewBox="0 0 240 150" className="w-full rounded-xl" role="img" aria-label="Ladenschild">
                <rect width="240" height="150" fill="#e7e5e4" />
                <rect x="20" y="40" width="200" height="110" fill="#f5f5f4" stroke="#a8a29e" />
                <rect x="20" y="22" width="200" height="34" rx="4" fill={ci.farbe} />
                <FirmenLogo ci={{ ...ci, farbe: ci.farbe2, farbe2: ci.farbe }} name={name} x={26} y={25} groesse={28} />
                <text x="60" y="44" fontSize="13" fontWeight="800" fill={ci.farbe2} fontFamily="'Bricolage Grotesque Variable', system-ui">{name.length > 22 ? `${name.slice(0, 21)}…` : name}</text>
                <rect x="34" y="70" width="80" height="70" fill="#bae6fd" stroke="#94a3b8" />
                <rect x="128" y="70" width="40" height="80" fill="#78716c" />
                <rect x="180" y="70" width="28" height="44" fill="#bae6fd" stroke="#94a3b8" />
                <g transform="translate(46 96) scale(0.9)"><circle r="12" fill="none" stroke={ci.farbe} strokeWidth="3" /><circle cx="40" r="12" fill="none" stroke={ci.farbe} strokeWidth="3" /><path d="M0 0 L14 -18 L32 -18 L40 0 M14 -18 L20 0 L32 -18" stroke={ci.farbe} strokeWidth="3" fill="none" /></g>
                <rect x="20" y="146" width="200" height="4" fill="#a8a29e" />
              </svg>
            </Card>
          </div>
          <Card titel="Visitenkarte" icon="koffer" farbe={ci.farbe}>
            <div className="mx-auto flex max-w-sm items-stretch overflow-hidden rounded-xl border border-[var(--line)] bg-white text-slate-900 shadow-md">
              <div className="grid w-24 place-items-center" style={{ background: ci.farbe }}>
                <FirmenLogo ci={ci} name={name} className="h-16 w-16" />
              </div>
              <div className="flex-1 p-3 text-sm">
                <div className="font-display font-bold">Du</div>
                <div className="text-xs text-slate-500">Geschäftsführung · {name}</div>
                <div className="mt-2 text-xs italic" style={{ color: ci.farbe }}>{ci.slogan}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Editor */}
        <div className="min-w-0 space-y-4">
          <Card titel="Symbol" icon="logo" farbe={ci.farbe}>
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
              {LOGO_SYMBOLE.map((s) => (
                <Auswahl key={s.id} aktiv={ci.symbol === s.id} onClick={() => aendere({ symbol: s.id })} label={s.name}>
                  <FirmenLogo ci={{ ...ci, symbol: s.id }} name={name} className="h-12 w-12" />
                  <span className="mt-0.5 text-[10px]">{s.name}</span>
                </Auswahl>
              ))}
            </div>
          </Card>
          <Card titel="Form" icon="logo" farbe={ci.farbe}>
            <div className="grid grid-cols-5 gap-1">
              {LOGO_FORMEN.map((f) => (
                <Auswahl key={f} aktiv={ci.form === f} onClick={() => aendere({ form: f })} label={FORM_NAME[f]}>
                  <FirmenLogo ci={{ ...ci, form: f }} name={name} className="h-11 w-11" />
                  <span className="mt-0.5 text-[10px]">{FORM_NAME[f]}</span>
                </Auswahl>
              ))}
            </div>
          </Card>
          <Card titel="Farben" icon="logo" farbe={ci.farbe}>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Firmenfarbe</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {CI_FARBEN.map((f) => (
                <button key={f} aria-label={`Firmenfarbe ${f}`} aria-pressed={ci.farbe === f} onClick={() => aendere({ farbe: f })} className={`h-9 w-9 rounded-full border-2 transition ${ci.farbe === f ? 'scale-110 border-[var(--ink)] shadow-md' : 'border-white shadow-sm'}`} style={{ background: f }} />
              ))}
              <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-[var(--line)]" title="Eigene Farbe">
                <input type="color" value={ci.farbe} onChange={(e) => setzeCI({ ...ci, farbe: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Eigene Firmenfarbe" />
                <Icon name="plus" className="m-auto mt-1.5 h-4 w-4" />
              </label>
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Akzentfarbe (Symbol)</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {CI_FARBEN2.map((f) => (
                <button key={f} aria-label={`Akzentfarbe ${f}`} aria-pressed={ci.farbe2 === f} onClick={() => aendere({ farbe2: f })} className={`h-9 w-9 rounded-full border-2 transition ${ci.farbe2 === f ? 'scale-110 border-[var(--ink)] shadow-md' : 'border-slate-300'}`} style={{ background: f }} />
              ))}
            </div>
          </Card>
          <Card titel="Slogan" icon="marketing" farbe={ci.farbe}>
            <div className="flex gap-2">
              <input
                className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3"
                value={slogan}
                maxLength={48}
                onChange={(e) => setSlogan(e.target.value)}
                onBlur={() => slogan.trim() && slogan !== ci.slogan && aendere({ slogan: slogan.trim() })}
                onKeyDown={(e) => e.key === 'Enter' && slogan.trim() && aendere({ slogan: slogan.trim() })}
                aria-label="Slogan"
              />
              <button
                className="btn-ghost"
                title="Zufälliger Slogan"
                onClick={() => {
                  const neu = SLOGANS.filter((x) => x !== ci.slogan)[Math.floor(Math.random() * (SLOGANS.length - 1))];
                  setSlogan(neu);
                  aendere({ slogan: neu });
                }}
              >
                <Icon name="stern" className="h-4 w-4" /> Idee
              </button>
            </div>
            <p className="muted mt-2 text-xs">Höchstens 48 Zeichen. Eingabetaste oder Klick daneben übernimmt den Slogan.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
