import { Cell, Direction, Entity, Grid, MatchState, PlayerId, Position } from './types';

export const BOARD_SIZE = 8;

// Cells saturate fast so players keep moving and colors change hands often.
export const MAX_INTENSITY = 5;

export const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

export const DIRECTIONS = Object.keys(DIRECTION_DELTAS) as Direction[];

export function createEmptyGrid(size: number = BOARD_SIZE): Grid {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, (): Cell => ({ owner: null, intensity: 0 }))
  );
}

// Every cell the entity covers: its position plus each footprint offset.
export function entityCells(entity: Entity): Position[] {
  return entity.footprint.map((offset) => ({
    row: entity.position.row + offset.row,
    col: entity.position.col + offset.col,
  }));
}

export function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

// The state with one entity's fields changed.
export function updateEntity(state: MatchState, entityId: PlayerId, patch: Partial<Entity>): MatchState {
  return { ...state, entities: state.entities.map((e) => (e.id === entityId ? { ...e, ...patch } : e)) };
}

// The cell the entity would land on, or null if it is off-board or occupied.
function getMoveTarget(
  entities: Entity[],
  entityId: PlayerId,
  direction: Direction,
  boardSize: number
): Position | null {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return null;

  const delta = DIRECTION_DELTAS[direction];
  const target: Position = {
    row: entity.position.row + delta.row,
    col: entity.position.col + delta.col,
  };

  const onBoard = target.row >= 0 && target.row < boardSize && target.col >= 0 && target.col < boardSize;
  if (!onBoard) return null;

  const occupied = entities.some(
    (e) => e.id !== entityId && e.position.row === target.row && e.position.col === target.col
  );
  if (occupied) return null;

  return target;
}

export function canMove(
  entities: Entity[],
  entityId: PlayerId,
  direction: Direction,
  boardSize: number = BOARD_SIZE
): boolean {
  return getMoveTarget(entities, entityId, direction, boardSize) !== null;
}

export function move(
  entities: Entity[],
  entityId: PlayerId,
  direction: Direction,
  boardSize: number = BOARD_SIZE
): Entity[] {
  const target = getMoveTarget(entities, entityId, direction, boardSize);
  if (!target) return entities;

  return entities.map((e) => (e.id === entityId ? { ...e, position: target } : e));
}

/**
 * Paints the entity's current cell by `amount`, which works out the same as `amount` paints of 1:
 * an own or neutral cell gains intensity (capped at MAX_INTENSITY), and a rival's cell loses it, turning
 * neutral at 0 and then the painter's with whatever is left over.
 */
export function paint(grid: Grid, entities: Entity[], entityId: PlayerId, amount: number = 1): Grid {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return grid;

  const { row, col } = entity.position;
  const cell = grid[row][col];

  let nextCell: Cell;
  if (cell.owner === null || cell.owner === entityId) {
    nextCell = { owner: entityId, intensity: Math.min(MAX_INTENSITY, cell.intensity + amount) };
  } else if (amount < cell.intensity) {
    nextCell = { owner: cell.owner, intensity: cell.intensity - amount };
  } else if (amount === cell.intensity) {
    nextCell = { owner: null, intensity: 0 };
  } else {
    nextCell = { owner: entityId, intensity: Math.min(MAX_INTENSITY, amount - cell.intensity) };
  }

  return grid.map((gridRow, ri) =>
    ri === row ? gridRow.map((gridCell, ci) => (ci === col ? nextCell : gridCell)) : gridRow
  );
}

// Points each owned cell adds on top of its intensity, so territory counts as well as depth.
export const POINTS_PER_CELL = 2;

export function score(grid: Grid, entityId: PlayerId): number {
  return grid
    .flat()
    .reduce((sum, cell) => (cell.owner === entityId ? sum + cell.intensity + POINTS_PER_CELL : sum), 0);
}

export function cellsOwned(grid: Grid, entityId: PlayerId): number {
  return grid.flat().filter((cell) => cell.owner === entityId).length;
}

export function resolveTieBreak(grid: Grid, entityIds: PlayerId[]): PlayerId[] {
  const counts = entityIds.map((id) => ({ id, cells: cellsOwned(grid, id) }));
  const maxCells = Math.max(...counts.map((c) => c.cells));
  return counts.filter((c) => c.cells === maxCells).map((c) => c.id);
}

export interface Standing {
  id: PlayerId;
  score: number;
  cellsOwned: number;
  // 1-based. Entities tied on both score and cells owned share a rank, so rank 1 is every winner.
  rank: number;
}

// Final standings, best first: by score, then by cells owned. Exact ties keep the input order.
export function rankEntities(grid: Grid, entityIds: PlayerId[]): Standing[] {
  const sorted = entityIds
    .map((id) => ({ id, score: score(grid, id), cellsOwned: cellsOwned(grid, id) }))
    .sort((a, b) => b.score - a.score || b.cellsOwned - a.cellsOwned);

  const standings: Standing[] = [];
  sorted.forEach((entry, index) => {
    const prev = standings[index - 1];
    const tied = prev && prev.score === entry.score && prev.cellsOwned === entry.cellsOwned;
    standings.push({ ...entry, rank: tied ? prev.rank : index + 1 });
  });
  return standings;
}
