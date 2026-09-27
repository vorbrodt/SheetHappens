import { getStartingPositions } from './placement';

describe('getStartingPositions', () => {
  it('returns exactly botCount bot positions with no collisions among entities', () => {
    const { player, bots } = getStartingPositions(5);

    expect(bots).toHaveLength(5);

    const positions = [player, ...bots];
    const unique = new Set(positions.map((p) => `${p.row},${p.col}`));
    expect(unique.size).toBe(positions.length);
  });

  it('returns no bots when botCount is 0', () => {
    const { bots } = getStartingPositions(0);

    expect(bots).toHaveLength(0);
  });
});
