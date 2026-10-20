import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { entityCells, isSolid } from '../../../game/rules';
import { Entity, Position } from '../../../game/types';
import { useBoardLayout } from '../../board/useBoardLayout';

const FADE_MS = 250;
const NOPE_MS = 360;
const NOPE_COLOR = '#F43F5E';

export interface JellyportBoardLayerHandle {
  // Shakes the cell, to show the jelly can't teleport there.
  nope(cell: Position): void;
}

interface JellyportBoardLayerProps {
  gridSize: number;
  entities: Entity[];
  // Whether the local player can teleport right now; the free cells light up while it can.
  active: boolean;
}

// Drawn over the board for the local player's Jellyport: a faint glow on every cell it could
// teleport to, and a little shake on a cell it tried to but couldn't.
export const JellyportBoardLayer = forwardRef<JellyportBoardLayerHandle, JellyportBoardLayerProps>(
  function JellyportBoardLayer({ gridSize, entities, active }, ref) {
    const { cellSize } = useBoardLayout(gridSize);
    // Stays true while the glow fades back out after the power-up ends.
    const [lit, setLit] = useState(active);
    const visibility = useSharedValue(0);
    const pulse = useSharedValue(0);
    const nopeProgress = useSharedValue(1);
    const nopeRow = useSharedValue(0);
    const nopeCol = useSharedValue(0);

    if (active && !lit) setLit(true);

    useEffect(() => {
      visibility.set(withTiming(active ? 1 : 0, { duration: FADE_MS }));
      if (active) {
        pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true));
        return () => cancelAnimation(pulse);
      }
      const timer = setTimeout(() => setLit(false), FADE_MS);
      return () => clearTimeout(timer);
    }, [active, visibility, pulse]);

    useImperativeHandle(
      ref,
      () => ({
        nope(cell: Position) {
          nopeRow.set(cell.row);
          nopeCol.set(cell.col);
          nopeProgress.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: NOPE_MS })));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }),
      [nopeRow, nopeCol, nopeProgress]
    );

    const freeCells = useMemo(() => {
      if (!lit) return [];
      const taken = new Set(entities.filter(isSolid).flatMap(entityCells).map((c) => `${c.row},${c.col}`));
      const cells: Position[] = [];
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          if (!taken.has(`${row},${col}`)) cells.push({ row, col });
        }
      }
      return cells;
    }, [lit, entities, gridSize]);

    const glowStyle = useAnimatedStyle(() => ({
      opacity: visibility.value * (0.55 + 0.45 * pulse.value),
    }));

    const nopeStyle = useAnimatedStyle(() => {
      const p = nopeProgress.value;
      return {
        opacity: p >= 1 ? 0 : 1 - p * p,
        transform: [
          { translateX: nopeCol.value * cellSize + Math.sin(p * Math.PI * 6) * cellSize * 0.1 * (1 - p) },
          { translateY: nopeRow.value * cellSize },
        ],
      };
    });

    const inset = cellSize * 0.1;
    const tile = cellSize - inset * 2;

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {lit && (
          <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
            {freeCells.map(({ row, col }) => (
              <View
                key={`${row},${col}`}
                style={[
                  styles.tile,
                  {
                    width: tile,
                    height: tile,
                    borderRadius: tile * 0.25,
                    left: col * cellSize + inset,
                    top: row * cellSize + inset,
                  },
                ]}
              />
            ))}
          </Animated.View>
        )}
        <Animated.View
          style={[
            styles.nope,
            { width: cellSize, height: cellSize, borderRadius: cellSize * 0.2, borderWidth: Math.max(2, cellSize * 0.06) },
            nopeStyle,
          ]}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  // Faint versions of the portal purples.
  tile: {
    position: 'absolute',
    backgroundColor: 'rgba(167, 139, 250, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.28)',
  },
  nope: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderColor: NOPE_COLOR,
    backgroundColor: 'rgba(244, 63, 94, 0.18)',
  },
});
