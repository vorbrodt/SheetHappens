import { useEffect } from 'react';

import { useGameStore } from '../../state/gameStore';
import { PaintSplash, paintSplashes } from './paintSplashes';

/**
 * Calls `onSplash` for every cell the engine reports painted, in the painter's color, whether the
 * paint came from this device or from a bot.
 */
export function usePaintSplashes(onSplash: (splash: PaintSplash) => void) {
  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.match.events === prev.match.events) return;
        for (const splash of paintSplashes(state.match)) onSplash(splash);
      }),
    [onSplash]
  );
}
