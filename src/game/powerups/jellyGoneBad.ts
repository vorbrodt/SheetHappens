import { updateEntity } from '../rules';
import type { PowerUpDefinition } from './registry';

// The jelly turns evil: touching another jelly kills it, whichever of the two moved. The engine
// takes the dead off the board and respawns them on a corner; ghosts are immune.
export const jellyGoneBad: PowerUpDefinition = {
  kind: 'jellyGoneBad',
  durationMs: 6_000,
  canActivate: () => true,
  activate: (state, entityId) => updateEntity(state, entityId, { lethal: true }),
  expire: (state, entityId) => updateEntity(state, entityId, { lethal: false }),
};
