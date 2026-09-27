import { isPointInPaintZone, PAINT_ZONE_HEIGHT_RATIO } from './paintZone';

describe('isPointInPaintZone', () => {
  it('is false above the reserved zone', () => {
    expect(isPointInPaintZone(0, 1000)).toBe(false);
    expect(isPointInPaintZone(849, 1000)).toBe(false);
  });

  it('is true at and below the reserved zone boundary', () => {
    expect(isPointInPaintZone(850, 1000)).toBe(true);
    expect(isPointInPaintZone(1000, 1000)).toBe(true);
  });

  it('respects a custom ratio', () => {
    expect(isPointInPaintZone(799, 1000, 0.2)).toBe(false);
    expect(isPointInPaintZone(800, 1000, 0.2)).toBe(true);
  });

  it('is false when the surface height is not yet known', () => {
    expect(isPointInPaintZone(0, 0)).toBe(false);
    expect(isPointInPaintZone(10, -1)).toBe(false);
  });

  it('exports the default ratio used by the rest of the app', () => {
    expect(PAINT_ZONE_HEIGHT_RATIO).toBe(0.15);
  });
});
