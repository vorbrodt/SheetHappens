import { Ref, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Position } from '../../../game/types';
import { isSlide } from '../../board/entityMotion';
import { Jelly, JELLY_MOVE_TRAVEL_MS } from '../../jelly/Jelly';
import { JellyHandle } from '../../jelly/types';
import { SkinPhase } from '../types';

// Activate: each copy pops out of the anchor this long after the one before, while the anchor
// boings once per copy.
export const POP_STAGGER_MS = 160;
const POP_MS = 260;
const POP_START_SCALE = 0.35;
const BOING = 0.22;

// Active: each jelly sets off this long after the one ahead of it, so the line wiggles.
const CONGA_DELAY_MS = 35;
const CONGA_HOP = 0.08;

// Expire: the copies slurp back into the anchor this far apart, furthest first, and then the
// anchor gives one bouncy squish.
export const SLURP_STAGGER_MS = 130;
const SLURP_MS = 220;
const FINAL_SQUISH_MS = 400;

// How long the expiring animation takes with `copies` copies to slurp back in.
export function exitDurationMs(copies: number): number {
  return Math.max(0, copies - 1) * SLURP_STAGGER_MS + SLURP_MS + FINAL_SQUISH_MS;
}

const SLIDE_TIMING = { duration: JELLY_MOVE_TRAVEL_MS, easing: Easing.inOut(Easing.quad) };

interface LineJellyProps {
  color: string;
  cellSize: number;
  // The board cell this jelly stands on in the line.
  cell: Position;
  // The board cell of the anchor jelly, where copies pop out of and slurp back into.
  anchor: Position;
  // This jelly's place in the line, and the whole line, as offsets from the anchor.
  offset: Position;
  line: Position[];
  // How many copies there are besides the anchor.
  copies: number;
  // For a copy: how long into the activate and expire animations it pops out and slurps back.
  popDelayMs: number;
  slurpDelayMs: number;
  phase: SkinPhase;
  jellyRef?: Ref<JellyHandle>;
}

interface Shown {
  phase: SkinPhase;
  row: number;
  col: number;
  cellSize: number;
}

// How many jellies go ahead of this one when the line moves by (dr, dc): along its length the
// front leads, and side to side the move ripples out from the anchor.
function congaRank(offset: Position, line: Position[], dr: number, dc: number): number {
  const projections = line.map((o) => o.row * dr + o.col * dc);
  const lead = Math.max(...projections);
  if (lead !== Math.min(...projections)) return lead - (offset.row * dr + offset.col * dc);
  return Math.abs(offset.row) + Math.abs(offset.col);
}

// One jelly of the line: the anchor, or one of its copies.
export function LineJelly({
  color,
  cellSize,
  cell,
  anchor,
  offset,
  line,
  copies,
  popDelayMs,
  slurpDelayMs,
  phase,
  jellyRef,
}: LineJellyProps) {
  const isAnchor = offset.row === 0 && offset.col === 0;
  const jellySize = cellSize * 0.8;
  const jellyInset = (cellSize - jellySize) / 2;
  // A copy appearing as the line forms starts tucked inside the anchor.
  const tucked = !isAnchor && phase === 'activating';
  const start = tucked ? anchor : cell;
  const x = useSharedValue(start.col * cellSize + jellyInset);
  const y = useSharedValue(start.row * cellSize + jellyInset);
  const hop = useSharedValue(0);
  const scale = useSharedValue(tucked ? POP_START_SCALE : 1);
  const opacity = useSharedValue(tucked ? 0 : 1);
  // Positive is wide and short, negative tall and thin.
  const squish = useSharedValue(0);
  const shown = useRef<Shown | null>(null);

  useEffect(() => {
    const prev = shown.current;
    shown.current = { phase, row: cell.row, col: cell.col, cellSize };
    const phaseChanged = prev?.phase !== phase;
    const moved = !prev || prev.row !== cell.row || prev.col !== cell.col || prev.cellSize !== cellSize;
    const cellX = cell.col * cellSize + jellyInset;
    const cellY = cell.row * cellSize + jellyInset;
    const anchorX = anchor.col * cellSize + jellyInset;
    const anchorY = anchor.row * cellSize + jellyInset;

    if (phase === 'activating' && phaseChanged) {
      if (isAnchor) {
        const boing = withSequence(
          withTiming(BOING, { duration: 60, easing: Easing.out(Easing.quad) }),
          withTiming(-BOING * 0.5, { duration: 80, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: POP_STAGGER_MS - 140, easing: Easing.out(Easing.quad) })
        );
        squish.set(withSequence(...Array.from({ length: Math.max(1, copies) }, () => boing)));
        return;
      }
      const pop = { duration: POP_MS, easing: Easing.out(Easing.quad) };
      const halfPop = POP_MS / 2;
      x.set(anchorX);
      y.set(anchorY);
      scale.set(POP_START_SCALE);
      opacity.set(0);
      x.set(withDelay(popDelayMs, withTiming(cellX, pop)));
      y.set(withDelay(popDelayMs, withTiming(cellY, pop)));
      hop.set(
        withDelay(
          popDelayMs,
          withSequence(
            withTiming(-cellSize * 0.45, { duration: halfPop, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: halfPop, easing: Easing.in(Easing.quad) })
          )
        )
      );
      scale.set(withDelay(popDelayMs, withTiming(1, pop)));
      opacity.set(withDelay(popDelayMs, withTiming(1, { duration: 80 })));
      return;
    }

    if (phase === 'expiring' && !isAnchor) {
      if (!phaseChanged && !moved) return;
      const slurp = { duration: SLURP_MS, easing: Easing.in(Easing.quad) };
      const delay = phaseChanged ? slurpDelayMs : 0;
      x.set(withDelay(delay, withTiming(anchorX, slurp)));
      y.set(withDelay(delay, withTiming(anchorY, slurp)));
      hop.set(0);
      if (phaseChanged) {
        scale.set(withDelay(delay, withTiming(POP_START_SCALE, slurp)));
        opacity.set(withDelay(delay + SLURP_MS * 0.6, withTiming(0, { duration: SLURP_MS * 0.4 })));
      }
      return;
    }

    if (phase === 'expiring' && phaseChanged) {
      // A gulp as each copy arrives, then the bouncy squish.
      const gulp = withSequence(
        withTiming(BOING * 0.6, { duration: 60, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: SLURP_STAGGER_MS - 60, easing: Easing.out(Easing.quad) })
      );
      const gulps = Array.from({ length: Math.max(0, copies - 1) }, () => gulp);
      const settle = { duration: 100, easing: Easing.inOut(Easing.quad) };
      squish.set(
        withDelay(
          SLURP_MS,
          withSequence(
            ...gulps,
            withTiming(0.32, { duration: 100, easing: Easing.out(Easing.quad) }),
            withTiming(-0.2, settle),
            withTiming(0.1, settle),
            withTiming(0, settle)
          )
        )
      );
    }

    if (!moved) return;

    // A move slides, each jelly a beat behind the one ahead with a little hop; anything else places
    // the jelly instantly.
    if (prev && prev.cellSize === cellSize && isSlide(prev, { row: cell.row, col: cell.col })) {
      const rank = congaRank(offset, line, Math.sign(cell.row - prev.row), Math.sign(cell.col - prev.col));
      const delay = rank * CONGA_DELAY_MS;
      const half = JELLY_MOVE_TRAVEL_MS / 2;
      x.set(withDelay(delay, withTiming(cellX, SLIDE_TIMING)));
      y.set(withDelay(delay, withTiming(cellY, SLIDE_TIMING)));
      hop.set(
        withDelay(
          delay,
          withSequence(
            withTiming(-cellSize * CONGA_HOP, { duration: half, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: half, easing: Easing.in(Easing.quad) })
          )
        )
      );
    } else {
      x.set(cellX);
      y.set(cellY);
    }
  }, [
    phase,
    cell.row,
    cell.col,
    anchor.row,
    anchor.col,
    cellSize,
    jellyInset,
    isAnchor,
    offset,
    line,
    copies,
    popDelayMs,
    slurpDelayMs,
    x,
    y,
    hop,
    scale,
    opacity,
    squish,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value + hop.value },
      { scaleX: scale.value * (1 + squish.value) },
      { scaleY: scale.value * (1 - squish.value) },
    ],
  }));

  return (
    <Animated.View style={[styles.jelly, animatedStyle]}>
      <Jelly ref={jellyRef} color={color} size={jellySize} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  jelly: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
