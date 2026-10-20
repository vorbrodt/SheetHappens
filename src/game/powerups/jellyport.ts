import { updateEntity } from '../rules';
import type { PowerUpDefinition } from './registry';

// While it runs the entity may teleport onto any free cell instead of moving there (the engine's
// teleport input, with its cooldown). Moving still works as usual.
export const jellyport: PowerUpDefinition = {
  kind: 'jellyport',
  durationMs: 8_000,
  canActivate: () => true,
  activate: (state, entityId) => updateEntity(state, entityId, { canTeleport: true }),
  expire: (state, entityId) => updateEntity(state, entityId, { canTeleport: false }),
};
