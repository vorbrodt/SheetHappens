import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { useGameStore } from '../../state/gameStore';
import { respawnSeconds } from './respawnSeconds';

/**
 * "Splat! Respawning in 5…" over the board while the local player is dead, counting down each
 * second. Purely visual: the engine already ignores the player's input until it is back.
 */
export function RespawnOverlay() {
  // Whole seconds, so the every-frame game loop only re-renders this when the label changes.
  const seconds = useGameStore((s) => {
    if (s.match.status === 'ended') return null;
    const me = s.match.entities.find((e) => e.id === s.localPlayerId);
    return respawnSeconds(me?.respawnAt, s.match.elapsedMs);
  });
  const color = useGameStore((s) => s.match.entities.find((e) => e.id === s.localPlayerId)?.color);

  if (seconds === null) return null;

  return (
    <Animated.View
      style={styles.overlay}
      pointerEvents="none"
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(200)}
    >
      <View style={styles.card} accessibilityLiveRegion="assertive">
        <Animated.Text style={[styles.splat, { color }]} entering={ZoomIn.springify().damping(8)}>
          Splat!
        </Animated.Text>
        <Text style={styles.label}>Respawning in {seconds}…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  card: {
    alignItems: 'center',
    gap: 4,
  },
  splat: {
    fontSize: 72,
    fontWeight: '900',
    textShadowColor: '#fff',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
});
