import type { PowerUpDefinition } from './registry';

// Stub: the effect comes in Phase 9.
export const jellyGoneBad: PowerUpDefinition = {
  kind: 'jellyGoneBad',
  durationMs: 6_000,
  canActivate: () => true,
  activate: (state) => state,
  expire: (state) => state,
};
