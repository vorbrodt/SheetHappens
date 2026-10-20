import { BOT_MOVE_INTERVAL_MS, chooseBotDirection } from './bots';
import { findPlacement, getCorners, getStartingPositions } from './placement';
import { activatePowerUp, expirePowerUp } from './powerups/lifecycle';
import { collectPickups, despawnPickup, INVENTORY_SLOTS, spawnDelay, spawnWave } from './powerups/pickups';
import { Rng } from './random';
import {
  BOARD_SIZE,
  cellsFree,
  createEmptyGrid,
  entityCells,
  footprintCells,
  paint,
  planMove,
  samePosition,
  updateEntity,
} from './rules';
import {
  BotTimers,
  Direction,
  Entity,
  MatchConfig,
  MatchEvent,
  MatchInput,
  MatchState,
  PlayerId,
  Position,
} from './types';

export const DEFAULT_CONFIG: MatchConfig = { durationSeconds: 30, botCount: 2, boardSize: BOARD_SIZE };

// Length of the 3-2-1 countdown that runs before every match.
export const COUNTDOWN_MS = 3_000;

// A player's default moveIntervalMs: how fast a held swipe repeats.
export const PLAYER_MOVE_INTERVAL_MS = 200;

// How long an entity stands on a cell for each paint after the one it gets for entering it.
export const PAINT_DWELL_MS = 500;

// How long a killed entity stays off the board.
export const RESPAWN_MS = 5_000;

// How long a respawn waits to try again when every corner is taken.
export const RESPAWN_RETRY_MS = 100;

// The shortest gap allowed between two of an entity's teleports.
export const TELEPORT_COOLDOWN_MS = 500;

// A summoned ghost's moveIntervalMs.
export const GHOST_MOVE_INTERVAL_MS = 400;

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
    lastTeleportAt: null,
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
 * Has the entity arrive on `cells`, however it got there: paints each of them once, restarts its
 * dwell timer and takes the pickups under them and under every cell it now covers. The returned
 * events are its own.
 */
function enter(state: MatchState, entityId: PlayerId, cells: Position[], now: number): MatchState {
  const entities = state.entities.map((e) => (e.id === entityId ? { ...e, dwellPaintAt: now + PAINT_DWELL_MS } : e));
  const entity = entities.find((e) => e.id === entityId)!;
  const painted = { ...state, grid: paint(state.grid, entities, entityId, entity.paintMultiplier, cells), entities };
  const collected = collectPickups(painted, entityId, cells);
  return { ...collected, events: [{ type: 'painted', entityId }, ...collected.events] };
}

// Takes the entity off the board until RESPAWN_MS from now. Its paint stays. The returned events
// are its own.
function kill(state: MatchState, entityId: PlayerId, by: PlayerId, now: number): MatchState {
  return {
    ...updateEntity(state, entityId, { respawnAt: now + RESPAWN_MS }),
    events: [{ type: 'killed', entityId, by }],
  };
}

/**
 * Brings a dead entity back at `now` on a random free corner (its footprint covering the corner)
 * and has it enter the cells it lands on. With every corner taken it tries again RESPAWN_RETRY_MS
 * later. The returned events are its own.
 */
function respawn(state: MatchState, entityId: PlayerId, now: number, rng: Rng): MatchState {
  const entity = state.entities.find((e) => e.id === entityId);
  if (!entity) return state;

  const size = state.grid.length;
  const placements = getCorners(size)
    .map((corner) => findPlacement(state.entities, entityId, entity.footprint, corner, size))
    .filter((position) => position !== null);
  if (placements.length === 0) {
    return { ...updateEntity(state, entityId, { respawnAt: now + RESPAWN_RETRY_MS }), events: [] };
  }

  const position = placements[Math.floor(rng() * placements.length)];
  const back = updateEntity(state, entityId, { position, respawnAt: null });
  const entered = enter(back, entityId, footprintCells(position, entity.footprint), now);
  return { ...entered, events: [{ type: 'respawned', entityId }, ...entered.events] };
}

// Teleports the entity to `target`, if it can teleport, its cooldown has passed and its footprint
// fits there. That counts as entering every cell it lands on. The returned events are its own.
function teleport(state: MatchState, entity: Entity, target: Position, now: number): MatchState {
  if (!entity.canTeleport) return state;
  if (entity.lastTeleportAt !== null && now < entity.lastTeleportAt + TELEPORT_COOLDOWN_MS) return state;
  const cells = footprintCells(target, entity.footprint);
  if (!cellsFree(state.entities, cells, state.grid.length, entity.id)) return state;

  const moved = updateEntity(state, entity.id, { position: target, lastTeleportAt: now });
  const entered = enter(moved, entity.id, cells, now);
  return {
    ...entered,
    events: [{ type: 'teleported', entityId: entity.id, from: entity.position, to: target }, ...entered.events],
  };
}

/**
 * Applies one entity's input at `now` on the match clock. Inputs are ignored — the same state
 * comes back — unless the match is playing and the entity exists, is alive and is not frozen.
 *
 * A move is also ignored when it comes sooner than the entity's moveIntervalMs after its last
 * move, or is blocked straight away (see planMove). Otherwise the entity travels as far as it can,
 * entering every cell it passes over: each is painted and its pickups taken, and the dwell timer
 * restarts where it ends up. A lethal mover kills whoever it runs into on the way, and a mover that
 * runs into a lethal entity dies there. Teleports and power-ups are up to teleport and
 * activatePowerUp.
 */
export function applyInput(state: MatchState, input: MatchInput, now: number, rng: Rng): MatchState {
  if (state.status !== 'playing') return state;
  const entity = state.entities.find((e) => e.id === input.entityId);
  if (!entity || entity.respawnAt !== null || now < entity.frozenUntil) return state;
  if (input.type === 'usePowerUp') return activatePowerUp(state, entity.id, input.slot, now, rng);
  if (input.type === 'teleport') return teleport(state, entity, input.target, now);

  if (now < moveReadyAt(entity)) return state;
  const plan = planMove(state.entities, entity.id, input.direction, state.grid.length);
  if (!plan || (plan.distance === 0 && plan.killedBy === null)) return state;

  let next = state;
  const events: MatchEvent[] = [];
  const apply = (after: MatchState) => {
    events.push(...after.events);
    next = after;
  };

  if (plan.distance > 0) {
    events.push({ type: 'moved', entityId: entity.id, direction: input.direction, distance: plan.distance });
    for (const victimId of plan.kills) apply(kill(next, victimId, entity.id, now));
    const moved = updateEntity(next, entity.id, { position: plan.position, lastMoveAt: now });
    apply(enter(moved, entity.id, plan.entered, now));
  }
  if (plan.killedBy !== null) apply(kill(next, entity.id, plan.killedBy, now));
  return { ...next, events };
}

/**
 * Summons `count` ghosts for the owner at the current match time, each on a random cell no living
 * entity covers among those nearest the owner. They wear the owner's color, paint as it does and
 * are moved by the bot AI every GHOST_MOVE_INTERVAL_MS, starting with a paint where they appear.
 * They leave at `expiresAt`, or stay for good with null. Summons that find no free cell are skipped.
 */
export function summon(
  state: MatchState,
  ownerId: PlayerId,
  count: number,
  rng: Rng,
  expiresAt: number | null = null
): MatchState {
  const owner = state.entities.find((e) => e.id === ownerId);
  if (!owner) return state;

  const now = state.elapsedMs;
  const size = state.grid.length;
  const ownerCells = entityCells(owner);
  const distance = (cell: Position) =>
    Math.min(...ownerCells.map((o) => Math.abs(o.row - cell.row) + Math.abs(o.col - cell.col)));
  let entities = state.entities;
  const bots = { ...state.bots };

  for (let i = 0; i < count; i++) {
    const taken = entities.filter((e) => e.respawnAt === null).flatMap(entityCells);
    const free: Position[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!taken.some((cell) => samePosition(cell, { row, col }))) free.push({ row, col });
      }
    }
    if (free.length === 0) break;

    const nearest = Math.min(...free.map(distance));
    const candidates = free.filter((cell) => distance(cell) === nearest);
    const ghost = createEntity({
      id: `${ownerId}-summon-${now}-${i}`,
      color: owner.color,
      position: candidates[Math.floor(rng() * candidates.length)],
      moveIntervalMs: GHOST_MOVE_INTERVAL_MS,
      dwellPaintAt: now,
      ghost: true,
      paintsAs: owner.paintsAs,
      summonedBy: ownerId,
      expiresAt,
    });
    entities = [...entities, ghost];
    bots[ghost.id] = { nextMoveAt: now + GHOST_MOVE_INTERVAL_MS };
  }

  return { ...state, entities, bots };
}

/**
 * Runs everything that came due by the match clock, in time order: power-ups running out, summoned
 * entities leaving, dead entities respawning, pickups despawning, waves of pickups spawning, every
 * living entity's dwell paints, every living bot's moves (a random legal direction every
 * moveIntervalMs; a boxed-in bot waits for its next turn) and the moves of every held direction,
 * from `from` at the earliest. Each action is
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
    for (const entity of next.entities) {
      const { respawnAt } = entity;
      if (respawnAt !== null && respawnAt < dueAt) {
        dueAt = respawnAt;
        act = () => apply(respawn(next, entity.id, respawnAt, rng));
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
      if (entity.respawnAt === null && entity.dwellPaintAt < dueAt) {
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
          const alive = entity.respawnAt === null;
          tryMove(entity.id, alive ? chooseBotDirection(next.entities, entity.id, rng, next.grid.length) : null, at);
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
