import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// "Game over!" holds this long before the teaser takes over.
const GAME_OVER_MS = 1100;
// Total time on screen before handing over to the results.
const TOTAL_MS = 2600;
// One drumroll hit; the teaser rattles back and forth with these until it leaves.
const DRUMROLL_HIT_MS = 45;

// Claims every touch on the overlay so nothing reaches the swipe surface or paint button below.
const absorbTouches = Gesture.Manual();

interface GameOverOverlayProps {
  /** Called once the sequence has played out. */
  onDone: () => void;
}

/**
 * Plays "Game over!" → "Who won?" over the finished match, then calls `onDone`. It covers the whole
 * screen and swallows every touch, and it can't be tapped away, so spam at the final second can't
 * skip it or land on the results buttons.
 */
export function GameOverOverlay({ onDone }: GameOverOverlayProps) {
  const [phase, setPhase] = useState<'gameOver' | 'teaser'>('gameOver');
  const pop = useSharedValue(0);
  const rattle = useSharedValue(0);

  useEffect(() => {
    const teaserTimer = setTimeout(() => setPhase('teaser'), GAME_OVER_MS);
    const doneTimer = setTimeout(onDone, TOTAL_MS);
    return () => {
      clearTimeout(teaserTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  useEffect(() => {
    pop.set(0);
    pop.set(withSpring(1, { damping: 6, stiffness: 160 }));
    if (phase === 'teaser') {
      rattle.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: DRUMROLL_HIT_MS }),
            withTiming(-1, { duration: DRUMROLL_HIT_MS })
          ),
          -1,
          true
        )
      );
    }
  }, [phase, pop, rattle]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.4], [0, 1], 'clamp'),
    // Same jelly squash-and-stretch as the countdown, plus a drumroll shake for the teaser.
    transform: [
      { scaleX: 1 + (1 - pop.value) * 0.6 },
      { scaleY: pop.value },
      { rotate: `${rattle.value * 3}deg` },
      { translateX: rattle.value * 2 },
    ],
  }));

  return (
    <GestureDetector gesture={absorbTouches}>
      <Animated.View
        style={styles.backdrop}
        entering={FadeIn.duration(200)}
        onStartShouldSetResponder={() => true}
        accessibilityViewIsModal
      >
        <View style={styles.center}>
          <Animated.Text
            key={phase}
            style={[styles.label, phase === 'teaser' && styles.teaser, animatedStyle]}
            accessibilityRole="header"
            accessibilityLiveRegion="assertive"
          >
            {phase === 'gameOver' ? 'Game over!' : 'Who won?'}
          </Animated.Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  label: {
    fontSize: 64,
    fontWeight: '900',
    textAlign: 'center',
    color: '#EC4899',
    textShadowColor: '#fff',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  teaser: {
    color: '#4f46e5',
  },
});
