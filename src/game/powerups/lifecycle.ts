import { Rng } from '../random';
import { updateEntity } from '../rules';
import { MatchState, PlayerId } from '../types';
import { POWER_UPS } from './registry';

/**
 * Uses the power-up in one of the entity's slots at `now`. An empty slot does nothing. While
 * another power-up is active, or when the kind's canActivate says no, it is refused and the slot
 * is kept. Otherwise the slot is emptied, the power-up runs until now + its duration, and the
 * kind's activate applies the effect. The returned events are its own.
 */
export function activatePowerUp(state: MatchState, entityId: PlayerId, slot: number, now: number, rng: Rng): MatchState {
  const entity = state.entities.find((e) => e.id === entityId);
  const kind = entity?.inventory[slot];
  if (!entity || !kind) return state;

  const definition = POWER_UPS[kind];
  if (entity.activePowerUp || !definition.canActivate(state, entityId)) {
    return { ...state, events: [{ type: 'powerUpRefused', entityId, slot }] };
  }

  const armed = updateEntity({ ...state, events: [] }, entityId, {
    inventory: entity.inventory.map((k, i) => (i === slot ? null : k)),
    activePowerUp: { kind, startedAt: now, endsAt: now + definition.durationMs },
  });
  const activated = definition.activate(armed, entityId, now, rng);
  return { ...activated, events: [{ type: 'powerUpActivated', entityId, kind }, ...activated.events] };
}

// Ends the entity's active power-up: the kind's expire undoes the effect, then the entity's
// activePowerUp is cleared. The returned events are its own.
export function expirePowerUp(state: MatchState, entityId: PlayerId, now: number): MatchState {
  const active = state.entities.find((e) => e.id === entityId)?.activePowerUp;
  if (!active) return state;

  const expired = POWER_UPS[active.kind].expire({ ...state, events: [] }, entityId, now);
  return {
    ...updateEntity(expired, entityId, { activePowerUp: null }),
    events: [...expired.events, { type: 'powerUpExpired', entityId, kind: active.kind }],
  };
}
