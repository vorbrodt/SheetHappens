import {
  afterimageLag,
  AFTERIMAGE_COUNT,
  headingBetween,
  RUNNING_OUT_MS,
  runningOutFlicker,
  SLIDE_END,
  slideFraction,
  trailVisibility,
} from './speedsterMotion';

describe('headingBetween', () => {
  it('points one step along the move, however far it went', () => {
    expect(headingBetween({ row: 3, col: 3 }, { row: 3, col: 5 })).toEqual({ x: 1, y: 0 });
    expect(headingBetween({ row: 3, col: 3 }, { row: 2, col: 3 })).toEqual({ x: 0, y: -1 });
    expect(headingBetween({ row: 3, col: 3 }, { row: 3, col: 3 })).toEqual({ x: 0, y: 0 });
  });
});

describe('slideFraction', () => {
  it('eases the jelly from start to end over progress 0-1', () => {
    expect(slideFraction(0)).toBe(0);
    expect(slideFraction(0.5)).toBe(0.5);
    expect(slideFraction(1)).toBe(1);
    expect(slideFraction(SLIDE_END)).toBe(1);
    expect(slideFraction(0.25)).toBeLessThan(0.25);
  });

  it('keeps every afterimage behind the jelly until it catches up at the end', () => {
    for (let index = 1; index <= AFTERIMAGE_COUNT; index++) {
      const lag = afterimageLag(index);
      expect(slideFraction(0.8, lag)).toBeLessThan(slideFraction(0.8));
      expect(slideFraction(SLIDE_END, lag)).toBe(1);
    }
    expect(slideFraction(0.8, afterimageLag(2))).toBeLessThan(slideFraction(0.8, afterimageLag(1)));
  });
});

describe('trailVisibility', () => {
  it('shows the trail while travelling and fades it out by the end', () => {
    expect(trailVisibility(0.5)).toBe(1);
    expect(trailVisibility(1)).toBe(1);
    expect(trailVisibility((1 + SLIDE_END) / 2)).toBeCloseTo(0.5);
    expect(trailVisibility(SLIDE_END)).toBeCloseTo(0);
  });
});

describe('runningOutFlicker', () => {
  it('only flickers over the last stretch of the power-up', () => {
    expect(runningOutFlicker(5_000)).toBe(1);
    expect(runningOutFlicker(0)).toBe(1);
    const flicker = [RUNNING_OUT_MS - 1, RUNNING_OUT_MS - 130, RUNNING_OUT_MS - 260].map(runningOutFlicker);
    expect(new Set(flicker)).toEqual(new Set([1, 0.25]));
  });
});
