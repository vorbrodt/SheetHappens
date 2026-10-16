import { COUNTDOWN_MS, PLAYER_ID, useGameStore } from './store';

// Starts a match and runs it past the countdown, so it is ready to play.
function startMatch(durationSeconds = 60) {
  useGameStore.getState().initMatch({ durationSeconds, botCount: 0 });
  useGameStore.getState().tick(COUNTDOWN_MS);
}

describe('pre-match countdown', () => {
  beforeEach(() => {
    useGameStore.getState().initMatch({ durationSeconds: 10, botCount: 0 });
  });

  it('starts each match counting down with the clock frozen', () => {
    useGameStore.getState().tick(COUNTDOWN_MS - 1);
    const { status, countdownMs, remainingMs } = useGameStore.getState();
    expect(status).toBe('countdown');
    expect(countdownMs).toBe(1);
    expect(remainingMs).toBe(10_000);
  });

  it('goes countdown -> playing -> ended', () => {
    useGameStore.getState().tick(COUNTDOWN_MS);
    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().countdownMs).toBe(0);
    expect(useGameStore.getState().remainingMs).toBe(10_000);

    useGameStore.getState().tick(10_000);
    expect(useGameStore.getState().status).toBe('ended');
  });

  it('holds the countdown while paused and resumes it, not play', () => {
    useGameStore.getState().tick(1_000);
    useGameStore.getState().setPaused(true);
    expect(useGameStore.getState().status).toBe('paused');
    useGameStore.getState().tick(5_000);
    expect(useGameStore.getState().countdownMs).toBe(COUNTDOWN_MS - 1_000);

    useGameStore.getState().setPaused(false);
    expect(useGameStore.getState().status).toBe('countdown');
    useGameStore.getState().tick(COUNTDOWN_MS);
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('restarts the countdown when a new match begins', () => {
    useGameStore.getState().tick(Number.MAX_SAFE_INTEGER);
    useGameStore.getState().tick(Number.MAX_SAFE_INTEGER);
    expect(useGameStore.getState().status).toBe('ended');

    useGameStore.getState().initMatch();
    expect(useGameStore.getState().status).toBe('countdown');
    expect(useGameStore.getState().countdownMs).toBe(COUNTDOWN_MS);
  });
});

describe('match clock', () => {
  it('starts each match at the configured duration', () => {
    startMatch(30);
    expect(useGameStore.getState().remainingMs).toBe(30_000);
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('counts down and ends the match at zero', () => {
    startMatch(1);
    useGameStore.getState().tick(400);
    expect(useGameStore.getState().remainingMs).toBe(600);
    expect(useGameStore.getState().status).toBe('playing');

    useGameStore.getState().tick(1_000);
    expect(useGameStore.getState().remainingMs).toBe(0);
    expect(useGameStore.getState().status).toBe('ended');
  });

  it('holds the clock while paused and resumes where it left off', () => {
    startMatch(10);
    useGameStore.getState().tick(2_000);
    useGameStore.getState().setPaused(true);
    useGameStore.getState().tick(5_000);
    expect(useGameStore.getState().remainingMs).toBe(8_000);

    useGameStore.getState().setPaused(false);
    useGameStore.getState().tick(1_000);
    expect(useGameStore.getState().remainingMs).toBe(7_000);
  });

  it('does not resume a match that has ended', () => {
    startMatch(1);
    useGameStore.getState().tick(1_000);
    useGameStore.getState().setPaused(false);
    expect(useGameStore.getState().status).toBe('ended');
  });
});

describe('frozen input', () => {
  it.each([
    ['counting down', () => useGameStore.getState().initMatch()],
    ['paused', () => useGameStore.getState().setPaused(true)],
    ['ended', () => useGameStore.getState().tick(Number.MAX_SAFE_INTEGER)],
  ])('ignores moves and paints while %s', (_, freeze) => {
    startMatch();
    freeze();
    const { grid, entities } = useGameStore.getState();

    useGameStore.getState().paint(PLAYER_ID);
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      useGameStore.getState().move(PLAYER_ID, direction);
    }

    expect(useGameStore.getState().grid).toBe(grid);
    expect(useGameStore.getState().entities).toBe(entities);
  });

  it('accepts moves and paints while playing', () => {
    startMatch();
    const { grid } = useGameStore.getState();
    useGameStore.getState().paint(PLAYER_ID);
    expect(useGameStore.getState().grid).not.toBe(grid);
  });
});

describe('initMatch', () => {
  it('keeps the previous bot count when only the duration is given', () => {
    useGameStore.getState().initMatch({ durationSeconds: 30, botCount: 4 });
    useGameStore.getState().tick(Number.MAX_SAFE_INTEGER);
    useGameStore.getState().tick(Number.MAX_SAFE_INTEGER);

    useGameStore.getState().initMatch({ durationSeconds: 30 });

    const { config, entities, status } = useGameStore.getState();
    expect(config).toEqual({ durationSeconds: 30, botCount: 4 });
    expect(entities).toHaveLength(5);
    expect(status).toBe('countdown');
  });
});
