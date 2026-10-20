import { Ref } from 'react';

import { ActivePowerUp } from '../../game/powerups/types';
import { Position } from '../../game/types';
import { JellyHandle } from '../jelly/types';

export type PlayerId = string;

export interface CellData {
  owner: PlayerId | null;
  intensity: number;
}

// What the board needs to draw one entity.
export interface BoardEntityViewModel {
  id: PlayerId;
  color: string;
  position: Position;
  // The cells it covers, as offsets from `position`.
  footprint: Position[];
  activePowerUp: ActivePowerUp | null;
  ghost: boolean;
  // Waiting to respawn.
  dead: boolean;
  // The entity whose power-up summoned this one, or null for a regular entity.
  summonedBy: PlayerId | null;
  ref?: Ref<JellyHandle>;
}
