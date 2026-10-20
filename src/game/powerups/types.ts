import { Position } from '../types';

export type PowerUpKind = 'jellysaurus' | 'getInLine' | 'ghostArmy' | 'speedster' | 'jellyGoneBad' | 'jellyport';

// A power-up lying on the board, waiting to be picked up. Times are on the match clock.
export interface Pickup {
  id: string;
  kind: PowerUpKind;
  position: Position;
  spawnedAt: number;
  // It disappears from the board at this time if nobody has taken it.
  expiresAt: number;
}

// The power-up an entity is running. Times are on the match clock.
export interface ActivePowerUp {
  kind: PowerUpKind;
  startedAt: number;
  endsAt: number;
}
