import { BOARD_SIZE, cellsFree, footprintCells } from './rules';
import { Entity, PlayerId, Position } from './types';

export const PLAYER_START: Position = { row: 0, col: 0 };

// The other three corners, starting with the one opposite the player, then the middle of the left
// and right edges.
function botStartOrder(boardSize: number): Position[] {
  const last = boardSize - 1;
  const mid = Math.floor(last / 2);
  return [
    { row: last, col: last },
    { row: 0, col: last },
    { row: last, col: 0 },
    { row: mid, col: 0 },
    { row: mid, col: last },
  ];
}

// One start position per bot, so this is the most bots a match can hold.
export const MAX_BOT_COUNT = botStartOrder(BOARD_SIZE).length;

export function getStartingPositions(
  botCount: number,
  boardSize: number = BOARD_SIZE
): { player: Position; bots: Position[] } {
  return {
    player: PLAYER_START,
    bots: botStartOrder(boardSize).slice(0, botCount),
  };
}

// The board's four corners: where dead entities come back.
export function getCorners(boardSize: number = BOARD_SIZE): Position[] {
  const last = boardSize - 1;
  return [
    { row: 0, col: 0 },
    { row: 0, col: last },
    { row: last, col: 0 },
    { row: last, col: last },
  ];
}

/**
 * Where to put the entity's position so that `footprint` covers `cell`: trying the footprint's
 * offsets in order, the first that keeps every cell on the board and clear of every solid entity
 * other than the entity itself. Null when none does.
 */
export function findPlacement(
  entities: Entity[],
  entityId: PlayerId,
  footprint: Position[],
  cell: Position,
  boardSize: number = BOARD_SIZE
): Position | null {
  for (const offset of footprint) {
    const position = { row: cell.row - offset.row, col: cell.col - offset.col };
    if (cellsFree(entities, footprintCells(position, footprint), boardSize, entityId)) return position;
  }
  return null;
}
