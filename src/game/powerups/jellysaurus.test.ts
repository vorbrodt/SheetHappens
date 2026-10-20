import { applyInput, COUNTDOWN_MS, createEntity, createMatch, step } from '../engine';
import { Rng } from '../random';
import { BOARD_SIZE, entityCells, updateEntity } from '../rules';
import { Direction, Entity, MatchState, Position } from '../types';
import { JELLYSAURUS_FOOTPRINT } from './jellysaurus';
import { PICKUP_LIFETIME_MS } from './pickups';
import { POWER_UPS } from './registry';
import { Pickup } from './types';

const PLAYER = 'player';
const ROCK = 'rock';

const noRandom: Rng = () => {
  throw new Error('unexpected random draw');
};

// A match with no bots or pickup waves, playing at match time 0, with a Jellysaurus in the
// player's first slot and the player at `at`. Each of `rocks` is an entity nobody moves.
function armedMatch(at: Position, rocks: Position[] = [], patch: Partial<MatchState> = {}): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
  const playing = step({ ...match, nextSpawnAt: Infinity, ...patch }, COUNTDOWN_MS, noRandom);
  const withRocks = {
    ...playing,
    entities: [
      ...playing.entities,
      ...rocks.map((position, i) => createEntity({ id: `${ROCK}-${i}`, color: '#000000', position, dwellPaintAt: Infinity })),
    ],
  };
  return updateEntity(withRocks, PLAYER, { position: at, inventory: ['jellysaurus', null] });
}

function player(state: MatchState): Entity {
  return state.entities.find((e) => e.id === PLAYER)!;
}

function stomp(state: MatchState): MatchState {
  return applyInput(state, { type: 'usePowerUp', entityId: PLAYER, slot: 0 }, state.elapsedMs, noRandom);
}

function swipe(state: MatchState, direction: Direction): MatchState {
  return applyInput(state, { type: 'move', entityId: PLAYER, direction }, state.elapsedMs, noRandom);
}

// The cells the player owns, as sorted "row,col" keys.
function ownedCells(state: MatchState): string[] {
  return state.grid.flatMap((cells, row) => cells.flatMap((cell, col) => (cell.owner === PLAYER ? [`${row},${col}`] : []))).sort();
}

function keys(cells: Position[]): string[] {
  return cells.map((c) => `${c.row},${c.col}`).sort();
}

function block(row: number, col: number): Position[] {
  return JELLYSAURUS_FOOTPRINT.map((o) => ({ row: row + o.row, col: col + o.col }));
}

describe('jellysaurus', () => {
  it('runs for 7s', () => {
    expect(POWER_UPS.jellysaurus.durationMs).toBe(7_000);
  });

  it('grows into the 2x2 block the jelly is the top-left of and paints the new cells', () => {
    const start = armedMatch({ row: 3, col: 3 });
    const state = stomp(start);

    expect(player(state).position).toEqual({ row: 3, col: 3 });
    expect(entityCells(player(state))).toEqual(block(3, 3));
    expect(player(state).inventory).toEqual([null, null]);
    expect(player(state).activePowerUp).toEqual({ kind: 'jellysaurus', startedAt: 0, endsAt: 7_000 });
    // The starting cell (0,0) was painted when play began, and the jelly was put on (3,3) without
    // entering it. Only the three cells it grew onto get a paint.
    expect(ownedCells(state)).toEqual(keys([{ row: 0, col: 0 }, ...block(3, 3).slice(1)]));
    expect(state.grid[3][4].intensity).toBe(1);
    expect(state.events).toEqual([
      { type: 'powerUpActivated', entityId: PLAYER, kind: 'jellysaurus' },
      { type: 'painted', entityId: PLAYER },
    ]);
  });

  it('only paints cells it newly covers', () => {
    const start = armedMatch({ row: 0, col: 0 });
    expect(start.grid[0][0].intensity).toBe(1);
    const state = stomp(start);
    expect(state.grid[0][0].intensity).toBe(1);
    expect(ownedCells(state)).toEqual(keys(block(0, 0)));
  });

  it('falls back to another free block containing its cell, in footprint order', () => {
    // The top-left block is blocked at (4,4); the next try has the jelly in its top-right.
    expect(player(stomp(armedMatch({ row: 3, col: 3 }, [{ row: 4, col: 4 }]))).position).toEqual({ row: 3, col: 2 });
    // In the bottom-right corner only the block with the jelly bottom-right is on the board.
    expect(player(stomp(armedMatch({ row: 7, col: 7 }))).position).toEqual({ row: 6, col: 6 });
  });

  it('is refused with no free 2x2 block, keeping the slot', () => {
    // Every 2x2 block containing the corner cell includes (1,1).
    const start = armedMatch({ row: 0, col: 0 }, [{ row: 1, col: 1 }]);
    const state = stomp(start);

    expect(player(state)).toEqual(player(start));
    expect(state.grid).toBe(start.grid);
    expect(state.events).toEqual([{ type: 'powerUpRefused', entityId: PLAYER, slot: 0 }]);
  });

  it('takes the pickups under the cells it grows onto', () => {
    const speedster: Pickup = {
      id: 'speedster-1',
      kind: 'speedster',
      position: { row: 1, col: 1 },
      spawnedAt: 0,
      expiresAt: PICKUP_LIFETIME_MS,
    };
    const state = stomp(armedMatch({ row: 0, col: 0 }, [], { pickups: [speedster] }));

    expect(player(state).inventory).toEqual(['speedster', null]);
    expect(state.pickups).toEqual([]);
  });

  it('moves as a 2x2 block, painting the cells it enters', () => {
    const state = swipe(stomp(armedMatch({ row: 0, col: 0 })), 'right');

    expect(entityCells(player(state))).toEqual(block(0, 1));
    expect(state.events).toEqual([
      { type: 'moved', entityId: PLAYER, direction: 'right', distance: 1 },
      { type: 'painted', entityId: PLAYER },
    ]);
    expect(ownedCells(state)).toEqual(keys([...block(0, 0), { row: 0, col: 2 }, { row: 1, col: 2 }]));
  });

  it('is blocked as a 2x2 block', () => {
    // The lower half would run into the rock at (1,2).
    const grown = stomp(armedMatch({ row: 0, col: 0 }, [{ row: 1, col: 2 }]));
    expect(swipe(grown, 'right')).toBe(grown);
  });

  it('shrinks back onto its top-left cell after 7s', () => {
    let state = swipe(stomp(armedMatch({ row: 0, col: 0 })), 'down');
    state = step(state, 6_999, noRandom);
    expect(entityCells(player(state))).toEqual(block(1, 0));

    state = step(state, 1, noRandom);
    expect(player(state).activePowerUp).toBeNull();
    expect(player(state).position).toEqual({ row: 1, col: 0 });
    expect(player(state).footprint).toEqual([{ row: 0, col: 0 }]);
    expect(state.events).toContainEqual({ type: 'powerUpExpired', entityId: PLAYER, kind: 'jellysaurus' });
  });
});
