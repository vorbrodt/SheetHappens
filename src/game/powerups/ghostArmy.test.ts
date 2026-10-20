import { applyInput, COUNTDOWN_MS, createEntity, createMatch, GHOST_MOVE_INTERVAL_MS, PAINT_DWELL_MS, step } from '../engine';
import { createRng, Rng } from '../random';
import { BOARD_SIZE, updateEntity } from '../rules';
import { Entity, MatchEvent, MatchState } from '../types';
import { GHOST_ARMY_SIZE, ghostArmy, ghostsOf } from './ghostArmy';
import { PICKUP_LIFETIME_MS } from './pickups';

const PLAYER = 'player';
const RIVAL = 'rival';

// A match with no bots and no pickups coming, playing at match time 1000ms, with a Ghost Army in
// the player's first slot.
function armedMatch(): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 0, boardSize: BOARD_SIZE }, PLAYER);
  const playing = step(step({ ...match, nextSpawnAt: Infinity }, COUNTDOWN_MS, createRng(0)), 1_000, createRng(0));
  return updateEntity(playing, PLAYER, { inventory: ['ghostArmy', null] });
}

function use(state: MatchState, rng: Rng): MatchState {
  return applyInput(state, { type: 'usePowerUp', entityId: PLAYER, slot: 0 }, state.elapsedMs, rng);
}

function player(state: MatchState): Entity {
  return state.entities.find((e) => e.id === PLAYER)!;
}

// Steps the match `ms` forward in 16ms frames, collecting every event on the way.
function run(state: MatchState, ms: number, rng: Rng) {
  const events: MatchEvent[] = [];
  let next = state;
  for (let t = 0; t < ms; t += 16) {
    next = step(next, Math.min(16, ms - t), rng);
    events.push(...next.events);
  }
  return { state: next, events };
}

describe('Ghost Army', () => {
  it('lasts 8s and is never refused', () => {
    expect(ghostArmy.durationMs).toBe(8_000);
    expect(ghostArmy.canActivate(armedMatch(), PLAYER)).toBe(true);
  });

  it('summons three ghosts next to the player that paint for it and leave with the power-up', () => {
    const state = use(armedMatch(), createRng(1));
    const active = player(state).activePowerUp;
    const ghosts = ghostsOf(state, PLAYER);

    expect(active).toEqual({ kind: 'ghostArmy', startedAt: 1_000, endsAt: 9_000 });
    expect(ghosts).toHaveLength(GHOST_ARMY_SIZE);
    for (const ghost of ghosts) {
      expect(ghost).toMatchObject({
        color: player(state).color,
        ghost: true,
        paintsAs: PLAYER,
        summonedBy: PLAYER,
        expiresAt: 9_000,
        moveIntervalMs: GHOST_MOVE_INTERVAL_MS,
        // Worn so the board draws them through the Ghost Army skin.
        activePowerUp: active,
      });
      expect(state.bots[ghost.id]).toEqual({ nextMoveAt: 1_000 + GHOST_MOVE_INTERVAL_MS });
    }
    expect(state.events).toEqual([{ type: 'powerUpActivated', entityId: PLAYER, kind: 'ghostArmy' }]);
  });

  it('wanders the board painting only in the player’s color, through others, unkillable and taking nothing', () => {
    const rng = createRng(7);
    const start = armedMatch();
    // A lethal rival parked beside the corner (frozen, so it paints nothing) and pickups all around.
    const rival = createEntity({
      id: RIVAL,
      color: '#000000',
      position: { row: 1, col: 1 },
      lethal: true,
      frozenUntil: Infinity,
    });
    const pickups = [0, 1, 2, 3].flatMap((row) =>
      [0, 1, 2, 3]
        .filter((col) => row + col > 0 && !(row === 1 && col === 1))
        .map((col) => ({
          id: `p-${row}-${col}`,
          kind: 'speedster' as const,
          position: { row, col },
          spawnedAt: 1_000,
          expiresAt: 1_000 + PICKUP_LIFETIME_MS,
        }))
    );
    let state = use({ ...start, entities: [...start.entities, rival], pickups }, rng);
    const ids = ghostsOf(state, PLAYER).map((g) => g.id);
    const painted = state.grid.flat().filter((cell) => cell.owner === PLAYER).length;

    const { state: later, events } = run(state, 7_999, rng);
    state = later;

    expect(ghostsOf(state, PLAYER).map((g) => g.id)).toEqual(ids);
    for (const id of ids) {
      expect(events.filter((e) => e.type === 'moved' && e.entityId === id)).toHaveLength(
        Math.floor(7_999 / GHOST_MOVE_INTERVAL_MS)
      );
    }
    expect(events.some((e) => e.type === 'killed')).toBe(false);
    expect(events.some((e) => e.type === 'pickedUp')).toBe(false);
    expect(state.pickups).toHaveLength(pickups.length);
    expect(state.grid.flat().every((cell) => cell.owner === null || cell.owner === PLAYER)).toBe(true);
    expect(state.grid.flat().filter((cell) => cell.owner === PLAYER).length).toBeGreaterThan(painted);
  });

  it('takes the ghosts off the board after 8s, reporting only the player’s power-up running out', () => {
    const rng = createRng(3);
    let state = use(armedMatch(), rng);
    state = run(state, 7_999, rng).state;
    expect(ghostsOf(state, PLAYER)).toHaveLength(GHOST_ARMY_SIZE);

    state = step(state, 1, rng);
    expect(state.entities.map((e) => e.id)).toEqual([PLAYER]);
    expect(state.bots).toEqual({});
    expect(player(state).activePowerUp).toBeNull();
    expect(state.events.filter((e) => e.type === 'powerUpExpired')).toEqual([
      { type: 'powerUpExpired', entityId: PLAYER, kind: 'ghostArmy' },
    ]);
  });

  it('sends off any ghosts still around when it expires, leaving everyone else', () => {
    const rng = createRng(2);
    const state = use(armedMatch(), rng);
    // Another entity's ghost, and one of the player's that would otherwise stay for good.
    const rival = createEntity({ id: RIVAL, color: '#000000', position: { row: 9, col: 9 }, ghost: true });
    const [lingering] = ghostsOf(state, PLAYER);
    const start = updateEntity(
      { ...state, entities: [...state.entities, rival], bots: { ...state.bots, [RIVAL]: { nextMoveAt: Infinity } } },
      lingering.id,
      { expiresAt: null }
    );

    const expired = ghostArmy.expire(start, PLAYER, start.elapsedMs);
    for (const ghost of ghostsOf(expired, PLAYER)) {
      expect(ghost).toMatchObject({ activePowerUp: null, expiresAt: start.elapsedMs });
    }
    const after = step(expired, 0, rng);
    expect(after.entities.map((e) => e.id)).toEqual([PLAYER, RIVAL]);
    expect(after.bots).toEqual({ [RIVAL]: { nextMoveAt: Infinity } });
    // Nothing to send off: the same state comes back.
    expect(ghostArmy.expire(after, PLAYER, after.elapsedMs)).toBe(after);
  });

  it('paints a ghost’s cell again for the player while it stands there', () => {
    const rng = createRng(4);
    const state = use(armedMatch(), rng);
    const ghosts = ghostsOf(state, PLAYER);
    const parked = { ...state, bots: Object.fromEntries(ghosts.map((g) => [g.id, { nextMoveAt: Infinity }])) };
    const [ghost] = ghosts;

    const later = step(step(parked, 0, rng), PAINT_DWELL_MS, rng);
    expect(later.grid[ghost.position.row][ghost.position.col]).toEqual({ owner: PLAYER, intensity: 2 });
  });
});
