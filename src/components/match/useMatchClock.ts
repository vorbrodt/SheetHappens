import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useGameStore } from '../../game/store';

// Only whole seconds are shown, so a few ticks per second keeps the display on time.
export const CLOCK_TICK_MS = 100;

/**
 * Runs the pre-match countdown and then the match clock while the calling screen is mounted. Time
 * is measured from wall-clock deltas, so a late interval never slows the clock down. The match
 * pauses whenever the app leaves the foreground (during the countdown too) and resumes where it
 * left off when it comes back.
 */
export function useMatchClock() {
  useEffect(() => {
    let lastTick = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      useGameStore.getState().tick(now - lastTick);
      lastTick = now;
    }, CLOCK_TICK_MS);

    const subscription = AppState.addEventListener('change', (state) => {
      // Restart the delta so time spent in the background is never counted.
      lastTick = Date.now();
      useGameStore.getState().setPaused(state !== 'active');
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
}
