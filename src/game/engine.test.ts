import { BOT_MOVE_INTERVAL_MS } from './bots';
import {
  applyInput,
  COUNTDOWN_MS,
  createMatch,
  HeldDirections,
  PAINT_DWELL_MS,
  PLAYER_MOVE_INTERVAL_MS,
  setPaused,
  step,
} from './engine';
import { createRng, Rng } from './random';
import { BOARD_SIZE, MAX_INTENSITY, rankEntities } from './rules';
import { Direction, Entity, MatchEvent, MatchState, PlayerId } from './types';

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
      { type: 'moved', entityId: PLAYER, direction: 'right' },
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
