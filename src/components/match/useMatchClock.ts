import { useEffect } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

import { useGameStore } from '../../state/gameStore';

/**
 * The match clock (ms of play) as a shared value, so animations can follow it every frame without
 * re-rendering anything. It stands still during the countdown and while paused, like the engine.
 */
export function useMatchClock(): SharedValue<number> {
  const clock = useSharedValue(useGameStore.getState().match.elapsedMs);

  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.match.elapsedMs !== prev.match.elapsedMs) clock.set(state.match.elapsedMs);
      }),
    [clock]
  );

  return clock;
}
