import { BOT_MOVE_INTERVAL_MS, BOT_PAINT_INTERVAL_MS } from './bots';
import { applyInput, COUNTDOWN_MS, createMatch, PLAYER_MOVE_INTERVAL_MS, setPaused, step } from './engine';
import { createRng, Rng } from './random';
import { BOARD_SIZE, MAX_INTENSITY, rankEntities } from './rules';
import { Direction, Entity, MatchEvent, MatchState, PlayerId } from './types';

const PLAYER = 'player';
const FRAME_MS = 16;

// Never called: matches without bots don't draw random numbers.
const noRandom: Rng = () => {
  throw new Error('unexpected random draw');
};

// A match with `botCount` bots, run past the countdown so it is playing at match time 0.
function playingMatch(botCount = 0, rng: Rng = noRandom): MatchState {
  return step(createMatch({ durationSeconds: 60, botCount }, PLAYER), COUNTDOWN_MS, rng);
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

function paintInput(taps = 1, entityId = PLAYER) {
  return { type: 'paint', entityId, taps } as const;
}

// Steps `ms` of play in `frameMs` frames, collecting every event along the way.
function run(state: MatchState, ms: number, rng: Rng, frameMs = FRAME_MS) {
  const events: MatchEvent[] = [];
  for (let t = 0; t < ms; t += frameMs) {
    state = step(state, Math.min(frameMs, ms - t), rng);
    events.push(...state.events);
  }
  return { state, events };
}

/**
 * A full 60s match against 5 bots. The player sweeps the board in a snake pattern — swiping every
 * frame like a held swipe, so the engine sets the pace — and double-taps paint every 100ms.
 */
function simulateMatch(seed: number): MatchState {
  const rng = createRng(seed);
  let state = step(createMatch({ durationSeconds: 60, botCount: 5 }, PLAYER), COUNTDOWN_MS, rng);
  let lastPaintAt = -Infinity;

  while (state.status !== 'ended') {
    state = step(state, FRAME_MS, rng);
    const { row, col } = entity(state, PLAYER).position;
    const sweepingRight = row % 2 === 0;
    const atRowEnd = sweepingRight ? col === BOARD_SIZE - 1 : col === 0;
    const direction: Direction = atRowEnd ? (row === BOARD_SIZE - 1 ? 'up' : 'down') : sweepingRight ? 'right' : 'left';
    state = applyInput(state, moveInput(direction), state.elapsedMs);
    if (state.elapsedMs - lastPaintAt >= 100) {
      state = applyInput(state, paintInput(2), state.elapsedMs);
      lastPaintAt = state.elapsedMs;
    }
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

describe('applyInput', () => {
  it('ignores input outside play', () => {
    const counting = createMatch({ durationSeconds: 60, botCount: 0 }, PLAYER);
    expect(applyInput(counting, paintInput(), 0)).toBe(counting);

    const paused = setPaused(playingMatch(), true);
    expect(applyInput(paused, moveInput('right'), 0)).toBe(paused);
  });

  it('ignores unknown entities and paints without taps', () => {
    const state = playingMatch();
    expect(applyInput(state, paintInput(1, 'nobody'), 0)).toBe(state);
    expect(applyInput(state, paintInput(0), 0)).toBe(state);
  });

  it('reports what happened as events', () => {
    let state = applyInput(playingMatch(), moveInput('right'), 0);
    expect(state.events).toEqual([{ type: 'moved', entityId: PLAYER, direction: 'right' }]);

    state = applyInput(state, paintInput(), 0);
    expect(state.events).toEqual([{ type: 'painted', entityId: PLAYER }]);
  });

  it('applies all taps of a multi-tap paint', () => {
    const state = applyInput(playingMatch(), paintInput(3), 0);
    expect(state.grid[0][0]).toEqual({ owner: PLAYER, intensity: 3 });
  });
});

describe('per-entity effects', () => {
  describe('moveIntervalMs', () => {
    it('rejects a move sooner than the interval after the last one', () => {
      let state = applyInput(playingMatch(), moveInput('right'), 0);
      const early = applyInput(state, moveInput('right'), PLAYER_MOVE_INTERVAL_MS - 1);
      expect(early).toBe(state);

      state = applyInput(state, moveInput('right'), PLAYER_MOVE_INTERVAL_MS);
      expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 2 });
    });

    it('lets a faster entity move sooner', () => {
      let state = withEntity(playingMatch(), PLAYER, { moveIntervalMs: 50 });
      state = applyInput(state, moveInput('right'), 0);
      state = applyInput(state, moveInput('right'), 50);
      expect(entity(state, PLAYER).position).toEqual({ row: 0, col: 2 });
    });

    it('sets how often a bot moves', () => {
      const start = playingMatch(1, createRng(1));
      const moves = (state: MatchState) =>
        run(state, 3_000, createRng(1)).events.filter((e) => e.type === 'moved').length;

      // Due at 0ms and every interval after, up to and including 3000ms.
      expect(moves(start)).toBe(1 + 3_000 / BOT_MOVE_INTERVAL_MS);
      expect(moves(withEntity(start, 'bot-1', { moveIntervalMs: BOT_MOVE_INTERVAL_MS / 2 }))).toBe(
        1 + (2 * 3_000) / BOT_MOVE_INTERVAL_MS
      );
    });
  });

  describe('paintMultiplier', () => {
    it('scales every paint tap', () => {
      let state = withEntity(playingMatch(), PLAYER, { paintMultiplier: 2 });
      state = applyInput(state, paintInput(), 0);
      expect(state.grid[0][0].intensity).toBe(2);

      state = applyInput(state, paintInput(1), 0);
      expect(state.grid[0][0].intensity).toBe(4);

      state = applyInput(state, paintInput(1), 0);
      expect(state.grid[0][0].intensity).toBe(MAX_INTENSITY);
    });
  });

  describe('frozenUntil', () => {
    it('ignores the entity’s moves and paints until it thaws', () => {
      const state = withEntity(playingMatch(), PLAYER, { frozenUntil: 1_000 });
      expect(applyInput(state, moveInput('right'), 999)).toBe(state);
      expect(applyInput(state, paintInput(), 999)).toBe(state);

      const thawed = applyInput(state, moveInput('right'), 1_000);
      expect(entity(thawed, PLAYER).position).toEqual({ row: 0, col: 1 });
    });

    it('stops a bot acting until it thaws', () => {
      const frozen = withEntity(playingMatch(1, createRng(1)), 'bot-1', { frozenUntil: 1_000 });
      const { state, events } = run(frozen, 999, createRng(1));
      expect(events).toEqual([]);
      expect(state.grid.flat().every((cell) => cell.owner === null)).toBe(true);

      expect(run(state, 100, createRng(1)).events.length).toBeGreaterThan(0);
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

    const count = (events: MatchEvent[], type: MatchEvent['type']) => events.filter((e) => e.type === type).length;
    // Due at 0, 600 and 1200ms; paints every 200ms from 0.
    expect(count(byFrames.events, 'moved')).toBe(1 + 1_200 / BOT_MOVE_INTERVAL_MS);
    expect(count(byFrames.events, 'painted')).toBe(1 + 1_200 / BOT_PAINT_INTERVAL_MS);
    expect(inOneGo.state).toEqual({ ...byFrames.state, events: inOneGo.state.events });
  });
});
