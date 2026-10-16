import { SwipeVector } from './resolveSwipeDirection';
import { advanceSwipe, INITIAL_SWIPE_TRACKER, SwipeTracker } from './swipeTracker';

/** Feeds a sequence of total translations through the tracker, as onUpdate would. */
function drag(path: SwipeVector[], start: SwipeTracker = INITIAL_SWIPE_TRACKER): SwipeTracker {
  return path.reduce((tracker, translation) => advanceSwipe(tracker, translation), start);
}

/** Straight-line samples from `from` to `to` in `step`-sized increments, excluding `from`. */
function line(from: SwipeVector, to: SwipeVector, step = 4): SwipeVector[] {
  const steps = Math.ceil(Math.max(Math.abs(to.dx - from.dx), Math.abs(to.dy - from.dy)) / step);
  return Array.from({ length: steps }, (_, i) => ({
    dx: from.dx + ((to.dx - from.dx) * (i + 1)) / steps,
    dy: from.dy + ((to.dy - from.dy) * (i + 1)) / steps,
  }));
}

describe('advanceSwipe', () => {
  it('stays unresolved below the minimum distance', () => {
    expect(drag(line({ dx: 0, dy: 0 }, { dx: 12, dy: -8 }))).toBe(INITIAL_SWIPE_TRACKER);
  });

  it('locks a direction and anchors at the translation where it resolved', () => {
    expect(advanceSwipe(INITIAL_SWIPE_TRACKER, { dx: 20, dy: 3 })).toEqual({
      anchor: { dx: 20, dy: 3 },
      direction: 'right',
    });
  });

  it('returns the same tracker when the movement since the anchor is too small', () => {
    const tracker: SwipeTracker = { anchor: { dx: 100, dy: 0 }, direction: 'right' };
    expect(advanceSwipe(tracker, { dx: 90, dy: 5 })).toBe(tracker);
  });

  it('switches to left after a short drag back without lifting', () => {
    const heldRight = drag(line({ dx: 0, dy: 0 }, { dx: 100, dy: 0 }));
    expect(heldRight.direction).toBe('right');

    // The old total-translation logic would still read +70px as "right" here.
    const reversed = drag(line({ dx: 100, dy: 0 }, { dx: 70, dy: 0 }), heldRight);
    expect(reversed.direction).toBe('left');
  });

  it('switches to up when turning mid-hold', () => {
    const heldRight = drag(line({ dx: 0, dy: 0 }, { dx: 100, dy: 0 }));
    const turned = drag(line({ dx: 100, dy: 0 }, { dx: 104, dy: -24 }), heldRight);
    expect(turned.direction).toBe('up');
  });

  it('never needs more than twice the minimum distance to reverse', () => {
    const heldRight = drag(line({ dx: 0, dy: 0 }, { dx: 100, dy: 0 }, 1));
    const reversed = drag(line({ dx: 100, dy: 0 }, { dx: 68, dy: 0 }, 1), heldRight);
    expect(reversed.direction).toBe('left');
  });

  it('respects a custom minimum distance', () => {
    expect(advanceSwipe(INITIAL_SWIPE_TRACKER, { dx: 20, dy: 0 }, 30)).toBe(INITIAL_SWIPE_TRACKER);
    expect(advanceSwipe(INITIAL_SWIPE_TRACKER, { dx: 40, dy: 0 }, 30).direction).toBe('right');
  });
});
