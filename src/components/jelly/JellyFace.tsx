import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Direction } from './types';

interface JellyFaceProps {
  size: number;
  direction: Direction;
}

const EYE_LOOK_OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function JellyFace({ size, direction }: JellyFaceProps) {
  const eyeSize = size * 0.14;
  const lookRange = size * 0.05;
  const blinkScaleY = useSharedValue(1);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);

  useEffect(() => {
    const offset = EYE_LOOK_OFFSETS[direction];
    lookX.value = withTiming(offset.x * lookRange, { duration: 200 });
    lookY.value = withTiming(offset.y * lookRange, { duration: 200 });
  }, [direction, lookRange, lookX, lookY]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Blinks on a randomized loop so multiple jellies on screen don't blink in lockstep.
    const scheduleBlink = () => {
      const delay = 2200 + Math.random() * 2600;
      timeoutId = setTimeout(() => {
        blinkScaleY.value = withSequence(
          withTiming(0.08, { duration: 70, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) })
        );
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, [blinkScaleY]);

  const pupilStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lookX.value },
      { translateY: lookY.value },
      { scaleY: blinkScaleY.value },
    ],
  }));

  return (
    <View style={[styles.container, { top: -size * 0.06 }]} pointerEvents="none">
      <Animated.View
        style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }, pupilStyle]}
      />
      <Animated.View
        style={[
          styles.eye,
          { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, marginLeft: eyeSize * 1.4 },
          pupilStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  eye: {
    backgroundColor: '#1F2933',
  },
});
