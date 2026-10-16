import { Rng } from './random';
import { canMove, DIRECTIONS } from './rules';
import { Direction, Entity, PlayerId } from './types';

// A bot's default moveIntervalMs.
export const BOT_MOVE_INTERVAL_MS = 600;
// Faster than moving, so a bot paints its cell a few times before wandering off.
export const BOT_PAINT_INTERVAL_MS = 200;

/**
 * Picks a random direction for the bot. An illegal pick (off-board or occupied) is re-rolled
 * among the remaining legal directions, which is the same as picking uniformly among the legal
 * ones. Returns null when the bot is boxed in and should stay put this tick.
 */
export function chooseBotDirection(
  entities: Entity[],
  botId: PlayerId,
  random: Rng = Math.random
): Direction | null {
  const legal = DIRECTIONS.filter((direction) => canMove(entities, botId, direction));
  if (legal.length === 0) return null;

  return legal[Math.floor(random() * legal.length)];
}
