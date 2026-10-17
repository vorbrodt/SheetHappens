import { getStartingPositions } from './placement';

describe('getStartingPositions', () => {
  it('returns exactly botCount bot positions with no collisions among entities', () => {
    const { player, bots } = getStartingPositions(5);

    expect(bots).toHaveLength(5);

    const positions = [player, ...bots];
    const unique = new Set(positions.map((p) => `${p.row},${p.col}`));
    expect(unique.size).toBe(positions.length);
  });

  it('keeps the original 8x8 spawns', () => {
    expect(getStartingPositions(5, 8).bots).toEqual([
      { row: 7, col: 7 },
      { row: 0, col: 7 },
      { row: 7, col: 0 },
      { row: 3, col: 0 },
      { row: 3, col: 7 },
    ]);
  });

  it.each([8, 12, 16])('puts every spawn on a %i-cell-wide board: corners, then mid-edges', (size) => {
    const { player, bots } = getStartingPositions(5, size);
    const last = size - 1;
    const positions = [player, ...bots];

    expect(new Set(positions.map((p) => `${p.row},${p.col}`)).size).toBe(positions.length);
    for (const { row, col } of positions) {
      expect([0, last]).toContain(col);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThanOrEqual(last);
    }
    expect(bots.slice(0, 3).every((p) => [0, last].includes(p.row))).toBe(true);
    expect(bots.slice(3).every((p) => p.row > 0 && p.row < last)).toBe(true);
  });

  it('returns no bots when botCount is 0', () => {
    const { bots } = getStartingPositions(0);

    expect(bots).toHaveLength(0);
  });
});
