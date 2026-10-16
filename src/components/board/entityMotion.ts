import { Position } from '../../game/types';

// True when `to` is one orthogonal cell from `from`, the only change a move can make. Anything
// else (a new match, a resized board) is a placement, not a move, and should not slide.
export function isSingleStep(from: Position, to: Position): boolean {
  return Math.abs(from.row - to.row) + Math.abs(from.col - to.col) === 1;
}
