import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { cellsOwned, score } from '../game/rules';
import { PLAYER_ID, useGameStore } from '../game/store';

// Minimal end-of-match screen so the countdown has somewhere to land. KAN-14 builds out the full
// results screen (rankings, winner, replay).
export default function ResultsScreen() {
  const grid = useGameStore((s) => s.grid);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Time&apos;s up!</Text>
      <Text style={styles.stat}>Score: {score(grid, PLAYER_ID)}</Text>
      <Text style={styles.stat}>Cells owned: {cellsOwned(grid, PLAYER_ID)}</Text>
      <Pressable style={styles.button} onPress={() => router.dismissTo('/')}>
        <Text style={styles.buttonText}>Back to Menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  stat: {
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
