import { getCellColor } from './cellColor';

const PINK = '#EC4899';

describe('getCellColor', () => {
  it('is neutral when the cell has no owner color', () => {
    expect(getCellColor(null, 0)).toBe('#F1F2F4');
    expect(getCellColor(undefined, 50)).toBe('#F1F2F4');
  });

  it('uses the owner color at full opacity for max intensity', () => {
    expect(getCellColor(PINK, 100)).toBe('rgba(236, 72, 153, 1)');
  });

  it('gets more opaque as intensity increases', () => {
    const alphaAt = (intensity: number) =>
      Number(getCellColor(PINK, intensity).match(/, ([\d.]+)\)$/)?.[1]);

    expect(alphaAt(1)).toBeGreaterThan(0.15);
    expect(alphaAt(2)).toBeGreaterThan(alphaAt(1));
    expect(alphaAt(100)).toBeGreaterThan(alphaAt(99));
  });

  it('clamps intensity to the 0-100 range', () => {
    expect(getCellColor(PINK, 150)).toBe(getCellColor(PINK, 100));
    expect(getCellColor(PINK, -5)).toBe(getCellColor(PINK, 0));
  });
});
