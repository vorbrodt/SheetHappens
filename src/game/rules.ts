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

// The cells a footprint covers with its origin at `position`.
export function footprintCells(position: Position, footprint: Position[]): Position[] {
  return footprint.map((offset) => ({ row: position.row + offset.row, col: position.col + offset.col }));
}

// Every cell the entity covers: its position plus each footprint offset.
export function entityCells(entity: Entity): Position[] {
  return footprintCells(entity.position, entity.footprint);
}

export function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function onBoard(cell: Position, boardSize: number): boolean {
  return cell.row >= 0 && cell.row < boardSize && cell.col >= 0 && cell.col < boardSize;
}

// Whether the entity takes up room on the board: alive and not a ghost. Only solid entities block,
// kill or get killed.
export function isSolid(entity: Entity): boolean {
  return !entity.ghost && entity.respawnAt === null;
}

// Whether every cell is on the board and covered by no solid entity other than `exceptId`.
export function cellsFree(entities: Entity[], cells: Position[], boardSize: number, exceptId?: PlayerId): boolean {
  if (!cells.every((cell) => onBoard(cell, boardSize))) return false;
  const taken = entities.filter((e) => e.id !== exceptId && isSolid(e)).flatMap(entityCells);
  return !cells.some((cell) => taken.some((t) => samePosition(t, cell)));
}

// The state with one entity's fields changed.
export function updateEntity(state: MatchState, entityId: PlayerId, patch: Partial<Entity>): MatchState {
  return { ...state, entities: state.entities.map((e) => (e.id === entityId ? { ...e, ...patch } : e)) };
}

// Where a move would take an entity, worked out a cell at a time.
export interface MovePlan {
  // How many cells it travels; 0 when the first one is already blocked.
  distance: number;
  // Where its position ends up.
  position: Position;
  // Every cell it newly covers on the way, in order.
  entered: Position[];
  // The solid, non-lethal entities a lethal mover runs into on the way. They die and it goes on.
  kills: PlayerId[];
  // The lethal entity a non-lethal mover runs into, or null. The mover dies just short of it.
  killedBy: PlayerId | null;
}

/**
 * Plans the entity's move: up to `moveStep` cells in the direction, with its whole footprint
 * shifting each time. It stops at the first cell that is off the board or blocked. A ghost is only
 * stopped by the board's edge. Otherwise only solid entities matter: a lethal mover kills the
 * non-lethal ones it runs into and takes their cells, a non-lethal mover dies on a lethal one, and
 * two of a kind block each other — blocking wins over a kill, and dying over both.
 */
export function planMove(
  entities: Entity[],
  entityId: PlayerId,
  direction: Direction,
  boardSize: number = BOARD_SIZE
): MovePlan | null {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return null;

  const delta = DIRECTION_DELTAS[direction];
  const others = entity.ghost ? [] : entities.filter((e) => e.id !== entityId && isSolid(e));
  const plan: MovePlan = { distance: 0, position: entity.position, entered: [], kills: [], killedBy: null };
  let covered = entityCells(entity);

  while (plan.distance < entity.moveStep) {
    const position = { row: plan.position.row + delta.row, col: plan.position.col + delta.col };
    const cells = footprintCells(position, entity.footprint);
    if (!cells.every((cell) => onBoard(cell, boardSize))) break;

    const hit = others.filter(
      (other) =>
        !plan.kills.includes(other.id) && entityCells(other).some((c) => cells.some((cell) => samePosition(c, cell)))
    );
    const killer = entity.lethal ? undefined : hit.find((other) => other.lethal);
    if (killer) {
      plan.killedBy = killer.id;
      break;
    }
    if (hit.some((other) => other.lethal === entity.lethal)) break;

    plan.kills.push(...hit.map((other) => other.id));
    plan.entered.push(...cells.filter((cell) => !covered.some((c) => samePosition(c, cell))));
    covered = cells;
    plan.position = position;
    plan.distance++;
  }
  return plan;
}

// Whether the move takes the entity at least one cell.
export function canMove(
  entities: Entity[],
  entityId: PlayerId,
  direction: Direction,
  boardSize: number = BOARD_SIZE
): boolean {
  return (planMove(entities, entityId, direction, boardSize)?.distance ?? 0) > 0;
}

// The entities with this one where its move ends up. Kills and deaths are left to the engine.
export function move(
  entities: Entity[],
  entityId: PlayerId,
  direction: Direction,
  boardSize: number = BOARD_SIZE
): Entity[] {
  const plan = planMove(entities, entityId, direction, boardSize);
  if (!plan || plan.distance === 0) return entities;

  return entities.map((e) => (e.id === entityId ? { ...e, position: plan.position } : e));
}

// Paints one cell by `amount`, as `painter`.
function paintCell(cell: Cell, painter: PlayerId, amount: number): Cell {
  if (cell.owner === null || cell.owner === painter) {
    return { owner: painter, intensity: Math.min(MAX_INTENSITY, cell.intensity + amount) };
  }
  if (amount < cell.intensity) return { owner: cell.owner, intensity: cell.intensity - amount };
  if (amount === cell.intensity) return { owner: null, intensity: 0 };
  return { owner: painter, intensity: Math.min(MAX_INTENSITY, amount - cell.intensity) };
}

/**
 * Paints `cells` (by default every cell the entity covers) by `amount` each, in the entity's
 * paintsAs color. That works out the same as `amount` paints of 1: an own or neutral cell gains
 * intensity (capped at MAX_INTENSITY), and a rival's cell loses it, turning neutral at 0 and then
 * the painter's with whatever is left over. Listing a cell twice still paints it once.
 */
export function paint(
  grid: Grid,
  entities: Entity[],
  entityId: PlayerId,
  amount: number = 1,
  cells?: Position[]
): Grid {
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return grid;

  const painted = cells ?? entityCells(entity);
  const isPainted = (row: number, col: number) => painted.some((cell) => samePosition(cell, { row, col }));
  return grid.map((gridRow, row) =>
    painted.some((cell) => cell.row === row)
      ? gridRow.map((gridCell, col) => (isPainted(row, col) ? paintCell(gridCell, entity.paintsAs, amount) : gridCell))
      : gridRow
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
