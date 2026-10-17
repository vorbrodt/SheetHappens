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
}

export interface Cell {
  owner: PlayerId | null;
  intensity: number;
}

export type Grid = Cell[][];

export interface MatchConfig {
  durationSeconds: number;
  botCount: number;
}

export type MatchStatus = 'countdown' | 'playing' | 'paused' | 'ended';

// When a bot next acts, on the match clock.
export interface BotTimers {
  nextMoveAt: number;
}

export type MatchInput = { type: 'move'; entityId: PlayerId; direction: Direction };

// What an input or step changed, so the UI can animate it.
export type MatchEvent =
  | { type: 'moved'; entityId: PlayerId; direction: Direction }
  | { type: 'painted'; entityId: PlayerId };

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
  // What the call that produced this state did. Each call starts a fresh list.
  events: MatchEvent[];
}
