import type { PowerUpDefinition } from './registry';

// Stub: the effect comes in Phase 9.
export const jellysaurus: PowerUpDefinition = {
  kind: 'jellysaurus',
  durationMs: 7_000,
  canActivate: () => true,
  activate: (state) => state,
  expire: (state) => state,
};
