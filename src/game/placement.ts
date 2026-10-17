import { BOARD_SIZE } from './rules';
import { Position } from './types';

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
