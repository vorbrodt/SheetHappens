import { Position } from '../../game/types';

export interface Point {
  x: number;
  y: number;
}

/**
 * The board cell under `point`, or null when it falls outside the board. `point` and `boardOrigin`
 * (the board's top-left corner) are in the same coordinate space, such as the touch surface's.
 */
export function cellAtPoint(point: Point, boardOrigin: Point, cellSize: number, gridSize: number): Position | null {
  if (cellSize <= 0) return null;
  const col = Math.floor((point.x - boardOrigin.x) / cellSize);
  const row = Math.floor((point.y - boardOrigin.y) / cellSize);
  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
  return { row, col };
}
