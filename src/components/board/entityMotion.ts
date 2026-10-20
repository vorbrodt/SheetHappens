import { Position } from '../../game/types';

// The furthest one move can carry an entity (Speedster covers two cells per move).
export const MAX_SLIDE_CELLS = 2;

// True when `to` is 1 to MAX_SLIDE_CELLS cells from `from` in a straight line, the change a move
// makes. Anything else (a new match, a resized board, a teleport, a respawn) is a placement, not a
// move, and should not slide.
export function isSlide(from: Position, to: Position): boolean {
  const rows = Math.abs(from.row - to.row);
  const cols = Math.abs(from.col - to.col);
  const distance = rows + cols;
  return (rows === 0 || cols === 0) && distance >= 1 && distance <= MAX_SLIDE_CELLS;
}
