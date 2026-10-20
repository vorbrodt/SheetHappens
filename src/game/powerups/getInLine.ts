import { PAINT_DWELL_MS } from '../engine';
import { findPlacement } from '../placement';
import { footprintCells, paint, samePosition, updateEntity } from '../rules';
import { MatchState, PlayerId, Position } from '../types';
import { collectPickups } from './pickups';
import type { PowerUpDefinition } from './registry';

type Orientation = 'horizontal' | 'vertical';

// How many jellies the line holds.
export const LINE_LENGTH = 4;

const LINES: Record<Orientation, Position[]> = {
  horizontal: Array.from({ length: LINE_LENGTH }, (_, i) => ({ row: 0, col: i })),
  vertical: Array.from({ length: LINE_LENGTH }, (_, i) => ({ row: i, col: 0 })),
};

/**
 * The footprint for a line in this orientation that covers the entity's cell and fits on the board
 * clear of every other solid entity, or null if none does. Its offsets are from the entity's
 * position, which stays put: that cell is the anchor the line shrinks back to.
 */
function findLine(state: MatchState, entityId: PlayerId, orientation: Orientation): Position[] | null {
  const entity = state.entities.find((e) => e.id === entityId);
  if (!entity) return null;

  const line = LINES[orientation];
  const origin = findPlacement(state.entities, entityId, line, entity.position, state.grid.length);
  if (!origin) return null;
  return line.map((offset) => ({
    row: origin.row + offset.row - entity.position.row,
    col: origin.col + offset.col - entity.position.col,
  }));
}

/**
 * Turns the jelly into a line of LINE_LENGTH copies of itself, horizontal or vertical at random,
 * falling back to the other way when the first doesn't fit. Refused when neither does. The line
 * moves and paints as one block, and the cells it grows into count as entered. On expiry it goes
 * back to a single cell where the jelly stood when it was used (shifted by any moves since).
 */
export const getInLine: PowerUpDefinition = {
  kind: 'getInLine',
  durationMs: 8_000,
  canActivate: (state, entityId) =>
    findLine(state, entityId, 'horizontal') !== null || findLine(state, entityId, 'vertical') !== null,
  activate: (state, entityId, now, rng) => {
    const entity = state.entities.find((e) => e.id === entityId);
    const [first, second]: Orientation[] = rng() < 0.5 ? ['horizontal', 'vertical'] : ['vertical', 'horizontal'];
    const footprint = findLine(state, entityId, first) ?? findLine(state, entityId, second);
    if (!entity || !footprint) return state;

    const covered = footprintCells(entity.position, entity.footprint);
    const entered = footprintCells(entity.position, footprint).filter(
      (cell) => !covered.some((c) => samePosition(c, cell))
    );
    const grown = updateEntity(state, entityId, { footprint, dwellPaintAt: now + PAINT_DWELL_MS });
    const painted = { ...grown, grid: paint(grown.grid, grown.entities, entityId, entity.paintMultiplier, entered) };
    const collected = collectPickups(painted, entityId, entered);
    return { ...collected, events: [{ type: 'painted', entityId }, ...collected.events] };
  },
  expire: (state, entityId) => updateEntity(state, entityId, { footprint: [{ row: 0, col: 0 }] }),
};
