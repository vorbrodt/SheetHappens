import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('formats whole minutes and seconds', () => {
    expect(formatTime(60_000)).toBe('1:00');
    expect(formatTime(90_000)).toBe('1:30');
    expect(formatTime(5_000)).toBe('0:05');
  });

  it('rounds partial seconds up', () => {
    expect(formatTime(59_001)).toBe('1:00');
    expect(formatTime(1)).toBe('0:01');
  });

  it('never goes below zero', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(-500)).toBe('0:00');
  });
});
