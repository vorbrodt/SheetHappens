import { resolveSwipeDirection } from './resolveSwipeDirection';

describe('resolveSwipeDirection', () => {
  it('resolves a rightward swipe', () => {
    expect(resolveSwipeDirection({ dx: 40, dy: 2 })).toBe('right');
  });

  it('resolves a leftward swipe', () => {
    expect(resolveSwipeDirection({ dx: -40, dy: -2 })).toBe('left');
  });

  it('resolves a downward swipe', () => {
    expect(resolveSwipeDirection({ dx: 2, dy: 40 })).toBe('down');
  });

  it('resolves an upward swipe', () => {
    expect(resolveSwipeDirection({ dx: -2, dy: -40 })).toBe('up');
  });

  it('ignores swipes below the minimum distance on both axes', () => {
    expect(resolveSwipeDirection({ dx: 5, dy: -5 })).toBeNull();
  });

  it('respects a custom minimum distance', () => {
    expect(resolveSwipeDirection({ dx: 20, dy: 0 }, 30)).toBeNull();
    expect(resolveSwipeDirection({ dx: 40, dy: 0 }, 30)).toBe('right');
  });

  it('resolves diagonal swipes to the dominant axis, favoring horizontal on a tie', () => {
    expect(resolveSwipeDirection({ dx: 30, dy: 30 })).toBe('right');
    expect(resolveSwipeDirection({ dx: 20, dy: 40 })).toBe('down');
    expect(resolveSwipeDirection({ dx: 40, dy: 20 })).toBe('right');
  });
});
