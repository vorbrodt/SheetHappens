// A source of random numbers in [0, 1), like Math.random.
export type Rng = () => number;

// Small deterministic PRNG (mulberry32): the same seed always gives the same sequence, so a match
// driven by it is reproducible.
export function createRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
