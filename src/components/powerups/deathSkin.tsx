import { ReactNode, useLayoutEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BoardEntityViewModel } from '../board/types';
import { DeathSkinProps } from './types';

// How far above its cell a respawning entity starts its drop, in cell sizes.
const DROP_HEIGHT = 1.6;
const DROP_MS = 260;
const LAND_SQUASH_X = 0.3;
const LAND_SQUASH_Y = 0.32;

// A dead entity is off the board until it respawns, so there is nothing to draw. How it went (a
// splat, say) is up to whatever killed it.
export function DeathSkin(_props: DeathSkinProps) {
  return null;
}

interface RespawnDropProps {
  entity: BoardEntityViewModel;
  cellSize: number;
  children: ReactNode;
}

/**
 * Wraps an entity for as long as it is in the match, dead or alive. Each time it comes back from
 * the dead it pops in above its corner, drops onto it and lands with a squashy bounce.
 */
export function RespawnDrop({ entity, cellSize, children }: RespawnDropProps) {
  const { dead, position, footprint } = entity;
  const wasDead = useRef(dead);
  // 0 → 1 over the fall; settled at 1.
  const fall = useSharedValue(1);
  // The landing squash: 1 is fully squashed, settled at 0. Springs past 0 into a little stretch.
  const squash = useSharedValue(0);

  // Before paint, so the jelly never shows on its corner for a frame before the drop starts.
  useLayoutEffect(() => {
    if (wasDead.current && !dead) {
      fall.set(0);
      fall.set(withTiming(1, { duration: DROP_MS, easing: Easing.in(Easing.quad) }));
      squash.set(
        withDelay(
          DROP_MS,
          withSequence(
            withTiming(1, { duration: 70, easing: Easing.out(Easing.quad) }),
            withSpring(0, { damping: 6, stiffness: 220 })
          )
        )
      );
    }
    wasDead.current = dead;
  }, [dead, fall, squash]);

  // The entity squashes onto the bottom middle of the cells it covers.
  const rows = footprint.map((cell) => cell.row);
  const cols = footprint.map((cell) => cell.col);
  const originX = (position.col + (Math.min(...cols) + Math.max(...cols) + 1) / 2) * cellSize;
  const originY = (position.row + Math.max(...rows) + 0.9) * cellSize;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, fall.value * 4),
    transform: [
      { translateY: (fall.value - 1) * DROP_HEIGHT * cellSize },
      { scaleX: (0.6 + 0.4 * fall.value) * (1 + squash.value * LAND_SQUASH_X) },
      { scaleY: (0.6 + 0.4 * fall.value) * (1 - squash.value * LAND_SQUASH_Y) },
    ],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { transformOrigin: [originX, originY, 0] }, animatedStyle]}
      pointerEvents="none"
    >
      {children}
    </Animated.View>
  );
}
