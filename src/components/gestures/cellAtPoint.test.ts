import { cellAtPoint } from './cellAtPoint';

describe('cellAtPoint', () => {
  const origin = { x: 20, y: 50 };

  it('maps a point to the cell it falls in, offset by the board origin', () => {
    expect(cellAtPoint({ x: 20, y: 50 }, origin, 40, 8)).toEqual({ row: 0, col: 0 });
    expect(cellAtPoint({ x: 59.9, y: 89.9 }, origin, 40, 8)).toEqual({ row: 0, col: 0 });
    expect(cellAtPoint({ x: 60, y: 90 }, origin, 40, 8)).toEqual({ row: 1, col: 1 });
    expect(cellAtPoint({ x: 145, y: 60 }, origin, 40, 8)).toEqual({ row: 0, col: 3 });
    expect(cellAtPoint({ x: 339, y: 369 }, origin, 40, 8)).toEqual({ row: 7, col: 7 });
  });

  it('works with fractional cell sizes', () => {
    expect(cellAtPoint({ x: 66.7, y: 99.9 }, { x: 0, y: 0 }, 100 / 3, 3)).toEqual({ row: 2, col: 2 });
    expect(cellAtPoint({ x: 66.6, y: 33.4 }, { x: 0, y: 0 }, 100 / 3, 3)).toEqual({ row: 1, col: 1 });
  });

  it('returns null off the board', () => {
    expect(cellAtPoint({ x: 19, y: 60 }, origin, 40, 8)).toBeNull();
    expect(cellAtPoint({ x: 30, y: 49 }, origin, 40, 8)).toBeNull();
    expect(cellAtPoint({ x: 340, y: 60 }, origin, 40, 8)).toBeNull();
    expect(cellAtPoint({ x: 30, y: 370 }, origin, 40, 8)).toBeNull();
  });

  it('returns null before the board has a size', () => {
    expect(cellAtPoint({ x: 20, y: 50 }, origin, 0, 8)).toBeNull();
  });
});
