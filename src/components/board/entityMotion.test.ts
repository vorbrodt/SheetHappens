import { isSlide } from './entityMotion';

describe('isSlide', () => {
  it('accepts one orthogonal cell in any direction', () => {
    const from = { row: 3, col: 3 };
    expect(isSlide(from, { row: 2, col: 3 })).toBe(true);
    expect(isSlide(from, { row: 4, col: 3 })).toBe(true);
    expect(isSlide(from, { row: 3, col: 2 })).toBe(true);
    expect(isSlide(from, { row: 3, col: 4 })).toBe(true);
  });

  it('accepts two cells in a straight line', () => {
    const from = { row: 3, col: 3 };
    expect(isSlide(from, { row: 1, col: 3 })).toBe(true);
    expect(isSlide(from, { row: 5, col: 3 })).toBe(true);
    expect(isSlide(from, { row: 3, col: 1 })).toBe(true);
    expect(isSlide(from, { row: 3, col: 5 })).toBe(true);
  });

  it('rejects staying put, diagonals and longer jumps', () => {
    const from = { row: 3, col: 3 };
    expect(isSlide(from, { row: 3, col: 3 })).toBe(false);
    expect(isSlide(from, { row: 4, col: 4 })).toBe(false);
    expect(isSlide(from, { row: 2, col: 4 })).toBe(false);
    expect(isSlide(from, { row: 0, col: 0 })).toBe(false);
    expect(isSlide(from, { row: 3, col: 6 })).toBe(false);
  });
});
