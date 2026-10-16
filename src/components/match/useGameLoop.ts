import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useGameStore } from '../../state/gameStore';

/**
 * Drives the match while the calling screen is mounted: every animation frame steps the engine by
 * the wall-clock time since the last one, which runs the pre-match countdown, the match clock and
 * the bots. Time is measured from wall-clock deltas, so a late frame never slows the clock down.
 * The match pauses whenever the app leaves the foreground (during the countdown too) and resumes
 * where it left off when it comes back.
 */
export function useGameLoop() {
  useEffect(() => {
    let lastTick = Date.now();

    let frame = requestAnimationFrame(function loop() {
      const now = Date.now();
      useGameStore.getState().step(now - lastTick);
      lastTick = now;
      frame = requestAnimationFrame(loop);
    });

    const subscription = AppState.addEventListener('change', (state) => {
      // Restart the delta so time spent in the background is never counted.
      lastTick = Date.now();
      useGameStore.getState().setPaused(state !== 'active');
    });

    return () => {
      cancelAnimationFrame(frame);
      subscription.remove();
    };
  }, []);
}
