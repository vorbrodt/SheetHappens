import { Rng } from '../random';
import { MatchState, PlayerId } from '../types';
import { getInLine } from './getInLine';
import { ghostArmy } from './ghostArmy';
import { jellyGoneBad } from './jellyGoneBad';
import { jellyport } from './jellyport';
import { jellysaurus } from './jellysaurus';
import { speedster } from './speedster';
import { PowerUpKind } from './types';

/**
 * What one kind of power-up does. The engine owns the lifecycle — inventory, the active slot and
 * its timer, events — and calls these hooks for the effect itself, so each kind lives in its own
 * file and never touches the others.
 */
export interface PowerUpDefinition {
  kind: PowerUpKind;
  // How long it stays active, on the match clock.
  durationMs: number;
  // Whether the entity can use it right now. If not, activation is refused and the slot is kept.
  canActivate(state: MatchState, entityId: PlayerId): boolean;
  // Applies the effect. The slot is already emptied and the entity's activePowerUp already set.
  // Any events in the returned state are reported after `powerUpActivated`.
  activate(state: MatchState, entityId: PlayerId, now: number, rng: Rng): MatchState;
  // Undoes the effect when the duration runs out. The entity's activePowerUp is still set and is
  // cleared afterwards. Any events in the returned state are reported before `powerUpExpired`.
  expire(state: MatchState, entityId: PlayerId, now: number): MatchState;
}

export const POWER_UPS: Record<PowerUpKind, PowerUpDefinition> = {
  jellysaurus,
  getInLine,
  ghostArmy,
  speedster,
  jellyGoneBad,
  jellyport,
};

export const POWER_UP_KINDS = Object.keys(POWER_UPS) as PowerUpKind[];
