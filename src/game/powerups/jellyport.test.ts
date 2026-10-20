import { applyInput, COUNTDOWN_MS, createMatch, step, TELEPORT_COOLDOWN_MS } from '../engine';
import { Rng } from '../random';
import { BOARD_SIZE, updateEntity } from '../rules';
import { Direction, Entity, MatchState, Position } from '../types';
import { PICKUP_LIFETIME_MS } from './pickups';
import { POWER_UPS } from './registry';

const PLAYER = 'player';

const noRandom: Rng = () => {
  throw new Error('unexpected random draw');
};

// A match with no bots or pickup waves, playing at match time 0, with a Jellyport in the
// player's first slot.
function armedMatch(patch: Partial<MatchState> = {}): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
  const playing = step({ ...match, nextSpawnAt: Infinity, ...patch }, COUNTDOWN_MS, noRandom);
  return updateEntity(playing, PLAYER, { inventory: ['jellyport', null] });
}

function player(state: MatchState): Entity {
  return state.entities.find((e) => e.id === PLAYER)!;
}

function activate(state: MatchState): MatchState {
  return applyInput(state, { type: 'usePowerUp', entityId: PLAYER, slot: 0 }, state.elapsedMs, noRandom);
}

function teleportTo(state: MatchState, target: Position, at = state.elapsedMs): MatchState {
  return applyInput(state, { type: 'teleport', entityId: PLAYER, target }, at, noRandom);
}

function swipe(state: MatchState, direction: Direction): MatchState {
  return applyInput(state, { type: 'move', entityId: PLAYER, direction }, state.elapsedMs, noRandom);
}

describe('jellyport', () => {
  it('runs for 8s and can always be used', () => {
    expect(POWER_UPS.jellyport.durationMs).toBe(8_000);
    expect(POWER_UPS.jellyport.canActivate(armedMatch(), PLAYER)).toBe(true);
  });

  it('lets the player teleport only while it runs', () => {
    const armed = armedMatch();
    expect(teleportTo(armed, { row: 5, col: 5 })).toBe(armed);

    const active = activate(armed);
    expect(player(active).canTeleport).toBe(true);

    const expired = step(active, POWER_UPS.jellyport.durationMs, noRandom);
    expect(player(expired).activePowerUp).toBeNull();
    expect(player(expired).canTeleport).toBe(false);
    expect(teleportTo(expired, { row: 5, col: 5 })).toBe(expired);
  });

  it('paints the cell it lands on and takes the pickup there', () => {
    const pickup = {
      id: 'speedster-5-5',
      kind: 'speedster' as const,
      position: { row: 5, col: 5 },
      spawnedAt: 0,
      expiresAt: PICKUP_LIFETIME_MS,
    };
    const state = teleportTo(activate(armedMatch({ pickups: [pickup] })), { row: 5, col: 5 });

    expect(player(state).position).toEqual({ row: 5, col: 5 });
    expect(state.grid[5][5].owner).toBe(PLAYER);
    expect(state.pickups).toEqual([]);
    expect(player(state).inventory).toEqual(['speedster', null]);
    expect(state.events.map((e) => e.type)).toEqual(['teleported', 'painted', 'pickedUp']);
  });

  it('keeps swipes working and waits out the cooldown between teleports', () => {
    const active = activate(armedMatch());
    const moved = swipe(active, 'right');
    expect(player(moved).position).toEqual({ row: 0, col: 1 });

    const first = teleportTo(moved, { row: 4, col: 4 });
    expect(teleportTo(first, { row: 2, col: 2 }, first.elapsedMs + TELEPORT_COOLDOWN_MS - 1)).toBe(first);
    const second = teleportTo(first, { row: 2, col: 2 }, first.elapsedMs + TELEPORT_COOLDOWN_MS);
    expect(player(second).position).toEqual({ row: 2, col: 2 });
  });
});
