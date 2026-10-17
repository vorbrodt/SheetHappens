import { DEFAULT_CONFIG } from '../../game/engine';
import { clampBotCount, MAX_BOTS, parseMatchParams, toMatchParams } from './matchConfig';

describe('clampBotCount', () => {
  it('keeps counts inside 0-5', () => {
    expect(MAX_BOTS).toBe(5);
    expect(clampBotCount(-1)).toBe(0);
    expect(clampBotCount(0)).toBe(0);
    expect(clampBotCount(3)).toBe(3);
    expect(clampBotCount(5)).toBe(5);
    expect(clampBotCount(9)).toBe(5);
  });

  it('rounds fractional counts', () => {
    expect(clampBotCount(2.4)).toBe(2);
    expect(clampBotCount(2.6)).toBe(3);
  });
});

describe('parseMatchParams', () => {
  it('reads duration and bot count', () => {
    expect(parseMatchParams({ duration: '90', bots: '4' })).toEqual({ durationSeconds: 90, botCount: 4 });
  });

  it('accepts zero bots', () => {
    expect(parseMatchParams({ duration: '60', bots: '0' }).botCount).toBe(0);
  });

  it('clamps an out-of-range bot count', () => {
    expect(parseMatchParams({ bots: '12' }).botCount).toBe(5);
    expect(parseMatchParams({ bots: '-3' }).botCount).toBe(0);
  });

  it('falls back to the defaults for missing or malformed values', () => {
    expect(DEFAULT_CONFIG.durationSeconds).toBe(30);
    expect(parseMatchParams({})).toEqual(DEFAULT_CONFIG);
    expect(parseMatchParams({ duration: '', bots: '' })).toEqual(DEFAULT_CONFIG);
    expect(parseMatchParams({ duration: 'abc', bots: 'xyz' })).toEqual(DEFAULT_CONFIG);
    expect(parseMatchParams({ duration: '0' }).durationSeconds).toBe(DEFAULT_CONFIG.durationSeconds);
    expect(parseMatchParams({ duration: '-30' }).durationSeconds).toBe(DEFAULT_CONFIG.durationSeconds);
  });

  it('round-trips through toMatchParams', () => {
    const config = { durationSeconds: 120, botCount: 0 };
    expect(parseMatchParams(toMatchParams(config))).toEqual(config);
  });
});
