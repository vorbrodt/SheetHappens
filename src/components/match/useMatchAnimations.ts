import { RefObject, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

import { Pickup } from '../../game/powerups/types';
import { PlayerId } from '../../game/types';
import { useGameStore } from '../../state/gameStore';
import { PickupLayerHandle } from '../board/PickupLayer';
import { PowerUpSlotsHandle } from '../hud/PowerUpSlots';
import { JellyHandle } from '../jelly/types';

export interface MatchAnimationTargets {
  getJelly: (id: PlayerId) => JellyHandle | null;
  pickups: RefObject<PickupLayerHandle | null>;
  // The local player's slots.
  slots: RefObject<PowerUpSlotsHandle | null>;
}

/**
 * Plays whatever the engine reports happened, whether the input came from this device or from a
 * bot: each entity's jelly reacts to its moves and paints, pickups pop out when they despawn or fly
 * into the local player's slot when taken, and the local player feels a power-up go off or be
 * refused (which also shakes its slot). Power-up looks follow the entities' state instead.
 */
export function useMatchAnimations({ getJelly, pickups, slots }: MatchAnimationTargets) {
  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.match.events === prev.match.events) return;
        const { localPlayerId } = state;
        // A pickup can spawn and be taken within one step, so look in this batch's spawns too.
        const known = new Map<string, Pickup>(prev.match.pickups.map((p) => [p.id, p]));

        for (const event of state.match.events) {
          switch (event.type) {
            case 'moved':
              getJelly(event.entityId)?.playMove(event.direction);
              break;
            case 'painted':
              getJelly(event.entityId)?.playPaint();
              break;
            case 'pickupSpawned':
              known.set(event.pickup.id, event.pickup);
              break;
            case 'pickupDespawned': {
              const pickup = known.get(event.pickupId);
              if (pickup) pickups.current?.popOut(pickup);
              break;
            }
            case 'pickedUp': {
              const pickup = known.get(event.pickupId);
              if (event.entityId !== localPlayerId) {
                if (pickup) pickups.current?.popOut(pickup);
                break;
              }
              const from = pickup && pickups.current ? pickups.current.locate(pickup) : Promise.resolve(null);
              slots.current?.receive(event.slot, from);
              Haptics.selectionAsync();
              break;
            }
            case 'powerUpActivated':
              if (event.entityId === localPlayerId) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              break;
            case 'powerUpRefused':
              if (event.entityId !== localPlayerId) break;
              slots.current?.shake(event.slot);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              break;
          }
        }
      }),
    [getJelly, pickups, slots]
  );
}
