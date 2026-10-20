import { createContext, Ref, RefObject, useContext, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Position } from '../../game/types';
import { Jelly, JELLY_MOVE_TRAVEL_MS } from '../jelly/Jelly';
import { JellyHandle } from '../jelly/types';
import { isSlide } from './entityMotion';

// Whether position changes may slide yet. The entity layer holds it off for its first frame.
export const SlideEnabledContext = createContext<RefObject<boolean>>({ current: true });

const SLIDE_TIMING = { duration: JELLY_MOVE_TRAVEL_MS, easing: Easing.inOut(Easing.quad) };

interface BoardJellyProps {
  jellyRef?: Ref<JellyHandle>;
  color: string;
  position: Position;
  cellSize: number;
}

// An entity's normal look: one jelly on its cell, sliding along with each move.
export function BoardJelly({ jellyRef, color, position: { row, col }, cellSize }: BoardJellyProps) {
  const slideEnabled = useContext(SlideEnabledContext);
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

    // Only a move slides; a new match, a resized board or a jump of any other kind places the
    // jelly instantly.
    if (slideEnabled.current && prev.cellSize === cellSize && isSlide(prev, { row, col })) {
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
