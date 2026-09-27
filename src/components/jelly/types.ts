export type Direction = 'up' | 'down' | 'left' | 'right';

export interface JellyHandle {
  playMove: (direction: Direction) => void;
  playPaint: () => void;
}
