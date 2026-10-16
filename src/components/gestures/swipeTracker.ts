import { Direction } from '../../game/types';
import { DEFAULT_MIN_SWIPE_DISTANCE, resolveSwipeDirection, SwipeVector } from './resolveSwipeDirection';

export interface SwipeTracker {
  /** Gesture translation at the moment a direction last resolved. */
  anchor: SwipeVector;
  direction: Direction | null;
}

export const INITIAL_SWIPE_TRACKER: SwipeTracker = { anchor: { dx: 0, dy: 0 }, direction: null };

/**
 * Advances the tracker with the gesture's total translation since touch-down. The direction is
 * resolved from the movement since the anchor, and the anchor jumps to the current translation
 * every time a direction resolves, so reversing or turning mid-hold only needs a short fresh drag
 * instead of undoing the whole swipe so far.
 */
export function advanceSwipe(
  tracker: SwipeTracker,
  translation: SwipeVector,
  minDistance: number = DEFAULT_MIN_SWIPE_DISTANCE
): SwipeTracker {
  const direction = resolveSwipeDirection(
    { dx: translation.dx - tracker.anchor.dx, dy: translation.dy - tracker.anchor.dy },
    minDistance
  );
  if (!direction) return tracker;

  return { anchor: translation, direction };
}
