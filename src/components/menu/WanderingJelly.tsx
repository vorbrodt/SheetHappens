import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Jelly } from '../jelly/Jelly';
import { JellyHandle } from '../jelly/types';
import { nextWanderStep, randomPoint } from './wander';

const HOP_DURATION_MS = 340;
const HOP_DELAY_MIN_MS = 650;
const HOP_DELAY_JITTER_MS = 900;

interface WanderingJellyProps {
  color: string;
  size: number;
  // The area the jelly wanders inside, in pixels.
  areaWidth: number;
  areaHeight: number;
}

// A decorative jelly that hops around on its own. It holds no game state and takes no touches.
export function WanderingJelly({ color, size, areaWidth, areaHeight }: WanderingJellyProps) {
  const jellyRef = useRef<JellyHandle>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    const bounds = { width: Math.max(0, areaWidth - size), height: Math.max(0, areaHeight - size) };
    let position = randomPoint(bounds);
    x.set(position.x);
    y.set(position.y);

    let timeoutId: ReturnType<typeof setTimeout>;

    // Randomized delays, as with blinking, so the jellies don't hop in lockstep.
    const scheduleHop = () => {
      timeoutId = setTimeout(() => {
        const hop = nextWanderStep(position, bounds, size);
        if (hop) {
          position = hop.to;
          const timing = { duration: HOP_DURATION_MS, easing: Easing.out(Easing.quad) };
          x.set(withTiming(hop.to.x, timing));
          y.set(withTiming(hop.to.y, timing));
          jellyRef.current?.playMove(hop.direction);
        }
        scheduleHop();
      }, HOP_DELAY_MIN_MS + Math.random() * HOP_DELAY_JITTER_MS);
    };

    scheduleHop();
    return () => clearTimeout(timeoutId);
  }, [areaWidth, areaHeight, size, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View style={[styles.wanderer, animatedStyle]}>
      <Jelly ref={jellyRef} color={color} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wanderer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
