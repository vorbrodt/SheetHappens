import { COUNTDOWN_MS, PAINT_DWELL_MS } from '../game/engine';
import { updateEntity } from '../game/rules';
import { useGameStore } from './gameStore';

const store = () => useGameStore.getState();
const match = () => useGameStore.getState().match;
const localPlayer = () => match().entities.find((e) => e.id === store().localPlayerId)!;

// Starts a match and runs it past the countdown, so it is ready to play.
function startMatch(durationSeconds = 60) {
  store().initMatch({ durationSeconds, botCount: 0 });
  store().step(COUNTDOWN_MS);
}

describe('pre-match countdown', () => {
  beforeEach(() => {
    store().initMatch({ durationSeconds: 10, botCount: 0 });
  });

  it('starts each match counting down with the clock frozen', () => {
    store().step(COUNTDOWN_MS - 1);
    const { status, countdownMs, remainingMs } = match();
    expect(status).toBe('countdown');
    expect(countdownMs).toBe(1);
    expect(remainingMs).toBe(10_000);
  });

  it('goes countdown -> playing -> ended', () => {
    store().step(COUNTDOWN_MS);
    expect(match().status).toBe('playing');
    expect(match().countdownMs).toBe(0);
    expect(match().remainingMs).toBe(10_000);

    store().step(10_000);
    expect(match().status).toBe('ended');
  });

  it('holds the countdown while paused and resumes it, not play', () => {
    store().step(1_000);
    store().setPaused('menu', true);
    expect(match().status).toBe('paused');
    store().step(5_000);
    expect(match().countdownMs).toBe(COUNTDOWN_MS - 1_000);

    store().setPaused('menu', false);
    expect(match().status).toBe('countdown');
    store().step(COUNTDOWN_MS);
    expect(match().status).toBe('playing');
  });

  it('restarts the countdown when a new match begins', () => {
    store().step(Number.MAX_SAFE_INTEGER);
    store().step(Number.MAX_SAFE_INTEGER);
    expect(match().status).toBe('ended');

    store().initMatch();
    expect(match().status).toBe('countdown');
    expect(match().countdownMs).toBe(COUNTDOWN_MS);
  });
});

describe('match clock', () => {
  it('starts each match at the configured duration', () => {
    startMatch(30);
    expect(match().remainingMs).toBe(30_000);
    expect(match().status).toBe('playing');
  });

  it('counts down and ends the match at zero', () => {
    startMatch(1);
    store().step(400);
    expect(match().remainingMs).toBe(600);
    expect(match().status).toBe('playing');

    store().step(1_000);
    expect(match().remainingMs).toBe(0);
    expect(match().status).toBe('ended');
  });

  it('holds the clock while paused and resumes where it left off', () => {
    startMatch(10);
    store().step(2_000);
    store().setPaused('menu', true);
    store().step(5_000);
    expect(match().remainingMs).toBe(8_000);

    store().setPaused('menu', false);
    store().step(1_000);
    expect(match().remainingMs).toBe(7_000);
  });

  it('does not resume a match that has ended', () => {
    startMatch(1);
    store().step(1_000);
    store().setPaused('menu', false);
    expect(match().status).toBe('ended');
  });
});

describe('pause reasons', () => {
  it('stays paused on return to the foreground while the pause menu is open', () => {
    startMatch(10);
    store().setPaused('menu', true);
    store().setPaused('background', true);
    store().setPaused('background', false);
    expect(match().status).toBe('paused');

    store().setPaused('menu', false);
    expect(match().status).toBe('playing');
    store().step(1_000);
    expect(match().remainingMs).toBe(9_000);
  });

  it('stays paused when the menu closes while the app is in the background', () => {
    startMatch(10);
    store().setPaused('menu', true);
    store().setPaused('background', true);
    store().setPaused('menu', false);
    expect(match().status).toBe('paused');

    store().setPaused('background', false);
    expect(match().status).toBe('playing');
  });

  it('resumes the countdown after a menu pause across a trip to the background', () => {
    store().initMatch({ durationSeconds: 10, botCount: 0 });
    store().step(1_000);
    store().setPaused('menu', true);
    store().setPaused('background', true);
    store().setPaused('background', false);
    store().setPaused('menu', false);
    expect(match().status).toBe('countdown');
    expect(match().countdownMs).toBe(COUNTDOWN_MS - 1_000);
  });

  it('forgets reasons left over from the previous match', () => {
    startMatch();
    store().setPaused('menu', true);
    store().initMatch();
    store().setPaused('background', true);
    store().setPaused('background', false);
    expect(match().status).toBe('countdown');
  });
});

describe('frozen input', () => {
  it.each([
    ['counting down', () => store().initMatch()],
    ['paused', () => store().setPaused('menu', true)],
    ['ended', () => store().step(Number.MAX_SAFE_INTEGER)],
  ])('ignores moves while %s', (_, freeze) => {
    startMatch();
    freeze();
    const { grid, entities } = match();
    const entityId = store().localPlayerId;

    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      store().dispatch({ type: 'move', entityId, direction });
    }

    expect(match().grid).toBe(grid);
    expect(match().entities).toBe(entities);
  });

  it('accepts moves while playing, painting the cell moved onto', () => {
    startMatch();
    store().dispatch({ type: 'move', entityId: store().localPlayerId, direction: 'right' });
    expect(localPlayer().position).toEqual({ row: 0, col: 1 });
    expect(match().grid[0][1]).toEqual({ owner: store().localPlayerId, intensity: 1 });
  });
});

describe('usePowerUp', () => {
  it('uses the power-up in one of the local player’s slots', () => {
    startMatch();
    useGameStore.setState({ match: updateEntity(match(), store().localPlayerId, { inventory: ['speedster', 'jellyport'] }) });

    store().usePowerUp(1);
    expect(localPlayer().inventory).toEqual(['speedster', null]);
    expect(localPlayer().activePowerUp).toEqual({ kind: 'jellyport', startedAt: 0, endsAt: 8_000 });
  });
});

describe('teleport', () => {
  it('teleports the local player when it can', () => {
    startMatch();
    store().teleport({ row: 4, col: 4 });
    expect(localPlayer().position).toEqual({ row: 0, col: 0 });

    useGameStore.setState({ match: updateEntity(match(), store().localPlayerId, { canTeleport: true }) });
    store().teleport({ row: 4, col: 4 });
    expect(localPlayer().position).toEqual({ row: 4, col: 4 });
    expect(match().events[0]).toEqual({
      type: 'teleported',
      entityId: store().localPlayerId,
      from: { row: 0, col: 0 },
      to: { row: 4, col: 4 },
    });
  });
});

describe('dwell painting', () => {
  it('paints the starting cell as play starts, then every PAINT_DWELL_MS, but not while paused', () => {
    startMatch();
    const cell = () => match().grid[0][0];
    expect(cell()).toEqual({ owner: store().localPlayerId, intensity: 1 });

    store().step(PAINT_DWELL_MS / 2);
    store().setPaused('menu', true);
    store().step(PAINT_DWELL_MS * 4);
    expect(cell().intensity).toBe(1);

    store().setPaused('menu', false);
    store().step(PAINT_DWELL_MS / 2);
    expect(cell().intensity).toBe(2);
  });
});

describe('held direction', () => {
  it('moves straight away, then repeats at the move interval while held', () => {
    startMatch();
    const { moveIntervalMs } = localPlayer();

    store().holdDirection('right');
    expect(localPlayer().position).toEqual({ row: 0, col: 1 });

    store().step(moveIntervalMs - 1);
    expect(localPlayer().position).toEqual({ row: 0, col: 1 });
    store().step(1);
    expect(localPlayer().position).toEqual({ row: 0, col: 2 });

    store().holdDirection(null);
    store().step(moveIntervalMs * 3);
    expect(localPlayer().position).toEqual({ row: 0, col: 2 });
  });

  it('keeps the exact pace when frames straddle the interval', () => {
    startMatch();
    store().holdDirection('right');
    // Ten 30ms frames: due moves land at 200ms (and the next at 400ms is still pending).
    for (let i = 0; i < 10; i++) store().step(30);
    expect(localPlayer().position).toEqual({ row: 0, col: 2 });
    expect(localPlayer().lastMoveAt).toBe(200);
  });

  it('waits out the interval when turning straight after a move', () => {
    startMatch();
    store().holdDirection('right');
    store().holdDirection('down');
    expect(localPlayer().position).toEqual({ row: 0, col: 1 });

    store().step(localPlayer().moveIntervalMs);
    expect(localPlayer().position).toEqual({ row: 1, col: 1 });
  });

  it('is released when a new match starts', () => {
    startMatch();
    store().holdDirection('right');
    store().initMatch();
    expect(store().heldDirection).toBeNull();
  });
});

describe('initMatch', () => {
  it('keeps the previous bot count and board size when only the duration is given', () => {
    store().initMatch({ durationSeconds: 90, botCount: 4, boardSize: 12 });
    store().step(Number.MAX_SAFE_INTEGER);
    store().step(Number.MAX_SAFE_INTEGER);

    store().initMatch({ durationSeconds: 90 });

    const { config } = store();
    expect(config).toEqual({ durationSeconds: 90, botCount: 4, boardSize: 12 });
    expect(match().entities).toHaveLength(5);
    expect(match().grid).toHaveLength(12);
    expect(match().status).toBe('countdown');
  });
});
