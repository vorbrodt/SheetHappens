import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';

import { Direction } from '../../game/types';
import { advanceSwipe, INITIAL_SWIPE_TRACKER } from './swipeTracker';

interface UseSwipeMovementOptions {
  // Called with the swipe's direction whenever it changes, and with null once the finger lifts.
  // Repeating the move while a direction is held is up to the engine, at the entity's own pace.
  onDirectionChange: (direction: Direction | null) => void;
}

export function useSwipeMovement({ onDirectionChange }: UseSwipeMovementOptions) {
  const activeDirection = useRef<Direction | null>(null);
  const tracker = useRef(INITIAL_SWIPE_TRACKER);

  const setDirection = useCallback(
    (direction: Direction | null) => {
      if (activeDirection.current === direction) return;
      activeDirection.current = direction;
      onDirectionChange(direction);
    },
    [onDirectionChange]
  );

  const release = useCallback(() => setDirection(null), [setDirection]);

  useEffect(() => release, [release]);

  const gesture = useMemo(() => {
    /* eslint-disable react-hooks/refs --
       gesture-handler invokes these callbacks asynchronously from native touch events,
       never synchronously during render. */
    return Gesture.Pan()
      .runOnJS(true)
      .onBegin(() => {
        tracker.current = INITIAL_SWIPE_TRACKER;
      })
      .onUpdate((event) => {
        tracker.current = advanceSwipe(tracker.current, {
          dx: event.translationX,
          dy: event.translationY,
        });
        if (tracker.current.direction) setDirection(tracker.current.direction);
      })
      .onEnd(release)
      .onFinalize(release);
    /* eslint-enable react-hooks/refs */
  }, [setDirection, release]);

  return { gesture };
}
