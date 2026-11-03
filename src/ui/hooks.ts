import { useMemo } from 'react';
import { previewQuarter, type QuarterReport } from '../engine';
import { useGame } from '../store/gameStore';

/** Live-Vorschau des Quartals (Konkurrenz wiederholt das Vorquartal, ohne Zufallsereignisse). */
export function usePreview(): QuarterReport | null {
  const state = useGame((s) => s.state);
  const entwurf = useGame((s) => s.entwurf);
  return useMemo(() => {
    if (!state || !entwurf) return null;
    try {
      return previewQuarter(state, entwurf);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [state, entwurf]);
}

export function useLetzterBericht(): QuarterReport | null {
  const h = useGame((s) => s.historie);
  return h.length ? h[h.length - 1].report : null;
}
