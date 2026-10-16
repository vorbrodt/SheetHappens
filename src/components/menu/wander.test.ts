import { nextWanderStep, Point, randomPoint } from './wander';

const BOUNDS = { width: 300, height: 500 };

describe('nextWanderStep', () => {
  it('hops a full step when there is room', () => {
    // random 0 picks the first open direction, which is "up".
    expect(nextWanderStep({ x: 100, y: 100 }, BOUNDS, 40, () => 0)).toEqual({
      direction: 'up',
      to: { x: 100, y: 60 },
    });
  });

  it('skips directions blocked by a wall', () => {
    const directions = [0, 0.5, 0.99].map(
      (r) => nextWanderStep({ x: 0, y: 0 }, BOUNDS, 40, () => r)?.direction
    );
    expect(new Set(directions)).toEqual(new Set(['down', 'right']));
  });

  it('shortens a hop so it stops at the edge', () => {
    // All four directions are open; random 0.99 picks the last, "right", which has 10px left.
    expect(nextWanderStep({ x: 290, y: 100 }, BOUNDS, 40, () => 0.99)).toEqual({
      direction: 'right',
      to: { x: 300, y: 100 },
    });
  });

  it('returns null when there is no room to move', () => {
    expect(nextWanderStep({ x: 0, y: 0 }, { width: 0, height: 0 }, 40)).toBeNull();
  });

  it('never leaves the bounds over a long walk', () => {
    let position: Point = { x: 150, y: 250 };
    for (let i = 0; i < 1000; i += 1) {
      position = nextWanderStep(position, BOUNDS, 40)!.to;
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(BOUNDS.width);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(BOUNDS.height);
    }
  });
});

describe('randomPoint', () => {
  it('scales the random draw to the bounds', () => {
    expect(randomPoint(BOUNDS, () => 0.5)).toEqual({ x: 150, y: 250 });
    expect(randomPoint(BOUNDS, () => 0)).toEqual({ x: 0, y: 0 });
  });
});
