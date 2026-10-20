import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { measureInWindow, WindowRect } from '../windowRect';
import { EVIL_DARK } from './useEvilLook';

/**
 * A dark vignette that closes in from the edges of the screen and fades again, once, when it
 * mounts. It's drawn from inside the board, so it measures where the board sits and reaches out
 * from there to cover the whole window.
 */
export function EvilVignette() {
  const anchor = useRef<View>(null);
  const [board, setBoard] = useState<WindowRect | null>(null);
  const window = useWindowDimensions();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!board) return;
    opacity.set(
      withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withDelay(220, withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }))
      )
    );
  }, [board, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      <View
        ref={anchor}
        style={styles.anchor}
        // Measured once: it only plays once, so a later relayout needn't restart it.
        onLayout={() => measureInWindow(anchor.current).then((rect) => setBoard((prev) => prev ?? rect))}
        pointerEvents="none"
      />
      {board && (
        <Animated.View
          style={[
            styles.vignette,
            { left: -board.x, top: -board.y, width: window.width, height: window.height },
            animatedStyle,
          ]}
          pointerEvents="none"
        >
          <Svg width={window.width} height={window.height}>
            <Defs>
              <RadialGradient id="evilVignette" cx="50%" cy="50%" r="75%">
                <Stop offset="0.5" stopColor={EVIL_DARK} stopOpacity={0} />
                <Stop offset="1" stopColor={EVIL_DARK} stopOpacity={0.7} />
              </RadialGradient>
            </Defs>
            <Rect width={window.width} height={window.height} fill="url(#evilVignette)" />
          </Svg>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
  },
  vignette: {
    position: 'absolute',
  },
});
