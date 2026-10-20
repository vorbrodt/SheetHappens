import { findPlacement } from '../placement';
import { entityCells, footprintCells, paint, samePosition, updateEntity } from '../rules';
import { MatchState, PlayerId, Position } from '../types';
import { collectPickups } from './pickups';
import type { PowerUpDefinition } from './registry';

// The giant's 2x2 footprint, as offsets from its top-left cell. findPlacement tries them in this
// order, so the block the jelly is already in the top-left of comes first.
export const JELLYSAURUS_FOOTPRINT: Position[] = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
];

const SINGLE_CELL: Position[] = [{ row: 0, col: 0 }];

// Where the giant's top-left goes: the first free in-bounds 2x2 block containing the entity's cell,
// or null when there is none.
function giantPosition(state: MatchState, entityId: PlayerId): Position | null {
  const entity = state.entities.find((e) => e.id === entityId);
  if (!entity) return null;
  return findPlacement(state.entities, entityId, JELLYSAURUS_FOOTPRINT, entity.position, state.grid.length);
}

/**
 * Grows the jelly into a 2x2 giant for 7s. It needs a free 2x2 block containing its cell, else the
 * use is refused. The cells it grows onto count as entered: each is painted once and its pickups
 * taken. Its dwell timer keeps running, since it never left the cell it was standing on.
 */
export const jellysaurus: PowerUpDefinition = {
  kind: 'jellysaurus',
  durationMs: 7_000,
  canActivate: (state, entityId) => giantPosition(state, entityId) !== null,
  activate: (state, entityId) => {
    const entity = state.entities.find((e) => e.id === entityId);
    const position = giantPosition(state, entityId);
    if (!entity || !position) return state;

    const before = entityCells(entity);
    const entered = footprintCells(position, JELLYSAURUS_FOOTPRINT).filter(
      (cell) => !before.some((c) => samePosition(c, cell))
    );
    const grown = updateEntity(state, entityId, { position, footprint: JELLYSAURUS_FOOTPRINT });
    const painted = { ...grown, grid: paint(grown.grid, grown.entities, entityId, entity.paintMultiplier, entered) };
    const collected = collectPickups(painted, entityId, entered);
    return { ...collected, events: [{ type: 'painted', entityId }, ...collected.events] };
  },
  // Shrinks back onto its top-left cell.
  expire: (state, entityId) => updateEntity(state, entityId, { footprint: SINGLE_CELL }),
};
