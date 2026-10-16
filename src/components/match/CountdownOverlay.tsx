import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useGameStore } from '../../game/store';

// How long "Go!" stays up once play has started.
const GO_VISIBLE_MS = 700;

// Picks the countdown label: the whole seconds left (frozen while paused), then "Go!".
function countdownLabel(countdownMs: number, showGo: boolean): string | null {
  if (countdownMs > 0) return String(Math.ceil(countdownMs / 1000));
  return showGo ? 'Go!' : null;
}

/**
 * Shows 3 → 2 → 1 → Go! over the board while the pre-match countdown runs. Each label springs in
 * with a squash-and-stretch wobble. Purely visual: it never takes touches.
 */
export function CountdownOverlay() {
  const countdownMs = useGameStore((s) => s.countdownMs);
  const [showGo, setShowGo] = useState(false);
  const pop = useSharedValue(0);

  // Flashes "Go!" at the moment the countdown hands over to play.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.status === 'playing' && prev.status === 'countdown') {
        setShowGo(true);
        clearTimeout(timer);
        timer = setTimeout(() => setShowGo(false), GO_VISIBLE_MS);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const label = countdownLabel(countdownMs, showGo);

  useEffect(() => {
    if (!label) return;
    pop.set(0);
    pop.set(withSpring(1, { damping: 7, stiffness: 180 }));
  }, [label, pop]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.4], [0, 1], 'clamp'),
    // Starts squashed wide and flat, then overshoots tall and thin before settling — jelly-like.
    transform: [{ scaleX: 1 + (1 - pop.value) * 0.5 }, { scaleY: pop.value }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      {label && (
        <Animated.Text
          style={[styles.label, animatedStyle]}
          exiting={FadeOut.duration(200)}
          accessibilityLiveRegion="assertive"
        >
          {label}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 96,
    fontWeight: '900',
    color: '#EC4899',
    textShadowColor: '#fff',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
});
