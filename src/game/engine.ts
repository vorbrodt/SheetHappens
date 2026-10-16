import { BOT_MOVE_INTERVAL_MS, BOT_PAINT_INTERVAL_MS, chooseBotDirection } from './bots';
import { getStartingPositions } from './placement';
import { Rng } from './random';
import { createEmptyGrid, move, paint } from './rules';
import { BotTimers, Entity, MatchConfig, MatchEvent, MatchInput, MatchState, PlayerId } from './types';

export const DEFAULT_CONFIG: MatchConfig = { durationSeconds: 60, botCount: 2 };

// Length of the 3-2-1 countdown that runs before every match.
export const COUNTDOWN_MS = 3_000;

// A player's default moveIntervalMs: how fast a held swipe repeats.
export const PLAYER_MOVE_INTERVAL_MS = 200;

const PLAYER_COLOR = '#EC4899';
// Kept clear of the player's pink and the neutral cell gray.
const BOT_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

// Shared by every call that changes nothing worth animating, so "no events" never looks like news.
const NO_EVENTS: MatchEvent[] = [];

type NewEntity = Pick<Entity, 'id' | 'color' | 'position'> & Partial<Entity>;

// An entity with no effects active: player move speed, single paint, not frozen.
export function createEntity(entity: NewEntity): Entity {
  return {
    moveIntervalMs: PLAYER_MOVE_INTERVAL_MS,
    paintMultiplier: 1,
    frozenUntil: 0,
    lastMoveAt: null,
    ...entity,
  };
}

// A fresh match in the countdown phase: one player at the player start, plus the configured bots.
export function createMatch(config: MatchConfig, playerId: PlayerId): MatchState {
  const { player, bots } = getStartingPositions(config.botCount);
  const botEntities = bots.map((position, index) =>
    createEntity({
      id: `bot-${index + 1}`,
      color: BOT_COLORS[index],
      position,
      moveIntervalMs: BOT_MOVE_INTERVAL_MS,
    })
  );

  return {
    grid: createEmptyGrid(),
    entities: [createEntity({ id: playerId, color: PLAYER_COLOR, position: player }), ...botEntities],
    bots: Object.fromEntries(botEntities.map((bot) => [bot.id, { nextMoveAt: 0, nextPaintAt: 0 }])),
    status: 'countdown',
    countdownMs: COUNTDOWN_MS,
    remainingMs: config.durationSeconds * 1000,
    elapsedMs: 0,
    events: NO_EVENTS,
  };
}

// The earliest match time at which the entity's moveIntervalMs lets it move again.
export function moveReadyAt(entity: Entity): number {
  return entity.lastMoveAt === null ? 0 : entity.lastMoveAt + entity.moveIntervalMs;
}

/**
 * Applies one entity's input at `now` on the match clock. Inputs are ignored — the same state
 * comes back — unless the match is playing and the entity exists and is not frozen. A move is
 * also ignored when it comes sooner than the entity's moveIntervalMs after its last move, or is
 * blocked; a paint applies `taps` × the entity's paintMultiplier.
 */
export function applyInput(state: MatchState, input: MatchInput, now: number): MatchState {
  if (state.status !== 'playing') return state;
  const entity = state.entities.find((e) => e.id === input.entityId);
  if (!entity || now < entity.frozenUntil) return state;

  if (input.type === 'move') {
    if (now < moveReadyAt(entity)) return state;
    const moved = move(state.entities, entity.id, input.direction);
    if (moved === state.entities) return state;
    return {
      ...state,
      entities: moved.map((e) => (e.id === entity.id ? { ...e, lastMoveAt: now } : e)),
      events: [{ type: 'moved', entityId: entity.id, direction: input.direction }],
    };
  }

  const taps = Math.floor(input.taps);
  if (!(taps >= 1)) return state;
  return {
    ...state,
    grid: paint(state.grid, state.entities, entity.id, taps * entity.paintMultiplier),
    events: [{ type: 'painted', entityId: entity.id }],
  };
}

/**
 * Lets every bot act on whatever came due by the match clock: a move in a random legal direction
 * every moveIntervalMs (a boxed-in bot waits for its next turn) and a paint every
 * BOT_PAINT_INTERVAL_MS. Each action is stamped with the time it was due rather than the end of
 * the step, so bots keep their exact pace whatever the step size.
 */
function runBots(state: MatchState, rng: Rng): MatchState {
  let next = state;
  const events: MatchEvent[] = [];
  const bots: Record<PlayerId, BotTimers> = {};

  const act = (input: MatchInput, at: number) => {
    const after = applyInput(next, input, at);
    if (after === next) return;
    events.push(...after.events);
    next = after;
  };

  for (const [botId, timers] of Object.entries(state.bots)) {
    let { nextMoveAt, nextPaintAt } = timers;
    while (Math.min(nextMoveAt, nextPaintAt) <= next.elapsedMs) {
      const bot = next.entities.find((e) => e.id === botId);
      if (!bot) break;
      // Moves go first when both are due, as they always have.
      if (nextMoveAt <= nextPaintAt) {
        const direction = chooseBotDirection(next.entities, botId, rng);
        if (direction) act({ type: 'move', entityId: botId, direction }, nextMoveAt);
        // At least 1ms, so a zero interval can't spin forever.
        nextMoveAt += Math.max(1, bot.moveIntervalMs);
      } else {
        act({ type: 'paint', entityId: botId, taps: 1 }, nextPaintAt);
        nextPaintAt += BOT_PAINT_INTERVAL_MS;
      }
    }
    bots[botId] = { nextMoveAt, nextPaintAt };
  }

  return { ...next, bots, events: events.length > 0 ? events : NO_EVENTS };
}

/**
 * Advances the match by `deltaMs` of wall-clock time: runs the pre-match countdown and then starts
 * play; while playing, runs the match clock and the bots and ends the match when the clock hits
 * 0. A paused or ended match comes back unchanged.
 */
export function step(state: MatchState, deltaMs: number, rng: Rng): MatchState {
  if (state.status === 'countdown') {
    const countdownMs = Math.max(0, state.countdownMs - deltaMs);
    return { ...state, countdownMs, status: countdownMs === 0 ? 'playing' : 'countdown', events: NO_EVENTS };
  }
  if (state.status !== 'playing') return state;

  const playedMs = Math.min(deltaMs, state.remainingMs);
  const next = runBots(
    { ...state, remainingMs: state.remainingMs - playedMs, elapsedMs: state.elapsedMs + playedMs },
    rng
  );
  return next.remainingMs === 0 ? { ...next, status: 'ended' } : next;
}

// A match paused before it started resumes its countdown rather than jumping straight to play.
export function setPaused(state: MatchState, paused: boolean): MatchState {
  if (paused && (state.status === 'playing' || state.status === 'countdown')) {
    return { ...state, status: 'paused', events: NO_EVENTS };
  }
  if (!paused && state.status === 'paused') {
    return { ...state, status: state.countdownMs > 0 ? 'countdown' : 'playing', events: NO_EVENTS };
  }
  return state;
}
