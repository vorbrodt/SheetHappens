import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';

import { Direction } from '../../game/types';
import { isPointInPaintZone, PAINT_ZONE_HEIGHT_RATIO } from './paintZone';
import { resolveSwipeDirection } from './resolveSwipeDirection';

export const MOVE_INTERVAL_MS = 200;

interface UseSwipeMovementOptions {
  onMove: (direction: Direction) => void;
  surfaceHeight: number;
  paintZoneRatio?: number;
}

export function useSwipeMovement({
  onMove,
  surfaceHeight,
  paintZoneRatio = PAINT_ZONE_HEIGHT_RATIO,
}: UseSwipeMovementOptions) {
  const activeDirection = useRef<Direction | null>(null);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const ignoreGesture = useRef(false);

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
      .onBegin((event) => {
        ignoreGesture.current = isPointInPaintZone(event.y, surfaceHeight, paintZoneRatio);
      })
      .onUpdate((event) => {
        if (ignoreGesture.current) return;

        const direction = resolveSwipeDirection({ dx: event.translationX, dy: event.translationY });
        if (direction) startRepeating(direction);
      })
      .onEnd(stopRepeating)
      .onFinalize(stopRepeating);
    /* eslint-enable react-hooks/refs */
  }, [paintZoneRatio, startRepeating, stopRepeating, surfaceHeight]);

  return { gesture };
}
