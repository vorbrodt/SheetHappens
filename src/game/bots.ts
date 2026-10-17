import { Rng } from './random';
import { BOARD_SIZE, canMove, DIRECTIONS } from './rules';
import { Direction, Entity, PlayerId } from './types';

// A bot's default moveIntervalMs.
export const BOT_MOVE_INTERVAL_MS = 600;

/**
 * Picks a random direction for the bot. An illegal pick (off-board or occupied) is re-rolled
 * among the remaining legal directions, which is the same as picking uniformly among the legal
 * ones. Returns null when the bot is boxed in and should stay put this tick.
 */
export function chooseBotDirection(
  entities: Entity[],
  botId: PlayerId,
  random: Rng = Math.random,
  boardSize: number = BOARD_SIZE
): Direction | null {
  const legal = DIRECTIONS.filter((direction) => canMove(entities, botId, direction, boardSize));
  if (legal.length === 0) return null;

  return legal[Math.floor(random() * legal.length)];
}
