import { isSingleStep } from './entityMotion';

describe('isSingleStep', () => {
  it('accepts one orthogonal cell in any direction', () => {
    const from = { row: 3, col: 3 };
    expect(isSingleStep(from, { row: 2, col: 3 })).toBe(true);
    expect(isSingleStep(from, { row: 4, col: 3 })).toBe(true);
    expect(isSingleStep(from, { row: 3, col: 2 })).toBe(true);
    expect(isSingleStep(from, { row: 3, col: 4 })).toBe(true);
  });

  it('rejects staying put, diagonals and jumps', () => {
    const from = { row: 3, col: 3 };
    expect(isSingleStep(from, { row: 3, col: 3 })).toBe(false);
    expect(isSingleStep(from, { row: 4, col: 4 })).toBe(false);
    expect(isSingleStep(from, { row: 0, col: 0 })).toBe(false);
    expect(isSingleStep(from, { row: 3, col: 5 })).toBe(false);
  });
});
