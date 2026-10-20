import { applyInput, COUNTDOWN_MS, createEntity, createMatch, step } from '../engine';
import { Rng } from '../random';
import { BOARD_SIZE, entityCells, updateEntity } from '../rules';
import { Direction, Entity, MatchState, Position } from '../types';
import { PICKUP_LIFETIME_MS } from './pickups';

const PLAYER = 'player';

// Always draws `value`.
const always = (value: number): Rng => () => value;

const noRandom: Rng = () => {
  throw new Error('unexpected random draw');
};

// A match with no bots, playing at match time 0, with the player at `position` holding Get in line
// and any blockers (solid entities nobody moves) at the given cells.
function armedMatch(position: Position, blockers: Position[] = []): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
  const playing = step({ ...match, nextSpawnAt: Infinity }, COUNTDOWN_MS, noRandom);
  const state = updateEntity(playing, PLAYER, { position, inventory: ['getInLine', null] });
  const others = blockers.map((cell, i) => createEntity({ id: `blocker-${i}`, color: '#000000', position: cell }));
  return { ...state, entities: [...state.entities, ...others] };
}

function player(state: MatchState): Entity {
  return state.entities.find((e) => e.id === PLAYER)!;
}

function use(state: MatchState, rng: Rng): MatchState {
  return applyInput(state, { type: 'usePowerUp', entityId: PLAYER, slot: 0 }, state.elapsedMs, rng);
}

function swipe(state: MatchState, direction: Direction): MatchState {
  return applyInput(state, { type: 'move', entityId: PLAYER, direction }, state.elapsedMs, noRandom);
}

const row = (r: number, ...cols: number[]) => cols.map((col) => ({ row: r, col }));
const column = (c: number, ...rows: number[]) => rows.map((r) => ({ row: r, col: c }));

describe('getInLine', () => {
  it('becomes a horizontal line of four on a low draw, keeping its position as the anchor', () => {
    const state = use(armedMatch({ row: 3, col: 3 }), always(0));

    expect(player(state).activePowerUp).toMatchObject({ kind: 'getInLine', startedAt: 0, endsAt: 8_000 });
    expect(player(state).position).toEqual({ row: 3, col: 3 });
    expect(entityCells(player(state))).toEqual(row(3, 3, 4, 5, 6));
  });

  it('becomes a vertical line of four on a high draw', () => {
    const state = use(armedMatch({ row: 3, col: 3 }), always(0.5));

    expect(entityCells(player(state))).toEqual(column(3, 3, 4, 5, 6));
  });

  it('lays the line out the other way along from the jelly when it would run off the board', () => {
    const state = use(armedMatch({ row: 7, col: 7 }), always(0));

    expect(player(state).position).toEqual({ row: 7, col: 7 });
    expect(entityCells(player(state))).toEqual(row(7, 4, 5, 6, 7));
  });

  it('falls back to the other orientation when the drawn one does not fit', () => {
    const blocked = armedMatch({ row: 3, col: 3 }, [{ row: 3, col: 2 }, { row: 3, col: 4 }]);

    expect(entityCells(player(use(blocked, always(0))))).toEqual(column(3, 3, 4, 5, 6));
  });

  it('is refused, keeping the slot, when neither orientation fits', () => {
    const boxed = armedMatch({ row: 3, col: 3 }, [
      { row: 3, col: 2 },
      { row: 3, col: 4 },
      { row: 2, col: 3 },
      { row: 4, col: 3 },
    ]);
    const state = use(boxed, noRandom);

    expect(state.events).toEqual([{ type: 'powerUpRefused', entityId: PLAYER, slot: 0 }]);
    expect(player(state)).toMatchObject({ activePowerUp: null, inventory: ['getInLine', null] });
    expect(entityCells(player(state))).toEqual([{ row: 3, col: 3 }]);
  });

  it('enters the cells it grows into: paints them, restarts the dwell and takes their pickups', () => {
    const pickup = { id: 'p', kind: 'speedster' as const, position: { row: 3, col: 5 }, spawnedAt: 0, expiresAt: PICKUP_LIFETIME_MS };
    const state = use({ ...armedMatch({ row: 3, col: 3 }), pickups: [pickup] }, always(0));

    expect(state.grid[3].slice(3, 7)).toEqual([
      { owner: null, intensity: 0 },
      { owner: PLAYER, intensity: 1 },
      { owner: PLAYER, intensity: 1 },
      { owner: PLAYER, intensity: 1 },
    ]);
    expect(player(state)).toMatchObject({ dwellPaintAt: 500, inventory: ['speedster', null] });
    expect(state.pickups).toEqual([]);
    expect(state.events.map((e) => e.type)).toEqual(['powerUpActivated', 'painted', 'pickedUp']);
  });

  it('moves as one block, painting all four cells', () => {
    const state = swipe(use(armedMatch({ row: 3, col: 3 }), always(0)), 'down');

    expect(entityCells(player(state))).toEqual(row(4, 3, 4, 5, 6));
    expect(state.grid[4].slice(3, 7).every((cell) => cell.owner === PLAYER && cell.intensity === 1)).toBe(true);
  });

  it('is blocked as a whole when any of its cells would run into someone', () => {
    const line = use(armedMatch({ row: 3, col: 3 }, [{ row: 4, col: 6 }]), always(0));

    expect(swipe(line, 'down')).toBe(line);
  });

  it('goes back to a single cell at the anchor after 8s', () => {
    let state = use(armedMatch({ row: 7, col: 7 }), always(0));
    state = swipe(state, 'up');

    state = step(state, 7_999, noRandom);
    expect(player(state).footprint).toHaveLength(4);

    state = step(state, 1, noRandom);
    expect(player(state)).toMatchObject({ activePowerUp: null, position: { row: 6, col: 7 } });
    expect(entityCells(player(state))).toEqual([{ row: 6, col: 7 }]);
    expect(state.events).toContainEqual({ type: 'powerUpExpired', entityId: PLAYER, kind: 'getInLine' });
  });
});
