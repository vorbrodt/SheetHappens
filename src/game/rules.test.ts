import { Entity, Grid } from './types';
import { BOARD_SIZE, cellsOwned, createEmptyGrid, move, paint, resolveTieBreak, score } from './rules';

function makeEntities(overrides: Partial<Entity>[]): Entity[] {
  return overrides.map((entity, index) => ({
    id: entity.id ?? `entity-${index}`,
    color: entity.color ?? '#000000',
    position: entity.position ?? { row: 0, col: 0 },
  }));
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

  it('increments intensity on an already-owned cell, capping at 100', () => {
    const entities = makeEntities([{ id: 'a', position: { row: 1, col: 1 } }]);
    const grid = gridWithCell(1, 1, { owner: 'a', intensity: 100 });

    const result = paint(grid, entities, 'a');

    expect(result[1][1]).toEqual({ owner: 'a', intensity: 100 });
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
});

describe('score and cellsOwned', () => {
  it('sums intensity and counts cells for a given entity', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { owner: 'a', intensity: 10 };
    grid[0][1] = { owner: 'a', intensity: 25 };
    grid[7][7] = { owner: 'b', intensity: 50 };

    expect(score(grid, 'a')).toBe(35);
    expect(cellsOwned(grid, 'a')).toBe(2);
    expect(score(grid, 'b')).toBe(50);
    expect(cellsOwned(grid, 'b')).toBe(1);
  });
});

describe('resolveTieBreak', () => {
  it('resolves a score tie in favor of the entity with more cells owned', () => {
    const grid = createEmptyGrid();
    // 'a' owns 2 cells at intensity 20 each = 40
    grid[0][0] = { owner: 'a', intensity: 20 };
    grid[0][1] = { owner: 'a', intensity: 20 };
    // 'b' owns 1 cell at intensity 40 = 40
    grid[7][7] = { owner: 'b', intensity: 40 };

    expect(resolveTieBreak(grid, ['a', 'b'])).toEqual(['a']);
  });

  it('treats an unresolved tie as a shared win', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { owner: 'a', intensity: 20 };
    grid[7][7] = { owner: 'b', intensity: 20 };

    expect(resolveTieBreak(grid, ['a', 'b'])).toEqual(['a', 'b']);
  });
});
