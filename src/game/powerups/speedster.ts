import { updateEntity } from '../rules';
import type { PowerUpDefinition } from './registry';

// Every move covers two cells while it runs (one when the second is blocked or off the board).
const SPEEDSTER_MOVE_STEP = 2;

export const speedster: PowerUpDefinition = {
  kind: 'speedster',
  durationMs: 8_000,
  canActivate: () => true,
  activate: (state, entityId) => updateEntity(state, entityId, { moveStep: SPEEDSTER_MOVE_STEP }),
  expire: (state, entityId) => updateEntity(state, entityId, { moveStep: 1 }),
};
