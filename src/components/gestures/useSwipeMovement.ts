import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';

import { Direction } from '../../game/types';
import { advanceSwipe, INITIAL_SWIPE_TRACKER } from './swipeTracker';

export const MOVE_INTERVAL_MS = 200;

interface UseSwipeMovementOptions {
  onMove: (direction: Direction) => void;
}

export function useSwipeMovement({ onMove }: UseSwipeMovementOptions) {
  const activeDirection = useRef<Direction | null>(null);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const tracker = useRef(INITIAL_SWIPE_TRACKER);

  const stopRepeating = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    activeDirection.current = null;
  }, []);

  const startRepeating = useCallback(
    (direction: Direction) => {
      if (activeDirection.current === direction) return;

      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      activeDirection.current = direction;
      onMove(direction);
      intervalId.current = setInterval(() => onMove(direction), MOVE_INTERVAL_MS);
    },
    [onMove]
  );

  useEffect(() => stopRepeating, [stopRepeating]);

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
        if (tracker.current.direction) startRepeating(tracker.current.direction);
      })
      .onEnd(stopRepeating)
      .onFinalize(stopRepeating);
    /* eslint-enable react-hooks/refs */
  }, [startRepeating, stopRepeating]);

  return { gesture };
}
