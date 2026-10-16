import { Cell, Direction, Entity, Grid, PlayerId, Position } from './types';

export const BOARD_SIZE = 8;

const DIRECTION_DELTAS: Record<Direction, Position> = {
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

export function paint(grid: Grid, entities: Entity[], entityId: PlayerId): Grid {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return grid;

  const { row, col } = entity.position;
  const cell = grid[row][col];

  let nextCell: Cell;
  if (cell.owner === null || cell.owner === entityId) {
    nextCell = { owner: entityId, intensity: Math.min(100, cell.intensity + 1) };
  } else {
    const intensity = Math.max(0, cell.intensity - 1);
    nextCell = { owner: intensity === 0 ? null : cell.owner, intensity };
  }

  return grid.map((gridRow, ri) =>
    ri === row ? gridRow.map((gridCell, ci) => (ci === col ? nextCell : gridCell)) : gridRow
  );
}

export function score(grid: Grid, entityId: PlayerId): number {
  return grid.flat().reduce((sum, cell) => (cell.owner === entityId ? sum + cell.intensity : sum), 0);
}

export function cellsOwned(grid: Grid, entityId: PlayerId): number {
  return grid.flat().filter((cell) => cell.owner === entityId).length;
}

export function resolveTieBreak(grid: Grid, entityIds: PlayerId[]): PlayerId[] {
  const counts = entityIds.map((id) => ({ id, cells: cellsOwned(grid, id) }));
  const maxCells = Math.max(...counts.map((c) => c.cells));
  return counts.filter((c) => c.cells === maxCells).map((c) => c.id);
}
