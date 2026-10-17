import { MAX_INTENSITY } from '../../game/rules';
import { getCellColor } from './cellColor';

const PINK = '#EC4899';

describe('getCellColor', () => {
  it('is neutral when the cell has no owner color', () => {
    expect(getCellColor(null, 0)).toBe('#F1F2F4');
    expect(getCellColor(undefined, 50)).toBe('#F1F2F4');
  });

  it('uses the owner color at full opacity for max intensity', () => {
    expect(getCellColor(PINK, MAX_INTENSITY)).toBe('rgba(236, 72, 153, 1)');
  });

  it('steps up opacity visibly at every intensity level', () => {
    const alphaAt = (intensity: number) =>
      Number(getCellColor(PINK, intensity).match(/, ([\d.]+)\)$/)?.[1]);

    expect(alphaAt(1)).toBeGreaterThan(0.15);
    for (let i = 1; i <= MAX_INTENSITY; i++) {
      expect(alphaAt(i) - alphaAt(i - 1)).toBeGreaterThanOrEqual(0.15);
    }
  });

  it('clamps intensity to the 0-MAX_INTENSITY range', () => {
    expect(getCellColor(PINK, MAX_INTENSITY + 1)).toBe(getCellColor(PINK, MAX_INTENSITY));
    expect(getCellColor(PINK, -5)).toBe(getCellColor(PINK, 0));
  });
});
