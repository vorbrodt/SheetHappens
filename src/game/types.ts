import { ActivePowerUp, Pickup, PowerUpKind } from './powerups/types';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type PlayerId = string;

export interface Position {
  row: number;
  col: number;
}

export interface Entity {
  id: PlayerId;
  color: string;
  position: Position;
  // Per-entity effects, all on the match clock (ms of play). Power-ups will change these later.
  // The shortest gap allowed between two of this entity's moves.
  moveIntervalMs: number;
  // Intensity applied per paint.
  paintMultiplier: number;
  // The entity ignores its own inputs until the match clock reaches this time.
  frozenUntil: number;
  // When this entity last moved, or null if it has not moved yet this match.
  lastMoveAt: number | null;
  // When this entity next paints the cell it is standing on. Entering a cell paints it straight
  // away and pushes this to PAINT_DWELL_MS later; standing still repeats it every PAINT_DWELL_MS.
  dwellPaintAt: number;
  // Power-up slots, in order. Using one empties it; a pickup fills the first empty one.
  inventory: (PowerUpKind | null)[];
  // The power-up running right now. Only one at a time, and no slot can be used while it runs.
  activePowerUp: ActivePowerUp | null;
  // The cells the entity covers, as offsets from `position`. Just its own cell by default.
  footprint: Position[];
  // How many cells one move covers.
  moveStep: number;
  // Whether touching it kills.
  lethal: boolean;
  canTeleport: boolean;
  // When this entity last teleported, or null if it has not yet this match.
  lastTeleportAt: number | null;
  // A ghost passes through others and isn't blocking, killable or collecting.
  ghost: boolean;
  // Whose paint it lays down; its own id by default.
  paintsAs: PlayerId;
  // The entity whose power-up summoned this one, or null for a regular entity.
  summonedBy: PlayerId | null;
  // When a summoned entity is removed from the match, or null to stay for good.
  expiresAt: number | null;
  // When a dead entity comes back; null while it's alive.
  respawnAt: number | null;
}

export interface Cell {
  owner: PlayerId | null;
  intensity: number;
}

export type Grid = Cell[][];

export interface MatchConfig {
  durationSeconds: number;
  botCount: number;
  // Cells per side of the square board.
  boardSize: number;
}

export type MatchStatus = 'countdown' | 'playing' | 'paused' | 'ended';

// When a bot next acts, on the match clock.
export interface BotTimers {
  nextMoveAt: number;
}

export type MatchInput =
  | { type: 'move'; entityId: PlayerId; direction: Direction }
  | { type: 'usePowerUp'; entityId: PlayerId; slot: 0 | 1 }
  // `target` is where the entity's position lands; its footprint is laid out from there.
  | { type: 'teleport'; entityId: PlayerId; target: Position };

// What an input or step changed, so the UI can animate it.
export type MatchEvent =
  // `distance` is how many cells the move covered.
  | { type: 'moved'; entityId: PlayerId; direction: Direction; distance: number }
  | { type: 'painted'; entityId: PlayerId }
  | { type: 'pickupSpawned'; pickup: Pickup }
  | { type: 'pickupDespawned'; pickupId: string }
  | { type: 'pickedUp'; entityId: PlayerId; kind: PowerUpKind; slot: number; pickupId: string }
  | { type: 'powerUpActivated'; entityId: PlayerId; kind: PowerUpKind }
  | { type: 'powerUpRefused'; entityId: PlayerId; slot: number }
  | { type: 'powerUpExpired'; entityId: PlayerId; kind: PowerUpKind }
  | { type: 'killed'; entityId: PlayerId; by: PlayerId }
  | { type: 'respawned'; entityId: PlayerId }
  | { type: 'teleported'; entityId: PlayerId; from: Position; to: Position };

export interface MatchState {
  grid: Grid;
  entities: Entity[];
  // One entry per bot; entities without one are driven by inputs from outside the engine.
  bots: Record<PlayerId, BotTimers>;
  status: MatchStatus;
  // Time left on the pre-match countdown; 0 once the match has started.
  countdownMs: number;
  remainingMs: number;
  // The match clock: ms of play so far, frozen during the countdown and while paused.
  elapsedMs: number;
  // Power-ups lying on the board.
  pickups: Pickup[];
  // When the next wave of pickups spawns, on the match clock; null until play starts.
  nextSpawnAt: number | null;
  // What the call that produced this state did. Each call starts a fresh list.
  events: MatchEvent[];
}
