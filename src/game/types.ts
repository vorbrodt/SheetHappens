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
