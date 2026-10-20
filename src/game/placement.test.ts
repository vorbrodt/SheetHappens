import { createEntity } from './engine';
import { findPlacement, getCorners, getStartingPositions } from './placement';
import { Position } from './types';

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

describe('getCorners', () => {
  it('returns the four corners of the board', () => {
    expect(getCorners(12)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 11 },
      { row: 11, col: 0 },
      { row: 11, col: 11 },
    ]);
  });
});

describe('findPlacement', () => {
  const BLOCK_2X2: Position[] = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ];
  const at = (id: string, row: number, col: number) => createEntity({ id, color: '#000000', position: { row, col } });

  it('puts the footprint so it covers the cell, ignoring the entity itself', () => {
    expect(findPlacement([at('me', 3, 3)], 'me', BLOCK_2X2, { row: 3, col: 3 })).toEqual({ row: 3, col: 3 });
  });

  it('shifts the footprint off the board edge and away from others', () => {
    expect(findPlacement([], 'me', BLOCK_2X2, { row: 7, col: 7 })).toEqual({ row: 6, col: 6 });
    expect(findPlacement([at('other', 3, 4)], 'me', BLOCK_2X2, { row: 3, col: 3 })).toEqual({ row: 3, col: 2 });
  });

  it('ignores ghosts and the dead', () => {
    const others = [
      { ...at('ghost', 3, 4), ghost: true },
      { ...at('dead', 4, 3), respawnAt: 5_000 },
    ];
    expect(findPlacement(others, 'me', BLOCK_2X2, { row: 3, col: 3 })).toEqual({ row: 3, col: 3 });
  });

  it('returns null when no placement fits', () => {
    const others = [at('a', 2, 3), at('b', 4, 3), at('c', 3, 2), at('d', 3, 4)];
    expect(findPlacement(others, 'me', BLOCK_2X2, { row: 3, col: 3 })).toBeNull();
  });
});
