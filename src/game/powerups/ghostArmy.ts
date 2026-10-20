import { summon } from '../engine';
import { Entity, MatchState, PlayerId } from '../types';
import type { PowerUpDefinition } from './registry';

// How many ghosts one use summons.
export const GHOST_ARMY_SIZE = 3;

function isGhostOf(entity: Entity, ownerId: PlayerId) {
  return entity.ghost && entity.summonedBy === ownerId;
}

/**
 * Summons GHOST_ARMY_SIZE ghosts next to the owner for the power-up's duration. They wander like
 * bots and paint for the owner, passing through everything, unkillable and leaving pickups alone.
 * Each ghost wears the owner's power-up as well, so the board draws it through the Ghost Army skin.
 */
export const ghostArmy: PowerUpDefinition = {
  kind: 'ghostArmy',
  durationMs: 8_000,
  canActivate: () => true,
  activate: (state, entityId, _now, rng) => {
    const active = state.entities.find((e) => e.id === entityId)?.activePowerUp;
    if (!active) return state;

    const summoned = summon(state, entityId, GHOST_ARMY_SIZE, rng, active.endsAt);
    const known = new Set(state.entities.map((e) => e.id));
    return {
      ...summoned,
      entities: summoned.entities.map((e) => (known.has(e.id) ? e : { ...e, activePowerUp: active })),
    };
  },
  // The ghosts are due to leave right now anyway. This makes sure any still around do, through the
  // engine's own removal of summoned entities, and takes the power-up off them first so only the
  // owner reports it running out.
  expire: (state, entityId, now) => {
    if (!state.entities.some((e) => isGhostOf(e, entityId))) return state;
    return {
      ...state,
      entities: state.entities.map((e) => (isGhostOf(e, entityId) ? { ...e, activePowerUp: null, expiresAt: now } : e)),
    };
  },
};

// The ghosts the entity's Ghost Army has on the board.
export function ghostsOf(state: MatchState, ownerId: PlayerId): Entity[] {
  return state.entities.filter((e) => isGhostOf(e, ownerId));
}
