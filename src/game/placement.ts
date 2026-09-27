import { Position } from './types';

export const PLAYER_START: Position = { row: 0, col: 0 };

const BOT_START_ORDER: Position[] = [
  { row: 7, col: 7 }, // opposite corner from player
  { row: 0, col: 7 },
  { row: 7, col: 0 },
  { row: 3, col: 0 },
  { row: 3, col: 7 },
];

export function getStartingPositions(botCount: number): { player: Position; bots: Position[] } {
  return {
    player: PLAYER_START,
    bots: BOT_START_ORDER.slice(0, botCount),
  };
}
