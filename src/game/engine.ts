import { BOT_MOVE_INTERVAL_MS, chooseBotDirection } from './bots';
import { getStartingPositions } from './placement';
import { activatePowerUp, expirePowerUp } from './powerups/lifecycle';
import { collectPickups, despawnPickup, INVENTORY_SLOTS, spawnDelay, spawnWave } from './powerups/pickups';
import { Rng } from './random';
import { BOARD_SIZE, createEmptyGrid, move, paint } from './rules';
import { BotTimers, Direction, Entity, MatchConfig, MatchEvent, MatchInput, MatchState, PlayerId } from './types';

export const DEFAULT_CONFIG: MatchConfig = { durationSeconds: 30, botCount: 2, boardSize: BOARD_SIZE };

// Length of the 3-2-1 countdown that runs before every match.
export const COUNTDOWN_MS = 3_000;

// A player's default moveIntervalMs: how fast a held swipe repeats.
export const PLAYER_MOVE_INTERVAL_MS = 200;

// How long an entity stands on a cell for each paint after the one it gets for entering it.
export const PAINT_DWELL_MS = 500;

const PLAYER_COLOR = '#EC4899';
// Kept clear of the player's pink and the neutral cell gray.
const BOT_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

// Shared by every call that changes nothing worth animating, so "no events" never looks like news.
const NO_EVENTS: MatchEvent[] = [];

type NewEntity = Pick<Entity, 'id' | 'color' | 'position'> & Partial<Entity>;

// The directions entities are holding a swipe in. Each one's move repeats whenever it comes due.
export type HeldDirections = Readonly<Record<PlayerId, Direction>>;

// An entity with no effects active: player move speed, single paint, not frozen, one cell big,
// empty power-up slots, painting as itself and alive for good. Its dwell paint is due at match
// time 0, so its starting cell counts as entered the moment play starts.
export function createEntity(entity: NewEntity): Entity {
  return {
    moveIntervalMs: PLAYER_MOVE_INTERVAL_MS,
    paintMultiplier: 1,
    frozenUntil: 0,
    lastMoveAt: null,
    dwellPaintAt: 0,
    inventory: Array.from({ length: INVENTORY_SLOTS }, () => null),
    activePowerUp: null,
    footprint: [{ row: 0, col: 0 }],
    moveStep: 1,
    lethal: false,
    canTeleport: false,
    ghost: false,
    paintsAs: entity.id,
    summonedBy: null,
    expiresAt: null,
    respawnAt: null,
    ...entity,
  };
}

// A fresh match in the countdown phase on a board of the configured size: one player at the player
// start, plus the configured bots. Everything after this reads the board size off the grid.
export function createMatch(config: MatchConfig, playerId: PlayerId): MatchState {
  const { player, bots } = getStartingPositions(config.botCount, config.boardSize);
  const botEntities = bots.map((position, index) =>
    createEntity({
      id: `bot-${index + 1}`,
      color: BOT_COLORS[index],
      position,
      moveIntervalMs: BOT_MOVE_INTERVAL_MS,
    })
  );

  return {
    grid: createEmptyGrid(config.boardSize),
    entities: [createEntity({ id: playerId, color: PLAYER_COLOR, position: player }), ...botEntities],
    bots: Object.fromEntries(botEntities.map((bot) => [bot.id, { nextMoveAt: 0 }])),
    status: 'countdown',
    countdownMs: COUNTDOWN_MS,
    remainingMs: config.durationSeconds * 1000,
    elapsedMs: 0,
    pickups: [],
    nextSpawnAt: null,
    events: NO_EVENTS,
  };
}

// The earliest match time at which the entity's moveIntervalMs lets it move again.
export function moveReadyAt(entity: Entity): number {
  return entity.lastMoveAt === null ? 0 : entity.lastMoveAt + entity.moveIntervalMs;
}

/**
 * Applies one entity's input at `now` on the match clock. Inputs are ignored — the same state
 * comes back — unless the match is playing and the entity exists, is alive and is not frozen. A
 * move is also ignored when it comes sooner than the entity's moveIntervalMs after its last move,
 * or is blocked; otherwise it paints the cell moved onto, restarts the entity's dwell timer there
 * and picks up whatever pickups it landed on. Using a power-up is up to activatePowerUp.
 */
export function applyInput(state: MatchState, input: MatchInput, now: number, rng: Rng): MatchState {
  if (state.status !== 'playing') return state;
  const entity = state.entities.find((e) => e.id === input.entityId);
  if (!entity || entity.respawnAt !== null || now < entity.frozenUntil) return state;
  if (input.type === 'usePowerUp') return activatePowerUp(state, entity.id, input.slot, now, rng);

  if (now < moveReadyAt(entity)) return state;
  const moved = move(state.entities, entity.id, input.direction, state.grid.length);
  if (moved === state.entities) return state;
  const entities = moved.map((e) =>
    e.id === entity.id ? { ...e, lastMoveAt: now, dwellPaintAt: now + PAINT_DWELL_MS } : e
  );
  const collected = collectPickups(
    { ...state, grid: paint(state.grid, entities, entity.id, entity.paintMultiplier), entities },
    entity.id
  );
  return {
    ...collected,
    events: [
      { type: 'moved', entityId: entity.id, direction: input.direction },
      { type: 'painted', entityId: entity.id },
      ...collected.events,
    ],
  };
}

/**
 * Runs everything that came due by the match clock, in time order: power-ups running out, summoned
 * entities leaving, pickups despawning, waves of pickups spawning, every entity's dwell paints,
 * every bot's moves (a random legal direction every moveIntervalMs; a boxed-in bot waits for its
 * next turn) and the moves of every held direction, from `from` at the earliest. Each action is
 * stamped with the time it was due rather than the end of the step, so entities keep their exact
 * pace whatever the step size. A paint due at the same time as a move goes first, since the entity
 * did stand there the full PAINT_DWELL_MS, and anything ending or spawning at that time goes
 * before both. A frozen entity's paints are skipped, not saved up.
 */
function runDue(state: MatchState, from: number, rng: Rng, held: HeldDirections): MatchState {
  let next = state;
  const events: MatchEvent[] = [];
  const bots: Record<PlayerId, BotTimers> = { ...state.bots };
  // A held move that is ignored waits for the next step rather than retrying forever at one time.
  const stalled = new Set<PlayerId>();

  const dwellPaint = (entity: Entity, at: number) => {
    const entities = next.entities.map((e) => (e.id === entity.id ? { ...e, dwellPaintAt: at + PAINT_DWELL_MS } : e));
    if (at < entity.frozenUntil) {
      next = { ...next, entities };
      return;
    }
    next = { ...next, grid: paint(next.grid, entities, entity.id, entity.paintMultiplier), entities };
    events.push({ type: 'painted', entityId: entity.id });
  };

  // Takes the state after one action, which reports only its own events.
  const apply = (after: MatchState) => {
    events.push(...after.events);
    next = after;
  };

  const tryMove = (entityId: PlayerId, direction: Direction | null, at: number) => {
    const after = direction ? applyInput(next, { type: 'move', entityId, direction }, at, rng) : next;
    if (after === next) return false;
    apply(after);
    return true;
  };

  for (;;) {
    let dueAt = Infinity;
    let act: (() => void) | null = null;

    for (const entity of next.entities) {
      const endsAt = entity.activePowerUp?.endsAt;
      if (endsAt !== undefined && endsAt < dueAt) {
        dueAt = endsAt;
        act = () => apply(expirePowerUp(next, entity.id, endsAt));
      }
    }
    for (const entity of next.entities) {
      const { expiresAt } = entity;
      if (expiresAt !== null && expiresAt < dueAt) {
        dueAt = expiresAt;
        act = () => {
          next = { ...next, entities: next.entities.filter((e) => e.id !== entity.id) };
          delete bots[entity.id];
        };
      }
    }
    for (const pickup of next.pickups) {
      if (pickup.expiresAt < dueAt) {
        dueAt = pickup.expiresAt;
        act = () => apply(despawnPickup(next, pickup.id));
      }
    }
    const { nextSpawnAt } = next;
    if (nextSpawnAt !== null && nextSpawnAt < dueAt) {
      dueAt = nextSpawnAt;
      act = () => apply(spawnWave(next, nextSpawnAt, rng));
    }
    for (const entity of next.entities) {
      if (entity.dwellPaintAt < dueAt) {
        dueAt = entity.dwellPaintAt;
        act = () => dwellPaint(entity, entity.dwellPaintAt);
      }
    }
    for (const entity of next.entities) {
      const timers = bots[entity.id];
      const direction = held[entity.id];
      if (timers && timers.nextMoveAt < dueAt) {
        const at = timers.nextMoveAt;
        dueAt = at;
        act = () => {
          tryMove(entity.id, chooseBotDirection(next.entities, entity.id, rng, next.grid.length), at);
          // At least 1ms, so a zero interval can't spin forever.
          bots[entity.id] = { nextMoveAt: at + Math.max(1, entity.moveIntervalMs) };
        };
      } else if (!timers && direction && !stalled.has(entity.id)) {
        const at = Math.max(moveReadyAt(entity), from);
        if (at < dueAt) {
          dueAt = at;
          act = () => {
            if (!tryMove(entity.id, direction, at)) stalled.add(entity.id);
          };
        }
      }
    }

    if (!act || dueAt > next.elapsedMs) break;
    act();
  }

  return { ...next, bots, events: events.length > 0 ? events : NO_EVENTS };
}

/**
 * Advances the match by `deltaMs` of wall-clock time: runs the pre-match countdown and then starts
 * play, scheduling the first wave of pickups; while playing, runs the match clock, power-ups,
 * pickups, the bots, dwell paints and the `held` swipes, and ends the match when the clock hits 0,
 * where any active power-ups just stop. Whatever is due at match time 0 — every entity's paint on
 * its starting cell first — happens in the step that ends the countdown. A paused or ended match
 * comes back unchanged.
 */
export function step(state: MatchState, deltaMs: number, rng: Rng, held: HeldDirections = {}): MatchState {
  if (state.status === 'countdown') {
    const countdownMs = Math.max(0, state.countdownMs - deltaMs);
    if (countdownMs > 0) return { ...state, countdownMs, events: NO_EVENTS };
    const nextSpawnAt = state.nextSpawnAt ?? state.elapsedMs + spawnDelay(rng);
    return runDue({ ...state, countdownMs, status: 'playing', nextSpawnAt }, state.elapsedMs, rng, held);
  }
  if (state.status !== 'playing') return state;

  const playedMs = Math.min(deltaMs, state.remainingMs);
  const next = runDue(
    { ...state, remainingMs: state.remainingMs - playedMs, elapsedMs: state.elapsedMs + playedMs },
    state.elapsedMs,
    rng,
    held
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
