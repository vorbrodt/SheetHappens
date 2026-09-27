import { Direction } from '../../game/types';

export interface SwipeVector {
  dx: number;
  dy: number;
}

export const DEFAULT_MIN_SWIPE_DISTANCE = 16;

export function resolveSwipeDirection(
  vector: SwipeVector,
  minDistance: number = DEFAULT_MIN_SWIPE_DISTANCE
): Direction | null {
  const { dx, dy } = vector;

  if (Math.abs(dx) < minDistance && Math.abs(dy) < minDistance) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }

  return dy > 0 ? 'down' : 'up';
}
