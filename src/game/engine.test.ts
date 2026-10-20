import { BOT_MOVE_INTERVAL_MS, BOT_POWER_UP_DELAY_MIN_MS, BOT_POWER_UP_DELAY_MAX_MS } from './bots';
import {
  applyInput,
  COUNTDOWN_MS,
  createEntity,
  createMatch,
  GHOST_MOVE_INTERVAL_MS,
  HeldDirections,
  PAINT_DWELL_MS,
  PLAYER_MOVE_INTERVAL_MS,
  RESPAWN_MS,
  RESPAWN_RETRY_MS,
  setPaused,
  step,
  summon,
  TELEPORT_COOLDOWN_MS,
} from './engine';
import { POWER_UPS } from './powerups/registry';
import { Pickup } from './powerups/types';
import { createRng, Rng } from './random';
import { BOARD_SIZE, MAX_INTENSITY, rankEntities } from './rules';
import { Direction, Entity, MatchEvent, MatchState, PlayerId, Position } from './types';

const PLAYER = 'player';
const FRAME_MS = 16;

// Never called: matches without bots or pickups don't draw random numbers.
const noRandom: Rng = () => {
  throw new Error('unexpected random draw');
};

// A match with `botCount` bots, run past the countdown so it is playing at match time 0. No
// pickups ever spawn in it.
function playingMatch(botCount = 0, rng: Rng = noRandom, boardSize = BOARD_SIZE): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount, boardSize }, PLAYER);
  return step({ ...match, nextSpawnAt: Infinity }, COUNTDOWN_MS, rng);
}

function entity(state: MatchState, id: PlayerId): Entity {
  return state.entities.find((e) => e.id === id)!;
}

function withEntity(state: MatchState, id: PlayerId, patch: Partial<Entity>): MatchState {
  return { ...state, entities: state.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}

function moveInput(direction: Direction, entityId = PLAYER) {
  return { type: 'move', entityId, direction } as const;
}

// Moves the entity at the current match time, as a swipe would.
function swipe(state: MatchState, direction: Direction, entityId = PLAYER): MatchState {
  return applyInput(state, moveInput(direction, entityId), state.elapsedMs, noRandom);
}

function count(events: MatchEvent[], type: MatchEvent['type'], entityId?: PlayerId) {
  return events.filter((e) => e.type === type && (entityId === undefined || ('entityId' in e && e.entityId === entityId)))
    .length;
}

// Steps `ms` of play in `frameMs` frames, collecting every event along the way.
function run(state: MatchState, ms: number, rng: Rng, frameMs = FRAME_MS, held: HeldDirections = {}) {
  const events: MatchEvent[] = [];
  for (let t = 0; t < ms; t += frameMs) {
    state = step(state, Math.min(frameMs, ms - t), rng, held);
    events.push(...state.events);
  }
  return { state, events };
}

/**
 * A full 60s match against 5 bots. The player holds a swipe that sweeps the board in a snake
 * pattern, so the engine sets the pace, and paints by stepping onto cells.
 */
function simulateMatch(seed: number): MatchState {
  const rng = createRng(seed);
  let state = step(createMatch({ durationSeconds: 60, botCount: 5, boardSize: BOARD_SIZE }, PLAYER), COUNTDOWN_MS, rng);

  while (state.status !== 'ended') {
    const { row, col } = entity(state, PLAYER).position;
    const sweepingRight = row % 2 === 0;
    const atRowEnd = sweepingRight ? col === BOARD_SIZE - 1 : col === 0;
    const direction: Direction = atRowEnd ? (row === BOARD_SIZE - 1 ? 'up' : 'down') : sweepingRight ? 'right' : 'left';
    state = step(state, FRAME_MS, rng, { [PLAYER]: direction });
  }
  return state;
}

describe('full simulated match', () => {
  it('plays out deterministically for a fixed seed', () => {
    const first = simulateMatch(42);
    const second = simulateMatch(42);

    expect(first.status).toBe('ended');
    expect(first.elapsedMs).toBe(60_000);
    expect(second).toEqual(first);
    expect(rankEntities(first.grid, first.entities.map((e) => e.id))).toMatchSnapshot();
  });

  it('plays out differently for a different seed', () => {
    expect(simulateMatch(7).grid).not.toEqual(simulateMatch(42).grid);
  });

  it('keeps every entity on the board, on its own cell, and gets everyone painting', () => {
    const state = simulateMatch(42);
    const keys = state.entities.map((e) => `${e.position.row},${e.position.col}`);
    expect(new Set(keys).size).toBe(state.entities.length);

    const standings = rankEntities(state.grid, state.entities.map((e) => e.id));
    for (const standing of standings) expect(standing.cellsOwned).toBeGreaterThan(0);
  });
});

describe('board size', () => {
  it.each([8, 12, 16])('builds a %i-cell-wide board with the bots in its corners', (size) => {
    const state = createMatch({ durationSeconds: 60, botCount: 3, boardSize: size }, PLAYER);
    const last = size - 1;

    expect(state.grid).toHaveLength(size);
    expect(state.grid.every((row) => row.length === size)).toBe(true);
    expect(state.entities.map((e) => e.position)).toEqual([
      { row: 0, col: 0 },
      { row: last, col: last },
      { row: 0, col: last },
      { row: last, col: 0 },
    ]);
  });

  it('lets the player reach the far edge of a bigger board and no further', () => {
    let state = playingMatch(0, noRandom, 16);
    for (let i = 0; i < 20; i++) state = applyInput(state, moveInput('right'), i * PLAYER_MOVE_INTERVAL_MS, noRandom);

    expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 15 });
    expect(state.grid[0][15].owner).toBe(PLAYER);
  });

  it('lets bots move from the far corner of a bigger board', () => {
    const rng = createRng(1);
    const { state, events } = run(playingMatch(1, rng, 16), 3_000, rng);

    expect(count(events, 'moved', 'bot-1')).toBeGreaterThan(0);
    for (const { position } of state.entities) {
      expect(position.row).toBeLessThan(16);
      expect(position.col).toBeLessThan(16);
    }
  });
});

describe('applyInput', () => {
  it('ignores input outside play', () => {
    const counting = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
    expect(applyInput(counting, moveInput('right'), 0, noRandom)).toBe(counting);

    const paused = setPaused(playingMatch(), true);
    expect(applyInput(paused, moveInput('right'), 0, noRandom)).toBe(paused);
  });

  it('ignores unknown entities and blocked moves', () => {
    const state = playingMatch();
    expect(applyInput(state, moveInput('right', 'nobody'), 0, noRandom)).toBe(state);
    expect(applyInput(state, moveInput('up'), 0, noRandom)).toBe(state);
  });

  it('reports a move and the paint on the cell moved onto as events', () => {
    const state = swipe(playingMatch(), 'right');
    expect(state.events).toEqual([
      { type: 'moved', entityId: PLAYER, direction: 'right', distance: 1 },
      { type: 'painted', entityId: PLAYER },
    ]);
  });
});

describe('dwell painting', () => {
  it('paints nothing during the countdown', () => {
    const counting = step(createMatch({ durationSeconds: 60, botCount: 2, boardSize: BOARD_SIZE }, PLAYER), COUNTDOWN_MS - 1, noRandom);
    expect(counting.grid.flat().every((cell) => cell.owner === null)).toBe(true);
  });

  it('paints every starting cell the moment play starts', () => {
    const state = playingMatch();
    expect(state.grid[0][0]).toEqual({ owner: PLAYER, intensity: 1 });
    expect(state.events).toEqual([{ type: 'painted', entityId: PLAYER }]);
  });

  it('paints again every PAINT_DWELL_MS while the entity stands still', () => {
    let state = step(playingMatch(), PAINT_DWELL_MS - 1, noRandom);
    expect(state.grid[0][0].intensity).toBe(1);
    expect(state.events).toEqual([]);

    state = step(state, 1, noRandom);
    expect(state.grid[0][0].intensity).toBe(2);
    expect(state.events).toEqual([{ type: 'painted', entityId: PLAYER }]);

    state = step(state, PAINT_DWELL_MS, noRandom);
    expect(state.grid[0][0].intensity).toBe(3);
  });

  it('paints the cell moved onto at once and restarts the dwell timer there', () => {
    let state = swipe(step(playingMatch(), 300, noRandom), 'right');
    expect(state.grid[0][1]).toEqual({ owner: PLAYER, intensity: 1 });

    // The old cell's paint, due at 500ms, never comes; the new cell's is due 500ms after the move.
    state = step(state, PAINT_DWELL_MS - 1, noRandom);
    expect(state.grid[0][0].intensity).toBe(1);
    expect(state.grid[0][1].intensity).toBe(1);
    state = step(state, 1, noRandom);
    expect(state.grid[0][1].intensity).toBe(2);
  });

  it('paints on every entry, not just the first visit', () => {
    let state = swipe(playingMatch(), 'right');
    state = step(state, PLAYER_MOVE_INTERVAL_MS, noRandom);
    state = swipe(state, 'left');
    expect(state.grid[0][0].intensity).toBe(2);
    expect(state.grid[0][1].intensity).toBe(1);
  });

  it('accrues no paints while paused', () => {
    let state = step(playingMatch(), 400, noRandom);
    state = setPaused(state, true);
    state = step(state, 5_000, noRandom);
    state = setPaused(state, false);

    state = step(state, PAINT_DWELL_MS - 400 - 1, noRandom);
    expect(state.grid[0][0].intensity).toBe(1);
    state = step(state, 1, noRandom);
    expect(state.grid[0][0].intensity).toBe(2);
  });

  it('lands held moves and dwell paints at their due times, whatever the frame size', () => {
    const start = withEntity(playingMatch(), PLAYER, { moveIntervalMs: 600 });
    const held = { [PLAYER]: 'right' } as const;
    const byFrames = run(start, 1_200, noRandom, FRAME_MS, held);
    const inOneGo = run(start, 1_200, noRandom, 1_200, held);

    // Moves at 0, 600 and 1200ms; the first two cells moved onto are painted on entry and 500ms on.
    expect(byFrames.state.grid[0].slice(0, 4).map((cell) => cell.intensity)).toEqual([1, 2, 2, 1]);
    expect(inOneGo.state).toEqual({ ...byFrames.state, events: inOneGo.state.events });
  });
});

describe('per-entity effects', () => {
  describe('moveIntervalMs', () => {
    it('rejects a move sooner than the interval after the last one', () => {
      let state = applyInput(playingMatch(), moveInput('right'), 0, noRandom);
      const early = applyInput(state, moveInput('right'), PLAYER_MOVE_INTERVAL_MS - 1, noRandom);
      expect(early).toBe(state);

      state = applyInput(state, moveInput('right'), PLAYER_MOVE_INTERVAL_MS, noRandom);
      expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 2 });
    });

    it('lets a faster entity move sooner', () => {
      let state = withEntity(playingMatch(), PLAYER, { moveIntervalMs: 50 });
      state = applyInput(state, moveInput('right'), 0, noRandom);
      state = applyInput(state, moveInput('right'), 50, noRandom);
      expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 2 });
    });

    it('sets how often a bot moves', () => {
      const moves = (moveIntervalMs: number) => {
        const match = withEntity(createMatch({ durationSeconds: 60, botCount: 1, boardSize: BOARD_SIZE }, PLAYER), 'bot-1', { moveIntervalMs });
        const rng = createRng(1);
        const start = step(match, COUNTDOWN_MS, rng);
        return count([...start.events, ...run(start, 3_000, rng).events], 'moved');
      };

      // Due at 0ms, as play starts, and every interval after, up to and including 3000ms.
      expect(moves(BOT_MOVE_INTERVAL_MS)).toBe(1 + 3_000 / BOT_MOVE_INTERVAL_MS);
      expect(moves(BOT_MOVE_INTERVAL_MS / 2)).toBe(1 + (2 * 3_000) / BOT_MOVE_INTERVAL_MS);
    });
  });

  describe('paintMultiplier', () => {
    it('scales every paint', () => {
      let state = withEntity(playingMatch(), PLAYER, { paintMultiplier: 2 });
      state = step(state, PAINT_DWELL_MS, noRandom);
      expect(state.grid[0][0].intensity).toBe(1 + 2);

      state = step(state, PAINT_DWELL_MS, noRandom);
      expect(state.grid[0][0].intensity).toBe(MAX_INTENSITY);

      state = swipe(state, 'right');
      expect(state.grid[0][1].intensity).toBe(2);
    });
  });

  describe('frozenUntil', () => {
    it('ignores the entity’s moves and skips its paints until it thaws', () => {
      let state = withEntity(playingMatch(), PLAYER, { frozenUntil: 1_000 });
      expect(applyInput(state, moveInput('right'), 999, noRandom)).toBe(state);
      state = step(state, 999, noRandom);
      expect(state.grid[0][0].intensity).toBe(1);

      // The paint due at 1000ms lands; the one due at 500ms is not made up.
      state = step(state, 1, noRandom);
      expect(state.grid[0][0].intensity).toBe(2);
      const thawed = swipe(state, 'right');
      expect(entity(thawed, PLAYER).position).toEqual({ row: 0, col: 1 });
    });

    it('stops a bot acting until it thaws', () => {
      const frozen = withEntity(createMatch({ durationSeconds: 60, botCount: 1, boardSize: BOARD_SIZE }, PLAYER), 'bot-1', {
        frozenUntil: 1_000,
      });
      const { state, events } = run(step(frozen, COUNTDOWN_MS, createRng(1)), 999, createRng(1));
      expect(events.filter((e) => 'entityId' in e && e.entityId === 'bot-1')).toEqual([]);
      expect(state.grid.flat().some((cell) => cell.owner === 'bot-1')).toBe(false);

      expect(count(run(state, 100, createRng(1)).events, 'painted', 'bot-1')).toBeGreaterThan(0);
    });
  });
});

describe('step', () => {
  it('leaves a paused or ended match untouched', () => {
    const paused = setPaused(playingMatch(), true);
    expect(step(paused, 1_000, noRandom)).toBe(paused);

    const ended = step(playingMatch(), Number.MAX_SAFE_INTEGER, noRandom);
    expect(ended.status).toBe('ended');
    expect(step(ended, 1_000, noRandom)).toBe(ended);
  });

  it('runs bots at their own pace, whatever the frame size', () => {
    const start = playingMatch(1, createRng(3));
    const byFrames = run(start, 1_200, createRng(3));
    const inOneGo = run(start, 1_200, createRng(3), 1_200);

    // Moves at 600 and 1200ms (the one at 0 came as play started), each painting the cell entered,
    // plus a dwell paint 500ms after each of the moves at 0 and 600ms.
    expect(count(byFrames.events, 'moved', 'bot-1')).toBe(1_200 / BOT_MOVE_INTERVAL_MS);
    expect(count(byFrames.events, 'painted', 'bot-1')).toBe(4);
    // Bots paint at the player's rate: the player, standing still, paints at 500 and 1000ms.
    expect(count(byFrames.events, 'painted', PLAYER)).toBe(Math.floor(1_200 / PAINT_DWELL_MS));
    expect(inOneGo.state).toEqual({ ...byFrames.state, events: inOneGo.state.events });
  });
});

describe('power-up mechanics', () => {
  const RIVAL = 'rival';
  // Footprints, as offsets from the entity's position.
  const BLOCK_2X2 = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ];
  const COLUMN_1X4 = [0, 1, 2, 3].map((row) => ({ row, col: 0 }));

  // Adds an entity with no bot timers, so it only moves when told to.
  function withRival(state: MatchState, position: Position, patch: Partial<Entity> = {}, id = RIVAL): MatchState {
    return { ...state, entities: [...state.entities, createEntity({ id, color: '#3b82f6', position, ...patch })] };
  }

  function intensities(state: MatchState, cells: [number, number][]) {
    return cells.map(([row, col]) => state.grid[row][col].intensity);
  }

  function teleportTo(state: MatchState, target: Position, at = state.elapsedMs): MatchState {
    return applyInput(state, { type: 'teleport', entityId: PLAYER, target }, at, noRandom);
  }

  describe('footprint', () => {
    it('moves a 2x2 block as one and paints only the cells it newly covers', () => {
      let state = swipe(withEntity(playingMatch(), PLAYER, { footprint: BLOCK_2X2 }), 'right');

      expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 1 });
      expect(state.events[0]).toEqual({ type: 'moved', entityId: PLAYER, direction: 'right', distance: 1 });
      // (0,0) kept its paint from the start of play; (0,1) and (1,1) were already covered.
      expect(intensities(state, [[0, 0], [0, 1], [1, 1], [0, 2], [1, 2]])).toEqual([1, 0, 0, 1, 1]);

      // The dwell paint covers the whole footprint.
      state = step(state, PAINT_DWELL_MS, noRandom);
      expect(intensities(state, [[0, 1], [0, 2], [1, 1], [1, 2]])).toEqual([1, 2, 1, 2]);
    });

    it('blocks a 2x2 move when any destination cell is taken or off the board', () => {
      const block = withEntity(playingMatch(), PLAYER, { footprint: BLOCK_2X2 });

      const occupied = withRival(block, { row: 1, col: 2 });
      expect(swipe(occupied, 'right')).toBe(occupied);
      expect(swipe(block, 'up')).toBe(block);

      const atEdge = withEntity(block, PLAYER, { position: { row: 0, col: BOARD_SIZE - 2 } });
      expect(swipe(atEdge, 'right')).toBe(atEdge);
    });

    it('moves a 1x4 column along its length and sideways, blocked by any of its cells', () => {
      const column = withEntity(playingMatch(), PLAYER, { footprint: COLUMN_1X4 });

      const down = swipe(column, 'down');
      expect(entity(down, PLAYER).position).toEqual({ row: 1, col: 0 });
      expect(intensities(down, [[1, 0], [4, 0]])).toEqual([0, 1]);

      const right = swipe(column, 'right');
      expect(intensities(right, [[0, 1], [1, 1], [2, 1], [3, 1]])).toEqual([1, 1, 1, 1]);

      const blocked = withRival(column, { row: 3, col: 1 });
      expect(swipe(blocked, 'right')).toBe(blocked);
      const bottom = withEntity(column, PLAYER, { position: { row: BOARD_SIZE - 4, col: 0 } });
      expect(swipe(bottom, 'down')).toBe(bottom);
    });

    it('blocks others from every cell it covers', () => {
      const state = withRival(withEntity(playingMatch(), PLAYER, { footprint: BLOCK_2X2 }), { row: 2, col: 1 });
      expect(swipe(state, 'up', RIVAL)).toBe(state);
    });
  });

  describe('moveStep', () => {
    it('travels moveStep cells, entering every one', () => {
      const pickups: Pickup[] = [
        { id: 'p', kind: 'speedster', position: { row: 0, col: 1 }, spawnedAt: 0, expiresAt: Infinity },
      ];
      const state = swipe({ ...withEntity(playingMatch(), PLAYER, { moveStep: 2 }), pickups }, 'right');

      expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 2 });
      expect(state.events[0]).toEqual({ type: 'moved', entityId: PLAYER, direction: 'right', distance: 2 });
      expect(intensities(state, [[0, 1], [0, 2]])).toEqual([1, 1]);
      expect(entity(state, PLAYER).inventory).toEqual(['speedster', null]);
    });

    it('stops early at the first blocked cell', () => {
      const twoStep = withEntity(playingMatch(), PLAYER, { moveStep: 2 });

      const blocked = swipe(withRival(twoStep, { row: 0, col: 2 }), 'right');
      expect(entity(blocked, PLAYER).position).toEqual({ row: 0, col: 1 });
      expect(blocked.events[0]).toMatchObject({ type: 'moved', distance: 1 });

      const edge = swipe(withEntity(twoStep, PLAYER, { position: { row: 0, col: BOARD_SIZE - 2 } }), 'right');
      expect(entity(edge, PLAYER).position).toEqual({ row: 0, col: BOARD_SIZE - 1 });
    });
  });

  describe('ghosts', () => {
    const ghost: Partial<Entity> = { ghost: true, paintsAs: PLAYER, summonedBy: PLAYER };

    it('share cells with others in both directions', () => {
      const state = withRival(playingMatch(), { row: 0, col: 1 }, ghost, 'ghost');

      const intoGhost = swipe(state, 'right');
      expect(entity(intoGhost, PLAYER).position).toEqual({ row: 0, col: 1 });

      const ghostInto = swipe(state, 'left', 'ghost');
      expect(entity(ghostInto, 'ghost').position).toEqual({ row: 0, col: 0 });
    });

    it('paint for their owner', () => {
      let state = withRival(playingMatch(), { row: 4, col: 4 }, ghost, 'ghost');
      state = step(swipe(state, 'right', 'ghost'), PAINT_DWELL_MS, noRandom);

      expect(state.grid[4][5]).toEqual({ owner: PLAYER, intensity: 2 });
      expect(state.grid.flat().some((cell) => cell.owner === 'ghost')).toBe(false);
    });

    it('can’t be killed', () => {
      const state = swipe(withRival(withEntity(playingMatch(), PLAYER, { lethal: true }), { row: 0, col: 1 }, ghost, 'ghost'), 'right');
      expect(count(state.events, 'killed')).toBe(0);
      expect(entity(state, 'ghost').respawnAt).toBeNull();
    });

    it('are summoned next to the owner and wander as bots, painting for it until they expire', () => {
      const rng = createRng(5);
      const start = step(playingMatch(), 1_000, noRandom);
      let state = summon(start, PLAYER, 3, rng, 4_000);
      const ghosts = state.entities.filter((e) => e.summonedBy === PLAYER);

      expect(ghosts).toHaveLength(3);
      expect(ghosts.every((g) => g.ghost && g.paintsAs === PLAYER && g.moveIntervalMs === GHOST_MOVE_INTERVAL_MS)).toBe(true);
      // The two cells next to the corner first, then one two steps away.
      const keys = ghosts.map((g) => `${g.position.row},${g.position.col}`);
      expect(keys.slice(0, 2).sort()).toEqual(['0,1', '1,0']);
      expect(['0,2', '1,1', '2,0']).toContain(keys[2]);
      for (const g of ghosts) expect(state.bots[g.id]).toEqual({ nextMoveAt: 1_000 + GHOST_MOVE_INTERVAL_MS });

      const { state: later, events } = run(state, 2_000, rng);
      state = later;
      for (const g of ghosts) expect(count(events, 'moved', g.id)).toBe(2_000 / GHOST_MOVE_INTERVAL_MS);
      expect(state.grid.flat().every((cell) => cell.owner === null || cell.owner === PLAYER)).toBe(true);

      state = run(state, 1_000, rng).state;
      expect(state.entities.map((e) => e.id)).toEqual([PLAYER]);
    });
  });

  describe('lethal', () => {
    it('kills whoever a lethal mover runs into and takes the cell', () => {
      const start = withRival(withEntity(step(playingMatch(), 1_000, noRandom), PLAYER, { lethal: true }), { row: 0, col: 1 });
      const state = swipe(start, 'right');

      expect(state.events).toEqual([
        { type: 'moved', entityId: PLAYER, direction: 'right', distance: 1 },
        { type: 'killed', entityId: RIVAL, by: PLAYER },
        { type: 'painted', entityId: PLAYER },
      ]);
      expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 1 });
      expect(entity(state, RIVAL).respawnAt).toBe(1_000 + RESPAWN_MS);
      expect(entity(state, PLAYER).kills).toBe(1);
    });

    it('kills whoever runs into a lethal entity, which stays put', () => {
      const start = withRival(step(playingMatch(), 1_000, noRandom), { row: 0, col: 1 }, { lethal: true });
      const state = swipe(start, 'right');

      expect(state.events).toEqual([{ type: 'killed', entityId: PLAYER, by: RIVAL }]);
      expect(entity(state, PLAYER).respawnAt).toBe(1_000 + RESPAWN_MS);
      expect(entity(state, RIVAL).position).toEqual({ row: 0, col: 1 });
      expect(state.grid[0][1].owner).toBe(null);
      expect(entity(state, RIVAL).kills).toBe(1);
      expect(entity(state, PLAYER).kills).toBe(0);
    });

    it('lets two lethal entities block each other', () => {
      const state = withRival(withEntity(playingMatch(), PLAYER, { lethal: true }), { row: 0, col: 1 }, { lethal: true });
      expect(swipe(state, 'right')).toBe(state);
    });

    it('takes the dead off the board until they respawn, leaving their paint', () => {
      // The rival paints its starting cell, steps up next to the player and is run over.
      let state = step(withRival(withEntity(playingMatch(), PLAYER, { lethal: true }), { row: 1, col: 1 }), 0, noRandom);
      state = swipe(swipe(state, 'up', RIVAL), 'right');
      expect(entity(state, RIVAL).respawnAt).toBe(RESPAWN_MS);

      const { state: dead, events } = run(state, RESPAWN_MS - 1, noRandom);
      expect(count(events, 'painted', RIVAL)).toBe(0);
      expect(dead.grid[1][1]).toEqual({ owner: RIVAL, intensity: 1 });
      expect(swipe(dead, 'down', RIVAL)).toBe(dead);

      // Where it died is free to walk back onto.
      const away = swipe(dead, 'left');
      const back = applyInput(away, moveInput('right'), away.elapsedMs + PLAYER_MOVE_INTERVAL_MS, noRandom);
      expect(entity(back, PLAYER).position).toEqual(entity(dead, RIVAL).position);
    });

    it('respawns the dead on a random free corner after RESPAWN_MS, painting it', () => {
      const start = withRival(withEntity(playingMatch(), PLAYER, { lethal: true }), { row: 0, col: 1 });
      // Every corner is free, and 0.999 picks the last.
      let state = swipe(start, 'right');
      state = step(state, RESPAWN_MS - 1, () => 0.999);
      expect(entity(state, RIVAL).respawnAt).toBe(RESPAWN_MS);

      state = step(state, 1, () => 0.999);
      expect(state.events.slice(0, 2)).toEqual([
        { type: 'respawned', entityId: RIVAL },
        { type: 'painted', entityId: RIVAL },
      ]);
      expect(entity(state, RIVAL)).toMatchObject({ position: { row: BOARD_SIZE - 1, col: BOARD_SIZE - 1 }, respawnAt: null });
      expect(state.grid[BOARD_SIZE - 1][BOARD_SIZE - 1]).toEqual({ owner: RIVAL, intensity: 1 });
    });

    it('waits for a corner to free up when every one is taken', () => {
      const last = BOARD_SIZE - 1;
      let state = withRival(playingMatch(), { row: 0, col: 1 }, { lethal: true });
      state = withRival(state, { row: 1, col: 0 }, {}, 'a');
      state = withRival(state, { row: 0, col: last }, {}, 'b');
      state = withRival(state, { row: last, col: 0 }, {}, 'c');
      state = withRival(state, { row: last, col: last }, {}, 'd');
      // The player dies on the lethal rival and 'a' takes its corner.
      state = swipe(swipe(state, 'right'), 'up', 'a');
      expect(entity(state, PLAYER).respawnAt).toBe(RESPAWN_MS);

      state = step(state, RESPAWN_MS, () => 0);
      expect(entity(state, PLAYER).respawnAt).toBe(RESPAWN_MS + RESPAWN_RETRY_MS);

      state = step(swipe(state, 'left', 'd'), RESPAWN_RETRY_MS, () => 0);
      expect(entity(state, PLAYER)).toMatchObject({ position: { row: last, col: last }, respawnAt: null });
    });
  });

  describe('teleport', () => {
    const teleporter = () => withEntity(step(playingMatch(), 1_000, noRandom), PLAYER, { canTeleport: true });

    it('moves the entity to a free target and enters it', () => {
      const state = teleportTo(teleporter(), { row: 5, col: 3 });

      expect(entity(state, PLAYER)).toMatchObject({ position: { row: 5, col: 3 }, lastTeleportAt: 1_000 });
      expect(state.events).toEqual([
        { type: 'teleported', entityId: PLAYER, from: { row: 0, col: 0 }, to: { row: 5, col: 3 } },
        { type: 'painted', entityId: PLAYER },
      ]);
      expect(state.grid[5][3]).toEqual({ owner: PLAYER, intensity: 1 });
      expect(entity(state, PLAYER).dwellPaintAt).toBe(1_000 + PAINT_DWELL_MS);
    });

    it('is refused without canTeleport, off the board or onto a taken cell', () => {
      const plain = step(playingMatch(), 1_000, noRandom);
      expect(teleportTo(plain, { row: 5, col: 3 })).toBe(plain);

      const state = withRival(teleporter(), { row: 5, col: 4 });
      expect(teleportTo(state, { row: 5, col: BOARD_SIZE })).toBe(state);
      expect(teleportTo(state, { row: 5, col: 4 })).toBe(state);

      // A 2x2 needs every one of its cells free.
      const block = withEntity(state, PLAYER, { footprint: BLOCK_2X2 });
      expect(teleportTo(block, { row: 4, col: 3 })).toBe(block);
      expect(teleportTo(block, { row: BOARD_SIZE - 1, col: 0 })).toBe(block);
      expect(entity(teleportTo(block, { row: 2, col: 2 }), PLAYER).position).toEqual({ row: 2, col: 2 });
    });

    it('waits TELEPORT_COOLDOWN_MS between teleports', () => {
      const first = teleportTo(teleporter(), { row: 5, col: 3 });

      expect(teleportTo(first, { row: 2, col: 2 }, 1_000 + TELEPORT_COOLDOWN_MS - 1)).toBe(first);
      const second = teleportTo(first, { row: 2, col: 2 }, 1_000 + TELEPORT_COOLDOWN_MS);
      expect(entity(second, PLAYER).position).toEqual({ row: 2, col: 2 });
    });
  });
});

describe('bot power-ups', () => {
  const BOT = 'bot';
  const always =
    (r: number): Rng =>
    () =>
      r;

  // Adds a bot that never moves, so only its power-up and teleport timers act.
  function withBot(state: MatchState, patch: Partial<Entity> = {}): MatchState {
    const bot = createEntity({ id: BOT, color: '#3b82f6', position: { row: 4, col: 4 }, ...patch });
    return { ...state, entities: [...state.entities, bot], bots: { ...state.bots, [BOT]: { nextMoveAt: Infinity } } };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses a power-up it carries 1–4s after getting it', () => {
    const carrying = withBot(playingMatch(), { inventory: ['speedster', null] });
    expect(step(carrying, 0, always(0.999)).bots[BOT].usePowerUpAt).toBeLessThanOrEqual(BOT_POWER_UP_DELAY_MAX_MS);
    let state = step(carrying, 0, always(0));
    expect(state.bots[BOT].usePowerUpAt).toBe(BOT_POWER_UP_DELAY_MIN_MS);

    state = run(state, BOT_POWER_UP_DELAY_MIN_MS - 1, always(0)).state;
    expect(entity(state, BOT).activePowerUp).toBeNull();

    const { state: used, events } = run(state, 1, always(0));
    expect(events).toContainEqual({ type: 'powerUpActivated', entityId: BOT, kind: 'speedster' });
    expect(entity(used, BOT).inventory).toEqual([null, null]);
    expect(used.bots[BOT].usePowerUpAt).toBeUndefined();
  });

  it('keeps its power-up timer while it moves', () => {
    const start = withBot(playingMatch(), { inventory: ['speedster', null], moveIntervalMs: 100 });
    const moving = { ...start, bots: { [BOT]: { nextMoveAt: 0 } } };
    const { state, events } = run(moving, BOT_POWER_UP_DELAY_MIN_MS, always(0));

    expect(count(events, 'moved', BOT)).toBeGreaterThan(0);
    expect(entity(state, BOT).activePowerUp?.kind).toBe('speedster');
  });

  it('waits for the running power-up to end before using the next', () => {
    const active = { kind: 'speedster', startedAt: 0, endsAt: 8_000 } as const;
    const start = withBot(playingMatch(), { inventory: ['jellyport', null], activePowerUp: active });
    const { state, events } = run(start, 8_000, always(0));

    expect(count(events, 'powerUpRefused')).toBe(0);
    expect(entity(state, BOT).activePowerUp).toEqual({ kind: 'jellyport', startedAt: 8_000, endsAt: 16_000 });
  });

  it('falls back to its other slot when one is refused', () => {
    jest.spyOn(POWER_UPS.jellysaurus, 'canActivate').mockReturnValue(false);
    const start = withBot(playingMatch(), { inventory: ['jellysaurus', 'speedster'] });
    const { state, events } = run(start, BOT_POWER_UP_DELAY_MIN_MS, always(0));

    expect(count(events, 'powerUpRefused')).toBe(0);
    expect(entity(state, BOT)).toMatchObject({ inventory: ['jellysaurus', null], activePowerUp: { kind: 'speedster' } });
    expect(state.bots[BOT].usePowerUpAt).toBe(2 * BOT_POWER_UP_DELAY_MIN_MS);
  });

  it('teleports to a random free cell every BOT_TELEPORT_INTERVAL_MS while Jellyport runs', () => {
    const start = withBot(playingMatch(), { inventory: ['jellyport', null] });
    const { state, events } = run(start, 10_000, always(0));

    // Used at 1s and running until 9s: a teleport every second from 2s to 8s. A draw of 0 picks the
    // first free cell in reading order.
    expect(count(events, 'teleported', BOT)).toBe(7);
    expect(events.find((e) => e.type === 'teleported')).toEqual({
      type: 'teleported',
      entityId: BOT,
      from: { row: 4, col: 4 },
      to: { row: 0, col: 1 },
    });
    expect(entity(state, BOT).canTeleport).toBe(false);
    expect(state.bots[BOT].teleportAt).toBeUndefined();
  });

  it('collects pickups it walks onto, then uses them', () => {
    const pickups: Pickup[] = [{ id: 'p', kind: 'speedster', position: { row: 4, col: 5 }, spawnedAt: 0, expiresAt: 20_000 }];
    let state = withBot({ ...playingMatch(), pickups });
    state = applyInput(state, moveInput('right', BOT), 0, noRandom);
    expect(entity(state, BOT).inventory).toEqual(['speedster', null]);

    state = run(state, BOT_POWER_UP_DELAY_MIN_MS, always(0)).state;
    expect(entity(state, BOT).activePowerUp?.kind).toBe('speedster');
  });

  it('leaves the player’s power-ups to the player', () => {
    const state = step(withEntity(playingMatch(), PLAYER, { inventory: ['speedster', null] }), 0, noRandom);
    expect(state.bots).toEqual({});
  });
});
