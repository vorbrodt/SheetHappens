import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { JellyFace } from './JellyFace';
import { JellyLottieBody, LOTTIE_BODY_SUPPORTED } from './JellyLottieBody';
import { Direction, JellyHandle, JellyRenderer } from './types';

interface JellyProps {
  color: string;
  size: number;
  showFace?: boolean;
  // 'lottie' swaps the body and its idle wobble for the jelly-idle asset (KAN-16 prototype).
  // Move and paint reactions stay procedural either way.
  renderer?: JellyRenderer;
}

const IDLE_SQUISH = 0.035;
const MOVE_STRETCH = 0.28;
const MOVE_SQUASH = 0.16;
const PAINT_SQUISH = 0.18;

export const Jelly = forwardRef<JellyHandle, JellyProps>(function Jelly(
  { color, size, showFace = true, renderer = 'procedural' },
  ref
) {
  const idleT = useSharedValue(0);
  const moveScaleX = useSharedValue(1);
  const moveScaleY = useSharedValue(1);
  const paintScale = useSharedValue(1);
  const [lastDirection, setLastDirection] = useState<Direction>('down');
  const lottieBody = renderer === 'lottie' && LOTTIE_BODY_SUPPORTED;

  useEffect(() => {
    // The Lottie asset carries its own idle loop.
    if (lottieBody) {
      return;
    }

    idleT.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(idleT);
  }, [idleT, lottieBody]);

  useImperativeHandle(
    ref,
    () => ({
      playMove(direction: Direction) {
        setLastDirection(direction);

        const horizontal = direction === 'left' || direction === 'right';
        const stretchX = horizontal ? 1 + MOVE_STRETCH : 1 - MOVE_STRETCH * 0.6;
        const stretchY = horizontal ? 1 - MOVE_STRETCH * 0.6 : 1 + MOVE_STRETCH;
        const squashX = horizontal ? 1 - MOVE_SQUASH : 1 + MOVE_SQUASH * 0.6;
        const squashY = horizontal ? 1 + MOVE_SQUASH * 0.6 : 1 - MOVE_SQUASH;

        moveScaleX.value = withSequence(
          withTiming(stretchX, { duration: 120, easing: Easing.out(Easing.quad) }),
          withTiming(squashX, { duration: 100, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 8, stiffness: 160 })
        );
        moveScaleY.value = withSequence(
          withTiming(stretchY, { duration: 120, easing: Easing.out(Easing.quad) }),
          withTiming(squashY, { duration: 100, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 8, stiffness: 160 })
        );
      },
      playPaint() {
        paintScale.value = withSequence(
          withTiming(1 - PAINT_SQUISH, { duration: 70, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 6, stiffness: 180 })
        );
      },
    }),
    [moveScaleX, moveScaleY, paintScale]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const idleWobble = lottieBody ? 0 : (idleT.value - 0.5) * 2 * IDLE_SQUISH;

    return {
      transform: [
        { scaleX: (1 + idleWobble) * moveScaleX.value * paintScale.value },
        { scaleY: (1 - idleWobble) * moveScaleY.value * paintScale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.jelly,
        { width: size, height: size },
        !lottieBody && { borderRadius: size * 0.38, backgroundColor: color },
        animatedStyle,
      ]}
    >
      {lottieBody && <JellyLottieBody color={color} />}
      {showFace && <JellyFace size={size} direction={lastDirection} />}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  jelly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
