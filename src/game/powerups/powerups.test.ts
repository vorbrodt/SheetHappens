import { applyInput, COUNTDOWN_MS, createEntity, createMatch, HeldDirections, setPaused, step } from '../engine';
import { createRng, Rng } from '../random';
import { BOARD_SIZE, entityCells, samePosition, updateEntity } from '../rules';
import { Direction, Entity, MatchEvent, MatchState, PlayerId } from '../types';
import { MAX_PICKUPS_ON_BOARD, PICKUP_LIFETIME_MS, spawnDelay } from './pickups';
import { POWER_UP_KINDS, POWER_UPS } from './registry';
import { Pickup, PowerUpKind } from './types';

const PLAYER = 'player';

// Returns `values` in order, and fails the test if drawn from once more.
function sequence(...values: number[]): Rng {
  let next = 0;
  return () => {
    if (next >= values.length) throw new Error('unexpected random draw');
    return values[next++];
  };
}

const noRandom = sequence();

// A match with no bots, playing at match time 0. No wave of pickups comes unless `patch` sets one.
function playingMatch(patch: Partial<MatchState> = {}): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
  return step({ ...match, nextSpawnAt: Infinity, ...patch }, COUNTDOWN_MS, noRandom);
}

function player(state: MatchState): Entity {
  return state.entities.find((e) => e.id === PLAYER)!;
}

function pickup(kind: PowerUpKind, row: number, col: number, spawnedAt = 0): Pickup {
  return { id: `${kind}-${row}-${col}`, kind, position: { row, col }, spawnedAt, expiresAt: spawnedAt + PICKUP_LIFETIME_MS };
}

function swipe(state: MatchState, direction: Direction): MatchState {
  return applyInput(state, { type: 'move', entityId: PLAYER, direction }, state.elapsedMs, noRandom);
}

// Uses the power-up in one of the entity's slots at the current match time.
function pressSlot(state: MatchState, slot: 0 | 1, entityId: PlayerId = PLAYER): MatchState {
  return applyInput(state, { type: 'usePowerUp', entityId, slot }, state.elapsedMs, noRandom);
}

function ofType<T extends MatchEvent['type']>(events: MatchEvent[], type: T) {
  return events.filter((e): e is Extract<MatchEvent, { type: T }> => e.type === type);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('registry', () => {
  it('registers all six kinds with their durations', () => {
    expect(Object.fromEntries(POWER_UP_KINDS.map((kind) => [kind, POWER_UPS[kind].durationMs]))).toEqual({
      jellysaurus: 7_000,
      getInLine: 8_000,
      ghostArmy: 8_000,
      speedster: 8_000,
      jellyGoneBad: 6_000,
      jellyport: 8_000,
    });
    for (const kind of POWER_UP_KINDS) expect(POWER_UPS[kind].kind).toBe(kind);
  });
});

describe('createEntity', () => {
  it('starts every entity with empty slots, one cell big and painting as itself', () => {
    expect(createEntity({ id: 'a', color: '#000000', position: { row: 2, col: 3 } })).toMatchObject({
      inventory: [null, null],
      activePowerUp: null,
      footprint: [{ row: 0, col: 0 }],
      moveStep: 1,
      lethal: false,
      canTeleport: false,
      lastTeleportAt: null,
      ghost: false,
      paintsAs: 'a',
      summonedBy: null,
      expiresAt: null,
      respawnAt: null,
    });
  });
});

describe('spawning', () => {
  it('schedules the first wave 5-15s after play starts', () => {
    const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
    expect(match.nextSpawnAt).toBeNull();
    expect(step(match, COUNTDOWN_MS, sequence(0)).nextSpawnAt).toBe(5_000);
    expect(step(match, COUNTDOWN_MS, sequence(0.5)).nextSpawnAt).toBe(10_000);
    expect(step(match, COUNTDOWN_MS, sequence(0.99999)).nextSpawnAt).toBe(15_000);
    // The countdown is not play: nothing is scheduled while it runs.
    expect(step(match, COUNTDOWN_MS - 1, noRandom).nextSpawnAt).toBeNull();
  });

  it('spawns a wave when it comes due and schedules the next one 5-15s on', () => {
    let state = step(playingMatch({ nextSpawnAt: 6_000 }), 5_999, noRandom);
    expect(state.pickups).toEqual([]);

    // One pickup, the first kind, on the first free cell; the next wave 10s on.
    state = step(state, 1, sequence(0, 0, 0, 0.5));
    const spawned: Pickup = {
      id: 'pickup-6000-0',
      kind: POWER_UP_KINDS[0],
      position: { row: 0, col: 1 },
      spawnedAt: 6_000,
      expiresAt: 6_000 + PICKUP_LIFETIME_MS,
    };
    expect(state.pickups).toEqual([spawned]);
    expect(ofType(state.events, 'pickupSpawned')).toEqual([{ type: 'pickupSpawned', pickup: spawned }]);
    expect(state.nextSpawnAt).toBe(16_000);
  });

  it('spawns 1-3 pickups per wave, of uniformly random kinds', () => {
    // The draws: the count, then a kind and a cell per pickup, then the next delay.
    const wave = (...draws: number[]) => step(playingMatch({ nextSpawnAt: 1_000 }), 1_000, sequence(...draws));
    const kind = (index: number) => (index + 0.5) / POWER_UP_KINDS.length;

    const one = wave(0, kind(5), 0, 0);
    expect(one.pickups.map((p) => p.kind)).toEqual([POWER_UP_KINDS[5]]);

    const many = wave(0.99, kind(0), 0, kind(1), 0, kind(2), 0, 0);
    expect(many.pickups.map((p) => p.kind)).toEqual(POWER_UP_KINDS.slice(0, 3));
    expect(many.pickups.map((p) => p.position)).toEqual([
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
  });

  it('only spawns on cells free of entities (any footprint cell) and other pickups', () => {
    const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
    const big = updateEntity(match, PLAYER, {
      footprint: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ],
    });
    const state = step({ ...big, pickups: [pickup('jellyport', 0, 2)], nextSpawnAt: 0 }, COUNTDOWN_MS, sequence(0, 0, 0, 0));
    expect(state.pickups.map((p) => p.position)).toEqual([
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
  });

  it('skips spawns past the board cap', () => {
    const five = [0, 1, 2, 3, 4].map((col) => pickup('speedster', 4, col));
    // A wave of 3 with room for 1: only one kind and cell are drawn before the next delay.
    const state = step(playingMatch({ pickups: five, nextSpawnAt: 1_000 }), 1_000, sequence(0.99, 0, 0, 0));
    expect(state.pickups).toHaveLength(MAX_PICKUPS_ON_BOARD);
    expect(ofType(state.events, 'pickupSpawned')).toHaveLength(1);
    expect(state.nextSpawnAt).toBe(6_000);
  });

  it('keeps every wave of a seeded match within the rules', () => {
    const rng = createRng(11);
    let state = step(createMatch({ durationSeconds: 60, botCount: 5, boardSize: BOARD_SIZE }, PLAYER), COUNTDOWN_MS, rng);
    let spawned = 0;
    while (state.status !== 'ended') {
      const before = state;
      state = step(state, 16, rng);
      for (const { pickup: p } of ofType(state.events, 'pickupSpawned')) {
        spawned++;
        expect(before.entities.flatMap(entityCells).some((cell) => samePosition(cell, p.position))).toBe(false);
      }
      expect(state.pickups.length).toBeLessThanOrEqual(MAX_PICKUPS_ON_BOARD);
      const keys = state.pickups.map((p) => `${p.position.row},${p.position.col}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    // Waves are 5-15s apart, each with at least one pickup unless the board is capped.
    expect(spawned).toBeGreaterThanOrEqual(4);
  });

  it('draws the delay uniformly from 5 to 15s', () => {
    expect(spawnDelay(() => 0)).toBe(5_000);
    expect(spawnDelay(() => 0.99999999)).toBe(15_000);
  });
});

describe('despawning', () => {
  it('removes a pickup nobody took 20s after it spawned', () => {
    let state = step(playingMatch({ pickups: [pickup('jellysaurus', 5, 5, 0)] }), PICKUP_LIFETIME_MS - 1, noRandom);
    expect(state.pickups).toHaveLength(1);

    state = step(state, 1, noRandom);
    expect(state.pickups).toEqual([]);
    expect(ofType(state.events, 'pickupDespawned')).toEqual([{ type: 'pickupDespawned', pickupId: 'jellysaurus-5-5' }]);
  });
});

describe('picking up', () => {
  it('takes a pickup into the first empty slot when moving onto it', () => {
    const state = swipe(playingMatch({ pickups: [pickup('speedster', 0, 1)] }), 'right');
    expect(player(state).inventory).toEqual(['speedster', null]);
    expect(state.pickups).toEqual([]);
    expect(state.events).toEqual([
      { type: 'moved', entityId: PLAYER, direction: 'right', distance: 1 },
      { type: 'painted', entityId: PLAYER },
      { type: 'pickedUp', entityId: PLAYER, kind: 'speedster', slot: 0, pickupId: 'speedster-0-1' },
    ]);
  });

  it('fills an emptied first slot before the second', () => {
    const start = updateEntity(playingMatch({ pickups: [pickup('ghostArmy', 0, 1)] }), PLAYER, {
      inventory: [null, 'jellyport'],
    });
    expect(player(swipe(start, 'right')).inventory).toEqual(['ghostArmy', 'jellyport']);
  });

  it('leaves the pickup on the board when both slots are full', () => {
    const start = updateEntity(playingMatch({ pickups: [pickup('ghostArmy', 0, 1)] }), PLAYER, {
      inventory: ['speedster', 'jellyport'],
    });
    const state = swipe(start, 'right');
    expect(player(state).position).toEqual({ row: 0, col: 1 });
    expect(player(state).inventory).toEqual(['speedster', 'jellyport']);
    expect(state.pickups).toEqual(start.pickups);
    expect(ofType(state.events, 'pickedUp')).toEqual([]);
  });

  it('takes pickups under any footprint cell', () => {
    const start = updateEntity(playingMatch({ pickups: [pickup('jellyGoneBad', 1, 1)] }), PLAYER, {
      footprint: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    });
    expect(player(swipe(start, 'right')).inventory).toEqual(['jellyGoneBad', null]);
  });

  it('takes pickups on held moves too', () => {
    const held: HeldDirections = { [PLAYER]: 'right' };
    const state = step(playingMatch({ pickups: [pickup('jellyport', 0, 1)] }), 0, noRandom, held);
    expect(player(state).inventory).toEqual(['jellyport', null]);
  });

  it('lets bots and ghosts walk over pickups without taking them', () => {
    const start = playingMatch({ pickups: [pickup('speedster', 0, 1)] });
    const asBot = swipe({ ...start, bots: { [PLAYER]: { nextMoveAt: Infinity } } }, 'right');
    const asGhost = swipe(updateEntity(start, PLAYER, { ghost: true }), 'right');

    for (const state of [asBot, asGhost]) {
      expect(player(state).position).toEqual({ row: 0, col: 1 });
      expect(player(state).inventory).toEqual([null, null]);
      expect(state.pickups).toHaveLength(1);
    }
  });
});

describe('activating', () => {
  const armed = () => updateEntity(step(playingMatch(), 1_000, noRandom), PLAYER, { inventory: ['speedster', 'ghostArmy'] });

  it('empties the slot and runs the power-up for its duration', () => {
    // Only the lifecycle is under test here, not the effect.
    const activate = jest.spyOn(POWER_UPS.ghostArmy, 'activate').mockImplementation((s) => s);
    const state = pressSlot(armed(), 1);

    expect(player(state).inventory).toEqual(['speedster', null]);
    expect(player(state).activePowerUp).toEqual({ kind: 'ghostArmy', startedAt: 1_000, endsAt: 9_000 });
    expect(state.events).toEqual([{ type: 'powerUpActivated', entityId: PLAYER, kind: 'ghostArmy' }]);
    // The effect sees the slot already used and the power-up already active.
    expect(activate).toHaveBeenCalledTimes(1);
    const [seen, entityId, now] = activate.mock.calls[0];
    expect(player(seen).activePowerUp?.kind).toBe('ghostArmy');
    expect([entityId, now]).toEqual([PLAYER, 1_000]);
  });

  it('ignores an empty slot', () => {
    const start = updateEntity(armed(), PLAYER, { inventory: [null, 'speedster'] });
    expect(pressSlot(start, 0)).toBe(start);
  });

  it('refuses while another power-up is active, keeping the slot', () => {
    const active = pressSlot(armed(), 0);
    const state = pressSlot(active, 1);

    expect(player(state).inventory).toEqual([null, 'ghostArmy']);
    expect(player(state).activePowerUp).toEqual(player(active).activePowerUp);
    expect(state.events).toEqual([{ type: 'powerUpRefused', entityId: PLAYER, slot: 1 }]);
  });

  it('refuses when the kind says it cannot activate, keeping the slot', () => {
    jest.spyOn(POWER_UPS.speedster, 'canActivate').mockReturnValue(false);
    const activate = jest.spyOn(POWER_UPS.speedster, 'activate');
    const state = pressSlot(armed(), 0);

    expect(player(state).inventory).toEqual(['speedster', 'ghostArmy']);
    expect(player(state).activePowerUp).toBeNull();
    expect(state.events).toEqual([{ type: 'powerUpRefused', entityId: PLAYER, slot: 0 }]);
    expect(activate).not.toHaveBeenCalled();
  });

  it('ignores power-ups outside play and while frozen', () => {
    const paused = setPaused(armed(), true);
    expect(pressSlot(paused, 0)).toBe(paused);

    const frozen = updateEntity(armed(), PLAYER, { frozenUntil: 5_000 });
    expect(pressSlot(frozen, 0)).toBe(frozen);
  });
});

describe('expiry', () => {
  // Speedster (8s) used at match time 1000ms, so it runs out at 9000ms.
  const active = () =>
    pressSlot(updateEntity(step(playingMatch(), 1_000, noRandom), PLAYER, { inventory: ['speedster', null] }), 0);

  it('ends the power-up on the match clock', () => {
    const expire = jest.spyOn(POWER_UPS.speedster, 'expire');
    let state = step(active(), 7_999, noRandom);
    expect(player(state).activePowerUp).not.toBeNull();
    expect(expire).not.toHaveBeenCalled();

    state = step(state, 1, noRandom);
    expect(player(state).activePowerUp).toBeNull();
    expect(ofType(state.events, 'powerUpExpired')).toEqual([{ type: 'powerUpExpired', entityId: PLAYER, kind: 'speedster' }]);
    // The effect is undone while the power-up still shows as active.
    const [seen, entityId, now] = expire.mock.calls[0];
    expect(player(seen).activePowerUp?.kind).toBe('speedster');
    expect([entityId, now]).toEqual([PLAYER, 9_000]);
  });

  it('frees the entity to use its next slot', () => {
    const state = step(updateEntity(active(), PLAYER, { inventory: [null, 'jellyport'] }), 8_000, noRandom);
    expect(player(pressSlot(state, 1)).activePowerUp).toEqual({ kind: 'jellyport', startedAt: 9_000, endsAt: 17_000 });
  });

  it('does not tick while paused', () => {
    let state = step(active(), 4_000, noRandom);
    state = setPaused(state, true);
    state = step(state, 60_000, noRandom);
    state = setPaused(state, false);
    expect(player(state).activePowerUp).not.toBeNull();

    state = step(state, 3_999, noRandom);
    expect(player(state).activePowerUp).not.toBeNull();
    state = step(state, 1, noRandom);
    expect(player(state).activePowerUp).toBeNull();
  });

  it('just stops when the match ends first', () => {
    const expire = jest.spyOn(POWER_UPS.speedster, 'expire');
    const state = step({ ...active(), remainingMs: 2_000 }, 10_000, noRandom);
    expect(state.status).toBe('ended');
    expect(expire).not.toHaveBeenCalled();
  });
});

describe('summoned entities', () => {
  it('are removed when they expire', () => {
    const summoned = createEntity({
      id: 'ghost-1',
      color: '#ffffff',
      position: { row: 4, col: 4 },
      summonedBy: PLAYER,
      expiresAt: 2_000,
    });
    const start = playingMatch();
    let state: MatchState = {
      ...start,
      entities: [...start.entities, summoned],
      bots: { 'ghost-1': { nextMoveAt: Infinity } },
    };

    state = step(state, 1_999, noRandom);
    expect(state.entities.map((e) => e.id)).toEqual([PLAYER, 'ghost-1']);
    state = step(state, 1, noRandom);
    expect(state.entities.map((e) => e.id)).toEqual([PLAYER]);
    expect(state.bots).toEqual({});
  });
});
