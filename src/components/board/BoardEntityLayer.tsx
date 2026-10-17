import { Ref, RefObject, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Jelly, JELLY_MOVE_TRAVEL_MS } from '../jelly/Jelly';
import { JellyHandle } from '../jelly/types';
import { isSingleStep } from './entityMotion';
import { useBoardLayout } from './useBoardLayout';

export interface BoardEntityViewModel {
  id: string;
  color: string;
  position: { row: number; col: number };
  ref?: Ref<JellyHandle>;
}

interface BoardEntityLayerProps {
  entities: BoardEntityViewModel[];
  // Cells per side of the board the jellies stand on.
  gridSize: number;
}

const SLIDE_TIMING = { duration: JELLY_MOVE_TRAVEL_MS, easing: Easing.inOut(Easing.quad) };

export function BoardEntityLayer({ entities, gridSize }: BoardEntityLayerProps) {
  const { cellSize } = useBoardLayout(gridSize);
  // The game screen mounts with whatever positions the previous match left in the store and
  // resets them in its own mount effect, so nothing slides until that first frame has passed.
  const slideEnabled = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      slideEnabled.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {entities.map((entity) => (
        <BoardJelly
          key={entity.id}
          jellyRef={entity.ref}
          color={entity.color}
          row={entity.position.row}
          col={entity.position.col}
          cellSize={cellSize}
          slideEnabled={slideEnabled}
        />
      ))}
    </View>
  );
}

interface BoardJellyProps {
  jellyRef?: Ref<JellyHandle>;
  color: string;
  row: number;
  col: number;
  cellSize: number;
  slideEnabled: RefObject<boolean>;
}

function BoardJelly({ jellyRef, color, row, col, cellSize, slideEnabled }: BoardJellyProps) {
  const jellySize = cellSize * 0.8;
  const jellyInset = (cellSize - jellySize) / 2;
  const x = useSharedValue(col * cellSize + jellyInset);
  const y = useSharedValue(row * cellSize + jellyInset);
  const shown = useRef({ row, col, cellSize });

  useEffect(() => {
    const prev = shown.current;
    shown.current = { row, col, cellSize };
    const targetX = col * cellSize + jellyInset;
    const targetY = row * cellSize + jellyInset;

    // Only a one-cell move slides; a new match or a resized board places the jelly instantly.
    if (slideEnabled.current && prev.cellSize === cellSize && isSingleStep(prev, { row, col })) {
      x.set(withTiming(targetX, SLIDE_TIMING));
      y.set(withTiming(targetY, SLIDE_TIMING));
    } else {
      x.set(targetX);
      y.set(targetY);
    }
  }, [row, col, cellSize, jellyInset, slideEnabled, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View style={[styles.entity, animatedStyle]}>
      <Jelly ref={jellyRef} color={color} size={jellySize} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entity: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
