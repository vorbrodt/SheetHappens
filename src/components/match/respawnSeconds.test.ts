import { respawnSeconds } from './respawnSeconds';

describe('respawnSeconds', () => {
  it('is null while alive', () => {
    expect(respawnSeconds(null, 1_000)).toBeNull();
    expect(respawnSeconds(undefined, 1_000)).toBeNull();
  });

  it('rounds the time left up to whole seconds', () => {
    expect(respawnSeconds(6_000, 1_000)).toBe(5);
    expect(respawnSeconds(6_000, 1_001)).toBe(5);
    expect(respawnSeconds(6_000, 4_999)).toBe(2);
    expect(respawnSeconds(6_000, 5_000)).toBe(1);
  });

  it('never drops below 1 while still dead', () => {
    expect(respawnSeconds(6_000, 6_000)).toBe(1);
  });
});
