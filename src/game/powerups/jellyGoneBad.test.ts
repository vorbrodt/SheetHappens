import { applyInput, COUNTDOWN_MS, createEntity, createMatch, RESPAWN_MS, step } from '../engine';
import { Rng } from '../random';
import { BOARD_SIZE, updateEntity } from '../rules';
import { Direction, Entity, MatchState, PlayerId, Position } from '../types';
import { jellyGoneBad } from './jellyGoneBad';

const PLAYER = 'player';
const RIVAL = 'rival';
const LAST = BOARD_SIZE - 1;

const noRandom: Rng = () => {
  throw new Error('unexpected random draw');
};

// A match with no bots and no pickup waves, playing at match time 1000ms with Jelly Gone Bad in
// slot 0 and the player in the middle of the board.
function armedMatch(): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
  const playing = step(step({ ...match, nextSpawnAt: Infinity }, COUNTDOWN_MS, noRandom), 1_000, noRandom);
  return updateEntity(playing, PLAYER, { position: { row: 3, col: 3 }, inventory: ['jellyGoneBad', null] });
}

function entity(state: MatchState, id: PlayerId): Entity {
  return state.entities.find((e) => e.id === id)!;
}

function activate(state: MatchState): MatchState {
  return applyInput(state, { type: 'usePowerUp', entityId: PLAYER, slot: 0 }, state.elapsedMs, noRandom);
}

// Waits out the mover's cooldown, then moves it as a swipe (or a bot) would.
function swipe(state: MatchState, direction: Direction, entityId: PlayerId = PLAYER): MatchState {
  const ready = step(state, entity(state, entityId).moveIntervalMs, noRandom);
  return applyInput(ready, { type: 'move', entityId, direction }, ready.elapsedMs, noRandom);
}

function withRival(state: MatchState, position: Position, patch: Partial<Entity> = {}): MatchState {
  return {
    ...state,
    entities: [...state.entities, createEntity({ id: RIVAL, color: '#3b82f6', position, ...patch })],
  };
}

describe('jellyGoneBad', () => {
  it('can always be activated', () => {
    expect(jellyGoneBad.canActivate(armedMatch(), PLAYER)).toBe(true);
  });

  it('makes the jelly lethal while it runs', () => {
    expect(entity(activate(armedMatch()), PLAYER).lethal).toBe(true);
  });

  it('kills a jelly it moves into, taking its cell', () => {
    const state = swipe(withRival(activate(armedMatch()), { row: 3, col: 4 }), 'right');

    expect(state.events).toContainEqual({ type: 'killed', entityId: RIVAL, by: PLAYER });
    expect(entity(state, PLAYER).position).toEqual({ row: 3, col: 4 });
    expect(entity(state, RIVAL).respawnAt).toBe(state.elapsedMs + RESPAWN_MS);
  });

  it('kills a jelly that moves into it, staying put', () => {
    const state = swipe(withRival(activate(armedMatch()), { row: 3, col: 4 }), 'left', RIVAL);

    expect(state.events).toEqual([{ type: 'killed', entityId: RIVAL, by: PLAYER }]);
    expect(entity(state, PLAYER).position).toEqual({ row: 3, col: 3 });
    expect(entity(state, RIVAL).respawnAt).toBe(state.elapsedMs + RESPAWN_MS);
  });

  it('respawns the victim on a corner 5s later', () => {
    const killed = swipe(withRival(activate(armedMatch()), { row: 3, col: 4 }), 'right');
    const diedAt = killed.elapsedMs;

    const waiting = step(killed, RESPAWN_MS - 1, noRandom);
    expect(entity(waiting, RIVAL).respawnAt).toBe(diedAt + RESPAWN_MS);

    // The last of the four free corners.
    const back = step(waiting, 1, () => 0.99);
    expect(back.events).toContainEqual({ type: 'respawned', entityId: RIVAL });
    expect(entity(back, RIVAL)).toMatchObject({ position: { row: LAST, col: LAST }, respawnAt: null });
  });

  it('leaves ghosts alone', () => {
    const active = withRival(activate(armedMatch()), { row: 3, col: 4 }, { ghost: true });

    const into = swipe(active, 'right');
    expect(into.events.some((e) => e.type === 'killed')).toBe(false);
    expect(entity(into, RIVAL).respawnAt).toBeNull();

    const onto = swipe(active, 'left', RIVAL);
    expect(onto.events.some((e) => e.type === 'killed')).toBe(false);
    expect(entity(onto, RIVAL).position).toEqual({ row: 3, col: 3 });
  });

  it('turns back after 6s, after which touching just blocks', () => {
    let state = step(activate(armedMatch()), 5_999, noRandom);
    expect(entity(state, PLAYER).lethal).toBe(true);

    state = step(state, 1, noRandom);
    expect(entity(state, PLAYER)).toMatchObject({ lethal: false, activePowerUp: null });

    const bumped = swipe(withRival(state, { row: 3, col: 4 }), 'right');
    expect(bumped.events.some((e) => e.type === 'killed')).toBe(false);
    expect(entity(bumped, PLAYER).position).toEqual({ row: 3, col: 3 });
  });
});
