import type { ProductId } from '../../engine';

export const PRODUKT_FARBE: Record<ProductId, string> = {
  stadtrad: '#0d9488', ebike: '#6366f1', mountainbike: '#d97706', lastenrad: '#db2777', rennrad: '#dc2626', emtb: '#7c3aed',
};

/** Einfaches SVG-Symbolbild je Fahrradmodell */
export function BikeIcon({ produkt, className = 'h-8 w-12', farbe }: { produkt: ProductId; className?: string; farbe?: string }) {
  const c = farbe ?? PRODUKT_FARBE[produkt];
  const ebike = produkt === 'ebike' || produkt === 'emtb' || produkt === 'lastenrad';
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="14" cy="28" r="9" />
      <circle cx="50" cy="28" r="9" />
      <path d="M14 28 L26 12 L44 12 L50 28 M26 12 L32 28 L44 12 M24 8 H31 M44 12 L42 6 H48" />
      {produkt === 'stadtrad' && <path d="M50 14 h8 v6 h-8 z" strokeWidth="2.5" />}
      {ebike && <rect x="28" y="15" width="10" height="6" rx="1.5" fill={c} stroke="none" />}
      <circle cx="32" cy="28" r="2" fill={c} stroke="none" />
    </svg>
  );
}
