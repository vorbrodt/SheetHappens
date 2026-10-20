import { applyInput, COUNTDOWN_MS, createEntity, createMatch, step } from '../engine';
import { Rng } from '../random';
import { BOARD_SIZE, updateEntity } from '../rules';
import { Direction, Entity, MatchState, Position } from '../types';
import { PICKUP_LIFETIME_MS } from './pickups';
import { speedster } from './speedster';

const PLAYER = 'player';
const RIVAL = 'rival';

const noRandom: Rng = () => {
  throw new Error('unexpected random draw');
};

// A match with no bots and no pickup waves, playing at match time 1000ms with Speedster in slot 0.
function armedMatch(): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
  const playing = step(step({ ...match, nextSpawnAt: Infinity }, COUNTDOWN_MS, noRandom), 1_000, noRandom);
  return updateEntity(playing, PLAYER, { position: { row: 0, col: 0 }, inventory: ['speedster', null] });
}

function player(state: MatchState): Entity {
  return state.entities.find((e) => e.id === PLAYER)!;
}

function activate(state: MatchState): MatchState {
  return applyInput(state, { type: 'usePowerUp', entityId: PLAYER, slot: 0 }, state.elapsedMs, noRandom);
}

// Waits out the move cooldown, then moves the player as a swipe would.
function swipe(state: MatchState, direction: Direction): MatchState {
  const ready = step(state, player(state).moveIntervalMs, noRandom);
  return applyInput(ready, { type: 'move', entityId: PLAYER, direction }, ready.elapsedMs, noRandom);
}

function withRival(state: MatchState, position: Position): MatchState {
  return { ...state, entities: [...state.entities, createEntity({ id: RIVAL, color: '#3b82f6', position })] };
}

function owners(state: MatchState, cells: [number, number][]) {
  return cells.map(([row, col]) => state.grid[row][col].owner);
}

describe('speedster', () => {
  it('can always be activated', () => {
    expect(speedster.canActivate(armedMatch(), PLAYER)).toBe(true);
  });

  it('makes every move cover 2 cells, painting and collecting on both', () => {
    const pickup = { id: 'p', kind: 'jellyport' as const, position: { row: 0, col: 1 }, spawnedAt: 0, expiresAt: PICKUP_LIFETIME_MS };
    const active = activate({ ...armedMatch(), pickups: [pickup] });
    expect(player(active).moveStep).toBe(2);

    const state = swipe(active, 'right');
    expect(player(state).position).toEqual({ row: 0, col: 2 });
    expect(state.events[0]).toEqual({ type: 'moved', entityId: PLAYER, direction: 'right', distance: 2 });
    expect(owners(state, [[0, 1], [0, 2]])).toEqual([PLAYER, PLAYER]);
    expect(player(state).inventory).toEqual(['jellyport', null]);

    const down = swipe(state, 'down');
    expect(player(down).position).toEqual({ row: 2, col: 2 });
    expect(owners(down, [[1, 2], [2, 2]])).toEqual([PLAYER, PLAYER]);
  });

  it('moves 1 cell when the second is blocked or off the board', () => {
    const active = activate(armedMatch());

    const blocked = swipe(withRival(active, { row: 0, col: 2 }), 'right');
    expect(player(blocked).position).toEqual({ row: 0, col: 1 });
    expect(blocked.events[0]).toMatchObject({ type: 'moved', distance: 1 });

    const nearEdge = updateEntity(active, PLAYER, { position: { row: 0, col: BOARD_SIZE - 2 } });
    const edge = swipe(nearEdge, 'right');
    expect(player(edge).position).toEqual({ row: 0, col: BOARD_SIZE - 1 });
    expect(edge.events[0]).toMatchObject({ type: 'moved', distance: 1 });
  });

  it('goes back to 1 cell per move after 8s', () => {
    let state = step(activate(armedMatch()), 7_999, noRandom);
    expect(player(state).moveStep).toBe(2);

    state = step(state, 1, noRandom);
    expect(player(state).activePowerUp).toBeNull();
    expect(player(state).moveStep).toBe(1);

    const moved = swipe(state, 'right');
    expect(player(moved).position).toEqual({ row: 0, col: 1 });
  });
});
