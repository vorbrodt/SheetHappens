import { PLAYER_ID, useGameStore } from './store';

function startMatch(durationSeconds = 60) {
  useGameStore.getState().initMatch({ durationSeconds, botCount: 0 });
}

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

    useGameStore.getState().initMatch({ durationSeconds: 30 });

    const { config, entities, status } = useGameStore.getState();
    expect(config).toEqual({ durationSeconds: 30, botCount: 4 });
    expect(entities).toHaveLength(5);
    expect(status).toBe('playing');
  });
});
