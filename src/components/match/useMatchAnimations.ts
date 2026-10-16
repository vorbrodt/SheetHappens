import { useEffect } from 'react';

import { PlayerId } from '../../game/types';
import { useGameStore } from '../../state/gameStore';
import { JellyHandle } from '../jelly/types';

/**
 * Plays each entity's jelly animation for whatever the engine reports it did — a hop for a move,
 * a squish for a paint — whether the input came from this device or from a bot.
 */
export function useMatchAnimations(getJelly: (id: PlayerId) => JellyHandle | null) {
  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.match.events === prev.match.events) return;
        for (const event of state.match.events) {
          if (event.type === 'moved') getJelly(event.entityId)?.playMove(event.direction);
          else getJelly(event.entityId)?.playPaint();
        }
      }),
    [getJelly]
  );
}
