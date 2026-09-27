import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Board } from '../components/board/Board';
import { mockBoardData } from '../components/board/mockBoardData';

export default function GameScreen() {
  return (
    <View style={styles.container}>
      <Board cells={mockBoardData} />
      <Pressable style={styles.button} onPress={() => router.back()}>
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
    gap: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
