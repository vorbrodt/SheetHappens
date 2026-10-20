import { Pickup } from './powerups/types';
import { Rng } from './random';
import { BOARD_SIZE, canMove, cellsFree, DIRECTIONS, entityCells, footprintCells, isSolid, planMove } from './rules';
import { BotTimers, Direction, Entity, PlayerId, Position } from './types';

// A bot's default moveIntervalMs.
export const BOT_MOVE_INTERVAL_MS = 600;

// How long a bot holds on to a power-up before using it, uniform between these.
export const BOT_POWER_UP_DELAY_MIN_MS = 1_000;
export const BOT_POWER_UP_DELAY_MAX_MS = 4_000;

// How often a bot that can teleport (Jellyport) does.
export const BOT_TELEPORT_INTERVAL_MS = 1_000;

// How far away, in cells, a bot with a free slot notices a pickup.
export const BOT_PICKUP_RANGE = 4;

// How often a bot heads for its target instead of wandering: a pickup it noticed, or the nearest
// jelly while it is lethal (Jelly gone bad).
export const BOT_PICKUP_BIAS = 0.5;
export const BOT_HUNT_BIAS = 0.75;

// The time from a bot getting (or failing to use) a power-up to it trying, in whole ms.
export function botPowerUpDelay(rng: Rng): number {
  return BOT_POWER_UP_DELAY_MIN_MS + Math.floor(rng() * (BOT_POWER_UP_DELAY_MAX_MS - BOT_POWER_UP_DELAY_MIN_MS + 1));
}

// The fewest steps from any of `from` to any of `to`.
function distance(from: Position[], to: Position[]): number {
  return Math.min(...from.flatMap((a) => to.map((b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col))));
}

// Where the bot wants to go and how keen it is: while lethal, the nearest jelly it can kill; with a
// free slot, any pickup within BOT_PICKUP_RANGE. Ghosts only wander.
function botGoal(entities: Entity[], bot: Entity, pickups: Pickup[]): { cells: Position[]; bias: number } | null {
  if (bot.ghost) return null;
  const cells = entityCells(bot);

  if (bot.lethal) {
    const prey = entities.filter((e) => e.id !== bot.id && isSolid(e) && !e.lethal).flatMap(entityCells);
    return prey.length > 0 ? { cells: prey, bias: BOT_HUNT_BIAS } : null;
  }
  if (!bot.inventory.includes(null)) return null;
  const near = pickups.map((p) => p.position).filter((p) => distance(cells, [p]) <= BOT_PICKUP_RANGE);
  return near.length > 0 ? { cells: near, bias: BOT_PICKUP_BIAS } : null;
}

/**
 * Picks a direction for the bot among the legal ones — those that take it somewhere (see canMove),
 * so never into a lethal entity. Ghosts are only held back by the board's edge. Mostly it picks
 * uniformly, but a bot with a goal (see botGoal) heads for it some of the time, picking among the
 * moves that bring it closest; it wanders as usual when none brings it closer. Returns null when
 * the bot is boxed in and should stay put this tick.
 */
export function chooseBotDirection(
  entities: Entity[],
  botId: PlayerId,
  random: Rng = Math.random,
  boardSize: number = BOARD_SIZE,
  pickups: Pickup[] = []
): Direction | null {
  const legal = DIRECTIONS.filter((direction) => canMove(entities, botId, direction, boardSize));
  if (legal.length === 0) return null;

  const bot = entities.find((e) => e.id === botId)!;
  const goal = botGoal(entities, bot, pickups);
  if (goal && random() < goal.bias) {
    const after = legal.map((direction) => {
      const plan = planMove(entities, botId, direction, boardSize)!;
      return { direction, distance: distance(footprintCells(plan.position, bot.footprint), goal.cells) };
    });
    const closest = Math.min(...after.map((a) => a.distance));
    if (closest < distance(entityCells(bot), goal.cells)) {
      const best = after.filter((a) => a.distance === closest);
      return best[Math.floor(random() * best.length)].direction;
    }
  }

  return legal[Math.floor(random() * legal.length)];
}

// A random cell the bot's footprint fits on, other than where it is, or null when there is none.
export function chooseTeleportTarget(
  entities: Entity[],
  botId: PlayerId,
  random: Rng,
  boardSize: number = BOARD_SIZE
): Position | null {
  const bot = entities.find((e) => e.id === botId);
  if (!bot) return null;

  const targets: Position[] = [];
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (row === bot.position.row && col === bot.position.col) continue;
      if (cellsFree(entities, footprintCells({ row, col }, bot.footprint), boardSize, botId)) targets.push({ row, col });
    }
  }
  return targets.length > 0 ? targets[Math.floor(random() * targets.length)] : null;
}

/**
 * Brings the bot's power-up and teleport timers in line with what it can do at `now`: a bot that
 * carries a power-up gets a use scheduled botPowerUpDelay later, and one that can teleport a
 * teleport BOT_TELEPORT_INTERVAL_MS later. Timers already set are kept, and ones it has no use for
 * are dropped. The same timers come back when nothing changes.
 */
export function scheduleBot(timers: BotTimers, bot: Entity, now: number, rng: Rng): BotTimers {
  const carrying = bot.inventory.some((kind) => kind !== null);
  const usePowerUpAt = carrying ? (timers.usePowerUpAt ?? now + botPowerUpDelay(rng)) : undefined;
  const teleportAt = bot.canTeleport ? (timers.teleportAt ?? now + BOT_TELEPORT_INTERVAL_MS) : undefined;
  if (usePowerUpAt === timers.usePowerUpAt && teleportAt === timers.teleportAt) return timers;

  const next: BotTimers = { nextMoveAt: timers.nextMoveAt };
  if (usePowerUpAt !== undefined) next.usePowerUpAt = usePowerUpAt;
  if (teleportAt !== undefined) next.teleportAt = teleportAt;
  return next;
}
