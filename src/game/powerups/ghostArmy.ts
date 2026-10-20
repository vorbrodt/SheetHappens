import type { PowerUpDefinition } from './registry';

// Stub: the effect comes in Phase 9.
export const ghostArmy: PowerUpDefinition = {
  kind: 'ghostArmy',
  durationMs: 8_000,
  canActivate: () => true,
  activate: (state) => state,
  expire: (state) => state,
};
