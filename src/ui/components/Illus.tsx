import type { ReactNode } from 'react';

/**
 * Eigene Symbolsprache des Spiels: Duotone-Illustrationen (Kontur in currentColor, Flächen halbtransparent).
 * 24×24-Raster, dicke runde Linien – passend zu den Fahrrad-Zeichnungen.
 */
const F = { fill: 'currentColor', fillOpacity: 0.2 } as const;
const H = { fill: 'currentColor', fillOpacity: 0.45 } as const;

const ILLUS: Record<string, ReactNode> = {
  cockpit: (
    <>
      <path d="M3 15a9 9 0 0 1 18 0v3H3z" {...F} />
      <path d="M3 18v-3a9 9 0 0 1 18 0v3" />
      <path d="M12 15l4.5-5" strokeWidth="2.2" />
      <circle cx="12" cy="15" r="1.8" {...H} />
      <path d="M6.5 11.5l1 .8M12 7.5v1.3M17.5 11.5l-1 .8" />
    </>
  ),
  zeitung: (
    <>
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2z" {...F} />
      <path d="M17 8h3v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5h13v12a2 2 0 0 0 2 2" />
      <rect x="7" y="8" width="7" height="4" rx=".6" {...H} />
      <path d="M7 15h7" />
    </>
  ),
  bericht: (
    <>
      <path d="M6 3h9l4 4v14H6z" {...F} />
      <path d="M15 3H6v18h13V7z M15 3v4h4" />
      <path d="M9 17v-3M12 17v-6M15 17v-4" strokeWidth="2.2" />
    </>
  ),
  entscheidungen: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.3" {...H} />
      <circle cx="15" cy="12" r="2.3" {...H} />
      <circle cx="7" cy="17" r="2.3" {...H} />
      <circle cx="9" cy="7" r="2.3" />
      <circle cx="15" cy="12" r="2.3" />
      <circle cx="7" cy="17" r="2.3" />
    </>
  ),
  markt: (
    <>
      <path d="M3 20l5-6 4 3 8-10v13z" {...F} />
      <path d="M3 20l5-6 4 3 8-10" strokeWidth="2.2" />
      <path d="M15 7h5v5" />
    </>
  ),
  expansion: (
    <>
      <circle cx="12" cy="12" r="9" {...F} />
      <circle cx="12" cy="12" r="9" />
      <path d="M6 7c2 1 3 0 4 2s-1 3 1 4 1 3 0 5M14 4c0 2 2 3 4 3M15 13c1-1 3-1 4 1" />
    </>
  ),
  finanzen: (
    <>
      <path d="M3 9l9-5 9 5z" {...H} />
      <path d="M3 9l9-5 9 5M4 20h16M5 9v9M9.5 9v9M14.5 9v9M19 9v9" />
    </>
  ),
  werke: (
    <>
      <path d="M3 20V10l5 3V10l5 3V6h3l1 4h3v10z" {...F} />
      <path d="M3 20V10l5 3V10l5 3V6h3l1 4h3v10z" />
      <path d="M7 17h2M12 17h2M17 17h1" strokeWidth="2.2" />
    </>
  ),
  werk: (
    <>
      <path d="M3 20V10l5 3V10l5 3V6h3l1 4h3v10z" {...F} />
      <path d="M3 20V10l5 3V10l5 3V6h3l1 4h3v10z" />
    </>
  ),
  firmensitz: (
    <>
      <path d="M5 21V8l7-4 7 4v13z" {...F} />
      <path d="M5 21V8l7-4 7 4v13M3 21h18" />
      <path d="M10 21v-4h4v4M9 10h1M14 10h1M9 13.5h1M14 13.5h1" />
    </>
  ),
  erfolge: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" {...H} />
      <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8 20h8l-1-3H9z" />
    </>
  ),
  austausch: (
    <>
      <path d="M3 5h12v8H8l-3 3v-3H3z" {...F} />
      <path d="M3 5h12v8H8l-3 3v-3H3z" />
      <path d="M17 9h4v8h-2v3l-3-3h-5v-2" />
    </>
  ),
  einstellungen: (
    <>
      <circle cx="12" cy="12" r="3" {...H} />
      <path d="M12 2.8l1.6 2.4 2.8-.6.6 2.8 2.4 1.6-1.4 2.5 1.4 2.5-2.4 1.6-.6 2.8-2.8-.6L12 21.2l-1.6-2.4-2.8.6-.6-2.8L4.6 15l1.4-2.5L4.6 10l2.4-1.6.6-2.8 2.8.6z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  umsatz: (
    <>
      <ellipse cx="9" cy="16" rx="6" ry="2.5" {...H} />
      <path d="M3 16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5M3 16v-3c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v3M3 13c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" />
      <circle cx="17" cy="8" r="4.5" {...F} />
      <circle cx="17" cy="8" r="4.5" />
      <path d="M17 6v4" />
    </>
  ),
  ebit: (
    <>
      <path d="M12 3l2.4 2 3.1-.3.7 3 2.6 1.8-1.3 2.9 1.3 2.9-2.6 1.8-.7 3-3.1-.3L12 21l-2.4-2-3.1.3-.7-3L3.2 14.5l1.3-2.9-1.3-2.9 2.6-1.8.7-3 3.1.3z" {...F} />
      <path d="M12 3l2.4 2 3.1-.3.7 3 2.6 1.8-1.3 2.9 1.3 2.9-2.6 1.8-.7 3-3.1-.3L12 21l-2.4-2-3.1.3-.7-3L3.2 14.5l1.3-2.9-1.3-2.9 2.6-1.8.7-3 3.1.3z" />
      <path d="M14.5 9.5a3 3 0 1 0 0 5M8.5 11h4M8.5 13h4" />
    </>
  ),
  kasse: (
    <>
      <path d="M3 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...F} />
      <path d="M3 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 8l12-4 1 4" />
      <path d="M21 12h-4a2 2 0 0 0 0 4h4" {...H} />
      <circle cx="17.5" cy="14" r=".6" />
    </>
  ),
  marktanteil: (
    <>
      <path d="M12 3v9h9a9 9 0 0 0-9-9z" {...H} />
      <path d="M12 3v9h9a9 9 0 0 0-9-9z" />
      <path d="M10 5.2A8 8 0 1 0 18.8 14H10z" {...F} />
      <path d="M10 5.2A8 8 0 1 0 18.8 14H10z" />
    </>
  ),
  wert: (
    <>
      <path d="M6 4h12l3 5-9 11L3 9z" {...F} />
      <path d="M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l3 16 3-16" />
    </>
  ),
  image: (
    <>
      <path d="M12 3l2.5 5.5L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8z" {...H} />
      <path d="M12 3l2.5 5.5L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8z" />
    </>
  ),
  rad: (
    <>
      <circle cx="6" cy="16" r="4" {...F} />
      <circle cx="18" cy="16" r="4" {...F} />
      <circle cx="6" cy="16" r="4" />
      <circle cx="18" cy="16" r="4" />
      <path d="M6 16l4-7h6l2 7M10 9l3 7 3-7M9 6h3M16 9l-1-3h2" />
    </>
  ),
  personal: (
    <>
      <circle cx="9" cy="8" r="3.5" {...H} />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0z" {...F} />
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  fe: (
    <>
      <path d="M9 3h6M10 3v6l-5.5 9.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3" />
      <path d="M7 15h10l2.5 3.5a1.6 1.6 0 0 1-1.4 2.5H5.9a1.6 1.6 0 0 1-1.4-2.5z" {...H} />
      <circle cx="11" cy="17.5" r=".8" fill="currentColor" />
      <circle cx="14" cy="16.5" r=".6" fill="currentColor" />
    </>
  ),
  marketing: (
    <>
      <path d="M3 10v4l3 .5V9.5z" {...H} />
      <path d="M6 9.5L17 5v14L6 14.5z" {...F} />
      <path d="M3 10v4l3 .5V9.5zM6 9.5L17 5v14L6 14.5M8 15l1.5 5h2.5l-1-4.5" />
      <path d="M20 9.5a3 3 0 0 1 0 5" />
    </>
  ),
  preis: (
    <>
      <path d="M3 12V4h8l10 10-7 7z" {...F} />
      <path d="M3 12V4h8l10 10-7 7z" />
      <circle cx="7.5" cy="8.5" r="1.6" {...H} />
      <circle cx="7.5" cy="8.5" r="1.6" />
    </>
  ),
  produktion: (
    <>
      <circle cx="9" cy="10" r="4" {...H} />
      <path d="M9 3v2M9 15v2M2 10h2M14 10h2M4 5l1.5 1.5M12.5 13.5L14 15M4 15l1.5-1.5M12.5 6.5L14 5" />
      <circle cx="9" cy="10" r="4" />
      <path d="M3 21h18M15 21v-4h5v4" {...F} />
      <path d="M15 21v-4h5v4" />
    </>
  ),
  lieferkette: (
    <>
      <path d="M2 6h11v10H2z" {...F} />
      <path d="M13 9h4l4 4v3h-8z" {...H} />
      <path d="M2 6h11v10H2zM13 9h4l4 4v3h-8" />
      <circle cx="6" cy="17.5" r="2" fill="var(--card, #fff)" />
      <circle cx="17" cy="17.5" r="2" fill="var(--card, #fff)" />
      <circle cx="6" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
    </>
  ),
  geld: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" {...F} />
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" {...H} />
      <circle cx="12" cy="12" r="3" />
      <path d="M5.5 9.5v.01M18.5 14.5v.01" strokeWidth="2.6" />
    </>
  ),
  qualitaet: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" {...F} />
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" strokeWidth="2.2" />
    </>
  ),
  lager: (
    <>
      <path d="M3 13h8v8H3zM13 13h8v8h-8zM8 4h8v8H8z" {...F} />
      <path d="M3 13h8v8H3zM13 13h8v8h-8zM8 4h8v8H8zM6 13v3M17 13v3M12 4v3" />
    </>
  ),
  ziel: (
    <>
      <circle cx="12" cy="12" r="9" {...F} />
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.8" {...H} />
    </>
  ),
  kalender: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" {...F} />
      <path d="M3 10h18" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4" />
      <rect x="7" y="13" width="3" height="3" rx=".5" {...H} />
    </>
  ),
  nachfrage: (
    <>
      <path d="M3 4h2l2.4 11h11l2-8H6.2" {...F} />
      <path d="M3 4h2l2.4 11h11l2-8H6.2" />
      <circle cx="9" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
    </>
  ),
  technik: (
    <>
      <circle cx="12" cy="12" r="3.2" {...H} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
      <circle cx="12" cy="12" r="6" {...F} />
      <circle cx="12" cy="12" r="6" />
    </>
  ),
  nachhaltigkeit: (
    <>
      <path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" {...F} />
      <path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15M4 21c3-5 6-8 11-11" />
    </>
  ),
};

export const hatIllu = (name: string): boolean => name in ILLUS;

export function Illu({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ILLUS[name]}
    </svg>
  );
}
