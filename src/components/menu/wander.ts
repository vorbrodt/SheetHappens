import { Direction } from '../jelly/types';

export interface Point {
  x: number;
  y: number;
}

// The box a jelly's top-left corner may sit in, from (0, 0) to (width, height).
export interface WanderBounds {
  width: number;
  height: number;
}

export interface WanderStep {
  direction: Direction;
  to: Point;
}

const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const DIRECTIONS = Object.keys(DIRECTION_VECTORS) as Direction[];

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

export function randomPoint(bounds: WanderBounds, random: () => number = Math.random): Point {
  return { x: random() * bounds.width, y: random() * bounds.height };
}

// One hop of up to `step` pixels in a random direction. A hop toward an edge stops at it, and a
// direction with no room left is skipped, so jellies never bump in place against a wall.
// Null when the bounds leave no room to move at all.
export function nextWanderStep(
  from: Point,
  bounds: WanderBounds,
  step: number,
  random: () => number = Math.random
): WanderStep | null {
  const options = DIRECTIONS.map((direction) => {
    const vector = DIRECTION_VECTORS[direction];
    return {
      direction,
      to: {
        x: clamp(from.x + vector.x * step, bounds.width),
        y: clamp(from.y + vector.y * step, bounds.height),
      },
    };
  }).filter(({ to }) => to.x !== from.x || to.y !== from.y);

  if (options.length === 0) return null;
  return options[Math.floor(random() * options.length)];
}
