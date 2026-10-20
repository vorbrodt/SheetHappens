import { Ref } from 'react';
import { SharedValue } from 'react-native-reanimated';

import { BoardEntityViewModel } from '../board/types';
import { JellyHandle } from '../jelly/types';

// Where a power-up's look is: just switched on, running, or animating back to normal after it ran
// out on the board.
export type SkinPhase = 'activating' | 'active' | 'expiring';

// What a power-up's skin gets. While registered for the entity's power-up, the skin draws the
// whole entity in place of the normal jelly, positioning included.
export interface SkinProps {
  entity: BoardEntityViewModel;
  cellSize: number;
  // Attach to the skin's jelly, if it has one, so moves and paints still play on it.
  jellyRef?: Ref<JellyHandle>;
  phase: SkinPhase;
  // Time left on the power-up, following the match clock (frozen while paused); 0 once expired.
  remainingMs: SharedValue<number>;
  // Call once the expiring animation has finished, to hand the entity back to the normal jelly.
  // If it never comes, the entity is handed back after SKIN_EXIT_TIMEOUT_MS anyway.
  onExitDone: () => void;
}

// What the skin for an entity waiting to respawn gets.
export interface DeathSkinProps {
  entity: BoardEntityViewModel;
  cellSize: number;
  jellyRef?: Ref<JellyHandle>;
}
