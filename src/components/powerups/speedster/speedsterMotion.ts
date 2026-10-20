import { Position } from '../../../game/types';

// A slide's progress runs from 0 to 1 while the jelly travels, then on for TRAIL_SPREAD more so
// the afterimages behind it catch up and fade out.
export const TRAIL_SPREAD = 0.45;
export const SLIDE_END = 1 + TRAIL_SPREAD;
export const AFTERIMAGE_COUNT = 3;

// Over its last RUNNING_OUT_MS the power-up's wind lines flicker, FLICKER_MS on and off.
export const RUNNING_OUT_MS = 1_500;
const FLICKER_MS = 125;

export interface Heading {
  x: number;
  y: number;
}

// The unit step from one cell towards another in a straight line; (0, 0) when they are the same.
export function headingBetween(from: Position, to: Position): Heading {
  return { x: Math.sign(to.col - from.col), y: Math.sign(to.row - from.row) };
}

// How far along the slide something `lag` behind the jelly is, eased like a normal move.
export function slideFraction(progress: number, lag = 0): number {
  'worklet';
  const t = Math.min(1, Math.max(0, progress - lag));
  return t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
}

// How far behind the jelly afterimage `index` runs; 1 is the closest.
export function afterimageLag(index: number): number {
  'worklet';
  return (index * TRAIL_SPREAD) / AFTERIMAGE_COUNT;
}

// How strongly the trail shows: fully while the jelly travels, fading as the afterimages catch up.
export function trailVisibility(progress: number): number {
  'worklet';
  return 1 - Math.min(1, Math.max(0, (progress - 1) / TRAIL_SPREAD));
}

// 1, except over the power-up's last RUNNING_OUT_MS, where it blinks between 1 and a dim 0.25.
export function runningOutFlicker(remainingMs: number): number {
  'worklet';
  if (remainingMs <= 0 || remainingMs > RUNNING_OUT_MS) return 1;
  return Math.floor(remainingMs / FLICKER_MS) % 2 === 0 ? 1 : 0.25;
}
