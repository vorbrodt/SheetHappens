import { createEntity } from './engine';
import { Entity, Grid } from './types';
import {
  BOARD_SIZE,
  cellsOwned,
  createEmptyGrid,
  MAX_INTENSITY,
  move,
  paint,
  POINTS_PER_CELL,
  rankEntities,
  resolveTieBreak,
  score,
} from './rules';

function makeEntities(overrides: Partial<Entity>[]): Entity[] {
  return overrides.map((entity, index) =>
    createEntity({
      id: entity.id ?? `entity-${index}`,
      color: entity.color ?? '#000000',
      position: entity.position ?? { row: 0, col: 0 },
    })
  );
}

describe('move', () => {
  it('moves one cell in the given direction', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 3, col: 3 } }]);

    const result = move(entities, 'a', 'up');

    expect(result.find((e) => e.id === 'a')?.position).toEqual({ row: 2, col: 3 });
  });

  it('is a no-op when the target cell is off the board', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 0, col: 0 } }]);

    const result = move(entities, 'a', 'up');

    expect(result).toBe(entities);
    expect(result.find((e) => e.id === 'a')?.position).toEqual({ row: 0, col: 0 });
  });

  it('is a no-op when the target cell is occupied by another entity', () => {
    const entities = makeEntities([
      { id: 'a', position: { row: 3, col: 3 } },
      { id: 'b', position: { row: 2, col: 3 } },
    ]);

    const result = move(entities, 'a', 'up');

    expect(result).toBe(entities);
    expect(result.find((e) => e.id === 'a')?.position).toEqual({ row: 3, col: 3 });
  });

  it('respects board edges on every side', () => {
    const last = BOARD_SIZE - 1;
    const entities = makeEntities([{ id: 'a', position: { row: last, col: last } }]);

    expect(move(entities, 'a', 'down')).toBe(entities);
    expect(move(entities, 'a', 'right')).toBe(entities);
  });
});

describe('paint', () => {
  function gridWithCell(row: number, col: number, cell: Grid[number][number]): Grid {
    const grid = createEmptyGrid();
    grid[row][col] = cell;
    return grid;
  }

  it('increments intensity and sets owner on a neutral cell', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);
    const grid = createEmptyGrid();

    const result = paint(grid, entities, 'a');

    expect(result[1][1]).toEqual({ owner: 'a', intensity: 1 });
  });

  it('increments intensity on an already-owned cell, capping at MAX_INTENSITY', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);
    const grid = gridWithCell(1, 1, { owner: 'a', intensity: MAX_INTENSITY - 1 });

    const afterFirstPaint = paint(grid, entities, 'a');
    expect(afterFirstPaint[1][1]).toEqual({ owner: 'a', intensity: MAX_INTENSITY });

    const afterSecondPaint = paint(afterFirstPaint, entities, 'a');
    expect(afterSecondPaint[1][1]).toEqual({ owner: 'a', intensity: MAX_INTENSITY });
  });

  it('caps a multi-tap paint at MAX_INTENSITY', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);

    const result = paint(createEmptyGrid(), entities, 'a', MAX_INTENSITY + 3);

    expect(result[1][1]).toEqual({ owner: 'a', intensity: MAX_INTENSITY });
  });

  it('overpaints a saturated rival cell down to neutral and then takes it', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);
    let grid = gridWithCell(1, 1, { owner: 'b', intensity: MAX_INTENSITY });

    for (let i = 0; i < MAX_INTENSITY; i++) grid = paint(grid, entities, 'a');
    expect(grid[1][1]).toEqual({ owner: null, intensity: 0 });

    grid = paint(grid, entities, 'a');
    expect(grid[1][1]).toEqual({ owner: 'a', intensity: 1 });
  });

  it('decrements intensity on an enemy cell without changing ownership', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);
    const grid = gridWithCell(1, 1, { owner: 'b', intensity: 5 });

    const result = paint(grid, entities, 'a');

    expect(result[1][1]).toEqual({ owner: 'b', intensity: 4 });
  });

  it('flips an enemy cell to neutral once intensity hits 0, then to the painter on the next tap', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);
    const grid = gridWithCell(1, 1, { owner: 'b', intensity: 1 });

    const afterFirstPaint = paint(grid, entities, 'a');
    expect(afterFirstPaint[1][1]).toEqual({ owner: null, intensity: 0 });

    const afterSecondPaint = paint(afterFirstPaint, entities, 'a');
    expect(afterSecondPaint[1][1]).toEqual({ owner: 'a', intensity: 1 });
  });

  it.each([
    [{ owner: null, intensity: 0 }, 3],
    [{ owner: 'a', intensity: 3 }, 5],
    [{ owner: 'b', intensity: 5 }, 2],
    [{ owner: 'b', intensity: 3 }, 3],
    [{ owner: 'b', intensity: 2 }, 6],
    [{ owner: 'b', intensity: 1 }, 9],
  ])('paints %o by %i the same as that many single paints', (cell, amount) => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);
    const grid = gridWithCell(1, 1, cell);

    let repeated = grid;
    for (let i = 0; i < amount; i++) repeated = paint(repeated, entities, 'a');

    expect(paint(grid, entities, 'a', amount)[1][1]).toEqual(repeated[1][1]);
  });
});

describe('score and cellsOwned', () => {
  it('scores total intensity plus POINTS_PER_CELL per owned cell, and counts cells', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { owner: 'a', intensity: 1 };
    grid[0][1] = { owner: 'a', intensity: 4 };
    grid[7][7] = { owner: 'b', intensity: 5 };

    expect(score(grid, 'a')).toBe(5 + 2 * POINTS_PER_CELL);
    expect(cellsOwned(grid, 'a')).toBe(2);
    expect(score(grid, 'b')).toBe(5 + POINTS_PER_CELL);
    expect(cellsOwned(grid, 'b')).toBe(1);
  });

  it('awards points for territory, so spreading out can beat stacking', () => {
    const grid = createEmptyGrid();
    // 'a': 3 cells at intensity 1 = 3 + 6 = 9
    grid[0][0] = { owner: 'a', intensity: 1 };
    grid[0][1] = { owner: 'a', intensity: 1 };
    grid[0][2] = { owner: 'a', intensity: 1 };
    // 'b': 1 cell at intensity 5 = 5 + 2 = 7
    grid[7][7] = { owner: 'b', intensity: 5 };

    expect(score(grid, 'a')).toBe(9);
    expect(score(grid, 'b')).toBe(7);
  });

  it('is 0 for an entity that owns nothing', () => {
    expect(score(createEmptyGrid(), 'a')).toBe(0);
  });
});

describe('resolveTieBreak', () => {
  it('resolves a score tie in favor of the entity with more cells owned', () => {
    const grid = createEmptyGrid();
    // 'a' owns 2 cells at intensity 1 each = 2 + 4 = 6
    grid[0][0] = { owner: 'a', intensity: 1 };
    grid[0][1] = { owner: 'a', intensity: 1 };
    // 'b' owns 1 cell at intensity 4 = 4 + 2 = 6
    grid[7][7] = { owner: 'b', intensity: 4 };

    expect(score(grid, 'a')).toBe(score(grid, 'b'));
    expect(resolveTieBreak(grid, ['a', 'b'])).toEqual(['a']);
  });

  it('treats an unresolved tie as a shared win', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { owner: 'a', intensity: 20 };
    grid[7][7] = { owner: 'b', intensity: 20 };

    expect(resolveTieBreak(grid, ['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('rankEntities', () => {
  it('sorts by score, highest first', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { owner: 'a', intensity: 1 };
    grid[0][1] = { owner: 'b', intensity: 5 };
    grid[0][2] = { owner: 'c', intensity: 3 };

    const standings = rankEntities(grid, ['a', 'b', 'c']);

    expect(standings.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3]);
    expect(standings[0]).toEqual({ id: 'b', score: 7, cellsOwned: 1, rank: 1 });
  });

  it('ranks by the combined score, not intensity alone', () => {
    const grid = createEmptyGrid();
    // 'a': intensity 5 on 1 cell = 7
    grid[0][0] = { owner: 'a', intensity: 5 };
    // 'b': intensity 4 over 2 cells = 4 + 4 = 8
    grid[7][7] = { owner: 'b', intensity: 2 };
    grid[7][6] = { owner: 'b', intensity: 2 };

    const standings = rankEntities(grid, ['a', 'b']);

    expect(standings.map((s) => [s.id, s.score])).toEqual([
      ['b', 8],
      ['a', 7],
    ]);
  });

  it('breaks a score tie by cells owned', () => {
    const grid = createEmptyGrid();
    // Both score 6: 'a' from 1 cell at intensity 4, 'b' from 2 cells at intensity 1.
    grid[0][0] = { owner: 'a', intensity: 4 };
    grid[7][7] = { owner: 'b', intensity: 1 };
    grid[7][6] = { owner: 'b', intensity: 1 };

    const standings = rankEntities(grid, ['a', 'b']);

    expect(standings.map((s) => s.score)).toEqual([6, 6]);
    expect(standings.map((s) => s.id)).toEqual(['b', 'a']);
    expect(standings.map((s) => s.rank)).toEqual([1, 2]);
  });

  it('gives exact ties a shared rank and skips the ranks they fill', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { owner: 'a', intensity: 4 };
    grid[0][1] = { owner: 'b', intensity: 4 };
    grid[0][2] = { owner: 'c', intensity: 2 };

    const standings = rankEntities(grid, ['c', 'a', 'b', 'd']);

    expect(standings.map((s) => [s.id, s.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
      ['d', 4],
    ]);
  });

  it('includes entities that never painted', () => {
    const standings = rankEntities(createEmptyGrid(), ['a', 'b']);

    expect(standings).toEqual([
      { id: 'a', score: 0, cellsOwned: 0, rank: 1 },
      { id: 'b', score: 0, cellsOwned: 0, rank: 1 },
    ]);
  });
});
