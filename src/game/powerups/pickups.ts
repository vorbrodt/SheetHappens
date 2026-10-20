import { Rng } from '../random';
import { entityCells, samePosition, updateEntity } from '../rules';
import { Entity, MatchEvent, MatchState, PlayerId, Position } from '../types';
import { POWER_UP_KINDS } from './registry';
import { Pickup } from './types';

// The gap before each wave of pickups, uniform between these, on the match clock.
export const SPAWN_DELAY_MIN_MS = 5_000;
export const SPAWN_DELAY_MAX_MS = 15_000;

// Each wave spawns between 1 and this many pickups.
export const MAX_PICKUPS_PER_WAVE = 3;

// No wave spawns past this many pickups on the board.
export const MAX_PICKUPS_ON_BOARD = 6;

// A pickup nobody takes disappears this long after it spawns.
export const PICKUP_LIFETIME_MS = 20_000;

// How long before a pickup disappears the UI starts blinking it.
export const PICKUP_BLINK_MS = 3_000;

// How many power-ups an entity can carry.
export const INVENTORY_SLOTS = 2;

// The time from one wave of pickups (or the start of play) to the next, in whole ms.
export function spawnDelay(rng: Rng): number {
  return SPAWN_DELAY_MIN_MS + Math.floor(rng() * (SPAWN_DELAY_MAX_MS - SPAWN_DELAY_MIN_MS + 1));
}

// Cells, in reading order, that no entity covers and no pickup lies on.
function freeCells(state: MatchState, pickups: Pickup[]): Position[] {
  const taken = [...state.entities.flatMap(entityCells), ...pickups.map((p) => p.position)];
  const size = state.grid.length;
  const cells: Position[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!taken.some((cell) => samePosition(cell, { row, col }))) cells.push({ row, col });
    }
  }
  return cells;
}

/**
 * Spawns the wave of pickups due at `now` and schedules the next one: 1 to MAX_PICKUPS_PER_WAVE
 * pickups of uniformly random kinds on random free cells. Spawns that would go past
 * MAX_PICKUPS_ON_BOARD, or find no free cell, are skipped. The returned events are its own.
 */
export function spawnWave(state: MatchState, now: number, rng: Rng): MatchState {
  const count = 1 + Math.floor(rng() * MAX_PICKUPS_PER_WAVE);
  let pickups = state.pickups;
  const events: MatchEvent[] = [];

  for (let i = 0; i < count && pickups.length < MAX_PICKUPS_ON_BOARD; i++) {
    const kind = POWER_UP_KINDS[Math.floor(rng() * POWER_UP_KINDS.length)];
    const cells = freeCells(state, pickups);
    if (cells.length === 0) break;
    const pickup: Pickup = {
      // Waves are at least SPAWN_DELAY_MIN_MS apart, so the time and index are unique.
      id: `pickup-${now}-${i}`,
      kind,
      position: cells[Math.floor(rng() * cells.length)],
      spawnedAt: now,
      expiresAt: now + PICKUP_LIFETIME_MS,
    };
    pickups = [...pickups, pickup];
    events.push({ type: 'pickupSpawned', pickup });
  }

  return { ...state, pickups, nextSpawnAt: now + spawnDelay(rng), events };
}

// Removes a pickup whose time on the board ran out. The returned events are its own.
export function despawnPickup(state: MatchState, pickupId: string): MatchState {
  return {
    ...state,
    pickups: state.pickups.filter((p) => p.id !== pickupId),
    events: [{ type: 'pickupDespawned', pickupId }],
  };
}

// Whether walking onto a pickup takes it: for every living entity but ghosts, bots included.
function collects(entity: Entity): boolean {
  return !entity.ghost && entity.respawnAt === null;
}

/**
 * Has the entity take every pickup under any cell it covers or `passed` on the way, each into its
 * first empty slot. Call it whenever an entity arrives on new cells, however it got there. Pickups
 * that don't fit stay on the board. The returned events are its own.
 */
export function collectPickups(state: MatchState, entityId: PlayerId, passed: Position[] = []): MatchState {
  const entity = state.entities.find((e) => e.id === entityId);
  if (!entity || !collects(entity)) return { ...state, events: [] };

  const cells = [...passed, ...entityCells(entity)];
  const inventory = [...entity.inventory];
  let pickups = state.pickups;
  const events: MatchEvent[] = [];

  for (const pickup of state.pickups) {
    if (!cells.some((cell) => samePosition(cell, pickup.position))) continue;
    const slot = inventory.indexOf(null);
    if (slot === -1) break;
    inventory[slot] = pickup.kind;
    pickups = pickups.filter((p) => p !== pickup);
    events.push({ type: 'pickedUp', entityId, kind: pickup.kind, slot, pickupId: pickup.id });
  }

  if (events.length === 0) return { ...state, events };
  return { ...updateEntity(state, entityId, { inventory }), pickups, events };
}
