export type Direction = 'up' | 'down' | 'left' | 'right';

export type JellyRenderer = 'procedural' | 'lottie';

export interface JellyHandle {
  playMove: (direction: Direction) => void;
  playPaint: () => void;
}
